import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Calendar, Users, ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react'
import type { Cheque } from '../types/cheque'
import { formatarMoeda, formatarData } from '../utils/formatters'
import { calcularDiasCorreidos, calcularJuros } from '../utils/diasUteis'
import { calculateChequeDiscount, parseISODate } from '../utils/chequeCalculo'
import { exportarRelatorioExcel, exportarRelatorioPDF, exportarClienteExcel } from '../utils/exportar'

interface RelatoriosProps {
  cheques: Cheque[]
}

type PeriodoFiltro = '7d' | '30d' | '90d' | '365d' | 'todos'

const PERIODO_LABELS: Record<PeriodoFiltro, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  '365d': 'Último ano',
  'todos': 'Todo período',
}

// Desconto (lucro em juros) contratado para o cheque, da emissão ao vencimento —
// mesma fonte de verdade usada no cadastro, detalhe e dashboard.
function calcularDescontoCheque(c: Cheque): number {
  return calculateChequeDiscount({
    nominalValue: c.valor_nominal,
    monthlyInterestRatePercent: c.taxa_juros_mes,
    issueDate: c.data_emissao,
    dueDate: c.data_vencimento,
  }).totalDiscountValue
}

function filtrarPorPeriodo(cheques: Cheque[], periodo: PeriodoFiltro): Cheque[] {
  if (periodo === 'todos') return cheques
  const dias = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 }[periodo]
  const corte = new Date()
  corte.setDate(corte.getDate() - dias)
  return cheques.filter((c) => new Date(c.created_at) >= corte)
}

