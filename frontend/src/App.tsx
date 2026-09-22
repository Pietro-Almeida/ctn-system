import { BrowserRouter } from 'react-router-dom'
import AuthProvider from './auth/AuthProvider'
import AppRoutes from './routes/AppRoutes'
import './routes/routes.css'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
