import { useState } from "react"
import { 
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts"

const completionTrend = [
  { month: 'Jan', inspections: 98, quality: 82, safety: 87 },
  { month: 'Feb', inspections: 112, quality: 84, safety: 89 },
  { month: 'Mar', inspections: 95, quality: 83, safety: 88 },
  { month: 'Apr', inspections: 128, quality: 86, safety: 91 },
  { month: 'May', inspections: 140, quality: 85, safety: 92 },
  { month: 'Jun', inspections: 148, quality: 87, safety: 94 },
  { month: 'Jul', inspections: 130, quality: 88, safety: 95 },
]

const workerProductivity = [
  { week: 'W1', tasks: 210, issues: 18, resolved: 15 },
  { week: 'W2', tasks: 235, issues: 22, resolved: 19 },
  { week: 'W3', tasks: 198, issues: 14, resolved: 13 },
  { week: 'W4', tasks: 267, issues: 11, resolved: 11 },
]

const TABS = ['Inspection Trends', 'Worker Productivity', 'Monthly Reports']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-app-surface border border-app-border rounded-lg px-3 py-2 shadow-lg text-xs">
        {label && <p className="font-semibold text-app-heading mb-1">{label}</p>}
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.stroke || p.fill }} className="font-medium">
            {p.name}: {p.value}{typeof p.value === 'number' && p.name.includes('Score') ? '%' : ''}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function AnalyticsSection() {
  const [tab, setTab] = useState('Inspection Trends')

  return (
    <div className="bg-app-surface border border-app-border rounded-xl shadow-panel overflow-hidden">
      <div className="px-6 py-4 border-b border-app-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-app-heading">Analytics</h2>
          <p className="text-xs text-app-secondary mt-0.5">Trends and performance metrics</p>
        </div>
        <div className="flex bg-app-muted rounded-lg p-0.5">
          {TABS.map(t => (
            <button
              key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                tab === t ? 'bg-app-surface text-brand-500 shadow-sm' : 'text-app-secondary hover:text-app-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          {tab === 'Inspection Trends' ? (
            <AreaChart data={completionTrend} margin={{ left: -10 }}>
              <defs>
                <linearGradient id="inspGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary-500)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--color-primary-500)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="qualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="inspections" name="Inspections" stroke="var(--color-primary-500)" strokeWidth={2} fill="url(#inspGrad)" dot={false} />
              <Area type="monotone" dataKey="quality" name="Quality Score" stroke="var(--color-success)" strokeWidth={2} fill="url(#qualGrad)" dot={false} />
              <Area type="monotone" dataKey="safety" name="Safety Score" stroke="var(--color-warning)" strokeWidth={2} fill="none" dot={false} strokeDasharray="4 4" />
            </AreaChart>
          ) : tab === 'Worker Productivity' ? (
            <BarChart data={workerProductivity} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="tasks" name="Tasks" fill="var(--color-primary-500)" radius={[4,4,0,0]} />
              <Bar dataKey="issues" name="Issues" fill="var(--color-danger)" radius={[4,4,0,0]} />
              <Bar dataKey="resolved" name="Resolved" fill="var(--color-success)" radius={[4,4,0,0]} />
            </BarChart>
          ) : (
            <LineChart data={completionTrend} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="inspections" name="Reports" stroke="var(--color-primary-500)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--color-primary-500)' }} />
              <Line type="monotone" dataKey="quality" name="Quality" stroke="var(--color-success)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--color-success)' }} strokeDasharray="0" />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
