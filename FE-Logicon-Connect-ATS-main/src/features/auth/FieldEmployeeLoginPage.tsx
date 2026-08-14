import React, { useState } from 'react'
import { obtainFieldEmployeeToken } from '@/api/auth'
import { useAuthStore } from './authStore'


export const FieldEmployeeLoginPage: React.FC = () => {
  const [orgId, setOrgId] = useState<string>('1')
  const [employeeCode, setEmployeeCode] = useState<string>('')
  const [pin, setPin] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [accessRevoked, setAccessRevoked] = useState<boolean>(false)

  const setTokens = useAuthStore((state) => state.setTokens)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setAccessRevoked(false)

    if (!employeeCode.trim()) {
      setError('Please enter your Employee Code.')
      return
    }
    if (!pin.trim() || pin.length < 6 || !/^\d+$/.test(pin)) {
      setError('PIN must be a 6-digit number.')
      return
    }

    setLoading(true)
    try {
      const pair = await obtainFieldEmployeeToken({
        org_id: parseInt(orgId, 10) || 1,
        employee_code: employeeCode.trim(),
        pin: pin.trim(),
      })
      setTokens(pair.access, pair.refresh)
      // Redirect to FieldSense PWA with 60-second single-use opaque code (no raw JWT in URL)
      const fieldSensesUrl = import.meta.env.VITE_FIELD_SENSES_URL || 'http://localhost:8080'
      const handoffCode = (pair as any).code || pair.access
      window.location.href = `${fieldSensesUrl.replace(/\/$/, '')}/handoff?code=${encodeURIComponent(handoffCode)}`



    } catch (err: any) {
      setLoading(false)
      const detail = err?.response?.data?.non_field_errors?.[0] || err?.response?.data?.detail
      if (detail && detail.includes('No active deployment')) {
        setAccessRevoked(true)
        setError('Access Revoked: No active deployment found for this employee. Please contact your Site Supervisor.')
      } else if (detail && detail.includes('locked')) {
        setError('Account Locked: Multiple failed PIN attempts. Please contact HR to reset your PIN.')
      } else {
        setError(detail || 'Failed to authenticate. Please check your credentials and try again.')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-8 text-white">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-600/20 text-blue-400 mb-2">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457-.39-2.823-1.07-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">FieldSense Mobile Login</h1>
          <p className="text-sm text-slate-400">Enter your Employee Code and 6-digit PIN</p>
        </div>

        {error && (
          <div className={`p-4 rounded-lg text-sm ${
            error.includes('Account Locked')
              ? 'bg-red-500/20 border border-red-500/50 text-red-300 font-semibold'
              : accessRevoked
              ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
              : 'bg-red-500/20 border border-red-500/50 text-red-300'
          }`}>
            <p className="font-medium">{error}</p>
          </div>
        )}


        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Organization ID
            </label>
            <input
              type="number"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Employee Code
            </label>
            <input
              type="text"
              placeholder="e.g. EMP-1001"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition uppercase tracking-wider"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              6-Digit Security PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-center text-xl tracking-widest focus:outline-none focus:border-blue-500 transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium rounded-lg shadow transition disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <span>Sign In to FieldSense</span>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          FieldSense Multi-Tenant Worker Portal • Version 2.0
        </div>
      </div>
    </div>
  )
}
