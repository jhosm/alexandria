# Payment Integration Use Cases

This document describes common workflows and integration patterns for the Payments API.

## Processing a Payment

This section covers the end-to-end flow for processing a payment through the API.

### Creating a Payment Intent

Before collecting payment details, create a Payment Intent to represent the transaction. The Payment Intent tracks the lifecycle of the payment from creation through confirmation.

Send a POST request to `/v1/payment-intents` with the amount, currency, and optional metadata. The response includes a client secret used to confirm the payment on the frontend.

### Confirming the Payment

Once the customer provides their payment method, confirm the Payment Intent by sending the payment method ID along with the client secret. The API will attempt to charge the payment method and return the result.

If the payment requires additional authentication (such as 3D Secure), the response will include a `next_action` object with instructions for completing the authentication flow.

### Handling Payment Failures

Payments can fail for various reasons including insufficient funds, expired cards, or fraud detection. When a payment fails, the Payment Intent status changes to `requires_payment_method`, allowing the customer to try again with a different payment method.

Always implement proper error handling to gracefully manage failed payments and provide clear feedback to the customer.

## Managing Subscriptions

Subscriptions allow you to charge customers on a recurring basis for ongoing services.

### Creating a Subscription

To create a subscription, you need a customer with a saved payment method and a price object that defines the billing interval and amount. Send a POST request to `/v1/subscriptions` with the customer ID and price ID.

The first invoice is created and charged immediately. Subsequent invoices are generated automatically based on the billing interval defined in the price.

### Handling Subscription Lifecycle Events

Subscriptions emit various webhook events throughout their lifecycle. The most important events to handle are:

- `subscription.created` - Fired when a new subscription is created
- `subscription.updated` - Fired when a subscription is modified
- `subscription.deleted` - Fired when a subscription is canceled
- `invoice.payment_failed` - Fired when a recurring payment fails

Listen for these events to keep your application state in sync with the subscription status.

## Implementing Refunds

This section describes how to process full and partial refunds through the API. It covers the complete refund workflow including validation, processing, and webhook notifications that your application should handle to maintain accurate records.

Refunds are an essential part of any payment system. When a customer requests a refund, the merchant needs to process it quickly and accurately. The Payments API provides a straightforward interface for handling refunds, but there are several important considerations to keep in mind.

First, you need to understand the different types of refunds available. A full refund returns the entire payment amount to the customer, while a partial refund returns only a portion of the original payment. Both types of refunds are processed through the same API endpoint, but with different parameters.

To process a refund, you need the original payment ID and the amount to refund. For full refunds, you can omit the amount parameter and the API will automatically refund the full payment amount. For partial refunds, specify the exact amount to refund in the smallest currency unit.

The refund process involves several steps. First, the API validates the refund request to ensure the original payment exists and is in a refundable state. Then, it initiates the refund with the payment processor. The refund is initially created with a status of `pending` while the processor handles the return of funds.

Refund processing times vary by payment method and processor. Credit card refunds typically take 5-10 business days to appear on the customer's statement. Bank transfer refunds may take longer depending on the banking institutions involved. During this time, the refund status will transition from `pending` to `processing` and finally to `succeeded`.

It is important to handle refund webhook events to track the status of refunds in your application. The API sends the following webhook events for refunds:

- `refund.created` - Sent when a refund is initially created
- `refund.updated` - Sent when a refund status changes
- `refund.failed` - Sent if a refund cannot be processed

When a refund fails, the funds are returned to the merchant's account and the refund status is set to `failed`. Common reasons for refund failures include the original payment being too old, the customer's account being closed, or the payment method no longer being valid.

You should also consider implementing idempotency for refund requests. Since refund operations involve moving money, it is critical to prevent duplicate refunds. Include an `Idempotency-Key` header with each refund request to ensure that retried requests do not result in multiple refunds being processed.

In addition to processing individual refunds, you may need to implement bulk refund operations for scenarios such as service outages or product recalls. The API supports batch refund processing through the `/v1/refunds/batch` endpoint, which accepts an array of refund requests and processes them concurrently.

When handling partial refunds, keep track of the total amount refunded for each payment to prevent over-refunding. The API will reject refund requests that would cause the total refunded amount to exceed the original payment amount, but it is good practice to validate this on your end as well.

Error handling for refunds should be comprehensive. In addition to the standard API error responses, refund operations can encounter specific errors such as `charge_already_refunded`, `charge_disputed`, and `charge_expired`. Each of these errors requires different handling in your application.

Finally, make sure to update your application's records when a refund is processed. This includes updating the order status, adjusting inventory if applicable, sending confirmation emails to the customer, and updating any financial reports or dashboards. Proper record-keeping ensures accurate accounting and helps resolve any disputes that may arise.

### Processing a Full Refund

To process a full refund, send a POST request to `/v1/refunds` with the payment ID. The API will automatically refund the full amount. No amount parameter is needed for full refunds.

### Processing a Partial Refund

For partial refunds, include the `amount` parameter in your request to `/v1/refunds`. The amount must be less than or equal to the remaining refundable amount on the original payment.
