import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Timer,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import type { DashboardMetrics } from '../types/cheque'
import { formatarMoeda } from '../utils/formatters'

const MOTIVO_LABELS: Record<string, string> = {
  sem_fundos: 'Sem fundos',
  conta_encerrada: 'Conta encerrada',
  assinatura_divergente: 'Assinatura divergente',
  cheque_sustado: 'Sustado',
  prescrito: 'Prescrito',
  outros: 'Outros',
}

interface DashboardProps {
  metrics: DashboardMetrics
}

export function Dashboard({ metrics }: DashboardProps) {
  const resultadoMesPositivo = metrics.resultado_liquido_mes >= 0
  const resultadoTotalPositivo = metrics.resultado_liquido_total >= 0

  const motivosOrdenados = Object.entries(metrics.motivos_devolucao).sort(
    ([, a], [, b]) => b - a
  )
  const maxMotivo = Math.max(...Object.values(metrics.motivos_devolucao), 1)

  return (
    <div className="space-y-5">

      {/* Alerta de vencidos */}
      {metrics.cheques_vencidos > 0 && (
        <div
          className="flex items-start gap-3 rounded-xl p-4"
          style={{
            backgroundColor: 'var(--warning-dim)',
            border: '1px solid var(--warning-border)',
          }}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>
              {metrics.cheques_vencidos} cheque{metrics.cheques_vencidos > 1 ? 's' : ''} vencido
              {metrics.cheques_vencidos > 1 ? 's' : ''} em custódia
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--amber)' }}>
              Total de {formatarMoeda(metrics.valor_vencido)} aguardando providências.
            </p>
          </div>
        </div>
      )}

      {/* Capital */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} style={{ color: 'var(--text-muted)' }} />
          <h2 className="section-title">Capital</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Em risco (custódia)</p>
            <p className="tabular text-lg font-semibold" style={{ color: 'var(--accent)' }}>
              {formatarMoeda(metrics.capital_em_risco)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>alocado atualmente</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Capital retornado</p>
            <p className="tabular text-lg font-semibold" style={{ color: 'var(--positive)' }}>
              {formatarMoeda(metrics.capital_retornado)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>nominal + juros recebidos</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total desembolsado</p>
            <p className="tabular text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatarMoeda(metrics.capital_total_desembolsado)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>compensados + devolvidos</p>
          </div>
        </div>
        {metrics.capital_total_desembolsado > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
              <span>Retorno sobre capital desembolsado</span>
              <span className="tabular" style={{ color: 'var(--positive)' }}>
                {(((metrics.capital_retornado - metrics.capital_total_desembolsado) / metrics.capital_total_desembolsado) * 100).toFixed(2)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-input)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min((metrics.capital_retornado / Math.max(metrics.capital_total_desembolsado, 1)) * 100, 100)}%`,
                  backgroundColor: 'var(--positive)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          titulo="Em Custódia"
          valor={String(metrics.em_custodia)}
          sub={formatarMoeda(metrics.valor_total_custodia)}
          icon={Clock}
          tone="accent"
        />
        <KpiCard
          titulo="Compensados"
          valor={String(metrics.compensados)}
          sub={`${metrics.taxa_compensacao.toFixed(1)}% do total`}
          icon={CheckCircle2}
          tone="positive"
        />
        <KpiCard
          titulo="Devolvidos"
          valor={String(metrics.devolvidos)}
          sub={`${metrics.recuperados} recuperados · ${metrics.taxa_inadimplencia.toFixed(1)}% inadimpl.`}
          icon={XCircle}
          tone="danger"
        />
        <KpiCard
          titulo="Tempo médio"
          valor={`${metrics.tempo_medio_custodia_dias}`}
          sub="dias úteis até compensar"
          icon={Timer}
          tone="purple"
          sufixo=" d.u."
        />
      </div>

      {/* Posição da carteira */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wallet size={15} style={{ color: 'var(--text-muted)' }} />
          <h2 className="section-title">Posição da Carteira</h2>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Valor nominal</p>
            <p className="tabular text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatarMoeda(metrics.valor_total_custodia)}
            </p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Juros projetados</p>
            <p className="tabular text-lg font-semibold" style={{ color: 'var(--positive)' }}>
              +{formatarMoeda(metrics.juros_projetados_custodia)}
            </p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Total projetado</p>
            <p className="tabular text-lg font-semibold" style={{ color: 'var(--accent)' }}>
              {formatarMoeda(metrics.valor_total_com_juros)}
            </p>
          </div>
        </div>

        {/* Barra visual */}
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--bg-input)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width:
                metrics.valor_total_com_juros > 0
                  ? `${(metrics.valor_total_custodia / metrics.valor_total_com_juros) * 100}%`
                  : '100%',
              backgroundColor: 'var(--accent)',
            }}
          />
        </div>
        <div className="flex gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: 'var(--accent)' }} />
            Principal
          </span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-default)' }} />
            Juros projetados
          </span>
        </div>
      </div>

      {/* Resultados financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ResultadoCard
          titulo="Resultado do Mês"
          lucro={metrics.lucro_mes}
          prejuizo={metrics.prejuizo_mes}
          resultado={metrics.resultado_liquido_mes}
          positivo={resultadoMesPositivo}
        />
        <ResultadoCard
          titulo="Resultado Acumulado"
          lucro={metrics.lucro_total}
          prejuizo={metrics.prejuizo_total}
          resultado={metrics.resultado_liquido_total}
          positivo={resultadoTotalPositivo}
        />
      </div>

      {/* Motivos de devolução */}
      {motivosOrdenados.length > 0 && (
        <div className="card p-5">
          <h2 className="section-title mb-4">Motivos de Devolução</h2>
          <div className="space-y-3">
            {motivosOrdenados.map(([motivo, qtd]) => {
              const pct = Math.round((qtd / maxMotivo) * 100)
              return (
                <div key={motivo} className="flex items-center gap-3">
                  <span
                    className="text-sm w-40 shrink-0 truncate"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {MOTIVO_LABELS[motivo] ?? motivo}
                  </span>
                  <div
                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--danger-dim)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: 'var(--danger)' }}
                    />
                  </div>
                  <span
                    className="tabular text-xs font-semibold w-5 text-right"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {qtd}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {metrics.total_cheques === 0 && (
        <div className="card p-10 text-center">
          <Clock size={32} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            Nenhum cheque cadastrado ainda.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
            Cadastre o primeiro cheque para ver as métricas aqui.
          </p>
        </div>
      )}
    </div>
  )
}

/* ─── Sub-componentes ─────────────────────────────────────── */

type KpiTone = 'accent' | 'positive' | 'danger' | 'purple'

interface KpiCardProps {
  titulo: string
  valor: string
  sub: string
  icon: React.ElementType
  tone: KpiTone
  sufixo?: string
}

const TONE_VARS: Record<KpiTone, { color: string; dim: string; border: string }> = {
  accent:   { color: 'var(--accent)',   dim: 'var(--accent-dim)',   border: 'var(--accent-border)' },
  positive: { color: 'var(--positive)', dim: 'var(--positive-dim)', border: 'var(--positive-border)' },
  danger:   { color: 'var(--danger)',   dim: 'var(--danger-dim)',   border: 'var(--danger-border)' },
  purple:   { color: 'var(--purple)',   dim: 'var(--purple-dim)',   border: 'var(--purple-border)' },
}

function KpiCard({ titulo, valor, sub, icon: Icon, tone, sufixo }: KpiCardProps) {
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
      <p className="tabular text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {valor}{sufixo ?? ''}
      </p>
      <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-faint)' }}>
        {sub}
      </p>
    </div>
  )
}

interface ResultadoCardProps {
  titulo: string
  lucro: number
  prejuizo: number
  resultado: number
  positivo: boolean
}

function ResultadoCard({ titulo, lucro, prejuizo, resultado, positivo }: ResultadoCardProps) {
  return (
    <div className="card p-5">
      <p className="section-title mb-4">{titulo}</p>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <ArrowUpRight size={14} style={{ color: 'var(--positive)' }} />
            Lucro (juros recebidos)
          </span>
          <span className="tabular text-sm font-semibold" style={{ color: 'var(--positive)' }}>
            {formatarMoeda(lucro)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <ArrowDownRight size={14} style={{ color: 'var(--danger)' }} />
            Prejuízo (devoluções)
          </span>
          <span className="tabular text-sm font-semibold" style={{ color: 'var(--danger)' }}>
            {formatarMoeda(prejuizo)}
          </span>
        </div>
      </div>

      <div
        className="pt-3 flex items-center justify-between"
        style={{
          borderTop: `1px solid ${positivo ? 'var(--positive-border)' : 'var(--danger-border)'}`,
        }}
      >
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Resultado líquido
        </span>
        <div className="flex items-center gap-1.5">
          {positivo ? (
            <TrendingUp size={14} style={{ color: 'var(--positive)' }} />
          ) : (
            <TrendingDown size={14} style={{ color: 'var(--danger)' }} />
          )}
          <span
            className="tabular text-xl font-bold"
            style={{ color: positivo ? 'var(--positive)' : 'var(--danger)' }}
          >
            {formatarMoeda(resultado)}
          </span>
        </div>
      </div>
    </div>
  )
}
