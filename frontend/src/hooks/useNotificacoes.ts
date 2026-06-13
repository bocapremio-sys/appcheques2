import { useMemo } from 'react'
import type { Cheque } from '../types/cheque'
import { parseISODate } from '../utils/chequeCalculo'

export type TipoNotificacao = 'vence_hoje' | 'vence_amanha' | 'vence_em_breve' | 'vencido'

export interface Notificacao {
  id: string
  tipo: TipoNotificacao
  cheque: Cheque
  diasRestantes: number
  mensagem: string
}

const formatarMoeda = (valor: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

function resolverTipo(diasRestantes: number): TipoNotificacao | null {
  if (diasRestantes < 0) return 'vencido'
  if (diasRestantes === 0) return 'vence_hoje'
  if (diasRestantes === 1) return 'vence_amanha'
  if (diasRestantes <= 7) return 'vence_em_breve'
  return null
}

function construirMensagem(tipo: TipoNotificacao, diasRestantes: number, valor: number): string {
  const moeda = formatarMoeda(valor)
  const diasAbsolutos = Math.abs(diasRestantes)

  switch (tipo) {
    case 'vencido':
      return `Vencido há ${diasAbsolutos} ${diasAbsolutos === 1 ? 'dia' : 'dias'} — ${moeda}`
    case 'vence_hoje':
      return `Vence hoje — ${moeda}`
    case 'vence_amanha':
      return `Vence amanhã — ${moeda}`
    case 'vence_em_breve':
      return `Vence em ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'} — ${moeda}`
  }
}

function calcularPrioridade(tipo: TipoNotificacao): number {
  switch (tipo) {
    case 'vencido': return 0
    case 'vence_hoje': return 1
    case 'vence_amanha': return 2
    case 'vence_em_breve': return 3
  }
}

export function useNotificacoes(cheques: Cheque[]): Notificacao[] {
  return useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const notificacoes: Notificacao[] = []

    for (const cheque of cheques) {
      if (cheque.status !== 'em_custodia') continue

      const vencimento = parseISODate(cheque.data_vencimento)

      const diasRestantes = Math.round(
        (vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
      )

      const tipo = resolverTipo(diasRestantes)
      if (tipo === null) continue

      notificacoes.push({
        id: cheque.id,
        tipo,
        cheque,
        diasRestantes,
        mensagem: construirMensagem(tipo, diasRestantes, cheque.valor_nominal),
      })
    }

    return notificacoes.sort((a, b) => {
      const prioridadeDiff = calcularPrioridade(a.tipo) - calcularPrioridade(b.tipo)
      if (prioridadeDiff !== 0) return prioridadeDiff
      return a.diasRestantes - b.diasRestantes
    })
  }, [cheques])
}
