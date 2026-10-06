# Recover migration 20260910063208 on Render

The earlier migration `20260902050059` already removes the same 20 foreign
keys. The corrected `20260910063208` uses `DROP CONSTRAINT IF EXISTS` so
missing constraints do not abort the migration. Its cheque-date conversion
is still applied. Do not modify the already successful earlier migration.

For the deployment reporting P3018 on this migration:

1. Deploy the corrected migration file to the Render service. Its normal
   migration command will still stop until the failed record is resolved.
2. In a Render shell or one-off job using the same service environment and
   database, inspect migration status:

   ```sh
   npx prisma migrate status
   ```

3. If `20260910063208` is the failed migration shown in the supplied log,
   mark that failed attempt rolled back and retry the corrected migration:

   ```sh
   npx prisma migrate resolve --rolled-back 20260910063208
   npx prisma migrate deploy
   npx prisma migrate status
   ```

   `resolve --rolled-back` updates migration history; it does not undo SQL.
   The supplied failure occurs on the first statement. The guarded drops
   also allow this migration to resume if some constraint removals had run.
   Do not mark the migration applied: the cheque-date alteration must run.

4. Restart/redeploy the backend after migrations succeed.

Run these commands only against the affected deployment database, with the
corrected files available. Do not put `migrate resolve` in the permanent
startup command. Do not use `migrate reset`, delete migration history, or
recreate the production database to recover this error.

Local source verification does not verify the live database. If a different
migration fails during deploy, inspect that error before further recovery.
