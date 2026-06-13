import { useMemo } from 'react'
import { XCircle, AlertTriangle, ChevronRight } from 'lucide-react'
import type { Cheque, MotivoDevolucao } from '../types/cheque'
import { StatusBadge } from '../components/StatusBadge'
import { formatarMoeda, formatarData, formatarCpfCnpj } from '../utils/formatters'
import { calcularDiasCorreidos, calcularJuros } from '../utils/diasUteis'
import { parseISODate } from '../utils/chequeCalculo'
import { BANCOS } from '../utils/mockData'

const MOTIVO_LABELS: Record<MotivoDevolucao, string> = {
  sem_fundos: 'Sem fundos',
  conta_encerrada: 'Conta encerrada',
  assinatura_divergente: 'Assinatura divergente',
  cheque_sustado: 'Cheque sustado',
  prescrito: 'Prescrito',
  outros: 'Outros',
}

interface DevolvidosProps {
  cheques: Cheque[]
  onVerDetalhe: (cheque: Cheque) => void
}

export function Devolvidos({ cheques, onVerDetalhe }: DevolvidosProps) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const devolvidos = useMemo(
    () => cheques.filter((c) => c.status === 'devolvido'),
    [cheques]
  )
  const recuperados = useMemo(
    () => cheques.filter((c) => c.status === 'recuperado'),
    [cheques]
  )

  const totalRisco = useMemo(() =>
    devolvidos.reduce((acc, c) => {
      const devolucao = c.data_devolucao ? parseISODate(c.data_devolucao) : hoje
      const dias = calcularDiasCorreidos(devolucao, hoje)
      const jurosPos = calcularJuros(c.valor_nominal, c.taxa_juros_mes, dias)
      return acc + c.valor_nominal + jurosPos
    }, 0),
    [devolvidos]
  )

  return (
    <div className="space-y-5">

      {/* Resumo de risco */}
      {devolvidos.length > 0 && (
        <div
          className="flex items-start gap-3 rounded-xl p-4"
          style={{
            backgroundColor: 'var(--danger-dim)',
            border: '1px solid var(--danger-border)',
          }}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--danger)' }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
              {devolvidos.length} cheque{devolvidos.length > 1 ? 's' : ''} em risco
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--danger)', opacity: 0.8 }}>
              Exposição total (nominal + juros acumulados): {formatarMoeda(totalRisco)}
            </p>
          </div>
        </div>
      )}

      {/* Devolvidos ativos */}
      <Section titulo="Em Risco — Devolvidos Não Recuperados" count={devolvidos.length}>
        {devolvidos.length === 0 ? (
          <EmptyState mensagem="Nenhum cheque devolvido em aberto." />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm hidden md:table">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-raised)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th className="text-left px-4 py-3 section-title">Número</th>
                  <th className="text-left px-4 py-3 section-title">Emitente</th>
                  <th className="text-left px-4 py-3 section-title">Banco</th>
                  <th className="text-left px-4 py-3 section-title">Motivo</th>
                  <th className="text-left px-4 py-3 section-title">Devolvido em</th>
                  <th className="text-right px-4 py-3 section-title">Exposição atual</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {devolvidos.map((cheque, idx) => {
                  const devolucao = cheque.data_devolucao ? parseISODate(cheque.data_devolucao) : hoje
                  const diasPos = calcularDiasCorreidos(devolucao, hoje)
                  const jurosPos = calcularJuros(cheque.valor_nominal, cheque.taxa_juros_mes, diasPos)
                  const exposicao = cheque.valor_nominal + jurosPos

                  return (
                    <tr
                      key={cheque.id}
                      onClick={() => onVerDetalhe(cheque)}
                      className="cursor-pointer transition-colors duration-150"
                      style={{ borderTop: idx > 0 ? '1px solid var(--border-subtle)' : 'none' }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--danger-dim)')
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent')
                      }
                    >
                      <td className="px-4 py-3.5 font-mono text-xs font-medium" style={{ color: 'var(--text-faint)' }}>
                        #{cheque.numero}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium truncate max-w-[160px]" style={{ color: 'var(--text-primary)' }}>
                          {cheque.emitente}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
                          {formatarCpfCnpj(cheque.cpf_cnpj)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {BANCOS[cheque.banco] ?? cheque.banco}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium"
                          style={{
                            backgroundColor: 'var(--danger-dim)',
                            color: 'var(--danger)',
                            border: '1px solid var(--danger-border)',
                          }}
                        >
                          {cheque.motivo_devolucao ? MOTIVO_LABELS[cheque.motivo_devolucao] : 'Outros'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs tabular" style={{ color: 'var(--text-muted)' }}>
                        {cheque.data_devolucao ? formatarData(cheque.data_devolucao) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="tabular font-semibold text-sm" style={{ color: 'var(--danger)' }}>
                          {formatarMoeda(exposicao)}
                        </span>
                        {jurosPos > 0 && (
                          <p className="text-xs tabular" style={{ color: 'var(--danger)', opacity: 0.6 }}>
                            +{formatarMoeda(jurosPos)} juros
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <ChevronRight size={14} style={{ color: 'var(--text-faint)' }} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {devolvidos.map((cheque) => {
                const devolucao = cheque.data_devolucao ? parseISODate(cheque.data_devolucao) : hoje
                const diasPos = calcularDiasCorreidos(devolucao, hoje)
                const jurosPos = calcularJuros(cheque.valor_nominal, cheque.taxa_juros_mes, diasPos)
                return (
                  <div
                    key={cheque.id}
                    onClick={() => onVerDetalhe(cheque)}
                    className="p-4 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{cheque.emitente}</p>
                        <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-faint)' }}>#{cheque.numero}</p>
                      </div>
                      <StatusBadge status={cheque.status} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {cheque.motivo_devolucao ? MOTIVO_LABELS[cheque.motivo_devolucao] : '—'}
                      </span>
                      <span className="tabular font-semibold text-sm" style={{ color: 'var(--danger)' }}>
                        {formatarMoeda(cheque.valor_nominal + jurosPos)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Section>

      {/* Recuperados */}
      <Section titulo="Recuperados" count={recuperados.length}>
        {recuperados.length === 0 ? (
          <EmptyState mensagem="Nenhum cheque recuperado ainda." />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm hidden md:table">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-raised)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th className="text-left px-4 py-3 section-title">Número</th>
                  <th className="text-left px-4 py-3 section-title">Emitente</th>
                  <th className="text-left px-4 py-3 section-title">Motivo original</th>
                  <th className="text-left px-4 py-3 section-title">Recuperado em</th>
                  <th className="text-right px-4 py-3 section-title">Nominal</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {recuperados.map((cheque, idx) => (
                  <tr
                    key={cheque.id}
                    onClick={() => onVerDetalhe(cheque)}
                    className="cursor-pointer transition-colors duration-150"
                    style={{ borderTop: idx > 0 ? '1px solid var(--border-subtle)' : 'none' }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'var(--amber-dim)')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent')
                    }
                  >
                    <td className="px-4 py-3.5 font-mono text-xs font-medium" style={{ color: 'var(--text-faint)' }}>
                      #{cheque.numero}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium truncate max-w-[180px]" style={{ color: 'var(--text-primary)' }}>
                        {cheque.emitente}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {cheque.motivo_devolucao ? MOTIVO_LABELS[cheque.motivo_devolucao] : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs tabular" style={{ color: 'var(--text-muted)' }}>
                      {cheque.data_recuperacao ? formatarData(cheque.data_recuperacao) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular font-semibold" style={{ color: 'var(--amber)' }}>
                      {formatarMoeda(cheque.valor_nominal)}
                    </td>
                    <td className="px-4 py-3.5">
                      <ChevronRight size={14} style={{ color: 'var(--text-faint)' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ titulo, count, children }: { titulo: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{titulo}</h2>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium tabular"
          style={{ backgroundColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          {count}
        </span>
      </div>
      {children}
    </div>
  )
}

function EmptyState({ mensagem }: { mensagem: string }) {
  return (
    <div className="card p-8 text-center">
      <XCircle size={24} className="mx-auto mb-2 opacity-10" style={{ color: 'var(--text-muted)' }} />
      <p className="text-sm" style={{ color: 'var(--text-faint)' }}>{mensagem}</p>
    </div>
  )
}

