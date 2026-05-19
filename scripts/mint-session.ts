import { SignJWT } from 'jose'
import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  const email = process.argv[2] || 'admin@example.com'

  const user = await prisma.user.findUniqueOrThrow({ where: { email } })
  const userRoles = await prisma.userRole.findMany({
    where: { userId: user.id },
    include: { role: true },
  })
  const roles = userRoles.map((r) => r.role.name)
  const perms = new Set<string>()
  for (const ur of userRoles) {
    try {
      for (const p of JSON.parse(ur.role.permissions) as string[]) perms.add(p)
    } catch {}
  }

  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET not set')
  const key = new TextEncoder().encode(secret)

  const token = await new SignJWT({ userId: user.id, roles, permissions: Array.from(perms) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(key)

  console.log(token)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
