import { useState } from 'react';
import { CheckCircle2, ExternalLink, FileText, Play, Video } from 'lucide-react';
import type { LearningMaterial } from '@/lib/hris/lms/course-service';

interface ContentPlayerProps {
  material: LearningMaterial;
  completed?: boolean;
  onComplete: () => void;
}

export function ContentPlayer({ material, completed, onComplete }: ContentPlayerProps) {
  const [ack, setAck] = useState(completed || false);

  const markDone = () => {
    setAck(true);
    onComplete();
  };

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          {material.type === 'video' && <Video className="w-5 h-5 text-indigo-600" />}
          {material.type === 'pdf' && <FileText className="w-5 h-5 text-red-600" />}
          {material.type === 'link' && <ExternalLink className="w-5 h-5 text-violet-600" />}
          <h3 className="font-semibold">{material.title}</h3>
        </div>
        {ack && <CheckCircle2 className="w-5 h-5 text-green-600" />}
      </div>

      <div className="p-4">
        {material.type === 'video' && material.url && (
          <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
            {material.url.includes('youtube.com') || material.url.includes('youtu.be') ? (
              <iframe
                title={material.title}
                src={material.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                className="w-full h-full"
                allowFullScreen
              />
            ) : (
              <video src={material.url} controls className="w-full h-full" />
            )}
          </div>
        )}

        {material.type === 'pdf' && material.url && (
          <iframe title={material.title} src={material.url} className="w-full h-96 border rounded-lg mb-4" />
        )}

        {material.type === 'link' && material.url && (
          <a href={material.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 mb-4">
            Buka materi <ExternalLink className="w-4 h-4" />
          </a>
        )}

        {(material.type === 'text' || material.content) && (
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap mb-4">
            {material.content || 'Tidak ada konten teks.'}
          </div>
        )}

        {!material.url && !material.content && material.type !== 'text' && (
          <p className="text-gray-400 text-sm mb-4">Materi belum memiliki konten — hubungi HR.</p>
        )}

        <button
          type="button"
          disabled={ack}
          onClick={markDone}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50 disabled:bg-green-600"
        >
          {ack ? <><CheckCircle2 className="w-4 h-4" /> Selesai</> : <><Play className="w-4 h-4" /> Tandai Selesai</>}
        </button>
      </div>
    </div>
  );
}
