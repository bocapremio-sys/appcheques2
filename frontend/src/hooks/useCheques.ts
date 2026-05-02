import { useState, useCallback, useEffect } from 'react'
import type { Cheque, ChequeFormData, ChequeStatus, Emitente, MotivoDevolucao } from '../types/cheque'
import type { ChequeEdicaoData } from '../components/FormularioEdicaoCheque'
import { MOCK_CHEQUES, MOCK_EMITENTES } from '../utils/mockData'
import { gerarParcelas, registrarPagamentoParcela, todasPagas } from '../utils/parcelamento'
import { supabaseConfigurado } from '../services/supabase'
import { chequesService } from '../services/chequesService'
import { emitentesService } from '../services/emitentesService'

interface UsarChequesReturn {
  cheques: Cheque[]
  emitentes: Emitente[]
  isLoading: boolean
  erro: string | null
  adicionarCheque: (dados: ChequeFormData) => Promise<void>
  editarCheque: (id: string, dados: ChequeEdicaoData) => Promise<void>
  atualizarStatus: (id: string, status: ChequeStatus, extra?: Partial<Cheque>) => Promise<void>
  registrarPagamento: (id: string, numeroParcela: number, dataPagamento: string) => Promise<void>
  removerCheque: (id: string) => Promise<void>
  salvarEmitente: (emitente: Omit<Emitente, 'id'>) => Promise<void>
}

export function useCheques(): UsarChequesReturn {
  const [cheques, setCheques] = useState<Cheque[]>(supabaseConfigurado ? [] : MOCK_CHEQUES)
  const [emitentes, setEmitentes] = useState<Emitente[]>(supabaseConfigurado ? [] : MOCK_EMITENTES)
  const [isLoading, setIsLoading] = useState(!!supabaseConfigurado)
  const [erro, setErro] = useState<string | null>(null)

  // Carrega dados do Supabase na inicialização
  useEffect(() => {
    if (!supabaseConfigurado) return

    Promise.all([chequesService.listar(), emitentesService.listar()])
      .then(([cs, es]) => {
        setCheques(cs)
        setEmitentes(es)
      })
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : 'Erro ao carregar dados'))
      .finally(() => setIsLoading(false))
  }, [])

  const adicionarCheque = useCallback(async (dados: ChequeFormData) => {
    if (supabaseConfigurado) {
      const novo = await chequesService.criar(dados)
      setCheques((prev) => [novo, ...prev])
      return
    }

    // Mock
    const totalParcelas = dados.total_parcelas && dados.total_parcelas > 1
      ? dados.total_parcelas
      : undefined
    const parcelas = totalParcelas
      ? gerarParcelas(dados.valor_nominal, totalParcelas, new Date(dados.data_entrada_custodia))
      : undefined

    setCheques((prev) => [
      {
        ...dados,
        id: crypto.randomUUID(),
        status: 'em_custodia',
        total_parcelas: totalParcelas,
        parcelas_pagas: totalParcelas ? 0 : undefined,
        parcelas,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      ...prev,
    ])
  }, [])

  const editarCheque = useCallback(async (id: string, dados: ChequeEdicaoData) => {
    if (supabaseConfigurado) {
      await chequesService.editar(id, dados as Record<string, unknown>)
    }
    setCheques((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, ...dados, updated_at: new Date().toISOString() } : c
      )
    )
  }, [])

  const atualizarStatus = useCallback(
    async (id: string, status: ChequeStatus, extra?: Partial<Cheque>) => {
      if (supabaseConfigurado) {
        await chequesService.atualizarStatus(id, status, extra)
      }
      setCheques((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, status, ...extra, updated_at: new Date().toISOString() }
            : c
        )
      )
    },
    []
  )

  const registrarPagamento = useCallback(
    async (id: string, numeroParcela: number, dataPagamento: string) => {
      setCheques((prev) =>
        prev.map((c) => {
          if (c.id !== id || !c.parcelas) return c

          const novasParcelas = registrarPagamentoParcela(c.parcelas, numeroParcela, dataPagamento)
          const pagas = novasParcelas.filter((p) => p.pago).length
          const finalizado = todasPagas(novasParcelas)

          if (supabaseConfigurado) {
            chequesService
              .registrarPagamentoParcela(id, numeroParcela, dataPagamento, pagas, finalizado)
              .catch((e: unknown) => setErro(e instanceof Error ? e.message : 'Erro ao registrar pagamento'))
          }

          return {
            ...c,
            parcelas: novasParcelas,
            parcelas_pagas: pagas,
            status: finalizado ? 'compensado' : c.status,
            data_compensacao: finalizado ? dataPagamento : c.data_compensacao,
            updated_at: new Date().toISOString(),
          }
        })
      )
    },
    []
  )

  const removerCheque = useCallback(async (id: string) => {
    if (supabaseConfigurado) {
      await chequesService.remover(id)
    }
    setCheques((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const salvarEmitente = useCallback(async (dados: Omit<Emitente, 'id'>) => {
    if (supabaseConfigurado) {
      const salvo = await emitentesService.salvar(dados)
      setEmitentes((prev) => {
        const existe = prev.find((e) => e.cpf_cnpj === dados.cpf_cnpj)
        return existe
          ? prev.map((e) => (e.cpf_cnpj === dados.cpf_cnpj ? salvo : e))
          : [...prev, salvo]
      })
      return
    }

    // Mock
    setEmitentes((prev) => {
      const existe = prev.find((e) => e.cpf_cnpj === dados.cpf_cnpj)
      if (existe) return prev.map((e) => (e.cpf_cnpj === dados.cpf_cnpj ? { ...e, ...dados } : e))
      return [...prev, { ...dados, id: crypto.randomUUID() }]
    })
  }, [])

  return {
    cheques,
    emitentes,
    isLoading,
    erro,
    adicionarCheque,
    editarCheque,
    atualizarStatus,
    registrarPagamento,
    removerCheque,
    salvarEmitente,
  }
}

export type { MotivoDevolucao }
