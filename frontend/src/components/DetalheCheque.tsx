import { useState } from 'react'
import { X, CheckCircle2, XCircle, Calendar, Building2, CreditCard, RefreshCw, Pencil } from 'lucide-react'
import type { Cheque, ChequeStatus, MotivoDevolucao } from '../types/cheque'
import { StatusBadge } from './StatusBadge'
import { formatarMoeda, formatarData, formatarCpfCnpj } from '../utils/formatters'
import { calcularDiasCorreidos, calcularJuros, calcularValorLiquido } from '../utils/diasUteis'
import { proximaParcelaAberta } from '../utils/parcelamento'
import { BANCOS } from '../utils/mockData'

const MOTIVOS_DEVOLUCAO: Record<MotivoDevolucao, string> = {
  sem_fundos: 'Sem fundos',
  conta_encerrada: 'Conta encerrada',
  assinatura_divergente: 'Assinatura divergente',
  cheque_sustado: 'Cheque sustado',
  prescrito: 'Prescrito',
  outros: 'Outros',
}

interface DetalheChequeProps {
  cheque: Cheque
  onFechar: () => void
  onAtualizarStatus: (id: string, status: ChequeStatus, extra?: Partial<Cheque>) => void
  onRegistrarPagamento: (id: string, numeroParcela: number, dataPagamento: string) => void
  onEditar: (cheque: Cheque) => void
}

