import { FormEvent, useState } from 'react'
import './LoginPage.css'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <main className="login-page">
      <section className="login-intro" aria-label="Apresentação do CTN System">
        <div className="ctn-logo ctn-logo--light" aria-label="CTN">
          CTN<span />
        </div>

        <div className="login-intro__content">
          <p className="login-eyebrow">CEMTN · TAGUATINGA NORTE</p>
          <h1>
            Informação que aproxima.
            <br />
            Educação que transforma.
          </h1>
          <p className="login-intro__description">
            Um ambiente único para acompanhar notícias, participar das
            comunidades e viver o dia a dia da escola.
          </p>
        </div>

        <p className="login-intro__footer">
          Centro de Ensino Médio de Taguatinga Norte
        </p>
      </section>

      <section className="login-access" aria-labelledby="login-title">
        <div className="login-card">
          <div className="login-mobile-brand">
            <div className="ctn-logo" aria-label="CTN">
              CTN<span />
            </div>
            <strong>CTN System</strong>
          </div>

          <p className="login-eyebrow">BEM-VINDO DE VOLTA</p>
          <h2 id="login-title">Acesse sua conta</h2>
          <p className="login-card__subtitle">
            Entre com seus dados institucionais.
          </p>

          <form onSubmit={handleSubmit}>
            <label className="form-field">
              <span>E-mail institucional</span>
              <div className="input-wrapper">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="nome@cemtn.edu.br"
                  required
                />
              </div>
            </label>

            <label className="form-field">
              <span>Senha</span>
              <div className="input-wrapper">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5" y="10" width="14" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                </button>
              </div>
            </label>

            <div className="login-options">
              <label className="remember-option">
                <input type="checkbox" name="remember" />
                <span>Lembrar de mim</span>
              </label>

              <button className="forgot-password" type="button">
                Esqueci minha senha
              </button>
            </div>

            <button className="login-submit" type="submit">
              Entrar
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </form>

          <div className="school-signature">
            <span />
            <p>CEMTN · Taguatinga Norte</p>
            <span />
          </div>

          <p className="login-help">
            Problemas para acessar? Procure a secretaria da escola.
          </p>
        </div>
      </section>
    </main>
  )
}
