# Stage 0 — Existing System Audit

Audit date: 25 November 2026

## Website repository
- Repository: `Shuaibuidi/SIADIGITALVISION-WEBSITE`
- Default branch: `main`
- Public homepage file: `index.html`
- The website is currently a static HTML/CSS page. No package manifest or application backend was identified in the repository at this stage.
- Development is isolated on `feature/full-platform-foundation`; do not merge into `main` until reviewed.

## Existing learning platform
- Repository: `Shuaibuidi/MOBILE-TECH-ROOM`
- Existing production source: `index.html` (large single-page application).
- Existing Firebase SDK: 11.6.0.
- Existing Firebase project: `mobile-tech-room`.
- Existing Firebase Auth methods in the app include account registration, email/password sign-in, password reset, auth-state observation, profile update and sign-out.
- Existing Firestore top-level collection references identified in the source: `users`, `courses`, and `supportMessages`. Nested data includes user enrollments/support state and course lessons/questions/replies, as defined by the existing security rules.
- Existing application also contains integrations outside Firebase for selected workflows. These must be mapped before any migration or replacement.
- The production Android app is configured to load the existing Mobile Tech Room GitHub Pages site. Do not change its URL or app configuration during this platform stage.

## Existing security baseline
- The owner supplied restrictive Firestore rules in the earlier project discussion. They authorize only explicitly defined user, course, lesson and support paths. Unmatched paths are denied by default.
- The rules must not be replaced with broad authenticated-user read/write permissions.
- The rules pasted in the earlier discussion do not authorize new marketplace collections. New rules must be designed and tested before the platform writes any business records.
- Storage upload permissions and current Firebase Auth authorized domains still need a direct review in Firebase Console before production integration.

## Platform decision confirmed
- Customer balances mean **outstanding invoice balances only**.
- No prepaid wallet, stored-value account, customer deposit balance or withdrawal feature.
- An invoice should show total, payments received and remaining amount due.
- Partial payments may be recorded against an invoice. The remaining amount is derived from verified payment records.

## Architecture recommendation (pending implementation and testing)
- Keep the current Mobile Tech Room application and data intact.
- Keep the new website repository separate.
- Before sharing authentication, confirm whether the existing Firebase project can safely host the additional customer identity model and whether existing student/instructor/admin role handling can remain isolated.
- Use a separate namespace for business platform records, such as `platformCustomers`, `serviceOrders`, `catalogueItems`, `invoices`, `invoicePayments`, and `adminAuditLogs`. Final names and field schemas must be approved before use.
- Customer access should be restricted by authenticated UID and ownership checks. Owner/staff privileges must be enforced in trusted backend code and database rules, not only in the browser interface.
- Payment provider credentials and transaction verification must stay server-side. Browser redirects and uploaded payment screenshots are not proof of payment.

## Not yet verified
- Whether the existing Firebase Authentication user pool should be shared directly or linked through a controlled account handoff.
- Firebase Storage rules and actual upload constraints.
- Firebase Auth authorized domains for the new domain.
- Existing server-side integration deployment and environment variables.
- Payment provider availability, settlement/reconciliation API and fees.
- Production domain purchase, DNS and hosting configuration.

## Audit conclusion
The safest next step is to build and review the new platform's interface and data/security contracts on the development branch. No production Firebase rules, user records, course data, Android configuration or live payment settings have been changed by this audit.
