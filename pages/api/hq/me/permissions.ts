import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { type ResolvedPermission } from '../../../../lib/permissions/permission-resolver';

/**
 * GET /api/hq/me/permissions
 * Kembalikan konteks permission untuk user yang sedang login.
 * Dipakai oleh FE untuk menyembunyikan/menampilkan tombol sesuai hak akses.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const permCtx: ResolvedPermission | undefined = (req as any).permissionContext;
  const session = (req as any).session;

  return res.status(200).json({
    user: {
      id: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
      name: session?.user?.name ?? null,
      tenantId: session?.user?.tenantId ?? null
    },
    role: permCtx?.role ?? null,
    roleId: permCtx?.roleId ?? null,
    roleCode: permCtx?.roleCode ?? null,
    roleLevel: permCtx?.roleLevel ?? null,
    dataScope: permCtx?.dataScope ?? null,
    isSuperAdmin: !!permCtx?.isSuperAdmin,
    permissions: permCtx?.permissions ?? {}
  });
}

export default withHQAuth(handler);
