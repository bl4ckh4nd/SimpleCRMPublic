import { toast as sonnerToast, type ExternalToast } from "sonner"

type ToastOptions = ExternalToast & {
  title: string
  variant?: "default" | "destructive"
}

export function toast({ title, variant, ...options }: ToastOptions) {
  return variant === "destructive"
    ? sonnerToast.error(title, options)
    : sonnerToast(title, options)
}
