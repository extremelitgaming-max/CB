# Carolina Bandits — Live payment launch checklist

**Status: PREPARATION ONLY — LIVE CHARGES DISABLED**

## Verified on October 13, 2026
- Existing Supabase project remains in use. No new paid Supabase project was created.
- Added `public.bandits_live_dues` and `public.bandits_live_payments` using a non-destructive database migration. Both have RLS enabled, and direct table privileges for `anon` and `authenticated` are revoked.
- Added service-role-only `bandits_record_live_stripe_payment` RPC with a row lock and an outstanding-balance guard.
- New live tables contain zero rows; existing test ledger still contains one paid test transaction ($1).
- Development checkout and webhook use mode-specific tables and recording functions. The existing test-mode tables and RPC remain unchanged.
- Live mode requires `STRIPE_MODE=live`, `LIVE_PAYMENTS_ENABLED=true`, `LIVE_STRIPE_KEY`, a matching live webhook secret, and Vercel Production. None of these were activated by this work.
- Production deployment and environment variables were not changed.

## Blockers before any live payment
1. **Admin and parent UI** still reference existing test dues and payments tables; update UI and reports to display only the intended mode. Never mix test and live financial totals.
2. Review live-table RLS and service-role privileges and ensure there are no client-accessible RPCs that bypass authorization.
3. Review existing hardcoded owner authorization and guardian links; verify only authorized users can create checkout sessions and that amounts cannot be tampered with.
4. Add robust concurrent-checkout reservation/locking so two valid sessions cannot overpay a due. The live RPC currently returns false on an exceeded balance; a real charge could still succeed at Stripe before reconciliation fails. This is a **launch blocker**.
5. Implement refunds/disputes and payment-method policy; test duplicate, late, invalid, and retried webhooks.
6. Confirm Stripe live account and create a distinct live webhook signing secret. Keep keys only in server-side Production secrets.
7. Perform a staged integration test with the correct authentication, admin reporting, and a clearly documented emergency disable switch.
8. Require explicit launch approval before setting `LIVE_PAYMENTS_ENABLED=true` or publishing live payment functionality.

## Cost and isolation
Same Supabase project, separate payment tables: no additional project subscription, but normal usage charges may still apply. This is **logical** separation, not full database isolation.
