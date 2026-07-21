import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import {
  deleteKbArticle,
  getKbArticle,
  listKbArticles,
  upsertKbArticle,
} from '@/lib/hris/support-store';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const tenantId = (session.user as any)?.tenantId || null;
  const user = session.user as any;
  const action = String(req.query.action || '');

  try {
    if (req.method === 'GET') {
      if (action === 'detail' || action === 'article') {
        const key = String(req.query.slug || req.query.id || '');
        if (!key) return res.status(400).json({ success: false, error: 'slug/id required' });
        const data = await getKbArticle(key, tenantId);
        if (!data) return res.status(404).json({ success: false, error: 'Artikel tidak ditemukan' });
        return res.json({ success: true, data, dataSource: 'live' });
      }
      const data = await listKbArticles({
        tenantId,
        category: req.query.category as string | undefined,
        q: req.query.q as string | undefined,
        includeDrafts: req.query.drafts === '1',
      });
      return res.json({ success: true, data, dataSource: data.length ? 'live' : 'empty' });
    }

    if (req.method === 'POST') {
      if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
      const { id, slug, title, summary, content, category, status, sortOrder } = req.body || {};
      if (!String(title || '').trim() || !String(content || '').trim()) {
        return res.status(400).json({ success: false, error: 'Judul dan konten wajib' });
      }
      const autoSlug =
        String(slug || title)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || `artikel-${Date.now().toString(36)}`;
      const data = await upsertKbArticle({
        id: id || undefined,
        tenantId,
        slug: autoSlug,
        title: String(title),
        summary: summary ? String(summary) : undefined,
        content: String(content),
        category: category || 'umum',
        status: status || 'published',
        isPlatform: false,
        sortOrder: Number(sortOrder) || 0,
        createdBy: user.name || user.email,
      });
      return res.status(id ? 200 : 201).json({
        success: true,
        data,
        message: id ? 'Artikel diperbarui' : 'Artikel dibuat',
      });
    }

    if (req.method === 'DELETE') {
      if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
      const id = String(req.query.id || req.body?.id || '');
      if (!id) return res.status(400).json({ success: false, error: 'id required' });
      const ok = await deleteKbArticle(id, tenantId);
      if (!ok) return res.status(404).json({ success: false, error: 'Artikel tidak ditemukan atau tidak dapat dihapus' });
      return res.json({ success: true, message: 'Artikel dihapus' });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.warn('[knowledge-base]', error?.message || error);
    return res.status(500).json({ success: false, error: error?.message || 'Internal error' });
  }
}

export default withHQAuth(handler, { module: 'hris' });
