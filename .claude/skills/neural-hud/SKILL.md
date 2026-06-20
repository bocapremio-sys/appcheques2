---
name: neural-hud
description: "Design system Neural HUD para interfaces Crypto/AI Fintech. Aplica paleta obsidian #131313 + cyan #00e0b7, glassmorphism, tipografia Space Grotesk + Inter, sem bordas solidas, otimizado para OLED. Use para: criar componentes, revisar UI, gerar paginas, aplicar o design system em qualquer frontend. Triggers: neural hud, design fintech, crypto interface, aplica o design system, cria componente, design system."
user-invocable: true
---

# Neural HUD — Design System Crypto/AI Fintech

Aplica o design system "The Neural HUD" em qualquer interface. Um HUD de alta performance para DeFi — OLED-optimized, glassmorphism, assimetria intencional, profundidade por tonalidade (sem bordas solidas).

---

## Design Tokens

### Cores
```
Background (canvas):     #131313  — surface
Surface low:             #1c1b1b  — surface_container_low
Surface high:            #353534  — surface_container_highest
Surface dim:             #0e0e0e

Accent primary:          #00e0b7  (cyan/green — usar com moderacao)
Accent vivid:            #15ffd1  — botoes primarios
Accent container:        #00ffd1  — glow radial 8-12% opacity

Text primary:            #fffffd  — headlines e CTAs
Text body:               #e5e2e1  — corpo de texto (NAO usar pure white)
Text muted:              #b9cbc3  — secundario, labels, metadados

Ghost border:            #3a4a44  @ 15% opacity — so quando necessario para acessibilidade
```

### Tipografia
```
Display / Headlines:  Space Grotesk — 3.5rem (display-lg), 2rem (headline-lg)
                      letter-spacing: tight, peso: 600-700
UI / Body:            Inter — labels, titulos, corpo, dados financeiros
Hierarquia:           #fffffd (principal) vs #b9cbc3 (secundario)
```

### Espacamento
```
Spacing scale: 4px base
Separar secoes: spacing.8 (2rem) ou spacing.20 (5rem)
Nunca usar dividers — usar background shift ou margin vertical
```

### Bordas e Raios
```
Cards:       border-radius: 0.5rem (lg) — sharp, tecnico
Botoes:      border-radius: 0.75rem (xl) ou full
Sem bordas 1px solidas — proibido
```

---

## Regras do Sistema

### O que FAZER
- Usar assimetria: assets 3D e elementos visuais fora do centro
- Fundo #131313 para aproveitar OLED (infinite contrast)
- Negative space generoso: spacing.20 e spacing.24
- Glassmorphism: backdrop-filter: blur(20px) + surface_container_low semi-transparente
- Glow biologico: radial-gradient de #00ffd1 @ 8-12% opacity atras de elementos-chave
- Sombras atmosfericas: blur 40-80px, opacity 4-6%, cor = tint do accent (#00ffd1)
- Separar conteudo por tom de fundo, nunca por linha

### O que NAO FAZER
- Nao usar white puro (#ffffff) em body text
- Nao usar dividers 1px solidos
- Nao sobre-saturar — cyan so em acoes primarias e estados ativos
- Nao usar corners muito arredondados (bubbly) — manter sharp/tecnico

---

## Componentes

### Botao Primario (Action Signal)
```css
background: #15ffd1;
color: #0a0a0a;
border-radius: 0.75rem;
font-family: Inter;
font-weight: 600;
padding: 0.75rem 1.5rem;
border: none;
```

### Botao Secundario (Glass)
```css
background: rgba(255,255,255,0.05);
border: 1px solid rgba(255,255,255,0.1);
backdrop-filter: blur(12px);
color: #fffffd;
border-radius: 0.75rem;
```

### Card
```css
background: #353534;  /* surface_container_highest */
border-radius: 0.5rem;
padding: 1.5rem;
/* sem border, sem box-shadow solida */
/* separar do fundo por contraste de tom */
```

### Glassmorphism Nav / Modal
```css
background: rgba(28,27,27,0.8);  /* surface_container_low */
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
border-bottom: 1px solid rgba(58,74,68,0.15);  /* ghost border */
```

### Input Field
```css
/* Default */
background: #1c1b1b;
border: none;
border-radius: 0.5rem;
color: #e5e2e1;

/* Focus */
outline: 1px solid rgba(255,255,253,0.4);
box-shadow: 0 0 0 4px rgba(0,255,209,0.08);
```

### HUD Callout (AI Insight)
```css
/* Bracket styling — linhas verticais nas bordas */
border-left: 2px solid rgba(0,224,183,0.6);
border-right: 2px solid rgba(0,224,183,0.6);
padding: 0.75rem 1rem;
background: rgba(0,255,209,0.04);
```

### Glow Biologico (atras de elementos-chave)
```css
background: radial-gradient(ellipse at center,
  rgba(0,255,209,0.10) 0%,
  transparent 70%);
```

---

## Fluxo de Trabalho

Quando o usuario pedir para criar ou revisar uma interface com este design system:

1. **Identificar** o tipo de componente ou pagina (dashboard, landing, card, modal, etc.)
2. **Aplicar tokens** — usar SEMPRE as cores, tipografia e espacamentos acima
3. **Verificar regras** — checklist: sem dividers, sem white puro em body, sem over-saturation
4. **Adicionar profundidade** — glassmorphism onde cabivel, glow radial em elementos-chave, sombras atmosfericas
5. **Assimetria** — posicionar elementos visuais/3D fora do centro quando possivel
6. **Output** — codigo completo (HTML/CSS, React/Tailwind, ou o stack pedido)

---

## Exemplo de Uso

```
/neural-hud cria um dashboard card de portfolio crypto
/neural-hud revisa esse componente e aplica o design system
/neural-hud cria a landing page com glassmorphism nav
/neural-hud aplica o neural hud nesse botao
```
