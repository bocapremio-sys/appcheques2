---
name: post-linkedin
description: "Publica carrossel de imagens no LinkedIn via API REST. Lê imagens de uma pasta local, faz upload sequencial, gera copy com base no briefing e nas imagens, e publica o post. Use quando o usuário quiser postar um carrossel no LinkedIn a partir de slides locais."
user-invocable: true
---

# post-linkedin — Publicador de Carrossel no LinkedIn

Publica carrossel de múltiplas imagens no LinkedIn via API ugcPosts. Analisa os slides visualmente, gera copy alinhada ao briefing e ao copywriter.agent, e executa o fluxo completo de upload + publicação.

---

## Pré-requisitos

Antes de executar, verificar:

- [ ] Token de acesso OAuth do LinkedIn disponível (escopo: `w_member_social`, `r_liteprofile`)
- [ ] Imagens dos slides em pasta local (PNG ou JPG, nomeadas em sequência: `slide-01.png`, `slide-02.png`, ...)
- [ ] Briefing da postagem disponível em `briefing.md` na pasta do conteúdo
- [ ] Copywriter agent disponível em `_opensquad/times/site-builder/agents/copywriter.agent.md`

**Nunca solicitar ou armazenar credenciais no chat.** Usar variáveis de ambiente ou arquivo `.env` local.

---

## Fluxo de Execução

### Passo 1 — Coletar inputs

Perguntar ao usuário:
1. Caminho da pasta com os slides (ex: `Rhuan Freire/conteudo/YYYY-MM-DD-tema/carossel/`)
2. Caminho do briefing (ex: `Rhuan Freire/conteudo/YYYY-MM-DD-tema/briefing.md`)
3. Token LinkedIn (orientar a fornecer de forma segura — nunca no chat aberto)

### Passo 2 — Analisar conteúdo

1. Listar todos os slides em ordem (`slide-01` → `slide-N`)
2. Ler cada imagem visualmente para entender tema, estrutura e CTA
3. Ler o `briefing.md` para extrair: objetivo, ângulo, público, tom e CTA da postagem
4. Ler o `copywriter.agent.md` para aplicar os frameworks de copy

### Passo 3 — Gerar copy

Aplicar o framework do copywriter com base no conteúdo dos slides e briefing:

**Diagnóstico obrigatório antes de escrever:**
- Awareness level do público
- Driver psicológico dominante (tempo, dinheiro, status, medo de perder)
- Big Idea que ancora o post
- CTA do carrossel (palavra-chave para comentar, link, seguir)

**Estrutura da copy para LinkedIn:**
```
[HOOK — primeiras 2 linhas / ~210 chars]
Pergunta provocadora ou afirmação que toca na dor. Deve funcionar antes do "ver mais".

[CORPO]
1-2 frases por parágrafo. Primeira pessoa. Linha em branco entre parágrafos.
Contexto do problema → agitação → transição para solução.

[INSIGHTS]
→ Fluxo/ponto 01: descrição em 1 linha
→ Fluxo/ponto 02: descrição em 1 linha
→ Fluxo/ponto 03: descrição em 1 linha

[CTA]
Frase de encerramento + instrução de engajamento (comentar palavra-chave, responder pergunta).

[HASHTAGS]
#tag1 #tag2 #tag3 #tag4 #tag5
```

**Regras de copy para LinkedIn:**
- Nunca colocar links no corpo do post — usar "link nos comentários"
- Máximo 5 hashtags na última linha, separadas do corpo
- Primeira pessoa obrigatória
- CTA é uma ordem, não um convite: "Comenta ECOMM" > "Se quiser, comente"
- Sem jargão corporativo

### Passo 4 — Testar conexão

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api.linkedin.com/v2/userinfo"
```

Verificar:
- Retorna `sub` (person ID) → conexão OK
- Retorna erro 401 → token expirado, solicitar novo token

### Passo 5 — Registrar slots de upload

Para cada imagem, registrar um slot via API:

```bash
curl -s -X POST "https://api.linkedin.com/v2/assets?action=registerUpload" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "registerUploadRequest": {
      "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
      "owner": "urn:li:person:$PERSON_ID",
      "serviceRelationships": [{
        "relationshipType": "OWNER",
        "identifier": "urn:li:userGeneratedContent"
      }]
    }
  }'
```

Extrair de cada resposta:
- `value.asset` → URN do asset (ex: `urn:li:digitalmediaAsset:D4D22AQ...`)
- `value.uploadMechanism.com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest.uploadUrl` → URL de upload

### Passo 6 — Upload das imagens

Para cada slide, fazer PUT binário na uploadUrl:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X PUT "$UPLOAD_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "media-type-family: STILLIMAGE" \
  -H "Content-Type: image/png" \
  --data-binary "@$CAMINHO_IMAGEM"
```