export function Relatorios({ cheques }: RelatoriosProps) {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('30d')
  const [abaRelatorio, setAbaRelatorio] = useState<'periodo' | 'clientes' | 'vencimentos'>('periodo')
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const chequesPerido = useMemo(() => filtrarPorPeriodo(cheques, periodo), [cheques, periodo])

  // ── Relatório por período ──────────────────────────────────
  const relPeriodo = useMemo(() => {
    const compensados = chequesPerido.filter((c) => c.status === 'compensado')
    const devolvidos = chequesPerido.filter((c) => c.status === 'devolvido')
    const recuperados = chequesPerido.filter((c) => c.status === 'recuperado')
    const emCustodia = chequesPerido.filter((c) => c.status === 'em_custodia')

    // Lucro em juros: desconto contratado dos cheques que ainda geram ou já geraram
    // retorno (em custódia, compensados ou recuperados) — devolvidos não entram aqui.
    const lucroJuros = [...emCustodia, ...compensados, ...recuperados]
      .reduce((acc, c) => acc + calcularDescontoCheque(c), 0)

    const prejuizo = devolvidos.reduce((acc, c) => {
      const devolucao = c.data_devolucao ? parseISODate(c.data_devolucao) : hoje
      const dias = calcularDiasCorreidos(devolucao, hoje)
      const jurosPos = calcularJuros(c.valor_nominal, c.taxa_juros_mes, dias)
      return acc + c.valor_nominal + jurosPos
    }, 0)

    return {
      totalCheques: chequesPerido.length,
      compensados: compensados.length,
      devolvidos: devolvidos.length,
      recuperados: recuperados.length,
      emCustodia: emCustodia.length,
      valorCustodia: emCustodia.reduce((a, c) => a + c.valor_nominal, 0),
      lucroJuros,
      prejuizo,
      resultado: lucroJuros - prejuizo,
    }
  }, [chequesPerido])

  // ── Relatório por cliente ──────────────────────────────────
  const relClientes = useMemo(() => {
    const mapa = new Map<string, {
      nome: string; cpf_cnpj: string
      total: number; compensados: number; devolvidos: number
      valorTotal: number; jurosTotal: number
    }>()

    chequesPerido.forEach((c) => {
      const key = c.cpf_cnpj
      const atual = mapa.get(key) ?? {
        nome: c.emitente, cpf_cnpj: c.cpf_cnpj,
        total: 0, compensados: 0, devolvidos: 0,
        valorTotal: 0, jurosTotal: 0,
      }
      const juros = c.status === 'devolvido' || c.status === 'cancelado'
        ? 0
        : calcularDescontoCheque(c)

      mapa.set(key, {
        ...atual,
        total: atual.total + 1,
        compensados: atual.compensados + (c.status === 'compensado' ? 1 : 0),
        devolvidos: atual.devolvidos + (c.status === 'devolvido' ? 1 : 0),
        valorTotal: atual.valorTotal + c.valor_nominal,
        jurosTotal: atual.jurosTotal + juros,
      })
    })

    return Array.from(mapa.values()).sort((a, b) => b.valorTotal - a.valorTotal)
  }, [chequesPerido])

  // ── Vencimentos próximos (30 dias) ────────────────────────
  const vencimentosProximos = useMemo(() => {
    const limite = new Date(hoje)
    limite.setDate(limite.getDate() + 30)
    return cheques
      .filter((c) => {
        if (c.status !== 'em_custodia') return false
        const venc = parseISODate(c.data_vencimento)
        return venc >= hoje && venc <= limite
      })
      .sort((a, b) => parseISODate(a.data_vencimento).getTime() - parseISODate(b.data_vencimento).getTime())
  }, [cheques])

  const vencidos = useMemo(() =>
    cheques.filter((c) => c.status === 'em_custodia' && parseISODate(c.data_vencimento) < hoje)
      .sort((a, b) => parseISODate(a.data_vencimento).getTime() - parseISODate(b.data_vencimento).getTime()),
    [cheques]
  )

  return (
    <div className="space-y-5">

      {/* Filtro de período + Exportar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="relative">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as PeriodoFiltro)}
            className="input pr-8 appearance-none"
            style={{ minWidth: '180px' }}
          >
            {(Object.keys(PERIODO_LABELS) as PeriodoFiltro[]).map((p) => (
              <option key={p} value={p}>{PERIODO_LABELS[p]}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-faint)' }} />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
            <Download size={12} className="inline mr-1" />Exportar:
          </span>
          <button
            onClick={() => exportarRelatorioExcel(chequesPerido, `Relatório ${PERIODO_LABELS[periodo]}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ backgroundColor: 'var(--positive-dim)', color: 'var(--positive)', border: '1px solid var(--positive-border)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
            title="Exportar Excel"
          >
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button
            onClick={() => exportarRelatorioPDF(chequesPerido, 'Relatório de Cheques', PERIODO_LABELS[periodo])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ backgroundColor: 'var(--danger-dim)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
            title="Exportar PDF"
          >
            <FileText size={13} /> PDF
          </button>
          {abaRelatorio === 'clientes' && (
            <button
              onClick={() => exportarClienteExcel(relClientes, PERIODO_LABELS[periodo])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
              title="Exportar clientes Excel"
            >
              <Users size={13} /> Clientes
            </button>
          )}
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-overlay)' }}>
        {(['periodo', 'clientes', 'vencimentos'] as const).map((aba) => {
          const labels = { periodo: 'Por Período', clientes: 'Por Cliente', vencimentos: 'Vencimentos' }
          return (
            <button
              key={aba}
              onClick={() => setAbaRelatorio(aba)}
              className="flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-150"
              style={
                abaRelatorio === aba
                  ? { backgroundColor: 'var(--bg-overlay)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }
                  : { color: 'var(--text-muted)' }
              }
            >
              {labels[aba]}
            </button>
          )
        })}
      </div>

      {/* ── Relatório por período ── */}
      {abaRelatorio === 'periodo' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard label="Cheques" valor={String(relPeriodo.totalCheques)} sub="no período" color="#60A5FA" />
            <MetricCard label="Compensados" valor={String(relPeriodo.compensados)} sub={`${relPeriodo.devolvidos} devolvidos`} color="var(--positive)" />
            <MetricCard label="Lucro em juros" valor={formatarMoeda(relPeriodo.lucroJuros)} sub="em custódia + realizado" color="var(--positive)" />
            <MetricCard
              label="Resultado líquido"
              valor={formatarMoeda(relPeriodo.resultado)}
              sub={relPeriodo.resultado >= 0 ? 'positivo' : 'negativo'}
              color={relPeriodo.resultado >= 0 ? 'var(--positive)' : 'var(--danger)'}
            />
          </div>

          <div className="card p-5">
            <h3 className="section-title mb-4">Resumo do período — {PERIODO_LABELS[periodo]}</h3>
            <div className="space-y-3">
              <Linha label="Total de cheques" valor={String(relPeriodo.totalCheques)} />
              <Linha label="Em custódia" valor={`${relPeriodo.emCustodia} · ${formatarMoeda(relPeriodo.valorCustodia)}`} />
              <Linha label="Compensados" valor={String(relPeriodo.compensados)} color="var(--positive)" />
              <Linha label="Devolvidos" valor={String(relPeriodo.devolvidos)} color="var(--danger)" />
              <Linha label="Recuperados" valor={String(relPeriodo.recuperados)} color="var(--amber)" />
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginTop: '12px' }}>
                <Linha label="Lucro em juros (custódia + realizado)" valor={formatarMoeda(relPeriodo.lucroJuros)} color="var(--positive)" />
                <Linha label="Exposição a prejuízo" valor={formatarMoeda(relPeriodo.prejuizo)} color="var(--danger)" />
                <Linha
                  label="Resultado líquido"
                  valor={formatarMoeda(relPeriodo.resultado)}
                  color={relPeriodo.resultado >= 0 ? 'var(--positive)' : 'var(--danger)'}
                  bold
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Relatório por cliente ── */}
      {abaRelatorio === 'clientes' && (
        <div className="space-y-3">
          {relClientes.length === 0 ? (
            <div className="card p-8 text-center">
              <Users size={24} className="mx-auto mb-2 opacity-10" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Nenhum dado no período selecionado.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-raised)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th className="text-left px-4 py-3 section-title">Cliente</th>
                    <th className="text-center px-4 py-3 section-title">Cheques</th>
                    <th className="text-center px-4 py-3 section-title">Comp.</th>
                    <th className="text-center px-4 py-3 section-title">Dev.</th>
                    <th className="text-right px-4 py-3 section-title">Vol. nominal</th>
                    <th className="text-right px-4 py-3 section-title">Juros gerados</th>
                  </tr>
                </thead>
                <tbody>
                  {relClientes.map((c, idx) => (
                    <tr
                      key={c.cpf_cnpj}
                      style={{ borderTop: idx > 0 ? '1px solid var(--border-subtle)' : 'none' }}
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.nome}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>{c.cpf_cnpj}</p>
                      </td>
                      <td className="px-4 py-3.5 text-center tabular" style={{ color: 'var(--text-secondary)' }}>{c.total}</td>
                      <td className="px-4 py-3.5 text-center tabular" style={{ color: 'var(--positive)' }}>{c.compensados}</td>
                      <td className="px-4 py-3.5 text-center tabular" style={{ color: 'var(--danger)' }}>{c.devolvidos}</td>
                      <td className="px-4 py-3.5 text-right tabular font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {formatarMoeda(c.valorTotal)}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular" style={{ color: 'var(--positive)' }}>
                        {formatarMoeda(c.jurosTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Vencimentos ── */}
      {abaRelatorio === 'vencimentos' && (
        <div className="space-y-4">
          {/* Vencidos */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={14} style={{ color: 'var(--danger)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
                Vencidos em custódia ({vencidos.length})
              </h3>
            </div>
            {vencidos.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Nenhum cheque vencido em custódia.</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                {vencidos.map((c, idx) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderTop: idx > 0 ? '1px solid var(--border-subtle)' : 'none' }}
                  >
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{c.emitente}</p>
                      <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-faint)' }}>#{c.numero}</p>
                    </div>
                    <div className="text-right">
                      <p className="tabular font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {formatarMoeda(c.valor_nominal)}
                      </p>
                      <p className="text-xs tabular" style={{ color: 'var(--danger)' }}>
                        Venceu em {formatarData(c.data_vencimento)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Próximos 30 dias */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} style={{ color: 'var(--accent)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                Vencimentos próximos — 30 dias ({vencimentosProximos.length})
              </h3>
            </div>
            {vencimentosProximos.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Nenhum vencimento nos próximos 30 dias.</p>
              </div>
            ) : (
              <div className="card overflow-hidden">
                {vencimentosProximos.map((c, idx) => {
                  const diasParaVencer = calcularDiasCorreidos(hoje, parseISODate(c.data_vencimento))
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between px-4 py-3"
                      style={{ borderTop: idx > 0 ? '1px solid var(--border-subtle)' : 'none' }}
                    >
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{c.emitente}</p>
                        <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-faint)' }}>#{c.numero}</p>
                      </div>
                      <div className="text-right">
                        <p className="tabular font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {formatarMoeda(c.valor_nominal)}
                        </p>
                        <p className="text-xs tabular" style={{ color: diasParaVencer <= 7 ? 'var(--warning)' : 'var(--accent)' }}>
                          <Calendar size={10} className="inline mr-1" />
                          {formatarData(c.data_vencimento)} · {diasParaVencer}d
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, valor, sub, color }: { label: string; valor: string; sub: string; color: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="tabular text-xl font-bold" style={{ color }}>{valor}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>{sub}</p>
    </div>
  )
}

function Linha({ label, valor, color, bold }: { label: string; valor: string; color?: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span
        className={`text-sm tabular ${bold ? 'font-bold' : 'font-medium'}`}
        style={{ color: color ?? 'var(--text-primary)' }}
      >
        {valor}
      </span>
    </div>
  )
}

