/**
 * Mailer seam (Brief 14 §1). Config seam per ADR-0011 spirit: the auth flows call
 * `send`; a real provider (Postmark/SES/…) is a later swap. The slice needs
 * verification/reset *links minted and consumable*, not a real inbox — so the dev
 * default captures messages (LogMailer) and the ladder golden reads the captured
 * token straight back out.
 */
export interface Mailer {
  send(msg: { to: string; subject: string; body: string }): Promise<void>;
}

/** Dev/test mailer: records every message (and logs it). Tests read `.sent`. */
export class LogMailer implements Mailer {
  readonly sent: { to: string; subject: string; body: string }[] = [];
  constructor(private readonly log: (s: string) => void = (s) => console.log(s)) {}
  async send(msg: { to: string; subject: string; body: string }): Promise<void> {
    this.sent.push(msg);
    this.log(`[mail] to=${msg.to} subject=${JSON.stringify(msg.subject)}\n${msg.body}`);
  }
  /** Most recent message sent to an address (test helper). */
  lastTo(to: string): { to: string; subject: string; body: string } | undefined {
    for (let i = this.sent.length - 1; i >= 0; i--) if (this.sent[i]!.to === to) return this.sent[i];
    return undefined;
  }
}
