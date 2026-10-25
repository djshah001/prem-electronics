# MSG91 SMS and WhatsApp messaging

## Implemented behavior

- When transactional messaging is enabled, completing customer onboarding creates a durable SMS welcome job.
- The WhatsApp welcome job is created only when transactional messaging is enabled and the customer explicitly checks the WhatsApp consent box.
- Administrators can create email or WhatsApp campaigns from `/admin/campaigns`.
- WhatsApp campaign audiences include only verified account phones with explicit WhatsApp opt-in and no suppression.
- Consent is checked again immediately before every campaign submission.
- Provider acceptance is recorded separately from final handset delivery.
- Development uses a fake provider and both live-delivery feature flags default to `false`.

## MSG91 prerequisites

1. Configure an approved SMS Flow/DLT template. The welcome implementation sends the customer name as `VAR1`.
2. Connect and verify the WhatsApp Business sender in MSG91.
3. Create and obtain approval for a WhatsApp welcome template whose first body variable is the customer name.
4. Create approved marketing templates in MSG91 before entering their names in Campaign Manager.
5. Add an unsubscribe/opt-out instruction or approved quick-reply action to marketing templates. Customers can also withdraw consent in Profile Settings.

Official API contracts used by this implementation:

- SMS: `POST https://control.msg91.com/api/v5/flow`
- WhatsApp template: `POST https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/`

## Development configuration

```env
MESSAGE_PROVIDER=fake
TRANSACTIONAL_MESSAGING_ENABLED=true
WHATSAPP_CAMPAIGN_DELIVERY_ENABLED=true
MSG91_SMS_WELCOME_TEMPLATE_ID=development-welcome-template
MSG91_WHATSAPP_INTEGRATED_NUMBER=919999999999
MSG91_WHATSAPP_WELCOME_TEMPLATE_NAME=prem_customer_welcome
MSG91_WHATSAPP_LANGUAGE=en
MSG91_MESSAGE_TIMEOUT_MS=8000
```

The fake provider records `provider_accepted` and never calls MSG91. Use it to verify signup and campaign queue behavior safely.

## Production configuration

```env
MESSAGE_PROVIDER=msg91
TRANSACTIONAL_MESSAGING_ENABLED=true
WHATSAPP_CAMPAIGN_DELIVERY_ENABLED=true
MSG91_AUTHKEY=<secret server-side authkey>
MSG91_SMS_WELCOME_TEMPLATE_ID=<approved Flow template ID>
MSG91_WHATSAPP_INTEGRATED_NUMBER=<digits-only connected sender>
MSG91_WHATSAPP_WELCOME_TEMPLATE_NAME=<approved welcome template name>
MSG91_WHATSAPP_LANGUAGE=en
MSG91_MESSAGE_TIMEOUT_MS=8000
```

Keep both delivery flags `false` until the templates, consent wording, sender, billing, DLT requirements, and a controlled administrator test have been reviewed. Never expose the authkey through a `VITE_*` variable.

## Campaign operation

1. Open `/admin/campaigns` and select **WhatsApp**.
2. Enter the exact approved MSG91 template name and language.
3. Enter template body values in positional order. `{{customerName}}` and `{{campaignName}}` are substituted per recipient.
4. Create the draft and snapshot the audience.
5. Send a test; it goes only to the signed-in administrator's verified phone.
6. Start immediately or schedule in local browser time. The server stores UTC.
7. Pause or cancel while necessary; queued jobs re-check campaign state and consent before submission.

Database migration `0021_dazzling_leech.sql` adds the durable mobile-message queue, mobile consent and suppression tables, campaign channel fields, WhatsApp template settings, and phone recipients.
