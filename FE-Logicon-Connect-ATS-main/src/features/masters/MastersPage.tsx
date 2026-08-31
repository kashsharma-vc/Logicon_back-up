import { useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { JobRolesTab } from '@/features/masters/jobRoles/JobRolesTab'
import { WageMastersPanel } from '@/features/masters/wages/WageMastersPanel'
import { SurveyRoleMappingsTab } from '@/features/masters/surveyRoleMappings/SurveyRoleMappingsTab'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'

type WageTab = 'locations' | 'categories' | 'rates'
type MasterTab = 'job_roles' | WageTab | 'survey_role_mappings'

function defaultTab(canJob: boolean, canWage: boolean, canSurvey: boolean): MasterTab {
  if (canJob) return 'job_roles'
  if (canWage) return 'locations'
  if (canSurvey) return 'survey_role_mappings'
  return 'locations'
}

function normalizeTab(raw: string | null, canJob: boolean, canWage: boolean, canSurvey: boolean): MasterTab {
  if (raw === 'job_roles' && canJob) return 'job_roles'
  if (raw === 'survey_role_mappings' && canSurvey) return 'survey_role_mappings'
  if ((raw === 'locations' || raw === 'categories' || raw === 'rates') && canWage) return raw
  return defaultTab(canJob, canWage, canSurvey)
}

export function MastersPage() {
  const caps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canJob = hasAnyCapability(caps, [CAP.JOB_ROLE_READ])
  const canWage = hasAnyCapability(caps, [CAP.WAGE_READ])
  const canSurvey = hasAnyCapability(caps, [CAP.SALES_SURVEY_READ])

  const [params, setParams] = useSearchParams()
  const rawTab = params.get('tab')
  const tab = useMemo(() => normalizeTab(rawTab, canJob, canWage, canSurvey), [rawTab, canJob, canWage, canSurvey])

  useEffect(() => {
    const resolved = normalizeTab(rawTab, canJob, canWage, canSurvey)
    if (!rawTab || rawTab !== resolved) {
      const p = new URLSearchParams(params)
      p.set('tab', resolved)
      if (!rawTab) {
        p.delete('page')
      }
      setParams(p, { replace: true })
    }
  }, [rawTab, canJob, canWage, canSurvey, params, setParams])

  const setMasterTab = useCallback(
    (next: MasterTab) => {
      const p = new URLSearchParams(params)
      p.set('tab', next)
      p.delete('page')
      setParams(p)
    },
    [params, setParams],
  )

  const tabs = useMemo(() => {
    const out: { id: MasterTab; label: string }[] = []
    if (canJob) out.push({ id: 'job_roles', label: 'Job roles' })
    if (canWage) {
      out.push(
        { id: 'locations', label: 'Locations' },
        { id: 'categories', label: 'Wage categories' },
        { id: 'rates', label: 'Minimum wage rates' },
      )
    }
    if (canSurvey) {
      out.push({ id: 'survey_role_mappings', label: 'Survey Role Mappings' })
    }
    return out
  }, [canJob, canWage, canSurvey])

  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-app-text">Masters</h2>
        <p className="text-sm text-app-secondary">Job roles and wage geography / rates.</p>
      </div>

      {tabs.length > 0 ? (
        <div className="flex flex-wrap gap-8 border-b border-app-border">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMasterTab(id)}
              className={`border-b-2 pb-3 pt-1 text-sm transition-colors -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg ${
                tab === id
                  ? 'border-app-text font-semibold text-app-text'
                  : 'border-transparent font-normal text-app-secondary hover:text-app-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {tab === 'job_roles' && canJob ? <JobRolesTab /> : null}
      {tab === 'survey_role_mappings' && canSurvey ? <SurveyRoleMappingsTab /> : null}
      {tab !== 'job_roles' && tab !== 'survey_role_mappings' && canWage ? <WageMastersPanel /> : null}
    </div>
  )
}
