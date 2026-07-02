import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FaTimes, FaFileExcel, FaFilePdf, FaFileCsv, FaDownload } from 'react-icons/fa';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'excel' | 'pdf' | 'csv') => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport }) => {
  const [selectedFormat, setSelectedFormat] = useState<'excel' | 'pdf' | 'csv'>('excel');

  if (!isOpen) return null;

  const handleExport = () => {
    onExport(selectedFormat);
    onClose();
  };

  const formats = [
    {
      id: 'excel' as const,
      name: 'Excel',
      description: 'Format .xlsx untuk Microsoft Excel',
      icon: FaFileExcel,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-300'
    },
    {
      id: 'pdf' as const,
      name: 'PDF',
      description: 'Format .pdf untuk dokumen',
      icon: FaFilePdf,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-300'
    },
    {
      id: 'csv' as const,
      name: 'CSV',
      description: 'Format .csv untuk data mentah',
      icon: FaFileCsv,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      borderColor: 'border-blue-300'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FaDownload className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Export Data Produk</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Pilih format file untuk export data produk
          </p>

          {formats.map((format) => {
            const Icon = format.icon;
            const isSelected = selectedFormat === format.id;

            return (
              <div
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? `${format.borderColor} ${format.bgColor} shadow-md`
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 ${format.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`text-2xl ${format.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{format.name}</h3>
                    <p className="text-sm text-gray-600">{format.description}</p>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Info:</strong> Export akan mencakup semua produk yang terfilter saat ini.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Batal
          </Button>
          <Button
            onClick={handleExport}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <FaDownload className="mr-2" />
            Export {selectedFormat.toUpperCase()}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
