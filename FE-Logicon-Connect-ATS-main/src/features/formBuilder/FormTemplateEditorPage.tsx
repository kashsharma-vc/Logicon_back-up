import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Eye, FileText, Layers, List } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { getFormTemplate, listFormSections, listTemplateFields } from '@/api/formBuilder'
import { listJobRoles } from '@/api/jobs'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { FormSectionsPanel } from '@/features/formBuilder/FormSectionsPanel'
import { FormTemplatePreview } from '@/features/formBuilder/FormTemplatePreview'
import { TemplateBasicsPanel } from '@/features/formBuilder/TemplateBasicsPanel'
import { TemplateFieldsPanel } from '@/features/formBuilder/TemplateFieldsPanel'
import type {
  FormSectionRow,
  FormTemplateFieldRow,
  FormTemplateRow,
} from '@/features/formBuilder/types'

type TabKey = 'sections' | 'fields' | 'preview'

const TAB_CONFIG: { id: TabKey; label: string; icon: typeof Layers; description: string }[] = [
  { id: 'sections', label: 'Sections', icon: Layers, description: 'Organize form structure' },
  { id: 'fields', label: 'Fields', icon: List, description: 'Configure input fields' },
  { id: 'preview', label: 'Preview', icon: Eye, description: 'See live preview' },
]

interface JobRoleLookup {
  id: number
  name: string
  code: string
}

export function FormTemplateEditorPage() {
  const navigate = useNavigate()
  const params = useParams<{ templateId: string }>()
  const templateId = Number(params.templateId)
  const validId = Number.isFinite(templateId) && templateId > 0

  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canEdit = hasAnyCapability(meCaps, [CAP.CAMPAIGN_UPDATE, CAP.CAMPAIGN_CREATE])
  const canDelete = hasAnyCapability(meCaps, [CAP.CAMPAIGN_DELETE])

  const [template, setTemplate] = useState<FormTemplateRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [sections, setSections] = useState<FormSectionRow[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(true)
  const [sectionsError, setSectionsError] = useState<string | null>(null)

  const [previewFields, setPreviewFields] = useState<FormTemplateFieldRow[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const [jobRoles, setJobRoles] = useState<JobRoleLookup[]>([])

  const [tab, setTab] = useState<TabKey>('sections')

  const loadTemplate = useCallback(async () => {
    if (!validId) return
    setLoading(true)
    setError(null)
    try {
      const row = await getFormTemplate(templateId)
      setTemplate(row)
    } catch (e: unknown) {
      setTemplate(null)
      setError(parseApiError(e, 'Failed to load template').message)
    } finally {
      setLoading(false)
    }
  }, [templateId, validId])

  const loadSections = useCallback(async () => {
    if (!validId) return
    setSectionsLoading(true)
    setSectionsError(null)
    try {
      const res = await listFormSections({ template: templateId })
      setSections(res.items)
    } catch (e: unknown) {
      setSections([])
      setSectionsError(parseApiError(e, 'Failed to load sections').message)
    } finally {
      setSectionsLoading(false)
    }
  }, [templateId, validId])

  const loadPreviewData = useCallback(async () => {
    if (!validId) return
    setPreviewLoading(true)
    setPreviewError(null)
    try {
      const res = await listTemplateFields({ template: templateId })
      setPreviewFields(res.items)
    } catch (e: unknown) {
      setPreviewFields([])
      setPreviewError(parseApiError(e, 'Failed to load fields').message)
    } finally {
      setPreviewLoading(false)
    }
  }, [templateId, validId])

  useEffect(() => {
    void loadTemplate()
    void loadSections()
  }, [loadTemplate, loadSections])

  useEffect(() => {
    void (async () => {
      try {
        const res = await listJobRoles('')
        setJobRoles(res as JobRoleLookup[])
      } catch {
        setJobRoles([])
      }
    })()
  }, [])

  useEffect(() => {
    if (tab === 'preview') {
      void loadPreviewData()
    }
  }, [tab, loadPreviewData])

  if (!validId) {
    return (
      <div className="space-y-4">
        <ErrorState message="Invalid template id." />
        <Button variant="secondary" onClick={() => navigate('/form-builder')}>
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
          Back to templates
        </Button>
      </div>
    )
  }

  if (loading) {
    return <Spinner label="Loading template..." />
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorState message={error} />
        <Button variant="secondary" onClick={() => navigate('/form-builder')}>
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
          Back to templates
        </Button>
      </div>
    )
  }

  if (!template) {
    return (
      <EmptyState
        title="Template not found"
        description="It may have been deactivated or you may not have access."
      />
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 shadow-sm">
            <FileText className="h-5 w-5 text-white" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-600">Form Template</p>
            <h2 className="mt-0.5 truncate text-xl font-semibold text-app-text">{template.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded border border-app-border bg-app-muted px-2 py-0.5 font-mono text-xs text-app-secondary">
                {template.code}
              </span>
              {template.is_active ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="danger">Inactive</Badge>
              )}
              <span className="text-xs text-app-subtle">
                Updated {new Date(template.updated_at).toLocaleString()}
              </span>
            </div>
            {template.description ? (
              <p className="mt-2 text-sm text-app-secondary">{template.description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            className="min-h-9 px-3"
            onClick={() => navigate('/form-builder')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
            Back
          </Button>
          <Button onClick={() => setTab('preview')}>
            <Eye className="mr-1 h-4 w-4" aria-hidden />
            Preview
          </Button>
        </div>
      </div>

      <TemplateBasicsPanel template={template} canEdit={canEdit} onSaved={setTemplate} />

      {/* Tabs */}
      <div className="flex flex-wrap gap-6 border-b border-app-border">
        {TAB_CONFIG.map((t) => {
          const Icon = t.icon
          const isActive = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-2 border-b-2 pb-3 pt-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg ${
                isActive
                  ? 'border-brand-600 font-medium text-app-text'
                  : 'border-transparent text-app-secondary hover:text-app-text'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-brand-600' : 'text-app-subtle'}`} aria-hidden />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {tab === 'sections' ? (
        <FormSectionsPanel
          templateId={template.id}
          canEdit={canEdit}
          canDelete={canDelete}
          onSectionsChanged={setSections}
        />
      ) : null}

      {tab === 'fields' ? (
        sectionsLoading ? (
          <Spinner label="Loading sections..." />
        ) : sectionsError ? (
          <ErrorState message={sectionsError} />
        ) : (
          <TemplateFieldsPanel
            templateId={template.id}
            sections={sections}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        )
      ) : null}

      {tab === 'preview' ? (
        previewLoading || sectionsLoading ? (
          <Spinner label="Loading preview..." />
        ) : previewError ? (
          <ErrorState message={previewError} />
        ) : (
          <FormTemplatePreview fields={previewFields} sections={sections} jobRoles={jobRoles} />
        )
      ) : null}
    </div>
  )
}
