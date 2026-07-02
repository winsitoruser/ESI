import React, { useState } from 'react';
import { useBuilder } from './BuilderContext';
import { BuilderPage } from './types';
import { useTranslation } from '../../lib/i18n';
import {
  Plus, FileText, Trash2, Edit3, Check, X, Home, Globe,
  Copy, MoreHorizontal, ChevronRight,
} from 'lucide-react';

export default function PageManager() {
  const { state, dispatch, createPage } = useBuilder();
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = () => {
    if (!newPageName.trim()) return;
    const slug = newPageSlug.trim() || newPageName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const page = createPage(newPageName.trim(), slug);
    dispatch({ type: 'SET_CURRENT_PAGE', id: page.id });
    setIsCreating(false);
    setNewPageName('');
    setNewPageSlug('');
  };

  const handleStartEdit = (page: BuilderPage) => {
    setEditingId(page.id);
    setEditName(page.name);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;
    dispatch({ type: 'UPDATE_PAGE', id: editingId, updates: { name: editName.trim() } });
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = (pageId: string) => {
    if (state.pages.length <= 1) return;
    dispatch({ type: 'DELETE_PAGE', id: pageId });
  };

  const handleDuplicate = (page: BuilderPage) => {
    const newPage = createPage(`${page.name} (${t('wb.common.duplicate')})`, `${page.slug}-copy`);
    dispatch({
      type: 'UPDATE_PAGE',
      id: newPage.id,
      updates: {
        widgets: JSON.parse(JSON.stringify(page.widgets)),
        settings: { ...page.settings },
      },
    });
  };

  const handleToggleStatus = (page: BuilderPage) => {
    dispatch({
      type: 'UPDATE_PAGE',
      id: page.id,
      updates: { status: page.status === 'published' ? 'draft' : 'published' },
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">{t('wb.pageManager.title')}</h3>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500 text-white text-xs font-medium
              hover:bg-blue-600 transition-colors"
          >
            <Plus size={12} />
            {t('wb.common.add')}
          </button>
        </div>
        <p className="text-[11px] text-gray-400">
          {state.pages.length} {t('wb.panel.pages').toLowerCase()}
        </p>
      </div>

      {/* Create New Page Form */}
      {isCreating && (
        <div className="p-3 border-b border-gray-100 bg-blue-50/50 space-y-2">
          <input
            type="text"
            placeholder={t('wb.pageManager.pageName') + '...'}
            value={newPageName}
            onChange={e => {
              setNewPageName(e.target.value);
              setNewPageSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
            }}
            autoFocus
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setIsCreating(false); }}
          />
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Globe size={11} />
            <span>/{newPageSlug || 'slug'}</span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={handleCreate}
              disabled={!newPageName.trim()}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-blue-500 text-white text-xs
                font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check size={12} />
              {t('wb.common.add')}
            </button>
            <button
              onClick={() => { setIsCreating(false); setNewPageName(''); setNewPageSlug(''); }}
              className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Page List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {state.pages.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 font-medium">{t('wb.layersPanel.noWidgets')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('wb.pageManager.addPage')}</p>
          </div>
        ) : (
          state.pages.map(page => {
            const isActive = state.currentPageId === page.id;
            const isEditing = editingId === page.id;

            return (
              <div
                key={page.id}
                className={`group rounded-lg border transition-all ${
                  isActive
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                }`}
              >
                <div
                  className="flex items-center gap-2 p-2.5 cursor-pointer"
                  onClick={() => dispatch({ type: 'SET_CURRENT_PAGE', id: page.id })}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isActive ? 'bg-blue-100' : 'bg-gray-50'
                  }`}>
                    {page.isHome ? (
                      <Home size={14} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                    ) : (
                      <FileText size={14} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          autoFocus
                          className="flex-1 px-1.5 py-0.5 text-xs border border-blue-300 rounded bg-white
                            focus:outline-none focus:ring-1 focus:ring-blue-400"
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                          onClick={e => e.stopPropagation()}
                        />
                        <button onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }} className="p-0.5 text-green-600">
                          <Check size={12} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="p-0.5 text-gray-400">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-xs font-medium text-gray-800 truncate">{page.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-400">/{page.slug}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                            page.status === 'published'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {page.status === 'published' ? t('wb.common.published') : t('wb.common.draft')}
                          </span>
                          <span className="text-[10px] text-gray-300">{page.widgets.length} widget</span>
                        </div>
                      </>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStartEdit(page); }}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400"
                        title={t('wb.common.edit')}
                      >
                        <Edit3 size={11} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(page); }}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400"
                        title={t('wb.common.duplicate')}
                      >
                        <Copy size={11} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(page); }}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400"
                        title={page.status === 'published' ? t('wb.publishSettings.unpublish') : t('wb.common.publish')}
                      >
                        <Globe size={11} />
                      </button>
                      {state.pages.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(page.id); }}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                          title={t('wb.common.delete')}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
