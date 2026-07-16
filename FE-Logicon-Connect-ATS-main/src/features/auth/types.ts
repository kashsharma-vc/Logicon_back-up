export type AuthErrorCode = 'invalid' | 'network' | 'unknown'

export interface AuthError {
  code: AuthErrorCode
  message: string
}




