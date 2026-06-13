export type ChequeStatus = 'em_custodia' | 'compensado' | 'devolvido' | 'recuperado' | 'cancelado'

export type MotivoDevolucao =
  | 'sem_fundos'
  | 'conta_encerrada'
  | 'assinatura_divergente'
  | 'cheque_sustado'
  | 'prescrito'
  | 'outros'

export interface Cheque {
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
  data_entrada_custodia: string  // legado: mantido por compatibilidade com o banco (NOT NULL), não usado nos cálculos
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

export interface ChequeFormData {
  numero: string
  emitente: string
  cpf_cnpj: string
  banco: string
  agencia: string
  conta: string
  valor_nominal: number
  data_emissao: string
  data_vencimento: string
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

export interface DashboardStatusResumo {
  quantidade: number
  valorNominal: number
}

export interface DashboardChequeLinha {
  id: string
  numero: string
  emitente: string
  banco: string
  valorNominal: number
  taxaMensalPercent: number
  taxaDiariaPercent: number
  valorMes: number
  valorDia: number
  dataEmissao: string
  vencimentoOriginal: string
  vencimentoAjustado: string
  vencimentoFoiAjustado: boolean
  motivoAjusteVencimento: string | null
  diasCalculo: number
  desconto: number
  valorLiquido: number
  status: ChequeStatus
}

export interface DashboardMetrics {
  // Totais gerais
  totalNominal: number
  totalDesconto: number
  totalLiquido: number
  quantidadeCheques: number
  descontoMedio: number

  // Cheques por status (quantidade + valor nominal)
  porStatus: Record<ChequeStatus, DashboardStatusResumo>

  // Próximos vencimentos (usando data de vencimento ajustada)
  proximosVencimentos: DashboardChequeLinha[]

  // Cheques cujo vencimento foi ajustado (sábado/domingo/feriado)
  chequesComVencimentoAjustado: DashboardChequeLinha[]
  quantidadeChequesAjustados: number

  // Tabela detalhada (todos os cheques, com campos do cálculo central)
  linhas: DashboardChequeLinha[]
}
