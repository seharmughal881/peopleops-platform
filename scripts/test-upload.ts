import { getStorage, buildKey } from '../lib/storage'
import { prisma } from '../lib/db/client'

async function main() {
  const emp = await prisma.employee.findFirstOrThrow({ where: { employeeCode: 'EMP-0002' } })
  const bytes = new TextEncoder().encode('Smoke test PDF content (not real)')
  const key = buildKey(`documents/${emp.id}`, 'test.txt')
  await getStorage().put(key, bytes, 'text/plain')
  const doc = await prisma.document.create({
    data: { employeeId: emp.id, type: 'other', name: 'test.txt', s3Key: key },
  })
  console.log('Created doc id:', doc.id, 'key:', key)
  await prisma.$disconnect()
}
main()
