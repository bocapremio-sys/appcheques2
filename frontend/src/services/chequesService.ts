import { supabase } from './supabase'
import type { Cheque, ChequeFormData, ChequeStatus } from '../types/cheque'
import { parcelasService } from './parcelasService'
import { gerarParcelas } from '../utils/parcelamento'

const TABELA = 'cheques'

export const chequesService = {
  async listar(): Promise<Cheque[]> {
    const { data, error } = await supabase!
      .from(TABELA)
      .select('*, parcelas(*)')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapCheque)
  },

  async criar(dados: ChequeFormData): Promise<Cheque> {
    const totalParcelas =
      dados.total_parcelas && dados.total_parcelas > 1 ? dados.total_parcelas : null

    const { data, error } = await supabase!
      .from(TABELA)
      .insert({
        numero: dados.numero,
        emitente: dados.emitente,
        cpf_cnpj: dados.cpf_cnpj,
        banco: dados.banco,
        agencia: dados.agencia,
        conta: dados.conta,
        valor_nominal: dados.valor_nominal,
        data_emissao: dados.data_emissao,
        data_vencimento: dados.data_vencimento,
        data_entrada_custodia: dados.data_entrada_custodia,
        taxa_juros_mes: dados.taxa_juros_mes,
        observacoes: dados.observacoes ?? null,
        status: 'em_custodia',
        total_parcelas: totalParcelas,
        parcelas_pagas: 0,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    const cheque = mapCheque(data)

    if (totalParcelas) {
      const parcelas = gerarParcelas(
        dados.valor_nominal,
        totalParcelas,
        new Date(dados.data_entrada_custodia)
      )
      await parcelasService.criarLote(cheque.id, parcelas)
      cheque.parcelas = parcelas
      cheque.parcelas_pagas = 0
    }

    return cheque
  },

  async atualizarStatus(
    id: string,
    status: ChequeStatus,
    extra?: Partial<Cheque>
  ): Promise<void> {
    const { error } = await supabase!
      .from(TABELA)
      .update({ status, ...extraParaDb(extra), updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  async registrarPagamentoParcela(
    id: string,
    numeroParcela: number,
    dataPagamento: string,
    parcelas_pagas: number,
    finalizado: boolean
  ): Promise<void> {
    await parcelasService.registrarPagamento(id, numeroParcela, dataPagamento)

    const update: Record<string, unknown> = {
      parcelas_pagas,
      updated_at: new Date().toISOString(),
    }
    if (finalizado) {
      update.status = 'compensado'
      update.data_compensacao = dataPagamento
    }

    const { error } = await supabase!.from(TABELA).update(update).eq('id', id)
    if (error) throw new Error(error.message)
  },

  async editar(id: string, dados: Record<string, unknown>): Promise<void> {
    const { error } = await supabase!
      .from(TABELA)
      .update({ ...dados, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(error.message)
  },

  async remover(id: string): Promise<void> {
    const { error } = await supabase!.from(TABELA).delete().eq('id', id)
    if (error) throw new Error(error.message)
  },
}

function mapCheque(row: Record<string, unknown>): Cheque {
  const parcelas = Array.isArray(row.parcelas)
    ? (row.parcelas as Record<string, unknown>[]).map((p) => ({
        numero: p.numero as number,
        data_vencimento: p.data_vencimento as string,
        valor: Number(p.valor),
        pago: p.pago as boolean,
        data_pagamento: p.data_pagamento as string | undefined,
      }))
    : undefined

  return {
    id: row.id as string,
    numero: row.numero as string,
    emitente: row.emitente as string,
    cpf_cnpj: row.cpf_cnpj as string,
    banco: row.banco as string,
    agencia: row.agencia as string,
    conta: row.conta as string,
    valor_nominal: Number(row.valor_nominal),
    data_emissao: row.data_emissao as string,
    data_vencimento: row.data_vencimento as string,
    data_entrada_custodia: row.data_entrada_custodia as string,
    taxa_juros_mes: Number(row.taxa_juros_mes),
    status: row.status as Cheque['status'],
    motivo_devolucao: row.motivo_devolucao as Cheque['motivo_devolucao'],
    data_compensacao: row.data_compensacao as string | undefined,
    data_devolucao: row.data_devolucao as string | undefined,
    data_recuperacao: row.data_recuperacao as string | undefined,
    observacoes: row.observacoes as string | undefined,
    total_parcelas: row.total_parcelas as number | undefined,
    parcelas_pagas: row.parcelas_pagas as number | undefined,
    parcelas: parcelas?.sort((a, b) => a.numero - b.numero),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

function extraParaDb(extra?: Partial<Cheque>): Record<string, unknown> {
  if (!extra) return {}
  const map: Record<string, unknown> = {}
  if (extra.data_compensacao !== undefined) map.data_compensacao = extra.data_compensacao
  if (extra.data_devolucao !== undefined) map.data_devolucao = extra.data_devolucao
  if (extra.data_recuperacao !== undefined) map.data_recuperacao = extra.data_recuperacao
  if (extra.motivo_devolucao !== undefined) map.motivo_devolucao = extra.motivo_devolucao
  return map
}
