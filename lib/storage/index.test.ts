import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { _resetStorageCache, getStorage } from './index'
import { LocalStorage } from './local'
import { S3Storage } from './s3'
import { VercelBlobStorage } from './vercel-blob'

const ENV_KEYS = ['AWS_S3_BUCKET', 'AWS_REGION', 'BLOB_READ_WRITE_TOKEN'] as const
const ORIGINAL: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const k of ENV_KEYS) {
    ORIGINAL[k] = process.env[k]
    delete process.env[k]
  }
  _resetStorageCache()
})

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (ORIGINAL[k] === undefined) delete process.env[k]
    else process.env[k] = ORIGINAL[k]
  }
  _resetStorageCache()
})

describe('getStorage backend selection', () => {
  it('falls back to LocalStorage when no env vars are set', () => {
    expect(getStorage()).toBeInstanceOf(LocalStorage)
  })

  it('uses VercelBlobStorage when BLOB_READ_WRITE_TOKEN is set', () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_xxx'
    expect(getStorage()).toBeInstanceOf(VercelBlobStorage)
  })

  it('prefers S3 over Vercel Blob when both are configured', () => {
    process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_xxx'
    process.env.AWS_S3_BUCKET = 'my-bucket'
    process.env.AWS_REGION = 'us-east-1'
    expect(getStorage()).toBeInstanceOf(S3Storage)
  })

  it('does NOT pick S3 when only one of bucket/region is set', () => {
    process.env.AWS_S3_BUCKET = 'my-bucket'
    // AWS_REGION intentionally unset
    expect(getStorage()).toBeInstanceOf(LocalStorage)
  })

  it('memoizes the chosen backend across calls', () => {
    const a = getStorage()
    const b = getStorage()
    expect(a).toBe(b)
  })
})
