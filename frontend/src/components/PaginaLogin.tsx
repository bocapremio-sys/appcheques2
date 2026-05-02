import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function PaginaLogin() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    const erroMsg = await signIn(email, senha)
    if (erroMsg) setErro(erroMsg)
    setCarregando(false)
  }

  return (
    <div
      className="min-h-dvh flex"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      {/* Painel lateral — visível em desktop */}
      <div
        className="hidden lg:flex flex-col justify-between w-80 shrink-0 p-10"
        style={{
          backgroundColor: 'var(--bg-raised)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center mb-10"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <span className="text-white text-xs font-bold tracking-wide">AB</span>
          </div>
          <p className="text-lg font-semibold leading-snug mb-2" style={{ color: 'var(--text-primary)' }}>
            App Boca
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Controle de cheques em custódia com cálculo automático de juros e gestão completa do ciclo de vida.
          </p>
        </div>

        <div style={{ color: 'var(--text-faint)', fontSize: '11px' }}>
          Acesso restrito a usuários autorizados.
        </div>
      </div>

      {/* Área de login */}
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-xs">

          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <span className="text-white text-xs font-bold">AB</span>
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>App Boca</span>
          </div>

          <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Entrar
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            Use suas credenciais de acesso.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="label">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                className="input"
                placeholder="usuario@empresa.com"
              />
            </div>

            <div>
              <label htmlFor="senha" className="label">Senha</label>
              <div className="relative">
                <input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
                  tabIndex={-1}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrarSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {erro && (
              <p
                className="text-xs rounded-lg px-3 py-2.5"
                style={{
                  backgroundColor: 'var(--danger-dim)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger)',
                }}
                role="alert"
              >
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={carregando || !email || !senha}
              className="btn-primary w-full justify-center mt-1"
              style={{ height: '40px', fontSize: '14px' }}
            >
              {carregando ? 'Verificando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
