"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const PAGE_SIZE = 25;
const CAPITAL_FLOW_LIMIT = 10;

const I18N = {
  it: {
    pageTitle: "ETF Performance Screener",
    pageSubtitle: "Momentum, trend, volume, rischio e stagionalita in una sola vista",
    langItalian: "Italiano",
    langEnglish: "Inglese",
    guideButton: "Guida",
    githubTitle: "Apri repository GitHub",
    searchLabel: "Cerca",
    searchPlaceholder: "Ticker, nome o categoria...",
    showOnlyLabel: "Mostra solo tipologia",
    allCategories: "Tutte le categorie",
    excludeLabel: "Escludi categorie",
    excludePlaceholder: "Categorie da escludere",
    clearExcluded: "Pulisci",
    selectedCount: (n) => `${n} selezionate`,
    aumMinLabel: "AUM minimo (milioni)",
    aumPlaceholder: "Es. 500",
    terMaxLabel: "TER massimo (%)",
    terPlaceholder: "Es. 0.50",
    missingLabel: "Dati AUM/TER mancanti",
    include: "Includi",
    exclude: "Escludi",
    minSuccessLabel: "Success rate stagionale min. (%)",
    resetFilters: "Azzera filtri",
    refreshQuotes: "Aggiorna quotazioni",
    capitalFlows: "Flussi di capitale",
    futureSeasonality: "Stagionalita future",
    analyzeFiltered: "Analizza stagionalita ETF filtrati",
    hint: "Questo screener combina momentum, trend, volume, rischio e stagionalita. I tooltip aiutano a interpretare velocemente la lettura.",
    scrollHint: "Suggerimento: scorri orizzontalmente per vedere tutte le colonne.",
    statusLoading: "caricamento in corso...",
    statusSeasonality: (done, total) => `stagionalita ${done}/${total}`,
    statusLoaded: (loaded, total, shown) => `Caricati ${loaded}/${total || "..."} ETF · mostrati ${shown}`,
    statusError: "Errore",
    noResults: "Nessun ETF con i filtri correnti.",
    modalClose: "Chiudi",
    flowTitle: "Flussi di capitale",
    flowHint: "Vista sintetica di dove si sta concentrando la forza del mercato: entrate negli asset piu forti e uscite da quelli piu deboli.",
    flowIn: "Entrate / forza",
    flowOut: "Uscite / debolezza",
    noData: "Nessun dato disponibile.",
    aligned: "Allineata",
    watch: "Attenzione",
    detail: "Dettaglio",
    legalTitle: "Avvertenza legale",
    legalBody:
      "Il sottoscritto non potra essere ritenuto responsabile di alcun danno indiretto, consequenziale o incidentale, inclusi, a titolo meramente esemplificativo, perdite di profitto o guadagno, interruzioni di attivita commerciale, perdita di dati o qualunque pregiudizio derivante dall'utilizzo, dall'impossibilita di utilizzare o dall'aver ritenuto attendibili i materiali contenuti in questo sito.",
    legalBody2:
      "I contenuti hanno finalita esclusivamente informative e didattiche e non costituiscono consulenza finanziaria o sollecitazione all'investimento.",
    guide: {
      title: "Guida applicazione",
      intro:
        "Questa applicazione e uno screener ETF dinamico: raccoglie dati di mercato, li normalizza e li trasforma in metriche utili per confrontare forza, rischio e stagionalita.",
      sections: [
        {
          title: "Come funziona in sintesi",
          items: [
            "Il backend scarica quotazioni e storico dai provider, poi calcola indicatori come RSI, trend, drawdown e rendimenti multi-orizzonte.",
            "La tabella principale mostra ogni ETF come una riga comparabile, ordinabile e filtrabile.",
            "I pulsanti azione aprono modali di approfondimento (flussi e stagionalita) e la pagina dedicata alle stagionalita future.",
          ],
        },
        {
          title: "Filtri: campo per campo",
          items: [
            "Cerca: filtra per ticker, nome o categoria.",
            "Mostra solo tipologia: limita la vista a una singola categoria.",
            "Escludi categorie: multiselect a checkbox per rimuovere piu categorie in un colpo solo.",
            "AUM minimo (milioni): esclude ETF troppo piccoli in termini di masse gestite.",
            "TER massimo (%): elimina ETF con costi superiori alla soglia.",
            "Dati AUM/TER mancanti: scegli se includere o escludere righe con dati incompleti.",
            "Success rate stagionale min. (%): imposta la soglia minima di affidabilita storica per evidenziare finestre stagionali.",
          ],
        },
        {
          title: "Azioni principali",
          items: [
            "Azzera filtri: resetta tutti i criteri di ricerca.",
            "Aggiorna quotazioni: forza un refresh dati lato server.",
            "Flussi di capitale: mostra top ETF in entrata/uscita in base alla performance mensile.",
            "Stagionalita future: apre la pagina secondaria con focus su finestre stagionali favorevoli future o attive.",
            "Analizza stagionalita ETF filtrati: pre-carica in cache i dettagli stagionali degli ETF attualmente visibili.",
          ],
        },
        {
          title: "Lettura tabella e colonne",
          items: [
            "Le intestazioni sono ordinabili; clicca il titolo colonna per invertire ascendente/discendente.",
            "Trend, RSI, Positivi, Streak, RVOL e Volatilita aiutano a capire momentum e rischio nel breve.",
            "52W High e Max DD 52W misurano distanza dai massimi e severita delle fasi di ribasso.",
            "Score sintetizza piu segnali in un unico valore 0-100.",
            "Seasonality segnala allineamento tra fase tecnica attuale e finestre storicamente favorevoli.",
          ],
        },
        {
          title: "Metriche principali: spiegazione pratica dettagliata",
          items: [
            "Ticker: identificativo breve del fondo. Esempio: tra VOO, IVV e SPY (stesso benchmark S&P 500), il ticker aiuta a distinguere il veicolo specifico che vuoi comprare o monitorare.",
            "Nome ETF: descrive provider e strategia. Esempio: 'Nasdaq 100' puo apparire in piu ETF, ma nome completo chiarisce replica, paese e politica del fondo.",
            "Categoria: cluster tematico o asset class (bonds, commodities, growth, ecc.). Esempio: se vuoi ridurre volatilita, puoi escludere leveragedInverse e concentrare la ricerca su broadMarketUS o bonds.",
            "Trend: struttura tecnica del prezzo rispetto alle medie. Esempio: trend Forte significa prezzo e medie allineate positivamente; utile per evitare ingressi contro-tendenza.",
            "RSI 14: misura la forza del movimento recente su scala 0-100. Esempio: RSI 72 con trend forte indica spinta elevata ma anche rischio di pausa; RSI 38 puo suggerire fase debole o ricostruzione.",
            "Positivi 10G: numero di sedute positive su 10. Esempio: 8/10 segnala continuita nel breve, mentre 3/10 mostra pressione ribassista recente.",
            "Positivi 20G: versione estesa su 20 sedute. Esempio: 14/20 e piu affidabile di 7/10 isolato, perche copre un orizzonte piu ampio.",
            "Streak 20G: striscia consecutiva di sedute positive. Esempio: streak 5/20 indica accelerazione progressiva, mentre 0/20 segnala assenza di persistenza.",
            "Dist SMA20: distanza percentuale dalla media mobile breve. Esempio: +2% spesso indica trend ordinato; +15% puo indicare prezzo esteso e maggiore rischio di pullback.",
            "RVOL: volume relativo contro media recente. Esempio: RVOL 2.8x su giornata positiva suggerisce partecipazione istituzionale; RVOL 0.6x indica movimento poco convinto.",
            "Vol 20D: volatilita annualizzata stimata sulle ultime sedute. Esempio: vol 12 e tipica di ETF difensivi; vol 45 e piu comune su temi aggressivi o leva.",
            "52W High: distanza dal massimo annuale. Esempio: -1.5% significa vicino ai massimi (forza relativa alta), -28% indica ampia distanza e possibile fase di recupero o debolezza persistente.",
            "Max DD 52W: peggior drawdown dell'anno. Esempio: -8% e drawdown contenuto, -35% evidenzia storia di forte stress e rischio maggiore per il profilo conservativo.",
            "AUM: masse gestite. Esempio: 20B tende a offrire migliore profondita e spread piu stretti rispetto a 80M, utile soprattutto su ordini ricorrenti o importi elevati.",
            "Score: punteggio composito 0-100. Esempio: score 88 indica combinazione robusta di trend/momentum/qualita; score 54 suggerisce setup da monitorare con prudenza.",
            "1D: ritorno giornaliero. Esempio: +1.8% in una seduta puo essere breakout se confermato da RVOL alto e trend forte.",
            "3D: ritorno su 3 sedute. Esempio: +3.2% su 3D riduce il rumore rispetto a 1D e segnala dinamica piu consistente.",
            "1W: ritorno settimanale. Esempio: +4.5% in settimana con vol moderata suggerisce momentum sano; stessa performance con vol molto alta implica rischio piu elevato.",
            "1M: ritorno mensile. Esempio: +9% a 1M puo indicare leadership di breve/medio periodo e aiuta anche nella lettura del pannello Flussi di capitale.",
            "Seasonality: verifica se la data corrente ricade in finestre storicamente favorevoli. Esempio: ETF allineato con success rate alto e trend forte offre un contesto statistico migliore di un segnale tecnico isolato.",
            "Borsa (Exchange): mercato di quotazione. Esempio: conoscere l'exchange aiuta a gestire orari, valuta e liquidita durante l'operativita intraday o in apertura USA/Europa.",
          ],
        },
        {
          title: "Dettaglio stagionalita (modal)",
          items: [
            "Si apre cliccando il ticker o il pulsante Dettaglio nella colonna Seasonality.",
            "Finestre stagionali: confronta rendimento medio e success rate su 10/15/20 anni.",
            "Giorni comuni 10/15/20: mostra solo date con comportamento positivo consistente nelle tre profondita storiche.",
            "Tutti i giorni: tabella completa giornaliera con media, mediana, migliore/peggiore seduta e campioni.",
            "Mesi: vista aggregata mensile per individuare stagioni storicamente forti o deboli.",
          ],
        },
        {
          title: "Flussi di capitale",
          items: [
            "Il pannello Entrate/Forza mostra i migliori ETF per rendimento a 1 mese (proxy di inflow relativo).",
            "Il pannello Uscite/Debolezza mostra i peggiori ETF a 1 mese (proxy di outflow o rotazione difensiva).",
            "Usa questo blocco per capire rapidamente dove il mercato sta concentrando attenzione e liquidita.",
          ],
        },
        {
          title: "Pagina secondaria: Stagionalita future",
          items: [
            "Classifica ETF con finestre stagionali promettenti e success rate elevato.",
            "Apri dettaglio per ogni ticker per rivedere le stesse analisi avanzate disponibili nella home.",
            "Utile per costruire watchlist orientate al timing storico, da integrare sempre con trend e rischio correnti.",
          ],
        },
      ],
      close: "Chiudi",
    },
    trendStrong: "Forte",
    trendNeutral: "Neutro",
    trendWeak: "Debole",
    columns: {
      ticker: "Ticker",
      name: "Nome ETF",
      category: "Categoria",
      trend: "Trend",
      rsi14: "RSI 14",
      positive10: "Positivi 10G",
      positive20: "Positivi 20G",
      streak: "Streak 20G",
      distanceSma20: "Dist SMA20",
      rvol: "RVOL",
      volatility20d: "Vol 20D",
      distance52wHigh: "52W High",
      maxDrawdown52w: "Max DD 52W",
      netAssets: "AUM",
      score: "Score",
      dailyReturn: "1D",
      threeDayReturn: "3D",
      weekReturn: "1W",
      monthReturn: "1M",
      seasonality: "Seasonality",
      borsa: "Borsa",
    },
    columnHelp: {
      ticker: "Simbolo dell'ETF per identificarlo rapidamente.",
      name: "Nome completo del fondo quotato.",
      category: "Categoria del fondo per area o strategia.",
      trend: "Stato del trend rispetto alle medie mobili.",
      rsi14: "Forza relativa su 14 periodi.",
      positive10: "Giorni positivi nelle ultime 10 sedute.",
      positive20: "Giorni positivi nelle ultime 20 sedute.",
      streak: "Consecutivita dei giorni positivi recenti.",
      distanceSma20: "Distanza percentuale dal prezzo medio a 20 giorni.",
      rvol: "Volume relativo contro media 20 giorni.",
      volatility20d: "Volatilita annualizzata su base 20 giorni.",
      distance52wHigh: "Distanza dal massimo annuale.",
      maxDrawdown52w: "Massima discesa registrata nell'ultimo anno.",
      netAssets: "Asset under management del fondo.",
      score: "Punteggio sintetico 0-100.",
      dailyReturn: "Performance ultimo giorno.",
      threeDayReturn: "Performance ultime 3 sedute.",
      weekReturn: "Performance ultima settimana.",
      monthReturn: "Performance ultimo mese.",
      seasonality: "Allineamento con stagionalita favorevole.",
      borsa: "Mercato di quotazione del fondo.",
    },
    tooltip: {
      trend: "Trend",
      rsi14: "RSI 14",
      positive: "Positivi 10/20 giorni",
      streak: "Streak 20G",
      distSma20: "Distanza da SMA20",
      rvol: "Volume relativo",
      vol20d: "Volatilita 20D",
      high52: "Distanza 52W High",
      maxDd: "Max Drawdown 52W",
      aum: "AUM",
      score: "ETF Score 0-100",
      d1: "1 giorno",
      d3: "3 giorni",
      w1: "1 settimana",
      m1: "1 mese",
      seasonality: "Allineamento stagionale",
    },
    tooltipBody: {
      trend: "Confronta prezzo e medie mobili per misurare la struttura del movimento.",
      rsi14: "Valuta la forza del momentum recente.",
      positive: "Misura la persistenza del movimento positivo.",
      streak: "Conta le sedute positive consecutive piu recenti.",
      distSma20: "Mostra quanto il prezzo e distante dalla media breve.",
      rvol: "Confronta volume odierno con la media storica recente.",
      vol20d: "Stima il livello di rischio annualizzato nel breve periodo.",
      high52: "Indica vicinanza o distanza dal massimo annuale.",
      maxDd: "Mostra la peggiore discesa percentuale nell'ultimo anno.",
      aum: "Dimensione del fondo e liquidita potenziale.",
      score: "Sintesi combinata di momentum, trend, rischio e stagionalita.",
      d1: "Rendimento dell'ultima seduta.",
      d3: "Rendimento cumulato sulle ultime 3 sedute.",
      w1: "Rendimento cumulato sulle ultime 5 sedute.",
      m1: "Rendimento cumulato degli ultimi 30 giorni.",
      seasonality: "Verifica se oggi rientra in una finestra storicamente favorevole.",
    },
    season: {
      loading: "Caricamento fino a 20 anni di storico giornaliero...",
      titleFallback: "Stagionalita",
      intro: "Storico disponibile circa",
      years: "anni",
      dateFormat: "Le date sono mostrate nel formato GG/MM.",
      close: "Chiudi",
      cardTitle: (date, w) => `Oggi ${date} · ultimi ${w} anni`,
      successRate: "Success rate",
      samples: "campioni",
      tabWindows: "Finestre stagionali",
      tabIntersection: "Giorni comuni 10/15/20",
      tabDaily: "Tutti i giorni",
      tabMonthly: "Mesi",
      activeWindows: "Finestre stagionali attive",
      minSuccess: "success rate minimo",
      windowsHint: "Ogni finestra contiene la data odierna e privilegia coerenza tra 10/15/20 anni.",
      positiveIntersection: "Intersezione stagionale positiva",
      intersectionHint: "Sono inclusi solo i giorni con rendimento medio positivo in tutte le finestre.",
      noWindow: "Nessuna finestra soddisfa la soglia selezionata.",
      noDay: "Nessun giorno soddisfa la soglia.",
      from: "dal",
      to: "al",
      window: "Finestra",
      duration: "Durata",
      minSuccessCol: "Successo minimo",
      dayDate: "Data GG/MM",
      average: "Media",
      median: "Mediana",
      best: "Migliore",
      worst: "Peggiore",
      month: "Mese",
      count: "N",
      dayLabel: "gg",
      yearsLabel: "anni",
      months: ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"],
    },
  },
  en: {
    pageTitle: "ETF Performance Screener",
    pageSubtitle: "Momentum, trend, volume, risk, and seasonality in one view",
    langItalian: "Italian",
    langEnglish: "English",
    guideButton: "Guide",
    githubTitle: "Open GitHub repository",
    searchLabel: "Search",
    searchPlaceholder: "Ticker, name, or category...",
    showOnlyLabel: "Show only category",
    allCategories: "All categories",
    excludeLabel: "Exclude categories",
    excludePlaceholder: "Categories to exclude",
    clearExcluded: "Clear",
    selectedCount: (n) => `${n} selected`,
    aumMinLabel: "Minimum AUM (millions)",
    aumPlaceholder: "Ex. 500",
    terMaxLabel: "Maximum TER (%)",
    terPlaceholder: "Ex. 0.50",
    missingLabel: "Missing AUM/TER data",
    include: "Include",
    exclude: "Exclude",
    minSuccessLabel: "Min seasonal success rate (%)",
    resetFilters: "Reset filters",
    refreshQuotes: "Refresh quotes",
    capitalFlows: "Capital flows",
    futureSeasonality: "Future seasonality",
    analyzeFiltered: "Analyze filtered ETF seasonality",
    hint: "This screener combines momentum, trend, volume, risk, and seasonality. Tooltips help you read signals quickly.",
    scrollHint: "Tip: scroll horizontally to view all columns.",
    statusLoading: "loading in progress...",
    statusSeasonality: (done, total) => `seasonality ${done}/${total}`,
    statusLoaded: (loaded, total, shown) => `Loaded ${loaded}/${total || "..."} ETFs · showing ${shown}`,
    statusError: "Error",
    noResults: "No ETFs match the active filters.",
    modalClose: "Close",
    flowTitle: "Capital flows",
    flowHint: "Quick view of where market strength is concentrating: inflows in stronger assets and outflows in weaker ones.",
    flowIn: "Inflows / strength",
    flowOut: "Outflows / weakness",
    noData: "No data available.",
    aligned: "Aligned",
    watch: "Watch",
    detail: "Details",
    legalTitle: "Legal disclaimer",
    legalBody:
      "The undersigned shall not be held liable for any indirect, consequential, or incidental damages, including, by way of example only, loss of profits or earnings, business interruption, or loss of data arising from the use of, inability to use, or reliance on the materials contained on this site.",
    legalBody2:
      "All content is provided for informational and educational purposes only and does not constitute financial advice or investment solicitation.",
    guide: {
      title: "Application guide",
      intro:
        "This application is a dynamic ETF screener: it gathers market data, normalizes it, and converts it into practical metrics to compare strength, risk, and seasonality.",
      sections: [
        {
          title: "How it works at a glance",
          items: [
            "The backend fetches quote/history data and computes indicators such as RSI, trend structure, drawdown, and multi-horizon returns.",
            "The main table displays each ETF as a comparable row that you can sort and filter.",
            "Action buttons open deeper views (capital flows and seasonality) plus a dedicated future-seasonality page.",
          ],
        },
        {
          title: "Filters: field by field",
          items: [
            "Search: filters by ticker, ETF name, or category.",
            "Show only category: limits results to a single category.",
            "Exclude categories: checkbox multi-select that removes multiple categories at once.",
            "Minimum AUM (millions): excludes funds below your size threshold.",
            "Maximum TER (%): removes ETFs with costs above your threshold.",
            "Missing AUM/TER data: choose whether incomplete rows are included or excluded.",
            "Min seasonal success rate (%): minimum historical reliability required for seasonal highlights.",
          ],
        },
        {
          title: "Main actions",
          items: [
            "Reset filters: clears all active filter criteria.",
            "Refresh quotes: forces a server-side market data refresh.",
            "Capital flows: opens the top inflow/outflow ETF view based on monthly performance.",
            "Future seasonality: opens the secondary page focused on active/upcoming favorable windows.",
            "Analyze filtered ETF seasonality: preloads seasonality details for the currently visible ETF set.",
          ],
        },
        {
          title: "Reading the table and columns",
          items: [
            "Column headers are sortable; click to switch ascending/descending order.",
            "Trend, RSI, Positive days, Streak, RVOL, and Volatility describe short-term momentum and risk.",
            "52W High and Max DD 52W describe distance from highs and downside severity.",
            "Score combines multiple signals into a single 0-100 ranking value.",
            "Seasonality indicates alignment between current setup and historically favorable windows.",
          ],
        },
        {
          title: "Core metrics: detailed practical guide",
          items: [
            "Ticker: short fund identifier. Example: VOO, IVV, and SPY track similar benchmarks, and ticker helps you target the exact instrument you want.",
            "ETF name: full provider + strategy context. Example: multiple funds may mention Nasdaq 100, but full name clarifies structure and listing details.",
            "Category: strategy or asset-class bucket (bonds, commodities, growth, etc.). Example: excluding leveragedInverse quickly de-risks the universe for conservative scans.",
            "Trend: directional structure versus moving averages. Example: Strong trend means price/averages are aligned upward, often reducing counter-trend entries.",
            "RSI 14: recent momentum strength on a 0-100 scale. Example: RSI 72 can indicate strong upside thrust but also higher pullback risk; RSI 38 may signal weakness or rebuilding.",
            "Positive 10D: number of positive sessions out of 10. Example: 8/10 suggests short-term persistence, while 3/10 reflects recent selling pressure.",
            "Positive 20D: same concept over 20 sessions. Example: 14/20 is often more robust than a standalone 7/10 burst.",
            "Streak 20D: consecutive positive session count. Example: streak 5/20 shows ongoing acceleration, while 0/20 shows no recent continuity.",
            "Dist SMA20: percent distance from short moving average. Example: +2% usually means orderly trend; +15% can imply overextension and mean-reversion risk.",
            "RVOL: relative volume versus recent baseline. Example: RVOL 2.8x on a green day suggests broad participation; RVOL 0.6x implies weaker conviction.",
            "Vol 20D: annualized volatility estimate from recent sessions. Example: vol 12 is typical for defensive ETFs; vol 45 is common in aggressive themes or leveraged products.",
            "52W High: distance from yearly high. Example: -1.5% means near highs (strong relative behavior), while -28% suggests deeper recovery or structural weakness.",
            "Max DD 52W: worst one-year drawdown. Example: -8% indicates contained downside history; -35% reveals much larger stress episodes.",
            "AUM: assets under management. Example: 20B funds usually provide deeper liquidity and tighter spreads than very small funds.",
            "Score: composite 0-100 quality/momentum ranking. Example: 88 points to broad signal alignment; 54 is often a watchlist candidate rather than immediate priority.",
            "1D return: last-session performance. Example: +1.8% can be meaningful if confirmed by high RVOL and strong trend context.",
            "3D return: three-session performance. Example: +3.2% over 3D reduces single-day noise and confirms follow-through.",
            "1W return: weekly performance view. Example: +4.5% with moderate volatility is often healthier than the same return achieved with extreme volatility.",
            "1M return: monthly performance. Example: +9% may identify short/medium-term leadership and directly impacts the Capital Flows ranking.",
            "Seasonality: checks whether current dates fall in historically favorable windows. Example: high-success seasonality aligned with strong trend can improve timing context.",
            "Exchange: listing market. Example: exchange awareness helps with trading hours, currency handling, and expected liquidity conditions.",
          ],
        },
        {
          title: "Seasonality detail modal",
          items: [
            "Open it by clicking the ticker or the Details button in the Seasonality column.",
            "Seasonal windows compares average return and success rate across 10/15/20-year depths.",
            "Shared days 10/15/20 keeps only dates with consistently positive behavior across all depths.",
            "All days shows the full day-level table with average, median, best/worst day, and sample count.",
            "Months provides monthly aggregates to spot seasonally strong or weak periods.",
          ],
        },
        {
          title: "Capital flows view",
          items: [
            "Inflows/Strength lists the top monthly performers (relative inflow proxy).",
            "Outflows/Weakness lists the weakest monthly performers (outflow or defensive rotation proxy).",
            "Use this panel as a fast pulse-check of where market attention and liquidity are rotating.",
          ],
        },
        {
          title: "Secondary page: Future seasonality",
          items: [
            "Ranks ETFs with promising active/upcoming seasonal windows and stronger success rates.",
            "Open details on each ticker to inspect the same advanced analytics from the home page.",
            "Best used to build timing-oriented watchlists, always combined with current trend and risk context.",
          ],
        },
      ],
      close: "Close",
    },
    trendStrong: "Strong",
    trendNeutral: "Neutral",
    trendWeak: "Weak",
    columns: {
      ticker: "Ticker",
      name: "ETF name",
      category: "Category",
      trend: "Trend",
      rsi14: "RSI 14",
      positive10: "Positive 10D",
      positive20: "Positive 20D",
      streak: "Streak 20D",
      distanceSma20: "Dist SMA20",
      rvol: "RVOL",
      volatility20d: "Vol 20D",
      distance52wHigh: "52W High",
      maxDrawdown52w: "Max DD 52W",
      netAssets: "AUM",
      score: "Score",
      dailyReturn: "1D",
      threeDayReturn: "3D",
      weekReturn: "1W",
      monthReturn: "1M",
      seasonality: "Seasonality",
      borsa: "Exchange",
    },
    columnHelp: {
      ticker: "ETF symbol for quick identification.",
      name: "Full listed fund name.",
      category: "Fund category by area or strategy.",
      trend: "Trend status based on moving averages.",
      rsi14: "Relative strength over 14 periods.",
      positive10: "Positive days over last 10 sessions.",
      positive20: "Positive days over last 20 sessions.",
      streak: "Consecutive recent positive days.",
      distanceSma20: "Percent distance from 20-day average.",
      rvol: "Relative volume vs 20-day average.",
      volatility20d: "20-day annualized volatility.",
      distance52wHigh: "Distance from yearly high.",
      maxDrawdown52w: "Worst drawdown over last year.",
      netAssets: "Assets under management.",
      score: "Synthetic 0-100 score.",
      dailyReturn: "Last day performance.",
      threeDayReturn: "Last 3 sessions performance.",
      weekReturn: "Last week performance.",
      monthReturn: "Last month performance.",
      seasonality: "Alignment with favorable seasonal windows.",
      borsa: "Listing exchange.",
    },
    tooltip: {
      trend: "Trend",
      rsi14: "RSI 14",
      positive: "Positive 10/20 days",
      streak: "Streak 20D",
      distSma20: "Distance from SMA20",
      rvol: "Relative volume",
      vol20d: "Volatility 20D",
      high52: "Distance 52W High",
      maxDd: "Max Drawdown 52W",
      aum: "AUM",
      score: "ETF Score 0-100",
      d1: "1 day",
      d3: "3 days",
      w1: "1 week",
      m1: "1 month",
      seasonality: "Seasonality alignment",
    },
    tooltipBody: {
      trend: "Compares price and moving averages to describe structure.",
      rsi14: "Measures recent momentum strength.",
      positive: "Captures persistence of positive moves.",
      streak: "Counts consecutive positive sessions.",
      distSma20: "Shows how far price is from short average.",
      rvol: "Compares current volume to recent average volume.",
      vol20d: "Estimates short-term annualized risk.",
      high52: "Shows proximity to yearly highs.",
      maxDd: "Displays worst percentage drop over one year.",
      aum: "Fund size and potential liquidity depth.",
      score: "Combined view of momentum, trend, risk, and seasonality.",
      d1: "Return of the latest session.",
      d3: "Cumulative return over the last 3 sessions.",
      w1: "Cumulative return over the last 5 sessions.",
      m1: "Cumulative return over the last 30 days.",
      seasonality: "Checks whether today falls in favorable windows.",
    },
    season: {
      loading: "Loading up to 20 years of daily history...",
      titleFallback: "Seasonality",
      intro: "Available history about",
      years: "years",
      dateFormat: "Dates are shown as DD/MM.",
      close: "Close",
      cardTitle: (date, w) => `Today ${date} · last ${w} years`,
      successRate: "Success rate",
      samples: "samples",
      tabWindows: "Seasonal windows",
      tabIntersection: "Shared days 10/15/20",
      tabDaily: "All days",
      tabMonthly: "Months",
      activeWindows: "Active seasonal windows",
      minSuccess: "minimum success rate",
      windowsHint: "Each window includes today's date and favors consistency across 10/15/20-year depths.",
      positiveIntersection: "Positive seasonal intersection",
      intersectionHint: "Only days with positive average return across all windows are included.",
      noWindow: "No window satisfies the selected threshold.",
      noDay: "No day satisfies the selected threshold.",
      from: "from",
      to: "to",
      window: "Window",
      duration: "Duration",
      minSuccessCol: "Min success",
      dayDate: "Date DD/MM",
      average: "Average",
      median: "Median",
      best: "Best",
      worst: "Worst",
      month: "Month",
      count: "N",
      dayLabel: "d",
      yearsLabel: "years",
      months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    },
  },
};

