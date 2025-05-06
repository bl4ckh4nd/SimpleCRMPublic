import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { saveDataToDesktop, isElectron } from '@/lib/electron-utils';

// This component provides desktop-specific export functionality
interface ExportButtonProps {
  data: any;
  fileName: string;
  children?: React.ReactNode;
}

export default function ExportButton({ data, fileName, children }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Using our electron utility to save data
      const success = saveDataToDesktop(data, fileName);
      
      if (success) {
        toast.success(isElectron() 
          ? "Data exported to file successfully" 
          : "Data downloaded successfully");
      } else {
        toast.error("Failed to export data");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("An error occurred while exporting data");
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <Button 
      variant="outline" 
      onClick={handleExport} 
      disabled={isExporting}
    >
      <Download className="mr-2 h-4 w-4" />
      {children || "Export"}
    </Button>
  );
}
