import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Deal = {
  id: number;
  name: string;
  customer: string;
  value: string;
  createdDate: string;
  expectedCloseDate: string;
  stage: string;
};

interface KanbanCardProps {
  deal: Deal;
}

export function KanbanCard({ deal }: KanbanCardProps) {
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
            <span>{deal.value} €</span>
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
        <CardFooter className="p-4 pt-0 text-xs text-muted-foreground">
          Abschluss: {deal.expectedCloseDate}
        </CardFooter>
      </Card>
    </div>
  );
}
