import { DashboardWidgetCard } from '@/features/dashboard/components/DashboardWidgetCard'
import { ChartCard } from '@/features/dashboard/components/ChartCard'
import { HorizontalBarChart } from '@/features/dashboard/components/HorizontalBarChart'
import { MetricTile } from '@/features/dashboard/components/MetricTile'
import { WidgetDrilldownAction } from '@/features/dashboard/components/WidgetDrilldownAction'
import type { DashboardClientOverviewSection } from '@/features/dashboard/types'
import { formatCount } from '@/features/dashboard/dashboardFormatters'

interface ClientOverviewWidgetProps {
  data: DashboardClientOverviewSection
  /** When true, emphasize a single scoped client in chart labels */
  compactForClientAudience?: boolean
}

export function ClientOverviewWidget({
  data,
  compactForClientAudience = false,
}: ClientOverviewWidgetProps) {
  const { client_count, site_count, department_count, clients, charts } = data
  const visibleClients = clients.slice(0, 5)
  const sitesByClient = charts?.sites_by_client ?? []
  const departmentsByClient = compactForClientAudience ? [] : charts?.departments_by_client ?? []

  const sitesTitle = compactForClientAudience && sitesByClient.length === 1
    ? 'Sites'
    : 'Sites by client'
  const deptsTitle = compactForClientAudience && departmentsByClient.length === 1
    ? 'Departments'
    : 'Departments by client'

  return (
    <DashboardWidgetCard
      id="client-overview"
      title="Client overview"
      description={
        compactForClientAudience ? 'Clients and sites in your scope.' : 'Clients, sites, and departments in your scope.'
      }
      action={<WidgetDrilldownAction label="View clients" fallbackTo="/clients" />}
    >
      <div className="space-y-4">
        <div className={compactForClientAudience ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-3 gap-3'}>
          <MetricTile label="Clients" value={formatCount(client_count)} />
          <MetricTile label="Sites" value={formatCount(site_count)} />
          {!compactForClientAudience ? <MetricTile label="Departments" value={formatCount(department_count)} /> : null}
        </div>

        {sitesByClient.length > 0 ? (
          <ChartCard title={sitesTitle}>
            <HorizontalBarChart
              items={sitesByClient.map((item) => ({
                label: item.label,
                value: item.count,
                url: item.url,
                variant: 'info',
              }))}
              emptyLabel="No site breakdown."
            />
          </ChartCard>
        ) : null}

        {departmentsByClient.length > 0 ? (
          <ChartCard title={deptsTitle}>
            <HorizontalBarChart
              items={departmentsByClient.map((item) => ({
                label: item.label,
                value: item.count,
                url: item.url,
                variant: 'neutral',
              }))}
              emptyLabel="No department breakdown."
            />
          </ChartCard>
        ) : null}

        {!compactForClientAudience && visibleClients.length > 0 ? (
          <div className="border-t border-app-border pt-3">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-app-subtle">Clients</p>
            <ul className="space-y-1">
              {visibleClients.map((client) => (
                <li key={client.id} className="flex items-center justify-between text-xs">
                  <span className="truncate text-app-text">{client.name}</span>
                  <span className="ml-2 shrink-0 tabular-nums text-app-subtle">{client.site_count} sites</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </DashboardWidgetCard>
  )
}
