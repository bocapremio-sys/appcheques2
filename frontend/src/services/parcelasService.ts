import { supabase } from './supabase'
import type { Parcela } from '../types/cheque'

const TABELA = 'parcelas'

export const parcelasService = {
  async listarPorCheque(chequeId: string): Promise<Parcela[]> {
    const { data, error } = await supabase!
      .from(TABELA)
      .select('*')
      .eq('cheque_id', chequeId)
      .order('numero', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapParcela)
  },

  async criarLote(chequeId: string, parcelas: Omit<Parcela, 'id'>[]): Promise<void> {
    const rows = parcelas.map((p) => ({
      cheque_id: chequeId,
      numero: p.numero,
      data_vencimento: p.data_vencimento,
      valor: p.valor,
      pago: false,
    }))
    const { error } = await supabase!.from(TABELA).insert(rows)
    if (error) throw new Error(error.message)
  },

  async registrarPagamento(
    chequeId: string,
    numeroParcela: number,
    dataPagamento: string
  ): Promise<void> {
    const { error } = await supabase!
      .from(TABELA)
      .update({ pago: true, data_pagamento: dataPagamento })
      .eq('cheque_id', chequeId)
      .eq('numero', numeroParcela)
    if (error) throw new Error(error.message)
  },
}

function mapParcela(row: Record<string, unknown>): Parcela {
  return {
    numero: row.numero as number,
    data_vencimento: row.data_vencimento as string,
    valor: Number(row.valor),
    pago: row.pago as boolean,
    data_pagamento: row.data_pagamento as string | undefined,
  }
}
