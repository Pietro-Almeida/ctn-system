const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface NewsItem {
  id: number
  titulo: string
  conteudo: string
  categoria: string
  capa?: string | null
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

async function readResponse(response: Response, fallbackMessage: string) {
  if (!response.ok) {
    if (response.status === 401) throw new Error('Sua sessão expirou')
    if (response.status === 404) throw new Error('Notícia não encontrada')
    throw new Error(fallbackMessage)
  }
  if (response.status === 204) return null
  return response.json() as Promise<unknown>
}

export async function listNews(token: string, signal?: AbortSignal) {
  const items = new Map<number, NewsItem>()
  for (let page = 1; ; page += 1) {
    const response = await fetch(`${API_URL}/news?page=${page}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    })
    const data = await readResponse(response, 'Não foi possível carregar o Jornal')
    if (!Array.isArray(data)) throw new Error('O Jornal retornou dados inválidos')
    for (const item of data.filter(isNewsItem)) items.set(item.id, item)
    if (data.length < 100) return [...items.values()]
  }
}

export async function getNews(id: number, token: string, signal?: AbortSignal) {
  const response = await fetch(`${API_URL}/news/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })

  const data = await readResponse(response, 'Não foi possível carregar a notícia')
  if (!isNewsItem(data)) throw new Error('A notícia retornou dados inválidos')
  return data
}

export async function createNews(input: { titulo: string; conteudo: string; categoria: string; capa?: string }, token: string) {
  const response = await fetch(`${API_URL}/news`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await readResponse(response, 'Não foi possível publicar a notícia')
  if (!isNewsItem(data)) throw new Error('A notícia retornou dados inválidos')
  return data
}


export async function updateNews(id: number, input: { titulo: string; conteudo: string; categoria: string; capa?: string }, token: string) {
  const response = await fetch(`${API_URL}/news/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await readResponse(response, 'Não foi possível atualizar a notícia')
  if (!isNewsItem(data)) throw new Error('A notícia retornou dados inválidos')
  return data
}

export async function deleteNews(id: number, token: string) {
  const response = await fetch(`${API_URL}/news/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  await readResponse(response, 'Não foi possível excluir a notícia')
}
