---
name: n8n-node-analyzer
description: Analisa nodes n8n e infere a regra de negócio embutida em cada um — Postgres (INSERT/UPDATE/UPSERT/SELECT), HTTP Request, e Code nodes. Produz documentação curta e estruturada com tipo de operação, campo(s) de match/conflito, ação quando existe/não existe registro, e observações de performance ou segurança. Use quando o usuário colar configuração de um node e quiser entender rapidamente o que ele faz dentro do fluxo.
---

# n8n Node Analyzer

Analisa a configuração de nodes n8n e produz documentação curta que descreve a regra de negócio embutida.

---

## Quando usar esta skill

- Usuário cola JSON de configuração de um node
- Usuário pede "o que esse node faz?"
- Usuário quer entender o comportamento de um fluxo sem reler queries inteiras
- Revisão de fluxos n8n antes de deploy em produção

---

## Formato de Saída Obrigatório

Sempre responda no formato:

```
**Node:** {nome do node}

**Tipo:** {Postgres INSERT | Postgres UPDATE | Postgres UPSERT | Postgres SELECT | HTTP Request | Code | outros}

**Match:** {campo(s) que definem conflito/chave — ex.: `account`, `id`, `ON CONFLICT (account)`, ou "N/A"}

**Ação (existe):** {o que acontece quando o registro JÁ existe — ex.: atualiza `saldo`, ignora, substitui}

**Ação (não existe):** {o que acontece quando o registro NÃO existe — ex.: insere novo, retorna vazio}

**Observações:** {detalhes de performance, segurança, ou lógica especial — ver seção abaixo}
```

Se o node for parte de um fluxo maior com contexto fornecido, adicione:

```
**Contexto no fluxo:** {como esse node se conecta aos anteriores/posteriores — ex.: "alimenta o UPDATE que inativa contas ausentes"}
```

---

## Regras de Inferência por Tipo de Node

### Postgres — Execute Query

Leia o campo `query` e classifique:

| Padrão na query | Tipo inferido |
|----------------|---------------|
| `INSERT INTO ... ON CONFLICT (...) DO UPDATE` | **UPSERT** |
| `INSERT INTO ... ON CONFLICT (...) DO NOTHING` | **INSERT com skipOnConflict** |
| `INSERT INTO` (sem ON CONFLICT) | **INSERT** |
| `UPDATE ... SET ... WHERE` | **UPDATE** |
| `SELECT ... FROM` | **SELECT** |
| `DELETE FROM ... WHERE` | **DELETE** |

**Match:** extraia o campo do `ON CONFLICT (campo)` ou do `WHERE campo = $N`.

**Ação existe/não existe:** leia o `DO UPDATE SET ...` para saber o que muda. Se for `DO NOTHING`, a ação quando existe é "ignora".

**Prepared statements:** se a query usa `$1, $2, ...`, é segura contra SQL injection. Se usa interpolação `{{ $json.campo }}` diretamente na query, **aponte como risco de segurança**.

**Exemplo de inferência:**
```sql
INSERT INTO accounts (account, saldo)
VALUES ($1, $2)
ON CONFLICT (account)
DO UPDATE SET saldo = EXCLUDED.saldo
WHERE accounts.write_timestamp < EXCLUDED.write_timestamp
```
→ UPSERT, MATCH `account`, atualiza apenas se `write_timestamp` for mais novo.

---

### Postgres — Insert / Update nodes (UI, não raw query)

Leia os campos:
- `operation`: insert, update, upsert
- `table`: nome da tabela
- `columns` / `columnMappings`: colunas que entram
- `matchingColumns`: chave de conflito (para upsert/update)
- `skipOnConflict`: se true, INSERT ignora conflito

**Formato curto:** `UPSERT → MATCH (matchingColumns)` ou `INSERT → MATCH (id com skipOnConflict)`.

---

### HTTP Request

Leia:
- `method`: GET, POST, PUT, PATCH, DELETE
- `url`: endpoint destino
- `body` / `bodyParameters`: o que é enviado
- `authentication`: tipo de auth usado

**Inferência:** descreva o que o node envia e o que espera receber.

