# Carolina Bandits Stripe live payment readiness

Status: **NOT APPROVED FOR LIVE CHARGES**. Keep `LIVE_PAYMENTS_ENABLED` unset/false. Do not add a live secret until all gates pass.

## Current working test
- Existing $1 Stripe test transaction is paid and the player dues balance is zero.
- Preserve this payment and its linked dues record for audit/debugging; do not force-delete or edit it.
- Preview Vercel Authentication is enabled. The webhook received 401/403 until Preview protection was temporarily disabled. Do not leave Preview publicly accessible.

## Before enabling live
1. Confirm production domain, Supabase Auth redirects, and access-control policies. Review hardcoded owner authorization and parent-to-player linkage.
2. Isolate live and test payment ledgers (prefer separate Supabase projects/databases or add a mode column with constraints and update checkout, webhook, reports, and RPC to enforce it). Current schema is **not isolated**; do not activate live payments with the current shared ledger.
3. Implement robust idempotency and race controls for concurrent checkouts; verify duplicate webhook deliveries cannot double-credit dues, and handle delayed/async payment methods or disable them.
4. Create a distinct Stripe **live** webhook destination pointing to the public production `/api/stripe-webhook`. Subscribe to the necessary events and set its signing secret as a Production-only Vercel secret.
5. Set `STRIPE_MODE=live`, `LIVE_SUPABASE_URL` (different from test `SUPABASE_URL`), `LIVE_SUPABASE_SERVICE_ROLE_KEY`, `LIVE_STRIPE_KEY=sk_live_...`, `STRIPE_WEBHOOK_SECRET=whsec_...`, `PAYMENTS_SITE_URL` to the exact verified production HTTPS origin, `SUPABASE_SERVICE_ROLE_KEY` to a server-only key, and `LIVE_PAYMENTS_ENABLED=true` **only after final approval**. Never expose secret keys to the browser, repository, or chat.
6. Validate server-side checkout amounts, guardian authorization, refunds/disputes, receipt emails, finance reports, and security logs. Stripe signature checks must use the exact raw request body.
7. Confirm deployment and a low-risk live transaction with explicit authorization, and document how to disable checkout immediately.

## Code notes
- `lib/payments.js` supports explicit live mode only in Vercel Production and only when `LIVE_PAYMENTS_ENABLED=true`. Missing `STRIPE_MODE` defaults to test to preserve existing Preview behavior.
- `api/stripe-webhook.js` rejects a Stripe event whose `livemode` differs from the configured mode.
- The current production deployment has not been modified by this branch-only preparation.

## Separation implementation (development only)
- Test mode continues to use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` and the existing $1 paid test entry remains untouched.
- Live mode uses only `LIVE_SUPABASE_URL` and `LIVE_SUPABASE_SERVICE_ROLE_KEY`; readiness fails if its URL matches the test URL, if required live settings are absent, or if the deployment is not Vercel Production.
- The current frontend/auth integration is still connected to the existing Supabase project; a new live project and coordinated auth/roster migration are prerequisites. This is **not** a completed live integration.
- Webhook processing now treats a false database reconciliation result as an error instead of acknowledging it with HTTP 200.
