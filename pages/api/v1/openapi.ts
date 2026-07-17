/**
 * GET /api/v1/openapi — OpenAPI 3.0 for Humanify Public API
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'Humanify Public API',
    version: '1.0.0',
    description: 'Tenant-scoped HRIS API. Authenticate with Bearer API key (Enterprise / Trial).',
  },
  servers: [{ url: '/api/v1', description: 'Humanify v1' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'hfy_live_',
        description: 'API key from Humanify → Enterprise → API Keys',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/employees': {
      get: {
        summary: 'List employees',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
        ],
        responses: { '200': { description: 'Employee list' }, '401': { description: 'Unauthorized' } },
      },
      post: {
        summary: 'Create employee',
        description: 'Requires scope employees:write',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'position'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  position: { type: 'string' },
                  department: { type: 'string' },
                  workLocation: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created' }, '401': { description: 'Unauthorized' }, '409': { description: 'Conflict' } },
      },
    },
    '/webhooks': {
      get: {
        summary: 'List outbound webhook subscriptions',
        responses: { '200': { description: 'Webhook list' } },
      },
      post: {
        summary: 'Register outbound webhook (HMAC-signed delivery)',
        description: 'Requires scope webhooks:manage. Secret returned once.',
        responses: { '201': { description: 'Registered' } },
      },
    },
    '/departments': {
      get: {
        summary: 'List departments with employee headcount',
        responses: { '200': { description: 'Department list' }, '401': { description: 'Unauthorized' } },
      },
    },
    '/leaves': {
      get: {
        summary: 'List leave requests',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Leave list' } },
      },
    },
    '/attendance/summary': {
      get: {
        summary: 'Attendance summary for a period',
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { '200': { description: 'Attendance totals + byDay' } },
      },
    },
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.status(200).json(SPEC);
}
