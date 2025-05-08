import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Deal, getDealStageColor, formatCurrency, formatDate } from "@/types/deal";
import { Link } from "@tanstack/react-router"; // Import Link

interface DealHeaderProps {
  deal: Deal;
}

export function DealHeader({ deal }: DealHeaderProps) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{deal.name}</h1>
        <p className="text-muted-foreground">{deal.customer}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={getDealStageColor(deal.stage)}>
          {deal.stage}
        </Badge>
        <span className="text-2xl font-semibold">{formatCurrency(deal.value)}</span>
      </div>
    </div>
  );
}

export function DealMetadata({ deal }: DealHeaderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal-Informationen</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none text-muted-foreground">Kunde</p>
            {/* Wrap customer name in a Link */}
            <Link
              to="/customers/$customerId"
              params={{ customerId: String(deal.customer_id) }}
              className="text-base text-primary hover:underline"
            >
              {deal.customer}
            </Link>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none text-muted-foreground">Erstellt am</p>
            <p className="text-base">{formatDate(deal.createdDate)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none text-muted-foreground">Voraussichtliches Abschlussdatum</p>
            <p className="text-base">{formatDate(deal.expectedCloseDate)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none text-muted-foreground">Wert</p>
            <p className="text-base">{formatCurrency(deal.value)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none text-muted-foreground">Phase</p>
            <div className="flex items-center gap-2">
              <Badge variant={getDealStageColor(deal.stage)}>
                {deal.stage}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DealNotes({ deal }: DealHeaderProps) {
  if (!deal.notes) return null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notizen</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap">{deal.notes}</p>
      </CardContent>
    </Card>
  );
}
