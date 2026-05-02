export type ChequeStatus = 'em_custodia' | 'compensado' | 'devolvido' | 'recuperado' | 'cancelado'

export type MotivoDevolucao =
  | 'sem_fundos'
  | 'conta_encerrada'
  | 'assinatura_divergente'
  | 'cheque_sustado'
  | 'prescrito'
  | 'outros'

export interface Parcela {
  numero: number           // 1-based: parcela 1, 2, 3…
  data_vencimento: string  // dia útil calculado
  valor: number
  pago: boolean
  data_pagamento?: string
}

export interface Cheque {
  // Parcelamento (opcional)
  total_parcelas?: number
  parcelas_pagas?: number
  parcelas?: Parcela[]
  id: string
  numero: string
  emitente: string
  cpf_cnpj: string
  banco: string
  agencia: string
  conta: string
  valor_nominal: number
  data_emissao: string
  data_vencimento: string
  data_entrada_custodia: string
  taxa_juros_mes: number   // % ao mês (ex: 3.3 = 3,3% a.m.)
  status: ChequeStatus
  motivo_devolucao?: MotivoDevolucao
  data_compensacao?: string
  data_devolucao?: string
  data_recuperacao?: string
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface ChequeCalculado extends Cheque {
  dias_corridos: number
  juros: number
  valor_liquido: number   // valor_nominal - juros (desconto)
  lucro_prejuizo: number
}

export interface ChequeFormData {
  // Parcelamento
  total_parcelas?: number
  numero: string
  emitente: string
  cpf_cnpj: string
  banco: string
  agencia: string
  conta: string
  valor_nominal: number
  data_emissao: string
  data_vencimento: string
  data_entrada_custodia: string
  taxa_juros_mes: number   // % ao mês (ex: 3.3 = 3,3% a.m.)
  observacoes?: string
}

export interface Emitente {
  id: string
  nome: string
  cpf_cnpj: string
  banco: string
  agencia: string
  conta: string
  taxa_juros_mes: number
}

export interface DashboardMetrics {
  // Contagens
  total_cheques: number
  em_custodia: number
  compensados: number
  devolvidos: number
  recuperados: number
  cancelados: number

  // Financeiro — capital
  capital_total_desembolsado: number
  capital_retornado: number
  capital_em_risco: number

  // Financeiro — custódia atual
  valor_total_custodia: number
  juros_projetados_custodia: number
  valor_total_com_juros: number

  // Financeiro — histórico (todos os períodos)
  lucro_total: number
  prejuizo_total: number
  resultado_liquido_total: number

  // Financeiro — mês atual
  lucro_mes: number
  prejuizo_mes: number
  resultado_liquido_mes: number

  // Indicadores operacionais
  taxa_inadimplencia: number
  taxa_compensacao: number
  tempo_medio_custodia_dias: number
  cheques_vencidos: number
  valor_vencido: number

  // Motivos de devolução
  motivos_devolucao: Record<string, number>
}
