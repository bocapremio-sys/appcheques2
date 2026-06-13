import {
  Wallet,
  TrendingDown,
  TrendingUp,
  FileText,
  Percent,
  CalendarClock,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'
import type { Cheque, ChequeStatus, DashboardMetrics } from '../types/cheque'
import { StatusBadge } from '../components/StatusBadge'
import { formatarMoeda, formatarData, formatarPercentual } from '../utils/formatters'

interface DashboardProps {
  metrics: DashboardMetrics
  cheques: Cheque[]
  onVerDetalhe: (cheque: Cheque) => void
}

const STATUS_ORDEM: ChequeStatus[] = ['em_custodia', 'compensado', 'devolvido', 'recuperado', 'cancelado']

export function Dashboard({ metrics, cheques, onVerDetalhe }: DashboardProps) {
  const abrirCheque = (id: string) => {
    const cheque = cheques.find((c) => c.id === id)
    if (cheque) onVerDetalhe(cheque)
  }

  if (metrics.quantidadeCheques === 0) {
    return (
      <div className="card p-10 text-center">
        <Wallet size={32} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          Nenhum cheque cadastrado ainda.
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
          Cadastre o primeiro cheque para ver as métricas aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard titulo="Valor Nominal Total" valor={formatarMoeda(metrics.totalNominal)} icon={Wallet} tone="accent" />
        <KpiCard titulo="Desconto Total" valor={formatarMoeda(metrics.totalDesconto)} icon={TrendingDown} tone="danger" />
        <KpiCard titulo="Valor Líquido Total" valor={formatarMoeda(metrics.totalLiquido)} icon={TrendingUp} tone="positive" />
        <KpiCard
          titulo="Quantidade de Cheques"
          valor={String(metrics.quantidadeCheques)}
          sub={`Desconto médio: ${formatarMoeda(metrics.descontoMedio)}`}
          icon={FileText}
          tone="purple"
        />
      </div>

      {/* Por status */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Percent size={15} style={{ color: 'var(--text-muted)' }} />
          <h2 className="section-title">Cheques por Status</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {STATUS_ORDEM.map((status) => {
            const resumo = metrics.porStatus[status]
            return (
              <div
                key={status}
                className="rounded-lg p-3"
                style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
              >
                <StatusBadge status={status} />
                <p className="tabular text-xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
                  {resumo.quantidade}
                </p>
                <p className="text-xs tabular mt-0.5" style={{ color: 'var(--text-faint)' }}>
                  {formatarMoeda(resumo.valorNominal)}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Próximos vencimentos + ajustados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock size={15} style={{ color: 'var(--text-muted)' }} />
            <h2 className="section-title">Próximos Vencimentos</h2>
          </div>
          {metrics.proximosVencimentos.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
              Nenhum cheque em custódia.
            </p>
          ) : (
            <div className="space-y-2">
              {metrics.proximosVencimentos.slice(0, 5).map((linha) => (
                <button
                  key={linha.id}
                  onClick={() => abrirCheque(linha.id)}
                  className="w-full flex items-center justify-between gap-3 py-2 px-3 rounded-lg transition-colors duration-150"
                  style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {linha.emitente}
                    </p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
                      #{linha.numero}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="tabular text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {formatarData(linha.vencimentoAjustado)}
                    </p>
                    {linha.vencimentoFoiAjustado && (
                      <p className="text-xs" style={{ color: 'var(--warning)' }}>ajustado</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={15} style={{ color: 'var(--text-muted)' }} />
            <h2 className="section-title">Vencimentos Ajustados</h2>
          </div>
          {metrics.quantidadeChequesAjustados === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
              Nenhum cheque com vencimento ajustado.
            </p>
          ) : (
            <>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                {metrics.quantidadeChequesAjustados} cheque{metrics.quantidadeChequesAjustados > 1 ? 's' : ''} com
                vencimento original em fim de semana ou feriado.
              </p>
              <div className="space-y-2">
                {metrics.chequesComVencimentoAjustado.slice(0, 5).map((linha) => (
                  <button
                    key={linha.id}
                    onClick={() => abrirCheque(linha.id)}
                    className="w-full flex items-center justify-between gap-3 py-2 px-3 rounded-lg transition-colors duration-150"
                    style={{ backgroundColor: 'var(--warning-dim)', border: '1px solid var(--warning-border)' }}
                  >
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {linha.emitente}
                      </p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
                        #{linha.numero}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs tabular" style={{ color: 'var(--warning)' }}>
                        {formatarData(linha.vencimentoOriginal)} → {formatarData(linha.vencimentoAjustado)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabela detalhada */}
      <div className="card overflow-hidden">
        <div className="p-5 pb-0">
          <h2 className="section-title">Detalhamento do Cálculo</h2>
        </div>

        {/* Desktop — tabela */}
        <div className="overflow-x-auto hidden md:block mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-raised)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th className="text-left px-3 py-3 section-title whitespace-nowrap">Número</th>
                <th className="text-left px-3 py-3 section-title whitespace-nowrap">Emitente</th>
                <th className="text-left px-3 py-3 section-title whitespace-nowrap">Banco</th>
                <th className="text-right px-3 py-3 section-title whitespace-nowrap">Valor Nominal</th>
                <th className="text-right px-3 py-3 section-title whitespace-nowrap">Taxa a.m.</th>
                <th className="text-right px-3 py-3 section-title whitespace-nowrap">Taxa a.d.</th>
                <th className="text-right px-3 py-3 section-title whitespace-nowrap">Valor Mês</th>
                <th className="text-right px-3 py-3 section-title whitespace-nowrap">Valor Dia</th>
                <th className="text-left px-3 py-3 section-title whitespace-nowrap">Emissão</th>
                <th className="text-left px-3 py-3 section-title whitespace-nowrap">Venc. Original</th>
                <th className="text-left px-3 py-3 section-title whitespace-nowrap">Venc. Ajustado</th>
                <th className="text-right px-3 py-3 section-title whitespace-nowrap">Dias Cálculo</th>
                <th className="text-right px-3 py-3 section-title whitespace-nowrap">Desconto</th>
                <th className="text-right px-3 py-3 section-title whitespace-nowrap">Valor Líquido</th>
                <th className="text-left px-3 py-3 section-title whitespace-nowrap">Status</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {metrics.linhas.map((linha, idx) => (
                <tr
                  key={linha.id}
                  onClick={() => abrirCheque(linha.id)}
                  className="cursor-pointer transition-colors duration-150 ease-out"
                  style={{ borderTop: idx > 0 ? '1px solid var(--border-subtle)' : 'none' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--bg-overlay)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent' }}
                >
                  <td className="px-3 py-3 font-mono text-xs" style={{ color: 'var(--text-faint)' }}>#{linha.numero}</td>
                  <td className="px-3 py-3 font-medium truncate max-w-[160px]" style={{ color: 'var(--text-primary)' }}>{linha.emitente}</td>
                  <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{linha.banco}</td>
                  <td className="px-3 py-3 text-right tabular font-semibold" style={{ color: 'var(--text-primary)' }}>{formatarMoeda(linha.valorNominal)}</td>
                  <td className="px-3 py-3 text-right tabular text-xs" style={{ color: 'var(--text-muted)' }}>{formatarPercentual(linha.taxaMensalPercent)}</td>
                  <td className="px-3 py-3 text-right tabular text-xs" style={{ color: 'var(--text-muted)' }}>{formatarPercentual(linha.taxaDiariaPercent)}</td>
                  <td className="px-3 py-3 text-right tabular text-xs" style={{ color: 'var(--text-muted)' }}>{formatarMoeda(linha.valorMes)}</td>
                  <td className="px-3 py-3 text-right tabular text-xs" style={{ color: 'var(--text-muted)' }}>{formatarMoeda(linha.valorDia)}</td>
                  <td className="px-3 py-3 tabular text-xs" style={{ color: 'var(--text-muted)' }}>{formatarData(linha.dataEmissao)}</td>
                  <td className="px-3 py-3 tabular text-xs" style={{ color: 'var(--text-muted)' }}>{formatarData(linha.vencimentoOriginal)}</td>
                  <td className="px-3 py-3 tabular text-xs">
                    {linha.vencimentoFoiAjustado ? (
                      <span style={{ color: 'var(--warning)' }}>Ajustado · {formatarData(linha.vencimentoAjustado)}</span>
                    ) : (
                      <span style={{ color: 'var(--text-faint)' }}>Sem ajuste</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular text-xs" style={{ color: 'var(--text-muted)' }}>{linha.diasCalculo}</td>
                  <td className="px-3 py-3 text-right tabular font-semibold" style={{ color: 'var(--danger)' }}>{formatarMoeda(linha.desconto)}</td>
                  <td className="px-3 py-3 text-right tabular font-semibold" style={{ color: 'var(--positive)' }}>{formatarMoeda(linha.valorLiquido)}</td>
                  <td className="px-3 py-3"><StatusBadge status={linha.status} /></td>
                  <td className="px-3 py-3">
                    <ChevronRight size={14} style={{ color: 'var(--text-faint)' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile — cards */}
        <div className="space-y-2 p-4 md:hidden">
          {metrics.linhas.map((linha) => (
            <button
              key={linha.id}
              onClick={() => abrirCheque(linha.id)}
              className="w-full text-left rounded-lg p-3"
              style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{linha.emitente}</p>
                  <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-faint)' }}>#{linha.numero}</p>
                </div>
                <StatusBadge status={linha.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div>
                  <p style={{ color: 'var(--text-faint)' }}>Valor nominal</p>
                  <p className="tabular font-semibold" style={{ color: 'var(--text-primary)' }}>{formatarMoeda(linha.valorNominal)}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-faint)' }}>Dias para cálculo</p>
                  <p className="tabular" style={{ color: 'var(--text-secondary)' }}>{linha.diasCalculo}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-faint)' }}>Desconto</p>
                  <p className="tabular font-semibold" style={{ color: 'var(--danger)' }}>{formatarMoeda(linha.desconto)}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-faint)' }}>Valor líquido</p>
                  <p className="tabular font-semibold" style={{ color: 'var(--positive)' }}>{formatarMoeda(linha.valorLiquido)}</p>
                </div>
                <div className="col-span-2">
                  <p style={{ color: 'var(--text-faint)' }}>Vencimento</p>
                  {linha.vencimentoFoiAjustado ? (
                    <p className="tabular" style={{ color: 'var(--warning)' }}>
                      Ajustado · {formatarData(linha.vencimentoAjustado)} (original {formatarData(linha.vencimentoOriginal)})
                    </p>
                  ) : (
                    <p className="tabular" style={{ color: 'var(--text-secondary)' }}>Sem ajuste · {formatarData(linha.vencimentoOriginal)}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Sub-componentes ─────────────────────────────────────── */

type KpiTone = 'accent' | 'positive' | 'danger' | 'purple'

interface KpiCardProps {
  titulo: string
  valor: string
  sub?: string
  icon: React.ElementType
  tone: KpiTone
}

const TONE_VARS: Record<KpiTone, { color: string; dim: string; border: string }> = {
  accent:   { color: 'var(--accent)',   dim: 'var(--accent-dim)',   border: 'var(--accent-border)' },
  positive: { color: 'var(--positive)', dim: 'var(--positive-dim)', border: 'var(--positive-border)' },
  danger:   { color: 'var(--danger)',   dim: 'var(--danger-dim)',   border: 'var(--danger-border)' },
  purple:   { color: 'var(--purple)',   dim: 'var(--purple-dim)',   border: 'var(--purple-border)' },
}

function KpiCard({ titulo, valor, sub, icon: Icon, tone }: KpiCardProps) {
  const t = TONE_VARS[tone]
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          {titulo}
        </p>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: t.dim, border: `1px solid ${t.border}` }}
        >
          <Icon size={14} style={{ color: t.color }} />
        </div>
      </div>
      <p className="tabular text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {valor}
      </p>
      {sub && (
        <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-faint)' }}>
          {sub}
        </p>
      )}
    </div>
  )
}
