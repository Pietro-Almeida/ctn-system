const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface StudentRegistrationInput {
  nome: string
  cpf: string
  senha: string
}

export async function registerStudent(input: StudentRegistrationInput) {
  const response = await fetch(`${API_URL}/auth/register/student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  const data = await response.json().catch(() => null) as { message?: string | string[] } | null
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data?.message[0] : data?.message
    throw new Error(message || 'Não foi possível enviar seu cadastro')
  }

  return data as { message: string }
}
