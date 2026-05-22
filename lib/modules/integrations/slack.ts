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

export interface AttendanceMessageInput {
  employeeName: string
  action: 'in' | 'out'
  at: Date
  source?: string
  hours?: number
}

export function attendanceMessage(input: AttendanceMessageInput): SlackMessage {
  const { employeeName, action, at, source, hours } = input
  const verb = action === 'in' ? 'clocked in' : 'clocked out'
  const time = at.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const date = at.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const details: string[] = [`*${date}* at *${time}*`]
  if (source) details.push(`via _${source}_`)
  if (action === 'out' && typeof hours === 'number') details.push(`worked *${hours.toFixed(2)}h*`)
  const headerText = `*${employeeName}* ${verb}`
  const detailText = details.join('  •  ')
  return {
    text: `${employeeName} ${verb} at ${time} on ${date}`,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: headerText } },
      { type: 'section', text: { type: 'mrkdwn', text: detailText } },
    ],
  }
}

export async function notifyAttendance(input: AttendanceMessageInput): Promise<void> {
  if (!isSlackConfigured()) return
  try {
    const result = await postToSlack(attendanceMessage(input))
    if (!result.ok) console.warn(`[slack:attendance] ${result.error}`)
  } catch (e) {
    console.warn(`[slack:attendance] ${e instanceof Error ? e.message : 'unknown error'}`)
  }
}

export type BreakMessageInput =
  | { employeeName: string; action: 'start'; at: Date }
  | { employeeName: string; action: 'end'; startedAt: Date; endedAt: Date }

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export function breakMessage(input: BreakMessageInput): SlackMessage {
  if (input.action === 'start') {
    const time = formatTime(input.at)
    const headerText = `:coffee: *${input.employeeName}* started a break`
    const detailText = `at *${time}*`
    return {
      text: `${input.employeeName} started a break at ${time}`,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: headerText } },
        { type: 'section', text: { type: 'mrkdwn', text: detailText } },
      ],
    }
  }
  const start = formatTime(input.startedAt)
  const end = formatTime(input.endedAt)
  const durationMin = Math.max(0, Math.round((input.endedAt.getTime() - input.startedAt.getTime()) / 60000))
  const headerText = `:arrow_backward: *${input.employeeName}* ended break`
  const detailText = `*${start}* → *${end}*  •  *${durationMin} min*`
  return {
    text: `${input.employeeName} ended break (${start} → ${end}, ${durationMin} min)`,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: headerText } },
      { type: 'section', text: { type: 'mrkdwn', text: detailText } },
    ],
  }
}

export async function notifyBreak(input: BreakMessageInput): Promise<void> {
  if (!isSlackConfigured()) return
  try {
    const result = await postToSlack(breakMessage(input))
    if (!result.ok) console.warn(`[slack:break] ${result.error}`)
  } catch (e) {
    console.warn(`[slack:break] ${e instanceof Error ? e.message : 'unknown error'}`)
  }
}
