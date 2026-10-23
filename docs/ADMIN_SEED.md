# One-time production admin seed

The admin seed command is manual and never runs during build, migration, or deployment. It can create a new admin or promote the account identified by email. For an existing account, it preserves the current password and email-verification state. A changed phone number is marked unverified and any prior phone OTP is invalidated.

## Run from the Render backend shell

1. Treat any password shared in chat or source control as compromised. Change it before seeding. Do not send the replacement password in chat or put it in source code.
2. Deploy a backend version that includes `npm run seed:admin`.
3. In Render, use the backend service's shell and configure temporary environment variables directly through the service's secure environment settings:
   - `ADMIN_SEED_TARGET=production`
   - `ADMIN_SEED_EXPECTED_DATABASE_HOST` and `ADMIN_SEED_EXPECTED_DATABASE_NAME`, matching the production PostgreSQL URL configured for that backend service
   - `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PHONE`
   - For a new account only: `ADMIN_SEED_NAME` and a fresh, unique `ADMIN_SEED_PASSWORD` of at least 12 characters
4. Confirm the shell has `NODE_ENV=production` and uses the production `DATABASE_URL`. The script compares the database host and name against the explicit expected values and refuses to run if they differ.
5. Run `npm run seed:admin` once. The command prints only whether it created or promoted an account; it never prints the email, phone, password, or database URL.
6. Remove all temporary `ADMIN_SEED_*` values from the service environment after the command completes.
7. If a new account was created, verify its email and phone before using admin features. The command intentionally does not mark either contact method verified.

The command makes no schema changes and does not reset or delete any data. If the supplied phone number belongs to another account, it stops instead of reassigning that number.
