export type UserRole =
  | 'ALUNO'
  | 'PROFESSOR'
  | 'DIRECAO'
  | 'COORDENACAO'
  | 'SOE'

export interface AuthUser {
  id: number
  nome: string
  email: string
  role: UserRole
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'
