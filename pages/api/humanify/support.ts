import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import {
  addComment,
  createTicket,
  getTicket,
  listComments,
  listTickets,
  ticketSummary,
  updateTicket,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/hris/support-store';

function isPlatformRole(role: string | undefined) {
  const r = String(role || '').toLowerCase();
  return ['super_admin', 'superadmin', 'platform_admin'].includes(r);
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const tenantId = (session.user as any)?.tenantId || null;
  const user = session.user as any;
  const action = String(req.query.action || '');

  try {
    if (req.method === 'GET') {
      if (action === 'summary') {
        const data = await ticketSummary(tenantId);
        return res.json({ success: true, data, dataSource: data.total > 0 ? 'live' : 'empty' });
      }
      if (action === 'comments') {
        const ticketId = String(req.query.ticketId || '');
        if (!ticketId || !tenantId) return res.status(400).json({ success: false, error: 'ticketId required' });
        const ticket = await getTicket(ticketId, tenantId);
        if (!ticket) return res.status(404).json({ success: false, error: 'Tiket tidak ditemukan' });
        const data = await listComments(ticketId, tenantId);
        return res.json({ success: true, data, dataSource: 'live' });
      }
      if (action === 'detail') {
        const id = String(req.query.id || '');
        if (!id || !tenantId) return res.status(400).json({ success: false, error: 'id required' });
        const ticket = await getTicket(id, tenantId);
        if (!ticket) return res.status(404).json({ success: false, error: 'Tiket tidak ditemukan' });
        const comments = await listComments(id, tenantId);
        return res.json({ success: true, data: { ...ticket, comments }, dataSource: 'live' });
      }
      // default list
      const data = await listTickets({
        tenantId,
        status: req.query.status as string | undefined,
        category: req.query.category as string | undefined,
        q: req.query.q as string | undefined,
      });
      return res.json({ success: true, data, dataSource: data.length ? 'live' : 'empty' });
    }

    if (req.method === 'POST') {
      if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });

      if (action === 'comment') {
        const { ticketId, body } = req.body || {};
        if (!ticketId || !String(body || '').trim()) {
          return res.status(400).json({ success: false, error: 'ticketId dan body wajib' });
        }
        const ticket = await getTicket(String(ticketId), tenantId);
        if (!ticket) return res.status(404).json({ success: false, error: 'Tiket tidak ditemukan' });
        const data = await addComment({
          ticketId: String(ticketId),
          tenantId,
          body: String(body),
          authorName: user.name || user.email,
          authorEmail: user.email,
          isStaff: isPlatformRole(user.role),
        });
        if (ticket.status === 'waiting_customer' && !isPlatformRole(user.role)) {
          await updateTicket(String(ticketId), tenantId, { status: 'open' });
        }
        return res.status(201).json({ success: true, data, message: 'Balasan terkirim' });
      }

      // create ticket
      const { subject, description, category, priority } = req.body || {};
      if (!String(subject || '').trim() || !String(description || '').trim()) {
        return res.status(400).json({ success: false, error: 'Subjek dan deskripsi wajib diisi' });
      }
      const data = await createTicket({
        tenantId,
        subject: String(subject),
        description: String(description),
        category: (category || 'other') as TicketCategory,
        priority: (priority || 'normal') as TicketPriority,
        requesterName: user.name || user.email,
        requesterEmail: user.email,
        requesterUserId: user.id ? String(user.id) : undefined,
      });
      return res.status(201).json({ success: true, data, message: 'Tiket berhasil dibuat' });
    }

    if (req.method === 'PUT') {
      if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
      const id = String(req.query.id || req.body?.id || '');
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      const patch: any = {};
      for (const k of ['status', 'priority', 'category', 'subject', 'description', 'assigned_to', 'resolution_note']) {
        if (req.body?.[k] !== undefined) patch[k] = req.body[k];
      }
      if (patch.status) patch.status = patch.status as TicketStatus;
      const data = await updateTicket(id, tenantId, patch);
      if (!data) return res.status(404).json({ success: false, error: 'Tiket tidak ditemukan' });
      return res.json({ success: true, data, message: 'Tiket diperbarui' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.warn('[support]', error?.message || error);
    return res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
}

export default withHQAuth(handler, { module: 'hris' });
