# BeastMode 🏋️

App pessoal de treino e saúde — single-file HTML, offline-first, estilo iOS.

## 🎯 Sobre

- Programa de treino PPL 6x/semana com cronograma de 8 semanas
- Log de treino (carga/reps/RPE) com persistência local
- Calculadora de carga (Smith), auto-sugestão por RPE
- Progresso por treino com gráficos e histórico
- Consistência (heatmap + streak)
- Referência visual de execução por exercício
- Backup export/import (JSON)

## 🚀 Acesso

**Live:** https://flaviomax26.github.io/BeastMode/

Otimizado pra iPhone. Adicione à tela inicial pra experiência de app nativo (Safari → Compartilhar → "Adicionar à Tela de Início").

## 🛠 Stack

- HTML/CSS/JS vanilla (sem build, sem framework)
- Dados em `localStorage` (export/import pra backup)
- Hospedagem: GitHub Pages

## 🖼 Imagens de execução

Imagens em `img/` vêm do [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (licença Unlicense / domínio público). Carregam offline (vendoradas no repo).

## 📂 Estrutura

```
BeastMode/
├── index.html   # App (single file)
├── img/         # Imagens de execução
└── README.md
```

## ⚠️ Cache do iOS

Safari cacheia HTML. Pra forçar reload: long-press no reload → "Recarregar Sem Conteúdo Bloqueado". **Não** limpar dados do site (apaga os logs).

## 💾 Backup

Os dados ficam só no aparelho. Use Progresso → "Exportar treinos" periodicamente. Limpar dados do Safari apaga tudo.
