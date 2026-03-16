import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    zIndex: isDragging ? 999 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="mb-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base font-medium">
            <Link to="/deals/$dealId" params={{ dealId: deal.id.toString() }} className="hover:underline">
              {deal.name}
            </Link>
          </CardTitle>
          <CardDescription>{deal.customer}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span>{deal.value} €</span>
              {deal.value_calculation_method === 'dynamic' && (
                <span className="text-xs text-muted-foreground">(Dynamisch)</span>
              )}
            </div>
            <Badge
              variant={
                deal.stage === "Gewonnen"
                  ? "default"
                  : deal.stage === "Verloren"
                    ? "destructive"
                    : deal.stage === "Verhandlung"
                      ? "secondary"
                      : "outline"
              }
            >
              {deal.stage}
            </Badge>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Abschluss: {deal.expectedCloseDate || '—'}</span>
          {onStageChange && (
            // Stop pointer events from bubbling to drag listeners
            <div onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
              <Select value={deal.stage} onValueChange={(stage) => onStageChange(deal.id, stage)}>
                <SelectTrigger className="h-7 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_STAGES.map(s => (
                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
