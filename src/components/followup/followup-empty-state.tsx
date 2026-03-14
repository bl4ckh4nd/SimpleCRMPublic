import { CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FollowUpEmptyStateProps {
  queue: string
  onSwitchQueue?: (queue: string) => void
}

const queueMessages: Record<string, { heading: string; description: string; suggestQueue?: string; suggestLabel?: string }> = {
  heute: {
    heading: "Keine Aufgaben für heute",
    description: "Alle heutigen Aufgaben erledigt!",
    suggestQueue: "diese_woche",
    suggestLabel: "Diese Woche",
  },
  ueberfaellig: {
    heading: "Keine überfälligen Aufgaben",
    description: "Alles im Zeitplan.",
    suggestQueue: "heute",
    suggestLabel: "Heute",
  },
  diese_woche: {
    heading: "Keine Aufgaben diese Woche",
    description: "Die Woche ist frei.",
    suggestQueue: "stagnierende_deals",
    suggestLabel: "Stagnierende Deals",
  },
  stagnierende_deals: {
    heading: "Keine stagnierenden Deals",
    description: "Alle Deals sind aktiv.",
    suggestQueue: "high_value_risk",
    suggestLabel: "High Value Risk",
  },
  high_value_risk: {
    heading: "Keine gefährdeten High-Value Deals",
    description: "Alle wichtigen Deals sind auf Kurs.",
    suggestQueue: "heute",
    suggestLabel: "Heute",
  },
}

export function FollowUpEmptyState({ queue, onSwitchQueue }: FollowUpEmptyStateProps) {
  const msg = queueMessages[queue] ?? {
    heading: "Keine Einträge",
    description: "Für diese Ansicht sind keine Einträge vorhanden.",
  }

  return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-4">
      <CheckCircle2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
      <h3 className="text-sm font-medium mb-1">{msg.heading}</h3>
      <p className="text-xs text-muted-foreground mb-4">{msg.description}</p>
      {msg.suggestQueue && onSwitchQueue && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => onSwitchQueue(msg.suggestQueue!)}
        >
          {msg.suggestLabel}
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      )}
    </div>
  )
}
