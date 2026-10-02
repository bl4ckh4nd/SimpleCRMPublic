import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatCurrency, formatDate } from "@/types/deal";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const DEAL_STAGES = ['Interessent', 'Qualifiziert', 'Angebot', 'Verhandlung', 'Gewonnen', 'Verloren'] as const;

type Deal = {
  id: number;
  name: string;
  customer: string;
  value: string;
  value_calculation_method?: 'static' | 'dynamic';
  createdDate: string;
  expectedCloseDate: string;
  stage: string;
};

interface KanbanCardProps {
  deal: Deal;
  onStageChange?: (dealId: number, newStage: string) => void;
}

export function KanbanCard({ deal, onStageChange }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: deal.id,
    data: {
      type: "deal",
      deal,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 20 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="mb-3 cursor-grab rounded-lg shadow-none transition-colors hover:border-muted-foreground/50 active:cursor-grabbing">
        <CardHeader className="space-y-2 p-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="min-w-0 break-words text-base font-medium">
              <Link
                to="/deals/$dealId"
                params={{ dealId: deal.id.toString() }}
                className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onPointerDown={event => event.stopPropagation()}
                onKeyDown={event => event.stopPropagation()}
              >
                {deal.name}
              </Link>
            </CardTitle>
            {onStageChange && (
              <div
                className="shrink-0"
                onPointerDown={event => event.stopPropagation()}
                onClick={event => event.stopPropagation()}
                onKeyDown={event => event.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Phase für ${deal.name} ändern`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Verschieben nach …</DropdownMenuLabel>
                    {DEAL_STAGES.filter(stage => stage !== deal.stage).map(stage => (
                      <DropdownMenuItem key={stage} onSelect={() => onStageChange(deal.id, stage)}>
                        {stage}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          <CardDescription className="break-words">{deal.customer}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <div>
            <p className="text-base font-semibold tabular-nums">{formatCurrency(deal.value)}</p>
            {deal.value_calculation_method === 'dynamic' && (
              <p className="text-xs text-muted-foreground">Dynamisch berechnet</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Abschluss am {formatDate(deal.expectedCloseDate) || '—'}</p>
        </CardContent>
      </Card>
    </div>
  );
}
