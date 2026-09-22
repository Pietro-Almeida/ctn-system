export type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'cemtn:theme'
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

function readSavedTheme(): Theme | null {
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    return savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : null
  } catch {
    return null
  }
}

export function getPreferredTheme(): Theme {
  const savedTheme = readSavedTheme()
  if (savedTheme) return savedTheme
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export function initializeTheme() {
  applyTheme(getPreferredTheme())
}

export function saveTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // O tema continua válido para a sessão mesmo sem armazenamento disponível.
  }
  applyTheme(theme)
}
