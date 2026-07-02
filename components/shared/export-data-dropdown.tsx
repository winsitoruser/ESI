import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FaFileExport, FaFilePdf, FaFileExcel, FaFileCsv } from 'react-icons/fa';

interface ExportDataDropdownProps {
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onExportCSV?: () => void;
  disabled?: boolean;
}

const ExportDataDropdown: React.FC<ExportDataDropdownProps> = ({
  onExportPDF,
  onExportExcel,
  onExportCSV,
  disabled = false
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <FaFileExport className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onExportPDF && (
          <DropdownMenuItem onClick={onExportPDF}>
            <FaFilePdf className="mr-2 h-4 w-4 text-red-500" />
            Export to PDF
          </DropdownMenuItem>
        )}
        {onExportExcel && (
          <DropdownMenuItem onClick={onExportExcel}>
            <FaFileExcel className="mr-2 h-4 w-4 text-green-500" />
            Export to Excel
          </DropdownMenuItem>
        )}
        {onExportCSV && (
          <DropdownMenuItem onClick={onExportCSV}>
            <FaFileCsv className="mr-2 h-4 w-4 text-blue-500" />
            Export to CSV
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportDataDropdown;
