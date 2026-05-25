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

export function slackBotToken(): string | undefined {
  return process.env.SLACK_BOT_TOKEN
}

export function isSlackConfigured(): boolean {
  return Boolean(slackWebhookUrl())
}

export function isSlackDmConfigured(): boolean {
  return Boolean(slackBotToken())
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

interface SlackWebApiResponse {
  ok: boolean
  error?: string
  user?: { id: string }
}

async function callSlackApi(method: string, body: Record<string, unknown>): Promise<SlackWebApiResponse> {
  const token = slackBotToken()
  if (!token) return { ok: false, error: 'SLACK_BOT_TOKEN not configured' }
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) return { ok: false, error: `Slack ${method} HTTP ${res.status}` }
  return (await res.json()) as SlackWebApiResponse
}

export async function lookupSlackUserIdByEmail(email: string): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  // GET-style query: users.lookupByEmail expects form-encoded params, not JSON
  const token = slackBotToken()
  if (!token) return { ok: false, error: 'SLACK_BOT_TOKEN not configured' }
  const res = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return { ok: false, error: `Slack users.lookupByEmail HTTP ${res.status}` }
  const data = (await res.json()) as SlackWebApiResponse
  if (!data.ok || !data.user) return { ok: false, error: data.error ?? 'unknown error' }
  return { ok: true, userId: data.user.id }
}

export async function postSlackDm(userId: string, msg: SlackMessage): Promise<{ ok: boolean; error?: string }> {
  const data = await callSlackApi('chat.postMessage', { channel: userId, ...msg })
  if (!data.ok) return { ok: false, error: data.error ?? 'unknown error' }
  return { ok: true }
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

export type BreakType = 'regular' | 'namaz'

export type BreakMessageInput =
  | { employeeName: string; action: 'start'; at: Date; type?: BreakType }
  | { employeeName: string; action: 'end'; startedAt: Date; endedAt: Date; type?: BreakType }

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function breakLabel(type: BreakType | undefined): { emoji: string; noun: string } {
  return type === 'namaz' ? { emoji: ':mosque:', noun: 'namaz break' } : { emoji: ':coffee:', noun: 'break' }
}

export function breakMessage(input: BreakMessageInput): SlackMessage {
  const { emoji, noun } = breakLabel(input.type)
  if (input.action === 'start') {
    const time = formatTime(input.at)
    const headerText = `${emoji} *${input.employeeName}* started a ${noun}`
    const detailText = `at *${time}*`
    return {
      text: `${input.employeeName} started a ${noun} at ${time}`,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: headerText } },
        { type: 'section', text: { type: 'mrkdwn', text: detailText } },
      ],
    }
  }
  const start = formatTime(input.startedAt)
  const end = formatTime(input.endedAt)
  const durationMin = Math.max(0, Math.round((input.endedAt.getTime() - input.startedAt.getTime()) / 60000))
  const headerText = `:arrow_backward: *${input.employeeName}* ended ${noun}`
  const detailText = `*${start}* → *${end}*  •  *${durationMin} min*`
  return {
    text: `${input.employeeName} ended ${noun} (${start} → ${end}, ${durationMin} min)`,
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

export type LateCheckInVariant =
  | 'reminder'      // sent by the sweep — employee hasn't clocked in yet
  | 'late-arrival'  // sent at clock-in time — employee did clock in, but late

export interface LateCheckInMessageInput {
  shiftStart: Date  // e.g. 11:00 AM today
  minutesLate: number
  variant: LateCheckInVariant
}

export function lateCheckInMessage(input: LateCheckInMessageInput): SlackMessage {
  const { shiftStart, minutesLate, variant } = input
  const shiftTime = shiftStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

  if (variant === 'reminder') {
    // Employee hasn't clocked in yet — gentle "where are you?" nudge, DM'd to them.
    const headerText = `:warning: You're late`
    const bodyText = [
      `Your shift started at *${shiftTime}* — it's been *${minutesLate} minutes* and you haven't checked in yet.`,
      `Please check in soon or let your manager know the reason for the delay.`,
    ].join('\n')
    return {
      text: `You haven't checked in yet — shift started at ${shiftTime} (${minutesLate} min ago).`,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: headerText } },
        { type: 'section', text: { type: 'mrkdwn', text: bodyText } },
      ],
    }
  }

  // variant === 'late-arrival' — employee just clocked in, but past the grace window.
  const headerText = `:clock3: Late check-in noted`
  const bodyText = [
    `You checked in *${minutesLate} minutes* after your shift start (*${shiftTime}*).`,
    `Hope everything's okay — please share the reason with your manager when you get a chance.`,
  ].join('\n')
  return {
    text: `You clocked in ${minutesLate} min late (shift started ${shiftTime}).`,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: headerText } },
      { type: 'section', text: { type: 'mrkdwn', text: bodyText } },
    ],
  }
}

export interface NotifyLateCheckInInput extends LateCheckInMessageInput {
  employeeEmail: string  // used to look up the Slack user for the DM
}

export async function notifyLateCheckIn(input: NotifyLateCheckInInput): Promise<void> {
  if (!isSlackDmConfigured()) {
    console.log(`[slack:late-check-in:no-bot-token] email=${input.employeeEmail}`)
    return
  }
  try {
    const lookup = await lookupSlackUserIdByEmail(input.employeeEmail)
    if (!lookup.ok) {
      console.warn(`[slack:late-check-in:lookup-failed] email=${input.employeeEmail} error=${lookup.error}`)
      return
    }
    const result = await postSlackDm(lookup.userId, lateCheckInMessage(input))
    if (!result.ok) console.warn(`[slack:late-check-in:dm-failed] ${result.error}`)
  } catch (e) {
    console.warn(`[slack:late-check-in] ${e instanceof Error ? e.message : 'unknown error'}`)
  }
}
