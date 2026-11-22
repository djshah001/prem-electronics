import crypto from 'node:crypto';
import { z } from 'zod';
import { env } from '../../config/env.js';

export type MessageSubmission = { providerMessageId: string };

export type WhatsappComponentHeader = {
  type: 'document' | 'image' | 'video' | 'text';
  filename?: string;
  value: string;
};

export type WhatsappComponentButton = {
  subtype: 'url' | 'quick_reply';
  type: 'text';
  value: string;
};

export type WhatsappMessageInput = {
  recipient: string;
  templateName: string;
  language?: string;
  namespace?: string;
  bodyValues?: string[];
  header?: WhatsappComponentHeader;
  button?: WhatsappComponentButton;
  components?: Record<string, unknown>;
};

export interface MessagingProvider {
  sendSms(input: { recipient: string; templateId: string; variables: Record<string, string> }): Promise<MessageSubmission>;
  sendWhatsapp(input: WhatsappMessageInput): Promise<MessageSubmission>;
}

const responseSchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  hasError: z.boolean().optional(),
  request_id: z.string().optional(),
  requestId: z.string().optional(),
  message: z.union([z.string(), z.number()]).optional(),
}).passthrough();

const recipientDigits = (phone: string) => phone.replace(/^\+/, '');

async function submit(path: string, body: Record<string, unknown>, baseUrl = env.MSG91_BASE_URL): Promise<MessageSubmission> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.MSG91_MESSAGE_TIMEOUT_MS);
  try {
    const base = baseUrl.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const response = await fetch(`${base}${cleanPath}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authkey: env.MSG91_AUTHKEY!,
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    if (text.length > 32_768) throw new Error('MSG91 returned an oversized response.');
    let raw: unknown = {};
    if (text) {
      try { raw = JSON.parse(text); }
      catch { throw new Error('MSG91 returned malformed JSON.'); }
    }
    const parsed = responseSchema.safeParse(raw);
    const result = parsed.success ? parsed.data : {};
    const state = `${result.type ?? ''} ${result.status ?? ''}`.toLowerCase();
    if (!response.ok || result.hasError === true || state.includes('error') || state.includes('fail')) {
      throw new Error('MSG91 rejected the message submission.');
    }
    return {
      providerMessageId: result.request_id ?? result.requestId ?? String(result.message ?? `msg91-${crypto.randomUUID()}`),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('MSG91 message submission timed out.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export class Msg91MessagingProvider implements MessagingProvider {
  sendSms(input: { recipient: string; templateId: string; variables: Record<string, string> }) {
    return submit('/api/v5/flow', {
      template_id: input.templateId,
      short_url: '0',
      realTimeResponse: '1',
      recipients: [{ mobiles: recipientDigits(input.recipient), ...input.variables }],
    });
  }

  sendWhatsapp(input: WhatsappMessageInput) {
    const components: Record<string, unknown> = input.components ? { ...input.components } : {};

    if (input.header) {
      components.header_1 = {
        type: input.header.type,
        ...(input.header.filename ? { filename: input.header.filename } : {}),
        value: input.header.value,
      };
    }

    if (input.bodyValues) {
      input.bodyValues.forEach((value, index) => {
        components[`body_${index + 1}`] = {
          type: 'text',
          value,
        };
      });
    }

    if (input.button) {
      components.button_1 = {
        subtype: input.button.subtype,
        type: input.button.type,
        value: input.button.value,
      };
    }

    return submit('/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
      integrated_number: env.MSG91_WHATSAPP_INTEGRATED_NUMBER,
      content_type: 'template',
      payload: {
        messaging_product: 'whatsapp',
        type: 'template',
        template: {
          name: input.templateName,
          language: { code: input.language ?? env.MSG91_WHATSAPP_LANGUAGE, policy: 'deterministic' },
          ...(input.namespace ? { namespace: input.namespace } : {}),
          to_and_components: [{ to: [recipientDigits(input.recipient)], components }],
        },
      },
    });
  }
}

export class FakeMessagingProvider implements MessagingProvider {
  async sendSms(_input?: { recipient: string; templateId: string; variables: Record<string, string> }) {
    return { providerMessageId: `fake-sms-${crypto.randomUUID()}` };
  }
  async sendWhatsapp(_input?: WhatsappMessageInput) {
    return { providerMessageId: `fake-whatsapp-${crypto.randomUUID()}` };
  }
}

export const messagingProvider: MessagingProvider = env.MESSAGE_PROVIDER === 'msg91'
  ? new Msg91MessagingProvider()
  : new FakeMessagingProvider();
