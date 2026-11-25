# siadigitalvision.com — Full Platform Build Plan

## Product direction
Build a functional customer and business platform inspired by the workflow of a GSM service marketplace, using the exact platform identity **siadigitalvision.com**. This is not a copy of another company's branding, text, images, or proprietary implementation.

## Existing systems that must be preserved
- Existing website repository: `Shuaibuidi/SIADIGITALVISION-WEBSITE`.
- Existing learning system: `Shuaibuidi/MOBILE-TECH-ROOM`.
- Existing Mobile Tech Room Firebase project: `mobile-tech-room`, with existing Authentication, Firestore course/lesson/student data, and related integrations.
- Existing Mobile Tech Room GitHub Pages URL and Android app configuration must remain unchanged until any future integration has been tested and explicitly approved.
- The existing Firestore rules are restrictive by design. Do not loosen them with broad authenticated-user read/write access.

## Platform modules

### Public storefront
- Homepage, service categories, service details, products/accessories catalogue, search, contact and WhatsApp.
- Categories: Printing Services; Phone Repair & Maintenance; Unlocking & Security Solutions; Digital & Account Solutions; GSM Tools & Technical Services; Accessories & Sales.
- Mobile Tech Room entry point remains linked to the existing learning centre.

### Customer account
- Sign up, sign in, sign out, password reset and account profile.
- Customer dashboard with order history, service requests, invoices/receipts, payment records and notifications.
- Customers can see only their own private records.

### Service ordering
- Customer selects a service/product, provides device/job details and attachments where appropriate, receives a unique reference number, and follows status updates.
- Initial statuses: Submitted, Reviewing, Awaiting Payment, In Progress, Ready, Completed, Cancelled.
- Admin can add notes and update status. Customer-facing notes must be distinct from private staff notes.

### Payments and account balances
- Payment records must be tied to an order/invoice and reconciled against provider-confirmed transactions.
- Never mark an order paid based only on a browser redirect or customer-submitted screenshot.
- Do not launch wallet/deposit/withdrawal or reseller credit features until the payment provider, reconciliation rules, refunds, fraud controls and legal/compliance requirements are specified.
- Malawi payment-provider choice and live credentials are a later setup decision. Keep payment integration behind a server-side function; never place secret keys in browser code.

### Owner/admin dashboard
- Manage service catalogue, product catalogue, categories, orders, customers, payment records, invoice numbers, status updates and site content.
- Role-based access; owner-only controls are enforced by server/database rules, not just hidden UI elements.
- Audit log for sensitive administrative actions.

### Future reseller/member features
- Optional reseller roles, commissions, wholesale pricing or account credit only after the owner defines the business rules and payment/reconciliation requirements.

## Safe technical approach
1. Audit the current website repository and current Mobile Tech Room app, Firebase Auth usage, Firestore rules, Storage rules and external integrations.
2. Create a separate development branch for the platform foundation. Keep the public `main` branch and the Mobile Tech Room repository untouched while developing.
3. Decide the identity architecture before writing authentication code. Reuse the existing Mobile Tech Room Firebase project only if the audit confirms it can safely support the additional application. Preserve existing user documents, roles, claims and learning data.
4. Add new platform data under clearly namespaced collections (for example `marketplaceCustomers`, `serviceOrders`, `catalogueItems`, `paymentRecords`, `adminAuditLogs`) only after designing restrictive Firestore and Storage rules.
5. Use trusted server-side functions for payment verification, invoice numbering where needed, admin-only operations and any privileged data changes.
6. Build and test the public catalogue and customer account before enabling live payments.
7. Test permissions with customer, staff and owner accounts. Verify that one customer cannot read another customer's orders, invoices or payment data.
8. Deploy only after the owner reviews and approves the changes. Do not alter the existing Mobile Tech Room production deployment as part of the first release.

## Delivery stages
- Stage 0 — Audit and architecture: inspect existing source, Firebase project configuration and security rules. No production data or rules changed.
- Stage 1 — Platform shell: responsive storefront, navigation, service/product categories and dedicated Mobile Tech Room link.
- Stage 2 — Authentication and profiles: shared-account decision, registration/login/password reset, role model and access tests.
- Stage 3 — Catalogue and ordering: product/service records, order submission, attachments, customer order tracking and admin workflow.
- Stage 4 — Invoices and payments: invoice/receipt generation, provider integration, server-side confirmation and reconciliation.
- Stage 5 — Owner dashboard and reporting: customer/order/payment management, reports, audit log and notification controls.
- Stage 6 — Production readiness: mobile testing, security rules tests, backup/recovery checks, domain/hosting setup and controlled release.

## Decisions still required before payment implementation
- Payment provider(s) to support in Malawi (for example Airtel Money, TNM Mpamba, bank/card, or a supported payment aggregator).
- Whether payments are per order only or whether a prepaid wallet/account balance is genuinely required.
- Whether the platform will initially serve only S I A Tech Print Media customers or also external technicians/resellers.

## Non-negotiable safety rules
- Never expose Firebase service-account credentials, payment secrets or private API keys in client-side code or GitHub.
- Never replace existing Firestore rules with permissive rules.
- Never migrate or delete existing Mobile Tech Room collections or user records as part of this work.
- Do not claim payments, backups, authentication sharing or cross-app single sign-on work until tested end-to-end.
