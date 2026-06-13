import { useState, useMemo } from 'react'
import { Plus, Search, SlidersHorizontal, ChevronRight } from 'lucide-react'
import type { Cheque, ChequeStatus } from '../types/cheque'
import { StatusBadge } from '../components/StatusBadge'
import { formatarMoeda, formatarData, formatarCpfCnpj } from '../utils/formatters'
import { BANCOS } from '../utils/mockData'

type FiltroStatus = ChequeStatus | 'todos'
// ChequeStatus já inclui 'recuperado' após a atualização dos tipos

const FILTROS: { label: string; value: FiltroStatus }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Em Custódia', value: 'em_custodia' },
  { label: 'Compensados', value: 'compensado' },
  { label: 'Devolvidos', value: 'devolvido' },
  { label: 'Recuperados', value: 'recuperado' },
  { label: 'Cancelados', value: 'cancelado' },
]

interface ListaChequesProps {
  cheques: Cheque[]
  onNovoCheque: () => void
  onVerDetalhe: (cheque: Cheque) => void
}

export function ListaCheques({ cheques, onNovoCheque, onVerDetalhe }: ListaChequesProps) {
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')

  const chequesFiltrados = useMemo(() => {
    return cheques.filter((c) => {
      const matchStatus = filtroStatus === 'todos' || c.status === filtroStatus
      const termo = busca.toLowerCase().trim()
      const matchBusca =
        !termo ||
        c.emitente.toLowerCase().includes(termo) ||
        c.numero.includes(termo) ||
        c.cpf_cnpj.replace(/\D/g, '').includes(busca.replace(/\D/g, ''))
      return matchStatus && matchBusca
    })
  }, [cheques, busca, filtroStatus])

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-faint)' }}
          />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por emitente, número ou CPF/CNPJ…"
            className="input pl-9"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal size={14} style={{ color: 'var(--text-faint)' }} />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
            className="input w-auto"
          >
            {FILTROS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        <button onClick={onNovoCheque} className="btn-primary shrink-0">
          <Plus size={15} />
          Novo Cheque
        </button>
      </div>

      {/* Filtros rápidos — pills */}
      <div className="flex gap-2 flex-wrap">
        {FILTROS.map((f) => {
          const count =
            f.value === 'todos'
              ? cheques.length
              : cheques.filter((c) => c.status === f.value).length
          const isActive = filtroStatus === f.value
          return (
            <button
              key={f.value}
              onClick={() => setFiltroStatus(f.value)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 ease-out"
              style={
                isActive
                  ? {
                      backgroundColor: 'var(--accent-dim)',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent-border)',
                    }
                  : {
                      backgroundColor: 'transparent',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
                }
              }}
            >
              {f.label} <span style={{ opacity: 0.6 }}>({count})</span>
            </button>
          )
        })}
      </div>

      {/* Conteúdo */}
      {chequesFiltrados.length === 0 ? (
        <div className="card p-10 text-center">
          <Search size={28} className="mx-auto mb-3 opacity-10" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            Nenhum cheque encontrado
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
            Tente ajustar os filtros ou a busca.
          </p>
          <button onClick={onNovoCheque} className="btn-primary mt-4 mx-auto">
            <Plus size={14} /> Cadastrar Cheque
          </button>
        </div>
      ) : (
        <>
          {/* Desktop — tabela */}
          <div
            className="card overflow-hidden hidden md:block"
          >
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--bg-raised)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <th className="text-left px-4 py-3 section-title">Número</th>
                  <th className="text-left px-4 py-3 section-title">Emitente</th>
                  <th className="text-left px-4 py-3 section-title">Banco</th>
                  <th className="text-right px-4 py-3 section-title">Valor</th>
                  <th className="text-left px-4 py-3 section-title">Vencimento</th>
                  <th className="text-left px-4 py-3 section-title">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {chequesFiltrados.map((cheque, idx) => (
                  <tr
                    key={cheque.id}
                    onClick={() => onVerDetalhe(cheque)}
                    className="cursor-pointer transition-colors duration-150 ease-out group"
                    style={{
                      borderTop: idx > 0 ? '1px solid var(--border-subtle)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                        'var(--bg-overlay)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'
                    }}
                  >
                    <td
                      className="px-4 py-3.5 font-mono text-xs font-medium"
                      style={{ color: 'var(--text-faint)' }}
                    >
                      #{cheque.numero}
                    </td>
                    <td className="px-4 py-3.5">
                      <p
                        className="font-medium truncate max-w-[180px]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {cheque.emitente}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
                        {formatarCpfCnpj(cheque.cpf_cnpj)}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {BANCOS[cheque.banco] ?? cheque.banco}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="tabular font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {formatarMoeda(cheque.valor_nominal)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs tabular" style={{ color: 'var(--text-muted)' }}>
                      {formatarData(cheque.data_vencimento)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={cheque.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <ChevronRight
                        size={14}
                        className="transition-colors duration-150"
                        style={{ color: 'var(--text-faint)' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile — lista de cards */}
          <div className="space-y-2 md:hidden">
            {chequesFiltrados.map((cheque) => (
              <div
                key={cheque.id}
                onClick={() => onVerDetalhe(cheque)}
                className="card p-4 cursor-pointer transition-colors duration-150 ease-out"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-default)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)'
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {cheque.emitente}
                    </p>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-faint)' }}>
                      #{cheque.numero}
                    </p>
                  </div>
                  <StatusBadge status={cheque.status} />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="tabular font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {formatarMoeda(cheque.valor_nominal)}
                  </span>
                  <span className="text-xs tabular" style={{ color: 'var(--text-muted)' }}>
                    Venc. {formatarData(cheque.data_vencimento)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-xs text-right" style={{ color: 'var(--text-faint)' }}>
        Exibindo {chequesFiltrados.length} de {cheques.length} cheque(s)
      </p>
    </div>
  )
}
