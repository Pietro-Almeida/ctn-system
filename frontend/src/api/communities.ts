const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface CommunitySummary {
  id: number
  nome: string
  descricao: string
  regras: string
  creatorId: number
  creatorName: string
  participating: boolean
  memberCount: number
  postCount: number
  createdAt: string
  updatedAt: string
}

function asNumber(value: unknown) {
  return typeof value === 'number' ? value : Number(value)
}

function isCommunity(value: unknown): value is CommunitySummary {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<CommunitySummary>
  return (
    typeof item.id === 'number' &&
    typeof item.nome === 'string' &&
    typeof item.descricao === 'string' &&
    typeof item.creatorName === 'string' &&
    typeof item.participating === 'boolean' &&
    Number.isFinite(asNumber(item.memberCount)) &&
    Number.isFinite(asNumber(item.postCount))
  )
}

function normalizeCommunity(item: CommunitySummary): CommunitySummary {
  return {
    ...item,
    memberCount: asNumber(item.memberCount),
    postCount: asNumber(item.postCount),
  }
}

async function request(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  })

  if (response.status === 401) throw new Error('Sua sessão expirou')
  if (!response.ok) throw new Error('Não foi possível concluir esta ação')
  return response
}

export async function listCommunities(token: string, signal?: AbortSignal) {
  const response = await request('/communities?page=1&limit=100', token, { signal })
  const data: unknown = await response.json()
  if (!Array.isArray(data)) throw new Error('As comunidades retornaram dados inválidos')
  return data.filter(isCommunity).map(normalizeCommunity)
}

export async function joinCommunity(id: number, token: string) {
  await request(`/communities/${id}/members/me`, token, { method: 'POST' })
}
