import crypto from 'node:crypto';
import { z } from 'zod';
import { env } from '../../config/env.js';

export type MessageSubmission = { providerMessageId: string };

export interface MessagingProvider {
  sendSms(input: { recipient: string; templateId: string; variables: Record<string, string> }): Promise<MessageSubmission>;
  sendWhatsapp(input: { recipient: string; templateName: string; language: string; bodyValues: string[] }): Promise<MessageSubmission>;
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

async function submit(path: string, body: Record<string, unknown>): Promise<MessageSubmission> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.MSG91_MESSAGE_TIMEOUT_MS);
  try {
    const response = await fetch(`https://control.msg91.com${path}`, {
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

  sendWhatsapp(input: { recipient: string; templateName: string; language: string; bodyValues: string[] }) {
    const components = Object.fromEntries(input.bodyValues.map((value, index) => [
      `body_${index + 1}`,
      { type: 'text', value },
    ]));
    return submit('/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
      integrated_number: env.MSG91_WHATSAPP_INTEGRATED_NUMBER,
      content_type: 'template',
      payload: {
        type: 'template',
        template: {
          name: input.templateName,
          language: { code: input.language, policy: 'deterministic' },
          to_and_components: [{ to: [recipientDigits(input.recipient)], components }],
        },
      },
    });
  }
}

export class FakeMessagingProvider implements MessagingProvider {
  async sendSms() { return { providerMessageId: `fake-sms-${crypto.randomUUID()}` }; }
  async sendWhatsapp() { return { providerMessageId: `fake-whatsapp-${crypto.randomUUID()}` }; }
}

export const messagingProvider: MessagingProvider = env.MESSAGE_PROVIDER === 'msg91'
  ? new Msg91MessagingProvider()
  : new FakeMessagingProvider();
