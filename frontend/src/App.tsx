import { useState, useMemo } from 'react'
import { LayoutDashboard, FileText, Plus, Menu, X, LogOut, XCircle, BarChart2 } from 'lucide-react'
import type { Cheque } from './types/cheque'
import { Dashboard } from './pages/Dashboard'
import { ListaCheques } from './pages/ListaCheques'
import { Devolvidos } from './pages/Devolvidos'
import { Relatorios } from './pages/Relatorios'
import { FormularioCheque } from './components/FormularioCheque'
import { FormularioEdicaoCheque } from './components/FormularioEdicaoCheque'
import { DetalheCheque } from './components/DetalheCheque'
import { PaginaLogin } from './components/PaginaLogin'
import { BotaoNotificacoes } from './components/PainelNotificacoes'
import { useCheques } from './hooks/useCheques'
import { useNotificacoes } from './hooks/useNotificacoes'
import { useAuth } from './contexts/AuthContext'
import { calcularMetricasDashboard } from './utils/dashboardService'

type Aba = 'dashboard' | 'cheques' | 'devolvidos' | 'relatorios'

const NAV_ITEMS: { id: Aba; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'cheques', label: 'Cheques', icon: FileText },
  { id: 'devolvidos', label: 'Devolvidos', icon: XCircle },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart2 },
]

export default function App() {
  const { session, isLoading: authLoading, signOut } = useAuth()

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!session) return <PaginaLogin />

  return <AppAutenticado signOut={signOut} />
}

