const FERIADOS_FIXOS: string[] = [
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '12-25', // Natal
]

function calcularPascoa(ano: number): Date {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(ano, mes - 1, dia)
}

function getFeriadosVariaveis(ano: number): Date[] {
  const pascoa = calcularPascoa(ano)
  const addDias = (base: Date, dias: number): Date => {
    const d = new Date(base)
    d.setDate(d.getDate() + dias)
    return d
  }

  return [
    addDias(pascoa, -48), // Carnaval (segunda)
    addDias(pascoa, -47), // Carnaval (terça)
    addDias(pascoa, -2),  // Sexta-feira Santa
    pascoa,               // Páscoa
    addDias(pascoa, 60),  // Corpus Christi
  ]
}

/** Lista de feriados (fixos + móveis) de um ano, para reuso por outros módulos de cálculo. */
export function gerarFeriadosDoAno(ano: number): Date[] {
  const fixos = FERIADOS_FIXOS.map((mmdd) => {
    const [mes, dia] = mmdd.split('-').map(Number)
    return new Date(ano, mes - 1, dia)
  })
  return [...fixos, ...getFeriadosVariaveis(ano)]
}

export function calcularDiasCorreidos(dataInicio: Date, dataFim: Date): number {
  if (dataFim <= dataInicio) return 0
  const diff = dataFim.getTime() - dataInicio.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// taxa_juros_mes em % ao mês (ex: 3.3 = 3,3% a.m.)
// Fórmula: taxa_dia = taxa_mensal / 30 (dias corridos)
// juros = valor × dias_corridos × taxa_dia (decimal)
// valor_líquido = valor - juros  (desconto, não soma)
export function calcularJuros(
  valorNominal: number,
  taxaJurosMes: number,
  diasCorreidos: number
): number {
  const taxaDia = taxaJurosMes / 30
  return valorNominal * (taxaDia / 100) * diasCorreidos
}
