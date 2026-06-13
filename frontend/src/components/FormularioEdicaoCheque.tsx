import { useForm, useWatch } from 'react-hook-form'
import type { Cheque } from '../types/cheque'
import { validarCpfCnpj } from '../utils/formatters'
import { BANCOS } from '../utils/mockData'
import { ChequeCalculoPreview } from './ChequeCalculoPreview'

export type ChequeEdicaoData = {
  emitente: string
  cpf_cnpj: string
  banco: string
  agencia: string
  conta: string
  valor_nominal: number
  taxa_juros_mes: number
  data_emissao: string
  data_vencimento: string
  observacoes?: string
}

interface FormularioEdicaoChequeProps {
  cheque: Cheque
  onSalvar: (id: string, dados: ChequeEdicaoData) => Promise<void>
  onCancelar: () => void
  isLoading?: boolean
}

export function FormularioEdicaoCheque({
  cheque,
  onSalvar,
  onCancelar,
  isLoading,
}: FormularioEdicaoChequeProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ChequeEdicaoData>({
    defaultValues: {
      emitente: cheque.emitente,
      cpf_cnpj: cheque.cpf_cnpj,
      banco: cheque.banco,
      agencia: cheque.agencia,
      conta: cheque.conta,
      valor_nominal: cheque.valor_nominal,
      taxa_juros_mes: cheque.taxa_juros_mes,
      data_emissao: cheque.data_emissao,
      data_vencimento: cheque.data_vencimento,
      observacoes: cheque.observacoes ?? '',
    },
  })

  const valorNominal = useWatch({ control, name: 'valor_nominal' })
  const taxaJurosMes = useWatch({ control, name: 'taxa_juros_mes' })
  const dataEmissao = useWatch({ control, name: 'data_emissao' })
  const dataVencimento = useWatch({ control, name: 'data_vencimento' })

  const onSubmit = (dados: ChequeEdicaoData) => {
    onSalvar(cheque.id, dados)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

      {/* Número do cheque — somente leitura */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{
          backgroundColor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span className="text-xs font-medium" style={{ color: '#64748B' }}>
          Número do Cheque
        </span>
        <span
          className="font-mono text-sm font-semibold tracking-wider"
          style={{ color: '#94A3B8' }}
        >
          {cheque.numero}
        </span>
        <span
          className="ml-auto text-xs px-2 py-0.5 rounded-md"
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            color: '#475569',
          }}
        >
          não editável
        </span>
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
            <p className="text-xs mt-1" style={{ color: '#475569' }}>
              Ex: 3.3 = 3,3% ao mês
            </p>
          </Field>
        </div>
      </Secao>

      <Secao titulo="Datas">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Data de Emissão *" error={errors.data_emissao?.message}>
            <input
              type="date"
              {...register('data_emissao', { required: 'Data de emissão obrigatória' })}
              className="input tabular"
            />
          </Field>

          <Field label="Data de Vencimento *" error={errors.data_vencimento?.message}>
            <input
              type="date"
              {...register('data_vencimento', {
                required: 'Data de vencimento obrigatória',
                validate: (v) =>
                  !dataEmissao || !v || v >= dataEmissao || 'Vencimento não pode ser anterior à emissão',
              })}
              className="input tabular"
            />
          </Field>
        </div>

        <div className="mt-4">
          <ChequeCalculoPreview
            valorNominal={valorNominal}
            taxaJurosMes={taxaJurosMes}
            dataEmissao={dataEmissao}
            dataVencimento={dataVencimento}
          />
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
          {isLoading ? 'Salvando…' : 'Salvar Alterações'}
        </button>
      </div>
    </form>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div
      className="pt-5"
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
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
        <p className="text-xs mt-1" style={{ color: '#F87171' }}>
          {error}
        </p>
      )}
    </div>
  )
}
