# Changelog

Versionamento [semver](https://semver.org): `MAJOR.MINOR.PATCH`.
PATCH = fix · MINOR = feature · MAJOR = redesign/quebra. Bump via `./bump.sh`.

## v1.7.0 — 2026-07-01
- resumo da semana (dias/tonelagem/PRs) + volume por grupo muscular com barras vs alvo do programa

## v1.6.2 — 2026-07-01
- hardening do code review: guard no switchView, esc() em nomes/titulos, clearTimeout no fullSync, redraw dos graficos ao girar, bump.sh inclui arquivos novos

## v1.6.1 — 2026-07-01
- menu Mais em ordem alfabetica (Atividade, BJJ, Check-in, Saude)

## v1.6.0 — 2026-06-30
- check-in de qualquer semana editavel pelo historico (botao lapis + banner + voltar)

## v1.5.1 — 2026-06-30
- meta no-cache no index pra forcar revalidacao e evitar index.html preso em cache no iOS

## v1.5.0 — 2026-06-30
- grafico segue cores do tema (claro/escuro) + editar treino de qualquer data via historico do Progresso (botao lapis)

## v1.4.0 — 2026-06-30
- Menu mostra ultima sincronizacao no fuso do aparelho (SP); updated_at segue UTC no banco

## v1.3.3 — 2026-06-30
- modo claro: header e tab-bar usam vars de chrome (some a faixa cinza + rotulos das tabs visiveis no claro)

## v1.3.2 — 2026-06-30
- deploy real de tendencias/check-in/tema (bump.sh nao commitava progress.js/sync.js/data.js/css) + fix do git add no bump.sh

## v1.3.1 — 2026-06-30
- init resiliente (tema/check-in nao abortam sync-box) + corrige renderCheckin no fullSync

## v1.3.0 — 2026-06-30
- modo claro/escuro/auto (segue sistema) com toggle no Menu + CSS cache-busted

## v1.2.0 — 2026-06-30
- check-in semanal (aderencia/sono/energia/dor + nota), lembrete domingo, historico

## v1.1.0 — 2026-06-30
- panturrilha smith logo apos agacho (nao desmonta a smith) + tendencias por exercicio no progresso

## v1.0.0 — 2026-06-29
- Baseline do versionamento semver (antes era build datado `20260629x`)
- RPE como select fixo 6–10; bloqueio de zero em carga/reps
- Aviso de série incompleta mesmo com séries válidas; validação exige valor > 0
- Cache-busting `?v=` derivado da versão + toast "Atualizado" ao trocar de versão
- Roda abdominal sem campo de carga (peso do corpo)
- Cadeira adutora/abdutora separadas; Atividade (Apple Health) com filtro de período
