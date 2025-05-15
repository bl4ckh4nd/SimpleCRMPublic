export interface Deal {
  id: number;
  name: string;
  customer: string; // Keep the customer name string
  customer_id: number; // Add the customer ID
  value: string;
  value_calculation_method?: 'static' | 'dynamic'; // Method to calculate the deal value
  createdDate: string;
  expectedCloseDate: string;
  stage: string;
  notes: string;
}

// Change from type to enum to allow runtime iteration
export enum DealStage {
  Prospekt = 'Prospekt',
  Interessent = 'Interessent',
  Qualifiziert = 'Qualifiziert',
  Angebot = 'Angebot',
  Vorschlag = 'Vorschlag',
  Verhandlung = 'Verhandlung',
  Gewonnen = 'Gewonnen',
  Verloren = 'Verloren',
  AbgeschlossenGewonnen = 'Abgeschlossen Gewonnen',
  AbgeschlossenVerloren = 'Abgeschlossen Verloren'
}

export function getDealStageColor(stage: string): "default" | "outline" | "destructive" | "secondary" {
  switch (stage) {
    case DealStage.Gewonnen:
    case DealStage.AbgeschlossenGewonnen:
      return "default";
    case DealStage.Verloren:
    case DealStage.AbgeschlossenVerloren:
      return "destructive";
    case DealStage.Verhandlung:
    case DealStage.Angebot:
    case DealStage.Vorschlag:
      return "secondary";
    default:
      return "outline";
  }
}

export function formatCurrency(value: string): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value));
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';

  // Check if it's already in dd.mm.yyyy format
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) {
    return dateString;
  }

  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE').format(date);
  } catch (error) {
    return dateString;
  }
}
