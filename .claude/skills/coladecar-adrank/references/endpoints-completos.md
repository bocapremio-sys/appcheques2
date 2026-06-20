# Endpoints completos — ML Product Ads

## Autenticação
Todos os endpoints exigem:
```
Authorization: Bearer {ACCESS_TOKEN}
api-version: 2
```

---

## 1. Listar campanhas com métricas

```
GET /advertising/advertisers/{ADVERTISER_ID}/product_ads/campaigns
    ?date_from=YYYY-MM-DD
    &date_to=YYYY-MM-DD
    &metrics=impression_share,top_impression_share,
             lost_impression_share_by_budget,
             lost_impression_share_by_ad_rank,
             clicks,prints,ctr,cost,cpc,acos,acos_benchmark,roas
    &aggregation_type=campaign   (padrão)
    &channel=marketplace
    &limit=50
    &offset=0
```

Para série temporal diária, adicionar: `&aggregation_type=DAILY`

---

## 2. Detalhes de uma campanha

```
GET /advertising/product_ads/campaigns/{CAMPAIGN_ID}
    ?date_from=YYYY-MM-DD
    &date_to=YYYY-MM-DD
    &metrics=impression_share,lost_impression_share_by_ad_rank,
             lost_impression_share_by_budget,clicks,prints,ctr,
             cost,cpc,acos,acos_benchmark
```

---

## 3. Itens de uma campanha

```
GET /advertising/advertisers/{ADVERTISER_ID}/product_ads/campaigns/{CAMPAIGN_ID}/items
    ?date_from=YYYY-MM-DD
    &date_to=YYYY-MM-DD
    &metrics=clicks,prints,cost,cpc,acos
```

Campos relevantes na resposta:
- `item_id` — ID do anúncio
- `status` — active, paused
- `buy_box_winner` — se está ganhando a buy box
- `deferred_stock` — se tem manufacturing_time (impede exibição)
- `current_level` — nível de qualidade do listing

---

## 4. Qualidade do listing (para diagnóstico de Ad Rank)

```
GET /items/{ITEM_ID}/quality
    Authorization: Bearer {ACCESS_TOKEN}
```

Campos importantes na resposta:
- `score` — nota geral (0–100)
- `level` — Good / Regular / Poor
- `buckets[].key` — área de qualidade
- `buckets[].status` — COMPLETED / PENDING
- Principais buckets: PICTURES, GTIN, CHARACTERISTICS, SHIPPING

---

## 5. Detalhes do item (estoque)

```
GET /items/{ITEM_ID}
    Authorization: Bearer {ACCESS_TOKEN}
```

Campos para verificar:
- `available_quantity` — estoque disponível (deve ser > 0)
- `status` — active
- `manufacturing_time` — se presente, o item não entra no leilão de ads
- `listing_type_id` — gold_pro é o tipo Premium (maior exposição)

---

## 6. Reputação do seller

```
GET /users/{USER_ID}
    Authorization: Bearer {ACCESS_TOKEN}
```

Campos:
- `seller_reputation.level_id` — 1_red / 2_orange / 3_yellow / 4_light_green / 5_green
- Alvo mínimo para boa competitividade: `5_green`

---

## 7. Visitas do item por janela de tempo

```
GET /items/{ITEM_ID}/visits/time_window?last=30&unit=day
    Authorization: Bearer {ACCESS_TOKEN}
```

---

## Limites e restrições

| Parâmetro | Limite |
|---|---|
| Janela máxima de métricas | 90 dias por request |
| Atualização dos dados | Diariamente às 10h GMT-3 |
| Janela de cálculo das métricas de competitividade | Últimos 7 dias |
| Nível disponível | Campanha (não por item/keyword) |
| Rate limit API ML | 1500 req/min por seller |

---

## Valores de referência para diagnóstico

| Métrica | Ruim | Atenção | Bom |
|---|---|---|---|
| impression_share | < 30% | 30–55% | > 55% |
| lost_by_ad_rank | > 40% | 20–40% | < 20% |
| lost_by_budget | > 30% | 15–30% | < 15% |
| CTR | < 0.3% | 0.3–0.5% | > 0.5% |
| ACOS vs benchmark | +50% acima | +20–50% | dentro ou abaixo |
