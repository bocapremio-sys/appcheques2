# Template — Workflow n8n para Ad Rank ML

## Opção A: Workflow simples (HTTP Request direto)

Crie um workflow no n8n com os seguintes nós:

### Nó 1 — Webhook (trigger)
- Método: POST
- Path: `/ml-adrank`
- Recebe: `{ advertiser_id, access_token, date_from, date_to }`

### Nó 2 — HTTP Request (campanhas)
- Method: GET
- URL: `https://api.mercadolibre.com/advertising/advertisers/{{ $json.advertiser_id }}/product_ads/campaigns`
- Query params:
  - `date_from`: `{{ $json.date_from }}`
  - `date_to`: `{{ $json.date_to }}`
  - `metrics`: `impression_share,top_impression_share,lost_impression_share_by_budget,lost_impression_share_by_ad_rank,clicks,prints,ctr,cost,cpc,acos,acos_benchmark,roas`
- Headers:
  - `api-version`: `2`
  - `Authorization`: `Bearer {{ $json.access_token }}`

### Nó 3 — Respond to Webhook
- Retorna o JSON completo das campanhas

---

## Opção B: Usar o MCP n8n para executar workflow existente

Se já existe um workflow de consulta ML no n8n, usar:

```
tool: n8n execute_workflow
input:
  workflow_id: <ID do workflow>
  input_data:
    advertiser_id: "123456789"
    access_token: "APP_USR-..."
    date_from: "2025-04-08"
    date_to: "2025-04-15"
```

---

## Opção C: HTTP Request direto (sem n8n)

Se o usuário tem o access_token em mãos, Claude pode descrever o curl direto:

```bash
curl -X GET \
  "https://api.mercadolibre.com/advertising/advertisers/SEU_ADVERTISER_ID/product_ads/campaigns?date_from=2025-04-08&date_to=2025-04-15&metrics=impression_share,top_impression_share,lost_impression_share_by_budget,lost_impression_share_by_ad_rank,clicks,prints,ctr,cost,cpc,acos,acos_benchmark,roas" \
  -H "api-version: 2" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"
```

Usuário cola o JSON de resposta no chat e Claude faz a análise.

---

## Exemplo de resposta da API (estrutura esperada)

```json
{
  "results": [
    {
      "id": 355189450,
      "name": "Papel de Parede Floral",
      "status": "active",
      "budget": 50.00,
      "currency_id": "BRL",
      "acos_target": 35.0,
      "strategy": "profitability",
      "channel": "marketplace",
      "metrics": {
        "clicks": 42,
        "prints": 14000,
        "ctr": 0.003,
        "cost": 18.50,
        "cpc": 0.44,
        "acos": 0.48,
        "acos_benchmark": 0.32,
        "roas": 2.08,
        "impression_share": 0.22,
        "top_impression_share": 0.08,
        "lost_impression_share_by_budget": 0.15,
        "lost_impression_share_by_ad_rank": 0.63
      }
    }
  ],
  "paging": {
    "total": 3,
    "offset": 0,
    "limit": 50
  }
}
```

**Atenção:** Os valores de `impression_share` e `lost_impression_share_*` chegam como decimal (0.22 = 22%).
Multiplicar por 100 para exibir como percentual.
