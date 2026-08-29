# Kakebo Navigator

Obiettivo dell'app: Trasporre il metodo giapponese Kakebo in una versione digitale per la Cooperativa Progetto 92, focalizzata sulla consapevolezza finanziaria e il risparmio
.
1. Struttura del Database (Firebase/Supabase):
Users: ID, nome, ruolo (Utente o Operatore), obiettivo annuale (descrizione e importo target)
.
Transactions: ID utente, tipo (Entrata/Uscita), categoria (dropdown: alimentari, bollette, trasporti, ecc.), importo, data
.
Monthly_Forecasts: ID utente, mese, totale entrate previste, totale uscite previste per categoria
.
Goals_Progress: ID utente, mese, risparmio effettivo (calcolato come Totale Entrate - Totale Uscite)
.
2. Funzionalità Chiave (User Side):
Workflow Kakebo: Una sequenza guidata che inizia con la definizione degli obiettivi annuali (es. "comprare una macchina" con relativo importo)
.
Calendario Intelligente: Un calendario mensile per annotare scadenze e promemoria con sistema di notifiche push
.
Controllo Quotidiano: Un pulsante rapido "+" per inserire entrate e uscite. Il sistema deve permettere di selezionare la categoria da un menu a tendina per aggregare i dati automaticamente nel bilancio finale
.
Dashboard di Gamification: Una schermata home con grafici a torta o a barre che mostrano l'andamento delle spese, i risparmi mensili e il progresso verso l'obiettivo annuale ("Sfida del mese": es. risparmiare 50€)
.
Sezione Consigli: Una libreria di contenuti statici o video su spesa consapevole, menù settimanali e gestione emergenze
.
3. Funzionalità Chiave (Operator Side):
Panoramica Utenti: Elenco dei beneficiari assegnati con visualizzazione della scheda anagrafica e dello stato di avanzamento (frequenza di accesso, compilazione Kakebo)
.
Monitoraggio: Capacità di visionare (ma non necessariamente modificare) gli obiettivi e i progressi dell'utente per facilitare il colloquio educativo
.
4. UI/UX e Accessibilità:
Semplicità Assoluta: Interfaccia pulita con icone grandi, testi chiari e calcoli totalmente automatici per evitare errori manuali da parte degli utenti
.
Multi-lingua: Supporto per Italiano, Arabo, Francese e Inglese
.
Istruzioni Integrate: Tooltip o icone "i" che spiegano come compilare ogni sezione
.
Considerazioni tecniche per te (dalle fonti):
Integrazioni: FlutterFlow ti permette di integrare facilmente Google Calendar per la gestione delle scadenze, evitando di programmare un sistema di calendario da zero
.
Gestione Privacy: Nel prompt ho incluso il ruolo "Operatore", ma ricorda che nelle fonti si è discusso se permettere agli operatori di vedere i dati in tempo reale o se limitare la visione agli incontri fisici per proteggere la privacy dell'utente post-percorso
.
Sostenibilità: FlutterFlow genera codice che può essere esportato, il che ti permetterebbe di mantenere l'app indipendentemente dalla piattaforma in futuro, se il progetto dovesse crescere
.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kakebo-kindred-glow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/749b0915-6f80-4da1-958a-5ba0ce40e9b7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
