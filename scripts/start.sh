#!/bin/sh
set -e

# Baseline the init migration if it hasn't been recorded yet.
# This handles databases that were originally set up with `prisma db push`
# rather than migrations. Safe to run on every deploy — a no-op once resolved.
npx prisma migrate resolve --applied "20260519000000_init" 2>/dev/null || true

# Apply any pending migrations (new ones added after the baseline).
npx prisma migrate deploy

# Start the application.
exec node dist/main
