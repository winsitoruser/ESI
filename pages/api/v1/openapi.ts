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
