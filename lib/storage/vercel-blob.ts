import { put, del, head } from '@vercel/blob'
import type { Storage, StoredObject } from './types'

// Vercel Blob adapter. Uses the BLOB_READ_WRITE_TOKEN env var that Vercel sets
// when a Blob store is provisioned. Pathnames serve as our opaque key; the
// public URL is fetched on demand via `head()` so callers don't need to know
// or persist the store hostname.
export class VercelBlobStorage implements Storage {
  async put(key: string, data: Uint8Array, contentType: string) {
    await put(key, Buffer.from(data), {
      access: 'public',
      addRandomSuffix: false,
      contentType,
    })
    return { key }
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const meta = await head(key)
      const res = await fetch(meta.url)
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`Vercel Blob fetch ${res.status}`)
      const body = new Uint8Array(await res.arrayBuffer())
      return {
        body,
        contentType: meta.contentType ?? 'application/octet-stream',
        size: meta.size ?? body.byteLength,
      }
    } catch (e) {
      if (isNotFound(e)) return null
      throw e
    }
  }

  async delete(key: string) {
    try {
      await del(key)
    } catch (e) {
      if (!isNotFound(e)) throw e
    }
  }

  async exists(key: string) {
    try {
      await head(key)
      return true
    } catch (e) {
      if (isNotFound(e)) return false
      throw e
    }
  }
}

function isNotFound(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const obj = e as { status?: number; statusCode?: number; message?: string }
  if (obj.status === 404 || obj.statusCode === 404) return true
  return typeof obj.message === 'string' && /not[\s_-]?found|404/i.test(obj.message)
}