const pct = (v) =>
  v == null || !Number.isFinite(Number(v))
    ? "-"
    : `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`;

const cls = (v) =>
  v == null ? "muted" : Number(v) > 0 ? "positive" : Number(v) < 0 ? "negative" : "muted";

const fmt = (v, digits = 2) =>
  v == null || !Number.isFinite(Number(v)) ? "-" : Number(v).toFixed(digits);

const formatAum = (v, currency) => {
  if (v == null) return "-";
  const n = Number(v);
  const x = Math.abs(n);
  const s =
    x >= 1e12
      ? `${(n / 1e12).toFixed(2)} T`
      : x >= 1e9
      ? `${(n / 1e9).toFixed(2)} B`
      : x >= 1e6
      ? `${(n / 1e6).toFixed(1)} M`
      : n.toLocaleString("en-US");
  return `${s}${currency ? ` ${currency}` : ""}`;
};

const formatDateKey = (key) => {
  if (!key) return "-";
  const [m, d] = String(key).split("-");
  return m && d ? `${d}/${m}` : key;
};

function trendTone(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "forte" || normalized === "strong") return "strong";
  if (normalized === "neutro" || normalized === "neutral") return "neutral";
  return "weak";
}

function localizedTrendLabel(value, t) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "forte" || normalized === "strong") return t.trendStrong;
  if (normalized === "neutro" || normalized === "neutral") return t.trendNeutral;
  if (!normalized || normalized === "-") return "-";
  return t.trendWeak;
}

