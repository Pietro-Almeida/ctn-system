const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export type CreateUserRole = 'ALUNO' | 'PROFESSOR' | 'DIRECAO'

export interface SystemUser {
  id: number
  nome: string
  email: string
  ativo: boolean
  roleId: number
  role: string
  createdAt: string
  updatedAt: string
}

export interface CreateUserInput {
  nome: string
  email: string
  senha: string
  role: CreateUserRole
}

function isSystemUser(value: unknown): value is SystemUser {
  if (!value || typeof value !== 'object') return false
  const user = value as Partial<SystemUser>
  return typeof user.id === 'number' && typeof user.nome === 'string' && typeof user.email === 'string' && typeof user.ativo === 'boolean' && typeof user.role === 'string'
}

async function readResponse(response: Response, fallback: string) {
  if (!response.ok) {
    if (response.status === 401) throw new Error('Sua sessão expirou')
    if (response.status === 403) throw new Error('Apenas a Direção pode acessar os usuários')
    const data = await response.json().catch(() => null) as { message?: string | string[] } | null
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message
    throw new Error(message || fallback)
  }
  if (response.status === 204) return null
  return response.json() as Promise<unknown>
}

export async function listUsers(token: string, signal?: AbortSignal) {
  const response = await fetch(`${API_URL}/users?page=1&limit=100`, { headers: { Authorization: `Bearer ${token}` }, signal })
  const data = await readResponse(response, 'Não foi possível carregar os usuários')
  if (!Array.isArray(data)) throw new Error('Os usuários retornaram dados inválidos')
  return data.filter(isSystemUser)
}

export async function createUser(input: CreateUserInput, token: string) {
  const response = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await readResponse(response, 'Não foi possível cadastrar o usuário')
  if (!isSystemUser(data)) throw new Error('O usuário retornou dados inválidos')
  return data
}

export async function updateUserStatus(id: number, ativo: boolean, token: string) {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ativo }),
  })
  const data = await readResponse(response, 'Não foi possível alterar a situação do usuário')
  if (!isSystemUser(data)) throw new Error('O usuário retornou dados inválidos')
  return data
}
