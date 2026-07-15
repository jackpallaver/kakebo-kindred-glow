
# Kakebo digitale — Piano di implementazione

App di consapevolezza finanziaria per Cooperativa Progetto 92, ispirata al metodo giapponese Kakebo. Due ruoli (Utente / Operatore), multi-lingua (IT/EN/FR/AR con supporto RTL), backend Lovable Cloud.

## Stack e design

- **Backend**: Lovable Cloud (Postgres + Auth + RLS)
- **Design tokens**: palette teal basata su `#007499` e `#00aebb`, con neutri caldi carta
- **Tipografia**: Outfit (heading) + Figtree (body), caricati via `<link>` in `__root.tsx`
- **Layout**: sidebar collapsibile + area principale (shadcn sidebar)
- **i18n**: `react-i18next` con IT/EN/FR/AR + `dir="rtl"` automatico per arabo

## Schema database (Lovable Cloud)

- `app_role` enum: `user`, `operator`
- `category` enum: `alimentari`, `bollette`, `trasporti`, `casa`, `salute`, `svago`, `educazione`, `abbigliamento`, `risparmio`, `altro`
- `profiles` (id → auth.users, full_name, language, created_at)
- `user_roles` (user_id, role) — separato per sicurezza + funzione `has_role()`
- `annual_goals` (user_id, year, description, target_amount)
- `transactions` (user_id, type ['income'|'expense'], category, amount, date, note)
- `monthly_forecasts` (user_id, year, month, expected_income, expected_expenses jsonb per categoria)
- `operator_assignments` (operator_id, user_id) — collega operatori ai beneficiari
- `tips` (title, body, category, language) — libreria consigli (seed statico)
- `calendar_events` (user_id, title, date, reminder_at, note)

**RLS**:
- Utenti vedono/scrivono solo le proprie righe
- Operatori possono `SELECT` (non `UPDATE`/`DELETE`) sulle righe degli utenti a loro assegnati via `operator_assignments` + `has_role('operator')`
- `tips` leggibile da tutti gli autenticati

## Struttura route

```text
/                              Landing/redirect a /auth o /dashboard
/auth                          Login + signup (scelta lingua iniziale)
/onboarding                    Workflow Kakebo: definizione obiettivo annuale
/_authenticated/
  dashboard                    Home gamification (grafici, sfida del mese, progresso)
  transactions                 Lista + FAB "+" quick-entry
  forecast                     Previsioni mensili (entrate previste, uscite per categoria)
  calendar                     Calendario mensile con scadenze/promemoria
  tips                         Sezione consigli (libreria)
  settings                     Lingua, profilo, obiettivo annuale
  operator/                    (visibile solo se ruolo = operator)
    users                      Panoramica beneficiari assegnati
    users/$userId              Scheda anagrafica + monitoraggio read-only
```

## Componenti chiave

- `AppSidebar` con voci filtrate per ruolo
- `QuickAddDialog` — dialog con tipo (entrata/uscita), categoria dropdown con icone, importo, data
- `MonthlyChallengeCard` — sfida del mese con progresso
- `SpendingPieChart` + `SavingsTrendChart` (Recharts)
- `GoalProgressCard` — barra progresso obiettivo annuale
- `LanguageSwitcher` — IT/EN/FR/AR (aggiorna `dir` su `<html>`)
- `InfoTooltip` — tooltip "i" riutilizzabile per istruzioni

## Design system (`src/styles.css`)

Palette teal:
- `--primary: oklch(0.55 0.11 210)` (≈ #007499)
- `--accent: oklch(0.70 0.11 200)` (≈ #00aebb)
- Neutri caldi carta (background off-white, foreground dark slate)
- Gradient `--gradient-brand: linear-gradient(135deg, primary, accent)`
- Shadow morbida `--shadow-card`

## Funzionalità

**Utente**:
1. Signup → scelta lingua → onboarding obiettivo annuale
2. Dashboard: grafici, sfida del mese, progresso obiettivo, saldo mensile
3. Quick-add transazione (FAB persistente)
4. Previsione mensile con confronto reale vs previsto
5. Calendario con eventi/scadenze (basato su `date-fns` + shadcn Calendar)
6. Sezione consigli (grid di card filtrabili per categoria)
7. Impostazioni lingua/obiettivo

**Operatore**:
1. Elenco beneficiari assegnati con indicatori (ultimo accesso, transazioni ultimo mese)
2. Dettaglio utente read-only: obiettivo, transazioni, progresso, previsioni

## Note tecniche

- Google Calendar integration → **fuori scope MVP** (calendario interno all'app)
- Notifiche push → in-app toast + badge; push browser rimandato a fase 2
- Tutti i calcoli lato client con memoizzazione + fallback SQL views se necessario
- Seed di ~10 consigli iniziali per lingua nella migration

## Sicurezza e privacy

- Operatori: sola lettura sui dati beneficiari (come discusso nelle fonti)
- Ruoli in tabella separata + `has_role()` SECURITY DEFINER
- RLS su tutte le tabelle utente
- Password reset flow con pagina `/reset-password`
