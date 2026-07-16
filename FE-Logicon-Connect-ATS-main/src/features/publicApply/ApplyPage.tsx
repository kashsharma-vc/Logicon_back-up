import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { Briefcase, FileText, Info, Phone } from 'lucide-react'
import { getPublicCampaignByToken } from '@/api/publicCampaigns'
import { createPublicSubmission } from '@/api/publicSubmissions'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import { PublicApplyLayout } from '@/features/publicApply/PublicApplyLayout'
import { FormFieldRenderer } from '@/features/publicApply/FormFieldRenderer'
import { SuccessState } from '@/features/publicApply/SuccessState'
import { t } from '@/features/publicApply/i18n'
import { FileUploadField } from '@/features/publicApply/FileUploadField'
import {
  isEmptyFieldValue,
  validateBusinessRules,
  validateMobile10Digits,
  validateRequiredFields,
} from '@/features/publicApply/validation'
import type { LangCode, PublicCampaign, PublicFormField, PublicRole } from '@/features/publicApply/types'

type CandidateValues = {
  first_name: string
  middle_name: string
  last_name: string
  mobile_number: string
  role_id: string
  other_role_title: string
}

type CandidateErrors = Partial<Record<keyof CandidateValues, string>>

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-panel border border-app-border bg-app-surface shadow-panel">
      <div className="flex items-center gap-2 border-b border-app-border bg-app-muted px-4 py-3">
        <Icon className="h-4 w-4 text-brand-600" aria-hidden />
        <h2 className="text-sm font-semibold text-app-text">{title}</h2>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </div>
  )
}

function keyForFieldValue(field: PublicFormField): string {
  return field.field_key
}

function answerForField(field: PublicFormField, value: unknown) {
  if (field.field_source === 'template') {
    return { template_field_id: field.id, value }
  }
  return { field_id: field.id, value }
}

function fileKeyForField(field: PublicFormField): string {
  if (field.field_source === 'template') {
    return `template_field_${field.id}`
  }
  return `field_${field.id}`
}

