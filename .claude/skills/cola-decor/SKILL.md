---
name: cola-decor
description: "Gera capas de marketplace para papel de parede Cola Decor. Usa a textura do papel de parede ativo + layout fixo Cola Decor (zoom circular no canto superior esquerdo, rolo no canto inferior direito, fundo diagonal branco). Pergunta o ambiente desejado e gera imagem fotorrealista. Triggers: cola decor, gerar capa, capa marketplace, papel de parede capa, /cola-decor."
user-invocable: true
---

# Cola Decor — Gerador de Capas Marketplace

Gera capas profissionais de marketplace para papel de parede com layout padronizado Cola Decor.

---

## O que esta skill faz

1. Pergunta qual **ambiente** o usuário quer gerar
2. Pergunta qual **textura/papel de parede** usar (ou usa a última informada)
3. Chama `generate_image` com o prompt completo Cola Decor
4. Exibe a imagem gerada e pergunta se quer refinar

---

## Ambientes disponíveis

```
- sala de estar (living room)
- sala de TV (tv room)
- sala de jogos (game room)
- quarto master (master bedroom)
- quarto infantil (kids bedroom)
- home office
- lavabo (lavabo)
- banheiro (bathroom)
- cozinha (kitchen)
- área gourmet (gourmet area)
```

---

## Variações permitidas

**Ângulo de câmera:**
- Vista frontal
- Leve perspectiva
- Perspectiva de canto

**Iluminação interna:**
- Luz natural diurna brilhante
- Iluminação artificial suave
- Iluminação interna quente
- Spots de luz
- Abajures acesos
- Iluminação LED de destaque

**Iluminação externa (janelas):**
- Dia ensolarado
- Dia chuvoso
- Amanhecer
- Pôr do sol
- Noite

---

## Fluxo de execução

Quando o usuário ativar `/cola-decor`:

### Passo 1 — Coletar informações
Perguntar ao usuário:
1. **Qual ambiente?** (mostrar lista acima)
2. **Qual textura/papel de parede?** (pedir que forneça o caminho da imagem ou confirme usar a última)
3. **Ângulo de câmera?** (frontal / leve perspectiva / canto) — opcional, pode escolher automaticamente
4. **Iluminação?** (mostrar opções) — opcional, pode escolher automaticamente

### Passo 2 — Construir o prompt

Usar o template abaixo substituindo os campos `[VARIÁVEL]`:

```
Professional interior photography for Brazilian wallpaper marketplace cover.

WALLPAPER TEXTURE: The wallpaper has a geometric pattern with black thin lines forming irregular triangles on a pure white background — modern minimalist style, Zara-inspired, high contrast black and white. [SUBSTITUIR PELA TEXTURA REAL SE DIFERENTE]

ENVIRONMENT: [AMBIENTE ESCOLHIDO] — photorealistic, modern Brazilian interior design, real estate photography quality.

CAMERA: [ÂNGULO ESCOLHIDO]

LIGHTING: [ILUMINAÇÃO INTERNA] + [ILUMINAÇÃO EXTERNA SE JANELA VISÍVEL]

MANDATORY LAYOUT — replicate exactly:
- Main scene: the wallpaper texture applied to the wall of the environment, realistic scale, wallpaper is the visual hero
- TOP LEFT: circular zoom detail of the wallpaper texture, thin white circular border, macro shot of the pattern
- BOTTOM RIGHT: realistic 50cm wallpaper roll showing the same texture, placed on a white diagonal background surface, soft natural shadow under the roll, roll may be partially cropped by image border

STYLE: premium ecommerce photography, ultra realistic, photorealistic render
RESOLUTION: 2048x2048
NO logos, NO text, NO brand names
```

### Passo 3 — Gerar imagem
Chamar `generate_image` com o prompt construído.

### Passo 4 — Refinamento
Após gerar, perguntar:
- "Gostou? Quer mudar o ambiente, ângulo ou iluminação?"
- "Quer refinar algum detalhe específico?" → usar `continue_editing`

---

## Exemplo de uso

```
/cola-decor
→ skill pergunta: qual ambiente?
→ usuário: quarto master
→ skill pergunta: qual textura? (forneça a imagem)
→ usuário: [fornece caminho da imagem]
→ skill gera a capa com layout Cola Decor
→ skill pergunta se quer refinar
```

---

## Textura padrão (Zara Preto e Branco)

Quando o usuário referenciar "Zara Preto e Branco" ou "aquela textura geométrica", usar esta descrição no prompt:

> "geometric pattern with irregular black thin lines forming triangles on a pure white background, minimalist, high contrast, Zara-inspired wallpaper"

Caminho local da referência: `C:\Users\Rhuan freire\Downloads\Papel-de-Parede-Adesivo-Decoratico-3D-Vinilico-Lavavel-Sala-Quarto-Cozinha-Banheiro-Zara-Preto-E-Branco-0.jpg`
