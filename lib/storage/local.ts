import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Storage, StoredObject } from './types'

const ROOT = path.join(process.cwd(), 'uploads')
const META_SUFFIX = '.meta.json'

function safeJoin(key: string): string {
  const normalized = path.normalize(key).replace(/^(\.\.[/\\])+/, '')
  return path.join(ROOT, normalized)
}

async function ensureDir(file: string) {
  await fs.mkdir(path.dirname(file), { recursive: true })
}

export class LocalStorage implements Storage {
  async put(key: string, data: Uint8Array, contentType: string) {
    const file = safeJoin(key)
    await ensureDir(file)
    await fs.writeFile(file, data)
    await fs.writeFile(file + META_SUFFIX, JSON.stringify({ contentType, size: data.byteLength }))
    return { key }
  }

  async get(key: string): Promise<StoredObject | null> {
    const file = safeJoin(key)
    try {
      const [body, metaRaw] = await Promise.all([
        fs.readFile(file),
        fs.readFile(file + META_SUFFIX, 'utf8').catch(() => '{}'),
      ])
      const meta = JSON.parse(metaRaw) as { contentType?: string; size?: number }
      return {
        body: new Uint8Array(body),
        contentType: meta.contentType ?? 'application/octet-stream',
        size: meta.size ?? body.byteLength,
      }
    } catch (e: any) {
      if (e?.code === 'ENOENT') return null
      throw e
    }
  }

  async delete(key: string) {
    const file = safeJoin(key)
    await Promise.all([
      fs.unlink(file).catch((e) => { if (e.code !== 'ENOENT') throw e }),
      fs.unlink(file + META_SUFFIX).catch((e) => { if (e.code !== 'ENOENT') throw e }),
    ])
  }

  async exists(key: string) {
    try {
      await fs.access(safeJoin(key))
      return true
    } catch {
      return false
    }
  }
}
