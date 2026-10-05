# Customer assignments and hierarchy review: stages 1-4

Implemented: Business Manager creates a customer enquiry for an active Agent who reports directly to them in the same branch. Agent can create their own enquiry, record follow-ups/site visits and submit to their active Business Manager. Only available same-branch properties may be selected. Submission does not reserve inventory or create a booking.

The mobile Customers tab is available to the six hierarchy roles (Agent through Director); Admin and Super Admin use the website only. Mobile lists refresh every 30 seconds while mounted and can be refreshed manually. Records include original creator, assigned Agent, current reviewer, notes, next action date and immutable activity history. Follow-up writes use version checks to reject stale/duplicate updates. Access follows current Agent reporting assignments: a former manager loses access after reassignment.

## Database activation

The additive migration is prisma/migrations/20261003000000_customer_referrals/migration.sql. It creates two new tables and indexes; it does not modify bookings, billing, or existing records. Prisma Client generation changes local generated code only.

Review pending migrations before applying migrations to a shared database: prisma migrate deploy applies ALL pending migrations, including unrelated ones. Apply through the normal database release process, then restart the backend and reload mobile. Until applied, the customer endpoints cannot work. On 2026-10-03, the user-approved customer referral migration was applied transactionally to the configured local PostgreSQL database and recorded in Prisma migration history. Both tables were verified readable through Prisma. The unrelated SMS migration remains pending.

## Acceptance check

1. Log in as Business Manager with direct active Agents and available branch properties.
2. Assign a customer to one Agent; check another branch and another manager's Agents cannot be selected.
3. Log in as that Agent; view assignment, add a follow-up and site-visit note, and optional next-action date.
4. Submit to Business Manager; check status and history update and follow-ups become read-only.
5. Log in as an unrelated Agent/manager; verify list and direct record access are denied.
6. Remove the Agent's reporting manager and verify submission is blocked.
7. In the mobile app, as Director, approve a referral; verify it immediately appears for the active Admin in the same branch and another branch's Admin cannot view it on the website.
8. On the website, as that Admin, open the referral and continue to the existing Book Property form; verify customer and property are prefilled, availability notes are required, and normal booking fields/payment behavior are preserved.
9. Save the existing booking form and verify property status, booking history, referral link, and configured booking SMS behavior are updated together.
10. Attempt a second booking or use an unavailable property; verify the referral does not create a duplicate booking.

## Stage 5: Director-to-Admin handoff and booking (2026-10-05)

Director approval in the mobile app immediately hands the referral to an active Admin in the same branch; it is one action, not a separate post-approval step. On the website, Admins see only referrals currently assigned to their own branch account. The referral queue is a handoff/inbox only: the Admin confirms availability, then opens the existing **Book Property** form with the approved customer and property prefilled. The regular booking creation endpoint accepts the referral ID and version, verifies the Admin assignment, uses the approved customer name/mobile, requires availability-check notes, re-checks and atomically claims the still-available branch property, and links the created booking back to the referral in the same transaction. Stale referrals, unavailable properties, and duplicate submissions do not create bookings. The referral itself remains in the Admin's website history as BOOKED.

The handoff backfill migration assigns existing `DIRECTOR_APPROVED` referrals to the earliest-created active Admin in their branch and records a `SENT_TO_ADMIN` activity. Referrals in branches without an active Admin remain approved and unassigned.

The additive migration `prisma/migrations/20261005090000_referral_admin_handoff/migration.sql` adds the optional unique booking link. `prisma/migrations/20261005100000_handoff_approved_referrals/migration.sql` moves already-approved referrals into the Admin queue. Apply pending migrations through the normal database release process before deploying this stage; do not run `prisma migrate deploy` on a shared database without reviewing all pending migrations.

Stage 6 remains: referral event notifications. This flow does not send a handoff notification or push message. Booking creation keeps the existing booking-SMS behavior when `SMS_ENABLED=true`. No automatic customer merge or reassignment is provided. Repeated submission of the same form uses a unique request key to avoid duplicate records. Independently created enquiries for the same customer are not automatically merged.


## Stage 4: hierarchy review (2026-10-05)

All six mobile member roles now have Customers access (Director via the sidebar to keep the bottom bar compact). Higher officials see current referrals and their own review history; Business Managers retain their direct-Agent assignment list.

Only the current reviewer can forward or return a referral. Forwarding follows the saved Reports To link and requires the next exact active role, in the same branch: Business Manager -> Senior Manager -> Deputy Director -> Executive Director -> Director. Missing/inactive managers, changed reporting chains, unavailable properties and stale versions block forwarding. Every action records actor, time and required remarks.

Any current reviewer can return a referral to its original assigned Agent. The Agent can correct name, phone, property and notes, then resubmit through the Business Manager. Submitted referrals are read-only to the Agent. Director approval hands off to the active branch Admin; this is not a booking and does not reserve inventory.

Validation: 25 referral tests and backend/mobile TypeScript checks passed. Device testing with the actual six accounts is still required.
