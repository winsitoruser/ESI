/**
 * Internal monitoring alerts — error spike → email and/or webhook.
 * Used by cron `scripts/check-humanify-obs-alerts.js` and platform API.
 */
import { fetchRecentObsEvents, obsPersistStats } from './persist';
import { logEvent } from './index';

export type ObsAlertResult = {
  triggered: boolean;
  errors: number;
  threshold: number;
  windowMin: number;
  emailed: boolean;
  webhooked: boolean;
  message: string;
};

function threshold(): number {
  return Math.max(1, Number(process.env.OBS_ALERT_ERROR_THRESHOLD || 10));
}

function windowMin(): number {
  return Math.max(1, Number(process.env.OBS_ALERT_WINDOW_MIN || 15));
}

function isDiscordWebhook(url: string): boolean {
  return /discord(?:app)?\.com\/api\/webhooks\//i.test(url);
}

function buildWebhookBody(message: string, errors: number, thr: number, win: number) {
  const ui = 'https://humanify.id/platform/observability';
  const line = `[Humanify] Observability alert: ${message}`;
  return {
    text: line, // Slack
    content: line, // Discord
    username: 'Humanify Alerts',
    embeds: [
      {
        title: 'Observability alert',
        description: message,
        color: 0xdc2626,
        fields: [
          { name: 'Errors', value: String(errors), inline: true },
          { name: 'Threshold', value: String(thr), inline: true },
          { name: 'Window', value: `${win}m`, inline: true },
        ],
        url: ui,
      },
    ],
    errors,
    threshold: thr,
    windowMin: win,
    ui,
  };
}

export async function evaluateObsErrorSpike(): Promise<ObsAlertResult> {
  const win = windowMin();
  const thr = threshold();
  const since = Date.now() - win * 60_000;
  const recent = await fetchRecentObsEvents(200);
  const errors = recent.filter(
    (e) => e.level === 'error' && new Date(e.at).getTime() >= since,
  ).length;

  const base: ObsAlertResult = {
    triggered: errors >= thr,
    errors,
    threshold: thr,
    windowMin: win,
    emailed: false,
    webhooked: false,
    message: `${errors} errors in last ${win}m (threshold ${thr})`,
  };

  if (!base.triggered) return base;

  const body = buildWebhookBody(base.message, errors, thr, win);
  const webhook = String(process.env.OBS_ALERT_WEBHOOK_URL || '').trim();
  if (webhook) {
    try {
      const payload = isDiscordWebhook(webhook)
        ? { content: body.content, username: body.username, embeds: body.embeds }
        : body;
      const r = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      base.webhooked = r.ok || r.status === 204;
    } catch {
      base.webhooked = false;
    }
  }

  const to = String(process.env.OBS_ALERT_EMAIL || process.env.SMTP_FROM || '').trim();
  if (to && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    try {
      const { sendEmail } = await import('@/lib/email/sender');
      base.emailed = await sendEmail({
        to,
        subject: `[Humanify] Alert: ${errors} errors / ${win}m`,
        text: `${body.text}\nOpen: ${body.ui}`,
        html: `<p>${body.text}</p><p><a href="${body.ui}">Open observability</a></p>`,
      });
    } catch {
      base.emailed = false;
    }
  }

  logEvent({
    level: 'warn',
    msg: `Obs alert fired: ${base.message}`,
    context: {
      transport: 'internal',
      alert: true,
      emailed: base.emailed,
      webhooked: base.webhooked,
      channel: webhook && isDiscordWebhook(webhook) ? 'discord' : webhook ? 'webhook' : 'none',
    },
  });

  return base;
}

export async function obsAlertSnapshot() {
  const stats = await obsPersistStats();
  const evalResult = await evaluateObsErrorSpike();
  return { persist: stats, alert: evalResult };
}
