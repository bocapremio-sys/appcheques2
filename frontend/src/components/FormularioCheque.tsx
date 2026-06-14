import { useForm, useWatch } from 'react-hook-form'
import { UserCheck, UserPlus } from 'lucide-react'
import { useState } from 'react'
import type { ChequeFormData, Emitente } from '../types/cheque'
import { validarCpfCnpj } from '../utils/formatters'
import { BANCOS } from '../utils/mockData'
import { ChequeCalculoPreview } from './ChequeCalculoPreview'
import { formatISODate } from '../utils/chequeCalculo'

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
      data_emissao: formatISODate(new Date()),
      taxa_juros_mes: 3.3,
    },
  })

  const valorNominal = useWatch({ control, name: 'valor_nominal' })
  const taxaJurosMes = useWatch({ control, name: 'taxa_juros_mes' })
  const dataEmissao = useWatch({ control, name: 'data_emissao' })
  const dataVencimento = useWatch({ control, name: 'data_vencimento' })

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
                  !dataEmissao || !v || v > dataEmissao || 'Vencimento deve ser posterior à data de emissão',
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
