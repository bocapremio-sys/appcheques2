-- Migration 002: Emitentes (perfis salvos) e Parcelas (parcelamento)
-- Executar no SQL Editor do Supabase após 001_create_cheques.sql

-- ─── Emitentes ────────────────────────────────────────────────────────────────

CREATE TABLE emitentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf_cnpj VARCHAR(18) NOT NULL UNIQUE,
  banco VARCHAR(3) NOT NULL,
  agencia VARCHAR(4) NOT NULL,
  conta VARCHAR(12) NOT NULL,
  taxa_juros_dia NUMERIC(6, 4) NOT NULL DEFAULT 0.033 CHECK (taxa_juros_dia >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emitentes_cpf_cnpj ON emitentes(cpf_cnpj);
CREATE INDEX idx_emitentes_nome ON emitentes(nome);

CREATE TRIGGER emitentes_updated_at
  BEFORE UPDATE ON emitentes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE emitentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso autenticado emitentes" ON emitentes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── Parcelas ─────────────────────────────────────────────────────────────────

CREATE TABLE parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cheque_id UUID NOT NULL REFERENCES cheques(id) ON DELETE CASCADE,
  numero SMALLINT NOT NULL CHECK (numero >= 1),
  data_vencimento DATE NOT NULL,
  valor NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
  pago BOOLEAN NOT NULL DEFAULT FALSE,
  data_pagamento DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (cheque_id, numero),
  CONSTRAINT pagamento_requer_data CHECK (NOT pago OR data_pagamento IS NOT NULL)
);

CREATE INDEX idx_parcelas_cheque_id ON parcelas(cheque_id);
CREATE INDEX idx_parcelas_pago ON parcelas(pago) WHERE NOT pago;

CREATE TRIGGER parcelas_updated_at
  BEFORE UPDATE ON parcelas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso autenticado parcelas" ON parcelas
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── Adicionar colunas de parcelamento em cheques ─────────────────────────────

ALTER TABLE cheques
  ADD COLUMN total_parcelas SMALLINT CHECK (total_parcelas IS NULL OR total_parcelas >= 2),
  ADD COLUMN parcelas_pagas SMALLINT NOT NULL DEFAULT 0 CHECK (parcelas_pagas >= 0);
