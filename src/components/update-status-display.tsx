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

function getUpdatesApi() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.electron?.updates ?? null;
}

function isUpdateStatusPayload(value: unknown): value is UpdateStatusPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    typeof value.status === "string"
  );
}

function getStatusLabel(status: UpdateStatusPayload | null) {
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
}

export function UpdateStatusDisplay() {
  const [status, setStatus] = useState<UpdateStatusPayload | null>(null);
  const [downloadPercent, setDownloadPercent] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const updates = getUpdatesApi();

  useEffect(() => {
    const currentUpdates = getUpdatesApi();
    if (!currentUpdates) {
      return;
    }

    void currentUpdates
      .getStatus()
      .then((current: unknown) => {
        if (isUpdateStatusPayload(current)) {
          setStatus(current);
        }
      })
      .catch((error: unknown) => {
        console.error("[UpdateStatusDisplay] Failed to get update status:", error);
      });

    const disposeStatusListener = currentUpdates.onStatusChange((nextStatus: unknown) => {
      if (isUpdateStatusPayload(nextStatus)) {
        setStatus(nextStatus);
      }
    });

    const disposeProgressListener = currentUpdates.onDownloadProgress((progress: unknown) => {
      if (typeof progress === "object" && progress !== null && "percent" in progress && typeof progress.percent === "number") {
        setDownloadPercent(progress.percent);
      }
    });

    return () => {
      disposeStatusListener?.();
      disposeProgressListener?.();
    };
  }, []);

  const handleCheckForUpdates = async () => {
    if (!updates) {
      return;
    }

    try {
      setIsChecking(true);
      await updates.checkForUpdates();
    } catch (error: unknown) {
      console.error("[UpdateStatusDisplay] Error checking for updates:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!updates) {
      return;
    }

    try {
      await updates.installUpdate();
    } catch (error: unknown) {
      console.error("[UpdateStatusDisplay] Error installing update:", error);
    }
  };

  const statusLabel = getStatusLabel(status);

  const showBanner =
    !!updates &&
    (isChecking ||
      status?.status === "available" ||
      status?.status === "downloading" ||
      status?.status === "downloaded" ||
      status?.status === "error");

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
