import { api } from '@/api/client'
import type { TokenPair } from '@/types/api'

export interface LoginPayload {
  email: string
  password: string
}

export async function obtainTokenPair(email: string, password: string): Promise<TokenPair> {
  const payload: LoginPayload = { email, password }
  const { data } = await api.post<TokenPair>('/api/token/', payload)
  return data
}

export async function refreshTokenPair(refresh: string): Promise<TokenPair> {
  const { data } = await api.post<TokenPair>('/api/token/refresh/', { refresh })
  return data
}

export interface SetPasswordPayload {
  uid: string
  token: string
  password: string
  confirm_password: string
}

export async function setPassword(payload: SetPasswordPayload): Promise<{ detail: string }> {
  const { data } = await api.post<{ detail: string }>('/api/accounts/set-password/', payload)
  return data
}

export async function logoutApi(): Promise<{ detail: string }> {
  const { data } = await api.post<{ detail: string }>('/api/accounts/logout/')
  return data
}

export interface FieldEmployeeLoginPayload {
  org_id: number
  employee_code: string
  pin: string
}

export async function obtainFieldEmployeeToken(payload: FieldEmployeeLoginPayload): Promise<TokenPair> {
  const { data } = await api.post<TokenPair>('/api/field-employee-token/', payload)
  return data
}


