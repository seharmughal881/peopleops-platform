import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isTeamsConfigured,
  postToTeams,
  teamsAnnouncementMessage,
  teamsNotificationMessage,
  teamsWebhookUrl,
} from './teams'

const ORIGINAL_FETCH = global.fetch

describe('teams configuration', () => {
  const ORIGINAL = process.env.TEAMS_WEBHOOK_URL

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.TEAMS_WEBHOOK_URL
    else process.env.TEAMS_WEBHOOK_URL = ORIGINAL
  })

  it('reports unconfigured when TEAMS_WEBHOOK_URL is unset', () => {
    delete process.env.TEAMS_WEBHOOK_URL
    expect(isTeamsConfigured()).toBe(false)
    expect(teamsWebhookUrl()).toBeUndefined()
  })

  it('reports configured when TEAMS_WEBHOOK_URL is set', () => {
    process.env.TEAMS_WEBHOOK_URL = 'https://example.webhook.office.com/abc'
    expect(isTeamsConfigured()).toBe(true)
    expect(teamsWebhookUrl()).toBe('https://example.webhook.office.com/abc')
  })
})

describe('teamsAnnouncementMessage', () => {
  it('includes author in the summary when provided', () => {
    const msg = teamsAnnouncementMessage('Office closed Friday', 'Long weekend!', 'Adnan')
    expect(msg.summary).toBe('Office closed Friday — by Adnan')
    expect(msg.title).toBe(msg.summary)
    expect(msg.text).toBe('Long weekend!')
    expect(msg['@type']).toBe('MessageCard')
    expect(msg.themeColor).toBe('0078D7')
  })

  it('omits author from summary when not provided', () => {
    const msg = teamsAnnouncementMessage('All hands', 'Monday 10am')
    expect(msg.summary).toBe('All hands')
    expect(msg.title).toBe('All hands')
  })
})

describe('teamsNotificationMessage', () => {
  it('handles missing body gracefully', () => {
    const msg = teamsNotificationMessage('Leave approved')
    expect(msg.summary).toBe('Leave approved')
    expect(msg.text).toBe('')
  })

  it('formats title + body', () => {
    const msg = teamsNotificationMessage('Review pending', 'Q2 360 review')
    expect(msg.title).toBe('Review pending')
    expect(msg.text).toBe('Q2 360 review')
  })
})

describe('postToTeams', () => {
  const ORIGINAL = process.env.TEAMS_WEBHOOK_URL

  beforeEach(() => {
    process.env.TEAMS_WEBHOOK_URL = 'https://example.webhook.office.com/abc'
  })

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.TEAMS_WEBHOOK_URL
    else process.env.TEAMS_WEBHOOK_URL = ORIGINAL
    global.fetch = ORIGINAL_FETCH
  })

  it('returns ok=false when webhook is not configured', async () => {
    delete process.env.TEAMS_WEBHOOK_URL
    const result = await postToTeams(teamsNotificationMessage('x'))
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/not configured/)
  })

  it('returns ok=true on 200 response', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const result = await postToTeams(teamsNotificationMessage('hello'))
    expect(result.ok).toBe(true)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.webhook.office.com/abc',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  it('returns ok=false with status code on non-2xx response', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('rate limited', { status: 429 }))
    const result = await postToTeams(teamsNotificationMessage('hello'))
    expect(result.ok).toBe(false)
    expect(result.error).toBe('Teams 429: rate limited')
  })

  it('returns ok=false when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('DNS lookup failed'))
    const result = await postToTeams(teamsNotificationMessage('hello'))
    expect(result.ok).toBe(false)
    expect(result.error).toBe('DNS lookup failed')
  })
})
