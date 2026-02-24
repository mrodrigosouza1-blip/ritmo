# Roadmap Premium — Ritmo

> **Filosofia**: *"Ritmo não é sobre fazer tudo. É sobre manter constância."*

Este documento descreve a evolução do Ritmo para o patamar de apps premium (Grit, etc.), com foco em engajamento, motivação e retenção diária, sem copiar UI ou textos de outras apps.

---

## Índice

1. [Gamificação leve (conquistas)](#1-gamificação-leve-conquistas)
2. [Feedback emocional premium](#2-feedback-emocional-premium)
3. [Insights inteligentes](#3-insights-inteligentes)
4. [Notificações contextuais](#4-notificações-contextuais)
5. [Widget avançado (fase 2)](#5-widget-avançado-fase-2)
6. [Diferencial Ritmo (copy)](#6-diferencial-ritmo-copy)
7. [Checklist técnico e ordem de implementação](#7-checklist-técnico-e-ordem-de-implementação)
8. [Premium vs core](#8-premium-vs-core)

---

## 1. Gamificação leve (conquistas)

### 1.1 Badges

| Badge | Condição | Chave (`achievements.key`) |
|-------|----------|---------------------------|
| 3 dias seguidos | Streak ≥ 3 | `streak_3` |
| 7 dias seguidos | Streak ≥ 7 | `streak_7` |
| 14 dias | Streak ≥ 14 | `streak_14` |
| 30 dias | Streak ≥ 30 | `streak_30` |
| Meta semanal concluída | ≥ 1 meta weekly atingida | `goal_weekly` |
| 4 semanas consecutivas | 4 semanas seguidas com meta concluída | `goal_4_weeks` |

**Modelo de dados**

```sql
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  unlocked_at TEXT NOT NULL
);
```

**Arquivos a criar/modificar**

| Tipo | Path |
|------|------|
| Migration | `src/db/migrations.ts` |
| Tipos | `src/types/index.ts` — `Achievement` |
| Serviço | `src/services/achievements.ts` — `listAchievements()`, `unlockAchievement()`, `checkAndUnlock()` |
| Storage | Integrar em `src/services/premiumIntelligenceStorage.ts` ou novo `achievementsStorage.ts` para streak/4 semanas |
| Componente badge | `src/components/achievements/AchievementBadge.tsx` |
| Popup desbloqueio | `src/components/achievements/AchievementUnlockModal.tsx` |
| Tela Conquistas | `app/(tabs)/achievements.tsx` ou `app/settings/achievements.tsx` |
| i18n | `src/i18n/locales/{pt,en,it}.ts` — `achievements.*` |

**Regras de desbloqueio**

- `streak_*`: ao rodar `runPremiumIntelligence` ou ao marcar último item do dia; verificar streak atual e desbloquear se ainda não existir.
- `goal_weekly`: ao finalizar semana (dom/seg) — se `activeDays >= target` em alguma meta.
- `goal_4_weeks`: manter contador em storage (4 semanas consecutivas com meta); ao atingir, desbloquear.

**UI**

- Badge pequeno e discreto (ex.: ícone no header ou na tab Goals).
- Popup ao desbloquear: fade + ícone do badge + título/descrição (sem animação exagerada).
- Opção "Conquistas" em Configurações.

---

## 2. Feedback emocional premium

### 2.1 Gatilhos

| Momento | Feedback |
|---------|----------|
| Marcar 1 item concluído | Micro-animação (fade/scale) + texto curto |
| Concluir dia completo (100%) | Animação + texto tipo "Boa constância hoje." |
| Meta semanal atingida | Toast/modal breve com mensagem motivacional |

**Textos (exemplos, i18n)**

- Item: "Feito.", "Beleza.", "✓"
- Dia completo: "Boa constância hoje.", "Dia concluído."
- Meta: "Meta atingida esta semana."

**Arquivos a criar/modificar**

| Tipo | Path |
|------|------|
| Componente feedback | `src/components/feedback/CompletionFeedback.tsx` |
| Hook | `src/features/today/useCompletionFeedback.ts` |
| i18n | `feedback.*` |
| Integração | `app/(tabs)/today.tsx` e onde marca `day_items` como done |
| Toast | Reutilizar `ToastProvider` com tipo `success` e variantes |

**Implementação**

- Ao marcar item: `Animated.timing` (opacity 0→1, scale 0.95→1) + `toast.success(t('feedback.itemDone'))`.
- Ao concluir dia: checar `doneItems === totalItems`; se sim, mostrar feedback maior (opcional: modal leve).
- Sem sons obrigatórios; sem confete exagerado.

---

## 3. Insights inteligentes

### 3.1 Métricas (offline-first)

| Insight | Fonte de dados | Query / serviço |
|--------|----------------|-----------------|
| Melhor dia da semana | `day_items` + `day_routine_times` | Agrupar por `strftime('%w', date)` |
| Categoria mais consistente | `getMonthlyActiveDaysByCategory` | Maior aderência = dias/categoria ÷ dias no mês |
| Horário mais produtivo | `done_at` em `day_items` | Extrair hora, histograma |
| Sequência atual vs melhor | Streak atual vs máximo histórico | `premiumIntelligenceStorage` + novo campo |

**Arquivos a criar/modificar**

| Tipo | Path |
|------|------|
| Serviço | `src/services/insights.ts` — `getBestWeekday()`, `getMostConsistentCategory()`, `getMostProductiveHour()`, `getStreakStats()` |
| Tipos | `src/types/insights.ts` |
| Tela | `app/(tabs)/insights.tsx` ou integrar em `app/(tabs)/reports.tsx` |
| Componentes | `src/components/insights/InsightCard.tsx` |
| i18n | `insights.*` |

**Textos de exemplo**

- "Você mantém mais constância às segundas-feiras."
- "Rotina 'Trabalho' tem 85% de aderência."
- "Horário de pico: 8h–10h."
- "Melhor sequência: 12 dias. Atual: 5."

**Reuso**

- `getWeeklyDoneCountsByCategory`, `getActiveDaysInWeek`, `getMonthlyActiveDaysByCategory`, `getFullyDoneRoutineCategoryDaysInRange`.

---

## 4. Notificações contextuais

### 4.1 Novos triggers (Premium)

| Trigger | Condição | Máx/dia |
|--------|----------|---------|
| Falta 1 item para concluir o dia | `totalItems - doneItems === 1` e ainda há tempo razoável | 1 motivacional |
| 1 dia para bater recorde | Streak atual = recorde - 1 | 1 motivacional |
| Meta semanal quase lá | `remaining === 1` e `daysLeftInWeek <= 1` | 1 motivacional |

**Regras**

- Nunca mais de 1 notificação motivacional por dia (já existe `getPremiumSentToday`).
- Respeitar horário silencioso (`isWithinQuietHours`).

**Arquivos a modificar**

| Tipo | Path |
|------|------|
| Serviço | `src/services/premiumIntelligence.ts` |
| Storage | `src/services/premiumIntelligenceStorage.ts` — `getLastOneItemLeftSent()`, etc. |
| i18n | `premiumNotif.oneItemLeft`, `premiumNotif.recordNear`, etc. |
| Daily check | `src/services/dailyCheck.ts` — integrar checagem de "1 item restante" em horário apropriado |

---

## 5. Widget avançado (fase 2)

### 5.1 Novos formatos

| Formato | Conteúdo |
|---------|----------|
| Widget médio | Mini gráfico semanal (7 barras, dias da semana) |
| Widget de categoria | Uma categoria específica + progresso |
| Estado motivacional | Quando 100%: mensagem "Dia concluído" |

**Snapshot estendido**

```typescript
// src/widgets/widgetSnapshot.ts
export type WidgetSnapshot = {
  // ... existente
  weeklyBars?: number[]; // [0..6] = dom-sab, valor 0-100
  categoryProgress?: { categoryId: string; name: string; percent: number; color: string }[];
  dayComplete?: boolean;
};
```

**Arquivos a modificar**

| Tipo | Path |
|------|------|
| Snapshot | `src/widgets/widgetSnapshot.ts` |
| Widget service | `src/widgets/widgetService.ts` — `buildWidgetSnapshot()` |
| iOS | `native/ritmo-widget/RitmoWidget.swift` — `RitmoWidgetMediumView` |
| Android | `native/ritmo-widget-android/RitmoGlanceWidget.kt` |

**Reaproveitamento**

- Snapshot existente (`today`, `streak`, `weekly`).
- `getWeeklyDoneCountsByCategory`, `getActiveDaysInWeek`.

---

## 6. Diferencial Ritmo (copy)

### 6.1 Conceito

> *"Ritmo não é sobre fazer tudo. É sobre manter constância."*

**Onde aplicar**

| Local | Texto sugerido |
|-------|----------------|
| Telas vazias (hoje sem itens) | "Constância vem aos poucos. Adicione seu primeiro item." |
| Lista vazia | "Nenhum item hoje. O Ritmo acompanha seu ritmo." |
| Feedback dia completo | "Boa constância hoje." |
| App Store | Descrição curta com o conceito |

**Arquivos**

- `src/i18n/locales/{pt,en,it}.ts` — `empty.*`, `feedback.*`
- Telas: `app/(tabs)/today.tsx`, listas vazias em `week`, `month`.

---

## 7. Checklist técnico e ordem de implementação

### Ordem recomendada

| # | Feature | Dependências | Esforço |
|---|---------|--------------|---------|
| 1 | **Copy / Diferencial Ritmo** | Nenhuma | Baixo |
| 2 | **Feedback emocional** | Toast existente | Baixo |
| 3 | **Conquistas (achievements)** | Migrations, streak, goals | Médio |
| 4 | **Insights** | reports, goalsProgress | Médio |
| 5 | **Notificações contextuais** | premiumIntelligence | Médio |
| 6 | **Widget avançado** | Snapshot, widget nativo | Alto |

### Checklist técnico

#### Gamificação

- [ ] Migration `achievements`
- [ ] `Achievement` em tipos
- [ ] `achievements.ts`: CRUD + `checkAndUnlock()`
- [ ] Lógica `streak_*` (via streak existente)
- [ ] Lógica `goal_weekly` (via `getWeeklyDoneCountsByCategory`)
- [ ] Lógica `goal_4_weeks` (storage + contador)
- [ ] `AchievementBadge`, `AchievementUnlockModal`
- [ ] Tela Conquistas (tab ou Settings)
- [ ] i18n `achievements.*`

#### Feedback emocional

- [ ] `CompletionFeedback` (Animated)
- [ ] Integração em `today` ao marcar item
- [ ] Detecção dia completo
- [ ] i18n `feedback.*`

#### Insights

- [ ] `insights.ts`: `getBestWeekday`, `getMostConsistentCategory`, `getMostProductiveHour`, `getStreakStats`
- [ ] Persistir streak máximo em storage
- [ ] Tela Insights ou seção em Reports
- [ ] i18n `insights.*`

#### Notificações contextuais

- [ ] "1 item restante" em `premiumIntelligence` ou `dailyCheck`
- [ ] "1 dia para recorde" em `premiumIntelligence`
- [ ] "Meta quase lá (1 dia)" — expandir `goalAlmost` existente
- [ ] i18n `premiumNotif.*`

#### Widget avançado

- [ ] Estender `WidgetSnapshot` (`weeklyBars`, `categoryProgress`, `dayComplete`)
- [ ] `buildWidgetSnapshot()` preencher novos campos
- [ ] iOS: `RitmoWidgetMediumView` com 7 barras
- [ ] Android: layout equivalente
- [ ] Widget de categoria (configurável)

#### Copy

- [ ] `empty.today`, `empty.list`, `feedback.dayComplete`
- [ ] Substituir textos genéricos em telas vazias

---

## 8. Premium vs core

| Feature | Core (grátis) | Premium |
|---------|---------------|---------|
| Conquistas | Badges visíveis; popup ao desbloquear | ✓ (todos) |
| Feedback emocional | Toast ao marcar item; "Boa constância" | ✓ (todos) |
| Insights | Básico: melhor dia, categoria consistente | Completo: horário produtivo, sequência vs recorde |
| Notificações contextuais | Não | "1 item", "1 dia para recorde", "meta quase lá" |
| Widget | Small (atual) | Medium com gráfico; widget por categoria |
| Copy / Diferencial | ✓ (todos) | — |

**Resumo**

- **Core**: conquistas, feedback leve, insights básicos, copy.
- **Premium**: insights avançados, notificações motivacionais, widget médio e por categoria.

---

## Referência rápida de arquivos

```
src/
├── db/migrations.ts          # achievements
├── types/index.ts           # Achievement, Insight
├── services/
│   ├── achievements.ts     # NOVO
│   ├── insights.ts         # NOVO
│   ├── premiumIntelligence.ts
│   ├── premiumIntelligenceStorage.ts
│   ├── goalsProgress.ts
│   └── reports.ts
├── components/
│   ├── achievements/       # NOVO
│   ├── feedback/           # NOVO
│   ├── insights/           # NOVO
│   └── toast/
├── i18n/locales/
├── widgets/
│   ├── widgetSnapshot.ts
│   └── widgetService.ts

app/
├── (tabs)/
│   ├── achievements.tsx    # NOVO (ou em settings)
│   ├── insights.tsx        # NOVO ou em reports
│   └── today.tsx

native/
├── ritmo-widget/            # iOS medium view
└── ritmo-widget-android/    # Android medium
```
