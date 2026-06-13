import { calculateChequeDiscount } from '../utils/chequeCalculo'
import { formatarData, formatarMoeda, formatarPercentual } from '../utils/formatters'

interface ChequeCalculoPreviewProps {
  valorNominal?: number
  taxaJurosMes?: number
  dataEmissao?: string
  dataVencimento?: string
}

function causaAjuste(motivo: string | null): string {
  if (!motivo) return ''
  if (motivo.includes('sábado')) return 'sábado'
  if (motivo.includes('domingo')) return 'domingo'
  return 'feriado'
}

export function ChequeCalculoPreview({
  valorNominal,
  taxaJurosMes,
  dataEmissao,
  dataVencimento,
}: ChequeCalculoPreviewProps) {
  if (
    !valorNominal ||
    valorNominal <= 0 ||
    taxaJurosMes === undefined ||
    taxaJurosMes === null ||
    Number.isNaN(taxaJurosMes) ||
    taxaJurosMes < 0 ||
    !dataEmissao ||
    !dataVencimento
  ) {
    return null
  }

  const calculo = calculateChequeDiscount({
    nominalValue: valorNominal,
    monthlyInterestRatePercent: taxaJurosMes,
    issueDate: dataEmissao,
    dueDate: dataVencimento,
  })

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}
    >
      <p className="text-xs font-semibold mb-3" style={{ color: 'var(--accent)' }}>
        Pré-visualização do cálculo
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <PreviewItem label="Valor nominal" value={formatarMoeda(calculo.nominalValue)} />
        <PreviewItem label="Taxa mensal" value={`${formatarPercentual(calculo.monthlyInterestRatePercent)} a.m.`} />
        <PreviewItem label="Taxa diária" value={`${formatarPercentual(calculo.dailyInterestRatePercent)} a.d.`} />
        <PreviewItem label="Data de emissão" value={formatarData(calculo.issueDate)} />
        <PreviewItem label="Vencimento original" value={formatarData(calculo.originalDueDate)} />
        {calculo.wasDueDateAdjusted && (
          <PreviewItem label="Vencimento ajustado" value={formatarData(calculo.adjustedDueDate)} />
        )}
        <PreviewItem label="Dias corridos" value={String(calculo.calendarDays)} />
        <PreviewItem label="Dias úteis" value={String(calculo.businessDays)} />
        <PreviewItem label="Dias usados no cálculo" value={String(calculo.calculatedDays)} />
        <PreviewItem label="Valor do desconto" value={formatarMoeda(calculo.totalDiscountValue)} />
        <PreviewItem label="Valor líquido" value={formatarMoeda(calculo.netValue)} />
      </div>

      {calculo.wasDueDateAdjusted && (
        <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--warning)' }}>
          Vencimento original em {formatarData(calculo.originalDueDate)} caiu em {causaAjuste(calculo.dueDateAdjustmentReason)}.
          Pagamento ajustado para {formatarData(calculo.adjustedDueDate)}. O cálculo utilizará {calculo.calculatedDays} dias.
        </p>
      )}
    </div>
  )
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs" style={{ color: 'var(--text-faint)' }}>{label}</p>
      <p className="text-sm font-medium tabular" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  )
}
