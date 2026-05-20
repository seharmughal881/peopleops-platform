import { LocalStorage } from './local'
import { S3Storage } from './s3'
import { VercelBlobStorage } from './vercel-blob'
import type { Storage } from './types'

export { buildKey } from './types'
export type { Storage, StoredObject } from './types'

let cached: Storage | undefined

// Backend selection precedence:
//   1. AWS S3 — if AWS_S3_BUCKET and AWS_REGION are both set
//   2. Vercel Blob — if BLOB_READ_WRITE_TOKEN is set (Vercel auto-sets this
//      when a Blob store is attached to the project)
//   3. Local disk — only safe in environments with a writable filesystem
//      (NOT Vercel/serverless; will throw on first write).
export function getStorage(): Storage {
  if (cached) return cached
  const bucket = process.env.AWS_S3_BUCKET
  const region = process.env.AWS_REGION
  if (bucket && region) {
    cached = new S3Storage(bucket, region)
  } else if (process.env.BLOB_READ_WRITE_TOKEN) {
    cached = new VercelBlobStorage()
  } else {
    cached = new LocalStorage()
  }
  return cached
}

// Test-only: forces re-selection on the next getStorage() call.
export function _resetStorageCache() {
  cached = undefined
}
