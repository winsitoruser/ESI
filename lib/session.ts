/**
 * Compatibility layer for legacy withSessionRoute/withSessionSsr usage
 * Uses next-auth under the hood
 */
import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { getServerSession } from 'next-auth';

// Compatibility function to support legacy withSessionRoute usage
export function withSessionRoute(handler: NextApiHandler) {
  return async function sessionRoute(req: NextApiRequest, res: NextApiResponse) {
    // Get session from next-auth
    const session = await getServerSession(req, res);
    
    // Attach session to request for backward compatibility
    (req as any).session = { 
      user: session?.user || null
    };
    
    // Call the original handler
    return handler(req, res);
  };
}

// Compatibility function to support legacy withSessionSsr usage
export function withSessionSsr<P extends { [key: string]: any } = { [key: string]: any }>(
  handler: (context: GetServerSidePropsContext) => Promise<GetServerSidePropsResult<P>>
) {
  return async function sessionSsr(context: GetServerSidePropsContext): Promise<GetServerSidePropsResult<P>> {
    const { req, res } = context;
    
    // Get session from next-auth
    const session = await getServerSession(req, res);
    
    // Attach session to request for backward compatibility
    (req as any).session = {
      user: session?.user || null
    };
    
    // Call the original handler
    return handler(context);
  };
}