function tooltip(title, body) {
  return `${title}: ${body}`;
}

export default function Home() {
  const [lang, setLang] = useState("it");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(0);
  const [error, setError] = useState("");
  const [sort, setSort] = useState({ key: "score", dir: -1 });
  const [search, setSearch] = useState("");
  const [only, setOnly] = useState("");
  const [excluded, setExcluded] = useState([]);
  const [minAum, setMinAum] = useState("");
  const [maxTer, setMaxTer] = useState("");
  const [missing, setMissing] = useState("include");
  const [seasonCache, setSeasonCache] = useState({});
  const [modal, setModal] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(null);
  const [minSuccess, setMinSuccess] = useState(60);
  const [flowOpen, setFlowOpen] = useState(false);
  const [openHeaderKey, setOpenHeaderKey] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const abortRef = useRef(null);

  const t = I18N[lang];

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("ui-lang") : null;
    if (saved === "it" || saved === "en") setLang(saved);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("ui-lang", lang);
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    function closeTooltipOnOutsideClick(event) {
      if (!event.target?.closest?.(".columnHead")) setOpenHeaderKey(null);
    }
    document.addEventListener("mousedown", closeTooltipOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeTooltipOnOutsideClick);
  }, []);

  async function loadAll(force = false) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRows([]);
    setTotal(0);
    setLoaded(0);
    setLoading(true);
    setError("");

    try {
      let page = 1;
      let hasMore = true;
      let acc = [];
      while (hasMore) {
        const r = await fetch(`/api/etfs?page=${page}&pageSize=${PAGE_SIZE}${force ? "&refresh=1" : ""}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`API ETF ${r.status}`);
        const out = await r.json();
        setTotal(out.total);
        acc = [...acc, ...out.data];
        setRows(acc);
        setLoaded(acc.length);
        hasMore = out.hasMore;
        page += 1;
      }
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(false);
    return () => abortRef.current?.abort();
  }, []);

  const categories = useMemo(() => [...new Set(rows.flatMap((r) => r.categories || []))].sort(), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = minAum === "" ? null : Number(minAum) * 1e6;
    const mt = maxTer === "" ? null : Number(maxTer);
    const ex = new Set(excluded);

    const data = rows.filter((x) => {
      if (!x.ok) return false;
      if (
        q &&
        !x.ticker.toLowerCase().includes(q) &&
        !(x.name || "").toLowerCase().includes(q) &&
        !(x.categories || []).some((c) => c.toLowerCase().includes(q))
      ) {
        return false;
      }
      if (only && !(x.categories || []).includes(only)) return false;
      if ((x.categories || []).some((c) => ex.has(c))) return false;
      if (min != null && (x.netAssets == null ? missing !== "include" : x.netAssets < min)) return false;
      if (mt != null && (x.ter == null ? missing !== "include" : x.ter > mt)) return false;
      if (missing === "exclude" && (x.netAssets == null || x.ter == null)) return false;
      return true;
    });

    data.sort((a, b) => {
      const { key, dir } = sort;
      if (["ticker", "name"].includes(key)) {
        return String(a[key] || "").localeCompare(String(b[key] || "")) * dir;
      }
      return ((a[key] ?? -Infinity) - (b[key] ?? -Infinity)) * dir;
    });

    return data;
  }, [rows, search, only, excluded, minAum, maxTer, missing, sort]);

  const capitalFlow = useMemo(() => {
    const ranked = [...rows]
      .filter((x) => x.ok && Number.isFinite(Number(x.monthReturn)))
      .sort((a, b) => Number(b.monthReturn ?? 0) - Number(a.monthReturn ?? 0));

    const weak = [...rows]
      .filter((x) => x.ok && Number.isFinite(Number(x.monthReturn)))
      .sort((a, b) => Number(a.monthReturn ?? 0) - Number(b.monthReturn ?? 0));

    return {
      inflow: ranked
        .slice(0, CAPITAL_FLOW_LIMIT)
        .map((x) => ({ ticker: x.ticker, name: x.name || x.ticker, value: Number(x.monthReturn ?? 0) })),
      outflow: weak
        .slice(0, CAPITAL_FLOW_LIMIT)
        .map((x) => ({ ticker: x.ticker, name: x.name || x.ticker, value: Number(x.monthReturn ?? 0) })),
    };
  }, [rows]);

  function doSort(key) {
    setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: ["ticker", "name"].includes(key) ? 1 : -1 }));
  }

  function clearFilters() {
    setSearch("");
    setOnly("");
    setExcluded([]);
    setMinAum("");
    setMaxTer("");
    setMissing("include");
  }

  async function getSeasonality(ticker, open = true) {
    if (seasonCache[ticker]) {
      if (open) setModal(seasonCache[ticker]);
      return seasonCache[ticker];
    }

    if (open) setModalLoading(true);
    try {
      const r = await fetch(`/api/seasonality?ticker=${encodeURIComponent(ticker)}&windows=10,15,20`, { cache: "no-store" });
      if (!r.ok) throw new Error(`Seasonality ${r.status}`);
      const data = await r.json();
      setSeasonCache((c) => ({ ...c, [ticker]: data }));
      if (open) setModal(data);
      return data;
    } catch (e) {
      if (open) setModal({ error: e.message, ticker });
      return null;
    } finally {
      if (open) setModalLoading(false);
    }
  }

  async function scanVisible() {
    const tickers = filtered.map((x) => x.ticker);
    setScanProgress({ done: 0, total: tickers.length });

    let cursor = 0;
    const workers = Array.from({ length: 2 }, async () => {
      while (true) {
        const i = cursor++;
        if (i >= tickers.length) return;
        await getSeasonality(tickers[i], false);
        setScanProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
      }
    });

    await Promise.all(workers);
  }

  const statusText = `${t.statusLoaded(loaded, total, filtered.length)}${loading ? ` · ${t.statusLoading}` : ""}${
    scanProgress ? ` · ${t.statusSeasonality(scanProgress.done, scanProgress.total)}` : ""
  }`;

  return (
    <main className="page">
      <header className="topBar">
        <div>
          <h1 className="title">{t.pageTitle}</h1>
          <div className="subtitle">{t.pageSubtitle}</div>
        </div>
        <div className="topTools">
          <div className="langSwitch" aria-label="Language switcher">
            <button
              type="button"
              className={`langButton ${lang === "it" ? "active" : ""}`}
              onClick={() => setLang("it")}
              title={t.langItalian}
            >
              🇮🇹 IT
            </button>
            <button
              type="button"
              className={`langButton ${lang === "en" ? "active" : ""}`}
              onClick={() => setLang("en")}
              title={t.langEnglish}
            >
              🇬🇧 EN
            </button>
          </div>
          <button type="button" className="button topAction" onClick={() => setGuideOpen(true)}>{t.guideButton}</button>
          <a
            className="iconButton"
            href="https://github.com/saxsalvo/etfscreener.git"
            target="_blank"
            rel="noreferrer"
            title={t.githubTitle}
            aria-label={t.githubTitle}
          >
            <svg className="githubIcon" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 .2a8 8 0 0 0-2.53 15.59c.4.08.55-.17.55-.38l-.01-1.35c-2.24.48-2.71-1.08-2.71-1.08-.36-.93-.9-1.17-.9-1.17-.74-.5.06-.5.06-.5.82.06 1.25.84 1.25.84.72 1.24 1.89.88 2.35.67.08-.53.28-.89.5-1.1-1.78-.2-3.64-.9-3.64-4.02 0-.89.32-1.62.84-2.19-.08-.21-.36-1.02.08-2.13 0 0 .69-.22 2.26.84A7.8 7.8 0 0 1 8 4.19c.7 0 1.41.1 2.07.3 1.57-1.07 2.26-.84 2.26-.84.45 1.11.17 1.92.09 2.13.53.57.84 1.3.84 2.19 0 3.13-1.87 3.82-3.65 4.02.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.46.55.38A8 8 0 0 0 8 .2Z" fill="currentColor"/>
            </svg>
          </a>
        </div>
      </header>

      <div className="filters">
        <Field label={t.searchLabel}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPlaceholder} />
        </Field>

        <Field label={t.showOnlyLabel}>
          <select value={only} onChange={(e) => setOnly(e.target.value)}>
            <option value="">{t.allCategories}</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>

        <Field label={t.excludeLabel}>
          <CategoryMultiSelect
            options={categories}
            selected={excluded}
            onChange={setExcluded}
            placeholder={t.excludePlaceholder}
            clearLabel={t.clearExcluded}
            selectedCount={t.selectedCount}
          />
        </Field>

        <Field label={t.aumMinLabel}>
          <input type="number" min="0" value={minAum} onChange={(e) => setMinAum(e.target.value)} placeholder={t.aumPlaceholder} />
        </Field>

        <Field label={t.terMaxLabel}>
          <input type="number" min="0" step="0.01" value={maxTer} onChange={(e) => setMaxTer(e.target.value)} placeholder={t.terPlaceholder} />
        </Field>

        <Field label={t.missingLabel}>
          <select value={missing} onChange={(e) => setMissing(e.target.value)}>
            <option value="include">{t.include}</option>
            <option value="exclude">{t.exclude}</option>
          </select>
        </Field>

        <Field label={t.minSuccessLabel}>
          <input type="number" min="0" max="100" value={minSuccess} onChange={(e) => setMinSuccess(Number(e.target.value || 0))} />
        </Field>
      </div>

      <div className="actions">
        <button className="button" onClick={clearFilters}>{t.resetFilters}</button>
        <button className="button" onClick={() => loadAll(true)}>{t.refreshQuotes}</button>
        <button className="button primary" onClick={() => setFlowOpen(true)}>{t.capitalFlows}</button>
        <Link href="/future-seasonality" className="button">{t.futureSeasonality}</Link>
        <button
          className="button primary"
          disabled={!filtered.length || scanProgress?.done < scanProgress?.total}
          onClick={scanVisible}
        >
          {t.analyzeFiltered}
        </button>
      </div>

      <div className="hint">{t.hint}</div>
      <div className="status">{error ? <span className="error">{t.statusError}: {error}</span> : statusText}</div>
      {total > 0 && (
        <div className="progress">
          <div style={{ width: `${Math.min(100, (loaded / total) * 100)}%` }} />
        </div>
      )}

      <div className="tableHint">{t.scrollHint}</div>
      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              {Object.entries(t.columns).map(([key, label]) => (
                <Th key={key} onClick={() => doSort(key)}>
                  <ColumnHeader
                    label={label}
                    keyName={key}
                    activeKey={sort.key}
                    dir={sort.dir}
                    helpText={t.columnHelp[key]}
                    isOpen={openHeaderKey === key}
                    onToggle={() => setOpenHeaderKey((prev) => (prev === key ? null : key))}
                  />
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((x) => {
              const season = seasonCache[x.ticker];
              const activeWindow = (season?.seasonalWindows || []).find((w) => (w.minSuccessRate ?? 0) >= minSuccess) || null;
              const trendLabel = localizedTrendLabel(x.trend || "-", t);
              const rsi = x.rsi14 == null ? "-" : fmt(x.rsi14, 0);
              const score = x.score ?? 0;
              const seasonLabel = activeWindow ? (score >= 80 ? `🟢 ${t.aligned}` : `🟡 ${t.watch}`) : "-";

              return (
                <tr key={x.ticker}>
                  <td className="tickerCell">
                    <button className="tickerButton" onClick={() => { void getSeasonality(x.ticker, true); }}>
                      {x.ticker}
                    </button>
                  </td>
                  <td className="name">{x.name || "-"}</td>
                  <td className="category">{(x.categories || []).join(", ")}</td>
                  <td className={`trendBadge ${trendTone(trendLabel)}`} title={tooltip(t.tooltip.trend, t.tooltipBody.trend)}>{trendLabel}</td>
                  <td className={rsi === "-" ? "muted" : x.rsi14 > 70 ? "positive" : x.rsi14 < 35 ? "negative" : "muted"} title={tooltip(t.tooltip.rsi14, t.tooltipBody.rsi14)}>{rsi}</td>
                  <td title={tooltip(t.tooltip.positive, t.tooltipBody.positive)}>{x.positive10 != null ? `${x.positive10}/10` : "-"}</td>
                  <td title={tooltip(t.tooltip.positive, t.tooltipBody.positive)}>{x.positive20 != null ? `${x.positive20}/20` : "-"}</td>
                  <td title={tooltip(t.tooltip.streak, t.tooltipBody.streak)}>{x.streak != null ? `${x.streak}/20` : "-"}</td>
                  <td className={cls(x.distanceSma20)} title={tooltip(t.tooltip.distSma20, t.tooltipBody.distSma20)}>{x.distanceSma20 == null ? "-" : `${fmt(x.distanceSma20, 1)}%`}</td>
                  <td title={tooltip(t.tooltip.rvol, t.tooltipBody.rvol)}>{x.relativeVolume == null ? "-" : `${fmt(x.relativeVolume, 1)}x`}</td>
                  <td title={tooltip(t.tooltip.vol20d, t.tooltipBody.vol20d)}>{x.volatility20d == null ? "-" : fmt(x.volatility20d, 1)}</td>
                  <td className={cls(x.distance52wHigh)} title={tooltip(t.tooltip.high52, t.tooltipBody.high52)}>{x.distance52wHigh == null ? "-" : `${fmt(x.distance52wHigh, 1)}%`}</td>
                  <td className={cls(x.maxDrawdown52w)} title={tooltip(t.tooltip.maxDd, t.tooltipBody.maxDd)}>{x.maxDrawdown52w == null ? "-" : `${fmt(x.maxDrawdown52w, 1)}%`}</td>
                  <td className="mutedCell" title={tooltip(t.tooltip.aum, t.tooltipBody.aum)}>{x.netAssets == null ? "-" : formatAum(x.netAssets)}</td>
                  <td className={`scoreBadge ${scoreTone(score)}`} title={tooltip(t.tooltip.score, t.tooltipBody.score)}>{score}</td>
                  <td className={cls(x.dailyReturn)} title={tooltip(t.tooltip.d1, t.tooltipBody.d1)}>{pct(x.dailyReturn)}</td>
                  <td className={cls(x.threeDayReturn)} title={tooltip(t.tooltip.d3, t.tooltipBody.d3)}>{pct(x.threeDayReturn)}</td>
                  <td className={cls(x.weekReturn)} title={tooltip(t.tooltip.w1, t.tooltipBody.w1)}>{pct(x.weekReturn)}</td>
                  <td className={cls(x.monthReturn)} title={tooltip(t.tooltip.m1, t.tooltipBody.m1)}>{pct(x.monthReturn)}</td>
                  <td title={tooltip(t.tooltip.seasonality, t.tooltipBody.seasonality)}>
                    <div className="seasonalityCell">
                      <span className="seasonMarker">{seasonLabel}</span>
                      <button type="button" className="button small detailButton" onClick={() => { void getSeasonality(x.ticker, true); }}>
                        {t.detail}
                      </button>
                    </div>
                  </td>
                  <td>{x.exchange || "-"}</td>
                </tr>
              );
            })}

            {!filtered.length && !loading && (
              <tr>
                <td colSpan="20" className="loadingBox">{t.noResults}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {flowOpen && (
        <div className="modalBackdrop" onMouseDown={() => setFlowOpen(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div>
                <h2>{t.flowTitle}</h2>
                <div className="hint">{t.flowHint}</div>
              </div>
              <button className="button" onClick={() => setFlowOpen(false)}>{t.modalClose}</button>
            </div>
            <div className="flowGrid">
              <div className="flowPanel">
                <h3>{t.flowIn} (Top {CAPITAL_FLOW_LIMIT})</h3>
                {capitalFlow.inflow.length ? (
                  capitalFlow.inflow.map((item) => (
                    <div key={item.ticker} className="flowRow">
                      <span><strong>{item.ticker}</strong> · {item.name}</span>
                      <strong className="positive">{pct(item.value)}</strong>
                    </div>
                  ))
                ) : (
                  <div className="muted">{t.noData}</div>
                )}
              </div>
              <div className="flowPanel">
                <h3>{t.flowOut} (Top {CAPITAL_FLOW_LIMIT})</h3>
                {capitalFlow.outflow.length ? (
                  capitalFlow.outflow.map((item) => (
                    <div key={item.ticker} className="flowRow">
                      <span><strong>{item.ticker}</strong> · {item.name}</span>
                      <strong className="negative">{pct(item.value)}</strong>
                    </div>
                  ))
                ) : (
                  <div className="muted">{t.noData}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {(modalLoading || modal) && (
        <SeasonModal
          data={modal}
          loading={modalLoading}
          minSuccess={minSuccess}
          lang={lang}
          onClose={() => {
            setModal(null);
            setModalLoading(false);
          }}
        />
      )}

      {guideOpen && <GuideModal guide={t.guide} onClose={() => setGuideOpen(false)} />}

      <footer className="legalFooter">
        <h3>{t.legalTitle}</h3>
        <p>{t.legalBody}</p>
        <p>{t.legalBody2}</p>
      </footer>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function CategoryMultiSelect({ options, selected, onChange, placeholder, clearLabel, selectedCount }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocMouseDown(event) {
      if (!ref.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  function toggle(value) {
    onChange(selected.includes(value) ? selected.filter((x) => x !== value) : [...selected, value]);
  }

  return (
    <div className="multiSelect" ref={ref}>
      <button type="button" className="multiTrigger" onClick={() => setOpen((v) => !v)}>
        <span>{selected.length ? selectedCount(selected.length) : placeholder}</span>
        <span className={`chevron ${open ? "open" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="multiMenu">
          <div className="multiOptions">
            {options.map((item) => (
              <label key={item} className="multiOption">
                <input type="checkbox" checked={selected.includes(item)} onChange={() => toggle(item)} />
                <span>{item}</span>
              </label>
            ))}
          </div>
          <button type="button" className="button small ghost" onClick={() => onChange([])}>
            {clearLabel}
          </button>
        </div>
      )}

      {!!selected.length && (
        <div className="chipRow">
          {selected.map((item) => (
            <button key={item} type="button" className="chip" onClick={() => toggle(item)}>
              {item} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ColumnHeader({ label, keyName, activeKey, dir, helpText, isOpen, onToggle }) {
  const isActive = activeKey === keyName;
  const sortChar = isActive ? (dir > 0 ? "▲" : "▼") : "↕";

  return (
    <span className="columnHead">
      <button
        type="button"
        className="columnLabel"
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        {label}
        <span className={`sortArrow ${isActive ? "active" : ""}`}>{sortChar}</span>
      </button>
      {isOpen && <span className="headerTooltip" role="tooltip">{helpText || label}</span>}
    </span>
  );
}

function Th({ children, onClick }) {
  return <th onClick={onClick}>{children}</th>;
}

function GuideModal({ guide, onClose }) {
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal guideModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <div>
            <h2>{guide.title}</h2>
            <div className="hint">{guide.intro}</div>
          </div>
          <button className="button" onClick={onClose}>{guide.close}</button>
        </div>
        <div className="guideBody">
          {guide.sections.map((section, i) => (
            <section key={`${section.title}-${i}`} className="guideSection">
              <h3>{section.title}</h3>
              <ul>
                {section.items.map((item, idx) => (
                  <li key={`${section.title}-${idx}`}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function SeasonModal({ data, loading, onClose, minSuccess, lang }) {
  const [tab, setTab] = useState("windows");
  const t = I18N[lang].season;

  if (loading) {
    return (
      <div className="modalBackdrop" onMouseDown={onClose}>
        <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
          <div className="loadingBox">{t.loading}</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const windows = data.windows || [10, 15, 20];
  const intersection = (data.intersections || []).filter((x) => (x.minSuccessRate ?? 0) >= minSuccess);
  const seasonalWindows = (data.seasonalWindows || []).filter((x) => (x.minSuccessRate ?? 0) >= minSuccess);

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <div>
            <h2>{data.ticker} — {data.name || t.titleFallback}</h2>
            <div className="hint">
              {t.intro} {data.availableYears || 0} {t.years}. {t.dateFormat}
            </div>
          </div>
          <button className="button" onClick={onClose}>{t.close}</button>
        </div>

        {data.error ? (
          <div className="error">{data.error}</div>
        ) : (
          <>
            <div className="cards">
              {windows.map((w) => (
                <div className="card" key={w}>
                  <div className="cardTitle">{t.cardTitle(formatDateKey(data.todayKey), w)}</div>
                  <div className={`cardValue ${cls(data.currentDay?.[w]?.avg)}`}>{pct(data.currentDay?.[w]?.avg)}</div>
                  <div className="muted">
                    {t.successRate} {data.currentDay?.[w]?.successRate?.toFixed(1) ?? "-"}% · {data.currentDay?.[w]?.samples || 0} {t.samples}
                  </div>
                </div>
              ))}
            </div>

            <div className="tabs">
              <button className={`tab ${tab === "windows" ? "active" : ""}`} onClick={() => setTab("windows")}>{t.tabWindows}</button>
              <button className={`tab ${tab === "intersection" ? "active" : ""}`} onClick={() => setTab("intersection")}>{t.tabIntersection}</button>
              <button className={`tab ${tab === "daily" ? "active" : ""}`} onClick={() => setTab("daily")}>{t.tabDaily}</button>
              <button className={`tab ${tab === "monthly" ? "active" : ""}`} onClick={() => setTab("monthly")}>{t.tabMonthly}</button>
            </div>

            {tab === "windows" && <SeasonWindowTable rows={seasonalWindows} windows={windows} minSuccess={minSuccess} lang={lang} />}
            {tab === "intersection" && (
              <>
                <h3 className="sectionTitle">{t.positiveIntersection} · {t.minSuccess} {minSuccess}%</h3>
                <div className="hint">{t.intersectionHint}</div>
                <IntersectionTable rows={intersection} windows={windows} lang={lang} />
              </>
            )}
            {tab === "daily" && <DailyTables data={data} windows={windows} lang={lang} />}
            {tab === "monthly" && <MonthlyTables data={data} windows={windows} lang={lang} />}
          </>
        )}
      </div>
    </div>
  );
}

function SeasonWindowTable({ rows, windows, minSuccess, lang }) {
  const t = I18N[lang].season;
  return (
    <>
      <h3 className="sectionTitle">{t.activeWindows} · {t.minSuccess} {minSuccess}%</h3>
      <div className="hint">{t.windowsHint}</div>
      <div className="tableWrap" style={{ maxHeight: "55vh" }}>
        <table className="miniTable">
          <thead>
            <tr>
              <th>{t.window}</th>
              <th>{t.duration}</th>
              {windows.flatMap((w) => [
                <th key={`wa${w}`}>{t.average} {w}a</th>,
                <th key={`ws${w}`}>{t.successRate} {w}a</th>,
                <th key={`wn${w}`}>{t.count} {w}a</th>,
              ])}
              <th>{t.minSuccessCol}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.startKey}-${r.endKey}-${i}`}>
                <td className="ticker nowrap">{t.from} {formatDateKey(r.startKey)} {t.to} {formatDateKey(r.endKey)}</td>
                <td>{r.durationDays} {t.dayLabel}</td>
                {windows.flatMap((w) => [
                  <td key={`wa${w}-${i}`} className={cls(r.byWindow?.[w]?.avg)}>{pct(r.byWindow?.[w]?.avg)}</td>,
                  <td key={`ws${w}-${i}`}>{r.byWindow?.[w]?.successRate?.toFixed(1) ?? "-"}%</td>,
                  <td key={`wn${w}-${i}`}>{r.byWindow?.[w]?.samples || 0}</td>,
                ])}
                <td><strong>{r.minSuccessRate?.toFixed(1) ?? "-"}%</strong></td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={windows.length * 3 + 3} className="loadingBox">{t.noWindow}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function IntersectionTable({ rows, windows, lang }) {
  const t = I18N[lang].season;
  return (
    <div className="tableWrap" style={{ maxHeight: "55vh" }}>
      <table className="miniTable">
        <thead>
          <tr>
            <th>{t.dayDate}</th>
            {windows.flatMap((w) => [
              <th key={`a${w}`}>{t.average} {w}a</th>,
              <th key={`s${w}`}>{t.successRate} {w}a</th>,
              <th key={`n${w}`}>{t.count} {w}a</th>,
            ])}
            <th>{t.minSuccessCol}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.dateKey}>
              <td className="ticker nowrap">{formatDateKey(r.dateKey)}</td>
              {windows.flatMap((w) => [
                <td key={`a${w}-${r.dateKey}`} className={cls(r.byWindow[w]?.avg)}>{pct(r.byWindow[w]?.avg)}</td>,
                <td key={`s${w}-${r.dateKey}`}>{r.byWindow[w]?.successRate?.toFixed(1) ?? "-"}%</td>,
                <td key={`n${w}-${r.dateKey}`}>{r.byWindow[w]?.samples || 0}</td>,
              ])}
              <td><strong>{r.minSuccessRate?.toFixed(1) ?? "-"}%</strong></td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={windows.length * 3 + 2} className="loadingBox">{t.noDay}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DailyTables({ data, windows, lang }) {
  const [window, setWindow] = useState(Math.max(...windows));
  const t = I18N[lang].season;
  const rows = Object.entries(data.daily?.[window] || {}).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <>
      <div className="actions">
        {windows.map((w) => (
          <button key={w} className={`tab ${window === w ? "active" : ""}`} onClick={() => setWindow(w)}>
            {w} {t.yearsLabel}
          </button>
        ))}
      </div>
      <div className="tableWrap" style={{ maxHeight: "55vh" }}>
        <table className="miniTable">
          <thead>
            <tr>
              <th>{t.dayDate}</th>
              <th>{t.average}</th>
              <th>{t.median}</th>
              <th>{t.successRate}</th>
              <th>{t.samples}</th>
              <th>{t.best}</th>
              <th>{t.worst}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, s]) => (
              <tr key={key}>
                <td className="ticker">{formatDateKey(key)}</td>
                <td className={cls(s.avg)}>{pct(s.avg)}</td>
                <td className={cls(s.median)}>{pct(s.median)}</td>
                <td>{s.successRate?.toFixed(1) ?? "-"}%</td>
                <td>{s.samples}</td>
                <td className={cls(s.best)}>{pct(s.best)}</td>
                <td className={cls(s.worst)}>{pct(s.worst)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MonthlyTables({ data, windows, lang }) {
  const t = I18N[lang].season;
  return (
    <div className="grid2">
      {windows.map((w) => (
        <div key={w}>
          <h3>{w} {t.yearsLabel}</h3>
          <div className="tableWrap" style={{ maxHeight: "52vh" }}>
            <table className="miniTable">
              <thead>
                <tr>
                  <th>{t.month}</th>
                  <th>{t.average}</th>
                  <th>{t.successRate}</th>
                  <th>{t.count}</th>
                </tr>
              </thead>
              <tbody>
                {(data.monthly?.[w] || []).map((m) => (
                  <tr key={m.month}>
                    <td>{t.months[m.month - 1]}</td>
                    <td className={cls(m.avg)}>{pct(m.avg)}</td>
                    <td>{m.successRate?.toFixed(1) ?? "-"}%</td>
                    <td>{m.samples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function scoreTone(value) {
  if (value == null) return "neutral";
  if (value >= 85) return "excellent";
  if (value >= 70) return "good";
  if (value >= 55) return "watch";
  return "weak";
}
