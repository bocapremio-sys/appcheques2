import type { Parcela } from '../types/cheque'
import { adicionarMesesEmDiaUtil } from './diasUteis'

export function gerarParcelas(
  valorTotal: number,
  totalParcelas: number,
  dataBase: Date
): Parcela[] {
  const valorParcela = Math.round((valorTotal / totalParcelas) * 100) / 100
  const diferenca = Math.round((valorTotal - valorParcela * totalParcelas) * 100) / 100

  return Array.from({ length: totalParcelas }, (_, i) => {
    const numero = i + 1
    const vencimento = adicionarMesesEmDiaUtil(dataBase, numero)
    // Última parcela absorve diferença de centavos do arredondamento
    const valor = numero === totalParcelas
      ? Math.round((valorParcela + diferenca) * 100) / 100
      : valorParcela

    return {
      numero,
      data_vencimento: vencimento.toISOString().split('T')[0],
      valor,
      pago: false,
    }
  })
}

export function registrarPagamentoParcela(
  parcelas: Parcela[],
  numeroParcela: number,
  dataPagamento: string
): Parcela[] {
  return parcelas.map((p) =>
    p.numero === numeroParcela
      ? { ...p, pago: true, data_pagamento: dataPagamento }
      : p
  )
}

export function parcelasPagas(parcelas: Parcela[]): number {
  return parcelas.filter((p) => p.pago).length
}

export function proximaParcelaAberta(parcelas: Parcela[]): Parcela | undefined {
  return parcelas.find((p) => !p.pago)
}

export function todasPagas(parcelas: Parcela[]): boolean {
  return parcelas.length > 0 && parcelas.every((p) => p.pago)
}
