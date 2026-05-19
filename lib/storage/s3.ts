import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import type { Storage, StoredObject } from './types'

export class S3Storage implements Storage {
  private readonly client: S3Client
  private readonly bucket: string

  constructor(bucket: string, region: string) {
    this.bucket = bucket
    this.client = new S3Client({ region })
  }

  async put(key: string, data: Uint8Array, contentType: string) {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: contentType }),
    )
    return { key }
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const out = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
      const body = await out.Body!.transformToByteArray()
      return {
        body,
        contentType: out.ContentType ?? 'application/octet-stream',
        size: out.ContentLength ?? body.byteLength,
      }
    } catch (e: any) {
      if (e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404) return null
      throw e
    }
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  async exists(key: string) {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return true
    } catch (e: any) {
      if (e?.$metadata?.httpStatusCode === 404) return false
      throw e
    }
  }
}
