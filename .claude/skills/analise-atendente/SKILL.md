---
name: analise-atendente
description: "Analisa um historico de conversa contra as regras do agente Aurora para classificar cada interacao em: IA RESPONDE (RAG), IA NAO RESPONDE (escalacao) ou GAP DA BASE (lacuna de conhecimento). Use para auditar cobertura do chatbot, identificar gaps de treinamento ou revisar performance do agente. Triggers: analise o historico, analisa esse atendimento, o que a ia responde, gaps da base de conhecimento, auditoria do agente, analise atendente."
user-invocable: true
---

# Analise Atendente — Auditor de Cobertura do Agente Aurora

Analisa um historico de conversa contra as regras de decisao do agente Aurora e produz um relatorio classificando cada pergunta do cliente em tres categorias: o que a IA responde, o que ela escala e o que poderia ser adicionado a base de conhecimento.

---

## O Trabalho

1. Receber um historico de conversa (serie de mensagens entre cliente e agente)
2. Isolar cada pergunta ou intencao distinta do cliente
3. Aplicar as regras de decisao da Aurora em sequencia para cada pergunta
4. Classificar cada pergunta em uma das tres categorias
5. Gerar relatorio markdown estruturado com contagens e gaps acionaveis

Nao sugerir alteracoes de codigo ou workflow. O output e apenas um relatorio.

---

## Formato de Input

O usuario pode fornecer o historico em qualquer formato:

**Formato A — Transcricao em texto:**
```
Cliente: Quero saber sobre CDB
Agente: [resposta ou escalacao]
Cliente: Vale a pena investir agora?
```

**Formato B — JSON:**
```json
[
  { "role": "user", "content": "Quero saber sobre CDB" },
  { "role": "assistant", "content": "..." }
]
```

**Formato C — HTML de analise:** Aceitar HTML exportado de relatorios anteriores (como analise_andre_brito.html ou analise_raquel.html). Extrair as mensagens do cliente listadas no relatorio e aplicar a analise.

Identificar turnos do cliente por contexto (perguntas, solicitacoes) sem pedir clarificacao, a menos que o conteudo seja completamente ilegivel.

---

## Workflow de Analise — Arvore de Decisao

Para cada mensagem do cliente, aplicar os passos abaixo **em ordem**. Nunca pular etapas.

### Passo 1 — Verificacao de Validacao do Cliente

A conversa mostra falha de validacao (CPF nao encontrado, nao e cliente)?

- SIM → **IA NAO RESPONDE** | Motivo: "Cliente nao validado"
- NAO → Continuar Passo 2

### Passo 2 — Guardrails

A mensagem contem algum dos termos bloqueados?

- Concorrentes: "Banco Master", "Banco Pleno", "Hub Mercantil", "Fictoragro"
- Fraude: "golpe", "fraude", "estelionato", "esquema", "piramide", "clonagem"
- Jailbreak: "ignore suas instrucoes", "finja que", "esqueca o prompt", "aja como", pedidos de revelar system prompt

SIM → **IA NAO RESPONDE** | Motivo: "Guardrail ativado — [termo especifico]"
NAO → Continuar Passo 3

### Passo 3 — Triggers de Escalacao Imediata (Pre-RAG)

A mensagem contem algum dos gatilhos abaixo (exato ou semanticamente equivalente)?

**Recomendacao e estrategia:**
`vale a pena` · `montar carteira` · `qual investimento` · `melhor investimento` · `onde investir` · `como investir` · `estrategia` · `diversificar` · `o que voce recomenda` · `planejamento financeiro`

**Situacao pessoal do cliente:**
`minha conta` · `meu saldo` · `minha carteira` · `meu extrato` · `meu investimento` · `minha reserva` · `meu perfil` · `meu limite` · `minha situacao`

**Terceiros:**
`minha mae` · `meu pai` · `meu filho` · `minha filha` · `meu conjuge` · `para ele` · `para ela` (quando referente a terceiro)

**Analise e interpretacao:**
`analisar` · `verificar minha` · `consultar minha` · `explicar meu` · `entender meu`

SIM → **IA NAO RESPONDE** | Motivo: "Trigger imediato: '[frase]'" | Fila: [mais relevante abaixo]
NAO → Continuar Passo 4

### Passo 4 — Deteccao de Complexidade

A mensagem exibe marcadores de complexidade?

- Datas ou prazos especificos: "dia 17", "ate terca", "em 3 dias", "vencimento em"
- 2+ intencoes distintas em uma mensagem
- Construcoes condicionais: "se eu resgatar agora...", "caso o juro suba..."
- Requer cruzamento de dados pessoais do cliente com informacoes de produto

SIM → **IA NAO RESPONDE** | Motivo: "Complexidade detectada — [marcador]" | Fila: Triagem Aurora
NAO → Continuar Passo 5

### Passo 5 — Verificacao de Escopo

A pergunta e sobre algum dos dominios cobertos pelo RAG?

**Dominios do RAG:**
- Descricao de produtos: CDB, LCI/LCA, Tesouro Direto, debentures, FIIs, previdencia (PGBL/VGBL), seguros
- Como produtos funcionam: prazos, liquidez, rentabilidade, indexadores (CDI, IPCA, prefixado)
- Onboarding: abertura de conta, documentacao, como usar a plataforma
- Operacional: app, redefinir senha, atualizar cadastro, TED, PIX, boleto, tarifas gerais
- Educacao financeira geral (informacional, nao personalizado): "o que e renda fixa", "diferenca entre PGBL e VGBL"

