export async function validateSessionResponse<T>(
  url: string,
  token: string,
  signal: AbortSignal,
  isUser: (value: unknown) => value is T,
): Promise<T | null> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })
  if (response.status === 401) return null
  if (!response.ok) throw new Error('Serviço temporariamente indisponível')
  const user: unknown = await response.json()
  if (!isUser(user)) throw new Error('Resposta de sessão inválida')
  return user
}
