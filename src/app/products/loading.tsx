import { Skeleton } from "@/components/ui/skeleton"

export default function ProductsLoading() {
  // You can add a skeleton loading state here
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" /> 
      <Skeleton className="h-10 w-full" /> 
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
} 