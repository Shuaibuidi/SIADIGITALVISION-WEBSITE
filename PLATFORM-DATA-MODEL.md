# Customer, Orders and Outstanding Invoice Data Model

Status: proposal only — not deployed and not yet connected to Firebase.

## Core records

### platformCustomers/{uid}
- `uid`: Firebase Auth UID; document ID should equal the UID.
- `displayName`, `email`, `phone`, `address`: customer contact fields.
- `createdAt`, `updatedAt`: server timestamps.
- Do not store passwords or payment secrets in this document.

### catalogueItems/{itemId}
- `type`: `service` or `product`.
- `name`, `description`, `category`, `imagePath`.
- `priceAmount`, `currency`: price stored as an integer minor unit where practical, with an explicit currency code (initial default proposal: MWK).
- `active`, `createdAt`, `updatedAt`.
- Only authorized owner/staff can create or change catalogue entries. Public users may read active entries only.

### serviceOrders/{orderId}
- `customerUid`, `orderNumber`, `lines[]`, `currency`, `subtotal`, `discount`, `total`.
- `status`: Submitted, Reviewing, Awaiting Payment, In Progress, Ready, Completed or Cancelled.
- `customerNote`, `createdAt`, `updatedAt`.
- Staff-only notes should be stored separately or protected by rules that customers cannot read.
- Customers can read only their own orders. Only authorized staff can update operational status.

### invoices/{invoiceId}
- `customerUid`, `orderId`, `invoiceNumber`, `currency`, `totalAmount`, `issuedAt`, `dueAt`, `status`.
- Invoice status is derived from payment totals: Unpaid, Partially Paid, Paid, or Overdue. Overdue depends on due date and remaining balance.
- Do not let the customer client set invoice totals or mark an invoice paid.

### invoicePayments/{paymentId}
- `invoiceId`, `orderId`, `customerUid`, `amount`, `currency`, `method`, `providerReference`, `receivedAt`, `verificationStatus`.
- `verificationStatus` should distinguish Pending, Verified, Failed and Reversed.
- Only verified, non-reversed payments count toward the paid total.
- Payment records are append-only for normal workflows; corrections should be represented by a reversal/refund record and audit event rather than silently editing history.
- Payment confirmation must be performed by trusted server-side code after provider verification or an authorized staff cash/bank reconciliation action.

## Outstanding balance calculation

For a single invoice:

`amountPaid = sum(verified, non-reversed invoice payments)`

`balanceDue = max(totalAmount - amountPaid, 0)`

- If amountPaid is zero, status is Unpaid.
- If amountPaid is greater than zero and balanceDue is greater than zero, status is Partially Paid.
- If balanceDue is zero, status is Paid.
- If dueAt has passed and balanceDue is greater than zero, status may be displayed as Overdue.
- Never use a browser-supplied balance or payment total as the source of truth.

## Access model

| Record | Public | Customer | Staff | Owner |
|---|---|---|---|---|
| Active catalogue | Read | Read | Read | Read/write |
| Customer profile | No | Own only | Minimum required | Authorized access |
| Service order | No | Own only | Assigned/authorized | All |
| Invoice | No | Own only | Authorized | All |
| Payment history | No | Own only | Authorized | All |
| Audit log | No | No | No by default | Read |

This table is a target design, not a deployed security rule. Each access path must be implemented and tested with Firebase Emulator or an equivalent isolated test project before production use.

## Important safeguards
- Validate all amounts, currencies, line items and ownership on the server.
- Use server timestamps and trusted invoice numbering.
- Prevent customers from changing their own role or payment status.
- Do not expose staff-only notes or other customers' data.
- Avoid storing raw card details, PINs, passwords or payment provider secrets.
- Keep payment integration disabled until provider verification and reconciliation are implemented.
