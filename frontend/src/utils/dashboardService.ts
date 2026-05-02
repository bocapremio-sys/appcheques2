import type { Cheque, DashboardMetrics } from '../types/cheque'
import { calcularDiasCorreidos, calcularJuros } from './diasUteis'

function isMesAtual(dataStr: string): boolean {
  const data = new Date(dataStr)
  const hoje = new Date()
  return data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear()
}

function isVencido(dataVencimento: string): boolean {
  return new Date(dataVencimento) < new Date(new Date().toDateString())
}

// Calcula juros de custódia: da entrada até a saída (compensação ou devolução)
function jurosNoPeriodo(cheque: Cheque, dataFim: Date): number {
  const entrada = new Date(cheque.data_entrada_custodia)
  const dias = calcularDiasCorreidos(entrada, dataFim)
  return calcularJuros(cheque.valor_nominal, cheque.taxa_juros_mes, dias)
}

// Para devolvidos: juros continuam acumulando pós-devolução até recuperação ou hoje
function jurosPosDevolucao(cheque: Cheque): number {
  if (cheque.status !== 'devolvido' || !cheque.data_devolucao) return 0
  const devolucao = new Date(cheque.data_devolucao)
  const fim = new Date()
  const dias = calcularDiasCorreidos(devolucao, fim)
  return calcularJuros(cheque.valor_nominal, cheque.taxa_juros_mes, dias)
}

export function calcularMetricasDashboard(cheques: Cheque[]): DashboardMetrics {
  const hoje = new Date()

  const emCustodia = cheques.filter((c) => c.status === 'em_custodia')
  const compensados = cheques.filter((c) => c.status === 'compensado')
  const devolvidos = cheques.filter((c) => c.status === 'devolvido')
  const recuperados = cheques.filter((c) => c.status === 'recuperado')
  const cancelados = cheques.filter((c) => c.status === 'cancelado')

  // Custódia atual: juros correndo desde a entrada (dias corridos)
  const valorTotalCustodia = emCustodia.reduce((acc, c) => acc + c.valor_nominal, 0)
  const jurosProjetados = emCustodia.reduce((acc, c) => {
    return acc + jurosNoPeriodo(c, hoje)
  }, 0)

  // Cheques vencidos em custódia
  const chequesVencidos = emCustodia.filter((c) => isVencido(c.data_vencimento))
  const valorVencido = chequesVencidos.reduce((acc, c) => acc + c.valor_nominal, 0)

  // Lucro: juros recebidos nos compensados (da entrada até compensação)
  const lucroTotal = compensados.reduce((acc, c) => {
    const saida = c.data_compensacao ? new Date(c.data_compensacao) : hoje
    return acc + jurosNoPeriodo(c, saida)
  }, 0)

  // Lucro dos recuperados: juros cobrados no período de custódia + pós-devolução
  const lucroRecuperados = recuperados.reduce((acc, c) => {
    const saida = c.data_recuperacao ? new Date(c.data_recuperacao) : hoje
    return acc + jurosNoPeriodo(c, saida)
  }, 0)

  // Prejuízo: valor nominal dos devolvidos não recuperados + juros pós-devolução acumulando
  const prejuizoTotal = devolvidos.reduce((acc, c) => {
    return acc + c.valor_nominal + jurosPosDevolucao(c)
  }, 0)

  // Mês atual
  const compensadosMes = compensados.filter(
    (c) => c.data_compensacao && isMesAtual(c.data_compensacao)
  )
  const devolvidosMes = devolvidos.filter(
    (c) => c.data_devolucao && isMesAtual(c.data_devolucao)
  )

  const lucroMes = compensadosMes.reduce((acc, c) => {
    const saida = new Date(c.data_compensacao!)
    return acc + jurosNoPeriodo(c, saida)
  }, 0)

  const prejuizoMes = devolvidosMes.reduce((acc, c) => {
    return acc + c.valor_nominal + jurosPosDevolucao(c)
  }, 0)

  // Taxas operacionais
  const totalFinalizados = compensados.length + devolvidos.length + recuperados.length
  const taxaInadimplencia =
    totalFinalizados > 0 ? (devolvidos.length / totalFinalizados) * 100 : 0
  const taxaCompensacao =
    totalFinalizados > 0 ? ((compensados.length + recuperados.length) / totalFinalizados) * 100 : 0

  // Tempo médio em custódia (dias corridos dos compensados)
  const tempoMedioDias =
    compensados.length > 0
      ? compensados.reduce((acc, c) => {
          const entrada = new Date(c.data_entrada_custodia)
          const saida = c.data_compensacao ? new Date(c.data_compensacao) : hoje
          return acc + calcularDiasCorreidos(entrada, saida)
        }, 0) / compensados.length
      : 0

  // Motivos de devolução
  const motivosDevolucao = [...devolvidos, ...recuperados].reduce<Record<string, number>>((acc, c) => {
    const motivo = c.motivo_devolucao ?? 'outros'
    return { ...acc, [motivo]: (acc[motivo] ?? 0) + 1 }
  }, {})

  // Capital
  const capitalTotalDesembolsado = [...compensados, ...devolvidos, ...recuperados].reduce(
    (acc, c) => acc + c.valor_nominal,
    0
  )
  const capitalRetornado = compensados.reduce((acc, c) => {
    // valor nominal menos os juros cobrados (o emitente pagou o nominal, recebemos o nominal - juros na entrada)
    // Retorno = o que realmente recebemos = valor_nominal (pois o desconto já foi cobrado na entrada)
    return acc + c.valor_nominal
  }, 0) + lucroRecuperados
  const capitalEmRisco = valorTotalCustodia + devolvidos.reduce((acc, c) => acc + c.valor_nominal, 0)

  return {
    total_cheques: cheques.length,
    em_custodia: emCustodia.length,
    compensados: compensados.length,
    devolvidos: devolvidos.length,
    recuperados: recuperados.length,
    cancelados: cancelados.length,

    capital_total_desembolsado: capitalTotalDesembolsado,
    capital_retornado: capitalRetornado,
    capital_em_risco: capitalEmRisco,

    valor_total_custodia: valorTotalCustodia,
    juros_projetados_custodia: jurosProjetados,
    valor_total_com_juros: valorTotalCustodia - jurosProjetados,

    lucro_total: lucroTotal + lucroRecuperados,
    prejuizo_total: prejuizoTotal,
    resultado_liquido_total: lucroTotal + lucroRecuperados - prejuizoTotal,

    lucro_mes: lucroMes,
    prejuizo_mes: prejuizoMes,
    resultado_liquido_mes: lucroMes - prejuizoMes,

    taxa_inadimplencia: taxaInadimplencia,
    taxa_compensacao: taxaCompensacao,
    tempo_medio_custodia_dias: Math.round(tempoMedioDias),
    cheques_vencidos: chequesVencidos.length,
    valor_vencido: valorVencido,

    motivos_devolucao: motivosDevolucao,
  }
}
