import { gerarFeriadosDoAno } from './diasUteis'

/**
 * Módulo central de cálculo de desconto/juros de cheques.
 *
 * `calculateChequeDiscount` é a única fonte de verdade para o cálculo —
 * cadastro, edição, detalhe e dashboard devem usar esta função em vez de
 * reimplementar a fórmula.
 */

export type HolidayInput = Date | string

export interface ChequeDiscountInput {
  nominalValue: number
  monthlyInterestRatePercent: number
  issueDate: string | Date
  dueDate: string | Date
  /** Lista de feriados a considerar. Se omitida, usa os feriados nacionais padrão. */
  holidays?: HolidayInput[]
  /**
   * Se `true` (padrão), a taxa diária percentual é arredondada para 2 casas
   * decimais (para cima) antes de ser convertida em decimal. Se `false`, usa
   * a taxa diária exata (monthlyInterestRatePercent / calculatedDays / 100).
   */
  roundDailyRate?: boolean
}

export interface ChequeDiscountResult {
  nominalValue: number
  monthlyInterestRatePercent: number
  monthlyInterestRateDecimal: number
  dailyInterestRatePercent: number
  dailyInterestRateDecimal: number
  issueDate: string
  originalDueDate: string
  adjustedDueDate: string
  calendarDays: number
  businessDays: number
  calculatedDays: number
  monthlyDiscountValue: number
  dailyDiscountValue: number
  totalDiscountValue: number
  netValue: number
  wasDueDateAdjusted: boolean
  dueDateAdjustmentReason: string | null
}

// ─── Utilitários de data ──────────────────────────────────────────────────

