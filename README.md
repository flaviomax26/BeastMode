# BeastMode 🏋️

App pessoal de treino e saúde do Flavio Maximiano — Tech Lead .NET, 40 anos, faixa roxa BJJ.

## 🎯 Sobre

Sistema completo de coaching pessoal incluindo:
- Programa de treino PPL 6x/semana
- Programa de pull-up estruturado (8 semanas)
- Cardio Zona 2 integrado
- Abdômen distribuído
- Mobilidade de quadril pro BJJ
- Tracking de composição corporal (DEXA + InBody)

## 🚀 Acesso

**Live:** https://flaviomax26.github.io/BeastMode/

Otimizado pra iPhone 16 Pro. Adicione à tela inicial pra experiência de app nativo.

## 📱 Como instalar no iPhone

1. Abra a URL no **Safari** (não Chrome)
2. Toque no botão **Compartilhar** (quadrado com seta)
3. Role e toque em **"Adicionar à Tela de Início"**
4. Confirme com **"Adicionar"**

Vai aparecer um ícone na tela inicial. Ao tocar, abre em tela cheia sem barra do Safari — experiência de app nativo.

## 🖼 Imagens de execução

Imagens dos exercícios em `img/` vêm do [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (licença Unlicense / domínio público). Carregam offline (vendoradas no repo).

## 🛠 Stack atual

- HTML/CSS/JS vanilla (sem dependências)
- Design system iOS-native (dark mode, SF Pro, tab bar)
- Hospedagem: GitHub Pages
- Sem build step, sem framework

## 📂 Estrutura

```
BeastMode/
├── index.html          # App principal (single file)
├── README.md           # Este arquivo
└── CLAUDE.md          # Contexto completo do projeto pra Claude/Claude Code
```

## 🔄 Workflow de atualização

```bash
# Substitui o index.html com nova versão
cp ~/Downloads/treino_ios.html ./index.html

# Commit e push
git add index.html
git commit -m "feat: descricao da mudanca"
git push

# Propagação GitHub Pages: ~30-60s
```

## ⚠️ Cache do iOS

Safari cacheia HTML agressivamente. Pra forçar reload:
- Long-press no botão reload do Safari → "Recarregar Sem Conteúdo Bloqueado"
- Ou Settings → Safari → Limpar Histórico
- Ou abrir em Modo Privado pra teste

## 📋 Roadmap

Veja [CLAUDE.md](./CLAUDE.md) seção "Próximos Passos Sugeridos" pra ideias de evolução.

### Short term
- [ ] Sistema de log integrado (substituir Strong app)
- [ ] Calculadora de cargas Smith + anilhas
- [ ] Timer de descanso integrado
- [ ] Dashboard de progresso

### Medium term
- [ ] Auto-progressão de cargas baseada em RPE
- [ ] Check-in semanal automático
- [ ] Modo treino ativo (tela cheia)
- [ ] Integração Apple Health

### Long term
- [ ] Migração pra React + TypeScript (opcional)
- [ ] Native iOS app com SwiftUI
- [ ] Backend ASP.NET Core (familiar pro autor)

## 📊 Programa Atual

**PPL 6x/semana + Pull-up program 8 semanas + Cardio Zona 2**

| Dia | Treino |
|---|---|
| Segunda | Push A — Força (manhã) + BJJ 20h |
| Terça | Legs A — Força |
| Quarta | Pull A LEVE (manhã) + BJJ 20h |
| Quinta | Push B — Hipertrofia |
| Sexta | Legs B — Hipertrofia |
| Sábado | Pull B — Pesado |
| Domingo | Descanso |

Volume: ~38 séries força + 14 séries ombro + 9 séries abs + 120 min cardio Z2.

## 🎓 Filosofia

1. Consistência > intensidade
2. Técnica > carga
3. RPE como bússola (anota sempre)
4. Deload é sagrado (semana 5 não pula)
5. 40+ anos = recuperação prioritária
6. BJJ é o objetivo principal
7. Saúde de ombro = longevidade no tatame

## 📞 Contexto

Projeto pessoal, não comercial. Construído colaborativamente em sessões com Claude (Anthropic).

Pra mais contexto sobre objetivos, perfil físico, exames, equipamentos disponíveis: veja [CLAUDE.md](./CLAUDE.md).

---

**Último update:** 22/06/2026 — Semana 1 do programa iniciada.
