---
name: coladecar-adrank
description: |
  Analisa o Ad Rank e as métricas de competitividade de campanhas Product Ads do Mercado Livre.
  Use esta skill SEMPRE que o usuário perguntar sobre Ad Rank, impression share, impressões perdidas,
  performance de campanhas ML Ads, competitividade de anúncios no Mercado Livre, ou pedir um
  diagnóstico/plano de ação de campanhas. Triggers: "analisa meu ad rank", "como estão minhas
  campanhas", "impressões perdidas", "product ads performance", "meu anúncio não aparece",
  "diagnóstico de campanha ML", "plano de ação ads mercado livre".
  A skill usa o MCP do n8n para buscar dados via API do ML e entrega diagnóstico + plano de ação.
---

# ColaDeCor — Analisador de Ad Rank (Product Ads ML)

## Objetivo

Buscar as métricas de competitividade de campanhas Product Ads do Mercado Livre via n8n MCP,
calcular o diagnóstico de Ad Rank por campanha e entregar um plano de ação priorizado.

---

## Fluxo de execução

```
1. Coletar parâmetros → 2. Buscar via n8n → 3. Calcular diagnóstico → 4. Gerar plano de ação
```

### Passo 1 — Coletar parâmetros

Se o usuário não informou, perguntar:
- `ADVERTISER_ID` — ID do anunciante ML (ex: `123456789`)
- `ACCESS_TOKEN` — Bearer token ML válido
- `date_from` / `date_to` — período de análise (padrão: últimos 7 dias)
- `SITE_ID` — site do ML (padrão: `MLB` para Brasil)

Se o usuário informou os dados na conversa, use-os diretamente sem perguntar novamente.

---

### Passo 2 — Buscar dados via n8n MCP

Use a ferramenta `n8n` (MCP conectado) para executar um workflow HTTP que consulta a API do ML.
Siga o processo abaixo:

#### 2a. Buscar lista de campanhas + métricas de competitividade

Construa o payload para o n8n executar um HTTP GET:

```
URL: https://api.mercadolibre.com/advertising/advertisers/{ADVERTISER_ID}/product_ads/campaigns
     ?date_from={date_from}
     &date_to={date_to}
     &metrics=impression_share,top_impression_share,lost_impression_share_by_budget,lost_impression_share_by_ad_rank,clicks,prints,ctr,cost,cpc,acos,acos_benchmark,roas
Headers:
  api-version: 2
  Authorization: Bearer {ACCESS_TOKEN}
```

Se o n8n não tiver um workflow pronto para isso, instrua o usuário a criar um workflow simples
de HTTP Request no n8n (ver referência: `references/n8n-workflow-template.md`).

#### 2b. Buscar itens de cada campanha (opcional, para diagnóstico detalhado)

Para campanhas com `lost_impression_share_by_ad_rank > 20`, buscar os itens:

```
URL: https://api.mercadolibre.com/advertising/advertisers/{ADVERTISER_ID}/product_ads/campaigns/{CAMPAIGN_ID}/items
     ?date_from={date_from}&date_to={date_to}
     &metrics=clicks,prints,cost,cpc,acos
Headers:
  api-version: 2
  Authorization: Bearer {ACCESS_TOKEN}
```

---

### Passo 3 — Calcular diagnóstico de Ad Rank

Para cada campanha retornada, aplicar a lógica abaixo:

#### Classificação de saúde

| Condição | Status | Diagnóstico |
|---|---|---|
| `impression_share >= 60` e `lost_by_ad_rank <= 20` | 🟢 Saudável | Campanha competitiva |
| `lost_by_ad_rank` entre 20–40 | 🟡 Atenção | Ad Rank fraco, melhorar qualidade |
| `lost_by_ad_rank > 40` | 🔴 Crítico | Ad Rank muito baixo, ação imediata |
| `lost_by_budget > 30` | 🟠 Orçamento | Problema de budget, não de Ad Rank |
| `lost_by_ad_rank > 30` e `lost_by_budget > 30` | 🔴 Duplo problema | Ambos limitando |

#### Cálculo da equação de impressões

Verificar sempre:
```
impression_share + lost_by_budget + lost_by_ad_rank ≈ 100%
```
Se a soma divergir mais de 5%, alertar que os dados podem estar incompletos.

#### Benchmarks de referência (Product Ads ML)

- `impression_share` saudável: > 55%
- `lost_by_ad_rank` aceitável: < 20%
- `lost_by_budget` aceitável: < 15%
- `acos` saudável: comparar com `acos_benchmark` da própria campanha
- `ctr` saudável para ML: > 0.5%

---

### Passo 4 — Gerar output

#### Estrutura do relatório

**1. Resumo executivo** (1 parágrafo)
Status geral da conta: quantas campanhas saudáveis, em atenção, críticas.

