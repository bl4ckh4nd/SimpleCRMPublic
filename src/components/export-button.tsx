import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Download, ChevronDown } from "lucide-react";
import { saveDataToDesktop, saveCSVToDesktop } from '@/lib/electron-utils';

interface ExportButtonProps {
  data: any[];
  fileName: string;
  children?: React.ReactNode;
}

export default function ExportButton({ data, fileName, children }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const baseName = fileName.replace(/\.[^.]+$/, '');

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      setIsExporting(true);
      let success: boolean;
      if (format === 'csv') {
        success = saveCSVToDesktop(data, `${baseName}.csv`);
        if (success) toast.success('Als CSV exportiert');
      } else {
        success = saveDataToDesktop(data, `${baseName}.json`);
        if (success) toast.success('Als JSON exportiert');
      }
      if (!success) toast.error('Export fehlgeschlagen');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Fehler beim Exportieren');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />
          {children || 'Exportieren'}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          CSV exportieren (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('json')}>
          JSON exportieren (.json)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
