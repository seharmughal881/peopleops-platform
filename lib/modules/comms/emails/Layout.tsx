import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { type ReactNode } from 'react'

const FOOTER = process.env.EMAIL_FOOTER ?? 'Sent from your HR system.'
const BRAND = process.env.EMAIL_BRAND ?? 'HR'
const ACCENT = process.env.EMAIL_ACCENT ?? '#6366f1'

const styles = {
  body: {
    backgroundColor: '#f6f8fb',
    margin: 0,
    padding: '24px 0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#1f2937',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    maxWidth: 560,
    margin: '0 auto',
    padding: 0,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: ACCENT,
    padding: '20px 24px',
    color: '#ffffff',
  },
  brand: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: 0.2,
    color: '#ffffff',
  },
  content: { padding: '24px' },
  footer: {
    borderTop: '1px solid #e5e7eb',
    padding: '14px 24px',
    fontSize: 12,
    color: '#6b7280',
  },
} satisfies Record<string, React.CSSProperties>

export function EmailLayout({
  preview,
  children,
}: {
  preview: string
  children: ReactNode
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.brand}>{BRAND}</Text>
          </Section>
          <Section style={styles.content}>{children}</Section>
          <Hr style={{ margin: 0, borderColor: '#e5e7eb' }} />
          <Section style={styles.footer}>
            <Text style={{ margin: 0 }}>{FOOTER}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const emailStyles = {
  h1: { margin: '0 0 12px', fontSize: 20, fontWeight: 600 } as React.CSSProperties,
  p: { margin: '0 0 12px', fontSize: 14, lineHeight: '22px' } as React.CSSProperties,
  muted: { margin: '0 0 12px', fontSize: 13, color: '#6b7280' } as React.CSSProperties,
  button: {
    display: 'inline-block',
    padding: '10px 18px',
    borderRadius: 8,
    backgroundColor: ACCENT,
    color: '#ffffff',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 600,
  } as React.CSSProperties,
  kv: {
    margin: '12px 0',
    borderTop: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
    padding: '10px 0',
  } as React.CSSProperties,
  kvRow: { fontSize: 13, lineHeight: '22px', margin: 0 } as React.CSSProperties,
  kvKey: { color: '#6b7280', marginRight: 8 } as React.CSSProperties,
}