function AppAutenticado({ signOut }: { signOut: () => Promise<void> }) {
  const [abaAtiva, setAbaAtiva] = useState<Aba>('dashboard')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [chequeDetalhado, setChequeDetalhado] = useState<Cheque | null>(null)
  const [chequeEditando, setChequeEditando] = useState<Cheque | null>(null)
  const [menuMobileAberto, setMenuMobileAberto] = useState(false)

  const { cheques, emitentes, adicionarCheque, editarCheque, atualizarStatus, salvarEmitente } = useCheques()
  const metrics = useMemo(() => calcularMetricasDashboard(cheques), [cheques])
  const notificacoes = useNotificacoes(cheques)

  const handleSubmitCheque = async (dados: Parameters<typeof adicionarCheque>[0]) => {
    await adicionarCheque(dados)
    void salvarEmitente({
      nome: dados.emitente,
      cpf_cnpj: dados.cpf_cnpj,
      banco: dados.banco,
      agencia: dados.agencia,
      conta: dados.conta,
      taxa_juros_mes: dados.taxa_juros_mes,
    })
    setMostrarFormulario(false)
  }

  const handleNavClick = (id: Aba) => {
    setAbaAtiva(id)
    setMenuMobileAberto(false)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-base)' }}>

      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{
          backgroundColor: 'var(--bg-raised)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: 'var(--accent)',
                boxShadow: '0 0 14px var(--accent-dim)',
              }}
            >
              <span className="text-white text-xs font-bold">AB</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
                App Boca
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Gestão de Cheques
              </p>
            </div>
          </div>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleNavClick(id)}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg font-medium transition-all duration-150 ease-out"
                style={
                  abaAtiva === id
                    ? {
                        backgroundColor: 'var(--accent-dim)',
                        color: 'var(--accent)',
                        border: '1px solid var(--accent-border)',
                      }
                    : {
                        color: 'var(--text-muted)',
                        border: '1px solid transparent',
                      }
                }
                onMouseEnter={(e) => {
                  if (abaAtiva !== id) {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
                    ;(e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      'var(--border-subtle)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (abaAtiva !== id) {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
                    ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                  }
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <BotaoNotificacoes
              notificacoes={notificacoes}
              onVerCheque={(cheque) => { setChequeDetalhado(cheque); setMenuMobileAberto(false) }}
            />
            <button
              onClick={() => void signOut()}
              className="p-2 rounded-lg transition-colors duration-150"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border-subtle)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
              }}
              aria-label="Sair"
              title="Sair"
            >
              <LogOut size={16} />
            </button>
            <button
              onClick={() => setMostrarFormulario(true)}
              className="btn-primary"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Novo Cheque</span>
            </button>

            {/* Menu mobile */}
            <button
              onClick={() => setMenuMobileAberto((v) => !v)}
              className="md:hidden p-2 rounded-lg transition-colors duration-150"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border-subtle)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent')
              }
              aria-label="Menu"
            >
              {menuMobileAberto ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Nav mobile dropdown */}
        {menuMobileAberto && (
          <div
            className="md:hidden px-4 py-2"
            style={{
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-raised)',
            }}
          >
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleNavClick(id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg font-medium transition-all duration-150"
                style={
                  abaAtiva === id
                    ? { backgroundColor: 'var(--accent-dim)', color: 'var(--accent)' }
                    : { color: 'var(--text-muted)' }
                }
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 pb-24 md:pb-6">

        {abaAtiva === 'dashboard' && (
          <div>
            <div className="mb-6">
              <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Visão Geral
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Métricas calculadas em tempo real a partir dos cheques cadastrados.
              </p>
            </div>
            <Dashboard metrics={metrics} cheques={cheques} onVerDetalhe={setChequeDetalhado} />
          </div>
        )}

        {abaAtiva === 'cheques' && (
          <div>
            <div className="mb-6">
              <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Cheques em Custódia
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {cheques.length} cheque(s) cadastrado(s)
              </p>
            </div>
            <ListaCheques
              cheques={cheques}
              onNovoCheque={() => setMostrarFormulario(true)}
              onVerDetalhe={setChequeDetalhado}
            />
          </div>
        )}

        {abaAtiva === 'devolvidos' && (
          <div>
            <div className="mb-6">
              <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Devolvidos
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Cheques devolvidos e recuperados
              </p>
            </div>
            <Devolvidos cheques={cheques} onVerDetalhe={setChequeDetalhado} />
          </div>
        )}

        {abaAtiva === 'relatorios' && (
          <div>
            <div className="mb-6">
              <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Relatórios
              </h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Análises por período, cliente e vencimento
              </p>
            </div>
            <Relatorios cheques={cheques} />
          </div>
        )}
      </main>

      {/* Bottom Nav — mobile */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center"
        style={{
          backgroundColor: 'var(--bg-raised)',
          borderTop: '1px solid var(--border-subtle)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setAbaAtiva(id); setMenuMobileAberto(false) }}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors duration-150"
            style={{ color: abaAtiva === id ? 'var(--accent)' : 'var(--text-faint)' }}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
        <button
          onClick={() => setMostrarFormulario(true)}
          className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1"
          style={{ color: 'var(--accent)' }}
        >
          <Plus size={20} />
          <span className="text-[10px] font-medium">Novo</span>
        </button>
      </nav>

      {/* Modal — Formulário */}
      {mostrarFormulario && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          style={{ backgroundColor: 'oklch(0% 0 0 / 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setMostrarFormulario(false)}
        >
          <div
            className="card w-full sm:max-w-3xl sm:rounded-xl max-h-[95dvh] overflow-y-auto"
            style={{ border: '1px solid var(--border-default)' }}
          >
            <div
              className="flex items-center justify-between p-5 sticky top-0 z-10"
              style={{
                backgroundColor: 'var(--bg-overlay)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Cadastrar Cheque
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Preencha todos os campos obrigatórios
                </p>
              </div>
              <button
                onClick={() => setMostrarFormulario(false)}
                className="p-1.5 rounded-lg transition-colors duration-150"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border-subtle)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
                }}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <FormularioCheque
                onSubmit={handleSubmitCheque}
                onCancelar={() => setMostrarFormulario(false)}
                emitentes={emitentes}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal — Detalhe */}
      {chequeDetalhado && (
        <DetalheCheque
          cheque={cheques.find((c) => c.id === chequeDetalhado.id) ?? chequeDetalhado}
          onFechar={() => setChequeDetalhado(null)}
          onAtualizarStatus={(id, status, extra) => {
            atualizarStatus(id, status, extra)
            setChequeDetalhado(null)
          }}
          onEditar={(cheque) => { setChequeEditando(cheque); setChequeDetalhado(null) }}
        />
      )}

      {/* Modal — Edição */}
      {chequeEditando && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          style={{ backgroundColor: 'oklch(0% 0 0 / 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && setChequeEditando(null)}
        >
          <div
            className="card w-full sm:max-w-3xl sm:rounded-xl max-h-[95dvh] overflow-y-auto"
            style={{ border: '1px solid var(--border-default)' }}
          >
            <div
              className="flex items-center justify-between p-5 sticky top-0 z-10"
              style={{ backgroundColor: 'var(--bg-overlay)', borderBottom: '1px solid var(--border-subtle)' }}
            >
              <div>
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Editar Cheque</h2>
                <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>#{chequeEditando.numero}</p>
              </div>
              <button
                onClick={() => setChequeEditando(null)}
                className="p-1.5 rounded-lg transition-colors duration-150"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border-subtle)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent' }}
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <FormularioEdicaoCheque
                cheque={chequeEditando}
                onSalvar={async (id, dados) => {
                  await editarCheque(id, dados)
                  setChequeEditando(null)
                }}
                onCancelar={() => setChequeEditando(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
