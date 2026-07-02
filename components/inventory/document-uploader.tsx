import React from 'react';

interface DocumentUploaderProps {
  onUpload?: (files: File[]) => void;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onUpload }) => {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
      <input
        type="file"
        multiple
        onChange={(e) => {
          if (e.target.files && onUpload) {
            onUpload(Array.from(e.target.files));
          }
        }}
        className="w-full"
      />
    </div>
  );
};

export default DocumentUploader;
