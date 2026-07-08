import React from 'react';
import { Search, FileText, Download, Copy, Tag, ChevronRight, Check, Paperclip, X } from 'lucide-react';
import { DocTemplate, TplFilter } from './types';

interface Props {
  templates: DocTemplate[];
  templateCategories: Record<string, DocTemplate[]>;
  selectedTemplate: DocTemplate | null;
  setSelectedTemplate: (t: DocTemplate | null) => void;
  tplFilter: TplFilter;
  setTplFilter: React.Dispatch<React.SetStateAction<TplFilter>>;
  docApi: (action: string, method?: string, body?: any, extra?: string) => Promise<any>;
  showToast: (msg: string, type?: string) => void;
}

function TemplateCard({ tpl, onClick }: { tpl: DocTemplate; onClick: () => void }) {
  return (
    <div onClick={onClick}
      className="bg-white border rounded-xl p-4 hover:shadow-lg hover:border-indigo-200 cursor-pointer transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 opacity-5 group-hover:opacity-10 transition-opacity" style={{ background: `radial-gradient(circle at top right, ${tpl.color}, transparent)` }} />
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tpl.color + '15' }}>
          <FileText className="w-5 h-5" style={{ color: tpl.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 text-sm">{tpl.name}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{tpl.format}</span>
            <span className="text-[10px] text-gray-400">v{tpl.version}</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{tpl.description}</p>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-1"><Download className="w-3 h-3" />{tpl.downloadCount}x download</div>
        <span>{tpl.sections.length} bagian</span>
      </div>
    </div>
  );
}

function TemplateDetailView({ tpl, onBack, docApi, showToast }: { tpl: DocTemplate; onBack: () => void; docApi: any; showToast: any }) {
  return (
    <div>
      <button onClick={onBack} className="text-sm text-indigo-600 mb-4 hover:underline flex items-center gap-1"><ChevronRight className="w-4 h-4 rotate-180" /> Kembali ke Template</button>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tpl.color + '15' }}>
                <FileText className="w-7 h-7" style={{ color: tpl.color }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{tpl.name}</h2>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs font-mono uppercase px-2 py-1 bg-gray-100 text-gray-600 rounded-lg">{tpl.format}</span>
                  <span className="text-xs text-gray-500">Version {tpl.version}</span>
                  <span className="text-xs text-gray-400">Update: {new Date(tpl.lastUpdated).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-5">{tpl.description}</p>
            <div className="flex gap-3">
              <button onClick={async () => { await docApi('download-template', 'POST', { templateId: tpl.id }); showToast('Template siap di-download'); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-purple-700 shadow-md shadow-indigo-200">
                <Download className="w-4 h-4" /> Download Template
              </button>
              <button onClick={() => { navigator.clipboard.writeText(`Template: ${tpl.name}\nKategori: ${tpl.category}\nFormat: ${tpl.format}\nBagian: ${tpl.sections.join(', ')}`); showToast('Info template disalin'); }}
                className="flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                <Copy className="w-4 h-4" /> Salin Info
              </button>
            </div>
          </div>
          <div className="bg-white border rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Paperclip className="w-4 h-4 text-indigo-600" /> Isi Template ({tpl.sections.length} bagian)</h3>
            <div className="space-y-2">
              {tpl.sections.map((section, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: tpl.color }}>{idx + 1}</div>
                  <span className="text-sm text-gray-700">{section}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-5">
          <div className="bg-white border rounded-2xl p-5">
            <h4 className="font-semibold text-sm text-gray-900 mb-3">Informasi</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Kategori</span><span className="font-medium" style={{ color: tpl.color }}>{tpl.category}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Format</span><span className="font-mono uppercase text-xs bg-gray-100 px-2 py-1 rounded">{tpl.format}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Versi</span><span>{tpl.version}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Terakhir Update</span><span>{new Date(tpl.lastUpdated).toLocaleDateString('id-ID')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Jumlah Bagian</span><span>{tpl.sections.length}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total Download</span><span className="font-medium text-indigo-600">{tpl.downloadCount}x</span></div>
            </div>
          </div>
          <div className="bg-white border rounded-2xl p-5">
            <h4 className="font-semibold text-sm text-gray-900 mb-3">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {tpl.tags.map((tag, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 cursor-default transition-colors">
                  <Tag className="w-3 h-3" />{tag}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5">
            <h4 className="font-semibold text-sm text-indigo-900 mb-2">Tips Penggunaan</h4>
            <ul className="text-xs text-indigo-700 space-y-1.5">
              <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Download dan sesuaikan dengan data proyek Anda</li>
              <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Isi semua bagian yang ditandai wajib (*)</li>
              <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Pastikan tanda tangan pihak yang berwenang</li>
              <li className="flex items-start gap-1.5"><Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Upload kembali dokumen yang sudah diisi ke tab Dokumen</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TemplatesTab({ templates, templateCategories, selectedTemplate, setSelectedTemplate, tplFilter, setTplFilter, docApi, showToast }: Props) {
  const filteredTemplates = templates.filter(t => {
    if (tplFilter.category && t.category !== tplFilter.category) return false;
    if (tplFilter.search && !t.name.toLowerCase().includes(tplFilter.search.toLowerCase()) && !t.description.toLowerCase().includes(tplFilter.search.toLowerCase())) return false;
    return true;
  });

  if (selectedTemplate) {
    return <TemplateDetailView tpl={selectedTemplate} onBack={() => setSelectedTemplate(null)} docApi={docApi} showToast={showToast} />;
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-semibold">Template Dokumen Proyek</h2>
        <p className="text-sm text-gray-500">Kumpulan template siap pakai untuk kebutuhan manajemen proyek ({templates.length} template)</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={tplFilter.search} onChange={e => setTplFilter({ ...tplFilter, search: e.target.value })} placeholder="Cari template..." className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setTplFilter({ ...tplFilter, category: '' })} className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${!tplFilter.category ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border text-gray-600 hover:border-indigo-300'}`}>Semua</button>
          {Object.keys(templateCategories).map(cat => (
            <button key={cat} onClick={() => setTplFilter({ ...tplFilter, category: cat })} className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${tplFilter.category === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border text-gray-600 hover:border-indigo-300'}`}>{cat}</button>
          ))}
        </div>
      </div>

      {!tplFilter.category ? (
        Object.entries(templateCategories).map(([cat, catTemplates]) => {
          const visible = (catTemplates as DocTemplate[]).filter(t => !tplFilter.search || t.name.toLowerCase().includes(tplFilter.search.toLowerCase()) || t.description.toLowerCase().includes(tplFilter.search.toLowerCase()));
          if (visible.length === 0) return null;
          return (
            <div key={cat} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-6 rounded-full bg-indigo-500" />
                <h3 className="font-semibold text-gray-800">{cat}</h3>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{visible.length}</span>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visible.map(tpl => (
                  <TemplateCard key={tpl.id} tpl={tpl} onClick={() => setSelectedTemplate(tpl)} />
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(tpl => (
            <TemplateCard key={tpl.id} tpl={tpl} onClick={() => setSelectedTemplate(tpl)} />
          ))}
          {filteredTemplates.length === 0 && <p className="text-center text-gray-400 py-8 col-span-3">Tidak ada template ditemukan</p>}
        </div>
      )}
    </div>
  );
}
