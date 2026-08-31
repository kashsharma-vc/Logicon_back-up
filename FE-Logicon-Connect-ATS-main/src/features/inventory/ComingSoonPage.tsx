import { PackageOpen } from "lucide-react"

export function InventoryComingSoonPage({ title }: { title: string }) {
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-app-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-app-text">{title}</h1>
          <p className="mt-1 text-sm text-app-secondary">
            Inventory Management Module
          </p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="rounded-full bg-brand-50 p-6 dark:bg-brand-950">
          <PackageOpen className="h-12 w-12 text-brand-500" />
        </div>
        <h2 className="mt-6 text-lg font-semibold text-app-text">
          Coming Soon
        </h2>
        <p className="mt-2 text-sm text-app-secondary max-w-sm mx-auto">
          The {title.toLowerCase()} module is currently under development and will be available in an upcoming release.
        </p>
      </div>
    </div>
  )
}
