import { NextResponse } from 'next/server'
import { mobileOpenApiSpec } from '@/lib/api/mobile-openapi'

export const dynamic = 'force-static'

export function GET() {
  return NextResponse.json(mobileOpenApiSpec, {
    headers: {
      // Allow direct loading by tooling (Scalar UI, Postman, etc.) from any origin.
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
