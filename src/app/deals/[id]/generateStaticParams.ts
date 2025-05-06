export async function generateStaticParams() {
    const deals = [
      { id: "1" },
      { id: "2" },
      { id: "3" },
      { id: "4" },
      { id: "5" },
      { id: "6" },
    ];
  
    return deals.map((deal) => ({
      id: deal.id,
    }));
  }