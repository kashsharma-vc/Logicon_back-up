import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Upload,
  User,
  Wrench,
  X,
} from 'lucide-react'
import { manualResumeIntake } from '@/api/talent'
import { parseApiError } from '@/lib/apiError'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { ManualResumeIntakeResponse } from '@/features/talent/types'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FormSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-app-border bg-gradient-to-b from-app-muted/30 to-app-surface p-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-app-heading">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function TextArea({
  id,
  label,
  value,
  onChange,
  rows,
  placeholder,
  icon,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  rows: number
  placeholder?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-app-secondary">
        {icon && <span className="text-app-subtle">{icon}</span>}
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[3rem] w-full resize-y rounded-xl border border-app-border bg-app-surface px-4 py-3 text-sm text-app-text shadow-sm transition-all placeholder:text-app-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
    </div>
  )
}

export function ManualResumeIntakeDrawer({
  open,
  onClose,
  defaultMrfId,
  defaultMrfLineItemId,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  defaultMrfId?: number | null
  defaultMrfLineItemId?: number | null
  onSuccess?: (res: ManualResumeIntakeResponse) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<ManualResumeIntakeResponse | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState('manual')
  const [currentRole, setCurrentRole] = useState('')
  const [collarType, setCollarType] = useState('')
  const [billingType, setBillingType] = useState('')
  const [currentLocation, setCurrentLocation] = useState('')
  const [totalExp, setTotalExp] = useState('')
  const [skills, setSkills] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const reset = useCallback(() => {
    setError(null)
    setDone(null)
    setFirstName('')
    setMiddleName('')
    setLastName('')
    setPhone('')
    setEmail('')
    setSource('manual')
    setCurrentRole('')
    setCollarType('')
    setBillingType('')
    setCurrentLocation('')
    setTotalExp('')
    setSkills('')
    setFile(null)
  }, [])

  useEffect(() => {
    if (!open) return
    reset()
    setCurrentRole('Housekeeping Associate')
    setCurrentLocation('Mumbai')
    setTotalExp('2')
    setSkills('housekeeping, cleaning, floor care')
  }, [open, reset])

  const linkedToDemand =
    defaultMrfLineItemId != null && defaultMrfLineItemId > 0

  async function submit() {
    setBusy(true)
    setError(null)
    setDone(null)
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError('First name, last name, and phone are required.')
      setBusy(false)
      return
    }
    if (!file) {
      setError('Please attach a resume file.')
      setBusy(false)
      return
    }
    const fd = new FormData()
    fd.append('first_name', firstName.trim())
    fd.append('middle_name', middleName.trim())
    fd.append('last_name', lastName.trim())
    fd.append('phone', phone.trim())
    fd.append('email', email.trim())
    fd.append('source', source)
    fd.append('current_role', currentRole.trim())
    if (collarType) fd.append('collar_type', collarType)
    if (billingType) fd.append('billing_type', billingType)
    fd.append('current_location', currentLocation.trim())
    if (totalExp.trim()) fd.append('total_experience_years', totalExp.trim())
    fd.append('skills', skills.trim())
    fd.append('resume_file', file)
    if (defaultMrfId != null && defaultMrfId > 0) fd.append('mrf', String(defaultMrfId))
    if (defaultMrfLineItemId != null && defaultMrfLineItemId > 0) fd.append('mrf_line_item', String(defaultMrfLineItemId))

    try {
      const res = await manualResumeIntake(fd)
      setDone(res)
      onSuccess?.(res)
    } catch (e: unknown) {
      setError(parseApiError(e, 'Could not save candidate').message)
    } finally {
      setBusy(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files).find((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase()
      return ext === 'pdf' || ext === 'doc' || ext === 'docx'
    })
    if (dropped) setFile(dropped)
  }

  const drawerTitle = linkedToDemand ? 'Add candidate' : 'Add to resume pool'
  const drawerDescription = linkedToDemand
    ? 'Capture profile details and attach a resume. This creates the candidate and opens an application.'
    : 'Upload a resume and tag the candidate so they can be found later.'

  return (
    <Drawer
      open={open}
      onClose={() => !busy && onClose()}
      title={drawerTitle}
      description={drawerDescription}
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy} className="min-h-11 rounded-xl px-5">
            {done ? 'Close' : 'Cancel'}
          </Button>
          {!done && (
            <Button type="button" onClick={() => void submit()} disabled={busy} className="min-h-11 gap-2 rounded-xl px-6">
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Add Candidate'
              )}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {error && <ErrorState message={error} />}

        {done ? (
          <div className="overflow-hidden rounded-2xl border border-status-hired/30 bg-gradient-to-br from-status-hired/5 to-app-surface">
            <div className="flex items-center gap-4 border-b border-status-hired/20 bg-status-hired/10 p-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-status-hired text-white shadow-lg shadow-status-hired/30">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-status-hired">
                  {done.hiring_application ? 'Candidate Added!' : 'Added to Pool!'}
                </h3>
                <p className="text-sm text-app-secondary">
                  {done.hiring_application
                    ? 'The candidate profile and application have been created.'
                    : 'The candidate has been added to your resume pool.'}
                </p>
              </div>
            </div>
            <div className="space-y-3 p-5">
              <Link
                to={`/candidates/${done.candidate.id}`}
                className="flex items-center justify-between rounded-xl border border-app-border bg-app-surface p-4 transition-all hover:border-brand-400 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-app-text">View Candidate Profile</p>
                    <p className="text-xs text-app-subtle">See full details and resume</p>
                  </div>
                </div>
                <ExternalLink className="h-5 w-5 text-app-subtle" />
              </Link>

              {done.hiring_application && (
                <Link
                  to={`/hiring/applications/${done.hiring_application.id}`}
                  className="flex items-center justify-between rounded-xl border border-app-border bg-app-surface p-4 transition-all hover:border-brand-400 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-info/10 text-status-info">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-app-text">Open Application</p>
                      <p className="text-xs text-app-subtle">Track hiring progress</p>
                    </div>
                  </div>
                  <ExternalLink className="h-5 w-5 text-app-subtle" />
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Personal Information */}
            <FormSection icon={<User className="h-4 w-4" />} title="Personal Information">
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  id="mri_fn"
                  label="First name *"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                />
                <Input
                  id="mri_mn"
                  label="Middle name"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="(optional)"
                />
                <Input
                  id="mri_ln"
                  label="Last name *"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input
                  id="mri_phone"
                  label="Phone *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
                <Input
                  id="mri_email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.doe@example.com"
                />
                <Select
                  id="mri_source"
                  label="Source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  <option value="manual">Manual</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="naukri">Naukri</option>
                  <option value="referral">Reference</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="portal">Portal</option>
                  <option value="other">Other</option>
                </Select>
              </div>
            </FormSection>

            {/* Professional Details */}
            <FormSection icon={<Briefcase className="h-4 w-4" />} title="Professional Details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="mri_role"
                  label="Current role"
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value)}
                  placeholder="e.g. Housekeeping Associate"
                />
                <Select
                  id="mri_collar_type"
                  label="Collar type"
                  value={collarType}
                  onChange={(e) => setCollarType(e.target.value)}
                >
                  <option value="">Select collar type</option>
                  <option value="white_collar">White Collar</option>
                  <option value="blue_collar">Blue Collar</option>
                </Select>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Select
                  id="mri_billing_type"
                  label="Billing type"
                  value={billingType}
                  onChange={(e) => setBillingType(e.target.value)}
                >
                  <option value="">Select billing type</option>
                  <option value="billable">Billable</option>
                  <option value="non_billable">Non-billable</option>
                </Select>
                <Input
                  id="mri_exp"
                  label="Experience (years)"
                  type="number"
                  value={totalExp}
                  onChange={(e) => setTotalExp(e.target.value)}
                  placeholder="e.g. 2"
                />
                <Input
                  id="mri_loc"
                  label="Current location"
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  placeholder="e.g. Mumbai"
                />
              </div>
              <div className="mt-4">
                <TextArea
                  id="mri_skills"
                  label="Skills"
                  icon={<Wrench className="h-3.5 w-3.5" />}
                  rows={2}
                  value={skills}
                  onChange={setSkills}
                  placeholder="Enter skills separated by commas (e.g. housekeeping, cleaning, floor care)"
                />
              </div>
            </FormSection>

            {/* Resume Upload */}
            <FormSection icon={<FileText className="h-4 w-4" />} title="Resume Upload">
              {!file ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  className={cn(
                    'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all',
                    dragOver
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20'
                      : 'border-app-border bg-app-muted/30 hover:border-brand-400 hover:bg-app-muted/50',
                  )}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="sr-only"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <div
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-xl transition-colors',
                      dragOver ? 'bg-brand-100 text-brand-600' : 'bg-app-muted text-app-subtle',
                    )}
                  >
                    <Upload className="h-7 w-7" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-app-text">
                    {dragOver ? 'Drop resume here' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="mt-1 text-xs text-app-subtle">PDF, DOC, or DOCX (max 10MB)</p>
                </div>
              ) : (
                <div className="flex items-center gap-4 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-950/20">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-app-text">{file.name}</p>
                    <p className="text-xs text-app-subtle">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-app-subtle transition-colors hover:bg-status-danger/10 hover:text-status-danger"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
            </FormSection>

            {/* Link info */}
            {defaultMrfLineItemId && (
              <div className="rounded-xl border border-status-info/30 bg-status-info/5 p-4">
                <p className="text-sm text-status-info">
                  This intake is linked to hiring demand (MRF line #{defaultMrfLineItemId}).
                  An application will be created automatically.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Drawer>
  )
}
