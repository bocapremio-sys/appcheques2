import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

type ChequeStatus = 'em_custodia' | 'compensado' | 'devolvido' | 'recuperado' | 'cancelado'

interface Cheque {
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
  taxa_juros_mes: number
  status: ChequeStatus
  motivo_devolucao?: string
  data_compensacao?: string
  data_devolucao?: string
  data_recuperacao?: string
  observacoes?: string
  created_at: string
  updated_at: string
}

interface DadosCliente {
  nome: string
  cpf_cnpj: string
  total: number
  compensados: number
  devolvidos: number
  valorTotal: number
  jurosTotal: number
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

const STATUS_PT: Record<ChequeStatus, string> = {
  em_custodia: 'Em Custódia',
  compensado: 'Compensado',
  devolvido: 'Devolvido',
  recuperado: 'Recuperado',
  cancelado: 'Cancelado',
}

const MOTIVO_PT: Record<string, string> = {
  sem_fundos: 'Sem Fundos',
  conta_encerrada: 'Conta Encerrada',
  assinatura_divergente: 'Assinatura Divergente',
  cheque_sustado: 'Cheque Sustado',
  prescrito: 'Prescrito',
  outros: 'Outros',
}

function formatarData(data?: string): string {
  if (!data) return ''
  const d = new Date(data)
  if (isNaN(d.getTime())) return data
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  const ano = d.getUTCFullYear()
  return `${dia}/${mes}/${ano}`
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

function dataArquivoHoje(): string {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function statusPt(status: ChequeStatus): string {
  return STATUS_PT[status] ?? status
}

function motivoPt(motivo?: string): string {
  if (!motivo) return ''
  return MOTIVO_PT[motivo] ?? motivo
}

// ─── Colunas de Cheque para Excel ────────────────────────────────────────────

const CABECALHO_CHEQUE = [
  'Número',
  'Emitente',
  'CPF/CNPJ',
  'Banco',
  'Agência',
  'Conta',
  'Valor Nominal',
  'Data Emissão',
  'Data Vencimento',
  'Entrada Custódia',
  'Taxa Juros (%/mês)',
  'Status',
  'Data Compensação',
  'Data Devolução',
  'Motivo Devolução',
]

function chequeParaLinha(c: Cheque): (string | number)[] {
  return [
    c.numero,
    c.emitente,
    c.cpf_cnpj,
    c.banco,
    c.agencia,
    c.conta,
    c.valor_nominal,
    formatarData(c.data_emissao),
    formatarData(c.data_vencimento),
    formatarData(c.data_entrada_custodia),
    c.taxa_juros_mes,
    statusPt(c.status),
    formatarData(c.data_compensacao),
    formatarData(c.data_devolucao),
    motivoPt(c.motivo_devolucao),
  ]
}

function criarAbaExcel(chequesAba: Cheque[]): XLSX.WorkSheet {
  const linhas: (string | number)[][] = [
    CABECALHO_CHEQUE,
    ...chequesAba.map(chequeParaLinha),
  ]
  const ws = XLSX.utils.aoa_to_sheet(linhas)

  // Define largura das colunas
  ws['!cols'] = [
    { wch: 12 }, // Número
    { wch: 30 }, // Emitente
    { wch: 18 }, // CPF/CNPJ
    { wch: 8 },  // Banco
    { wch: 10 }, // Agência
    { wch: 14 }, // Conta
    { wch: 14 }, // Valor Nominal
    { wch: 14 }, // Data Emissão
    { wch: 16 }, // Data Vencimento
    { wch: 18 }, // Entrada Custódia
    { wch: 18 }, // Taxa Juros
    { wch: 14 }, // Status
    { wch: 18 }, // Data Compensação
    { wch: 16 }, // Data Devolução
    { wch: 22 }, // Motivo Devolução
  ]

  return ws
}

// ─── 1. exportarRelatorioExcel ────────────────────────────────────────────────

export function exportarRelatorioExcel(cheques: Cheque[], titulo: string): void {
  const wb = XLSX.utils.book_new()
  wb.Props = { Title: titulo }

  const abas: { nome: string; filtro: (c: Cheque) => boolean }[] = [
    { nome: 'Todos os Cheques', filtro: () => true },
    { nome: 'Em Custódia', filtro: (c) => c.status === 'em_custodia' },
    { nome: 'Compensados', filtro: (c) => c.status === 'compensado' },
    { nome: 'Devolvidos', filtro: (c) => c.status === 'devolvido' },
  ]

  for (const aba of abas) {
    const chequesAba = cheques.filter(aba.filtro)
    const ws = criarAbaExcel(chequesAba)
    XLSX.utils.book_append_sheet(wb, ws, aba.nome)
  }

  const nomeArquivo = `relatorio-cheques-${dataArquivoHoje()}.xlsx`
  XLSX.writeFile(wb, nomeArquivo)
}

// ─── 2. exportarRelatorioPDF ──────────────────────────────────────────────────

export function exportarRelatorioPDF(
  cheques: Cheque[],
  titulo: string,
  periodo: string,
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const dataGeracao = new Date().toLocaleString('pt-BR')
  const totalCheques = cheques.length
  const valorTotalNominal = cheques.reduce((acc, c) => acc + c.valor_nominal, 0)

  // ── Header ──
  doc.setFontSize(16)
  doc.setTextColor(30, 30, 30)
  doc.text('App Boca — Relatório de Cheques', 14, 16)

  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text(`${titulo}  |  Período: ${periodo}`, 14, 23)
  doc.text(`Gerado em: ${dataGeracao}`, 14, 29)

  // ── Tabela ──
  const colunas = [
    { header: 'Número', dataKey: 'numero' },
    { header: 'Emitente', dataKey: 'emitente' },
    { header: 'Valor', dataKey: 'valor' },
    { header: 'Vencimento', dataKey: 'vencimento' },
    { header: 'Status', dataKey: 'status' },
    { header: 'Compensado/Devolvido em', dataKey: 'resolucao' },
  ]

  const linhas = cheques.map((c) => {
    const dataResolucao =
      c.status === 'compensado'
        ? formatarData(c.data_compensacao)
        : c.status === 'devolvido'
        ? formatarData(c.data_devolucao)
        : c.status === 'recuperado'
        ? formatarData(c.data_recuperacao)
        : ''

    return {
      numero: c.numero,
      emitente: c.emitente,
      valor: formatarMoeda(c.valor_nominal),
      vencimento: formatarData(c.data_vencimento),
      status: statusPt(c.status),
      resolucao: dataResolucao,
    }
  })

  autoTable(doc, {
    startY: 34,
    columns: colunas,
    body: linhas,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 30, 30],
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [30, 30, 30],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      numero: { cellWidth: 22 },
      emitente: { cellWidth: 55 },
      valor: { cellWidth: 30, halign: 'right' },
      vencimento: { cellWidth: 28 },
      status: { cellWidth: 28 },
      resolucao: { cellWidth: 40 },
    },
    theme: 'grid',
  })

  // ── Footer ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- jspdf-autotable estende o doc em runtime
  const finalY: number = (doc as any).lastAutoTable?.finalY ?? 34
  const footerY = finalY + 8

  doc.setFontSize(9)
  doc.setTextColor(50, 50, 50)
  doc.text(
    `Total de cheques: ${totalCheques}   |   Valor total nominal: ${formatarMoeda(valorTotalNominal)}`,
    14,
    footerY,
  )

  const nomeArquivo = `relatorio-cheques-${dataArquivoHoje()}.pdf`
  doc.save(nomeArquivo)
}

// ─── 3. exportarClienteExcel ──────────────────────────────────────────────────

export function exportarClienteExcel(dados: DadosCliente[], periodo: string): void {
  const cabecalho = [
    'Nome',
    'CPF/CNPJ',
    'Total de Cheques',
    'Compensados',
    'Devolvidos',
    'Valor Total (R$)',
    'Juros Total (R$)',
  ]

  const linhas: (string | number)[][] = [
    [`Relatório por Cliente — ${periodo}`],
    [],
    cabecalho,
    ...dados.map((d) => [
      d.nome,
      d.cpf_cnpj,
      d.total,
      d.compensados,
      d.devolvidos,
      d.valorTotal,
      d.jurosTotal,
    ]),
  ]

  const ws = XLSX.utils.aoa_to_sheet(linhas)

  ws['!cols'] = [
    { wch: 35 }, // Nome
    { wch: 18 }, // CPF/CNPJ
    { wch: 18 }, // Total de Cheques
    { wch: 14 }, // Compensados
    { wch: 12 }, // Devolvidos
    { wch: 18 }, // Valor Total
    { wch: 18 }, // Juros Total
  ]

  const wb = XLSX.utils.book_new()
  wb.Props = { Title: `Relatório por Cliente — ${periodo}` }
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes')

  const nomeArquivo = `relatorio-clientes-${dataArquivoHoje()}.xlsx`
  XLSX.writeFile(wb, nomeArquivo)
}
