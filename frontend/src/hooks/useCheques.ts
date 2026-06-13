import { useState, useCallback, useEffect } from 'react'
import type { Cheque, ChequeFormData, ChequeStatus, Emitente, MotivoDevolucao } from '../types/cheque'
import type { ChequeEdicaoData } from '../components/FormularioEdicaoCheque'
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
  removerCheque: (id: string) => Promise<void>
  salvarEmitente: (emitente: Omit<Emitente, 'id'>) => Promise<void>
}

export function useCheques(): UsarChequesReturn {
  const [cheques, setCheques] = useState<Cheque[]>([])
  const [emitentes, setEmitentes] = useState<Emitente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([chequesService.listar(), emitentesService.listar()])
      .then(([cs, es]) => {
        setCheques(cs)
        setEmitentes(es)
      })
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : 'Erro ao carregar dados'))
      .finally(() => setIsLoading(false))
  }, [])

  const adicionarCheque = useCallback(async (dados: ChequeFormData) => {
    const novo = await chequesService.criar(dados)
    setCheques((prev) => [novo, ...prev])
  }, [])

  const editarCheque = useCallback(async (id: string, dados: ChequeEdicaoData) => {
    await chequesService.editar(id, dados as Record<string, unknown>)
    setCheques((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, ...dados, updated_at: new Date().toISOString() } : c
      )
    )
  }, [])

  const atualizarStatus = useCallback(
    async (id: string, status: ChequeStatus, extra?: Partial<Cheque>) => {
      await chequesService.atualizarStatus(id, status, extra)
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

  const removerCheque = useCallback(async (id: string) => {
    await chequesService.remover(id)
    setCheques((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const salvarEmitente = useCallback(async (dados: Omit<Emitente, 'id'>) => {
    const salvo = await emitentesService.salvar(dados)
    setEmitentes((prev) => {
      const existe = prev.find((e) => e.cpf_cnpj === dados.cpf_cnpj)
      return existe
        ? prev.map((e) => (e.cpf_cnpj === dados.cpf_cnpj ? salvo : e))
        : [...prev, salvo]
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
    removerCheque,
    salvarEmitente,
  }
}

export type { MotivoDevolucao }