/** Converte uma string ISO ("yyyy-mm-dd" ou "yyyy-mm-ddTHH:mm:ss...") para Date local à meia-noite. */
export function parseISODate(date: string): Date {
  const [y, m, d] = date.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Formata uma Date para "yyyy-mm-dd" usando o calendário local (sem deslocamento de timezone). */
export function formatISODate(date: Date): string {
  const ano = date.getFullYear()
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const dia = String(date.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/** Normaliza qualquer entrada (string ISO ou Date) para uma Date à meia-noite local. */
function toLocalMidnight(date: string | Date): Date {
  const d = typeof date === 'string' ? parseISODate(date) : date
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function sameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// ─── Feriados ──────────────────────────────────────────────────────────────

/** Gera a lista de feriados nacionais (fixos + móveis) para os anos informados. */
export function getDefaultHolidays(years: number[]): Date[] {
  const anosUnicos = Array.from(new Set(years))
  return anosUnicos.flatMap(gerarFeriadosDoAno)
}

function isHoliday(date: Date, holidays: HolidayInput[]): boolean {
  return holidays.some((h) => sameDate(toLocalMidnight(h), date))
}

// ─── Funções de dia útil (seção 9) ──────────────────────────────────────────

/** Sábado, domingo ou data presente em `holidays` não são dias úteis. */
export function isBusinessDay(date: Date, holidays: HolidayInput[] = []): boolean {
  const d = toLocalMidnight(date)
  const diaSemana = d.getDay()
  if (diaSemana === 0 || diaSemana === 6) return false
  return !isHoliday(d, holidays)
}

/** Avança dia a dia até encontrar um dia útil. Retorna a própria data se já for um dia útil. */
export function adjustToNextBusinessDay(date: Date, holidays: HolidayInput[] = []): Date {
  let d = toLocalMidnight(date)
  while (!isBusinessDay(d, holidays)) {
    d = addDays(d, 1)
  }
  return d
}

/** Conta os dias úteis entre startDate (exclusivo) e endDate (inclusivo). Apenas informativo. */
export function countBusinessDays(startDate: Date, endDate: Date, holidays: HolidayInput[] = []): number {
  const start = toLocalMidnight(startDate)
  const end = toLocalMidnight(endDate)
  if (end <= start) return 0

  let count = 0
  let atual = addDays(start, 1)
  while (atual <= end) {
    if (isBusinessDay(atual, holidays)) count++
    atual = addDays(atual, 1)
  }
  return count
}

/** Diferença em dias corridos entre startDate e endDate (normalizando timezone). */
export function countCalendarDays(startDate: Date | string, endDate: Date | string): number {
  const start = toLocalMidnight(startDate)
  const end = toLocalMidnight(endDate)
  const diffMs = end.getTime() - start.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

// ─── Arredondamento monetário ───────────────────────────────────────────────

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100 || 0
}

/**
 * Arredonda a taxa diária percentual para 2 casas decimais "para cima"
 * (ex: 10 / 30 dias = 0,333333 → 0,34), conforme o rascunho da reunião
 * descrito na especificação (roundDailyRate = true).
 */
function roundDailyRateUp(percent: number): number {
  return Math.ceil(percent * 100 - 1e-9) / 100 || 0
}

// ─── Função central de cálculo (seção 8) ────────────────────────────────────

export function calculateChequeDiscount(input: ChequeDiscountInput): ChequeDiscountResult {
  const {
    nominalValue,
    monthlyInterestRatePercent,
    issueDate,
    dueDate,
    roundDailyRate = true,
  } = input

  const issueDateNorm = toLocalMidnight(issueDate)
  const originalDueDateNorm = toLocalMidnight(dueDate)

  const holidays =
    input.holidays ??
    getDefaultHolidays([
      issueDateNorm.getFullYear(),
      originalDueDateNorm.getFullYear(),
      originalDueDateNorm.getFullYear() + 1,
    ])

  const adjustedDueDateNorm = adjustToNextBusinessDay(originalDueDateNorm, holidays)
  const wasDueDateAdjusted = !sameDate(adjustedDueDateNorm, originalDueDateNorm)

  let dueDateAdjustmentReason: string | null = null
  if (wasDueDateAdjusted) {
    const diaSemana = originalDueDateNorm.getDay()
    if (diaSemana === 6) {
      dueDateAdjustmentReason = 'Vencimento caiu no sábado. Ajustado para o próximo dia útil.'
    } else if (diaSemana === 0) {
      dueDateAdjustmentReason = 'Vencimento caiu no domingo. Ajustado para o próximo dia útil.'
    } else {
      dueDateAdjustmentReason = 'Vencimento caiu em feriado. Ajustado para o próximo dia útil.'
    }
  }

  const calendarDays = countCalendarDays(issueDateNorm, adjustedDueDateNorm)
  const businessDays = countBusinessDays(issueDateNorm, adjustedDueDateNorm, holidays)
  const calculatedDays = calendarDays

  const monthlyInterestRateDecimal = monthlyInterestRatePercent / 100
  const dailyInterestRatePercentExact =
    calculatedDays > 0 ? monthlyInterestRatePercent / calculatedDays : 0
  const dailyInterestRatePercent = roundDailyRate
    ? roundDailyRateUp(dailyInterestRatePercentExact)
    : dailyInterestRatePercentExact
  const dailyInterestRateDecimal = dailyInterestRatePercent / 100

  const monthlyDiscountValue = roundMoney(nominalValue * monthlyInterestRateDecimal)
  const dailyDiscountValue = roundMoney(nominalValue * dailyInterestRateDecimal)
  const totalDiscountValue = roundMoney(nominalValue * calculatedDays * dailyInterestRateDecimal)
  const netValue = roundMoney(nominalValue - totalDiscountValue)

  return {
    nominalValue,
    monthlyInterestRatePercent,
    monthlyInterestRateDecimal,
    dailyInterestRatePercent,
    dailyInterestRateDecimal,
    issueDate: formatISODate(issueDateNorm),
    originalDueDate: formatISODate(originalDueDateNorm),
    adjustedDueDate: formatISODate(adjustedDueDateNorm),
    calendarDays,
    businessDays,
    calculatedDays,
    monthlyDiscountValue,
    dailyDiscountValue,
    totalDiscountValue,
    netValue,
    wasDueDateAdjusted,
    dueDateAdjustmentReason,
  }
}