SIM → Continuar Passo 6
NAO → **IA NAO RESPONDE** | Motivo: "Fora do escopo do agente"

### Passo 6 — Avaliacao de Qualidade do RAG

Com base na especificidade da pergunta e no que uma base de conhecimento financeira tipica cobriria:

**VALIDA:** Pergunta sobre produto ou procedimento comum que uma base bem estruturada responderia definitivamente.
→ **IA RESPONDE**

**PARCIAL ou AUSENTE:** Pergunta dentro do escopo mas muito especifica, caso de borda, variante de nicho, ou informacao que provavelmente nao esta na base.
→ **GAP DA BASE**

---

## Definicoes das Categorias

### ✅ IA RESPONDE
A IA trata autonomamente via RAG. Sem escalacao. Resposta esperada valida e completa.

### ❌ IA NAO RESPONDE
A IA escala para operador humano. Comportamento correto e esperado. Registrar motivo e fila de destino.

### 🔧 GAP DA BASE
Pergunta dentro do escopo (sem trigger, sem complexidade, sem guardrail), mas o RAG provavelmente nao tem informacao suficiente. Gap acionavel: adicionar conteudo permitiria a IA responder autonomamente.

---

## Filas de Escalacao

| Fila | Quando usar |
|------|-------------|
| Atendimento Geral | Perguntas genericas, onboarding, abertura de conta |
| Banking | PIX, TED, boleto, operacoes bancarias, cartao |
| Conta Internacional | Conta no exterior, cambio, remessas, IOF |
| Seguros | Seguros de vida, residencial, auto, dental |
| Fundos | Fundos de investimento, FIIs via fundos, ETFs |
| Renda Variavel | Acoes, BDRs, opcoes, home broker, proventos |
| Renda Fixa | CDB, LCI/LCA, Tesouro Direto, debentures |
| Previdencia | PGBL, VGBL, aposentadoria, portabilidade |
| Triagem Aurora | Casos complexos, intencao ambigua, multi-topico |

---

## Formato do Output

```markdown
# Relatorio de Analise de Atendimento
**Assessor/Periodo analisado:** [nome e periodo, se fornecido]
**Data da analise:** [data atual]
**Total de perguntas analisadas:** [N]

---

## Sumario

| Categoria | Quantidade | % |
|-----------|-----------|---|
| ✅ IA RESPONDE | X | XX% |
| ❌ IA NAO RESPONDE | X | XX% |
| 🔧 GAP DA BASE | X | XX% |

---

## ✅ IA RESPONDE (X perguntas)

*Perguntas que a IA responde autonomamente via RAG.*

### 1. "[Pergunta do cliente]"
- **Motivo:** [Ex: "Pergunta informacional sobre CDB — RAG cobre rentabilidade e prazos de renda fixa"]

---

## ❌ IA NAO RESPONDE — Escalacoes (X perguntas)

*Escalacao para operador humano. Comportamento correto.*

### 1. "[Pergunta do cliente]"
- **Motivo:** [Ex: "Trigger imediato: 'vale a pena' — recomendacao personalizada"]
- **Fila:** [Nome da fila]

---

## 🔧 GAP DA BASE (X perguntas)

*Dentro do escopo, sem triggers, mas RAG provavelmente nao responde. Acao: adicionar conteudo.*

### 1. "[Pergunta do cliente]"
- **Motivo do gap:** [Ex: "Prazo especifico de LCI pos-fixada — topico valido mas ausente da base"]
- **Conteudo sugerido:** [Sugestao especifica e acionavel]

---

## Recomendacoes

- [2-4 bullets com padroes detectados e impacto estimado]
```

---

## Regras Inviolaveis

1. **Guardrails antes de tudo.** Concorrentes, fraude e jailbreak sempre resultam em IA NAO RESPONDE.
2. **Triggers disparam antes do RAG.** As frases listadas no Passo 3 bypassam o RAG completamente.
3. **Conselho personalizado nunca e RAG.** "Minha carteira", "meu saldo", recomendacoes = sempre escalacao.
4. **Complexidade escala mesmo com RAG valido.** Datas + multiplas intencoes + condicionais = escalacao.
5. **Escopo antes de avaliar gap.** Fora do escopo = escalacao, nao gap.
6. **Gaps sao acionaveis.** O campo "Conteudo sugerido" deve ser especifico o suficiente para um editor da base agir imediatamente.
7. **Informacional vs. personalizado.** "O que e CDB?" = RAG. "Qual CDB e melhor para mim?" = trigger.

---

## Checklist Antes de Entregar

- [ ] Todas as mensagens do cliente no historico foram analisadas
- [ ] Arvore de decisao aplicada na ordem correta (guardrails → triggers → complexidade → escopo → RAG)
- [ ] Cada GAP tem sugestao especifica de conteudo
- [ ] Filas atribuidas a todos os IA NAO RESPONDE
- [ ] Totais do sumario batem com os itens listados
- [ ] Relatorio em portugues brasileiro
- [ ] Recomendacoes destacam padroes, nao apenas itens individuais