export function DetalheCheque({ cheque, onFechar, onAtualizarStatus, onRegistrarPagamento, onEditar }: DetalheChequeProps) {
  const [acao, setAcao] = useState<'compensar' | 'devolver' | 'parcela' | 'recuperar' | null>(null)
  const [motivoDevolucao, setMotivoDevolucao] = useState<MotivoDevolucao>('sem_fundos')
  const [dataAcao, setDataAcao] = useState(new Date().toISOString().split('T')[0])

  const hoje = new Date()
  const dataEntrada = new Date(cheque.data_entrada_custodia)

  // Fórmula correta: dias corridos / 30
  const diasCorridos = calcularDiasCorreidos(dataEntrada, hoje)
  const juros = calcularJuros(cheque.valor_nominal, cheque.taxa_juros_mes, diasCorridos)
  const valorLiquido = calcularValorLiquido(cheque.valor_nominal, juros)

  // Juros pós-devolução (correndo desde a data de devolução)
  const jurosPosDevolucao = (() => {
    if (cheque.status !== 'devolvido' || !cheque.data_devolucao) return 0
    const devolucao = new Date(cheque.data_devolucao)
    const dias = calcularDiasCorreidos(devolucao, hoje)
    return calcularJuros(cheque.valor_nominal, cheque.taxa_juros_mes, dias)
  })()

  // Para cheques compensados: juros do período de custódia
  const jurosCompensado = (() => {
    if (cheque.status !== 'compensado' || !cheque.data_compensacao) return 0
    const saida = new Date(cheque.data_compensacao)
    const dias = calcularDiasCorreidos(dataEntrada, saida)
    return calcularJuros(cheque.valor_nominal, cheque.taxa_juros_mes, dias)
  })()

  const proximaParcela = cheque.parcelas ? proximaParcelaAberta(cheque.parcelas) : undefined
  const ehParcelado = cheque.total_parcelas && cheque.total_parcelas > 1

  const handleCompensado = () => {
    onAtualizarStatus(cheque.id, 'compensado', { data_compensacao: dataAcao })
    onFechar()
  }

  const handleDevolvido = () => {
    onAtualizarStatus(cheque.id, 'devolvido', {
      data_devolucao: dataAcao,
      motivo_devolucao: motivoDevolucao,
    })
    onFechar()
  }

  const handleRecuperado = () => {
    onAtualizarStatus(cheque.id, 'recuperado', { data_recuperacao: dataAcao })
    onFechar()
  }

  const handlePagamentoParcela = () => {
    if (!proximaParcela) return
    onRegistrarPagamento(cheque.id, proximaParcela.numero, dataAcao)
    setAcao(null)
  }

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      style={{ backgroundColor: 'oklch(0% 0 0 / 0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div
        className="w-full sm:max-w-2xl sm:rounded-xl max-h-[95dvh] overflow-y-auto"
        style={{
          backgroundColor: 'var(--bg-raised)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 25px 60px oklch(0% 0 0 / 0.5)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between p-5 sticky top-0 z-10"
          style={{
            backgroundColor: 'var(--bg-raised)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Cheque <span className="font-mono">#{cheque.numero}</span>
              </h2>
              <StatusBadge status={cheque.status} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {cheque.emitente}
              {ehParcelado && (
                <span className="ml-2 text-xs tabular" style={{ color: 'var(--accent)' }}>
                  {cheque.parcelas_pagas}/{cheque.total_parcelas} parcelas pagas
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {cheque.status === 'em_custodia' && (
              <button
                onClick={() => onEditar(cheque)}
                className="p-1.5 rounded-lg transition-colors duration-150 flex items-center gap-1.5 text-xs font-medium px-2.5"
                style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'oklch(62% 0.22 255 / 0.18)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-dim)' }}
                aria-label="Editar cheque"
              >
                <Pencil size={13} /> Editar
              </button>
            )}
            <button
              onClick={onFechar}
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
        </div>

        <div className="p-5 space-y-5">

          {/* Dados */}
          <div>
            <p className="section-title mb-3">Dados do Cheque</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Info label="Emitente" value={cheque.emitente} full />
              <Info label="CPF / CNPJ" value={formatarCpfCnpj(cheque.cpf_cnpj)} />
              <Info
                label="Banco"
                value={`${cheque.banco} — ${BANCOS[cheque.banco] ?? cheque.banco}`}
              />
              <Info label="Agência / Conta" value={`${cheque.agencia} / ${cheque.conta}`} />
              <Info label="Valor Nominal" value={formatarMoeda(cheque.valor_nominal)} mono />
              <Info label="Taxa de Juros" value={`${cheque.taxa_juros_mes}% a.m.`} mono />
              <Info label="Emissão" value={formatarData(cheque.data_emissao)} mono />
              <Info label="Vencimento" value={formatarData(cheque.data_vencimento)} mono />
              <Info
                label="Entrada em Custódia"
                value={formatarData(cheque.data_entrada_custodia)}
                mono
              />
              {cheque.observacoes && (
                <Info label="Observações" value={cheque.observacoes} full />
              )}
            </div>
          </div>

          {/* Parcelamento */}
          {ehParcelado && cheque.parcelas && (
            <div
              className="rounded-xl p-4"
              style={{
                backgroundColor: 'var(--purple-dim)',
                border: '1px solid var(--purple-border)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="section-title" style={{ color: 'var(--purple)' }}>
                  Parcelamento
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ width: '80px', backgroundColor: 'var(--purple-dim)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${((cheque.parcelas_pagas ?? 0) / cheque.total_parcelas!) * 100}%`,
                        backgroundColor: 'var(--purple)',
                      }}
                    />
                  </div>
                  <span className="text-xs tabular" style={{ color: 'var(--purple)' }}>
                    {cheque.parcelas_pagas}/{cheque.total_parcelas}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {cheque.parcelas.map((p) => (
                  <div
                    key={p.numero}
                    className="flex items-center justify-between py-2 px-3 rounded-lg"
                    style={{
                      backgroundColor: p.pago ? 'var(--positive-dim)' : 'var(--border-subtle)',
                      border: p.pago ? '1px solid var(--positive-border)' : '1px solid var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xs tabular font-mono w-5 text-center"
                        style={{ color: p.pago ? 'var(--positive)' : 'var(--text-muted)' }}
                      >
                        {p.numero}ª
                      </span>
                      <span className="text-xs tabular" style={{ color: p.pago ? 'var(--positive)' : 'var(--text-secondary)' }}>
                        {formatarData(p.data_vencimento)}
                      </span>
                      {p.pago && p.data_pagamento && (
                        <span className="text-xs" style={{ color: 'var(--positive)', opacity: 0.7 }}>
                          · pago em {formatarData(p.data_pagamento)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs tabular font-medium"
                        style={{ color: p.pago ? 'var(--positive)' : 'var(--text-primary)' }}
                      >
                        {formatarMoeda(p.valor)}
                      </span>
                      {p.pago ? (
                        <CheckCircle2 size={14} style={{ color: 'var(--positive)' }} />
                      ) : (
                        <div
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ border: '1.5px solid var(--border-default)' }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posição atual — em custódia */}
          {cheque.status === 'em_custodia' && (
            <div
              className="rounded-xl p-4"
              style={{
                backgroundColor: 'var(--accent-dim)',
                border: '1px solid var(--accent-border)',
              }}
            >
              <p className="section-title mb-3" style={{ color: 'var(--accent)' }}>
                Posição Atual
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    Dias Corridos
                  </p>
                  <p className="tabular text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {diasCorridos}
                  </p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    Juros (desconto)
                  </p>
                  <p className="tabular text-2xl font-bold" style={{ color: 'var(--positive)' }}>
                    {formatarMoeda(juros)}
                  </p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    Valor Líquido
                  </p>
                  <p className="tabular text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {formatarMoeda(valorLiquido)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-center mt-3" style={{ color: 'var(--text-faint)' }}>
                Valor líquido = nominal − juros · Taxa: {cheque.taxa_juros_mes}% a.m. ÷ 30 dias
              </p>
            </div>
          )}

          {/* Status — compensado */}
          {cheque.status === 'compensado' && (
            <div
              className="rounded-xl p-4"
              style={{
                backgroundColor: 'var(--positive-dim)',
                border: '1px solid var(--positive-border)',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 size={18} className="shrink-0" style={{ color: 'var(--positive)' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--positive)' }}>
                    Cheque compensado
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--positive)', opacity: 0.8 }}>
                    Em {formatarData(cheque.data_compensacao!)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--positive-border)' }}>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Juros recebidos</p>
                  <p className="tabular font-semibold" style={{ color: 'var(--positive)' }}>{formatarMoeda(jurosCompensado)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Valor nominal recebido</p>
                  <p className="tabular font-semibold" style={{ color: 'var(--text-primary)' }}>{formatarMoeda(cheque.valor_nominal)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Status — devolvido */}
          {cheque.status === 'devolvido' && (
            <div
              className="rounded-xl p-4"
              style={{
                backgroundColor: 'var(--danger-dim)',
                border: '1px solid var(--danger-border)',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <XCircle size={18} className="shrink-0" style={{ color: 'var(--danger)' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
                    Cheque devolvido
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--danger)', opacity: 0.8 }}>
                    Em {formatarData(cheque.data_devolucao!)}
                    {cheque.motivo_devolucao && ` · ${MOTIVOS_DEVOLUCAO[cheque.motivo_devolucao]}`}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3" style={{ borderTop: '1px solid var(--danger-border)' }}>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Risco/Prejuízo atual</p>
                  <p className="tabular font-semibold" style={{ color: 'var(--danger)' }}>
                    {formatarMoeda(cheque.valor_nominal + jurosPosDevolucao)}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Juros pós-devolução</p>
                  <p className="tabular font-semibold" style={{ color: 'var(--danger)' }}>
                    +{formatarMoeda(jurosPosDevolucao)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status — recuperado */}
          {cheque.status === 'recuperado' && (
            <div
              className="rounded-xl p-4"
              style={{
                backgroundColor: 'var(--amber-dim)',
                border: '1px solid var(--amber-border)',
              }}
            >
              <div className="flex items-center gap-3">
                <RefreshCw size={18} className="shrink-0" style={{ color: 'var(--amber)' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--amber)' }}>
                    Cheque recuperado
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--amber)', opacity: 0.8 }}>
                    Em {cheque.data_recuperacao ? formatarData(cheque.data_recuperacao) : '—'}
                    {cheque.motivo_devolucao && ` · Motivo original: ${MOTIVOS_DEVOLUCAO[cheque.motivo_devolucao]}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ações — em custódia */}
          {cheque.status === 'em_custodia' && !acao && (
            <div className="flex gap-3 flex-wrap">
              {ehParcelado && proximaParcela && (
                <button
                  onClick={() => setAcao('parcela')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white rounded-lg transition-colors duration-150"
                  style={{ backgroundColor: 'var(--purple)', color: 'var(--bg-base)' }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.opacity = '0.88')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.opacity = '1')
                  }
                >
                  <CreditCard size={15} />
                  Registrar Parcela {proximaParcela.numero}
                </button>
              )}
              {!ehParcelado && (
                <button
                  onClick={() => setAcao('compensar')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white rounded-lg transition-colors duration-150"
                  style={{ backgroundColor: 'var(--positive)', color: 'var(--bg-base)' }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.opacity = '0.88')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.opacity = '1')
                  }
                >
                  <CheckCircle2 size={15} />
                  Registrar Compensação
                </button>
              )}
              <button
                onClick={() => setAcao('devolver')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white rounded-lg transition-colors duration-150"
                style={{ backgroundColor: 'var(--danger)', color: 'var(--bg-base)' }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.opacity = '0.88')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.opacity = '1')
                }
              >
                <XCircle size={15} />
                Registrar Devolução
              </button>
            </div>
          )}

          {/* Ação — recuperar (só para devolvidos) */}
          {cheque.status === 'devolvido' && !acao && (
            <button
              onClick={() => setAcao('recuperar')}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white rounded-lg transition-colors duration-150"
              style={{ backgroundColor: 'var(--amber)', color: 'var(--bg-base)' }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.opacity = '0.88')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.opacity = '1')
              }
            >
              <RefreshCw size={15} />
              Registrar Recuperação
            </button>
          )}

          {/* Painel — parcela */}
          {acao === 'parcela' && proximaParcela && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{
                backgroundColor: 'var(--purple-dim)',
                border: '1px solid var(--purple-border)',
              }}
            >
              <p className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--purple)' }}>
                <CreditCard size={14} /> Confirmar Parcela {proximaParcela.numero} de {cheque.total_parcelas}
              </p>
              <div className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--purple-dim)' }}>
                <span className="text-xs" style={{ color: 'var(--purple)' }}>Valor:</span>
                <span className="text-sm font-semibold tabular" style={{ color: 'var(--text-primary)' }}>
                  {formatarMoeda(proximaParcela.valor)}
                </span>
                <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
                  Vencimento: {formatarData(proximaParcela.data_vencimento)}
                </span>
              </div>
              <div>
                <label className="label">Data do Pagamento</label>
                <input
                  type="date"
                  value={dataAcao}
                  onChange={(e) => setDataAcao(e.target.value)}
                  className="input tabular"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePagamentoParcela}
                  className="btn-primary"
                  style={{ backgroundColor: 'var(--purple)', boxShadow: 'none' }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.opacity = '0.88')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.opacity = '1')
                  }
                >
                  <CheckCircle2 size={14} /> Confirmar Pagamento
                </button>
                <button onClick={() => setAcao(null)} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Painel — compensar */}
          {acao === 'compensar' && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{
                backgroundColor: 'var(--positive-dim)',
                border: '1px solid var(--positive-border)',
              }}
            >
              <p className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--positive)' }}>
                <Calendar size={14} /> Confirmar Compensação
              </p>
              <div>
                <label className="label">Data de Compensação</label>
                <input
                  type="date"
                  value={dataAcao}
                  onChange={(e) => setDataAcao(e.target.value)}
                  className="input tabular"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCompensado}
                  className="btn-primary"
                  style={{ backgroundColor: 'var(--positive)', boxShadow: 'none' }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.opacity = '0.88')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.opacity = '1')
                  }
                >
                  <CheckCircle2 size={14} /> Confirmar
                </button>
                <button onClick={() => setAcao(null)} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Painel — devolver */}
          {acao === 'devolver' && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{
                backgroundColor: 'var(--danger-dim)',
                border: '1px solid var(--danger-border)',
              }}
            >
              <p className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--danger)' }}>
                <Building2 size={14} /> Registrar Devolução
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Data de Devolução</label>
                  <input
                    type="date"
                    value={dataAcao}
                    onChange={(e) => setDataAcao(e.target.value)}
                    className="input tabular"
                  />
                </div>
                <div>
                  <label className="label">Motivo</label>
                  <select
                    value={motivoDevolucao}
                    onChange={(e) => setMotivoDevolucao(e.target.value as MotivoDevolucao)}
                    className="input"
                  >
                    {Object.entries(MOTIVOS_DEVOLUCAO).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleDevolvido} className="btn-danger">
                  <XCircle size={14} /> Confirmar Devolução
                </button>
                <button onClick={() => setAcao(null)} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Painel — recuperar */}
          {acao === 'recuperar' && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{
                backgroundColor: 'var(--amber-dim)',
                border: '1px solid var(--amber-border)',
              }}
            >
              <p className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--amber)' }}>
                <RefreshCw size={14} /> Registrar Recuperação
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Ao registrar a recuperação, o cheque sai do risco e o prejuízo é encerrado.
              </p>
              <div>
                <label className="label">Data de Recuperação</label>
                <input
                  type="date"
                  value={dataAcao}
                  onChange={(e) => setDataAcao(e.target.value)}
                  className="input tabular"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRecuperado}
                  className="btn-primary"
                  style={{ backgroundColor: 'var(--amber)', boxShadow: 'none', color: 'var(--bg-base)' }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.opacity = '0.88')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.opacity = '1')
                  }
                >
                  <RefreshCw size={14} /> Confirmar Recuperação
                </button>
                <button onClick={() => setAcao(null)} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface InfoProps {
  label: string
  value: string
  full?: boolean
  mono?: boolean
}

function Info({ label, value, full, mono }: InfoProps) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
        {label}
      </p>
      <p
        className={`text-sm font-medium mt-0.5 ${mono ? 'tabular font-mono' : ''}`}
        style={{ color: 'var(--text-secondary)' }}
      >
        {value}
      </p>
    </div>
  )
}
