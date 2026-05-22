import 'server-only'
import PDFDocument from 'pdfkit'
import { payslipDeductions } from './queries'

export interface PayslipPdfInput {
  payslip: {
    id: string
    grossPay: number
    netPay: number
    deductions: string
    currency: string
    createdAt: Date
  }
  run: {
    periodStart: Date
    periodEnd: Date
    status: string
  }
  employee: {
    employeeCode: string
    firstName: string
    lastName: string
    jobTitle?: string | null
    department?: { name: string } | null
  }
  company?: {
    name?: string
    address?: string
  }
}

function fmt(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function renderPayslipPdf(input: PayslipPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 })
      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const { payslip, run, employee, company } = input
      const periodLabel = `${run.periodStart.toISOString().slice(0, 10)} – ${run.periodEnd.toISOString().slice(0, 10)}`
      const fullName = `${employee.firstName} ${employee.lastName}`
      const deductions = payslipDeductions(payslip.deductions)
      const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0)

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text(company?.name ?? 'Payslip', { align: 'left' })
      if (company?.address) {
        doc.fontSize(9).font('Helvetica').fillColor('#666').text(company.address)
      }
      doc.moveDown(0.5)
      doc.fillColor('#000').fontSize(14).font('Helvetica-Bold').text('PAYSLIP', { align: 'right' })
      doc.fontSize(9).font('Helvetica').fillColor('#666')
        .text(`Reference: ${payslip.id}`, { align: 'right' })
        .text(`Issued: ${new Date(payslip.createdAt).toISOString().slice(0, 10)}`, { align: 'right' })
      doc.moveDown(1)

      // Divider
      doc.strokeColor('#e5e7eb').lineWidth(1)
        .moveTo(50, doc.y).lineTo(545, doc.y).stroke()
      doc.moveDown(1)

      // Employee + period block
      const blockY = doc.y
      doc.fillColor('#666').fontSize(9).text('EMPLOYEE', 50, blockY)
      doc.fillColor('#000').fontSize(11).font('Helvetica-Bold').text(fullName, 50, blockY + 12)
      doc.font('Helvetica').fontSize(10).fillColor('#333')
        .text(`Code: ${employee.employeeCode}`, 50, blockY + 28)
        .text(employee.jobTitle ?? '—', 50, blockY + 42)
        .text(employee.department?.name ?? '—', 50, blockY + 56)

      doc.fillColor('#666').fontSize(9).text('PERIOD', 320, blockY)
      doc.fillColor('#000').fontSize(11).font('Helvetica-Bold').text(periodLabel, 320, blockY + 12)
      doc.font('Helvetica').fontSize(10).fillColor('#333')
        .text(`Status: ${run.status}`, 320, blockY + 28)
        .text(`Currency: ${payslip.currency}`, 320, blockY + 42)

      doc.y = blockY + 80
      doc.moveDown(0.5)

      // Earnings & deductions section
      drawSectionHeader(doc, 'EARNINGS')
      drawRow(doc, 'Gross pay', fmt(payslip.grossPay, payslip.currency), true)
      doc.moveDown(0.5)

      drawSectionHeader(doc, 'DEDUCTIONS')
      if (deductions.length === 0) {
        doc.font('Helvetica').fontSize(10).fillColor('#666').text('No deductions', 50, doc.y)
        doc.moveDown(0.5)
      } else {
        for (const d of deductions) {
          drawRow(doc, d.label, fmt(d.amount, payslip.currency), false)
        }
        doc.moveDown(0.3)
        drawRow(doc, 'Total deductions', fmt(totalDeductions, payslip.currency), true)
        doc.moveDown(0.5)
      }

      // Net pay highlight
      doc.strokeColor('#e5e7eb').moveTo(50, doc.y).lineTo(545, doc.y).stroke()
      doc.moveDown(0.5)
      const netY = doc.y
      doc.rect(50, netY - 4, 495, 36).fill('#f5f5f5')
      doc.fillColor('#000').font('Helvetica-Bold').fontSize(11)
        .text('NET PAY', 60, netY + 8)
      doc.fontSize(14).text(fmt(payslip.netPay, payslip.currency), 0, netY + 6, { align: 'right', width: 535 })

      // Footer
      doc.fillColor('#999').font('Helvetica').fontSize(8)
        .text(
          'This is a system-generated document and does not require a signature.',
          50,
          780,
          { align: 'center', width: 495 },
        )

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

function drawSectionHeader(doc: PDFKit.PDFDocument, label: string) {
  doc.fillColor('#666').font('Helvetica-Bold').fontSize(9).text(label, 50, doc.y)
  doc.moveDown(0.3)
}

function drawRow(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  bold: boolean,
) {
  const y = doc.y
  doc.fillColor('#000').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10)
  doc.text(label, 50, y, { width: 350 })
  doc.text(value, 0, y, { align: 'right', width: 535 })
  doc.moveDown(0.4)
}
