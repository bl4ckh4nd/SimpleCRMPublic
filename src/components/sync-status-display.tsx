import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDownUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistance } from "date-fns";
import { de } from "date-fns/locale";

export function SyncStatusDisplay() {
  const [syncStatus, setSyncStatus] = useState({
    status: 'Unknown',
    timestamp: '',
    message: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchSyncStatus();

    // Set up listener for sync status updates
    const api = window.electronAPI as any;
    if (api && api.receive) {
      const cleanup = api.receive('sync:status-update', (data: any) => {
        setSyncStatus({
          status: data.status,
          timestamp: data.timestamp,
          message: data.message
        });
        
        if (data.status === 'Success' || data.status === 'Error') {
          setIsSyncing(false);
        }
      });

      return cleanup;
    }
  }, []);

  const fetchSyncStatus = async () => {
    setIsLoading(true);
    try {
      const api = window.electronAPI as any;
      if (!api || !api.invoke) {
        throw new Error("Electron API not available");
      }
      
      const result = await api.invoke('sync:get-status');
      if (result) {
        setSyncStatus({
          status: result.status || 'Never',
          timestamp: result.timestamp || '',
          message: result.message || ''
        });
      }
    } catch (error) {
      console.error("Failed to get sync status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncClick = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const api = window.electronAPI as any;
      if (!api || !api.invoke) {
        throw new Error("Electron API not available");
      }
      
      toast.info("JTL Sync gestartet...");
      const result = await api.invoke('sync:run');
      
      if (result.success) {
        toast.success("JTL Sync erfolgreich abgeschlossen");
      } else {
        toast.error(`JTL Sync fehlgeschlagen: ${result.message}`);
        setIsSyncing(false);
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Fehler beim Synchronisieren");
      setIsSyncing(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return 'Nie';
    
    try {
      const date = new Date(timestamp);
      return formatDistance(date, new Date(), { 
        addSuffix: false,
        locale: de 
      });
    } catch (e) {
      return timestamp;
    }
  };

  const getStatusText = () => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    
    let statusColor = 'text-muted-foreground';
    let prefix = "vor ";
    
    // Set status color based on status
    if (syncStatus.status === 'Success') {
      statusColor = 'text-green-500';
    } else if (syncStatus.status === 'Error') {
      statusColor = 'text-red-500';
      prefix = "Fehler ";
    } else if (syncStatus.status === 'Running') {
      statusColor = 'text-blue-500';
      prefix = "Läuft seit ";
    } else if (syncStatus.status === 'Never') {
      return <span className="text-sm text-muted-foreground">Nie</span>;
    }
    
    return (
      <span className={`text-sm font-medium ${statusColor}`}>
        {syncStatus.timestamp ? `${prefix}${formatTimestamp(syncStatus.timestamp)}` : 'Nie'}
      </span>
    );
  };

  return (
    <div className="flex items-center gap-3">
      <div className="whitespace-nowrap">
        <span className="text-sm text-muted-foreground mr-1">Letzter Sync:</span>
        {getStatusText()}
      </div>
      <Button 
        variant="outline"
        size="sm"
        onClick={handleSyncClick}
        disabled={isSyncing}
        className="h-10 whitespace-nowrap"
      >
        {isSyncing ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Synchronisiere...</>
        ) : (
          <><ArrowDownUp className="mr-2 h-4 w-4" /> JTL Sync</>
        )}
      </Button>
    </div>
  );
} 