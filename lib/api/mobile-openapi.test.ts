import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { mobileOpenApiSpec, MOBILE_OPENAPI_VERSION } from './mobile-openapi'

const MOBILE_API_DIR = path.resolve(__dirname, '../../app/api/mobile/v1')

// Walk app/api/mobile/v1 and return every {method, path} pair declared by a
// route.ts file. Path segments mirror Next's file-system routing.
function discoverRoutes(): Array<{ method: string; pathName: string }> {
  const results: Array<{ method: string; pathName: string }> = []

  function walk(dir: string, segments: string[]) {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry)
      const st = statSync(full)
      if (st.isDirectory()) {
        walk(full, [...segments, entry])
      } else if (entry === 'route.ts') {
        const src = require('node:fs').readFileSync(full, 'utf8') as string
        const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].filter((m) =>
          new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b`).test(src),
        )
        const pathName = '/' + segments.join('/')
        for (const m of methods) results.push({ method: m.toLowerCase(), pathName })
      }
    }
  }

  walk(MOBILE_API_DIR, [])
  return results
}

// Routes that intentionally aren't part of the documented mobile API surface.
const NON_API_ROUTES = new Set<string>([
  '/openapi', // the spec endpoint itself
  '/docs',    // the Scalar UI page
])

describe('mobile OpenAPI spec', () => {
  it('declares OpenAPI 3.1 and basic info', () => {
    expect(mobileOpenApiSpec.openapi).toBe('3.1.0')
    expect(mobileOpenApiSpec.info.title).toMatch(/Mobile API/i)
    expect(mobileOpenApiSpec.info.version).toBe(MOBILE_OPENAPI_VERSION)
  })

  it('defines BearerAuth and applies it globally', () => {
    expect(mobileOpenApiSpec.components.securitySchemes.BearerAuth.type).toBe('http')
    expect(mobileOpenApiSpec.components.securitySchemes.BearerAuth.scheme).toBe('bearer')
    expect(mobileOpenApiSpec.security).toEqual([{ BearerAuth: [] }])
  })

  it('opts the login endpoint out of BearerAuth', () => {
    const login = mobileOpenApiSpec.paths['/auth/login'].post
    expect(login.security).toEqual([])
  })

  it('documents every route under app/api/mobile/v1 (and nothing more)', () => {
    const discovered = discoverRoutes().filter((r) => !NON_API_ROUTES.has(r.pathName))
    expect(discovered.length).toBeGreaterThan(0)

    const documented = new Set<string>()
    for (const [pathName, methods] of Object.entries(mobileOpenApiSpec.paths)) {
      for (const method of Object.keys(methods)) {
        documented.add(`${method} ${pathName}`)
      }
    }

    const missing: string[] = []
    for (const { method, pathName } of discovered) {
      const key = `${method} ${pathName}`
      if (!documented.has(key)) missing.push(key)
    }
    expect(missing).toEqual([])

    const extras: string[] = []
    const discoveredKeys = new Set(discovered.map((r) => `${r.method} ${r.pathName}`))
    for (const key of documented) {
      if (!discoveredKeys.has(key)) extras.push(key)
    }
    expect(extras).toEqual([])
  })

  it('every documented operation has at least one response and a tag', () => {
    const problems: string[] = []
    for (const [pathName, methods] of Object.entries(mobileOpenApiSpec.paths)) {
      for (const [method, opRaw] of Object.entries(methods as Record<string, unknown>)) {
        const op = opRaw as { tags?: readonly string[]; responses?: Record<string, unknown> }
        if (!op.tags || op.tags.length === 0) problems.push(`${method} ${pathName}: missing tag`)
        if (!op.responses || Object.keys(op.responses).length === 0) {
          problems.push(`${method} ${pathName}: no responses defined`)
        }
      }
    }
    expect(problems).toEqual([])
  })

  it('every $ref points at a schema that exists', () => {
    const schemas = mobileOpenApiSpec.components.schemas
    const responses = mobileOpenApiSpec.components.responses
    const seen: string[] = []

    function collect(node: unknown) {
      if (!node || typeof node !== 'object') return
      if (Array.isArray(node)) {
        for (const item of node) collect(item)
        return
      }
      for (const [k, v] of Object.entries(node)) {
        if (k === '$ref' && typeof v === 'string') seen.push(v)
        else collect(v)
      }
    }
    collect(mobileOpenApiSpec)

    const broken = seen.filter((ref) => {
      if (ref.startsWith('#/components/schemas/')) {
        const name = ref.slice('#/components/schemas/'.length)
        return !(name in schemas)
      }
      if (ref.startsWith('#/components/responses/')) {
        const name = ref.slice('#/components/responses/'.length)
        return !(name in responses)
      }
      return true
    })

    expect(broken).toEqual([])
  })
})
