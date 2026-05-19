import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const jane = await p.employee.findUniqueOrThrow({ where: { employeeCode: 'EMP-0002' } })

  const laptop = await p.asset.create({
    data: { tag: 'LAPTOP-001', category: 'laptop', name: 'MacBook Pro 16 M3', serialNumber: 'SN-ABC-001', purchaseCost: 2999, purchaseDate: new Date('2025-01-15') },
  })
  console.log('Asset:', laptop.id, laptop.tag)

  await p.assetAssignment.create({
    data: { assetId: laptop.id, employeeId: jane.id, notes: 'Smoke test' },
  })
  await p.asset.update({ where: { id: laptop.id }, data: { status: 'assigned' } })

  // Second asset
  await p.asset.create({
    data: { tag: 'MONITOR-001', category: 'monitor', name: 'Dell U2723QE', purchaseCost: 599 },
  })

  // A license
  const figma = await p.softwareLicense.create({
    data: { name: 'Figma', vendor: 'Figma Inc.', licenseType: 'subscription', seats: 3, cost: 15 * 12 * 3, renewalDate: new Date('2026-12-31') },
  })
  await p.licenseAssignment.create({ data: { licenseId: figma.id, employeeId: jane.id } })
  console.log('License:', figma.id, 'name:', figma.name)

  console.log('ASSET_ID=' + laptop.id)
  console.log('LICENSE_ID=' + figma.id)
  await p.$disconnect()
}
main()
