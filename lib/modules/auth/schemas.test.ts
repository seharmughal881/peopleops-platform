import { describe, expect, it } from 'vitest'
import { LoginSchema } from './schemas'

describe('LoginSchema', () => {
  it('accepts a valid email + password', () => {
    const result = LoginSchema.safeParse({ email: 'alice@example.com', password: 'hunter2' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('alice@example.com')
      expect(result.data.password).toBe('hunter2')
    }
  })

  it('lowercases mixed-case emails', () => {
    const result = LoginSchema.safeParse({ email: 'Alice@Example.COM', password: 'x' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('alice@example.com')
  })

  it('rejects emails with surrounding whitespace (email() validates before trim())', () => {
    // Behavior follows from zod's .email().trim() ordering — flagged here so
    // anyone changing the schema notices the user-visible effect: pasted
    // emails with stray spaces fail with "invalid email" rather than getting
    // trimmed silently.
    const result = LoginSchema.safeParse({ email: '  alice@example.com  ', password: 'x' })
    expect(result.success).toBe(false)
  })

  it('rejects malformed email addresses', () => {
    const result = LoginSchema.safeParse({ email: 'not-an-email', password: 'x' })
    expect(result.success).toBe(false)
  })

  it('rejects empty password with a useful message', () => {
    const result = LoginSchema.safeParse({ email: 'alice@example.com', password: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const passwordIssue = result.error.issues.find((i) => i.path[0] === 'password')
      expect(passwordIssue?.message).toBe('Password is required')
    }
  })

  it('rejects when fields are missing entirely', () => {
    expect(LoginSchema.safeParse({}).success).toBe(false)
    expect(LoginSchema.safeParse({ email: 'a@b.com' }).success).toBe(false)
    expect(LoginSchema.safeParse({ password: 'x' }).success).toBe(false)
  })
})
