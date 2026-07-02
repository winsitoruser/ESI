import { NextApiRequest, NextApiResponse } from 'next';

// Define API user context
export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
}

// API context passed to handlers
export interface ApiContext {
  user: ApiUser | null;
  req: NextApiRequest;
  res: NextApiResponse;
}

// Standard API response format
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
}
