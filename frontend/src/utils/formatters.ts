export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

export function formatarData(dataStr: string): string {
  if (!dataStr) return '-'
  const [ano, mes, dia] = dataStr.split('T')[0].split('-')
  return `${dia}/${mes}/${ano}`
}

export function formatarPercentual(valor: number): string {
  return `${valor.toFixed(2).replace('.', ',')}%`
}

export function formatarCpfCnpj(valor: string): string {
  const numeros = valor.replace(/\D/g, '')
  if (numeros.length === 11) {
    return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (numeros.length === 14) {
    return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return valor
}

export function validarCpf(cpf: string): boolean {
  const numeros = cpf.replace(/\D/g, '')
  if (numeros.length !== 11) return false
  if (/^(\d)\1{10}$/.test(numeros)) return false

  let soma = 0
  for (let i = 0; i < 9; i++) soma += parseInt(numeros[i]) * (10 - i)
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(numeros[9])) return false

  soma = 0
  for (let i = 0; i < 10; i++) soma += parseInt(numeros[i]) * (11 - i)
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  return resto === parseInt(numeros[10])
}

export function validarCnpj(cnpj: string): boolean {
  const numeros = cnpj.replace(/\D/g, '')
  if (numeros.length !== 14) return false
  if (/^(\d)\1{13}$/.test(numeros)) return false

  const calcDigito = (base: string, pesos: number[]): number => {
    const soma = base.split('').reduce((acc, d, i) => acc + parseInt(d) * pesos[i], 0)
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const d1 = calcDigito(numeros.slice(0, 12), pesos1)
  const d2 = calcDigito(numeros.slice(0, 13), pesos2)

  return d1 === parseInt(numeros[12]) && d2 === parseInt(numeros[13])
}

export function validarCpfCnpj(valor: string): boolean {
  const numeros = valor.replace(/\D/g, '')
  if (numeros.length === 11) return validarCpf(numeros)
  if (numeros.length === 14) return validarCnpj(numeros)
  return false
}
