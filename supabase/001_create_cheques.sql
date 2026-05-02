-- Migration: Criar tabela de cheques em custódia
-- Executar no SQL Editor do Supabase

CREATE TYPE cheque_status AS ENUM (
  'em_custodia',
  'compensado',
  'devolvido',
  'cancelado'
);

CREATE TYPE motivo_devolucao AS ENUM (
  'sem_fundos',
  'conta_encerrada',
  'assinatura_divergente',
  'cheque_sustado',
  'prescrito',
  'outros'
  
);

CREATE TABLE cheques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(10) NOT NULL,
  emitente TEXT NOT NULL,
  cpf_cnpj VARCHAR(18) NOT NULL,
  banco VARCHAR(3) NOT NULL,
  agencia VARCHAR(4) NOT NULL,
  conta VARCHAR(12) NOT NULL,
  valor_nominal NUMERIC(12, 2) NOT NULL CHECK (valor_nominal > 0),
  data_emissao DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  data_entrada_custodia DATE NOT NULL,
  taxa_juros_dia NUMERIC(6, 4) NOT NULL CHECK (taxa_juros_dia >= 0),
  status cheque_status NOT NULL DEFAULT 'em_custodia',
  motivo_devolucao motivo_devolucao,
  data_compensacao DATE,
  data_devolucao DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT vencimento_apos_emissao CHECK (data_vencimento >= data_emissao),
  CONSTRAINT devolucao_requer_motivo CHECK (
    status != 'devolvido' OR motivo_devolucao IS NOT NULL
  ),
  CONSTRAINT compensado_requer_data CHECK (
    status != 'compensado' OR data_compensacao IS NOT NULL
  ),
  CONSTRAINT devolvido_requer_data CHECK (
    status != 'devolvido' OR data_devolucao IS NOT NULL
  )
);

-- Índices para performance
CREATE INDEX idx_cheques_status ON cheques(status);
CREATE INDEX idx_cheques_vencimento ON cheques(data_vencimento);
CREATE INDEX idx_cheques_cpf_cnpj ON cheques(cpf_cnpj);
CREATE INDEX idx_cheques_emitente ON cheques(emitente);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cheques_updated_at
  BEFORE UPDATE ON cheques
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS)
ALTER TABLE cheques ENABLE ROW LEVEL SECURITY;

-- Política: usuários autenticados podem ler e escrever seus próprios dados
-- Ajustar conforme modelo de autenticação do projeto
CREATE POLICY "Acesso autenticado" ON cheques
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
