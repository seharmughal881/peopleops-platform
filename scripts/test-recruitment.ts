import { PrismaClient } from '@prisma/client'
import { getStorage, buildKey } from '../lib/storage'

const p = new PrismaClient()
async function main() {
  const admin = await p.employee.findUniqueOrThrow({ where: { employeeCode: 'EMP-0001' } })

  const job = await p.jobPosting.create({
    data: {
      title: 'Senior Backend Engineer',
      description: 'Build distributed systems. TypeScript + Postgres + Redis preferred.',
      employmentType: 'fullTime',
      location: 'Remote',
      salaryMin: 130000,
      salaryMax: 180000,
      status: 'open',
      openedAt: new Date(),
      createdById: admin.id,
    },
  })
  console.log('Job:', job.id, job.title)

  // Add a candidate with a fake resume
  const bytes = new TextEncoder().encode('Fake resume content')
  const resumeKey = buildKey(`resumes/${job.id}`, 'alice.pdf')
  await getStorage().put(resumeKey, bytes, 'application/pdf')
  const alice = await p.candidate.create({
    data: {
      jobPostingId: job.id,
      firstName: 'Alice',
      lastName: 'Hacker',
      email: 'alice@example.com',
      source: 'linkedIn',
      stage: 'screening',
      resumeS3Key: resumeKey,
    },
  })
  console.log('Candidate:', alice.id, 'resume key:', resumeKey)

  // Schedule an interview with admin
  const iv = await p.interview.create({
    data: {
      candidateId: alice.id,
      interviewerId: admin.id,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      type: 'technical',
    },
  })
  console.log('Interview:', iv.id)

  await p.candidate.update({ where: { id: alice.id }, data: { stage: 'interview' } })

  // Add a second candidate
  await p.candidate.create({
    data: { jobPostingId: job.id, firstName: 'Bob', lastName: 'Coder', email: 'bob@example.com', stage: 'applied', source: 'direct' },
  })

  console.log('JOB_ID=' + job.id)
  console.log('CAND_ID=' + alice.id)
  await p.$disconnect()
}
main()
