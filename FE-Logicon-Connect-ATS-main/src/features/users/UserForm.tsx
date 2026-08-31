import { useMemo, useState, type FormEvent } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ErrorState } from '@/components/ui/ErrorState'
import { userTypeLabel, type UserType } from '@/features/users/types'
import { listDepartments, departmentToFormOption, type DepartmentOption } from '@/api/departments'
import { useEffect } from 'react'

export type UserFormMode = 'create' | 'edit'

export interface UserFormValues {
  username: string
  email: string
  first_name: string
  last_name: string
  phone_number: string
  employee_code: string
  user_type: UserType
  is_active: boolean
  is_invited: boolean
  department: number | null
  password: string
}

export interface UserFormProps {
  mode: UserFormMode
  formId?: string
  initialValues?: Partial<UserFormValues>
  submitting?: boolean
  errorMessage?: string | null
  fieldErrors?: Partial<Record<keyof UserFormValues, string>>
  onSubmit: (values: UserFormValues) => void | Promise<void>
}

function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required for the invite link.'
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  return ok ? null : 'Enter a valid email address.'
}

export function UserForm({
  mode,
  formId,
  initialValues,
  submitting,
  errorMessage,
  fieldErrors = {},
  onSubmit,
}: UserFormProps) {
  const [values, setValues] = useState<UserFormValues>(() => ({
    username: initialValues?.username ?? '',
    email: initialValues?.email ?? '',
    first_name: initialValues?.first_name ?? '',
    last_name: initialValues?.last_name ?? '',
    phone_number: initialValues?.phone_number ?? '',
    employee_code: initialValues?.employee_code ?? '',
    user_type: (initialValues?.user_type as UserType) ?? 'internal',
    department: initialValues?.department ?? null,
    is_active: initialValues?.is_active ?? true,
    is_invited: initialValues?.is_invited ?? false,
    password: '',
  }))

  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [loadingDepts, setLoadingDepts] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadingDepts(true)
    listDepartments({ is_active: true, page: 1 })
      .then((res) => {
        if (!cancelled) {
          setDepartments(res.items.map(departmentToFormOption))
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingDepts(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const emailError = useMemo(() => validateEmail(values.email), [values.email])
  const usernameError = useMemo(() => {
    if (mode === 'edit') return null
    return values.username.trim() ? null : 'Username is required.'
  }, [mode, values.username])

  const canSubmit =
    !submitting &&
    !emailError &&
    !usernameError &&
    (mode === 'edit' || values.username.trim().length > 0)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    await onSubmit(values)
  }


  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      {mode === 'create' ? (
        <Input
          id="username"
          name="username"
          label="Username"
          value={values.username}
          onChange={(e) => setValues((v) => ({ ...v, username: e.target.value }))}
          error={usernameError ?? fieldErrors.username}
          required
          disabled={submitting}
        />
      ) : (
        <div className="rounded-panel border border-app-border bg-app-muted p-3 text-sm">
          <p className="text-app-subtle">Username</p>
          <p className="mt-1 font-medium text-app-text">{values.username}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="first_name"
          name="first_name"
          label="First name"
          value={values.first_name}
          onChange={(e) => setValues((v) => ({ ...v, first_name: e.target.value }))}
          error={fieldErrors.first_name}
          disabled={submitting}
        />
        <Input
          id="last_name"
          name="last_name"
          label="Last name"
          value={values.last_name}
          onChange={(e) => setValues((v) => ({ ...v, last_name: e.target.value }))}
          error={fieldErrors.last_name}
          disabled={submitting}
        />
      </div>

      <Input
        id="email"
        name="email"
        label="Email"
        value={values.email}
        onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        error={emailError ?? fieldErrors.email}
        disabled={submitting}
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="phone_number"
          name="phone_number"
          label="Phone"
          value={values.phone_number}
          onChange={(e) => setValues((v) => ({ ...v, phone_number: e.target.value }))}
          error={fieldErrors.phone_number}
          disabled={submitting}
        />
        <Input
          id="employee_code"
          name="employee_code"
          label="Employee code"
          value={values.employee_code}
          onChange={(e) => setValues((v) => ({ ...v, employee_code: e.target.value }))}
          error={fieldErrors.employee_code}
          disabled={submitting}
        />
      </div>

      <Select
        id="user_type"
        name="user_type"
        label="User type"
        value={values.user_type}
        onChange={(e) => setValues((v) => ({ ...v, user_type: e.target.value as UserType }))}
        disabled={submitting}
      >
        <option value="internal">{userTypeLabel('internal')}</option>
        <option value="client">{userTypeLabel('client')}</option>
        <option value="field">{userTypeLabel('field')}</option>
      </Select>
      {fieldErrors.user_type ? <p className="text-sm text-status-danger">{fieldErrors.user_type}</p> : null}

      {values.user_type === 'internal' && (
        <Select
          id="department"
          name="department"
          label="Department"
          value={values.department === null ? '' : String(values.department)}
          onChange={(e) => setValues((v) => ({ ...v, department: e.target.value ? Number(e.target.value) : null }))}
          disabled={submitting || loadingDepts}
        >
          <option value="">-- No Department --</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label} {d.scopeLabel && d.scopeLabel !== 'Org' ? `[${d.scopeLabel}]` : ''}
            </option>
          ))}
        </Select>
      )}
      {fieldErrors.department ? <p className="text-sm text-status-danger">{fieldErrors.department}</p> : null}

      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input
            type="checkbox"
            checked={values.is_active}
            onChange={(e) => setValues((v) => ({ ...v, is_active: e.target.checked }))}
            disabled={submitting}
          />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input
            type="checkbox"
            checked={values.is_invited}
            onChange={(e) => setValues((v) => ({ ...v, is_invited: e.target.checked }))}
            disabled={submitting}
          />
          Invited
        </label>
      </div>

      {mode === 'create' ? (
        <div className="rounded-panel border border-app-border bg-app-muted p-3 text-sm">
          <p className="text-app-subtle">Password Setup</p>
          <p className="mt-1 text-app-secondary">
            An invite email will be automatically sent to the user's email address with a secure link to set their password.
          </p>
        </div>
      ) : (
        <div className="rounded-panel border border-app-border bg-app-muted p-3 text-sm">
          <p className="text-app-subtle">Password</p>
          <p className="mt-1 text-app-secondary">
            Password cannot be viewed here. Use an admin reset flow to change it.
          </p>
        </div>
      )}

      <div className="rounded-panel border border-app-border bg-app-muted p-3 text-sm">
        <p className="text-app-subtle">Tip</p>
        <p className="mt-1 text-app-secondary">
          User type is required by the backend. Current selection:{' '}
          <Badge variant="neutral" className="ml-1">
            {userTypeLabel(values.user_type)}
          </Badge>
        </p>
      </div>

      <button type="submit" hidden />
    </form>
  )
}




