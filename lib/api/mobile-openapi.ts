// OpenAPI 3.1 spec for the mobile API (/api/mobile/v1/*).
//
// Kept in sync by hand. When you add or change a route under
// app/api/mobile/v1/, update the matching `paths` entry below.

export const MOBILE_OPENAPI_VERSION = '1.0.0'

export const mobileOpenApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'HR System Mobile API',
    version: MOBILE_OPENAPI_VERSION,
    description:
      'Bearer-token API consumed by the HR System mobile app. ' +
      'Obtain a token from POST /auth/login, then send it as `Authorization: Bearer <token>` on every other call.',
  },
  servers: [
    { url: '/api/mobile/v1', description: 'Same-origin (current deployment)' },
  ],
  tags: [
    { name: 'Auth' },
    { name: 'Profile' },
    { name: 'Attendance' },
    { name: 'Leave' },
    { name: 'Approvals' },
    { name: 'Notifications' },
    { name: 'Payslips' },
    { name: 'Announcements' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT issued by POST /auth/login. Pass as `Authorization: Bearer <token>`.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string' },
          fieldErrors: {
            type: 'object',
            additionalProperties: { type: 'array', items: { type: 'string' } },
            description: 'Per-field validation errors when status is 400.',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
          code: {
            type: 'string',
            description: 'Six-digit TOTP code. Required only after a `{ mfaRequired: true }` response.',
          },
        },
      },
      LoginResponse: {
        type: 'object',
        required: ['token', 'expiresAt', 'user'],
        properties: {
          token: { type: 'string', description: 'JWT for subsequent requests.' },
          expiresAt: { type: 'string', format: 'date-time' },
          user: { $ref: '#/components/schemas/UserSummary' },
        },
      },
      MfaChallengeResponse: {
        type: 'object',
        required: ['mfaRequired', 'error'],
        properties: {
          mfaRequired: { const: true },
          error: { type: 'string' },
        },
      },
      UserSummary: {
        type: 'object',
        required: ['id', 'email'],
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          employee: {
            anyOf: [
              { $ref: '#/components/schemas/EmployeeSummary' },
              { type: 'null' },
            ],
          },
        },
      },
      EmployeeSummary: {
        type: 'object',
        required: ['id', 'firstName', 'lastName', 'employeeCode'],
        properties: {
          id: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          employeeCode: { type: 'string' },
        },
      },
      MeResponse: {
        type: 'object',
        required: ['user'],
        properties: {
          user: {
            allOf: [
              { $ref: '#/components/schemas/UserSummary' },
              {
                type: 'object',
                properties: {
                  roles: { type: 'array', items: { type: 'string' } },
                  permissions: { type: 'array', items: { type: 'string' } },
                },
              },
            ],
          },
        },
      },
      Announcement: {
        type: 'object',
        required: ['id', 'title', 'body', 'createdAt'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AnnouncementsResponse: {
        type: 'object',
        required: ['announcements'],
        properties: {
          announcements: { type: 'array', items: { $ref: '#/components/schemas/Announcement' } },
        },
      },
      AttendanceLog: {
        type: 'object',
        required: ['id', 'employeeId', 'clockIn'],
        properties: {
          id: { type: 'string' },
          employeeId: { type: 'string' },
          clockIn: { type: 'string', format: 'date-time' },
          clockOut: { type: ['string', 'null'], format: 'date-time' },
          source: { type: 'string', enum: ['mobile', 'web', 'biometric', 'admin'] },
          geoLat: { type: ['number', 'null'] },
          geoLng: { type: ['number', 'null'] },
          status: { type: ['string', 'null'], enum: ['regular', 'overtime', null] },
        },
      },
      AttendanceResponse: {
        type: 'object',
        required: ['logs'],
        properties: {
          openLog: {
            anyOf: [{ $ref: '#/components/schemas/AttendanceLog' }, { type: 'null' }],
          },
          logs: { type: 'array', items: { $ref: '#/components/schemas/AttendanceLog' } },
        },
      },
      ClockInRequest: {
        type: 'object',
        properties: {
          lat: { type: 'number', description: 'Optional GPS latitude.' },
          lng: { type: 'number', description: 'Optional GPS longitude.' },
        },
      },
      ClockInResponse: {
        type: 'object',
        required: ['ok', 'log'],
        properties: {
          ok: { const: true },
          log: { $ref: '#/components/schemas/AttendanceLog' },
        },
      },
      ClockOutResponse: {
        type: 'object',
        required: ['ok', 'log', 'hours'],
        properties: {
          ok: { const: true },
          log: { $ref: '#/components/schemas/AttendanceLog' },
          hours: { type: 'number', description: 'Hours worked in this session.' },
        },
      },
      LeaveBalance: {
        type: 'object',
        required: ['id', 'employeeId', 'leaveType', 'year', 'balance'],
        properties: {
          id: { type: 'string' },
          employeeId: { type: 'string' },
          leaveType: { type: 'string', enum: ['vacation', 'sick', 'personal', 'unpaid'] },
          year: { type: 'integer' },
          balance: { type: 'number' },
        },
      },
      LeaveRequest: {
        type: 'object',
        required: ['id', 'employeeId', 'leaveType', 'startDate', 'endDate', 'days', 'status'],
        properties: {
          id: { type: 'string' },
          employeeId: { type: 'string' },
          leaveType: { type: 'string', enum: ['vacation', 'sick', 'personal', 'unpaid'] },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          days: { type: 'integer' },
          reason: { type: ['string', 'null'] },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'cancelled'] },
          decidedAt: { type: ['string', 'null'], format: 'date-time' },
        },
      },
      LeaveResponse: {
        type: 'object',
        required: ['balances', 'requests'],
        properties: {
          balances: { type: 'array', items: { $ref: '#/components/schemas/LeaveBalance' } },
          requests: { type: 'array', items: { $ref: '#/components/schemas/LeaveRequest' } },
        },
      },
      SubmitLeaveRequest: {
        type: 'object',
        required: ['leaveType', 'startDate', 'endDate'],
        properties: {
          leaveType: { type: 'string', enum: ['vacation', 'sick', 'personal', 'unpaid'] },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          reason: { type: 'string' },
        },
      },
      SubmitLeaveResponse: {
        type: 'object',
        required: ['ok', 'request'],
        properties: {
          ok: { const: true },
          request: { $ref: '#/components/schemas/LeaveRequest' },
        },
      },
      PendingApproval: {
        type: 'object',
        required: ['id', 'entityType', 'entityId', 'level', 'status', 'createdAt'],
        properties: {
          id: { type: 'string' },
          entityType: { type: 'string', enum: ['LeaveRequest', 'Expense', 'HiringRequest'] },
          entityId: { type: 'string' },
          level: { type: 'integer' },
          status: { type: 'string', enum: ['pending'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ApprovalsResponse: {
        type: 'object',
        required: ['leave', 'expenses'],
        properties: {
          leave: { type: 'array', items: { $ref: '#/components/schemas/PendingApproval' } },
          expenses: { type: 'array', items: { $ref: '#/components/schemas/PendingApproval' } },
        },
      },
      DecideApprovalRequest: {
        type: 'object',
        required: ['approvalId', 'decision'],
        properties: {
          approvalId: { type: 'string' },
          decision: { type: 'string', enum: ['approved', 'rejected'] },
          comments: { type: 'string' },
        },
      },
      DecideApprovalResponse: {
        type: 'object',
        required: ['ok', 'chainComplete'],
        properties: {
          ok: { const: true },
          chainComplete: {
            type: 'boolean',
            description: 'True if this was the last step in the approval chain.',
          },
        },
      },
      Notification: {
        type: 'object',
        required: ['id', 'userId', 'title', 'channel', 'createdAt'],
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          title: { type: 'string' },
          body: { type: ['string', 'null'] },
          link: { type: ['string', 'null'] },
          channel: { type: 'string', enum: ['inApp', 'email', 'slack', 'teams'] },
          readAt: { type: ['string', 'null'], format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      NotificationsResponse: {
        type: 'object',
        required: ['notifications'],
        properties: {
          notifications: { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
        },
      },
      MarkReadRequest: {
        type: 'object',
        required: ['ids'],
        properties: {
          ids: { type: 'array', items: { type: 'string' }, minItems: 1 },
        },
      },
      MarkReadResponse: {
        type: 'object',
        required: ['ok', 'count'],
        properties: {
          ok: { const: true },
          count: { type: 'integer' },
        },
      },
      Payslip: {
        type: 'object',
        required: ['id', 'employeeId', 'periodStart', 'periodEnd', 'gross', 'net', 'currency'],
        properties: {
          id: { type: 'string' },
          employeeId: { type: 'string' },
          periodStart: { type: 'string', format: 'date-time' },
          periodEnd: { type: 'string', format: 'date-time' },
          gross: { type: 'number' },
          net: { type: 'number' },
          currency: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'final', 'paid'] },
        },
      },
      PayslipsResponse: {
        type: 'object',
        required: ['payslips'],
        properties: {
          payslips: { type: 'array', items: { $ref: '#/components/schemas/Payslip' } },
        },
      },
      OkResponse: {
        type: 'object',
        required: ['ok'],
        properties: { ok: { const: true } },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Missing or invalid bearer token.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      ValidationFailed: {
        description: 'Request body failed validation.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NoEmployeeRecord: {
        description: 'Authenticated user has no Employee record attached.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
  // Every endpoint except /auth/login requires BearerAuth — set globally and override on login.
  security: [{ BearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Exchange email + password (+ optional MFA code) for a JWT.',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          '200': {
            description: 'Authenticated; JWT returned.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
          },
          '400': { $ref: '#/components/responses/ValidationFailed' },
          '401': {
            description: 'Invalid credentials, or MFA required/invalid.',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/MfaChallengeResponse' },
                    { $ref: '#/components/schemas/Error' },
                  ],
                },
              },
            },
          },
          '429': {
            description: 'Rate-limited (per IP or per email).',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Audit-log a logout. The client must still discard its token.',
        responses: {
          '200': {
            description: 'Always returns ok — JWT is stateless.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } },
          },
        },
      },
    },
    '/me': {
      get: {
        tags: ['Profile'],
        summary: 'Current user with roles and permissions.',
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MeResponse' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/announcements': {
      get: {
        tags: ['Announcements'],
        summary: 'Latest announcements visible to the user.',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AnnouncementsResponse' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/attendance': {
      get: {
        tags: ['Attendance'],
        summary: 'Your open clock-in (if any) plus recent attendance logs.',
        parameters: [
          {
            name: 'days',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 365, default: 30 },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AttendanceResponse' } } },
          },
          '400': { $ref: '#/components/responses/NoEmployeeRecord' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/attendance/clock-in': {
      post: {
        tags: ['Attendance'],
        summary: 'Start a new attendance session.',
        requestBody: {
          required: false,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ClockInRequest' } } },
        },
        responses: {
          '200': {
            description: 'Clocked in.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ClockInResponse' } } },
          },
          '400': { $ref: '#/components/responses/NoEmployeeRecord' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '409': {
            description: 'You already have an open clock-in.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/attendance/clock-out': {
      post: {
        tags: ['Attendance'],
        summary: 'Close the open attendance session.',
        responses: {
          '200': {
            description: 'Clocked out; hours worked included.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ClockOutResponse' } } },
          },
          '400': { $ref: '#/components/responses/NoEmployeeRecord' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '409': {
            description: 'No active clock-in to close.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/leave': {
      get: {
        tags: ['Leave'],
        summary: 'Your leave balances and recent requests.',
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LeaveResponse' } } },
          },
          '400': { $ref: '#/components/responses/NoEmployeeRecord' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/leave/submit': {
      post: {
        tags: ['Leave'],
        summary: 'Submit a new leave request; auto-starts the manager approval chain.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SubmitLeaveRequest' } } },
        },
        responses: {
          '200': {
            description: 'Submitted.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SubmitLeaveResponse' } } },
          },
          '400': {
            description: 'Validation failed or insufficient balance.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/approvals': {
      get: {
        tags: ['Approvals'],
        summary: 'Leave and expense approvals waiting on you.',
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApprovalsResponse' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/approvals/decide': {
      post: {
        tags: ['Approvals'],
        summary: 'Approve or reject a pending approval (LeaveRequest or Expense).',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DecideApprovalRequest' } } },
        },
        responses: {
          '200': {
            description: 'Decision recorded; chain advanced.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/DecideApprovalResponse' } } },
          },
          '400': {
            description: 'Bad payload or downstream failure.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': {
            description: 'You are not the assigned approver.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '404': {
            description: 'Approval not found.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '409': {
            description: 'Already decided.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List your notifications.',
        parameters: [
          { name: 'unreadOnly', in: 'query', schema: { type: 'boolean', default: false } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/NotificationsResponse' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Notifications'],
        summary: 'Mark one or more notifications as read.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/MarkReadRequest' } } },
        },
        responses: {
          '200': {
            description: 'Marked read.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MarkReadResponse' } } },
          },
          '400': {
            description: '`ids` was empty or missing.',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/payslips': {
      get: {
        tags: ['Payslips'],
        summary: 'Your payslips, newest first.',
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PayslipsResponse' } } },
          },
          '400': { $ref: '#/components/responses/NoEmployeeRecord' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
  },
} as const
