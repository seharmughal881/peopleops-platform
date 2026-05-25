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
  employeeName: string
  shiftStart: Date  // e.g. 11:00 AM today
  minutesLate: number
  variant: LateCheckInVariant
}

export function lateCheckInMessage(input: LateCheckInMessageInput): SlackMessage {
  const { employeeName, shiftStart, minutesLate, variant } = input
  const shiftTime = shiftStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

  if (variant === 'reminder') {
    // Employee hasn't clocked in yet — gentle "where are you?" nudge.
    const headerText = `:warning: *@${employeeName}* — Where are you?`
    const bodyText = [
      `Your shift started at *${shiftTime}*, it's been *${minutesLate} minutes* and we haven't seen you yet.`,
      `Please check in soon or let your manager know if there's a delay.`,
    ].join('\n')
    return {
      text: `@${employeeName} hasn't checked in yet — shift started at ${shiftTime} (${minutesLate} min ago).`,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: headerText } },
        { type: 'section', text: { type: 'mrkdwn', text: bodyText } },
      ],
    }
  }

  // variant === 'late-arrival' — employee just clocked in, but past the grace window.
  const headerText = `:clock3: *@${employeeName}* — Late check-in noted`
  const bodyText = [
    `Checked in *${minutesLate} minutes* after shift start (*${shiftTime}*).`,
    `Hope everything's okay — please share the reason with your manager when you get a chance.`,
  ].join('\n')
  return {
    text: `@${employeeName} clocked in ${minutesLate} min late (shift started ${shiftTime}).`,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: headerText } },
      { type: 'section', text: { type: 'mrkdwn', text: bodyText } },
    ],
  }
}

export async function notifyLateCheckIn(input: LateCheckInMessageInput): Promise<void> {
  if (!isSlackConfigured()) return
  try {
    const result = await postToSlack(lateCheckInMessage(input))
    if (!result.ok) console.warn(`[slack:late-check-in] ${result.error}`)
  } catch (e) {
    console.warn(`[slack:late-check-in] ${e instanceof Error ? e.message : 'unknown error'}`)
  }
}
