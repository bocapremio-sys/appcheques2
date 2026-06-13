import type { Cheque, ChequeStatus, DashboardChequeLinha, DashboardMetrics, DashboardStatusResumo } from '../types/cheque'
import { calculateChequeDiscount, parseISODate } from './chequeCalculo'

const STATUSES: ChequeStatus[] = ['em_custodia', 'compensado', 'devolvido', 'recuperado', 'cancelado']

function arredondar(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100 || 0
}

function somar(valores: number[]): number {
  return arredondar(valores.reduce((acc, v) => acc + v, 0))
}

// Cria a linha de cheque para a dashboard, usando a função central de cálculo
// (mesma fonte de verdade usada no cadastro e no detalhe do cheque).
function criarLinha(cheque: Cheque): DashboardChequeLinha {
  const calculo = calculateChequeDiscount({
    nominalValue: cheque.valor_nominal,
    monthlyInterestRatePercent: cheque.taxa_juros_mes,
    issueDate: cheque.data_emissao,
    dueDate: cheque.data_vencimento,
  })

  return {
    id: cheque.id,
    numero: cheque.numero,
    emitente: cheque.emitente,
    banco: cheque.banco,
    valorNominal: calculo.nominalValue,
    taxaMensalPercent: calculo.monthlyInterestRatePercent,
    taxaDiariaPercent: calculo.dailyInterestRatePercent,
    valorMes: calculo.monthlyDiscountValue,
    valorDia: calculo.dailyDiscountValue,
    dataEmissao: calculo.issueDate,
    vencimentoOriginal: calculo.originalDueDate,
    vencimentoAjustado: calculo.adjustedDueDate,
    vencimentoFoiAjustado: calculo.wasDueDateAdjusted,
    motivoAjusteVencimento: calculo.dueDateAdjustmentReason,
    diasCalculo: calculo.calculatedDays,
    desconto: calculo.totalDiscountValue,
    valorLiquido: calculo.netValue,
    status: cheque.status,
  }
}

export function calcularMetricasDashboard(cheques: Cheque[]): DashboardMetrics {
  const linhas = cheques.map(criarLinha)

  const totalNominal = somar(linhas.map((l) => l.valorNominal))
  const totalDesconto = somar(linhas.map((l) => l.desconto))
  const totalLiquido = somar(linhas.map((l) => l.valorLiquido))
  const quantidadeCheques = linhas.length
  const descontoMedio = quantidadeCheques > 0 ? arredondar(totalDesconto / quantidadeCheques) : 0

  const porStatus = STATUSES.reduce((acc, status) => {
    const doStatus = linhas.filter((l) => l.status === status)
    acc[status] = {
      quantidade: doStatus.length,
      valorNominal: somar(doStatus.map((l) => l.valorNominal)),
    }
    return acc
  }, {} as Record<ChequeStatus, DashboardStatusResumo>)

  const proximosVencimentos = linhas
    .filter((l) => l.status === 'em_custodia')
    .sort((a, b) => parseISODate(a.vencimentoAjustado).getTime() - parseISODate(b.vencimentoAjustado).getTime())

  const chequesComVencimentoAjustado = linhas.filter((l) => l.vencimentoFoiAjustado)

  return {
    totalNominal,
    totalDesconto,
    totalLiquido,
    quantidadeCheques,
    descontoMedio,
    porStatus,
    proximosVencimentos,
    chequesComVencimentoAjustado,
    quantidadeChequesAjustados: chequesComVencimentoAjustado.length,
    linhas,
  }
}
