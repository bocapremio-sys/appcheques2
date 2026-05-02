import { supabase } from './supabase'
import type { Emitente } from '../types/cheque'

const TABELA = 'emitentes'

export const emitentesService = {
  async listar(): Promise<Emitente[]> {
    const { data, error } = await supabase!
      .from(TABELA)
      .select('*')
      .order('nome', { ascending: true })
    if (error) throw new Error(error.message)
    return data as Emitente[]
  },

  async salvar(dados: Omit<Emitente, 'id'>): Promise<Emitente> {
    const { data, error } = await supabase!
      .from(TABELA)
      .upsert({ ...dados }, { onConflict: 'cpf_cnpj' })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as Emitente
  },
}
