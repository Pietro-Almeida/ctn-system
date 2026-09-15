const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface NewsItem {
  id: number
  titulo: string
  conteudo: string
  categoria: string
  authorId: number
  authorName: string
  createdAt: string
  updatedAt: string
}

function isNewsItem(value: unknown): value is NewsItem {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<NewsItem>
  return (
    typeof item.id === 'number' &&
    typeof item.titulo === 'string' &&
    typeof item.conteudo === 'string' &&
    typeof item.categoria === 'string' &&
    typeof item.createdAt === 'string'
  )
}

export async function listNews(token: string, signal?: AbortSignal) {
  const response = await fetch(`${API_URL}/news?page=1&limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })

  if (!response.ok) {
    if (response.status === 401) throw new Error('Sua sessão expirou')
    throw new Error('Não foi possível carregar o Jornal')
  }

  const data: unknown = await response.json()
  if (!Array.isArray(data)) throw new Error('O Jornal retornou dados inválidos')
  return data.filter(isNewsItem)
}
