import { z } from 'zod'

const optionalUrl = z.string().url().optional().or(z.literal('').transform(() => undefined))
const optionalString = z.string().min(1).optional().or(z.literal('').transform(() => undefined))

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid URL' }),
  DATABASE_URL_UNPOOLED: optionalUrl,

  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters'),

  REDIS_URL: optionalUrl,

  AWS_REGION: optionalString,
  AWS_S3_BUCKET: optionalString,
  AWS_ACCESS_KEY_ID: optionalString,
  AWS_SECRET_ACCESS_KEY: optionalString,
  BLOB_READ_WRITE_TOKEN: optionalString,

  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  SMTP_FROM: optionalString,

  GOOGLE_OAUTH_CLIENT_ID: optionalString,
  GOOGLE_OAUTH_CLIENT_SECRET: optionalString,
  MICROSOFT_OAUTH_CLIENT_ID: optionalString,
  MICROSOFT_OAUTH_CLIENT_SECRET: optionalString,
  MICROSOFT_OAUTH_TENANT: optionalString.transform((v) => v ?? 'common'),
  OAUTH_REDIRECT_BASE_URL: optionalUrl,

  SAML_ENTRY_POINT: optionalUrl,
  SAML_ISSUER: optionalString,
  SAML_IDP_CERT: optionalString,

  BIOMETRIC_SECRET_PEPPER: optionalString,

  SLACK_WEBHOOK_URL: optionalUrl,
  TEAMS_WEBHOOK_URL: optionalUrl,

  PAYROLL_BASE_CURRENCY: z.string().length(3).optional(),
  PAYROLL_FX_RATES: optionalString,
  FINANCE_GL_MAP: optionalString,
}).superRefine((v, ctx) => {
  // S3: if bucket is set, region is required. Region alone is fine —
  // Vercel/AWS Lambda runtimes auto-set AWS_REGION even when S3 isn't used.
  if (v.AWS_S3_BUCKET && !v.AWS_REGION) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['AWS_REGION'],
      message: 'AWS_REGION required when AWS_S3_BUCKET is set',
    })
  }

  // SMTP: if any one is set, host + from are required
  const smtpAny = [v.SMTP_HOST, v.SMTP_PORT, v.SMTP_USER, v.SMTP_PASSWORD, v.SMTP_FROM].some(Boolean)
  if (smtpAny) {
    if (!v.SMTP_HOST) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SMTP_HOST'], message: 'SMTP_HOST required when any SMTP_* is set' })
    if (!v.SMTP_FROM) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SMTP_FROM'], message: 'SMTP_FROM required when any SMTP_* is set' })
  }

  // Google OIDC: both or neither
  if (Boolean(v.GOOGLE_OAUTH_CLIENT_ID) !== Boolean(v.GOOGLE_OAUTH_CLIENT_SECRET)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['GOOGLE_OAUTH_CLIENT_SECRET'],
      message: 'GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set together',
    })
  }

  // Microsoft OIDC: both or neither
  if (Boolean(v.MICROSOFT_OAUTH_CLIENT_ID) !== Boolean(v.MICROSOFT_OAUTH_CLIENT_SECRET)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MICROSOFT_OAUTH_CLIENT_SECRET'],
      message: 'MICROSOFT_OAUTH_CLIENT_ID and MICROSOFT_OAUTH_CLIENT_SECRET must be set together',
    })
  }

  // SAML: all three required together
  const samlParts = [v.SAML_ENTRY_POINT, v.SAML_ISSUER, v.SAML_IDP_CERT].filter(Boolean).length
  if (samlParts > 0 && samlParts < 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['SAML_IDP_CERT'],
      message: 'SAML_ENTRY_POINT, SAML_ISSUER, and SAML_IDP_CERT must all be set together',
    })
  }

  // OAUTH_REDIRECT_BASE_URL required if any SSO provider is enabled
  const anySso = v.GOOGLE_OAUTH_CLIENT_ID || v.MICROSOFT_OAUTH_CLIENT_ID || v.SAML_ENTRY_POINT
  if (anySso && !v.OAUTH_REDIRECT_BASE_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['OAUTH_REDIRECT_BASE_URL'],
      message: 'OAUTH_REDIRECT_BASE_URL required when any SSO provider is configured',
    })
  }
})

type Env = z.infer<typeof schema>

function parseEnv(): Env {
  const parsed = schema.safeParse(process.env)

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    const skip = process.env.SKIP_ENV_VALIDATION === '1'
    const message = `\n❌ Invalid environment variables:\n${issues}\n`
    if (skip) {
      console.warn(`${message}\n(SKIP_ENV_VALIDATION=1 set — continuing anyway)\n`)
      return process.env as unknown as Env
    }
    console.error(message)
    throw new Error('Invalid environment variables. See logs above.')
  }

  return parsed.data
}

export const env = parseEnv()
