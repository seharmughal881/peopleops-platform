export interface StoredObject {
  body: Uint8Array
  contentType: string
  size: number
}

export interface Storage {
  /** Save bytes under the given key. Returns the key. */
  put(key: string, data: Uint8Array, contentType: string): Promise<{ key: string }>
  /** Fetch the object; null if not found. */
  get(key: string): Promise<StoredObject | null>
  /** Delete the object. Silently succeeds if not found. */
  delete(key: string): Promise<void>
  /** True if the object exists. */
  exists(key: string): Promise<boolean>
}

export function buildKey(prefix: string, originalName: string): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80)
  const uuid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}/${uuid}-${safe}`
}
