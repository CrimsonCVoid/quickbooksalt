import { Resend } from "resend";

let _resend: Resend | null = null;
export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    _resend = new Resend(key);
  }
  return _resend;
}

export function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || "billing@example.com";
}

export function replyToAddress(): string | undefined {
  return process.env.RESEND_REPLY_TO || undefined;
}
