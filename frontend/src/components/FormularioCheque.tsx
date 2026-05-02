import { useForm, useWatch } from 'react-hook-form'
import { UserCheck, UserPlus } from 'lucide-react'
import { useState } from 'react'
import type { ChequeFormData, Emitente } from '../types/cheque'
import { validarCpfCnpj } from '../utils/formatters'
import { BANCOS } from '../utils/mockData'
import { gerarParcelas } from '../utils/parcelamento'
import { formatarData, formatarMoeda } from '../utils/formatters'

interface FormularioChequeProps {
  onSubmit: (dados: ChequeFormData) => void
  onCancelar: () => void
  emitentes: Emitente[]
  isLoading?: boolean
}

export function FormularioCheque({ onSubmit, onCancelar, emitentes, isLoading }: FormularioChequeProps) {
  const [modoEmitente, setModoEmitente] = useState<'selecionar' | 'novo'>(
    emitentes.length > 0 ? 'selecionar' : 'novo'
  )

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ChequeFormData>({
    defaultValues: {
      data_entrada_custodia: new Date().toISOString().split('T')[0],
      taxa_juros_mes: 3.3,
      total_parcelas: 1,
    },
  })

  const hoje = new Date().toISOString().split('T')[0]

  const valorNominal = useWatch({ control, name: 'valor_nominal' })
  const totalParcelas = useWatch({ control, name: 'total_parcelas' })
  const dataEntrada = useWatch({ control, name: 'data_entrada_custodia' })

  const previewParcelas =
    totalParcelas && totalParcelas > 1 && valorNominal > 0 && dataEntrada
      ? gerarParcelas(valorNominal, totalParcelas, new Date(dataEntrada))
      : null

  const aplicarEmitente = (id: string) => {
    const e = emitentes.find((em) => em.id === id)
    if (!e) return
    setValue('emitente', e.nome)
    setValue('cpf_cnpj', e.cpf_cnpj)
    setValue('banco', e.banco)
    setValue('agencia', e.agencia)
    setValue('conta', e.conta)
    setValue('taxa_juros_mes', e.taxa_juros_mes)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

      {/* Emitente — selecionar ou novo */}
      <div>
        <p className="section-title mb-3">Emitente</p>
        <div className="flex gap-2 mb-3">
          {emitentes.length > 0 && (
            <button
              type="button"
              onClick={() => setModoEmitente('selecionar')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={
                modoEmitente === 'selecionar'
                  ? { backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }
                  : { backgroundColor: 'var(--border-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }
              }
            >
              <UserCheck size={13} /> Perfil salvo
            </button>
          )}
          <button
            type="button"
            onClick={() => setModoEmitente('novo')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={
              modoEmitente === 'novo'
                ? { backgroundColor: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }
                : { backgroundColor: 'var(--border-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }
            }
          >
            <UserPlus size={13} /> Preencher manual
          </button>
        </div>

        {modoEmitente === 'selecionar' && emitentes.length > 0 && (
          <div className="space-y-2">
            <label className="label">Selecione o perfil</label>
            <select
              className="input"
              onChange={(e) => aplicarEmitente(e.target.value)}
              defaultValue=""
            >
              <option value="" disabled>Escolha um emitente…</option>
              {emitentes.map((em) => (
                <option key={em.id} value={em.id}>
                  {em.nome} — {em.cpf_cnpj}
                </option>
              ))}
            </select>
            <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
              Os campos abaixo serão preenchidos automaticamente. Você pode editar depois.
            </p>
          </div>
        )}
      </div>

      <Secao titulo="Identificação">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Emitente *" error={errors.emitente?.message} className="sm:col-span-2">
            <input
              {...register('emitente', { required: 'Nome do emitente obrigatório' })}
              className="input"
              placeholder="Nome completo ou razão social"
            />
          </Field>

          <Field label="CPF / CNPJ *" error={errors.cpf_cnpj?.message}>
            <input
              {...register('cpf_cnpj', {
                required: 'CPF ou CNPJ obrigatório',
                validate: (v) => validarCpfCnpj(v) || 'CPF ou CNPJ inválido',
              })}
              className="input tabular"
              placeholder="000.000.000-00"
            />
          </Field>

          <Field label="Número do Cheque *" error={errors.numero?.message}>
            <input
              {...register('numero', {
                required: 'Número obrigatório',
                pattern: { value: /^\d{6,10}$/, message: '6 a 10 dígitos numéricos' },
              })}
              className="input font-mono"
              placeholder="000001"
            />
          </Field>
        </div>
      </Secao>

      <Secao titulo="Dados Bancários">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Banco *" error={errors.banco?.message} className="sm:col-span-1">
            <select
              {...register('banco', { required: 'Banco obrigatório' })}
              className="input"
            >
              <option value="">Selecione…</option>
              {Object.entries(BANCOS).map(([codigo, nome]) => (
                <option key={codigo} value={codigo}>
                  {codigo} — {nome}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Agência *" error={errors.agencia?.message}>
            <input
              {...register('agencia', {
                required: 'Agência obrigatória',
                pattern: { value: /^\d{4}$/, message: '4 dígitos' },
              })}
              className="input tabular"
              placeholder="0000"
              maxLength={4}
            />
          </Field>

          <Field label="Conta *" error={errors.conta?.message}>
            <input
              {...register('conta', { required: 'Conta obrigatória' })}
              className="input tabular"
              placeholder="00000-0"
            />
          </Field>
        </div>
      </Secao>

      <Secao titulo="Valores e Condições">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Valor Nominal (R$) *" error={errors.valor_nominal?.message}>
            <input
              type="number"
              step="0.01"
              min="0.01"
              {...register('valor_nominal', {
                required: 'Valor obrigatório',
                min: { value: 0.01, message: 'Deve ser maior que zero' },
                valueAsNumber: true,
              })}
              className="input tabular"
              placeholder="0,00"
            />
          </Field>

          <Field label="Taxa de Juros (% ao mês) *" error={errors.taxa_juros_mes?.message}>
            <input
              type="number"
              step="0.1"
              min="0"
              {...register('taxa_juros_mes', {
                required: 'Taxa obrigatória',
                min: { value: 0, message: 'Não pode ser negativa' },
                valueAsNumber: true,
              })}
              className="input tabular"
              placeholder="3.3"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>
              Ex: 3.3 = 3,3% ao mês · distribuído em dias úteis
            </p>
          </Field>

          <Field label="Parcelamento" className="sm:col-span-2">
            <div className="flex items-center gap-3">
              <select
                {...register('total_parcelas', { valueAsNumber: true })}
                className="input"
                style={{ maxWidth: '180px' }}
              >
                <option value={1}>À vista (1x)</option>
                {[2,3,4,5,6,7,8,9,10,11,12].map((n) => (
                  <option key={n} value={n}>{n}x sem juros adicionais</option>
                ))}
              </select>
              {totalParcelas && totalParcelas > 1 && valorNominal > 0 && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatarMoeda(Math.round((valorNominal / totalParcelas) * 100) / 100)} / parcela
                </p>
              )}
            </div>
          </Field>
        </div>

        {/* Preview das parcelas */}
        {previewParcelas && (
          <div
            className="mt-3 rounded-xl p-3"
            style={{
              backgroundColor: 'var(--accent-dim)',
              border: '1px solid var(--accent-dim)',
            }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--accent)' }}>
              Datas de vencimento (dias úteis)
            </p>
            <div className="flex flex-wrap gap-2">
              {previewParcelas.map((p) => (
                <div
                  key={p.numero}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                  style={{
                    backgroundColor: 'var(--accent-dim)',
                    border: '1px solid var(--accent-dim)',
                  }}
                >
                  <span className="text-xs tabular" style={{ color: 'var(--text-secondary)' }}>
                    {p.numero}ª
                  </span>
                  <span className="text-xs tabular font-medium" style={{ color: 'var(--text-primary)' }}>
                    {formatarData(p.data_vencimento)}
                  </span>
                  <span className="text-xs tabular" style={{ color: 'var(--text-muted)' }}>
                    {formatarMoeda(p.valor)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Secao>

      <Secao titulo="Datas">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Data de Emissão *" error={errors.data_emissao?.message}>
            <input
              type="date"
              max={hoje}
              {...register('data_emissao', { required: 'Data de emissão obrigatória' })}
              className="input tabular"
            />
          </Field>

          <Field label="Data de Vencimento *" error={errors.data_vencimento?.message}>
            <input
              type="date"
              {...register('data_vencimento', { required: 'Data de vencimento obrigatória' })}
              className="input tabular"
            />
          </Field>

          <Field label="Entrada em Custódia *" error={errors.data_entrada_custodia?.message}>
            <input
              type="date"
              max={hoje}
              {...register('data_entrada_custodia', { required: 'Data de entrada obrigatória' })}
              className="input tabular"
            />
          </Field>
        </div>
      </Secao>

      <Field label="Observações">
        <textarea
          {...register('observacoes')}
          rows={2}
          className="input resize-none"
          placeholder="Informações adicionais sobre este cheque…"
        />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancelar} className="btn-secondary">
          Cancelar
        </button>
        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading ? 'Salvando…' : 'Cadastrar Cheque'}
        </button>
      </div>
    </form>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div
      className="pt-5"
      style={{ borderTop: '1px solid var(--border-subtle)' }}
    >
      <p className="section-title mb-3">{titulo}</p>
      {children}
    </div>
  )
}

interface FieldProps {
  label?: string
  error?: string
  children: React.ReactNode
  className?: string
}

function Field({ label, error, children, className }: FieldProps) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {error && (
        <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
