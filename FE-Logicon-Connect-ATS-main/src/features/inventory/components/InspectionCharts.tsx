import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from "recharts"
import { inspectionStatusData, weeklyInspectionTrend } from "../dashboardData"
import { useState } from "react"

const TABS = ['Donut', 'Bar', 'Weekly Trend']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-app-surface border border-app-border rounded-lg px-3 py-2 shadow-lg text-xs">
        {label && <p className="font-semibold text-app-heading mb-1">{label}</p>}
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color || p.fill }} className="font-medium">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

const RADIAN = Math.PI / 180
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  if (percent < 0.06) return null
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold" fontSize={11}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function InspectionCharts() {
  const [tab, setTab] = useState('Donut')

  return (
    <div className="bg-app-surface border border-app-border rounded-xl shadow-panel overflow-hidden">
      <div className="px-6 py-4 border-b border-app-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-app-heading">Inspection Status</h2>
          <p className="text-xs text-app-secondary mt-0.5">Distribution across all sites</p>
        </div>
        <div className="flex bg-app-muted rounded-lg p-0.5">
          {TABS.map(t => (
            <button 
              key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                tab === t ? 'bg-app-surface text-brand-500 shadow-sm' : 'text-app-secondary hover:text-app-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {tab === 'Donut' && (
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="w-full lg:w-64 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inspectionStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomLabel}
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {inspectionStatusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 grid grid-cols-1 gap-2">
              {inspectionStatusData.map(entry => {
                const total = inspectionStatusData.reduce((s, e) => s + e.value, 0)
                return (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
                      <span className="text-sm text-app-text">{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-1.5 bg-app-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(entry.value / total) * 100}%`, background: entry.color }} />
                      </div>
                      <span className="text-sm font-semibold text-app-heading w-8 text-right">{entry.value}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'Bar' && (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inspectionStatusData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]} animationDuration={600}>
                  {inspectionStatusData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {tab === 'Weekly Trend' && (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyInspectionTrend} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="completed" name="Completed" stackId="a" fill="#16a34a" radius={[0,0,0,0]} />
                <Bar dataKey="pending" name="Pending" stackId="a" fill="#f59e0b" radius={[0,0,0,0]} />
                <Bar dataKey="failed" name="Failed" stackId="a" fill="#dc2626" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
