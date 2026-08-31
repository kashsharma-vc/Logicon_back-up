import { EmptyState } from '@/components/ui/EmptyState'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="w-full">
      <h2 className="mb-4 text-lg font-semibold text-app-text">{title}</h2>
      <EmptyState title="Module coming soon" description="This area is reserved for future ATS functionality." />
    </div>
  )
}




