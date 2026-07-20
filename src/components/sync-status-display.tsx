import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDownUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistance } from "date-fns";
import { de } from "date-fns/locale";

type SyncStatus = {
  status: string;
  timestamp: string;
  message: string;
};

const INITIAL_SYNC_STATUS: SyncStatus = {
  status: "Unknown",
  timestamp: "",
  message: "",
};

function normalizeStoredSyncStatus(value: Partial<SyncStatus> | null | undefined): SyncStatus {
  return {
    status: value?.status || "Never",
    timestamp: value?.timestamp || "",
    message: value?.message || "",
  };
}

function normalizeLiveSyncStatus(value: Partial<SyncStatus> | null | undefined): SyncStatus {
  return {
    status: value?.status || INITIAL_SYNC_STATUS.status,
    timestamp: value?.timestamp || "",
    message: value?.message || "",
  };
}

function getElectronApi() {
  const api = window.electronAPI;
  if (!api) {
    throw new Error("Electron API not available");
  }

  return api;
}

function getSyncStatusDisplay(status: SyncStatus["status"]) {
  if (status === "Success") {
    return { className: "text-green-500", prefix: "vor " };
  }

  if (status === "Error") {
    return { className: "text-red-500", prefix: "Fehler " };
  }

  if (status === "Running") {
    return { className: "text-blue-500", prefix: "Läuft seit " };
  }

  return { className: "text-muted-foreground", prefix: "vor " };
}

export function SyncStatusDisplay() {
  const [syncStatus, setSyncStatus] = useState(INITIAL_SYNC_STATUS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchSyncStatus();

    const api = window.electronAPI;
    if (!api?.onSyncStatusChange) {
      return;
    }

    return api.onSyncStatusChange((data) => {
      const status = data as Partial<SyncStatus>;
      const nextStatus = normalizeLiveSyncStatus(status);
      setSyncStatus(nextStatus);

      if (nextStatus.status === 'Success' || nextStatus.status === 'Error') {
        setIsSyncing(false);
      }
    });
  }, []);

  const fetchSyncStatus = async () => {
    setIsLoading(true);
    try {
      const result = await getElectronApi().invoke('sync:get-status');
      if (result) {
        setSyncStatus(normalizeStoredSyncStatus(result));
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
      toast.info("JTL Sync gestartet...");
      const result = await getElectronApi().invoke('sync:run');
      
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
    } catch {
      return timestamp;
    }
  };

  const statusText = (() => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }

    if (syncStatus.status === 'Never') {
      return <span className="text-sm text-muted-foreground">Nie</span>;
    }

    const { className, prefix } = getSyncStatusDisplay(syncStatus.status);

    return (
      <span className={`text-sm font-medium ${className}`}>
        {syncStatus.timestamp ? `${prefix}${formatTimestamp(syncStatus.timestamp)}` : 'Nie'}
      </span>
    );
  })();

  return (
    <div className="flex items-center gap-3">
      <div className="whitespace-nowrap">
        <span className="text-sm text-muted-foreground mr-1">Letzter Sync:</span>
        {statusText}
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
