import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "./kanban-card";

type Deal = {
  id: number;
  name: string;
  customer: string;
  value: string;
  createdDate: string;
  expectedCloseDate: string;
  stage: string;
};

interface KanbanColumnProps {
  id: string;
  title: string;
  deals: Deal[];
}

export function KanbanColumn({ id, title, deals }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });
  
  return (
    <div className="flex-1 min-w-[250px]">
      <div className="mb-3 font-medium">
        <h3>{title} <span className="text-muted-foreground ml-1 text-sm">({deals.length})</span></h3>
      </div>
      <div 
        ref={setNodeRef} 
        className={`bg-muted/40 rounded-md p-3 min-h-[500px] ${isOver ? 'ring-2 ring-primary/20 bg-muted/60' : ''}`}
      >
        <SortableContext items={deals.map(deal => deal.id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <KanbanCard key={deal.id} deal={deal} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
