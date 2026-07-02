/**
 * DMS helpers unit tests
 * Tests pure logic functions in pages/api/hq/dms/lib/helpers.ts
 */
import { generateShareCode, sendError, safeFindAll } from '@/pages/api/hq/dms/lib/helpers';
import type { NextApiResponse } from 'next';

describe('generateShareCode', () => {
  it('generates code in format ME-XXXX-XXXX', () => {
    const code = generateShareCode();
    expect(code).toMatch(/^ME-[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  it('generates unique codes on successive calls', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateShareCode()));
    expect(codes.size).toBe(100);
  });
});

describe('sendError', () => {
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;
  let mockRes: Partial<NextApiResponse>;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockRes = { status: mockStatus } as unknown as Partial<NextApiResponse>;
  });

  it('sends error with default status 500', () => {
    sendError(mockRes as NextApiResponse, 'Something went wrong');
    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({ success: false, message: 'Something went wrong' });
  });

  it('sends error with custom status', () => {
    sendError(mockRes as NextApiResponse, 'Not found', 404);
    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith({ success: false, message: 'Not found' });
  });
});

describe('safeFindAll', () => {
  it('returns empty array on model failure', async () => {
    const failingModel = {
      findAll: jest.fn().mockRejectedValue(new Error('DB error')),
    };
    const result = await safeFindAll(failingModel, { tenantId: 'x' });
    expect(result).toEqual([]);
  });

  it('passes through model results', async () => {
    const mockData = [{ id: '1', name: 'Doc' }];
    const successModel = {
      findAll: jest.fn().mockResolvedValue(mockData),
    };
    const result = await safeFindAll(successModel);
    expect(result).toEqual(mockData);
    expect(successModel.findAll).toHaveBeenCalledWith({
      where: {},
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
  });
});
