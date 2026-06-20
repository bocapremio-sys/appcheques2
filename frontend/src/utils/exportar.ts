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

function formatarMoedaExcel(valor: number): string {
  return valor.toFixed(2).replace('.', ',')
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

function calcTaxaDiaria(taxaMes: number): number {
  return Math.ceil((taxaMes / 30) * 1000) / 1000
}

function calcDesconto(valor: number, taxaMes: number, dias: number): number {
  const taxaDia = calcTaxaDiaria(taxaMes)
  return Math.ceil((valor * dias * (taxaDia / 100)) / 10) * 10
}

function calcDias(emissao: string, vencimento: string): number {
  const e = new Date(emissao)
  const v = new Date(vencimento)
  if (v <= e) return 0
  return Math.floor((v.getTime() - e.getTime()) / (1000 * 60 * 60 * 24))
}

function dataResolucao(c: Cheque): string {
  if (c.status === 'compensado') return formatarData(c.data_compensacao)
  if (c.status === 'devolvido') return formatarData(c.data_devolucao)
  if (c.status === 'recuperado') return formatarData(c.data_recuperacao)
  return ''
}

// ─── 1. exportarRelatorioExcel ────────────────────────────────────────────────

const CABECALHO_CHEQUE = [
  'Número',
  'Emitente',
  'CPF/CNPJ',
  'Banco',
  'Ag./Conta',
  'Valor Nominal (R$)',
  'Taxa Mensal (%)',
  'Taxa Diária (%)',
  'Data Emissão',
  'Data Vencimento',
  'Dias p/ Cálculo',
  'Desconto (R$)',
  'Valor Líquido (R$)',
  'Entrada Custódia',
  'Status',
  'Data Resolução',
  'Motivo Devolução',
  'Observações',
]

function chequeParaLinha(c: Cheque): (string | number)[] {
  const dias = calcDias(c.data_emissao, c.data_vencimento)
  const desconto = calcDesconto(c.valor_nominal, c.taxa_juros_mes, dias)
  const taxaDia = calcTaxaDiaria(c.taxa_juros_mes)

  return [
    c.numero,
    c.emitente,
    c.cpf_cnpj,
    c.banco,
    `${c.agencia} / ${c.conta}`,
    c.valor_nominal,
    c.taxa_juros_mes,
    taxaDia,
    formatarData(c.data_emissao),
    formatarData(c.data_vencimento),
    dias,
    desconto,
    c.valor_nominal - desconto,
    formatarData(c.data_entrada_custodia),
    statusPt(c.status),
    dataResolucao(c),
    motivoPt(c.motivo_devolucao),
    c.observacoes ?? '',
  ]
}

function criarAbaExcel(chequesAba: Cheque[]): XLSX.WorkSheet {
  const linhas: (string | number)[][] = [
    CABECALHO_CHEQUE,
    ...chequesAba.map(chequeParaLinha),
  ]
  const ws = XLSX.utils.aoa_to_sheet(linhas)

  ws['!cols'] = [
    { wch: 12 },  // Número
    { wch: 30 },  // Emitente
    { wch: 20 },  // CPF/CNPJ
    { wch: 8 },   // Banco
    { wch: 18 },  // Ag./Conta
    { wch: 18 },  // Valor Nominal
    { wch: 14 },  // Taxa Mensal
    { wch: 14 },  // Taxa Diária
    { wch: 14 },  // Data Emissão
    { wch: 16 },  // Data Vencimento
    { wch: 16 },  // Dias p/ Cálculo
    { wch: 16 },  // Desconto
    { wch: 18 },  // Valor Líquido
    { wch: 18 },  // Entrada Custódia
    { wch: 14 },  // Status
    { wch: 16 },  // Data Resolução
    { wch: 22 },  // Motivo Devolução
    { wch: 30 },  // Observações
  ]

  return ws
}

function criarAbaResumo(cheques: Cheque[], titulo: string): XLSX.WorkSheet {
  const emCustodia = cheques.filter((c) => c.status === 'em_custodia')
  const compensados = cheques.filter((c) => c.status === 'compensado')
  const devolvidos = cheques.filter((c) => c.status === 'devolvido')
  const recuperados = cheques.filter((c) => c.status === 'recuperado')
  const cancelados = cheques.filter((c) => c.status === 'cancelado')

  const totalNominal = cheques.reduce((a, c) => a + c.valor_nominal, 0)
  const totalDesconto = cheques.reduce((a, c) => {
    const dias = calcDias(c.data_emissao, c.data_vencimento)
    return a + calcDesconto(c.valor_nominal, c.taxa_juros_mes, dias)
  }, 0)
  const totalLiquido = totalNominal - totalDesconto
  const descontoMedio = cheques.length > 0 ? totalDesconto / cheques.length : 0

  const geradoEm = new Date().toLocaleString('pt-BR')

  const linhas: (string | number)[][] = [
    ['App Boca — Relatório de Cheques'],
    [titulo],
    [`Gerado em: ${geradoEm}`],
    [],
    ['RESUMO GERAL'],
    ['Total de Cheques', cheques.length],
    ['Valor Nominal Total', formatarMoedaExcel(totalNominal)],
    ['Desconto Total', formatarMoedaExcel(totalDesconto)],
    ['Valor Líquido Total', formatarMoedaExcel(totalLiquido)],
    ['Desconto Médio p/ Cheque', formatarMoedaExcel(descontoMedio)],
    [],
    ['POR STATUS', 'Quantidade', 'Valor Nominal (R$)'],
    ['Em Custódia', emCustodia.length, formatarMoedaExcel(emCustodia.reduce((a, c) => a + c.valor_nominal, 0))],
    ['Compensados', compensados.length, formatarMoedaExcel(compensados.reduce((a, c) => a + c.valor_nominal, 0))],
    ['Devolvidos', devolvidos.length, formatarMoedaExcel(devolvidos.reduce((a, c) => a + c.valor_nominal, 0))],
    ['Recuperados', recuperados.length, formatarMoedaExcel(recuperados.reduce((a, c) => a + c.valor_nominal, 0))],
    ['Cancelados', cancelados.length, formatarMoedaExcel(cancelados.reduce((a, c) => a + c.valor_nominal, 0))],
    [],
    ['FÓRMULA DE CÁLCULO'],
    ['Taxa diária = Taxa mensal ÷ 30 (arredondada para cima, 3 casas decimais)'],
    ['Desconto = Valor Nominal × Dias × (Taxa Diária ÷ 100), arredondado para cima em múltiplo de R$10'],
    ['Valor Líquido = Valor Nominal − Desconto'],
  ]

  const ws = XLSX.utils.aoa_to_sheet(linhas)
  ws['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 22 }]
  return ws
}

export function exportarRelatorioExcel(cheques: Cheque[], titulo: string): void {
  const wb = XLSX.utils.book_new()
  wb.Props = { Title: titulo }

  const wsResumo = criarAbaResumo(cheques, titulo)
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

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
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const dataGeracao = new Date().toLocaleString('pt-BR')
  const totalCheques = cheques.length
  const valorTotalNominal = cheques.reduce((acc, c) => acc + c.valor_nominal, 0)

  const emCustodia = cheques.filter((c) => c.status === 'em_custodia')
  const compensados = cheques.filter((c) => c.status === 'compensado')
  const devolvidos = cheques.filter((c) => c.status === 'devolvido')
  const recuperados = cheques.filter((c) => c.status === 'recuperado')

  const totalDesconto = cheques.reduce((acc, c) => {
    const dias = calcDias(c.data_emissao, c.data_vencimento)
    return acc + calcDesconto(c.valor_nominal, c.taxa_juros_mes, dias)
  }, 0)
  const totalLiquido = valorTotalNominal - totalDesconto

  // ── Header ──
  doc.setFontSize(18)
  doc.setTextColor(20, 20, 20)
  doc.text('App Boca', 14, 16)
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text('Gestão de Cheques', 45, 16)

  doc.setDrawColor(200, 200, 200)
  doc.line(14, 19, pageWidth - 14, 19)

  doc.setFontSize(12)
  doc.setTextColor(30, 30, 30)
  doc.text(titulo, 14, 26)

  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text(`Período: ${periodo}`, 14, 32)
  doc.text(`Gerado em: ${dataGeracao}`, pageWidth - 14, 32, { align: 'right' })

  // ── Resumo em boxes ──
  const resumoY = 38
  const boxW = (pageWidth - 28 - 12) / 4
  const resumoItems = [
    { label: 'Valor Nominal Total', valor: formatarMoeda(valorTotalNominal) },
    { label: 'Desconto Total', valor: formatarMoeda(totalDesconto) },
    { label: 'Valor Líquido Total', valor: formatarMoeda(totalLiquido) },
    { label: 'Quantidade', valor: `${totalCheques} cheque${totalCheques !== 1 ? 's' : ''}` },
  ]

  resumoItems.forEach((item, i) => {
    const x = 14 + i * (boxW + 4)
    doc.setFillColor(245, 245, 245)
    doc.roundedRect(x, resumoY, boxW, 14, 1, 1, 'F')
    doc.setFontSize(7)
    doc.setTextColor(120, 120, 120)
    doc.text(item.label, x + 3, resumoY + 5)
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    doc.text(item.valor, x + 3, resumoY + 11)
  })

  // ── Status breakdown ──
  const statusY = resumoY + 18
  doc.setFontSize(7)
  doc.setTextColor(100, 100, 100)
  const statusText = `Em Custódia: ${emCustodia.length}  |  Compensados: ${compensados.length}  |  Devolvidos: ${devolvidos.length}  |  Recuperados: ${recuperados.length}`
  doc.text(statusText, 14, statusY)

  // ── Tabela principal ──
  const colunas = [
    { header: '#', dataKey: 'numero' },
    { header: 'Emitente', dataKey: 'emitente' },
    { header: 'CPF/CNPJ', dataKey: 'cpf_cnpj' },
    { header: 'Banco', dataKey: 'banco' },
    { header: 'Nominal', dataKey: 'valor' },
    { header: 'Taxa a.m.', dataKey: 'taxaMes' },
    { header: 'Taxa a.d.', dataKey: 'taxaDia' },
    { header: 'Dias', dataKey: 'dias' },
    { header: 'Desconto', dataKey: 'desconto' },
    { header: 'Líquido', dataKey: 'liquido' },
    { header: 'Vencimento', dataKey: 'vencimento' },
    { header: 'Status', dataKey: 'status' },
    { header: 'Motivo Dev.', dataKey: 'motivo' },
  ]

  const linhas = cheques.map((c) => {
    const dias = calcDias(c.data_emissao, c.data_vencimento)
    const desconto = calcDesconto(c.valor_nominal, c.taxa_juros_mes, dias)
    const taxaDia = calcTaxaDiaria(c.taxa_juros_mes)

    return {
      numero: c.numero,
      emitente: c.emitente,
      cpf_cnpj: c.cpf_cnpj,
      banco: c.banco,
      valor: formatarMoeda(c.valor_nominal),
      taxaMes: `${c.taxa_juros_mes.toFixed(2)}%`,
      taxaDia: `${taxaDia.toFixed(3)}%`,
      dias: String(dias),
      desconto: formatarMoeda(desconto),
      liquido: formatarMoeda(c.valor_nominal - desconto),
      vencimento: formatarData(c.data_vencimento),
      status: statusPt(c.status),
      motivo: motivoPt(c.motivo_devolucao) || '-',
    }
  })

  autoTable(doc, {
    startY: statusY + 3,
    columns: colunas,
    body: linhas,
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [35, 35, 50],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    columnStyles: {
      numero: { cellWidth: 14 },
      emitente: { cellWidth: 35 },
      cpf_cnpj: { cellWidth: 26 },
      banco: { cellWidth: 10 },
      valor: { cellWidth: 20, halign: 'right' },
      taxaMes: { cellWidth: 14, halign: 'right' },
      taxaDia: { cellWidth: 14, halign: 'right' },
      dias: { cellWidth: 10, halign: 'right' },
      desconto: { cellWidth: 20, halign: 'right' },
      liquido: { cellWidth: 22, halign: 'right' },
      vencimento: { cellWidth: 20 },
      status: { cellWidth: 18 },
      motivo: { cellWidth: 24 },
    },
    theme: 'grid',
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.dataKey === 'desconto') {
        data.cell.styles.textColor = [180, 40, 40]
      }
      if (data.section === 'body' && data.column.dataKey === 'liquido') {
        data.cell.styles.textColor = [30, 120, 60]
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  // ── Footer com totais ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY: number = (doc as any).lastAutoTable?.finalY ?? 60
  const footerY = finalY + 6

  doc.setDrawColor(200, 200, 200)
  doc.line(14, footerY - 2, pageWidth - 14, footerY - 2)

  doc.setFontSize(8)
  doc.setTextColor(50, 50, 50)
  doc.text(`Total: ${totalCheques} cheques`, 14, footerY + 2)
  doc.text(`Nominal: ${formatarMoeda(valorTotalNominal)}`, 80, footerY + 2)
  doc.text(`Desconto: ${formatarMoeda(totalDesconto)}`, 145, footerY + 2)
  doc.setTextColor(30, 120, 60)
  doc.text(`Líquido: ${formatarMoeda(totalLiquido)}`, 210, footerY + 2)

  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(
    'Desconto = Valor Nominal × Dias × Taxa Diária | Taxa diária = taxa mensal ÷ 30 (ceil 3 casas) | Desconto arredondado p/ cima em múltiplo de R$10',
    14,
    footerY + 7,
  )

  // ── Paginação ──
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 6, { align: 'right' })
    doc.text('App Boca — Gestão de Cheques', 14, pageHeight - 6)
  }

  const nomeArquivo = `relatorio-cheques-${dataArquivoHoje()}.pdf`
  doc.save(nomeArquivo)
}

// ─── 3. exportarClienteExcel ──────────────────────────────────────────────────

export function exportarClienteExcel(dados: DadosCliente[], periodo: string): void {
  const geradoEm = new Date().toLocaleString('pt-BR')
  const totalCheques = dados.reduce((a, d) => a + d.total, 0)
  const totalValor = dados.reduce((a, d) => a + d.valorTotal, 0)
  const totalJuros = dados.reduce((a, d) => a + d.jurosTotal, 0)
  const totalCompensados = dados.reduce((a, d) => a + d.compensados, 0)
  const totalDevolvidos = dados.reduce((a, d) => a + d.devolvidos, 0)
  const taxaInadimplencia = totalCheques > 0
    ? ((totalDevolvidos / totalCheques) * 100).toFixed(1)
    : '0.0'

  const cabecalho = [
    'Cliente',
    'CPF/CNPJ',
    'Total Cheques',
    'Compensados',
    'Devolvidos',
    '% Inadimpl.',
    'Valor Nominal Total (R$)',
    'Juros Gerados (R$)',
    'Ticket Médio (R$)',
  ]

  const linhasCliente: (string | number)[][] = dados.map((d) => {
    const inadimpl = d.total > 0 ? ((d.devolvidos / d.total) * 100).toFixed(1) + '%' : '0.0%'
    const ticketMedio = d.total > 0 ? formatarMoedaExcel(d.valorTotal / d.total) : '0,00'
    return [
      d.nome,
      d.cpf_cnpj,
      d.total,
      d.compensados,
      d.devolvidos,
      inadimpl,
      formatarMoedaExcel(d.valorTotal),
      formatarMoedaExcel(d.jurosTotal),
      ticketMedio,
    ]
  })

  const linhas: (string | number)[][] = [
    ['App Boca — Relatório por Cliente'],
    [`Período: ${periodo}`],
    [`Gerado em: ${geradoEm}`],
    [],
    ['RESUMO'],
    ['Total de Clientes', dados.length],
    ['Total de Cheques', totalCheques],
    ['Valor Nominal Total', formatarMoedaExcel(totalValor)],
    ['Juros Gerados Total', formatarMoedaExcel(totalJuros)],
    ['Compensados', totalCompensados],
    ['Devolvidos', totalDevolvidos],
    ['Taxa de Inadimplência', `${taxaInadimplencia}%`],
    [],
    cabecalho,
    ...linhasCliente,
  ]

  const ws = XLSX.utils.aoa_to_sheet(linhas)

  ws['!cols'] = [
    { wch: 35 },  // Cliente
    { wch: 20 },  // CPF/CNPJ
    { wch: 14 },  // Total Cheques
    { wch: 14 },  // Compensados
    { wch: 12 },  // Devolvidos
    { wch: 14 },  // % Inadimpl.
    { wch: 22 },  // Valor Nominal Total
    { wch: 18 },  // Juros Gerados
    { wch: 16 },  // Ticket Médio
  ]

  const wb = XLSX.utils.book_new()
  wb.Props = { Title: `Relatório por Cliente — ${periodo}` }
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes')

  const nomeArquivo = `relatorio-clientes-${dataArquivoHoje()}.xlsx`
  XLSX.writeFile(wb, nomeArquivo)
}

// ─── 4. exportarVencimentosExcel ─────────────────────────────────────────────

function calcDiasAtraso(vencimento: string): number {
  const v = new Date(vencimento)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const diff = hoje.getTime() - v.getTime()
  return diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0
}

function calcDiasParaVencer(vencimento: string): number {
  const v = new Date(vencimento)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const diff = v.getTime() - hoje.getTime()
  return diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0
}

function criarAbaVencimentos(
  cheques: Cheque[],
  tipo: 'vencidos' | 'proximos',
): XLSX.WorkSheet {
  const cabecalho = [
    'Número',
    'Emitente',
    'CPF/CNPJ',
    'Banco',
    'Valor Nominal (R$)',
    'Data Vencimento',
    tipo === 'vencidos' ? 'Dias em Atraso' : 'Dias p/ Vencer',
    'Desconto (R$)',
    'Valor Líquido (R$)',
    'Observações',
  ]

  const linhas: (string | number)[][] = cheques.map((c) => {
    const dias = calcDias(c.data_emissao, c.data_vencimento)
    const desconto = calcDesconto(c.valor_nominal, c.taxa_juros_mes, dias)
    const diasInfo = tipo === 'vencidos'
      ? calcDiasAtraso(c.data_vencimento)
      : calcDiasParaVencer(c.data_vencimento)

    return [
      c.numero,
      c.emitente,
      c.cpf_cnpj,
      c.banco,
      c.valor_nominal,
      formatarData(c.data_vencimento),
      diasInfo,
      desconto,
      c.valor_nominal - desconto,
      c.observacoes ?? '',
    ]
  })

  const ws = XLSX.utils.aoa_to_sheet([cabecalho, ...linhas])
  ws['!cols'] = [
    { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 8 },
    { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    { wch: 18 }, { wch: 30 },
  ]
  return ws
}

export function exportarVencimentosExcel(vencidos: Cheque[], proximos: Cheque[]): void {
  const wb = XLSX.utils.book_new()
  const geradoEm = new Date().toLocaleString('pt-BR')

  const totalVencidos = vencidos.reduce((a, c) => a + c.valor_nominal, 0)
  const totalProximos = proximos.reduce((a, c) => a + c.valor_nominal, 0)

  const resumo: (string | number)[][] = [
    ['App Boca — Relatório de Vencimentos'],
    [`Gerado em: ${geradoEm}`],
    [],
    ['RESUMO'],
    ['Cheques Vencidos', vencidos.length],
    ['Valor Nominal Vencido', formatarMoedaExcel(totalVencidos)],
    [],
    ['Próximos Vencimentos (30 dias)', proximos.length],
    ['Valor Nominal a Vencer', formatarMoedaExcel(totalProximos)],
  ]

  const wsResumo = XLSX.utils.aoa_to_sheet(resumo)
  wsResumo['!cols'] = [{ wch: 35 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

  const wsVencidos = criarAbaVencimentos(vencidos, 'vencidos')
  XLSX.utils.book_append_sheet(wb, wsVencidos, 'Vencidos')

  const wsProximos = criarAbaVencimentos(proximos, 'proximos')
  XLSX.utils.book_append_sheet(wb, wsProximos, 'Próximos 30 dias')

  XLSX.writeFile(wb, `vencimentos-${dataArquivoHoje()}.xlsx`)
}

// ─── 5. exportarVencimentosPDF ───────────────────────────────────────────────

export function exportarVencimentosPDF(vencidos: Cheque[], proximos: Cheque[]): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const dataGeracao = new Date().toLocaleString('pt-BR')

  const totalVencidos = vencidos.reduce((a, c) => a + c.valor_nominal, 0)
  const totalProximos = proximos.reduce((a, c) => a + c.valor_nominal, 0)

  // ── Header ──
  doc.setFontSize(18)
  doc.setTextColor(20, 20, 20)
  doc.text('App Boca', 14, 16)
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text('Gestão de Cheques', 45, 16)

  doc.setDrawColor(200, 200, 200)
  doc.line(14, 19, pageWidth - 14, 19)

  doc.setFontSize(12)
  doc.setTextColor(30, 30, 30)
  doc.text('Relatório de Vencimentos', 14, 26)

  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text(`Gerado em: ${dataGeracao}`, pageWidth - 14, 26, { align: 'right' })

  // ── Resumo ──
  const resumoY = 32
  const boxW = (pageWidth - 28 - 4) / 2

  doc.setFillColor(255, 240, 240)
  doc.roundedRect(14, resumoY, boxW, 14, 1, 1, 'F')
  doc.setFontSize(7)
  doc.setTextColor(180, 40, 40)
  doc.text(`Vencidos: ${vencidos.length} cheques`, 17, resumoY + 5)
  doc.setFontSize(10)
  doc.text(formatarMoeda(totalVencidos), 17, resumoY + 11)

  doc.setFillColor(240, 248, 240)
  doc.roundedRect(14 + boxW + 4, resumoY, boxW, 14, 1, 1, 'F')
  doc.setFontSize(7)
  doc.setTextColor(30, 120, 60)
  doc.text(`Próximos 30 dias: ${proximos.length} cheques`, 17 + boxW + 4, resumoY + 5)
  doc.setFontSize(10)
  doc.text(formatarMoeda(totalProximos), 17 + boxW + 4, resumoY + 11)

  const colunas = [
    { header: '#', dataKey: 'numero' },
    { header: 'Emitente', dataKey: 'emitente' },
    { header: 'CPF/CNPJ', dataKey: 'cpf_cnpj' },
    { header: 'Nominal', dataKey: 'valor' },
    { header: 'Vencimento', dataKey: 'vencimento' },
    { header: 'Situação', dataKey: 'situacao' },
  ]

  // ── Tabela vencidos ──
  let startY = resumoY + 20

  if (vencidos.length > 0) {
    doc.setFontSize(9)
    doc.setTextColor(180, 40, 40)
    doc.text(`Cheques Vencidos (${vencidos.length})`, 14, startY)
    startY += 3

    const linhasVencidos = vencidos.map((c) => ({
      numero: c.numero,
      emitente: c.emitente,
      cpf_cnpj: c.cpf_cnpj,
      valor: formatarMoeda(c.valor_nominal),
      vencimento: formatarData(c.data_vencimento),
      situacao: `${calcDiasAtraso(c.data_vencimento)} dias em atraso`,
    }))

    autoTable(doc, {
      startY,
      columns: colunas,
      body: linhasVencidos,
      styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 30, 30], lineColor: [220, 220, 220], lineWidth: 0.1 },
      headStyles: { fillColor: [180, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [255, 248, 248] },
      columnStyles: {
        numero: { cellWidth: 16 },
        emitente: { cellWidth: 50 },
        cpf_cnpj: { cellWidth: 30 },
        valor: { cellWidth: 25, halign: 'right' },
        vencimento: { cellWidth: 22 },
        situacao: { cellWidth: 30 },
      },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.dataKey === 'situacao') {
          data.cell.styles.textColor = [180, 40, 40]
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY = ((doc as any).lastAutoTable?.finalY ?? startY) + 8
  }

  // ── Tabela próximos ──
  if (proximos.length > 0) {
    if (startY > pageHeight - 30) {
      doc.addPage()
      startY = 16
    }

    doc.setFontSize(9)
    doc.setTextColor(30, 120, 60)
    doc.text(`Próximos Vencimentos — 30 dias (${proximos.length})`, 14, startY)
    startY += 3

    const linhasProximos = proximos.map((c) => ({
      numero: c.numero,
      emitente: c.emitente,
      cpf_cnpj: c.cpf_cnpj,
      valor: formatarMoeda(c.valor_nominal),
      vencimento: formatarData(c.data_vencimento),
      situacao: `${calcDiasParaVencer(c.data_vencimento)} dias restantes`,
    }))

    autoTable(doc, {
      startY,
      columns: colunas,
      body: linhasProximos,
      styles: { fontSize: 7, cellPadding: 1.5, textColor: [30, 30, 30], lineColor: [220, 220, 220], lineWidth: 0.1 },
      headStyles: { fillColor: [30, 120, 60], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 252, 245] },
      columnStyles: {
        numero: { cellWidth: 16 },
        emitente: { cellWidth: 50 },
        cpf_cnpj: { cellWidth: 30 },
        valor: { cellWidth: 25, halign: 'right' },
        vencimento: { cellWidth: 22 },
        situacao: { cellWidth: 30 },
      },
      theme: 'grid',
    })
  }

  if (vencidos.length === 0 && proximos.length === 0) {
    doc.setFontSize(10)
    doc.setTextColor(150, 150, 150)
    doc.text('Nenhum cheque vencido ou próximo do vencimento.', 14, startY + 5)
  }

  // ── Paginação ──
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 6, { align: 'right' })
    doc.text('App Boca — Gestão de Cheques', 14, pageHeight - 6)
  }

  doc.save(`vencimentos-${dataArquivoHoje()}.pdf`)
}