**Exemplo:**
```
Tipo: HTTP POST
Match: N/A
Ação (existe): substitui recurso no endpoint externo
Ação (não existe): cria novo recurso
Observações: autenticação via Header — verificar se o token está em variável de ambiente ou hardcoded
```

---

### Code Node (JavaScript/Python)

Leia o campo `jsCode` ou `pythonCode` e infira:

1. **O que entra:** `$input.all()`, `$json`, variáveis recebidas
2. **Transformações:** normalização, cálculos, formatação
3. **O que sai:** campos retornados no `return`

**Exemplo de inferência:**
```js
const items = $input.all();
return items.map(item => ({
  json: {
    account: item.json.account.trim().toLowerCase(),
    saldo: parseFloat(item.json.saldo) || 0
  }
}));
```
→ Normaliza `account` (trim + lowercase) e converte `saldo` para float com fallback 0.

---

## Observações Importantes — Quando Comentar

Comente nas **Observações** quando identificar:

| Situação | O que escrever |
|----------|----------------|
| Condição no `DO UPDATE SET ... WHERE` | "Só atualiza se `campo` mudar — idempotente por design" |
| `DO NOTHING` | "Silencioso em conflito — sem erro, sem update" |
| Interpolação `{{ }}` na query SQL | "⚠️ Risco de SQL injection — prefira prepared statements `$1, $2`" |
| Node que inativa registros ausentes | "Parte de um padrão sync: inativa o que não veio no lote" |
| Auth hardcoded na URL ou body | "⚠️ Credencial exposta — mover para Credential n8n ou variável de ambiente" |
| Query sem `WHERE` em UPDATE/DELETE | "⚠️ Afeta TODOS os registros da tabela" |
| Paginação ou loop implícito | "Processa em lote — verificar se o volume cabe em memória" |

---

## Análise de Fluxo Completo

Se o usuário fornecer múltiplos nodes em sequência, analise cada um e depois adicione uma seção:

```
## Fluxo resumido

1. {Node 1}: {regra curta}
2. {Node 2}: {regra curta}
3. {Node 3}: {regra curta}

**Padrão identificado:** {ex.: "Sync full-replace: UPSERT lote → UPDATE inativa ausentes"}
```

Padrões comuns para reconhecer:

| Padrão | Sinal |
|--------|-------|
| **Sync com inativação** | UPSERT de lote + UPDATE WHERE id NOT IN (...) |
| **Insert idempotente** | INSERT ON CONFLICT DO NOTHING |
| **Replace condicional** | UPSERT com WHERE write_timestamp < EXCLUDED |
| **ETL normalizar→gravar** | Code (normaliza) → Postgres (grava) |
| **Webhook→DB** | HTTP trigger → Code (valida) → Postgres (persiste) |

---

## Exemplos de Saída

### Exemplo 1 — UPSERT condicional

**Node:** Upsert Accounts

**Tipo:** Postgres UPSERT

**Match:** `account`

**Ação (existe):** atualiza `saldo` e `write_timestamp` — somente se `write_timestamp` do registro existente for mais antigo

**Ação (não existe):** insere novo registro com `account`, `saldo`, `write_timestamp`

**Observações:** Padrão idempotente seguro para reprocessamento — registros mais novos nunca são sobrescritos por dados antigos.

---

### Exemplo 2 — UPDATE com inativação

**Node:** Inativar Contas Ausentes

**Tipo:** Postgres UPDATE

**Match:** `account NOT IN (lista do lote atual)`

**Ação (existe):** define `ativo = false` para contas que não vieram no lote

**Ação (não existe):** N/A — UPDATE só afeta quem existe

**Observações:** Parte do padrão sync full-replace. Executa após o UPSERT do lote para garantir que contas removidas da fonte sejam inativadas.

---

### Exemplo 3 — Code de normalização

**Node:** Normalizar Dados

**Tipo:** Code (JavaScript)

**Match:** N/A

**Ação (existe):** N/A

**Ação (não existe):** N/A

**Observações:** Normaliza `account` (trim + lowercase) e converte `saldo` para float com fallback 0. Protege o UPSERT seguinte contra erros de tipo.