**2. Tabela por campanha**

| Campanha | Status | IS | Perdido (AdRank) | Perdido (Budget) | ACOS | Diagnóstico principal |
|---|---|---|---|---|---|---|

**3. Diagnóstico detalhado por campanha problemática**

Para cada campanha com status 🟡 ou 🔴:
- Qual é o gargalo principal (Ad Rank ou Budget)
- Qual a diferença entre `acos` atual e `acos_benchmark`
- Quais itens da campanha têm pior performance (se dados disponíveis)

**4. Plano de ação priorizado**

Usar a lógica de priorização abaixo. Numerar as ações de 1 (mais urgente) em diante.

---

## Lógica de plano de ação

### Se o problema principal é Ad Rank (`lost_by_ad_rank > 20`)

**Ação 1 — Aumentar CPC da campanha**
> O CPC é metade da fórmula do Ad Rank. Se o orçamento não está se esgotando,
> aumentar o lance é a alavanca mais rápida.
> Como fazer: acessar o Gerenciador de Campanhas ML → editar campanha → aumentar CPC em 15–25%.

**Ação 2 — Auditar qualidade dos listings via API**
> Chamar o endpoint de qualidade para cada item da campanha:
> `GET https://api.mercadolibre.com/items/{ITEM_ID}/quality`
> Verificar score e os `buckets` com status `PENDING` (especialmente PICTURES, GTIN, CHARACTERISTICS).

**Ação 3 — Verificar estoque imediato**
> Itens com `manufacturing_time` ou `deferred_stock: true` não participam dos leilões.
> `GET https://api.mercadolibre.com/items/{ITEM_ID}` → verificar campo `available_quantity`

**Ação 4 — Verificar reputação do seller**
> Reputação influencia o Quality Score interno.
> `GET https://api.mercadolibre.com/users/{USER_ID}` → campo `seller_reputation.level_id`
> Alvo mínimo: `green` ou superior.

**Ação 5 — Segmentar campanha por produto**
> Misturar produtos com performance muito diferente em uma mesma campanha dilui o Ad Rank.
> Separar os top sellers em campanhas dedicadas.

### Se o problema principal é Budget (`lost_by_budget > 30`)

**Ação 1 — Aumentar orçamento diário**
> O Ad Rank está bom mas o dinheiro acaba. Calcular:
> `orçamento ideal ≈ custo_atual / (1 - lost_by_budget/100)`

**Ação 2 — Verificar horário de pico**
> Se o orçamento esgota cedo, concentrar em horários de maior conversão.
> Dados de visitas disponíveis em: `GET https://api.mercadolibre.com/items/{ITEM_ID}/visits/time_window`

### Se ambos são problemáticos

Resolver Ad Rank primeiro (qualidade), depois escalar budget.
Um anúncio de baixa qualidade com mais budget apenas gasta mais sem converter.

---

## Limitações importantes a mencionar sempre

- As métricas de competitividade são calculadas com os **últimos 7 dias** — não são em tempo real
- Disponíveis apenas no **nível de campanha** (não por item individual nem keyword)
- Janela máxima de consulta: **90 dias** por request
- O Ad Rank em si (número bruto) **nunca é exposto** pela API — apenas o diagnóstico via impression share

---

## Referências

- `references/n8n-workflow-template.md` — template do workflow n8n para buscar dados ML
- `references/endpoints-completos.md` — todos os endpoints relevantes com exemplos de resposta

---

## Exemplos de output esperado

### Exemplo — campanha crítica

```
🔴 CAMPANHA: "Papel de Parede Floral" (ID: 355189450)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
impression_share:          22%   ← você está aparecendo em só 22% das buscas elegíveis
lost_by_ad_rank:           63%   ← 63% perdido por Ad Rank fraco
lost_by_budget:            15%   ← 15% perdido por orçamento
ACOS atual:                48%
ACOS benchmark da categoria: 32%
CTR:                       0.3%  ← abaixo da média saudável (0.5%)

DIAGNÓSTICO: Ad Rank muito baixo. O lance e/ou a qualidade dos anúncios está muito abaixo
da concorrência. Com 63% de impressões perdidas por ranking, a campanha está desperdiçando
orçamento em posições fracas.

PLANO DE AÇÃO:
1. [URGENTE] Aumentar CPC em 25% → estimar impacto: +15–20% impression share
2. [ESTA SEMANA] Auditar qualidade dos 3 itens da campanha via /items/{id}/quality
3. [ESTA SEMANA] Verificar se todos os itens têm estoque imediato disponível
4. [PRÓXIMA SEMANA] Verificar reputação do seller (mínimo verde)
5. [OPCIONAL] Criar campanha separada para o top 1 produto
```
