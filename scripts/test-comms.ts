import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const admin = await p.employee.findUniqueOrThrow({ where: { employeeCode: 'EMP-0001' } })
  const jane = await p.employee.findUniqueOrThrow({ where: { employeeCode: 'EMP-0002' } })

  // Recognition: admin recognizes Jane
  const rec = await p.recognition.create({
    data: { fromEmployeeId: admin.id, toEmployeeId: jane.id, category: 'achievement', message: 'Outstanding work on the analytics dashboard 🎉', visibility: 'public' },
  })
  console.log('Recognition:', rec.id)

  // Event next week
  const event = await p.event.create({
    data: {
      title: 'All Hands Q3 Kickoff',
      description: 'Quarterly all-hands. Pizza after.',
      location: 'HQ Auditorium',
      startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000),
      capacity: 50,
      createdById: admin.id,
    },
  })
  console.log('Event:', event.id)

  // RSVP Jane as going
  await p.eventRSVP.create({ data: { eventId: event.id, employeeId: jane.id, status: 'going' } })

  // Survey with 3 questions, active, anonymous
  const questions = [
    { id: 'q1', kind: 'rating', label: 'How satisfied are you with your work environment?', required: true },
    { id: 'q2', kind: 'choice', label: 'Preferred work style', options: ['Remote', 'Hybrid', 'In-office'], required: true },
    { id: 'q3', kind: 'text', label: 'Anything else?', required: false },
  ]
  const survey = await p.survey.create({
    data: {
      title: 'Q2 Engagement Pulse',
      description: 'Quick anonymous pulse-check.',
      status: 'active',
      anonymous: true,
      questions: JSON.stringify(questions),
      createdById: admin.id,
    },
  })
  console.log('Survey:', survey.id)

  // A few anonymous responses
  for (const ans of [
    [{ questionId: 'q1', value: 5 }, { questionId: 'q2', value: 'Hybrid' }, { questionId: 'q3', value: 'Great team' }],
    [{ questionId: 'q1', value: 4 }, { questionId: 'q2', value: 'Remote' }, { questionId: 'q3', value: 'More remote please' }],
    [{ questionId: 'q1', value: 3 }, { questionId: 'q2', value: 'Hybrid' }],
  ]) {
    await p.surveyResponse.create({
      data: { surveyId: survey.id, answers: JSON.stringify(ans) },
    })
  }

  console.log('EVENT_ID=' + event.id)
  console.log('SURVEY_ID=' + survey.id)
  await p.$disconnect()
}
main()