export function ApplyPage() {
  const { token } = useParams<{ token: string }>()

  const [campaign, setCampaign] = useState<PublicCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [lang, setLang] = useState<LangCode>('en')

  const [candidate, setCandidate] = useState<CandidateValues>({
    first_name: '',
    middle_name: '',
    last_name: '',
    mobile_number: '',
    role_id: '',
    other_role_title: '',
  })
  const [candidateErrors, setCandidateErrors] = useState<CandidateErrors>({})

  const [fieldValues, setFieldValues] = useState<Record<number, unknown>>({})
  const [fieldFiles, setFieldFiles] = useState<Record<number, File | null>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<number, string>>({})

  const [resume, setResume] = useState<File | null>(null)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [duplicate, setDuplicate] = useState(false)

  useEffect(() => {
    if (!token) {
      setLoadError(t('en', 'invalidLink'))
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    getPublicCampaignByToken(token)
      .then((data) => {
        setCampaign(data)
        const initialLang = (data.default_language ?? 'en') as LangCode
        setLang(initialLang)
      })
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setLoadError(t('en', 'invalidLink'))
        } else {
          setLoadError(t('en', 'loadError'))
        }
      })
      .finally(() => setLoading(false))
  }, [token])

  const roles: PublicRole[] = useMemo(() => campaign?.roles ?? [], [campaign])
  const enabledLanguages = useMemo(() => campaign?.enabled_languages ?? ['en'], [campaign])
  const showLanguage = enabledLanguages.length > 1

  const activeRoleFields: PublicFormField[] = useMemo(() => {
    if (!campaign) return []
    if (!candidate.role_id || candidate.role_id === 'other') return []
    return campaign.role_fields?.[candidate.role_id] ?? []
  }, [campaign, candidate.role_id])

  const allFields: PublicFormField[] = useMemo(() => {
    if (!campaign) return []
    return [...(campaign.common_fields ?? []), ...activeRoleFields]
  }, [campaign, activeRoleFields])

  // Dynamic resume field is handled by dedicated `resume` state — skip it in validation
  const fieldsForValidation = useMemo(
    () => allFields.filter((f) => !(f.field_type === 'file' && f.field_key === 'resume')),
    [allFields],
  )

  // Non-file fields: common first (by sort_order), then role-specific after
  const commonNonFileFields = useMemo(
    () =>
      (campaign?.common_fields ?? [])
        .filter((f) => f.field_type !== 'file')
        .sort((a, b) => a.sort_order - b.sort_order),
    [campaign],
  )
  const roleNonFileFields = useMemo(
    () => activeRoleFields.filter((f) => f.field_type !== 'file').sort((a, b) => a.sort_order - b.sort_order),
    [activeRoleFields],
  )
  const hasGeneralFields = commonNonFileFields.length > 0 || roleNonFileFields.length > 0

  // File fields — exclude field_key='resume' (merged into dedicated resume upload)
  const dynamicFileFields = useMemo(
    () => allFields.filter((f) => f.field_type === 'file' && f.field_key !== 'resume'),
    [allFields],
  )
  const idProofField = useMemo(
    () => dynamicFileFields.find((f) => f.field_key === 'id_proof') ?? null,
    [dynamicFileFields],
  )
  const certificateField = useMemo(
    () => dynamicFileFields.find((f) => f.field_key === 'certificate') ?? null,
    [dynamicFileFields],
  )
  const otherFileFields = useMemo(
    () => dynamicFileFields.filter((f) => f.field_key !== 'id_proof' && f.field_key !== 'certificate'),
    [dynamicFileFields],
  )

  const totalFiles = useMemo(() => {
    const dynamicFiles = Object.values(fieldFiles).filter(Boolean).length
    return (resume ? 1 : 0) + dynamicFiles
  }, [resume, fieldFiles])

  const otherDocsUploaded = useMemo(
    () => otherFileFields.filter((f) => fieldFiles[f.id]).length,
    [otherFileFields, fieldFiles],
  )

  function clearCandidateError(field: keyof CandidateValues) {
    setCandidateErrors((prev) => {
      const n = { ...prev }
      delete n[field]
      return n
    })
  }

  function setFieldValue(fieldId: number, next: unknown) {
    setFieldValues((prev) => ({ ...prev, [fieldId]: next }))
    setFieldErrors((prev) => {
      const n = { ...prev }
      delete n[fieldId]
      return n
    })
  }

  function setFieldFile(fieldId: number, file: File | null, errKey: string | null) {
    setFieldFiles((prev) => ({ ...prev, [fieldId]: file }))
    setFieldErrors((prev) => {
      const n = { ...prev }
      if (errKey) n[fieldId] = errKey
      else delete n[fieldId]
      return n
    })
  }

  async function submit() {
    if (!campaign || !token || submitting) return
    setGlobalError(null)

    const nextCandidateErrors: CandidateErrors = {}
    if (!candidate.first_name.trim()) nextCandidateErrors.first_name = t(lang, 'required')
    if (!candidate.last_name.trim()) nextCandidateErrors.last_name = t(lang, 'required')
    const mobileErr = validateMobile10Digits(candidate.mobile_number)
    if (mobileErr) nextCandidateErrors.mobile_number = t(lang, mobileErr as Parameters<typeof t>[1])
    if (!candidate.role_id) {
      nextCandidateErrors.role_id = t(lang, 'required')
    } else if (candidate.role_id === 'other') {
      if (!candidate.other_role_title.trim() || candidate.other_role_title.trim().length < 2) {
        nextCandidateErrors.other_role_title = t(lang, 'required')
      }
    }
    setCandidateErrors(nextCandidateErrors)

    let nextResumeError: string | null = null
    if (!resume) nextResumeError = 'resumeRequired'
    setResumeError(nextResumeError)

    const requiredErrors = validateRequiredFields(fieldsForValidation, fieldValues, fieldFiles)
    setFieldErrors((prev) => ({ ...prev, ...requiredErrors }))

    const valuesByKey: Record<string, unknown> = {}
    for (const f of allFields) {
      if (f.field_type === 'file') continue
      valuesByKey[keyForFieldValue(f)] = fieldValues[f.id]
    }
    const businessErrKeys = validateBusinessRules(valuesByKey)

    const hasErrors =
      Object.keys(nextCandidateErrors).length > 0 ||
      nextResumeError !== null ||
      Object.keys(requiredErrors).length > 0 ||
      businessErrKeys.length > 0 ||
      totalFiles > 5

    if (totalFiles > 5) {
      setGlobalError(t(lang, 'maxFiles'))
      return
    }

    if (hasErrors) {
      if (businessErrKeys.length) {
        setGlobalError(businessErrKeys.map((k) => t(lang, k as any)).join(' '))
      } else {
        setGlobalError(t(lang, 'submitError'))
      }
      return
    }

    const answers = allFields
      .filter((f) => f.field_type !== 'file')
      .map((f) => answerForField(f, fieldValues[f.id]))
      .filter((a) => !isEmptyFieldValue(a.value))

    const formData = new FormData()
    formData.append('campaign_token', token)
    formData.append('mobile_number', candidate.mobile_number)
    formData.append('first_name', candidate.first_name.trim())
    formData.append('middle_name', candidate.middle_name.trim())
    formData.append('last_name', candidate.last_name.trim())
    formData.append('language', lang)

    if (candidate.role_id && candidate.role_id !== 'other') {
      formData.append('job_role_id', candidate.role_id)
    } else if (candidate.other_role_title.trim()) {
      formData.append('other_role_title', candidate.other_role_title.trim())
    }

    formData.append('answers', JSON.stringify(answers))
    formData.append('resume', resume!)

    for (const f of allFields) {
      if (f.field_type !== 'file') continue
      const file = fieldFiles[f.id]
      if (file) formData.append(fileKeyForField(f), file)
    }

    setSubmitting(true)
    try {
      const res = await createPublicSubmission(formData)
      setDuplicate(Boolean(res.is_possible_duplicate))
      setSubmitted(true)
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.data) {
        const data = e.response.data as unknown
        if (data && typeof data === 'object') {
          const msg = Object.values(data as Record<string, unknown>)
            .flatMap((v) => (Array.isArray(v) ? v : [v]))
            .map((v) => (typeof v === 'string' ? v : ''))
            .filter(Boolean)
            .join(' ')
          setGlobalError(msg || t(lang, 'submitError'))
        } else {
          setGlobalError(t(lang, 'submitError'))
        }
      } else {
        setGlobalError(t(lang, 'submitError'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <PublicApplyLayout lang="en">
        <div className="mx-auto w-full max-w-2xl px-4 py-10">
          <Spinner label={t('en', 'loading')} />
        </div>
      </PublicApplyLayout>
    )
  }

  if (loadError) {
    return (
      <PublicApplyLayout lang="en">
        <div className="mx-auto w-full max-w-2xl px-4 py-10">
          <ErrorState message={loadError} />
        </div>
      </PublicApplyLayout>
    )
  }

  if (!campaign) {
    return (
      <PublicApplyLayout lang="en">
        <div className="mx-auto w-full max-w-2xl px-4 py-10">
          <ErrorState message={t('en', 'loadError')} />
        </div>
      </PublicApplyLayout>
    )
  }

  if (submitted) {
    return (
      <PublicApplyLayout lang={lang} campaignTitle={campaign.title}>
        <SuccessState
          lang={lang}
          campaignTitle={campaign.title}
          isDuplicate={duplicate}
          onBack={() => {
            setSubmitted(false)
            setDuplicate(false)
          }}
        />
      </PublicApplyLayout>
    )
  }

  const langPills = showLanguage ? (
    <div className="flex overflow-hidden rounded-panel border border-app-border">
      {campaign.languages.map((l, idx) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code as LangCode)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium transition',
            idx > 0 && 'border-l border-app-border',
            lang === l.code
              ? 'bg-brand-600 text-white'
              : 'bg-app-surface text-app-secondary hover:bg-app-muted',
          )}
        >
          {l.native_label}
        </button>
      ))}
    </div>
  ) : null

  return (
    <PublicApplyLayout lang={lang} campaignTitle={campaign.title} headerRight={langPills}>
      <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8">
        {campaign.site ? (
          <p className="text-sm text-app-secondary">
            {campaign.site.name} — {campaign.site.city}, {campaign.site.state}
          </p>
        ) : null}

        {globalError ? <ErrorState message={globalError} /> : null}

        {/* Contact Details */}
        <SectionCard icon={Phone} title={t(lang, 'contactDetails')}>
          {/* Mobile */}
          <div className="flex flex-col gap-1">
            <label htmlFor="mobile_number" className="text-sm font-medium text-app-secondary">
              {t(lang, 'mobile')} <span className="text-status-danger">*</span>
            </label>
            <div
              className={cn(
                'flex items-center overflow-hidden rounded-panel border bg-app-surface shadow-panel focus-within:ring-2 focus-within:ring-brand-500/30',
                candidateErrors.mobile_number ? 'border-status-danger' : 'border-app-border focus-within:border-brand-600',
              )}
            >
              <span className="border-r border-app-border bg-app-muted px-3 py-2 text-sm text-app-secondary">+91</span>
              <input
                id="mobile_number"
                inputMode="numeric"
                value={candidate.mobile_number}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setCandidate((v) => ({ ...v, mobile_number: digits }))
                  clearCandidateError('mobile_number')
                }}
                className="min-h-10 w-full bg-app-surface px-3 py-2 text-sm text-app-text outline-none placeholder:text-app-subtle"
                placeholder="10 digits"
                disabled={submitting}
              />
            </div>
            {candidateErrors.mobile_number ? (
              <p className="text-sm text-status-danger" role="alert">{candidateErrors.mobile_number}</p>
            ) : null}
          </div>

          {/* Names */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="first_name" className="text-sm font-medium text-app-secondary">
                {t(lang, 'firstName')} <span className="text-status-danger">*</span>
              </label>
              <input
                id="first_name"
                value={candidate.first_name}
                onChange={(e) => {
                  setCandidate((v) => ({ ...v, first_name: e.target.value }))
                  clearCandidateError('first_name')
                }}
                className={cn(
                  'min-h-10 rounded-panel border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
                  candidateErrors.first_name ? 'border-status-danger' : 'border-app-border',
                )}
                disabled={submitting}
              />
              {candidateErrors.first_name ? (
                <p className="text-sm text-status-danger" role="alert">{candidateErrors.first_name}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="middle_name" className="text-sm font-medium text-app-secondary">
                {t(lang, 'middleName')}
              </label>
              <input
                id="middle_name"
                value={candidate.middle_name}
                onChange={(e) => setCandidate((v) => ({ ...v, middle_name: e.target.value }))}
                className="min-h-10 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                disabled={submitting}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="last_name" className="text-sm font-medium text-app-secondary">
                {t(lang, 'lastName')} <span className="text-status-danger">*</span>
              </label>
              <input
                id="last_name"
                value={candidate.last_name}
                onChange={(e) => {
                  setCandidate((v) => ({ ...v, last_name: e.target.value }))
                  clearCandidateError('last_name')
                }}
                className={cn(
                  'min-h-10 rounded-panel border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
                  candidateErrors.last_name ? 'border-status-danger' : 'border-app-border',
                )}
                disabled={submitting}
              />
              {candidateErrors.last_name ? (
                <p className="text-sm text-status-danger" role="alert">{candidateErrors.last_name}</p>
              ) : null}
            </div>
          </div>
        </SectionCard>

        {/* Applying For */}
        <SectionCard icon={Briefcase} title={t(lang, 'applyingFor')}>
          <div className="space-y-2">
            {roles.map((r) => {
              const selected = candidate.role_id === String(r.id)
              return (
                <label
                  key={r.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-panel border p-4 transition',
                    selected
                      ? 'border-brand-600 ring-1 ring-brand-500/30'
                      : 'border-app-border hover:bg-app-muted',
                    submitting && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <input
                    type="radio"
                    name="role_id"
                    value={String(r.id)}
                    checked={selected}
                    onChange={() => {
                      setCandidate((v) => ({ ...v, role_id: String(r.id), other_role_title: '' }))
                      clearCandidateError('role_id')
                    }}
                    className="sr-only"
                    disabled={submitting}
                  />
                  <div
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                      selected ? 'border-brand-600' : 'border-app-border',
                    )}
                  >
                    {selected && <div className="h-2 w-2 rounded-full bg-brand-600" />}
                  </div>
                  <span className="text-sm font-medium text-app-text">{r.name}</span>
                </label>
              )
            })}
            {/* Other option */}
            <label
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-panel border p-4 transition',
                candidate.role_id === 'other'
                  ? 'border-brand-600 ring-1 ring-brand-500/30'
                  : 'border-app-border hover:bg-app-muted',
                submitting && 'cursor-not-allowed opacity-60',
              )}
            >
              <input
                type="radio"
                name="role_id"
                value="other"
                checked={candidate.role_id === 'other'}
                onChange={() => {
                  setCandidate((v) => ({ ...v, role_id: 'other' }))
                  clearCandidateError('role_id')
                }}
                className="sr-only"
                disabled={submitting}
              />
              <div
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                  candidate.role_id === 'other' ? 'border-brand-600' : 'border-app-border',
                )}
              >
                {candidate.role_id === 'other' && <div className="h-2 w-2 rounded-full bg-brand-600" />}
              </div>
              <span className="text-sm font-medium text-app-text">{t(lang, 'otherRole')}</span>
            </label>
          </div>

          {candidateErrors.role_id ? (
            <p className="text-sm text-status-danger" role="alert">{candidateErrors.role_id}</p>
          ) : null}

          {candidate.role_id === 'other' ? (
            <div className="flex flex-col gap-1">
              <label htmlFor="other_role_title" className="text-sm font-medium text-app-secondary">
                {t(lang, 'otherRole')} <span className="text-status-danger">*</span>
              </label>
              <input
                id="other_role_title"
                value={candidate.other_role_title}
                onChange={(e) => {
                  setCandidate((v) => ({ ...v, other_role_title: e.target.value }))
                  clearCandidateError('other_role_title')
                }}
                className={cn(
                  'min-h-10 rounded-panel border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
                  candidateErrors.other_role_title ? 'border-status-danger' : 'border-app-border',
                )}
                placeholder={t(lang, 'otherRolePlaceholder')}
                disabled={submitting}
              />
              {candidateErrors.other_role_title ? (
                <p className="text-sm text-status-danger" role="alert">{candidateErrors.other_role_title}</p>
              ) : null}
            </div>
          ) : null}
        </SectionCard>

        {/* General Information */}
        {hasGeneralFields ? (
          <SectionCard icon={Info} title={t(lang, 'generalInfo')}>
            {commonNonFileFields.map((field) => (
              <FormFieldRenderer
                key={field.id}
                field={field}
                lang={lang}
                value={fieldValues[field.id]}
                file={null}
                errorKey={fieldErrors[field.id] ?? null}
                disabled={submitting}
                onChangeValue={(next) => setFieldValue(field.id, next)}
                onChangeFile={() => {}}
              />
            ))}
            {roleNonFileFields.length > 0 ? (
              <div className="space-y-4">
                {commonNonFileFields.length > 0 ? <div className="border-t border-app-border" /> : null}
                <p className="text-xs font-semibold uppercase tracking-wider text-app-subtle">
                  {t(lang, 'roleSpecificInfo')}
                </p>
                {roleNonFileFields.map((field) => (
                  <FormFieldRenderer
                    key={field.id}
                    field={field}
                    lang={lang}
                    value={fieldValues[field.id]}
                    file={null}
                    errorKey={fieldErrors[field.id] ?? null}
                    disabled={submitting}
                    onChangeValue={(next) => setFieldValue(field.id, next)}
                    onChangeFile={() => {}}
                  />
                ))}
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        {/* Documents */}
        <SectionCard icon={FileText} title={t(lang, 'documents')}>
          <p className="text-xs text-app-secondary">{t(lang, 'uploadHint')}</p>

          <FileUploadField
            id="resume"
            label={t(lang, 'resume')}
            lang={lang}
            file={resume}
            required
            errorKey={resumeError}
            disabled={submitting}
            onChange={(file, errKey) => {
              setResume(file)
              setResumeError(errKey)
            }}
          />

          {idProofField ? (
            <FormFieldRenderer
              key={idProofField.id}
              field={{ ...idProofField, label: t(lang, 'idProof') }}
              lang={lang}
              value={undefined}
              file={fieldFiles[idProofField.id] ?? null}
              errorKey={fieldErrors[idProofField.id] ?? null}
              disabled={submitting}
              onChangeValue={() => {}}
              onChangeFile={(file, err) => setFieldFile(idProofField.id, file, err)}
            />
          ) : null}

          {certificateField ? (
            <FormFieldRenderer
              key={certificateField.id}
              field={{ ...certificateField, label: t(lang, 'certificate') }}
              lang={lang}
              value={undefined}
              file={fieldFiles[certificateField.id] ?? null}
              errorKey={fieldErrors[certificateField.id] ?? null}
              disabled={submitting}
              onChangeValue={() => {}}
              onChangeFile={(file, err) => setFieldFile(certificateField.id, file, err)}
            />
          ) : null}

          {otherFileFields.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-app-secondary">
                {t(lang, 'otherDocs')} ({otherDocsUploaded}/{otherFileFields.length})
              </p>
              {otherFileFields.map((field) => (
                <FormFieldRenderer
                  key={field.id}
                  field={field}
                  lang={lang}
                  value={undefined}
                  file={fieldFiles[field.id] ?? null}
                  errorKey={fieldErrors[field.id] ?? null}
                  disabled={submitting}
                  onChangeValue={() => {}}
                  onChangeFile={(file, err) => setFieldFile(field.id, file, err)}
                />
              ))}
            </div>
          ) : null}
        </SectionCard>

        {/* Submit */}
        <div className="flex justify-center pb-8">
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="w-full sm:w-60"
          >
            {submitting ? t(lang, 'submitting') : t(lang, 'submit')}
          </Button>
        </div>
      </div>
    </PublicApplyLayout>
  )
}
