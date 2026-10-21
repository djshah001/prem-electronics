-- One-time deployment maintenance for installations that previously exposed
-- website-initiated refunds. This preserves each ledger row and prevents it
-- from being mistaken for retryable work. It never calls a payment provider.
UPDATE payment_refunds
SET status = 'failed',
    failure_reason = 'Disabled by offline refund policy before provider submission.',
    updated_at = NOW()
WHERE status = 'pending'
  AND provider_refund_id IS NULL;