**Esperado:** HTTP 201 para cada upload.

**Atenção ao path no Windows:**
- Bash acessa arquivos Windows via `C:/Users/...` (barra normal, não `/mnt/c/`)
- Testar com `ls "C:/Users/..."` antes do upload para confirmar acesso

### Passo 7 — Publicar o post

Montar o payload em arquivo JSON temporário (evitar inline para não quebrar acentuação):

```json
{
  "author": "urn:li:person:$PERSON_ID",
  "lifecycleState": "PUBLISHED",
  "specificContent": {
    "com.linkedin.ugc.ShareContent": {
      "shareCommentary": {
        "text": "$COPY_COMPLETA"
      },
      "shareMediaCategory": "IMAGE",
      "media": [
        {
          "status": "READY",
          "description": {"text": "Slide 1"},
          "media": "urn:li:digitalmediaAsset:$ASSET_ID_01",
          "title": {"text": "$TITULO"}
        }
        // repetir para cada slide
      ]
    }
  },
  "visibility": {
    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
  }
}
```

Publicar via:

```bash
curl -s -X POST "https://api.linkedin.com/v2/ugcPosts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Restli-Protocol-Version: 2.0.0" \
  --data-binary "@linkedin_post.json"
```

**Esperado:** Resposta com `{"id": "urn:li:share:..."}` → post publicado.

Remover arquivo temporário após publicação.

### Passo 8 — Confirmar publicação

Exibir para o usuário:
- ID do post publicado
- Primeiras 2 linhas da copy (hook)
- Número de slides enviados
- Link para o perfil para verificação visual

---

## Tratamento de Erros

| Erro | Causa provável | Ação |
|------|---------------|------|
| `401 Unauthorized` | Token expirado ou inválido | Solicitar novo token |
| `403 ACCESS_DENIED` | Escopo insuficiente (`w_member_social` ausente) | Verificar permissões do app no LinkedIn Developer |
| `400 ILLEGAL_ARGUMENT` | JSON mal formatado (acentos no inline) | Salvar payload em arquivo `.json` e usar `--data-binary @arquivo` |
| HTTP vazio no upload | Path do arquivo não encontrado pelo bash | Usar `C:/Users/...` em vez de `/mnt/c/Users/...` no Windows |
| `201` no upload mas post falha | Asset ainda processando | Aguardar 2-3 segundos e tentar novamente |

---

## Boas Práticas de Alcance

Baseado no comportamento do algoritmo do LinkedIn:

- **Postar entre 7-9h ou 12-13h** nos dias de semana (terça a quinta têm melhor performance)
- **Não editar o post nos primeiros 10 minutos** — reset da janela de distribuição algorítmica
- **Responder todos os comentários** nas primeiras horas — engagement ativo sinaliza qualidade
- **Nunca postar mais de 1x por dia** — posts concorrem entre si pelo alcance
- **CTA de comentário bate mais** que CTA de curtida — "comenta X" gera 2x mais engajamento
- **Carrosséis têm 2-3x mais alcance** que posts de texto — dwell time maior pelo swipe
- **Não colocar link no corpo** — algoritmo penaliza tráfego externo com ~3x menos alcance

---

## Checklist Antes de Publicar

- [ ] Token testado e retornando `sub` válido
- [ ] Todos os slides lidos e conteúdo compreendido
- [ ] Briefing lido e ângulo identificado
- [ ] Copy gerada com hook nos primeiros ~210 chars
- [ ] Copy em primeira pessoa, parágrafos curtos, sem jargão
- [ ] CTA claro no texto (ex: "Comenta ECOMM")
- [ ] Máximo 5 hashtags na última linha
- [ ] Sem links no corpo do post
- [ ] Upload de todas as imagens retornou HTTP 201
- [ ] Payload salvo em arquivo `.json` temporário (não inline)
- [ ] Post publicado retornou `urn:li:share:...`
- [ ] Arquivo `.json` temporário removido após publicação

---

## Anti-padrões

- **Nunca passar credenciais no chat** — sempre via `.env` ou variável de ambiente
- **Nunca usar JSON inline com acentos** no curl — sempre salvar em arquivo
- **Nunca usar `/mnt/c/` no bash Windows** para leitura de arquivo — usar `C:/`
- **Nunca editar o post após publicar** nos primeiros 10 minutos
- **Não publicar sem ler as imagens** — a copy deve refletir o que está nos slides
- **Não ignorar o briefing** — ângulo e CTA do briefing têm prioridade sobre interpretação livre
