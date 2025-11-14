import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

interface UpdateStatusPayload {
  status: UpdateStatus;
  info?: unknown;
  error?: string;
}

export function UpdateStatusDisplay() {
  const [status, setStatus] = useState<UpdateStatusPayload | null>(null);
  const [downloadPercent, setDownloadPercent] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.electron?.updates) {
      return;
    }

    let cleanStatusListener: (() => void) | undefined;
    let cleanProgressListener: (() => void) | undefined;

    const updates = window.electron.updates;

    updates
      .getStatus()
      .then((current: any) => {
        if (current && typeof current.status === "string") {
          setStatus(current as UpdateStatusPayload);
        }
      })
      .catch((error: any) => {
        console.error("[UpdateStatusDisplay] Failed to get update status:", error);
      });

    cleanStatusListener = updates.onStatusChange((nextStatus: any) => {
      if (nextStatus && typeof nextStatus.status === "string") {
        setStatus(nextStatus as UpdateStatusPayload);
      }
    });

    cleanProgressListener = updates.onDownloadProgress((progress: any) => {
      if (typeof progress?.percent === "number") {
        setDownloadPercent(progress.percent);
      }
    });

    return () => {
      cleanStatusListener && cleanStatusListener();
      cleanProgressListener && cleanProgressListener();
    };
  }, []);

  const handleCheckForUpdates = async () => {
    if (typeof window === "undefined" || !window.electron?.updates) {
      return;
    }

    try {
      setIsChecking(true);
      await window.electron.updates.checkForUpdates();
    } catch (error: any) {
      console.error("[UpdateStatusDisplay] Error checking for updates:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (typeof window === "undefined" || !window.electron?.updates) {
      return;
    }

    try {
      await window.electron.updates.installUpdate();
    } catch (error: any) {
      console.error("[UpdateStatusDisplay] Error installing update:", error);
    }
  };

  const statusLabel = (() => {
    if (!status) return "Keine Aktualisierungsinformationen";
    switch (status.status) {
      case "checking":
        return "Suche nach Updates…";
      case "available":
        return "Update verfügbar – Download läuft…";
      case "not-available":
        return "Keine Updates verfügbar";
      case "downloading":
        return "Update wird heruntergeladen…";
      case "downloaded":
        return "Update heruntergeladen – Neustart zum Anwenden";
      case "error":
        return status.error || "Fehler bei der Updateprüfung";
      case "idle":
      default:
        return "Update-Status unbekannt";
    }
  })();

  const showBanner =
    typeof window !== "undefined" &&
    !!window.electron?.updates &&
    (status !== null || isChecking);

  if (!showBanner) {
    return null;
  }

  return (
    <div className="border-b bg-muted/60 px-4 py-2 text-xs flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <span className="font-medium text-foreground">{statusLabel}</span>
        {downloadPercent !== null && (
          <div className="flex items-center gap-2">
            <Progress
              value={downloadPercent}
              className="h-1.5 w-40"
            />
            <span className="text-[0.7rem] text-muted-foreground">
              {downloadPercent.toFixed(0)}%
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCheckForUpdates}
          disabled={isChecking}
        >
          {isChecking ? "Prüfe…" : "Nach Updates suchen"}
        </Button>
        {status?.status === "downloaded" && (
          <Button
            variant="default"
            size="sm"
            onClick={handleInstallUpdate}
          >
            Neustart & Aktualisieren
          </Button>
        )}
      </div>
    </div>
  );
}
