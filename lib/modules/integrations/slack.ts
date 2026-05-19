interface SlackBlock {
  type: 'section' | 'header' | 'divider'
  text?: { type: 'mrkdwn' | 'plain_text'; text: string }
}

export interface SlackMessage {
  text: string
  blocks?: SlackBlock[]
}

export function slackWebhookUrl(): string | undefined {
  return process.env.SLACK_WEBHOOK_URL
}

export function isSlackConfigured(): boolean {
  return Boolean(slackWebhookUrl())
}

export async function postToSlack(msg: SlackMessage): Promise<{ ok: boolean; error?: string }> {
  const url = slackWebhookUrl()
  if (!url) return { ok: false, error: 'SLACK_WEBHOOK_URL not configured' }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    })
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `Slack ${res.status}: ${body}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' }
  }
}

export function announcementMessage(title: string, body: string, authorName?: string): SlackMessage {
  const header = authorName ? `:loudspeaker: *${title}* — _by ${authorName}_` : `:loudspeaker: *${title}*`
  return {
    text: `${title}\n${body}`,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: header } },
      { type: 'section', text: { type: 'mrkdwn', text: body } },
    ],
  }
}
