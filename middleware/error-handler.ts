import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  statusCode: number;
  code?: string;
  details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware for API routes
 */
export function handleApiError(
  error: any,
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Log error for debugging
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  });

  // Handle ApiError instances
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
      details: error.details,
    });
  }

  // Handle Sequelize errors
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.errors?.map((e: any) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      field: error.errors?.[0]?.path,
    });
  }

  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Foreign key constraint violation',
    });
  }

  // Handle generic errors
  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || 'Internal server error';

  return res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });
}

/**
 * Async error wrapper for API handlers
 */
export function asyncHandler(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      handleApiError(error, req, res);
    }
  };
}

/**
 * Error response helper
 */
export function errorResponse(
  res: NextApiResponse,
  message: string,
  statusCode: number = 500,
  details?: any
) {
  return res.status(statusCode).json({
    success: false,
    message,
    details,
  });
}

/**
 * Common error types
 */
export const ErrorTypes = {
  NOT_FOUND: (resource: string) => new ApiError(`${resource} not found`, 404, 'NOT_FOUND'),
  UNAUTHORIZED: () => new ApiError('Unauthorized', 401, 'UNAUTHORIZED'),
  FORBIDDEN: () => new ApiError('Forbidden', 403, 'FORBIDDEN'),
  BAD_REQUEST: (message: string) => new ApiError(message, 400, 'BAD_REQUEST'),
  VALIDATION_ERROR: (details: any) => new ApiError('Validation error', 400, 'VALIDATION_ERROR', details),
  INTERNAL_ERROR: (message?: string) => new ApiError(message || 'Internal server error', 500, 'INTERNAL_ERROR'),
};
