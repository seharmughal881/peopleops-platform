import { LocalStorage } from './local'
import { S3Storage } from './s3'
import type { Storage } from './types'

export { buildKey } from './types'
export type { Storage, StoredObject } from './types'

let cached: Storage | undefined

export function getStorage(): Storage {
  if (cached) return cached
  const bucket = process.env.AWS_S3_BUCKET
  const region = process.env.AWS_REGION
  if (bucket && region) {
    cached = new S3Storage(bucket, region)
  } else {
    cached = new LocalStorage()
  }
  return cached
}
