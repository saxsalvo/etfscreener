"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { mergeVisibleColumns } from "../lib/visible-columns.js";
import { computeProfileStatus, CUSTOM_METRICS, normalizeProfile, PROFILE_METRICS } from "../lib/investment-status.js";

const PAGE_SIZE = 25;
const CAPITAL_FLOW_LIMIT = 10;
const FLOW_PERIODS = [
  { key: "dailyReturn", label: "1G" },
  { key: "threeDayReturn", label: "3G" },
  { key: "weekReturn", label: "1S" },
  { key: "monthReturn", label: "1M" },
];
const COOKIE_VISIBLE_COLUMNS = "visible_etf_columns";
const COOKIE_SORT = "etf_sort";
const COOKIE_CONSENT_KEY = "cookie_consent_choice";
const COOKIE_WATCHLIST = "etf_watchlist";
const COOKIE_INVESTMENT_PROFILE = "etf_investment_profile";
const COOKIE_TOUR_COMPLETED = "etf_tour_completed";
const COOKIE_COLUMN_FILTERS = "etf_column_filters";
const SIMULATIONS_STORAGE_KEY = "etf_simulations";

const ALL_COLUMN_KEYS = [
  "ticker",
  "name",
  "category",
  "status",
  "score",
  "price",
  "dailyReturn",
  "threeDayReturn",
  "weekReturn",
  "monthReturn",
  "year1Return",
  "year3Return",
  "year5Return",
  "year10Return",
  "trend",
  "rsi14",
  "positive10",
  "positive20",
  "streak",
  "distanceSma20",
  "distanceSma200",
  "smaCross",
  "rvol",
  "volatility20d",
  "drawdownFromAth",
  "range52wPosition",
  "distance52wHigh",
  "maxDrawdown52w",
  "netAssets",
  "seasonality",
  "borsa",
];

const DEFAULT_VISIBLE_COLUMNS = [
  "ticker",
  "name",
  "category",
  "trend",
  "status",
  "score",
  "price",
  "dailyReturn",
  "threeDayReturn",
  "weekReturn",
  "rsi14",
  "positive20",
  "streak",
  "distanceSma20",
  "rvol",
  "volatility20d",
  "seasonality",
  "borsa",
];

const COLUMN_WIDTHS = {
  ticker: "108px",
  name: "250px",
  category: "160px",
  trend: "82px",
  status: "128px",
  score: "66px",
  price: "108px",
  dailyReturn: "88px",
  threeDayReturn: "88px",
  weekReturn: "88px",
  monthReturn: "88px",
  year1Return: "92px",
  year3Return: "92px",
  year5Return: "92px",
  year10Return: "92px",
  rsi14: "84px",
  positive10: "96px",
  positive20: "96px",
  streak: "96px",
  distanceSma20: "102px",
  distanceSma200: "108px",
  smaCross: "128px",
  rvol: "86px",
  volatility20d: "90px",
  drawdownFromAth: "112px",
  range52wPosition: "118px",
  distance52wHigh: "96px",
  maxDrawdown52w: "112px",
  netAssets: "96px",
  seasonality: "150px",
  borsa: "120px",
};

const I18N = {
  it: {
    pageTitle: "ETF Performance Screener",
    pageSubtitle: "Momentum, trend, volume, rischio e stagionalità in una sola vista",
    langItalian: "Italiano",
    langEnglish: "Inglese",
    guideButton: "Guida",
    chartLinkTitle: "Apri grafico TradingView",
    cookieTitle: "Preferenze cookie",
    cookieBody: "Usiamo cookie tecnici solo per salvare colonne visibili e ordinamento. Questo avviso viene mostrato solo la prima volta.",
    cookieAccept: "Accetta cookie tecnici",
    cookieReject: "Continua senza cookie",
    selectColumnsButton: "Seleziona colonne",
    columnsTitle: "Colonne visibili",
    columnsHint: "Seleziona le colonne da mostrare in tabella. Le preferenze vengono salvate automaticamente.",
    presetEssential: "Preset essenziale",
    presetAll: "Mostra tutte",
    closeColumns: "Chiudi selettore",
    showFilters: "Mostra filtri",
    hideFilters: "Nascondi filtri",
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
    filterButtonLabel: "Filtra colonna",
    filterMin: "Min",
    filterMax: "Max",
    filterClear: "Rimuovi filtro",
    filterSearchPlaceholder: "Cerca valore...",
    filterNoOptions: "Nessun valore",
    refreshQuotes: "Aggiorna quotazioni",
    capitalFlows: "Flussi di capitale",
    simulations: "Simulazioni",
    buy: "Buy",
    buyTitle: "Aggiungi simulazione",
    buyQuantity: "Quantita",
    buyPrice: "Prezzo di acquisto",
    buyConfirm: "Registra acquisto",
    simulationsTitle: "Simulazioni acquisto",
    simulationsHint: "Le metriche di acquisto sono congelate; il rendimento usa l'ultima quotazione disponibile.",
    simulationDate: "Data acquisto",
    currentPrice: "Prezzo attuale",
    investment: "Investito",
    currentValue: "Valore attuale",
    returnSinceBuy: "Rendimento",
    frozenMetrics: "Metriche all'acquisto",
    removeSimulation: "Rimuovi simulazione",
    futureSeasonality: "Stagionalità future",
    analyzeFiltered: "Analizza stagionalità ETF filtrati",
    hint: "Questo screener combina momentum, trend, volume, rischio e stagionalità. I tooltip aiutano a interpretare velocemente la lettura.",
    scrollHint: "Suggerimento: scorri orizzontalmente per vedere tutte le colonne.",
    statusLoading: "caricamento in corso...",
    statusSeasonality: (done, total) => `stagionalità ${done}/${total}`,
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
    dataSourceNote: "Dati di mercato forniti da Yahoo Finance.",
    guide: {
      title: "Guida applicazione",
      intro:
        "Questa applicazione e uno screener ETF dinamico: raccoglie dati di mercato, li normalizza e li trasforma in metriche utili per confrontare forza, rischio e stagionalità.",
      sections: [
        {
          title: "Come funziona in sintesi",
          items: [
            "Il backend scarica quotazioni e storico dai provider, poi calcola indicatori come RSI, trend, drawdown e rendimenti multi-orizzonte.",
            "La tabella principale mostra ogni ETF come una riga comparabile, ordinabile e filtrabile.",
            "I pulsanti azione aprono modali di approfondimento (flussi e stagionalità) e la pagina dedicata alle stagionalità future.",
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
            "stagionalità future: apre la pagina secondaria con focus su finestre stagionali favorevoli future o attive.",
            "Analizza stagionalità ETF filtrati: pre-carica in cache i dettagli stagionali degli ETF attualmente visibili.",
          ],
        },
        {
          title: "Lettura tabella e colonne",
          items: [
            "Le intestazioni sono ordinabili; clicca il titolo colonna per invertire ascendente/discendente.",
            "Trend, RSI, Positivi, Streak, RVOL e Volatilita aiutano a capire momentum e rischio nel breve.",
            "52W High, Drawdown massimo 52W, Drawdown da ATH e Posizione 52W misurano distanza dai massimi, severita delle fasi di ribasso e posizione nel canale annuale.",
            "Dist SMA200 e Cross SMA50/200 completano la lettura strutturale di lungo periodo; l'asterisco sul cross segnala un cambio nelle ultime 5 sedute.",
            "Score sintetizza piu segnali in un unico valore 0-100.",
            "Status traduce le metriche del profilo Long term, Short term o Custom in Strong Buy/Buy/Hold/Sell; scegli il profilo da Impostazioni e clicca il badge per l'analisi completa.",
            "Seasonality segnala allineamento tra fase tecnica attuale e finestre storicamente favorevoli.",
          ],
        },
        {
          title: "Metriche principali: spiegazione pratica dettagliata",
          items: [
            "Ticker: identificativo breve del fondo. Esempio pratico: VOO, IVV e SPY replicano S&P 500 ma hanno emittenti, liquidita e TER diversi; il ticker evita errori di esecuzione quando imposti ordini rapidi.",
            "Nome ETF: descrive provider, indice e struttura. Esempio pratico: due prodotti con 'Nasdaq 100' nel nome possono differire per domicilio, replica fisica/sintetica e valuta di quotazione; il nome completo chiarisce cosa stai realmente comprando.",
            "Categoria: cluster per strategia/asset class. Esempio pratico: se vuoi ridurre rischio, escludi leveragedInverse e concentri la scansione su broadMarketUS e bonds, abbassando la varianza media del paniere.",
            "Trend: regola reale basata su 3 medie mobili. Forte se Prezzo > SMA20 > SMA50 > SMA200; Debole se il prezzo e sotto sia SMA20 sia SMA50 e SMA20 e sotto SMA50; altrimenti Neutro. Esempio: Prezzo 104, SMA20 100, SMA50 98, SMA200 90 => Forte. Con SMA200 a 105 la stessa situazione diventerebbe Neutro: per questo ETF volatili o in recupero (es. materie prime/minerari) restano spesso 'Neutro' anche con momentum recente positivo.",
            "RSI 14: formula RSI = 100 - (100 / (1 + RS)), con RS = media guadagni 14g / media perdite 14g. Esempio numerico: gain medio 1.4, loss medio 0.7 => RS=2 => RSI=66.67; valore alto segnala spinta, ma anche probabilita di consolidamento.",
            "Positivi 10G: formula Pos10 = somma indicatori [Close_t > Close_{t-1}] su 10 giorni. Esempio: 8/10 significa che l'80% delle ultime sedute e stato positivo, quindi il movimento ha continuita nel brevissimo.",
            "Positivi 20G: stessa formula su 20 giorni. Esempio: 14/20 (70%) conferma un bias rialzista piu robusto rispetto a un picco isolato su 10 giorni.",
            "Streak 20G: consecutivita delle chiusure positive recenti. Esempio: sequenza + + + - + + produce streak corrente 2 e massimo recente 3; una streak in espansione puo indicare accelerazione in corso.",
            "Dist SMA20: formula Dist% = ((Prezzo / SMA20) - 1) * 100. Esempio: Prezzo 105 e SMA20 100 => +5%; a +12/+15% il prezzo puo essere esteso e statisticamente piu esposto a pullback verso media.",
            "RVOL: formula RVOL = Volume oggi / media Volume 20g. Esempio: 3.0M contro media 1.5M => 2.0x; un breakout con RVOL > 1.8x e in genere piu credibile di uno con RVOL 0.7x.",
            "Vol 20D: formula Vol ann. = stdev(rendimenti giornalieri 20g) * sqrt(252) * 100. Esempio: stdev 0.9% => vol ~14.3%; stdev 2.2% => vol ~34.9%. Serve per confrontare rendimento atteso e rischio.",
            "52W High: formula Dist52W% = ((Prezzo / Max_52w) - 1) * 100. Esempio: da massimo 100 a prezzo 97 => -3%; da 100 a 72 => -28%. Distanze piccole spesso indicano leadership relativa.",
            "Max DD 52W: formula DD_t = ((Prezzo_t / picco_precedente_t) - 1) * 100, Max DD = minimo DD_t a 52 settimane. Esempio: picco 120, minimo successivo 90 => -25%. Misura la severita storica delle fasi di stress.",
            "AUM: capitale complessivo gestito (quote * NAV). Esempio: ETF da 20B tende ad avere book piu profondo e spread piu stretti rispetto a ETF da 70M, con impatto pratico su slippage e costi impliciti.",
            "Score: punteggio additivo 0-100 (poi troncato a 100): +12 Prezzo>SMA20, +10 SMA20>SMA50, +10 SMA50>SMA200, fino a +20 da RSI14, fino a +18 da Positivi20, fino a +10 da RVOL, fino a +10 da Volatilita20D (piu bassa e meglio), fino a +10 da Distanza SMA20 (penalizzata sia sopra sia sotto), fino a +5 di qualita (AUM/TER/eta). La stagionalità NON e inclusa nello Score. Esempio: SMA allineate (+32), RSI 55 (+15.4), Positivi20 14/20 (+12.6), RVOL 1.2 (+4.8), Vol20D 22% (+2.1), Dist.SMA20 6% (+6), Qualita 3 => totale ~76.",
            "Status: giudizio Strong Buy/Buy/Hold/Sell calcolato sommando un voto pesato per ciascuna metrica (trend, RSI14, Positivi20, Dist SMA20, RVOL, Vol20D, 52W High, Max DD 52W, rendimento 1M, qualita del fondo); il totale determina l'etichetta e ogni voto diventa una motivazione leggibile nel dialog di dettaglio.",
            "1D: formula R_1D% = ((Close_t / Close_{t-1}) - 1) * 100. Esempio: 102 vs 100 => +2.00%. Utile per catturare shock giornalieri, ma da leggere con RVOL per evitare falsi segnali.",
            "3D: formula R_3D% = ((Close_t / Close_{t-3}) - 1) * 100. Esempio: 103.5 vs 100 => +3.50%. Riduce il rumore di una singola candela.",
            "1W: formula R_1W% = ((Close_t / Close_{t-5}) - 1) * 100. Esempio: 106 vs 100 => +6.00%. Se accompagnato da vol stabile, il segnale e generalmente piu sano.",
            "1M: formula R_1M% = ((Close_t / Close_{t-21}) - 1) * 100 circa. Esempio: 109 vs 100 => +9.00%. Questa metrica alimenta direttamente la classifica Flussi di capitale.",
            "1Y: formula R_1Y% = ((Close_t / Close_{t-252}) - 1) * 100 circa. Esempio: 128 vs 100 => +28%. Mostra la qualita del trend annuale oltre il rumore tattico.",
            "3Y: formula R_3Y% = ((Close_t / Close_{t-756}) - 1) * 100 circa. Esempio: 160 vs 100 => +60% cumulato. Aiuta a distinguere forza strutturale da fasi brevi favorevoli.",
            "5Y: formula R_5Y% = ((Close_t / Close_{t-1260}) - 1) * 100 circa. Esempio: 210 vs 100 => +110% cumulato. Utile per confrontare resilienza in cicli di mercato completi.",
            "10Y: formula R_10Y% = ((Close_t / Close_{t-2520}) - 1) * 100 circa. Esempio: 330 vs 100 => +230% cumulato. Misura la capacita del tema/indice di creare valore nel lungo periodo.",
            "Seasonality: criterio di allineamento = data corrente dentro finestra con media > 0 e success rate >= soglia (es. 60%) su 10/15/20 anni. Esempio: 11 anni positivi su 15 => 73.3%; se anche trend e score sono forti, il contesto operativo migliora.",
            "Borsa (Exchange): sede di quotazione. Esempio pratico: conoscere NYSE, NASDAQ o Borsa Italiana aiuta a gestire orari di apertura, spread in pre-market e conversione valutaria.",
          ],
        },
        {
          title: "Dettaglio stagionalità (modal)",
          items: [
            "Si apre cliccando il ticker o il pulsante Dettaglio nella colonna Seasonality.",
            "Finestre stagionali: confronta rendimento medio e success rate su 10/15/20 anni.",
            "Giorni comuni 10/15/20: mostra solo date con comportamento positivo consistente nelle tre profondita storiche.",
            "Tutti i giorni: tabella completa giornaliera con media, mediana, migliore/peggiore seduta e campioni, separati anche in Bull/Bear.",
            "Mesi: vista aggregata mensile con campioni Bull/Bear, basati su SPY sopra/sotto SMA200 alla data dell'osservazione.",
          ],
        },
        {
          title: "Flussi di capitale",
          items: [
            "Il pannello mostra una proxy di rotazione, non flussi netti certificati: Yahoo Finance non fornisce trasferimenti reali tra ETF.",
            "Entrate/Forza e Uscite/Debolezza riportano rendimento, RVOL e date della finestra di circa un mese; le Rotazioni candidate sono confronti, non operazioni osservate.",
            "Asset piu richiesti classifica le categorie per rendimento medio 1M, RVOL medio, score medio e numero di ETF, per stimare dove si concentra l'attenzione relativa.",
          ],
        },
        {
          title: "Pagina secondaria: stagionalità future",
          items: [
            "Classifica ETF con finestre stagionali promettenti e success rate elevato.",
            "Apri dettaglio per ogni ticker per rivedere le stesse analisi avanzate disponibili nella home.",
            "Utile per costruire watchlist orientate al timing storico, da integrare sempre con trend e rischio correnti.",
          ],
        },
      ],
      metricsButton: "Dettaglio metriche",
      metricsIntro: "Seleziona una metrica per vedere formula, perche si usa ed un esempio pratico dettagliato.",
      backToGuide: "Torna alla guida",
      backToMetrics: "Torna all'elenco metriche",
      metricFormulaLabel: "Formula:",
      metricPurposeLabel: "Perche si usa:",
      metricExampleLabel: "Esempio pratico:",
      close: "Chiudi",
    },
    trendStrong: "Forte",
    trendNeutral: "Neutro",
    trendWeak: "Debole",
    statusLabels: {
      strong_buy: "Strong Buy",
      buy: "Buy",
      hold: "Hold",
      sell: "Sell",
    },
    statusModalHint: "Analisi metrica per metrica alla base del giudizio.",
    statusPointsLabel: "Punteggio segnali",
    columns: {
      ticker: "Ticker",
      name: "Nome ETF",
      category: "Categoria",
      trend: "Trend",
      status: "Status",
      rsi14: "RSI 14",
      positive10: "Positivi 10G",
      positive20: "Positivi 20G",
      streak: "Streak 20G",
      distanceSma20: "Dist SMA20",
      distanceSma200: "Dist SMA200",
      smaCross: "Cross SMA50/200",
      rvol: "RVOL",
      volatility20d: "Vol 20D",
      drawdownFromAth: "DD da ATH",
      range52wPosition: "Posizione 52W",
      distance52wHigh: "52W High",
      maxDrawdown52w: "Max DD 52W",
      netAssets: "AUM",
      score: "Score",
      price: "Prezzo",
      dailyReturn: "1D",
      threeDayReturn: "3D",
      weekReturn: "1W",
      monthReturn: "1M",
      year1Return: "1Y",
      year3Return: "3Y",
      year5Return: "5Y",
      year10Return: "10Y",
      seasonality: "Seasonality",
      borsa: "Borsa",
    },
    columnHelp: {
      ticker: "Simbolo dell'ETF per identificarlo rapidamente.",
      name: "Nome completo del fondo quotato.",
      category: "Categoria del fondo per area o strategia.",
      trend: "Stato del trend rispetto alle medie mobili.",
      status: "Giudizio Strong Buy/Buy/Hold/Sell basato su tutte le metriche; clicca per il dettaglio.",
      rsi14: "Forza relativa su 14 periodi.",
      positive10: "Giorni positivi nelle ultime 10 sedute.",
      positive20: "Giorni positivi nelle ultime 20 sedute.",
      streak: "Consecutivita dei giorni positivi recenti.",
      distanceSma20: "Distanza percentuale dal prezzo medio a 20 giorni.",
      distanceSma200: "Distanza percentuale del prezzo dalla SMA a 200 sedute.",
      smaCross: "Regime e ultimo incrocio tra SMA50 e SMA200; * indica un segnale nelle ultime 5 sedute.",
      rvol: "Volume relativo contro media 20 giorni.",
      volatility20d: "Volatilita annualizzata su base 20 giorni.",
      drawdownFromAth: "Drawdown corrente rispetto al massimo storico disponibile.",
      range52wPosition: "Posizione del prezzo tra minimo e massimo delle ultime 52 settimane.",
      distance52wHigh: "Distanza dal massimo annuale.",
      maxDrawdown52w: "Massima discesa registrata nell'ultimo anno.",
      netAssets: "Asset under management del fondo.",
      score: "Punteggio sintetico 0-100.",
      price: "Ultimo prezzo di chiusura disponibile sul mercato di quotazione.",
      dailyReturn: "Performance ultimo giorno.",
      threeDayReturn: "Performance ultime 3 sedute.",
      weekReturn: "Performance ultima settimana.",
      monthReturn: "Performance ultimo mese.",
      year1Return: "Rendimento di prezzo negli ultimi 12 mesi.",
      year3Return: "Rendimento di prezzo cumulato negli ultimi 3 anni.",
      year5Return: "Rendimento di prezzo cumulato negli ultimi 5 anni.",
      year10Return: "Rendimento di prezzo cumulato negli ultimi 10 anni.",
      seasonality: "Allineamento con stagionalità favorevole.",
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
      trend:
        "Regola reale: Forte se Prezzo > SMA20 > SMA50 > SMA200 (allineamento rialzista su 3 medie); Debole se Prezzo <= SMA20 e Prezzo <= SMA50 e SMA20 <= SMA50; in tutti gli altri casi Neutro. Esempio: Prezzo 104, SMA20 100, SMA50 98, SMA200 90 => Forte. Se SMA200 fosse 105 la classificazione scenderebbe a Neutro anche con prezzo forte.",
      rsi14:
        "Formula: RSI = 100 - (100 / (1 + RS)), con RS = media guadagni 14g / media perdite 14g. Esempio: media gain 1.2, media loss 0.6 => RS=2 => RSI=66.67.",
      positive:
        "Formula: Positivi N = conteggio[(Close_t - Close_{t-1}) > 0] su N sedute. Esempio: 8 giorni positivi su 10 e 14 su 20 indicano persistenza del rialzo.",
      streak:
        "Formula: streak = massimo k consecutivo recente con (Close_i - Close_{i-1}) > 0. Esempio: ultimi segni + + + - + => streak corrente 1, massimo recente 3.",
      distSma20:
        "Formula: Dist SMA20 % = ((Prezzo / SMA20) - 1) * 100. Esempio: Prezzo 105, SMA20 100 => +5%; Prezzo 94 => -6%.",
      rvol:
        "Formula: RVOL = Volume oggi / media Volume 20g. Esempio: 2.4M / 1.2M = 2.0x (partecipazione elevata); 0.7x indica volume sotto media.",
      vol20d:
        "Formula: Vol 20D ann. = stdev(rendimenti giornalieri 20g) * sqrt(252) * 100. Esempio: stdev 1.1% => 0.011*sqrt(252)=17.46% ann.",
      high52:
        "Formula: Dist 52W High % = ((Prezzo / Max_52w) - 1) * 100. Esempio: Prezzo 98, Max 100 => -2%; Prezzo 75 => -25%.",
      maxDd:
        "Formula: DD_t = ((Prezzo_t / picco_precedente_t) - 1) * 100; Max DD = minimo DD_t su 52 settimane. Esempio: da 120 a 90 => -25%.",
      aum:
        "AUM e il capitale totale gestito dal fondo (somma quote * NAV). Esempio: 25B tende ad avere spread piu stretti rispetto a 80M.",
      score:
        "Formula reale (somma di punteggi parziali, poi troncata a 100): +12 se Prezzo>SMA20; +10 se SMA20>SMA50; +10 se SMA50>SMA200; fino a +20 da RSI14; fino a +18 da Positivi20; fino a +10 da RVOL; fino a +10 da Volatilita20D (piu bassa e meglio); fino a +10 da Distanza SMA20 (penalizzata sia sopra sia sotto la media); fino a +5 di qualita (AUM/TER/eta fondo). La stagionalità NON e inclusa nello Score. Esempio: componenti SMA allineate (+32), RSI 55 (+15.4), Positivi20 14/20 (+12.6), RVOL 1.2 (+4.8), Vol20D 22% (+2.1), Dist.SMA20 6% (+6), Qualita 3 => totale ~76.",
      d1: "Formula: 1D % = ((Close_t / Close_{t-1}) - 1) * 100. Esempio: 102 vs 100 => +2.00%.",
      d3: "Formula: 3D % = ((Close_t / Close_{t-3}) - 1) * 100. Esempio: 103.5 vs 100 => +3.50%.",
      w1: "Formula: 1W % = ((Close_t / Close_{t-5}) - 1) * 100. Esempio: 106 vs 100 => +6.00%.",
      m1: "Formula: 1M % = ((Close_t / Close_{t-21}) - 1) * 100 circa. Esempio: 109 vs 100 => +9.00%.",
      seasonality:
        "Criterio: allineata se la data attuale cade in una finestra con media > 0 e success rate >= soglia (es. 60%) su 10/15/20 anni. Esempio: 11/15 anni positivi => 73.3%.",
    },
    metricDetails: {
      ticker: {
        formula: "Nessuna formula: e il simbolo identificativo assegnato dal mercato di quotazione.",
        purpose: "Serve per identificare senza ambiguita lo strumento da comprare o monitorare, evitando di confondere ETF con nomi o strategie simili.",
        example: "VOO, IVV e SPY replicano tutti l'S&P 500 ma sono emessi da societa diverse (Vanguard, iShares, State Street): il ticker e l'unico modo sicuro per sapere quale stai selezionando.",
      },
      name: {
        formula: "Nessuna formula: e il nome completo del fondo restituito dal provider dati.",
        purpose: "Aiuta a capire provider, indice replicato e struttura del fondo senza dover cercare altrove.",
        example: "'iShares Core S&P 500 UCITS ETF' indica chiaramente indice (S&P 500), emittente (iShares) e wrapper UCITS (Europa).",
      },
      category: {
        formula: "Nessuna formula: categoria assegnata da un catalogo interno che raggruppa i ticker per tema o asset class.",
        purpose: "Permette di filtrare o escludere rapidamente famiglie di ETF con profilo di rischio simile.",
        example: "Escludendo la categoria leveragedInverse rimuovi in un colpo solo tutti gli ETF a leva/inversi, spesso poco adatti a strategie di lungo periodo.",
      },
      trend: {
        formula: "Forte se Prezzo > SMA20 > SMA50 > SMA200 (allineamento rialzista completo su 3 medie). Debole se Prezzo <= SMA20 e Prezzo <= SMA50 e SMA20 <= SMA50. In tutti gli altri casi: Neutro.",
        purpose: "Sintetizza in un'unica etichetta la struttura del trend su tre orizzonti (breve/medio/lungo) invece di dover confrontare a mente tre medie mobili.",
        example: "Prezzo 104, SMA20 100, SMA50 98, SMA200 90: tutte le condizioni sono soddisfatte (104>100>98>90) => Forte. Se SMA200 fosse 105 l'allineamento pieno non c'e piu e l'etichetta scende a Neutro anche con prezzo sopra SMA20: per questo un ETF volatile o in recupero (es. materie prime/minerari) resta spesso 'Neutro' pur avendo momentum recente positivo.",
      },
      rsi14: {
        formula: "RSI = 100 - (100 / (1 + RS)), con RS = media guadagni giornalieri 14g / media perdite giornaliere 14g (media semplice, non esponenziale).",
        purpose: "Misura se il movimento recente e trainato piu da rialzi o ribassi, individuando ipercomprato (oltre 70) o ipervenduto (sotto 35 in questo screener).",
        example: "Media guadagni 1.4, media perdite 0.7 => RS=2 => RSI=66.67: momentum positivo ma non ancora a livelli estremi (100).",
      },
      positive10: {
        formula: "Conteggio dei giorni in cui Close_t > Close_(t-1), su una finestra di 10 sedute.",
        purpose: "Misura la persistenza (non l'intensita) del movimento nel brevissimo periodo.",
        example: "8/10 significa che l'80% delle ultime 10 sedute ha chiuso in rialzo.",
      },
      positive20: {
        formula: "Conteggio dei giorni in cui Close_t > Close_(t-1), su una finestra di 20 sedute.",
        purpose: "Versione estesa di Positivi10, meno sensibile a un singolo picco isolato.",
        example: "14/20 (70%) conferma un bias rialzista piu robusto rispetto a un 8/10 isolato.",
      },
      streak: {
        formula: "Numero di chiusure consecutive positive piu recenti (si ferma al primo giorno negativo o piatto).",
        purpose: "Evidenzia se il movimento e in fase di accelerazione ininterrotta oppure alterna su e giu.",
        example: "Sequenza + + + - + + => streak attuale 2 (le ultime due sedute), anche se nella finestra piu ampia ci sono stati 5 giorni positivi su 6.",
      },
      distanceSma20: {
        formula: "((Prezzo / SMA20) - 1) * 100.",
        purpose: "Misura quanto il prezzo si e allontanato dalla sua media mobile breve: valori molto alti, in positivo o negativo, segnalano un possibile eccesso statistico.",
        example: "Prezzo 105, SMA20 100 => +5% (trend ordinato). Prezzo 130, SMA20 100 => +30% (forte estensione: nello Score questo viene trattato come rischio, non come premio).",
      },
      distanceSma200: {
        formula: "((Prezzo / SMA200) - 1) * 100.",
        purpose: "Misura la distanza dalla tendenza strutturale di lungo periodo. Per ETF azionari globali, un ritracciamento moderato tra -3% e -8% sotto SMA200 puo indicare una finestra accumulativa, ma non e una garanzia.",
        example: "Prezzo 96, SMA200 100 => -4%: prezzo leggermente sotto la media di lungo periodo, da valutare con drawdown, regime SMA50/200 e qualita del fondo.",
      },
      smaCross: {
        formula: "Golden regime se SMA50 > SMA200; Death regime se SMA50 < SMA200. Il cross e il cambio di questa relazione; * indica un cross entro 5 sedute.",
        purpose: "Conferma il regime di lungo periodo e rende visibile quando la relazione tra medie veloci e lente e cambiata di recente.",
        example: "SMA50 102 e SMA200 100 => Golden regime. Se il passaggio e avvenuto tre sedute fa, la colonna mostra Golden * e il dialog Status riporta data e sedute trascorse.",
      },
      rvol: {
        formula: "Volume di oggi / media del volume delle ultime 20 sedute.",
        purpose: "Verifica se un movimento di prezzo e supportato da un aumento reale della partecipazione degli scambi, o avviene con volumi scarsi (meno affidabile).",
        example: "Volume oggi 3.0M contro media 1.5M => RVOL 2.0x: la mossa ha piu peso rispetto a una giornata normale.",
      },
      volatility20d: {
        formula: "Deviazione standard dei rendimenti giornalieri delle ultime 20 sedute, annualizzata moltiplicando per la radice di 252 (giorni di borsa in un anno).",
        purpose: "Quantifica il rischio a breve termine, utile per confrontare ETF con oscillazioni molto diverse (es. bond fund vs ETF su materie prime).",
        example: "Deviazione standard giornaliera 0.9% => volatilita annualizzata ~14.3%. Con deviazione 2.2% (tipica di settori/minerari/leva) sale a ~34.9%: nello Score la volatilita elevata viene penalizzata, anche con rendimento positivo.",
      },
      drawdownFromAth: {
        formula: "((Prezzo corrente / massimo storico disponibile) - 1) * 100.",
        purpose: "Misura la perdita corrente dai massimi storici, distinta dal Max DD 52W che rappresenta la peggior discesa interna all'ultimo anno. Aiuta a definire scaglioni di ingresso durante correzioni profonde.",
        example: "ATH 120 e prezzo 90 => -25%: l'ETF quota il 25% sotto il massimo storico disponibile.",
      },
      range52wPosition: {
        formula: "((Prezzo - minimo 52W) / (massimo 52W - minimo 52W)) * 100.",
        purpose: "Colloca il prezzo nel canale annuale. Valori tra 20% e 40% indicano prossimita ai minimi annuali senza essere necessariamente su nuovi minimi.",
        example: "Minimo 80, massimo 120, prezzo 92 => 30%: l'ETF e nel terzo basso del proprio range a 52 settimane.",
      },
      distance52wHigh: {
        formula: "((Prezzo / Massimo delle ultime 252 sedute) - 1) * 100.",
        purpose: "Mostra quanto l'ETF e vicino o lontano dal proprio massimo annuale: la vicinanza ai massimi e spesso associata a forza relativa.",
        example: "Massimo 100, prezzo 97 => -3% (vicino ai massimi). Massimo 100, prezzo 72 => -28% (ancora lontano, magari in fase di recupero).",
      },
      maxDrawdown52w: {
        formula: "Per ogni giorno si calcola (Prezzo / massimo osservato fino a quel giorno - 1) * 100; il Max Drawdown e il valore piu negativo trovato negli ultimi 252 giorni.",
        purpose: "Misura la peggiore perdita che un investitore avrebbe subito nell'ultimo anno partendo dal punto peggiore, utile per valutare la tenuta richiesta per detenere l'ETF.",
        example: "Da un picco di 120 a un minimo successivo di 90 => drawdown -25%.",
      },
      netAssets: {
        formula: "Nessuna formula: dato fornito dal provider (patrimonio gestito = quote in circolazione * NAV).",
        purpose: "Fondi piu grandi tendono ad avere maggiore liquidita e spread piu stretti, riducendo i costi impliciti di negoziazione.",
        example: "Un ETF da 20B $ generalmente ha uno spread bid/ask piu contenuto rispetto a uno da 70M $.",
      },
      score: {
        formula: "Punteggio additivo 0-100 (poi troncato a 100): +12 se Prezzo>SMA20; +10 se SMA20>SMA50; +10 se SMA50>SMA200; fino a +20 da RSI14 (RSI 35 => 0 punti, RSI>=61 satura a 20); fino a +18 da Positivi20 (20/20 giorni positivi => 18 punti); fino a +10 da RVOL (RVOL>=1.63 satura a 10); fino a +10 da Volatilita20D, in modo inverso (piu bassa e meglio: da 35% in su, 0 punti); fino a +10 da Distanza SMA20, in modo simmetrico (il massimo si ha quando il prezzo e vicino alla SMA20, e cala sia se il prezzo e molto sopra sia se e molto sotto); infine fino a +5 punti di qualita in base a masse gestite, costo (TER) ed eta del fondo.",
        purpose: "Riassume in un unico numero trend tecnico, momentum, rischio e qualita del fondo, per confrontare rapidamente molti ETF senza dover leggere ogni singola colonna.",
        example: "Prezzo>SMA20 (+12), SMA20>SMA50 (+10), SMA50>SMA200 (+10), RSI 55 => +15.4, Positivi20=14/20 => +12.6, RVOL 1.2 => +4.8, Vol20D 22% => +2.1, Dist.SMA20 6% => +6, Qualita 3 => totale ~76. Nota importante: lo Score NON include la stagionalità (mostrata a parte nella colonna Seasonality) e penalizza sia l'eccesso di volatilita sia le forti estensioni dal prezzo medio: per questo ETF a leva o su materie prime/minerari (es. URA) restano spesso su punteggi contenuti anche con un trend di fondo forte.",
      },
      status: {
        formula: "Ogni metrica (trend, RSI14, Positivi20, Dist SMA20, RVOL, Vol20D, 52W High, Max DD 52W, rendimento 1M, qualita del fondo) assegna un voto da -3 a +3 con una motivazione testuale. La somma dei voti decide l'etichetta: >=9 Strong Buy, >=3 Buy, >=-3 Hold, altrimenti Sell. Strong Buy richiede inoltre un Trend Forte confermato; un Trend Forte non puo mai risultare Sell.",
        purpose: "Trasforma tutte le metriche dello screener in un giudizio operativo immediato (Strong Buy/Buy/Hold/Sell), mostrando comunque il ragionamento completo dietro l'etichetta.",
        example: "Trend Forte (+3), RSI14 62 (+2), Positivi20 15/20 (+2), Dist SMA20 +4% (+1), RVOL 1.4x (+1), Vol20D 16% (+1), 52W High -3% (+2), Max DD 52W -9% (+1) => totale 13 => Strong Buy; ogni voto compare come motivazione nel dialog di dettaglio.",
      },
      dailyReturn: {
        formula: "((Close_oggi / Close_ieri) - 1) * 100.",
        purpose: "Cattura variazioni improvvise (notizie, dati macro, movimenti dell'indice sottostante) nella singola seduta.",
        example: "102 vs 100 => +2.00%: da leggere insieme a RVOL per capire se e un movimento genuino o rumore di poco volume.",
      },
      threeDayReturn: {
        formula: "((Close_oggi / Close_3 sedute fa) - 1) * 100.",
        purpose: "Riduce il rumore di un singolo giorno e mostra se il movimento ha continuita nel brevissimo periodo.",
        example: "103.5 vs 100 => +3.50% su 3 sedute.",
      },
      weekReturn: {
        formula: "((Close_oggi / Close_5 sedute fa) - 1) * 100 (5 sedute = una settimana di borsa).",
        purpose: "Offre una vista settimanale piu stabile del solo rendimento giornaliero.",
        example: "106 vs 100 => +6.00% in una settimana.",
      },
      monthReturn: {
        formula: "((Close_oggi / Close_di circa 21 sedute fa) - 1) * 100.",
        purpose: "Alimenta anche la classifica dei Flussi di capitale: un rendimento mensile alto o basso e usato come proxy di forza o debolezza relativa.",
        example: "109 vs 100 => +9.00% nell'ultimo mese.",
      },
      year1Return: {
        formula: "((Close_oggi / Close_di circa 252 sedute fa) - 1) * 100, dove Close e il prezzo di chiusura non rettificato di Yahoo Finance.",
        purpose: "Misura il rendimento di prezzo sull'ultimo anno, confrontabile con la quotazione esposta da Yahoo Finance e JustETF.",
        example: "128 vs 100 => +28% nell'ultimo anno. I dividendi non vengono reinvestiti nel calcolo.",
      },
      year3Return: {
        formula: "((Close_oggi / Close_di circa 3 anni fa) - 1) * 100, su prezzi di chiusura non rettificati.",
        purpose: "Aiuta a distinguere forza strutturale da fasi brevi favorevoli, su un orizzonte di medio periodo.",
        example: "160 vs 100 => +60% cumulato in 3 anni. Trattandosi di rendimento totale (dividendi reinvestiti), puo risultare piu alto del rendimento di solo prezzo riportato da TradingView.",
      },
      year5Return: {
        formula: "((Close_oggi / Close_di circa 5 anni fa) - 1) * 100, su prezzi di chiusura non rettificati.",
        purpose: "Utile per confrontare la resilienza di un ETF attraverso un ciclo di mercato piu completo.",
        example: "210 vs 100 => +110% cumulato in 5 anni. Su orizzonti lunghi lo scarto rispetto al rendimento di solo prezzo (es. TradingView) diventa piu marcato per effetto della capitalizzazione dei dividendi.",
      },
      year10Return: {
        formula: "((Close_oggi / Close_di circa 10 anni fa) - 1) * 100, su prezzi di chiusura non rettificati.",
        purpose: "Misura la capacita del tema o dell'indice di creare valore nel lungo periodo, dividendi inclusi.",
        example: "330 vs 100 => +230% cumulato in 10 anni. Esempio reale: GREK mostra un 10Y molto piu alto in questa app che su TradingView perche qui i dividendi sono reinvestiti nel calcolo, mentre il grafico prezzi di TradingView di default non li include.",
      },
      seasonality: {
        formula: "Per ogni possibile finestra dell'anno che comprende la data odierna si calcola il rendimento medio e la percentuale di anni positivi (success rate) su 10/15/20 anni di storico; la finestra e 'allineata' se rendimento medio > 0 e success rate >= soglia impostata (default 60%) in tutte le profondita.",
        purpose: "Aggiunge un contesto storico/statistico indipendente dai segnali tecnici: un ETF puo avere trend o score modesti ma trovarsi comunque in un periodo dell'anno storicamente favorevole (o viceversa).",
        example: "11 anni positivi su 15 => success rate 73.3%: se e sopra la soglia impostata, il pallino diventa verde (allineata); altrimenti giallo (attenzione) o grigio (nessuna finestra valida).",
      },
      borsa: {
        formula: "Nessuna formula: campo anagrafico (exchange) fornito dal provider dati.",
        purpose: "Aiuta a conoscere orari di negoziazione, valuta di scambio e liquidita attesa, importante per ordini intraday o in apertura/chiusura mercato.",
        example: "Un ETF quotato su NASDAQ segue orari e festivita USA; uno su Borsa Italiana segue orari e festivita italiane/europee.",
      },
    },
    season: {
      loading: "Caricamento fino a 20 anni di storico giornaliero...",
      titleFallback: "stagionalità",
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
    chartLinkTitle: "Open TradingView chart",
    cookieTitle: "Cookie preferences",
    cookieBody: "We use technical cookies only to save visible columns and sorting. This prompt is shown only the first time.",
    cookieAccept: "Accept technical cookies",
    cookieReject: "Continue without cookies",
    selectColumnsButton: "Select columns",
    columnsTitle: "Visible columns",
    columnsHint: "Choose which columns are shown in the table. Preferences are automatically saved.",
    presetEssential: "Essential preset",
    presetAll: "Show all",
    closeColumns: "Close selector",
    showFilters: "Show filters",
    hideFilters: "Hide filters",
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
    filterButtonLabel: "Filter column",
    filterMin: "Min",
    filterMax: "Max",
    filterClear: "Clear filter",
    filterSearchPlaceholder: "Search value...",
    filterNoOptions: "No values",
    refreshQuotes: "Refresh quotes",
    capitalFlows: "Capital flows",
    simulations: "Simulations",
    buy: "Buy",
    buyTitle: "Add simulation",
    buyQuantity: "Quantity",
    buyPrice: "Purchase price",
    buyConfirm: "Record purchase",
    simulationsTitle: "Purchase simulations",
    simulationsHint: "Purchase metrics are frozen; return uses the latest available quote.",
    simulationDate: "Purchase date",
    currentPrice: "Current price",
    investment: "Invested",
    currentValue: "Current value",
    returnSinceBuy: "Return",
    frozenMetrics: "Metrics at purchase",
    removeSimulation: "Remove simulation",
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
    dataSourceNote: "Market data provided by Yahoo Finance.",
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
            "Status turns trend, RSI, volume, risk, and momentum into a Strong Buy/Buy/Hold/Sell call; click the badge to open the dialog with the full analysis.",
            "Seasonality indicates alignment between current setup and historically favorable windows.",
          ],
        },
        {
          title: "Core metrics: detailed practical guide",
          items: [
            "Ticker: short fund identifier. Practical example: VOO, IVV, and SPY all target S&P 500, but each has different issuer, liquidity profile, and cost structure; ticker precision prevents order-entry mistakes.",
            "ETF name: full provider/index/structure context. Practical example: two products mentioning Nasdaq 100 may differ by domicile, replication method, and trading currency; full name prevents strategy mismatch.",
            "Category: strategy or asset-class bucket. Practical example: excluding leveragedInverse and focusing on broadMarketUS plus bonds can materially reduce average portfolio variance in the scan.",
            "Trend: actual rule based on 3 moving averages. Strong if Price > SMA20 > SMA50 > SMA200; Weak if price is below both SMA20 and SMA50 and SMA20 is below SMA50; otherwise Neutral. Example: Price 104, SMA20 100, SMA50 98, SMA200 90 => Strong. With SMA200 at 105 the same setup would become Neutral: this is why volatile or recovering ETFs (e.g. commodities/mining) often stay 'Neutral' even with positive recent momentum.",
            "RSI 14: formula RSI = 100 - (100 / (1 + RS)), RS = avg gains 14d / avg losses 14d. Numeric example: avg gain 1.4, avg loss 0.7 => RS=2 => RSI=66.67. Higher values show thrust but may also imply pullback risk.",
            "Positive 10D: formula Pos10 = sum of indicators [Close_t > Close_{t-1}] across 10 sessions. Example: 8/10 means 80% of recent days closed up, a strong very-short-term persistence signal.",
            "Positive 20D: same computation on 20 sessions. Example: 14/20 (70%) is usually more robust than an isolated short burst.",
            "Streak 20D: consecutive up-close count in the recent window. Example sequence + + + - + + gives current streak 2 and recent max 3; expanding streaks can signal acceleration.",
            "Dist SMA20: formula Dist% = ((Price / SMA20) - 1) * 100. Example: Price 105 and SMA20 100 => +5%; readings near +12/+15% may indicate overextension and mean-reversion vulnerability.",
            "RVOL: formula RVOL = today volume / average 20d volume. Example: 3.0M vs 1.5M => 2.0x; breakouts with RVOL > 1.8x are typically more credible than moves at 0.7x.",
            "Vol 20D: formula annualized vol = stdev(20 daily returns) * sqrt(252) * 100. Example: stdev 0.9% => vol ~14.3%; stdev 2.2% => vol ~34.9%. Use it to compare return opportunity versus risk budget.",
            "52W High: formula Dist52W% = ((Price / High_52w) - 1) * 100. Example: High 100 to Price 97 => -3%; to 72 => -28%. Smaller gaps often indicate stronger relative leadership.",
            "Max DD 52W: formula DD_t = ((Price_t / running_peak_t) - 1) * 100, Max DD = minimum DD_t over 52 weeks. Example: peak 120, trough 90 => -25%. This quantifies downside severity under stress.",
            "AUM: total managed capital (shares outstanding * NAV). Example: a 20B ETF usually offers deeper books and tighter spreads than a 70M ETF, with direct slippage implications.",
            "Score: additive 0-100 ranking (capped at 100): +12 Price>SMA20, +10 SMA20>SMA50, +10 SMA50>SMA200, up to +20 from RSI14, up to +18 from Positive20, up to +10 from RVOL, up to +10 from Volatility20D (lower is better), up to +10 from Distance from SMA20 (penalized both above and below), up to +5 quality points (AUM/TER/age). Seasonality is NOT included in Score. Example: aligned SMAs (+32), RSI 55 (+15.4), Positive20 14/20 (+12.6), RVOL 1.2 (+4.8), Vol20D 22% (+2.1), Dist.SMA20 6% (+6), Quality 3 => total ~76.",
            "Status: Strong Buy/Buy/Hold/Sell call computed by summing a weighted vote per metric (trend, RSI14, Positive20, Dist SMA20, RVOL, Vol20D, 52W High, Max DD 52W, 1M return, fund quality); the total maps to the label and every vote becomes a readable reason in the detail dialog.",
            "1D return: formula R_1D% = ((Close_t / Close_{t-1}) - 1) * 100. Example: 102 vs 100 => +2.00%. Best interpreted with RVOL to avoid overreacting to thin-volume moves.",
            "3D return: formula R_3D% = ((Close_t / Close_{t-3}) - 1) * 100. Example: 103.5 vs 100 => +3.50%. It reduces one-day noise and validates follow-through.",
            "1W return: formula R_1W% = ((Close_t / Close_{t-5}) - 1) * 100. Example: 106 vs 100 => +6.00%. The same gain with lower volatility is usually higher quality.",
            "1M return: formula R_1M% = ((Close_t / Close_{t-21}) - 1) * 100 approx. Example: 109 vs 100 => +9.00%. This metric directly feeds the Capital Flows ranking.",
            "1Y return: formula R_1Y% = ((Close_t / Close_{t-252}) - 1) * 100 approx. Example: 128 vs 100 => +28%. Useful to assess annual trend quality beyond tactical noise.",
            "3Y return: formula R_3Y% = ((Close_t / Close_{t-756}) - 1) * 100 approx. Example: 160 vs 100 => +60% cumulative. Helps separate structural winners from short-lived moves.",
            "5Y return: formula R_5Y% = ((Close_t / Close_{t-1260}) - 1) * 100 approx. Example: 210 vs 100 => +110% cumulative. Good for comparing resilience across full cycles.",
            "10Y return: formula R_10Y% = ((Close_t / Close_{t-2520}) - 1) * 100 approx. Example: 330 vs 100 => +230% cumulative. Captures long-run compounding power of the theme/index.",
            "Seasonality: alignment criterion = current date inside a window with average return > 0 and success rate >= threshold (for example 60%) across 10/15/20-year depths. Example: 11 positive years out of 15 => 73.3%; if trend and score are also strong, timing context improves.",
            "Exchange: listing venue. Practical example: NYSE, NASDAQ, and Borsa Italiana differ in opening windows, spread behavior, and intraday liquidity patterns.",
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
      metricsButton: "Metric details",
      metricsIntro: "Select a metric to see its formula, why it is used, and a detailed practical example.",
      backToGuide: "Back to guide",
      backToMetrics: "Back to metric list",
      metricFormulaLabel: "Formula:",
      metricPurposeLabel: "Why it is used:",
      metricExampleLabel: "Practical example:",
      close: "Close",
    },
    trendStrong: "Strong",
    trendNeutral: "Neutral",
    trendWeak: "Weak",
    statusLabels: {
      strong_buy: "Strong Buy",
      buy: "Buy",
      hold: "Hold",
      sell: "Sell",
    },
    statusModalHint: "Metric-by-metric analysis behind this rating.",
    statusPointsLabel: "Signal score",
    columns: {
      ticker: "Ticker",
      name: "ETF name",
      category: "Category",
      trend: "Trend",
      status: "Status",
      rsi14: "RSI 14",
      positive10: "Positive 10D",
      positive20: "Positive 20D",
      streak: "Streak 20D",
      distanceSma20: "Dist SMA20",
      distanceSma200: "Dist SMA200",
      smaCross: "SMA50/200 Cross",
      rvol: "RVOL",
      volatility20d: "Vol 20D",
      drawdownFromAth: "Drawdown from ATH",
      range52wPosition: "52W Range Position",
      distance52wHigh: "52W High",
      maxDrawdown52w: "Max DD 52W",
      netAssets: "AUM",
      score: "Score",
      price: "Price",
      dailyReturn: "1D",
      threeDayReturn: "3D",
      weekReturn: "1W",
      monthReturn: "1M",
      year1Return: "1Y",
      year3Return: "3Y",
      year5Return: "5Y",
      year10Return: "10Y",
      seasonality: "Seasonality",
      borsa: "Exchange",
    },
    columnHelp: {
      ticker: "ETF symbol for quick identification.",
      name: "Full listed fund name.",
      category: "Fund category by area or strategy.",
      trend: "Trend status based on moving averages.",
      status: "Strong Buy/Buy/Hold/Sell call based on all metrics; click for the full breakdown.",
      rsi14: "Relative strength over 14 periods.",
      positive10: "Positive days over last 10 sessions.",
      positive20: "Positive days over last 20 sessions.",
      streak: "Consecutive recent positive days.",
      distanceSma20: "Percent distance from 20-day average.",
      distanceSma200: "Percent distance from the 200-day simple moving average.",
      smaCross: "SMA50/SMA200 regime and latest cross; * marks a signal in the last 5 sessions.",
      rvol: "Relative volume vs 20-day average.",
      volatility20d: "20-day annualized volatility.",
      drawdownFromAth: "Current drawdown from the available all-time high.",
      range52wPosition: "Current price position between the 52-week low and high.",
      distance52wHigh: "Distance from yearly high.",
      maxDrawdown52w: "Worst drawdown over last year.",
      netAssets: "Assets under management.",
      score: "Synthetic 0-100 score.",
      price: "Latest available closing price on the listing exchange.",
      dailyReturn: "Last day performance.",
      threeDayReturn: "Last 3 sessions performance.",
      weekReturn: "Last week performance.",
      monthReturn: "Last month performance.",
      year1Return: "Price return over the last 12 months.",
      year3Return: "Cumulative price return over the last 3 years.",
      year5Return: "Cumulative price return over the last 5 years.",
      year10Return: "Cumulative price return over the last 10 years.",
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
      trend:
        "Actual rule: Strong if Price > SMA20 > SMA50 > SMA200 (full bullish alignment across 3 averages); Weak if Price <= SMA20 and Price <= SMA50 and SMA20 <= SMA50; otherwise Neutral. Example: Price 104, SMA20 100, SMA50 98, SMA200 90 => Strong. If SMA200 were 105 the label would drop to Neutral even with a strong price.",
      rsi14:
        "Formula: RSI = 100 - (100 / (1 + RS)), with RS = avg gains 14d / avg losses 14d. Example: avg gain 1.2, avg loss 0.6 => RS=2 => RSI=66.67.",
      positive:
        "Formula: Positive N = count[(Close_t - Close_{t-1}) > 0] over N sessions. Example: 8 positive days out of 10 and 14 out of 20 indicates persistent upside pressure.",
      streak:
        "Formula: streak = most recent consecutive run k where (Close_i - Close_{i-1}) > 0. Example signs + + + - + => current streak 1, recent max 3.",
      distSma20:
        "Formula: Dist SMA20 % = ((Price / SMA20) - 1) * 100. Example: Price 105, SMA20 100 => +5%; Price 94 => -6%.",
      rvol:
        "Formula: RVOL = today volume / average 20d volume. Example: 2.4M / 1.2M = 2.0x (high participation); 0.7x means below-average participation.",
      vol20d:
        "Formula: annualized 20D vol = stdev(20 daily returns) * sqrt(252) * 100. Example: stdev 1.1% => 0.011*sqrt(252)=17.46% annualized.",
      high52:
        "Formula: Dist 52W High % = ((Price / High_52w) - 1) * 100. Example: Price 98, High 100 => -2%; Price 75 => -25%.",
      maxDd:
        "Formula: DD_t = ((Price_t / running_peak_t) - 1) * 100; Max DD = minimum DD_t over 52 weeks. Example: drop from 120 to 90 => -25%.",
      aum: "AUM is total capital managed by the fund (shares outstanding * NAV). Example: 25B funds often trade with tighter spreads than 80M funds.",
      score:
        "Actual formula (sum of partial scores, capped at 100): +12 if Price>SMA20; +10 if SMA20>SMA50; +10 if SMA50>SMA200; up to +20 from RSI14; up to +18 from Positive20; up to +10 from RVOL; up to +10 from Volatility20D (lower is better); up to +10 from Distance from SMA20 (penalized both above and below); up to +5 quality points (AUM/TER/fund age). Seasonality is NOT included in Score. Example: aligned SMAs (+32), RSI 55 (+15.4), Positive20 14/20 (+12.6), RVOL 1.2 (+4.8), Vol20D 22% (+2.1), Dist.SMA20 6% (+6), Quality 3 => total ~76.",
      d1: "Formula: 1D % = ((Close_t / Close_{t-1}) - 1) * 100. Example: 102 vs 100 => +2.00%.",
      d3: "Formula: 3D % = ((Close_t / Close_{t-3}) - 1) * 100. Example: 103.5 vs 100 => +3.50%.",
      w1: "Formula: 1W % = ((Close_t / Close_{t-5}) - 1) * 100. Example: 106 vs 100 => +6.00%.",
      m1: "Formula: 1M % = ((Close_t / Close_{t-21}) - 1) * 100 approx. Example: 109 vs 100 => +9.00%.",
      seasonality:
        "Aligned when current date is inside a window with average return > 0 and success rate >= threshold (for example 60%) across 10/15/20-year depths. Example: 11 positive years out of 15 => 73.3%.",
    },
    metricDetails: {
      ticker: {
        formula: "No formula: it is the identifier symbol assigned by the listing venue.",
        purpose: "Uniquely identifies the instrument to buy or monitor, avoiding confusion between ETFs with similar names or strategies.",
        example: "VOO, IVV, and SPY all track the S&P 500 but are issued by different companies (Vanguard, iShares, State Street): the ticker is the only safe way to know exactly which one you are selecting.",
      },
      name: {
        formula: "No formula: full fund name returned by the data provider.",
        purpose: "Helps understand provider, tracked index, and fund structure without searching elsewhere.",
        example: "'iShares Core S&P 500 UCITS ETF' clearly states the index (S&P 500), issuer (iShares), and UCITS wrapper (Europe).",
      },
      category: {
        formula: "No formula: category assigned by an internal catalog grouping tickers by theme or asset class.",
        purpose: "Lets you quickly filter or exclude ETF families with a similar risk profile.",
        example: "Excluding the leveragedInverse category instantly removes every leveraged/inverse ETF, often unsuitable for long-term strategies.",
      },
      trend: {
        formula: "Strong if Price > SMA20 > SMA50 > SMA200 (full bullish alignment across 3 averages). Weak if Price <= SMA20 and Price <= SMA50 and SMA20 <= SMA50. Otherwise: Neutral.",
        purpose: "Summarizes trend structure across three horizons (short/medium/long) into a single label instead of comparing three moving averages manually.",
        example: "Price 104, SMA20 100, SMA50 98, SMA200 90: all conditions hold (104>100>98>90) => Strong. If SMA200 were 105, full alignment is lost and the label drops to Neutral even with price above SMA20: this is why a volatile or recovering ETF (e.g. commodities/mining) often stays 'Neutral' despite positive recent momentum.",
      },
      rsi14: {
        formula: "RSI = 100 - (100 / (1 + RS)), with RS = average daily gains over 14d / average daily losses over 14d (simple average, not exponential).",
        purpose: "Measures whether recent movement is driven more by gains or losses, flagging overbought (above 70) or oversold (below 35 in this screener) conditions.",
        example: "Average gain 1.4, average loss 0.7 => RS=2 => RSI=66.67: positive momentum but not yet at extreme levels (100).",
      },
      positive10: {
        formula: "Count of days where Close_t > Close_(t-1), over a 10-session window.",
        purpose: "Measures persistence (not intensity) of the move over the very short term.",
        example: "8/10 means 80% of the last 10 sessions closed up.",
      },
      positive20: {
        formula: "Count of days where Close_t > Close_(t-1), over a 20-session window.",
        purpose: "Extended version of Positive10, less sensitive to a single isolated spike.",
        example: "14/20 (70%) confirms a more robust bullish bias than an isolated 8/10.",
      },
      streak: {
        formula: "Number of most recent consecutive positive closes (stops at the first negative or flat day).",
        purpose: "Highlights whether the move is accelerating without interruption or alternating up and down.",
        example: "Sequence + + + - + + => current streak 2 (the last two sessions), even though the wider window had 5 positive days out of 6.",
      },
      distanceSma20: {
        formula: "((Price / SMA20) - 1) * 100.",
        purpose: "Measures how far price has drifted from its short moving average: very high values, positive or negative, signal a possible statistical excess.",
        example: "Price 105, SMA20 100 => +5% (orderly trend). Price 130, SMA20 100 => +30% (strong overextension: the Score treats this as risk, not reward).",
      },
      distanceSma200: {
        formula: "((Price / SMA200) - 1) * 100.",
        purpose: "Measures distance from the structural long-term trend. A moderate pullback below SMA200 can be evaluated as a long-term accumulation context alongside risk measures.",
        example: "Price 96, SMA200 100 => -4%: slightly below the long-term average.",
      },
      smaCross: {
        formula: "Golden regime when SMA50 > SMA200; Death regime when SMA50 < SMA200. A cross is the change in this relation; * marks a cross within 5 sessions.",
        purpose: "Shows structural trend regime and highlights a recent transition between the two moving averages.",
        example: "SMA50 102 and SMA200 100 => Golden regime. A cross three sessions ago displays Golden *.",
      },
      rvol: {
        formula: "Today's volume / average volume of the last 20 sessions.",
        purpose: "Checks whether a price move is backed by real participation growth, or happens on thin volume (less reliable).",
        example: "Today's volume 3.0M vs average 1.5M => RVOL 2.0x: the move carries more weight than a normal session.",
      },
      volatility20d: {
        formula: "Standard deviation of the last 20 daily returns, annualized by multiplying by the square root of 252 (trading days in a year).",
        purpose: "Quantifies short-term risk, useful to compare ETFs with very different swings (e.g. a bond fund vs a commodity ETF).",
        example: "Daily stdev 0.9% => annualized volatility ~14.3%. With stdev 2.2% (typical for sector/mining/leveraged ETFs) it rises to ~34.9%: the Score penalizes high volatility even with a positive return.",
      },
      drawdownFromAth: {
        formula: "((Current price / available all-time high) - 1) * 100.",
        purpose: "Measures the current decline from the all-time high, separate from 52W maximum drawdown which measures the worst internal decline in the last year.",
        example: "ATH 120 and price 90 => -25%.",
      },
      range52wPosition: {
        formula: "((Price - 52W low) / (52W high - 52W low)) * 100.",
        purpose: "Places the price in its annual channel. Values between 20% and 40% are in the lower portion of the range.",
        example: "Low 80, high 120, price 92 => 30%.",
      },
      distance52wHigh: {
        formula: "((Price / 252-session high) - 1) * 100.",
        purpose: "Shows how close or far the ETF is from its yearly high: proximity to highs is often associated with relative strength.",
        example: "High 100, price 97 => -3% (near highs). High 100, price 72 => -28% (still far, possibly recovering).",
      },
      maxDrawdown52w: {
        formula: "For each day, DD_t = (Price_t / running peak so far - 1) * 100; Max Drawdown is the most negative value found over the last 252 days.",
        purpose: "Measures the worst loss an investor would have experienced over the last year starting from the worst point, useful to gauge the resilience required to hold the ETF.",
        example: "From a peak of 120 to a subsequent low of 90 => drawdown -25%.",
      },
      netAssets: {
        formula: "No formula: figure supplied by the data provider (assets under management = shares outstanding * NAV).",
        purpose: "Larger funds tend to have deeper liquidity and tighter spreads, reducing implicit trading costs.",
        example: "A 20B$ ETF usually has a tighter bid/ask spread than a 70M$ ETF.",
      },
      score: {
        formula: "Additive 0-100 score (capped at 100): +12 if Price>SMA20; +10 if SMA20>SMA50; +10 if SMA50>SMA200; up to +20 from RSI14 (RSI 35 => 0 points, RSI>=61 saturates at 20); up to +18 from Positive20 (20/20 positive days => 18 points); up to +10 from RVOL (RVOL>=1.63 saturates at 10); up to +10 from Volatility20D, inversely (lower is better: from 35% up, 0 points); up to +10 from Distance from SMA20, symmetrically (max when price is close to SMA20, drops both when far above and far below); finally up to +5 quality points based on AUM, cost (TER), and fund age.",
        purpose: "Summarizes technical trend, momentum, risk, and fund quality into a single number to quickly compare many ETFs without reading every column.",
        example: "Price>SMA20 (+12), SMA20>SMA50 (+10), SMA50>SMA200 (+10), RSI 55 => +15.4, Positive20=14/20 => +12.6, RVOL 1.2 => +4.8, Vol20D 22% => +2.1, Dist.SMA20 6% => +6, Quality 3 => total ~76. Important note: Score does NOT include seasonality (shown separately in the Seasonality column) and penalizes both excess volatility and strong extensions from the average price: this is why leveraged or commodity/mining ETFs (e.g. URA) often keep contained scores even with a strong underlying trend.",
      },
      status: {
        formula: "Each metric (trend, RSI14, Positive20, Dist SMA20, RVOL, Vol20D, 52W High, Max DD 52W, 1M return, fund quality) casts a -3 to +3 vote with a text reason. The sum of votes decides the label: >=9 Strong Buy, >=3 Buy, >=-3 Hold, otherwise Sell. Strong Buy additionally requires a confirmed Strong trend; a Strong trend can never be rated Sell.",
        purpose: "Turns every screener metric into an immediate actionable call (Strong Buy/Buy/Hold/Sell) while still exposing the full reasoning behind the label.",
        example: "Strong trend (+3), RSI14 62 (+2), Positive20 15/20 (+2), Dist SMA20 +4% (+1), RVOL 1.4x (+1), Vol20D 16% (+1), 52W High -3% (+2), Max DD 52W -9% (+1) => total 13 => Strong Buy; every vote appears as a reason in the detail dialog.",
      },
      dailyReturn: {
        formula: "((Today's Close / Yesterday's Close) - 1) * 100.",
        purpose: "Captures sudden changes (news, macro data, moves in the underlying index) within a single session.",
        example: "102 vs 100 => +2.00%: best read together with RVOL to see if it is a genuine move or thin-volume noise.",
      },
      threeDayReturn: {
        formula: "((Today's Close / Close 3 sessions ago) - 1) * 100.",
        purpose: "Reduces single-day noise and shows whether the move has short-term continuity.",
        example: "103.5 vs 100 => +3.50% over 3 sessions.",
      },
      weekReturn: {
        formula: "((Today's Close / Close 5 sessions ago) - 1) * 100 (5 sessions = one trading week).",
        purpose: "Provides a more stable weekly view than the single daily return.",
        example: "106 vs 100 => +6.00% over one week.",
      },
      monthReturn: {
        formula: "((Today's Close / Close about 21 sessions ago) - 1) * 100.",
        purpose: "Also feeds the Capital Flows ranking: a high or low monthly return is used as a proxy for relative strength or weakness.",
        example: "109 vs 100 => +9.00% over the last month.",
      },
      year1Return: {
        formula: "((Today's Close / Close about 252 sessions ago) - 1) * 100, using Yahoo Finance's unadjusted closing price.",
        purpose: "Measures price return over the last year, comparable with the price shown by Yahoo Finance and JustETF.",
        example: "128 vs 100 => +28% over the last year. Dividends are not reinvested in this calculation.",
      },
      year3Return: {
        formula: "((Today's Close / Close about 3 years ago) - 1) * 100, on unadjusted closing prices.",
        purpose: "Helps separate structural strength from short-lived favorable phases, over a medium-term horizon.",
        example: "160 vs 100 => +60% cumulative over 3 years. Being a total return (dividends reinvested), it can be higher than the price-only return reported by TradingView.",
      },
      year5Return: {
        formula: "((Today's Close / Close about 5 years ago) - 1) * 100, on unadjusted closing prices.",
        purpose: "Useful to compare resilience across a more complete market cycle.",
        example: "210 vs 100 => +110% cumulative over 5 years. Over longer horizons the gap versus price-only returns (e.g. TradingView) becomes more pronounced due to dividend compounding.",
      },
      year10Return: {
        formula: "((Today's Close / Close about 10 years ago) - 1) * 100, on unadjusted closing prices.",
        purpose: "Measures the theme's or index's ability to create value over the long term, dividends included.",
        example: "330 vs 100 => +230% cumulative over 10 years. Real example: GREK shows a much higher 10Y figure here than on TradingView because dividends are reinvested in this calculation, while TradingView's default price chart does not include them.",
      },
      seasonality: {
        formula: "For every possible window of the year containing today's date, the average return and the percentage of positive years (success rate) are computed over 10/15/20 years of history; a window is 'aligned' if average return > 0 and success rate >= the configured threshold (default 60%) across all depths.",
        purpose: "Adds a historical/statistical context independent from technical signals: an ETF can have a modest trend or score but still sit in a historically favorable period of the year (or vice versa).",
        example: "11 positive years out of 15 => 73.3% success rate: if above the configured threshold, the dot turns green (aligned); otherwise yellow (watch) or gray (no valid window).",
      },
      borsa: {
        formula: "No formula: listing venue field supplied by the data provider.",
        purpose: "Helps understand trading hours, settlement currency, and expected liquidity, important for intraday orders or market open/close.",
        example: "An ETF listed on NASDAQ follows US trading hours and holidays; one listed on Borsa Italiana follows Italian/European hours and holidays.",
      },
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

const formatPrice = (value, currency) =>
  value == null || !Number.isFinite(Number(value))
    ? "-"
    : `${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}${currency ? ` ${currency}` : ""}`;

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

const NUMERIC_COLUMN_KEYS = new Set([
  "score",
  "price",
  "dailyReturn",
  "threeDayReturn",
  "weekReturn",
  "monthReturn",
  "year1Return",
  "year3Return",
  "year5Return",
  "year10Return",
  "rsi14",
  "positive10",
  "positive20",
  "streak",
  "distanceSma20",
  "distanceSma200",
  "rvol",
  "volatility20d",
  "drawdownFromAth",
  "range52wPosition",
  "distance52wHigh",
  "maxDrawdown52w",
  "netAssets",
]);

function getColumnNumericValue(key, row) {
  if (key === "rvol") return row.relativeVolume;
  if (key === "smaCross") return row.smaCross?.distancePercent;
  return row[key];
}

function getColumnFilterValues(key, row, t, seasonCache, minSuccess) {
  if (key === "ticker") return [row.ticker];
  if (key === "name") return [row.name || row.ticker];
  if (key === "category") return row.categories && row.categories.length ? row.categories : ["-"];
  if (key === "trend") return [localizedTrendLabel(row.trend, t)];
  if (key === "status") return [t.statusLabels[row.status] || row.status || "-"];
  if (key === "borsa") return [row.exchange || "-"];
  if (key === "seasonality") {
    const season = seasonCache[row.ticker];
    const activeWindow = (season?.seasonalWindows || []).find((w) => (w.minSuccessRate ?? 0) >= minSuccess) || null;
    const score = row.score ?? 0;
    return [activeWindow ? (score >= 80 ? t.aligned : t.watch) : "-"];
  }
  return [];
}

function columnPassesFilter(key, filterValue, row, t, seasonCache, minSuccess) {
  if (!filterValue) return true;
  if (NUMERIC_COLUMN_KEYS.has(key)) {
    const { min, max } = filterValue;
    const value = getColumnNumericValue(key, row);
    if (min !== "" && min != null && (value == null || !Number.isFinite(Number(value)) || Number(value) < Number(min))) return false;
    if (max !== "" && max != null && (value == null || !Number.isFinite(Number(value)) || Number(value) > Number(max))) return false;
    return true;
  }
  if (!filterValue.length) return true;
  const values = getColumnFilterValues(key, row, t, seasonCache, minSuccess);
  return values.some((v) => filterValue.includes(v));
}

function tooltip(title, body) {
  return `${title}: ${body}`;
}

// Yahoo's exchange suffix must map to TradingView's own exchange prefix, otherwise the
// bare ticker (e.g. "CSSPX") can collide with an unrelated US-listed symbol on TradingView.
const TRADINGVIEW_EXCHANGE_BY_SUFFIX = {
  DE: "XETR",
  L: "LSE",
  MI: "MIL",
  PA: "EURONEXT",
  AS: "EURONEXT",
};

function tradingViewSymbol(ticker) {
  const raw = String(ticker || "").trim().toUpperCase();
  const [base, suffix] = raw.split(".");
  const exchange = suffix ? TRADINGVIEW_EXCHANGE_BY_SUFFIX[suffix] : null;
  return exchange ? `${exchange}-${base}` : base;
}

function tradingViewUrl(ticker) {
  return `https://www.tradingview.com/symbols/${encodeURIComponent(tradingViewSymbol(ticker))}/`;
}

function readCookieJson(name) {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function writeCookieJson(name, value) {
  if (typeof document === "undefined") return;
  const encoded = encodeURIComponent(JSON.stringify(value));
  document.cookie = `${name}=${encoded}; path=/; max-age=31536000; samesite=lax`;
}

function deleteCookie(name) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

function normalizeColumnFilters(savedFilters) {
  if (!savedFilters || typeof savedFilters !== "object" || Array.isArray(savedFilters)) return {};
  return Object.fromEntries(Object.entries(savedFilters).filter(([key, value]) => {
    if (!ALL_COLUMN_KEYS.includes(key)) return false;
    if (NUMERIC_COLUMN_KEYS.has(key)) {
      return value && typeof value === "object" && !Array.isArray(value) &&
        (typeof value.min === "string" || typeof value.max === "string");
    }
    return Array.isArray(value) && value.every((item) => typeof item === "string");
  }));
}

export default function Home() {
  const [lang, setLang] = useState("it");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(0);
  const [error, setError] = useState("");
  const [sort, setSort] = useState({ key: "score", dir: -1 });
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
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
  const [flowPeriod, setFlowPeriod] = useState("monthReturn");
  const [openHeaderKey, setOpenHeaderKey] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [openFilterKey, setOpenFilterKey] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [cookieConsent, setCookieConsent] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [analysisModal, setAnalysisModal] = useState(null);
  const [tourStep, setTourStep] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [profile, setProfile] = useState({ mode: "long", selectedMetrics: PROFILE_METRICS.long });
  const [profileOpen, setProfileOpen] = useState(false);
  const [simulations, setSimulations] = useState([]);
  const [simulationsOpen, setSimulationsOpen] = useState(false);
  const [purchaseDraft, setPurchaseDraft] = useState(null);
  const [guideView, setGuideView] = useState("guide");
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const abortRef = useRef(null);

  const t = I18N[lang];

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("ui-lang") : null;
    if (saved === "it" || saved === "en") setLang(saved);

    const savedConsent = typeof window !== "undefined" ? localStorage.getItem(COOKIE_CONSENT_KEY) : null;
    if (savedConsent === "accepted" || savedConsent === "rejected") {
      setCookieConsent(savedConsent);
    }

    if (savedConsent === "accepted") {
      const savedColumns = readCookieJson(COOKIE_VISIBLE_COLUMNS);
      const merged = mergeVisibleColumns(savedColumns, ALL_COLUMN_KEYS);
      if (merged.length) setVisibleColumns(merged);

      const savedSort = readCookieJson(COOKIE_SORT);
      if (
        savedSort &&
        typeof savedSort === "object" &&
        ALL_COLUMN_KEYS.includes(savedSort.key) &&
        (savedSort.dir === 1 || savedSort.dir === -1)
      ) {
        setSort({ key: savedSort.key, dir: savedSort.dir });
      }
    }

    const savedWatchlist = readCookieJson(COOKIE_WATCHLIST);
    if (Array.isArray(savedWatchlist)) setWatchlist([...new Set(savedWatchlist.filter((ticker) => typeof ticker === "string"))]);
    setProfile(normalizeProfile(readCookieJson(COOKIE_INVESTMENT_PROFILE)));
    setColumnFilters(normalizeColumnFilters(readCookieJson(COOKIE_COLUMN_FILTERS)));
    try {
      const savedSimulations = JSON.parse(localStorage.getItem(SIMULATIONS_STORAGE_KEY) || "[]");
      if (Array.isArray(savedSimulations)) setSimulations(savedSimulations.filter((item) => item?.ticker && item?.snapshot));
    } catch {
      localStorage.removeItem(SIMULATIONS_STORAGE_KEY);
    }
    setPreferencesHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("ui-lang", lang);
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (cookieConsent !== "accepted") return;
    writeCookieJson(COOKIE_VISIBLE_COLUMNS, visibleColumns);
  }, [visibleColumns, cookieConsent]);

  useEffect(() => {
    if (cookieConsent !== "accepted") return;
    writeCookieJson(COOKIE_SORT, sort);
  }, [sort, cookieConsent]);

  useEffect(() => {
    if (!preferencesHydrated) return;
    writeCookieJson(COOKIE_WATCHLIST, watchlist);
  }, [watchlist, preferencesHydrated]);

  useEffect(() => {
    if (!preferencesHydrated) return;
    writeCookieJson(COOKIE_INVESTMENT_PROFILE, profile);
  }, [profile, preferencesHydrated]);

  useEffect(() => {
    if (!preferencesHydrated) return;
    writeCookieJson(COOKIE_COLUMN_FILTERS, columnFilters);
  }, [columnFilters, preferencesHydrated]);

  useEffect(() => {
    if (!preferencesHydrated) return;
    localStorage.setItem(SIMULATIONS_STORAGE_KEY, JSON.stringify(simulations));
  }, [simulations, preferencesHydrated]);

  useEffect(() => {
    if (!preferencesHydrated || readCookieJson(COOKIE_TOUR_COMPLETED)) return;
    setTourStep(0);
  }, [preferencesHydrated]);

  useEffect(() => {
    function closeTooltipOnOutsideClick(event) {
      if (!event.target?.closest?.(".columnHead")) {
        setOpenHeaderKey(null);
        setOpenFilterKey(null);
      }
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

  const columnOptionsMap = useMemo(() => {
    const ok = rows.filter((r) => r.ok);
    const map = {};
    for (const key of ["ticker", "name", "category", "trend", "status", "borsa", "seasonality"]) {
      const values = ok.flatMap((r) => getColumnFilterValues(key, r, t, seasonCache, minSuccess));
      map[key] = [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b)));
    }
    return map;
  }, [rows, t, seasonCache, minSuccess]);

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
      if (watchlistOnly && !watchlist.includes(x.ticker)) return false;
      if ((x.categories || []).some((c) => ex.has(c))) return false;
      if (min != null && (x.netAssets == null ? missing !== "include" : x.netAssets < min)) return false;
      if (mt != null && (x.ter == null ? missing !== "include" : x.ter > mt)) return false;
      if (missing === "exclude" && (x.netAssets == null || x.ter == null)) return false;
      for (const [key, value] of Object.entries(columnFilters)) {
        if (!columnPassesFilter(key, value, x, t, seasonCache, minSuccess)) return false;
      }
      return true;
    });

    data.sort((a, b) => {
      const { key, dir } = sort;
      const stringValue = (row) => {
        if (key === "category") return (row.categories || []).join(", ");
        if (key === "borsa") return String(row.exchange || "");
        if (key === "seasonality") return String(row.score ?? "");
        return String(row[key] || "");
      };
      if (["ticker", "name", "category", "trend", "borsa", "seasonality"].includes(key)) {
        return stringValue(a).localeCompare(stringValue(b)) * dir;
      }
      const numericValue = (row) => (key === "status" ? row.statusPoints : row[key]);
      return ((numericValue(a) ?? -Infinity) - (numericValue(b) ?? -Infinity)) * dir;
    });

    return data;
  }, [rows, search, only, excluded, minAum, maxTer, missing, sort, columnFilters, t, seasonCache, minSuccess, watchlistOnly, watchlist]);

  const capitalFlow = useMemo(() => {
    const availableRows = rows.filter((row) => row.ok);
    const makeItem = (row) => ({
      ticker: row.ticker,
      name: row.name || row.ticker,
      category: row.categories?.[0] || "-",
      rvol: row.relativeVolume,
      score: row.score,
      dailyReturn: row.dailyReturn,
      threeDayReturn: row.threeDayReturn,
      weekReturn: row.weekReturn,
      monthReturn: row.monthReturn,
    });
    const rankings = Object.fromEntries(FLOW_PERIODS.map(({ key }) => {
      const ranked = availableRows
        .filter((row) => Number.isFinite(Number(row[key])))
        .sort((a, b) => Number(b[key]) - Number(a[key]));
      return [key, {
        inflow: ranked.slice(0, CAPITAL_FLOW_LIMIT).map(makeItem),
        outflow: ranked.slice(-CAPITAL_FLOW_LIMIT).reverse().map(makeItem),
      }];
    }));

    const categoryMap = new Map();
    for (const row of availableRows.filter((item) => Number.isFinite(Number(item[flowPeriod])))) {
      for (const category of row.categories || ["Altri"]) {
        const current = categoryMap.get(category) || [];
        current.push(row);
        categoryMap.set(category, current);
      }
    }
    const categoryDemand = [...categoryMap.entries()]
      .map(([category, items]) => ({
        category,
        count: items.length,
        value: items.reduce((sum, item) => sum + Number(item[flowPeriod] || 0), 0) / items.length,
        rvol: items.filter((item) => Number.isFinite(Number(item.relativeVolume))).reduce((sum, item, _, valid) => sum + Number(item.relativeVolume), 0) / items.filter((item) => Number.isFinite(Number(item.relativeVolume))).length || null,
        score: items.reduce((sum, item) => sum + Number(item.score || 0), 0) / items.length,
      }))
      .sort((a, b) => b.value - a.value || b.score - a.score);

    return {
      rankings,
      categoryDemand: categoryDemand.slice(0, CAPITAL_FLOW_LIMIT),
    };
  }, [rows, flowPeriod]);

  const visibleSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);
  const orderedVisibleColumns = useMemo(
    () => ALL_COLUMN_KEYS.filter((key) => visibleSet.has(key)),
    [visibleSet]
  );

  function doSort(key) {
    setSort((s) => (
      s.key === key
        ? { key, dir: -s.dir }
        : { key, dir: ["ticker", "name", "category", "trend", "borsa", "seasonality"].includes(key) ? 1 : -1 }
    ));
  }

  function toggleColumn(key) {
    setVisibleColumns((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((item) => item !== key);
        return next.length ? next : prev;
      }
      return [...prev, key];
    });
  }

  function applyEssentialColumns() {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
  }

  function applyAllColumns() {
    setVisibleColumns(ALL_COLUMN_KEYS);
  }

  function onCookieConsent(choice) {
    if (typeof window !== "undefined") {
      localStorage.setItem(COOKIE_CONSENT_KEY, choice);
    }
    setCookieConsent(choice);
    if (choice === "accepted") return;
    deleteCookie(COOKIE_VISIBLE_COLUMNS);
    deleteCookie(COOKIE_SORT);
  }

  function toggleWatchlist(ticker) {
    setWatchlist((current) => current.includes(ticker) ? current.filter((item) => item !== ticker) : [...current, ticker]);
  }

  function startPurchase(row, rowState) {
    setPurchaseDraft({ row, rowState, quantity: "1", price: row.price == null ? "" : String(row.price) });
  }

  function savePurchase() {
    if (!purchaseDraft) return;
    const quantity = Number(purchaseDraft.quantity);
    const purchasePrice = Number(purchaseDraft.price);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(purchasePrice) || purchasePrice <= 0) return;
    const { row, rowState } = purchaseDraft;
    setSimulations((current) => [...current, {
      id: `${row.ticker}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ticker: row.ticker,
      name: row.name || row.ticker,
      currency: row.currency || null,
      quantity,
      purchasePrice,
      purchasedAt: new Date().toISOString(),
      snapshot: { ...row, trendLabel: rowState.trendLabel, profileStatus: rowState.profileStatus },
    }]);
    setPurchaseDraft(null);
    setSimulationsOpen(true);
  }

  function clearFilters() {
    setSearch("");
    setOnly("");
    setExcluded([]);
    setMinAum("");
    setMaxTer("");
    setMissing("include");
    setColumnFilters({});
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

  function renderCell(key, row, rowState) {
    const { trendLabel, rsi, score, seasonLabel, seasonTone, profileStatus } = rowState;

    if (key === "ticker") {
      return (
        <td className="tickerCell">
          <div className="tickerCellInner">
            <button className="tickerButton" onClick={() => { void getSeasonality(row.ticker, true); }}>{row.ticker}</button>
            <div className="tickerActions">
              <button
                type="button"
                className={`watchlistButton ${watchlist.includes(row.ticker) ? "active" : ""}`}
                onClick={() => toggleWatchlist(row.ticker)}
                title={watchlist.includes(row.ticker) ? "Rimuovi dalla watchlist" : "Aggiungi alla watchlist"}
                aria-label={watchlist.includes(row.ticker) ? "Rimuovi dalla watchlist" : "Aggiungi alla watchlist"}
              >
                {watchlist.includes(row.ticker) ? "★" : "☆"}
              </button>
              <a
                className="chartLink"
                href={tradingViewUrl(row.ticker)}
                target="_blank"
                rel="noreferrer"
                title={t.chartLinkTitle}
                aria-label={t.chartLinkTitle}
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="chartIcon" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M1.5 14.5h13M3 12.5V8m3.2 4.5V5m3.2 7.5V3m3.1 9.5V6.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
              <button type="button" className="buyButton" onClick={() => startPurchase(row, rowState)} title={t.buyTitle} aria-label={t.buyTitle}>{t.buy}</button>
            </div>
          </div>
        </td>
      );
    }
    if (key === "name") return <td className="name">{row.name || "-"}</td>;
    if (key === "category") return <td className="categoryCell" title={(row.categories || []).join(", ")}>{(row.categories || []).join(", ") || "-"}</td>;
    if (key === "trend") {
      return (
        <td className="col-trend" title={tooltip(t.tooltip.trend, t.tooltipBody.trend)}>
          <button type="button" className={`trendBadge ${trendTone(trendLabel)}`} onClick={() => setAnalysisModal({ type: "trend", row, trendLabel })}>{trendLabel}</button>
        </td>
      );
    }
    if (key === "status") {
      const statusKey = profileStatus.status;
      return (
        <td className="col-status">
          <button
            type="button"
            className={`statusBadge ${statusTone(statusKey)}`}
            onClick={() => setStatusModal({ ticker: row.ticker, name: row.name, statusKey, points: profileStatus.score, reasons: profileStatus.reasons, profileMode: profileStatus.mode, selectedMetrics: profileStatus.selectedMetrics, row, smaCross: row.smaCross })}
          >
            {t.statusLabels[statusKey] || statusKey}
          </button>
        </td>
      );
    }
    if (key === "rsi14") return <td className={rsi === "-" ? "muted" : row.rsi14 > 70 ? "positive" : row.rsi14 < 35 ? "negative" : "muted"} title={tooltip(t.tooltip.rsi14, t.tooltipBody.rsi14)}>{rsi}</td>;
    if (key === "positive10") return <td title={tooltip(t.tooltip.positive, t.tooltipBody.positive)}>{row.positive10 != null ? `${row.positive10}/10` : "-"}</td>;
    if (key === "positive20") return <td title={tooltip(t.tooltip.positive, t.tooltipBody.positive)}>{row.positive20 != null ? `${row.positive20}/20` : "-"}</td>;
    if (key === "streak") return <td title={tooltip(t.tooltip.streak, t.tooltipBody.streak)}>{row.streak != null ? `${row.streak}/20` : "-"}</td>;
    if (key === "distanceSma20") return <td className={cls(row.distanceSma20)} title={tooltip(t.tooltip.distSma20, t.tooltipBody.distSma20)}>{row.distanceSma20 == null ? "-" : `${fmt(row.distanceSma20, 1)}%`}</td>;
    if (key === "distanceSma200") return <td className={cls(row.distanceSma200)} title="Distanza percentuale del prezzo dalla SMA a 200 sedute.">{row.distanceSma200 == null ? "-" : `${fmt(row.distanceSma200, 1)}%`}</td>;
    if (key === "smaCross") return <td title="Regime SMA50/SMA200 e ultimo incrocio."><span className={`trendBadge ${row.smaCross?.regime === "golden" ? "strong" : "weak"}`}>{row.smaCross ? `${row.smaCross.regime === "golden" ? "Golden" : "Death"}${row.smaCross.isRecent ? " *" : ""}` : "-"}</span></td>;
    if (key === "rvol") return <td title={tooltip(t.tooltip.rvol, t.tooltipBody.rvol)}>{row.relativeVolume == null ? "-" : `${fmt(row.relativeVolume, 1)}x`}</td>;
    if (key === "volatility20d") return <td title={tooltip(t.tooltip.vol20d, t.tooltipBody.vol20d)}>{row.volatility20d == null ? "-" : fmt(row.volatility20d, 1)}</td>;
    if (key === "drawdownFromAth") return <td className={cls(row.drawdownFromAth)} title="Distanza percentuale dal massimo storico disponibile.">{row.drawdownFromAth == null ? "-" : `${fmt(row.drawdownFromAth, 1)}%`}</td>;
    if (key === "range52wPosition") return <td title="Posizione corrente tra minimo e massimo delle ultime 52 settimane.">{row.range52wPosition == null ? "-" : `${fmt(row.range52wPosition, 1)}%`}</td>;
    if (key === "distance52wHigh") return <td className={cls(row.distance52wHigh)} title={tooltip(t.tooltip.high52, t.tooltipBody.high52)}>{row.distance52wHigh == null ? "-" : `${fmt(row.distance52wHigh, 1)}%`}</td>;
    if (key === "maxDrawdown52w") return <td className={cls(row.maxDrawdown52w)} title={tooltip(t.tooltip.maxDd, t.tooltipBody.maxDd)}>{row.maxDrawdown52w == null ? "-" : `${fmt(row.maxDrawdown52w, 1)}%`}</td>;
    if (key === "netAssets") return <td className="mutedCell" title={tooltip(t.tooltip.aum, t.tooltipBody.aum)}>{row.netAssets == null ? "-" : formatAum(row.netAssets)}</td>;
    if (key === "score") {
      return (
        <td className="col-score" title={tooltip(t.tooltip.score, t.tooltipBody.score)}>
          <button type="button" className={`scoreBadge ${scoreTone(score)}`} onClick={() => setAnalysisModal({ type: "score", row, score })}>{score}</button>
        </td>
      );
    }
    if (key === "price") return <td title={t.columnHelp.price}>{formatPrice(row.price, row.currency)}</td>;
    if (key === "dailyReturn") return <td className={cls(row.dailyReturn)} title={tooltip(t.tooltip.d1, t.tooltipBody.d1)}>{pct(row.dailyReturn)}</td>;
    if (key === "threeDayReturn") return <td className={cls(row.threeDayReturn)} title={tooltip(t.tooltip.d3, t.tooltipBody.d3)}>{pct(row.threeDayReturn)}</td>;
    if (key === "weekReturn") return <td className={cls(row.weekReturn)} title={tooltip(t.tooltip.w1, t.tooltipBody.w1)}>{pct(row.weekReturn)}</td>;
    if (key === "monthReturn") return <td className={cls(row.monthReturn)} title={tooltip(t.tooltip.m1, t.tooltipBody.m1)}>{pct(row.monthReturn)}</td>;
    if (key === "year1Return") return <td className={cls(row.year1Return)}>{pct(row.year1Return)}</td>;
    if (key === "year3Return") return <td className={cls(row.year3Return)}>{pct(row.year3Return)}</td>;
    if (key === "year5Return") return <td className={cls(row.year5Return)}>{pct(row.year5Return)}</td>;
    if (key === "year10Return") return <td className={cls(row.year10Return)}>{pct(row.year10Return)}</td>;
    if (key === "seasonality") {
      return (
        <td title={tooltip(t.tooltip.seasonality, t.tooltipBody.seasonality)}>
          <div className="seasonalityCell">
            <span className={`seasonDot ${seasonTone}`} aria-label={seasonLabel} title={seasonLabel} />
            <button type="button" className="button small detailButton" onClick={() => { void getSeasonality(row.ticker, true); }}>
              {t.detail}
            </button>
          </div>
        </td>
      );
    }
    if (key === "borsa") return <td>{row.exchange || "-"}</td>;
    return <td>-</td>;
  }

  const statusText = `${t.statusLoaded(loaded, total, filtered.length)}${loading ? ` · ${t.statusLoading}` : ""}${
    scanProgress ? ` · ${t.statusSeasonality(scanProgress.done, scanProgress.total)}` : ""
  }`;
  const selectedFlow = capitalFlow.rankings[flowPeriod] || { inflow: [], outflow: [] };

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
          <button
            type="button"
            className="button primary topAction"
            onClick={() => { setGuideView("metrics"); setGuideOpen(true); }}
            title="Visiona metriche"
          >
            Visiona metriche
          </button>
          <button type="button" className="button topAction" data-tour="term" onClick={() => setProfileOpen(true)}>Term: {profile.mode === "long" ? "Long" : profile.mode === "short" ? "Short" : "Custom"}</button>
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

      {filtersOpen && <div className="filters" data-tour="filters">
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

        <Field label="Watchlist">
          <button className={`button ${watchlistOnly ? "primary" : ""}`} onClick={() => setWatchlistOnly((value) => !value)}>Solo watchlist ({watchlist.length})</button>
        </Field>

        <Field label="Filtri colonne">
          <button className="button" onClick={() => { setColumnFilters({}); setOpenFilterKey(null); }}>Azzera filtri colonne</button>
        </Field>
      </div>}

      <div className="actions" data-tour="actions">
        <button className="button primary" onClick={() => setColumnPickerOpen(true)}>{t.selectColumnsButton}</button>
        <button className="button" onClick={() => setFiltersOpen((v) => !v)}>{filtersOpen ? t.hideFilters : t.showFilters}</button>
        <button className="button" onClick={clearFilters}>{t.resetFilters}</button>
        <button className="button" onClick={() => loadAll(true)}>{t.refreshQuotes}</button>
        <button className="button primary" onClick={() => setFlowOpen(true)}>{t.capitalFlows}</button>
        <button className="button primary" onClick={() => setSimulationsOpen(true)}>{t.simulations} ({simulations.length})</button>
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
      <div className="tableWrap" data-tour="table">
        <table className="table">
          <colgroup>
            {orderedVisibleColumns.map((key) => (
              <col key={`col-${key}`} style={COLUMN_WIDTHS[key] ? { width: COLUMN_WIDTHS[key] } : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {orderedVisibleColumns.map((key) => (
                <Th key={key} className={`col-${key}`}>
                  <ColumnHeader
                    label={t.columns[key] || key}
                    keyName={key}
                    activeKey={sort.key}
                    dir={sort.dir}
                    helpText={t.columnHelp[key]}
                    isOpen={openHeaderKey === key}
                    onToggle={() => setOpenHeaderKey((prev) => (prev === key ? null : key))}
                    onSort={() => doSort(key)}
                    filterType={NUMERIC_COLUMN_KEYS.has(key) ? "numeric" : "categorical"}
                    filterOptions={columnOptionsMap[key]}
                    filterValue={columnFilters[key]}
                    isFilterOpen={openFilterKey === key}
                    onToggleFilter={() => setOpenFilterKey((prev) => (prev === key ? null : key))}
                    onFilterChange={(value) => setColumnFilters((prev) => ({ ...prev, [key]: value }))}
                    onClearFilter={() =>
                      setColumnFilters((prev) => {
                        const next = { ...prev };
                        delete next[key];
                        return next;
                      })
                    }
                    t={t}
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
              const seasonLabel = activeWindow ? (score >= 80 ? t.aligned : t.watch) : "-";
              const seasonTone = !activeWindow ? "off" : score >= 80 ? "aligned" : "watch";
              const rowState = { trendLabel, rsi, score, seasonLabel, seasonTone, profileStatus: computeProfileStatus(x, profile) };

              return (
                <tr key={x.ticker}>
                  {orderedVisibleColumns.map((key) => <Fragment key={`${x.ticker}-${key}`}>{renderCell(key, x, rowState)}</Fragment>)}
                </tr>
              );
            })}

            {!filtered.length && !loading && (
              <tr>
                <td colSpan={Math.max(orderedVisibleColumns.length, 1)} className="loadingBox">{t.noResults}</td>
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
                <div className="hint">Proxy di rotazione, non flussi netti certificati: Yahoo Finance non rileva sottoscrizioni o riscatti. Ogni classifica usa il rendimento del periodo scelto; 1G, 3G, 1S e 1M permettono di distinguere spinta recente e trend consolidato.</div>
              </div>
              <button className="button" onClick={() => setFlowOpen(false)}>{t.modalClose}</button>
            </div>
            <div className="tabs flowTabs">
              {FLOW_PERIODS.map((period) => <button key={period.key} className={`tab ${flowPeriod === period.key ? "active" : ""}`} onClick={() => setFlowPeriod(period.key)}>{period.label}</button>)}
            </div>
            <div className="flowGrid">
              <div className="flowPanel">
                <h3>{t.flowIn} (Top {CAPITAL_FLOW_LIMIT})</h3>
                {selectedFlow.inflow.length ? (
                  selectedFlow.inflow.map((item) => (
                    <div key={item.ticker} className="flowRow">
                      <span><strong>{item.ticker}</strong> · {item.name}<small>{item.category} · Score {fmt(item.score, 0)} · RVOL {item.rvol == null ? "-" : `${fmt(item.rvol, 1)}x`}</small><FlowReturns item={item} /></span>
                      <strong className={cls(item[flowPeriod])}>{pct(item[flowPeriod])}</strong>
                    </div>
                  ))
                ) : (
                  <div className="muted">{t.noData}</div>
                )}
              </div>
              <div className="flowPanel">
                <h3>{t.flowOut} (Top {CAPITAL_FLOW_LIMIT})</h3>
                {selectedFlow.outflow.length ? (
                  selectedFlow.outflow.map((item) => (
                    <div key={item.ticker} className="flowRow">
                      <span><strong>{item.ticker}</strong> · {item.name}<small>{item.category} · Score {fmt(item.score, 0)} · RVOL {item.rvol == null ? "-" : `${fmt(item.rvol, 1)}x`}</small><FlowReturns item={item} /></span>
                      <strong className={cls(item[flowPeriod])}>{pct(item[flowPeriod])}</strong>
                    </div>
                  ))
                ) : (
                  <div className="muted">{t.noData}</div>
                )}
              </div>
            </div>
            <div className="flowGrid">
              <div className="flowPanel">
                <h3>Forza media categorie</h3>
                {capitalFlow.categoryDemand.map((item) => (
                  <div key={item.category} className="flowRow"><span><strong>{item.category}</strong><small>{item.count} ETF · RVOL medio {item.rvol == null ? "-" : `${fmt(item.rvol, 1)}x`} · score medio {fmt(item.score, 0)}</small></span><strong className={cls(item.value)}>{pct(item.value)}</strong></div>
                ))}
              </div>
              <div className="flowPanel">
                <h3>Lettura del segnale</h3>
                <div className="hint">Un ETF presente in alto su 1G/3G ma debole su 1S/1M sta rimbalzando nel breve. Un ETF forte anche su 1S e 1M mostra una rotazione piu persistente. I segnali divergenti non misurano flussi reali di capitale.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {purchaseDraft && <PurchaseModal t={t} draft={purchaseDraft} onChange={setPurchaseDraft} onConfirm={savePurchase} onClose={() => setPurchaseDraft(null)} />}

      {simulationsOpen && <SimulationsModal t={t} lang={lang} simulations={simulations} rows={rows} onClose={() => setSimulationsOpen(false)} onRemove={(id) => setSimulations((current) => current.filter((item) => item.id !== id))} />}

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

      {columnPickerOpen && (
        <ColumnSelectorModal
          t={t}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
          onPresetEssential={applyEssentialColumns}
          onPresetAll={applyAllColumns}
          onClose={() => setColumnPickerOpen(false)}
        />
      )}

      {guideOpen && <GuideModal t={t} initialView={guideView} onClose={() => setGuideOpen(false)} />}

      {profileOpen && <ProfileSettingsModal profile={profile} onChange={setProfile} onClose={() => setProfileOpen(false)} />}

      {statusModal && (
        <StatusModal
          t={t}
          lang={lang}
          data={statusModal}
          onClose={() => setStatusModal(null)}
        />
      )}

      {analysisModal && <MetricAnalysisModal data={analysisModal} lang={lang} onClose={() => setAnalysisModal(null)} />}

      {cookieConsent == null && (
        <CookieConsentModal
          t={t}
          onAccept={() => onCookieConsent("accepted")}
          onReject={() => onCookieConsent("rejected")}
        />
      )}

      {tourStep != null && <GuidedTour step={tourStep} onChange={setTourStep} onClose={() => { writeCookieJson(COOKIE_TOUR_COMPLETED, true); setTourStep(null); }} />}

      <footer className="legalFooter">
        <h3>{t.legalTitle}</h3>
        <p>{t.legalBody}</p>
        <p>{t.legalBody2}</p>
        <p className="dataSourceNote">{t.dataSourceNote}</p>
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

function ColumnHeader({
  label,
  keyName,
  activeKey,
  dir,
  helpText,
  isOpen,
  onToggle,
  onSort,
  filterType,
  filterOptions,
  filterValue,
  isFilterOpen,
  onToggleFilter,
  onFilterChange,
  onClearFilter,
  t,
}) {
  const isActive = activeKey === keyName;
  const sortChar = isActive ? (dir > 0 ? "▲" : "▼") : "↕";
  const hasFilter = filterType === "numeric"
    ? !!(filterValue && (filterValue.min !== "" && filterValue.min != null || filterValue.max !== "" && filterValue.max != null))
    : !!(filterValue && filterValue.length);

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
        <span>{label}</span>
      </button>
      <button
        type="button"
        className={`sortArrowButton ${isActive ? "active" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          onSort();
        }}
        aria-label={`Sort by ${label}`}
        title={`Sort by ${label}`}
      >
        <span className={`sortArrow ${isActive ? "active" : ""}`}>{sortChar}</span>
      </button>
      {filterType && (
        <button
          type="button"
          className={`filterButton ${hasFilter ? "active" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFilter();
          }}
          aria-label={t.filterButtonLabel}
          title={t.filterButtonLabel}
        >
          <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
            <path d="M1 1.8h14L9.6 8.4v5l-3.2 1.8v-6.8L1 1.8z" fill="currentColor" />
          </svg>
        </button>
      )}
      {isOpen && <span className="headerTooltip" role="tooltip">{helpText || label}</span>}
      {isFilterOpen && (
        <ColumnFilterPanel
          type={filterType}
          options={filterOptions || []}
          value={filterValue}
          onChange={onFilterChange}
          onClear={onClearFilter}
          t={t}
        />
      )}
    </span>
  );
}

function ColumnFilterPanel({ type, options, value, onChange, onClear, t }) {
  const [query, setQuery] = useState("");

  if (type === "numeric") {
    const min = value?.min ?? "";
    const max = value?.max ?? "";
    return (
      <div className="headerTooltip filterPanel" role="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="filterRangeRow">
          <input
            type="number"
            className="filterRangeInput"
            placeholder={t.filterMin}
            value={min}
            onChange={(e) => onChange({ min: e.target.value, max })}
          />
          <input
            type="number"
            className="filterRangeInput"
            placeholder={t.filterMax}
            value={max}
            onChange={(e) => onChange({ min, max: e.target.value })}
          />
        </div>
        <button type="button" className="button small ghost" onClick={onClear}>{t.filterClear}</button>
      </div>
    );
  }

  const selected = value || [];
  const q = query.trim().toLowerCase();
  const filteredOptions = q ? options.filter((o) => String(o).toLowerCase().includes(q)) : options;

  function toggle(opt) {
    onChange(selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt]);
  }

  return (
    <div className="headerTooltip filterPanel" role="dialog" onClick={(e) => e.stopPropagation()}>
      {options.length > 8 && (
        <input
          className="filterSearchInput"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.filterSearchPlaceholder}
        />
      )}
      <div className="multiOptions filterOptionsList">
        {filteredOptions.map((opt) => (
          <label key={opt} className="multiOption">
            <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
            <span>{opt}</span>
          </label>
        ))}
        {!filteredOptions.length && <div className="muted">{t.filterNoOptions}</div>}
      </div>
      <button type="button" className="button small ghost" onClick={() => onChange([])}>{t.filterClear}</button>
    </div>
  );
}

function Th({ children, className }) {
  return <th className={className}>{children}</th>;
}

function FlowReturns({ item }) {
  return (
    <small className="flowReturns">
      {FLOW_PERIODS.map((period) => <span key={period.key}>{period.label} <strong className={cls(item[period.key])}>{pct(item[period.key])}</strong></span>)}
    </small>
  );
}

function PurchaseModal({ t, draft, onChange, onConfirm, onClose }) {
  const valid = Number(draft.quantity) > 0 && Number(draft.price) > 0;
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal purchaseModal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modalHead"><div><h2>{t.buyTitle}</h2><div className="hint">{draft.row.ticker} · {draft.row.name}</div></div><button className="button" onClick={onClose}>{t.modalClose}</button></div>
        <div className="purchaseFields">
          <Field label={t.buyQuantity}><input autoFocus type="number" min="0.0001" step="any" value={draft.quantity} onChange={(event) => onChange({ ...draft, quantity: event.target.value })} /></Field>
          <Field label={`${t.buyPrice} (${draft.row.currency || "-"})`}><input type="number" min="0.0001" step="any" value={draft.price} onChange={(event) => onChange({ ...draft, price: event.target.value })} /></Field>
        </div>
        <button className="button primary" disabled={!valid} onClick={onConfirm}>{t.buyConfirm}</button>
      </div>
    </div>
  );
}

function SimulationsModal({ t, lang, simulations, rows, onClose, onRemove }) {
  const currentByTicker = new Map(rows.filter((row) => row.ok).map((row) => [row.ticker, row]));
  const locale = lang === "it" ? "it-IT" : "en-US";
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal simulationsModal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modalHead"><div><h2>{t.simulationsTitle}</h2><div className="hint">{t.simulationsHint}</div></div><button className="button" onClick={onClose}>{t.modalClose}</button></div>
        {!simulations.length ? <div className="loadingBox">{t.noData}</div> : <div className="simulationList">
          {simulations.map((simulation) => {
            const current = currentByTicker.get(simulation.ticker)?.price;
            const invested = simulation.quantity * simulation.purchasePrice;
            const currentValue = Number.isFinite(Number(current)) ? simulation.quantity * current : null;
            const returnValue = currentValue == null ? null : ((currentValue / invested) - 1) * 100;
            const frozen = simulation.snapshot;
            return <section className="simulationRow" key={simulation.id}>
              <div className="simulationMain"><strong>{simulation.ticker}</strong><span>{simulation.name}</span><small>{t.simulationDate}: {new Date(simulation.purchasedAt).toLocaleDateString(locale)} · {simulation.quantity} x {formatPrice(simulation.purchasePrice, simulation.currency)}</small></div>
              <div className="simulationValues"><span>{t.currentPrice}<strong>{formatPrice(current, simulation.currency)}</strong></span><span>{t.investment}<strong>{formatPrice(invested, simulation.currency)}</strong></span><span>{t.currentValue}<strong>{formatPrice(currentValue, simulation.currency)}</strong></span><span>{t.returnSinceBuy}<strong className={cls(returnValue)}>{pct(returnValue)}</strong></span></div>
              <div className="frozenMetrics"><strong>{t.frozenMetrics}</strong><span>Score {frozen.score ?? "-"} · {frozen.trendLabel || frozen.trend || "-"} · {t.statusLabels[frozen.profileStatus?.status] || frozen.profileStatus?.status || "-"}</span><small>RSI {fmt(frozen.rsi14, 1)} · 1M {pct(frozen.monthReturn)} · RVOL {fmt(frozen.relativeVolume, 1)}x · Vol 20D {fmt(frozen.volatility20d, 1)}%</small></div>
              <button className="button small" onClick={() => onRemove(simulation.id)}>{t.removeSimulation}</button>
            </section>;
          })}
        </div>}
      </div>
    </div>
  );
}

function StatusModal({ t, lang, data, onClose }) {
  const reasons = data.reasons?.[lang] || data.reasons?.it || [];
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal statusModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <div>
            <h2>
              {data.ticker} · <span className={`statusBadge ${statusTone(data.statusKey)}`}>{t.statusLabels[data.statusKey] || data.statusKey}</span>
            </h2>
            <div className="hint">{data.name} — {t.statusModalHint}</div>
            <div className="hint">Profilo: {data.profileMode === "long" ? "Long term" : data.profileMode === "short" ? "Short term" : "Custom"}</div>
          </div>
          <button className="button" onClick={onClose}>{t.modalClose}</button>
        </div>
        {data.points != null && (
          <div className="hint">{t.statusPointsLabel}: <strong>{data.points}/100</strong> · Strong Buy &gt;=75 · Buy &gt;=55 · Hold &gt;=35 · Sell &lt;35.</div>
        )}
        {data.smaCross && (
          <div className="hint">
            {data.smaCross.regime === "golden" ? "Golden Regime" : "Death Regime"} · ultimo cross: {data.smaCross.lastCrossDate ? new Date(data.smaCross.lastCrossDate).toLocaleDateString(lang === "it" ? "it-IT" : "en-US") : "storico non disponibile"} · {data.smaCross.sessionsSinceCross ?? "-"} sedute · SMA50/SMA200 {fmt(data.smaCross.distancePercent, 1)}%{data.smaCross.isRecent ? " · SEGNALE RECENTE" : ""}
          </div>
        )}
        <div className="analysisGrid">
          {(data.selectedMetrics || []).map((metric) => {
            const detail = profileMetricDetail(metric, data.row);
            return <div className="analysisRow" key={metric}><span><strong>{detail.label}</strong><small>{detail.value} · {detail.rule}</small></span><strong className={detail.points > 0 ? "positive" : detail.points < 0 ? "negative" : "muted"}>{detail.points > 0 ? "+" : ""}{detail.points}</strong></div>;
          })}
        </div>
        <ul className="statusReasonList">
          {reasons.map((reason, idx) => (
            <li key={idx}>{reason}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function profileMetricDetail(metric, row = {}) {
  const value = row[metric];
  const details = {
    trend: ["Trend", row.trend || "-", "Forte = +2; Debole = -2; Neutro = 0", row.trend === "Forte" ? 2 : row.trend === "Debole" ? -2 : 0],
    rsi14: ["RSI 14", fmt(value, 1), "55-69.9 = +2; 45-54.9 = 0; altri valori = -1", value >= 55 && value < 70 ? 2 : value >= 45 && value < 55 ? 0 : -1],
    positive10: ["Positivi 10G", `${value ?? "-"}/10`, ">=7 = +2; 5-6 = 0; <5 = -2", value >= 7 ? 2 : value >= 5 ? 0 : -2],
    positive20: ["Positivi 20G", `${value ?? "-"}/20`, ">=14 = +2; 10-13 = +1; 7-9 = 0; <7 = -2", value >= 14 ? 2 : value >= 10 ? 1 : value >= 7 ? 0 : -2],
    streak: ["Serie positiva 20G", `${value ?? "-"} sedute`, ">=3 = +1; 0 = -1; altrimenti = 0", value >= 3 ? 1 : value === 0 ? -1 : 0],
    distanceSma20: ["Distanza SMA20", `${fmt(value, 1)}%`, "tra -3% e +10% = +1; oltre |20%| = -2; altrimenti = -1", value >= -3 && value <= 10 ? 1 : Math.abs(value) > 20 ? -2 : -1],
    rvol: ["RVOL", `${fmt(row.relativeVolume, 2)}x`, ">=1.3x = +1; <0.7x = -1; altrimenti = 0", row.relativeVolume >= 1.3 ? 1 : row.relativeVolume < 0.7 ? -1 : 0],
    volatility20d: ["Volatilita 20G", `${fmt(value, 1)}%`, "<=18% = +1; >32% = -1; altrimenti = 0", value <= 18 ? 1 : value > 32 ? -1 : 0],
    monthReturn: ["Rendimento 1M", `${fmt(value, 1)}%`, ">+3% = +1; <-3% = -1; altrimenti = 0", value > 3 ? 1 : value < -3 ? -1 : 0],
    dailyReturn: ["Rendimento 1G", `${fmt(value, 1)}%`, ">0% = +1; <0% = -1", value > 0 ? 1 : value < 0 ? -1 : 0],
    threeDayReturn: ["Rendimento 3G", `${fmt(value, 1)}%`, ">0% = +1; <0% = -1", value > 0 ? 1 : value < 0 ? -1 : 0],
    weekReturn: ["Rendimento 1S", `${fmt(value, 1)}%`, ">0% = +1; <0% = -1", value > 0 ? 1 : value < 0 ? -1 : 0],
    distance52wHigh: ["Distanza massimo 52S", `${fmt(value, 1)}%`, ">=-5% = +1; <-30% = -1; altrimenti = 0", value >= -5 ? 1 : value < -30 ? -1 : 0],
    maxDrawdown52w: ["Drawdown massimo 52S", `${fmt(value, 1)}%`, ">=-12% = +1; <-30% = -1; altrimenti = 0", value >= -12 ? 1 : value < -30 ? -1 : 0],
    distanceSma200: ["Distanza SMA200", `${fmt(value, 1)}%`, "tra -8% e -3% = +2; tra -3% e +8% = +1; <-15% = -1", value >= -8 && value <= -3 ? 2 : value >= -3 && value <= 8 ? 1 : value < -15 ? -1 : 0],
    smaCross: ["Cross SMA50/200", row.smaCross?.regime || "-", "Golden = +2; Death = -2", row.smaCross?.regime === "golden" ? 2 : row.smaCross?.regime === "death" ? -2 : 0],
    drawdownFromAth: ["Drawdown da ATH", `${fmt(value, 1)}%`, "<=-25% = +2; <=-15% = +1; <=-5% = 0; altrimenti = -1", value <= -25 ? 2 : value <= -15 ? 1 : value <= -5 ? 0 : -1],
    range52wPosition: ["Posizione 52W", `${fmt(value, 1)}%`, "20%-40% = +2; <20% = +1; >80% = -1", value >= 20 && value <= 40 ? 2 : value < 20 ? 1 : value > 80 ? -1 : 0],
    year1Return: ["Rendimento 1Y", `${fmt(value, 1)}%`, ">+8% = +1; <0% = -1; altrimenti = 0", value > 8 ? 1 : value < 0 ? -1 : 0],
    quality: ["Qualita fondo", `${value ?? 0}/5`, ">=3 = +1; <=1 = -1; altrimenti = 0", value >= 3 ? 1 : value <= 1 ? -1 : 0],
  };
  const [label, formattedValue, rule, points] = details[metric] || [metric, "-", "Nessuna regola", 0];
  return { label, value: formattedValue, rule, points };
}

function MetricAnalysisModal({ data, lang, onClose }) {
  const row = data.row;
  const isTrend = data.type === "trend";
  const scoreParts = [
    ["Prezzo > SMA20", row.price != null && row.sma20 != null, row.price > row.sma20 ? 12 : 0],
    ["SMA20 > SMA50", row.sma20 != null && row.sma50 != null, row.sma20 > row.sma50 ? 10 : 0],
    ["SMA50 > SMA200", row.sma50 != null && row.sma200 != null, row.sma50 > row.sma200 ? 10 : 0],
    ["RSI14", row.rsi14 != null, row.rsi14 == null ? 0 : Math.min(Math.max((row.rsi14 - 35) / 1.3, 0), 20)],
    ["Positivi 20G", row.positive20 != null, row.positive20 == null ? 0 : Math.min(Math.max((row.positive20 / 20) * 18, 0), 18)],
    ["RVOL", row.relativeVolume != null, row.relativeVolume == null ? 0 : Math.min(Math.max((row.relativeVolume - 0.8) * 12, 0), 10)],
    ["Volatilita 20G", row.volatility20d != null, row.volatility20d == null ? 0 : Math.min(Math.max((35 - row.volatility20d) * 0.16, 0), 10)],
    ["Distanza SMA20", row.distanceSma20 != null, row.distanceSma20 == null ? 0 : Math.min(Math.max((30 - Math.abs(row.distanceSma20)) * 0.25, 0), 10)],
    ["Qualita fondo", row.quality != null, row.quality || 0],
  ];
  const strong = row.price > row.sma20 && row.sma20 > row.sma50 && row.sma50 > row.sma200;
  const weak = row.price <= row.sma20 && row.price <= row.sma50 && row.sma20 <= row.sma50;
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal statusModal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modalHead"><div><h2>{row.ticker} · {isTrend ? `Trend ${data.trendLabel}` : `Score ${data.score}`}</h2><div className="hint">{row.name}</div></div><button className="button" onClick={onClose}>{lang === "it" ? "Chiudi" : "Close"}</button></div>
        {isTrend ? (
          <>
            <p className="hint">Regola: Forte se Prezzo &gt; SMA20 &gt; SMA50 &gt; SMA200. Debole se Prezzo &lt;= SMA20, Prezzo &lt;= SMA50 e SMA20 &lt;= SMA50. Altrimenti Neutro.</p>
            <ul className="statusReasonList">
              <li>Prezzo {fmt(row.price, 2)} {row.price > row.sma20 ? ">" : "<="} SMA20 {fmt(row.sma20, 2)}.</li>
              <li>SMA20 {fmt(row.sma20, 2)} {row.sma20 > row.sma50 ? ">" : "<="} SMA50 {fmt(row.sma50, 2)}.</li>
              <li>SMA50 {fmt(row.sma50, 2)} {row.sma50 > row.sma200 ? ">" : "<="} SMA200 {fmt(row.sma200, 2)}.</li>
              <li><strong>{strong ? "Tutte le condizioni rialziste sono vere: Trend Forte." : weak ? "Tutte le condizioni ribassiste sono vere: Trend Debole." : "Le condizioni non sono completamente allineate: Trend Neutro."}</strong></li>
            </ul>
          </>
        ) : (
          <>
            <p className="hint">Score = somma delle componenti seguenti, limitata tra 0 e 100. La stagionalita non entra nel calcolo.</p>
            <div className="analysisGrid">
              {scoreParts.map(([label, available, points]) => <div className="analysisRow" key={label}><span>{label}<small>{available ? scoreInputValue(label, row) : "dato non disponibile"}</small></span><strong>{available ? `+${Number(points).toFixed(1)}` : "-"}</strong></div>)}
            </div>
            <p className="hint"><strong>Totale calcolato: {Math.round(scoreParts.reduce((total, [, available, points]) => total + (available ? points : 0), 0))}</strong> · Score esposto: {data.score}. Eventuali decimali vengono arrotondati dal backend.</p>
          </>
        )}
      </div>
    </div>
  );
}

function scoreInputValue(label, row) {
  if (label === "Prezzo > SMA20") return `Prezzo ${fmt(row.price, 2)} / SMA20 ${fmt(row.sma20, 2)}`;
  if (label === "SMA20 > SMA50") return `SMA20 ${fmt(row.sma20, 2)} / SMA50 ${fmt(row.sma50, 2)}`;
  if (label === "SMA50 > SMA200") return `SMA50 ${fmt(row.sma50, 2)} / SMA200 ${fmt(row.sma200, 2)}`;
  if (label === "RSI14") return `RSI ${fmt(row.rsi14, 1)}: max(0, min(20, (RSI - 35) / 1.3))`;
  if (label === "Positivi 20G") return `${row.positive20}/20: max(0, min(18, Positivi / 20 * 18))`;
  if (label === "RVOL") return `${fmt(row.relativeVolume, 2)}x: max(0, min(10, (RVOL - 0.8) * 12))`;
  if (label === "Volatilita 20G") return `${fmt(row.volatility20d, 1)}%: max(0, min(10, (35 - Vol) * 0.16))`;
  if (label === "Distanza SMA20") return `${fmt(row.distanceSma20, 1)}%: max(0, min(10, (30 - |Dist|) * 0.25))`;
  return `Punteggio qualita ${row.quality || 0}/5 (AUM, TER, eta fondo)`;
}

function ColumnSelectorModal({ t, visibleColumns, onToggleColumn, onPresetEssential, onPresetAll, onClose }) {
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal columnModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <div>
            <h2>{t.columnsTitle}</h2>
            <div className="hint">{t.columnsHint}</div>
          </div>
          <button className="button" onClick={onClose}>{t.closeColumns}</button>
        </div>
        <div className="columnActions">
          <button className="button small" onClick={onPresetEssential}>{t.presetEssential}</button>
          <button className="button small" onClick={onPresetAll}>{t.presetAll}</button>
        </div>
        <div className="columnGrid">
          {ALL_COLUMN_KEYS.map((key) => (
            <label key={key} className="columnOption">
              <input
                type="checkbox"
                checked={visibleColumns.includes(key)}
                onChange={() => onToggleColumn(key)}
              />
              <span>{t.columns[key] || key}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function GuideModal({ t, initialView = "guide", onClose }) {
  const guide = t.guide;
  const [view, setView] = useState(initialView);
  const isMetricDetail = view !== "guide" && view !== "metrics" && !!t.metricDetails[view];

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal guideModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <div>
            <h2>{guide.title}</h2>
            <div className="hint">{guide.intro}</div>
          </div>
          <div className="guideHeadActions">
            {view !== "guide" && (
              <button className="button small" onClick={() => setView(isMetricDetail ? "metrics" : "guide")}>
                {isMetricDetail ? guide.backToMetrics : guide.backToGuide}
              </button>
            )}
            <button className="button" onClick={onClose}>{guide.close}</button>
          </div>
        </div>

        {view === "guide" && (
          <>
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
            <button type="button" className="button primary" style={{ marginTop: 12 }} onClick={() => setView("metrics")}>
              {guide.metricsButton}
            </button>
          </>
        )}

        {view === "metrics" && (
          <>
            <div className="hint">{guide.metricsIntro}</div>
            <div className="metricGrid">
              {ALL_COLUMN_KEYS.map((key) => (
                <button key={key} type="button" className="metricChip" onClick={() => setView(key)}>
                  {t.columns[key] || key}
                </button>
              ))}
            </div>
          </>
        )}

        {isMetricDetail && (
          <div className="metricDetailCard">
            <h3>{t.columns[view] || view}</h3>
            <p><strong>{guide.metricFormulaLabel}</strong> {t.metricDetails[view].formula}</p>
            <p><strong>{guide.metricPurposeLabel}</strong> {t.metricDetails[view].purpose}</p>
            <p><strong>{guide.metricExampleLabel}</strong> {t.metricDetails[view].example}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileSettingsModal({ profile, onChange, onClose }) {
  const labels = {
    trend: "Trend", rsi14: "RSI 14", positive10: "Positivi 10G", positive20: "Positivi 20G", streak: "Serie positiva 20G", distanceSma20: "Distanza SMA20", rvol: "RVOL", volatility20d: "Volatilita 20G", dailyReturn: "Rendimento 1G", threeDayReturn: "Rendimento 3G", weekReturn: "Rendimento 1S", monthReturn: "Rendimento 1M", distance52wHigh: "Distanza massimo 52S", maxDrawdown52w: "Drawdown massimo 52S",
    distanceSma200: "Distanza SMA200", smaCross: "Cross SMA50/SMA200", drawdownFromAth: "Drawdown da ATH", range52wPosition: "Posizione range 52W", year1Return: "Rendimento 1Y", quality: "Qualita fondo",
  };
  const metrics = CUSTOM_METRICS;
  function setMode(mode) {
    onChange(normalizeProfile({ mode, selectedMetrics: mode === "custom" ? profile.selectedMetrics : undefined }));
  }
  function toggleMetric(metric) {
    const current = profile.selectedMetrics || [];
    const selectedMetrics = current.includes(metric) ? current.filter((item) => item !== metric) : [...current, metric];
    onChange(normalizeProfile({ mode: "custom", selectedMetrics }));
  }
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal columnModal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modalHead"><div><h2>Impostazioni status</h2><div className="hint">Lo status usa solo le metriche del profilo selezionato.</div></div><button className="button" onClick={onClose}>Chiudi</button></div>
        <div className="tabs">
          <button className={`tab ${profile.mode === "long" ? "active" : ""}`} onClick={() => setMode("long")}>Long term</button>
          <button className={`tab ${profile.mode === "short" ? "active" : ""}`} onClick={() => setMode("short")}>Short term</button>
          <button className={`tab ${profile.mode === "custom" ? "active" : ""}`} onClick={() => setMode("custom")}>Custom</button>
        </div>
        {profile.mode === "custom" && <div className="columnGrid">{metrics.map((metric) => <label key={metric} className="columnOption"><input type="checkbox" checked={profile.selectedMetrics.includes(metric)} onChange={() => toggleMetric(metric)} /><span>{labels[metric]}</span></label>)}</div>}
      </div>
    </div>
  );
}

function GuidedTour({ step, onChange, onClose }) {
  const [position, setPosition] = useState(null);
  const steps = [
    { target: "filters", title: "Filtri", body: "Cerca ETF, restringi per categoria, AUM, TER e stagionalita. Solo watchlist mostra esclusivamente i titoli salvati." },
    { target: "term", title: "Term", body: "Scegli Long, Short o Custom. Lo status di ogni ETF usa le metriche del profilo selezionato." },
    { target: "actions", title: "Strumenti", body: "Personalizza le colonne, aggiorna le quotazioni, consulta la rotazione relativa e analizza la stagionalita degli ETF filtrati." },
    { target: "table", title: "Tabella ETF", body: "Clicca ticker, Trend, Score o Status per il dettaglio della riga. La stella aggiunge o rimuove l'ETF dalla watchlist." },
  ];
  const current = steps[step];

  useEffect(() => {
    function placeBubble() {
      const target = document.querySelector(`[data-tour="${current.target}"]`);
      if (!target) return setPosition(null);
      target.scrollIntoView({ block: "center" });
      const rect = target.getBoundingClientRect();
      setPosition({
        focus: { top: Math.max(6, rect.top - 6), left: Math.max(6, rect.left - 6), width: Math.min(window.innerWidth - 12, rect.width + 12), height: Math.min(window.innerHeight - 12, rect.height + 12) },
        top: Math.min(window.innerHeight - 210, Math.max(16, rect.bottom + 14)),
        left: Math.min(window.innerWidth - 360, Math.max(16, rect.left)),
      });
    }
    placeBubble();
    window.addEventListener("resize", placeBubble);
    window.addEventListener("scroll", placeBubble, true);
    return () => {
      window.removeEventListener("resize", placeBubble);
      window.removeEventListener("scroll", placeBubble, true);
    };
  }, [current.target]);

  return (
    <div className="tourLayer" role="dialog" aria-modal="true" aria-label="Tour guidato">
      {position && <div className="tourFocus" style={position.focus} />}
      {position && <div className="tourBubble" style={{ top: position.top, left: position.left }}><div className="tourCount">{step + 1} / {steps.length}</div><h2>{current.title}</h2><p>{current.body}</p><div className="tourActions"><button className="button small ghost" onClick={onClose}>Chiudi tour</button><button className="button small primary" onClick={() => step === steps.length - 1 ? onClose() : onChange(step + 1)}>{step === steps.length - 1 ? "Fine" : "Avanti"}</button></div></div>}
    </div>
  );
}

function CookieConsentModal({ t, onAccept, onReject }) {
  return (
    <div className="modalBackdrop" onMouseDown={onReject}>
      <div className="modal cookieModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <div>
            <h2>{t.cookieTitle}</h2>
            <div className="hint">{t.cookieBody}</div>
          </div>
        </div>
        <div className="cookieActions">
          <button className="button small primary" onClick={onAccept}>{t.cookieAccept}</button>
          <button className="button small" onClick={onReject}>{t.cookieReject}</button>
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
            <div className="hint">Mercato di riferimento: SPY/SMA200 · regime attuale: <strong className={data.benchmark?.regime === "bull" ? "positive" : "negative"}>{data.benchmark?.regime === "bull" ? "Bull" : data.benchmark?.regime === "bear" ? "Bear" : "n/d"}</strong>. Le tabelle separano i campioni storici per regime.</div>
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
              <th>Bull {t.average}</th>
              <th>Bull N</th>
              <th>Bear {t.average}</th>
              <th>Bear N</th>
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
                <td className={cls(s.bull?.avg)}>{pct(s.bull?.avg)}</td>
                <td>{s.bull?.samples ?? 0}</td>
                <td className={cls(s.bear?.avg)}>{pct(s.bear?.avg)}</td>
                <td>{s.bear?.samples ?? 0}</td>
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
                  <th>Bull {t.average}</th>
                  <th>Bull N</th>
                  <th>Bear {t.average}</th>
                  <th>Bear N</th>
                </tr>
              </thead>
              <tbody>
                {(data.monthly?.[w] || []).map((m) => (
                  <tr key={m.month}>
                    <td>{t.months[m.month - 1]}</td>
                    <td className={cls(m.avg)}>{pct(m.avg)}</td>
                    <td>{m.successRate?.toFixed(1) ?? "-"}%</td>
                    <td>{m.samples}</td>
                    <td className={cls(m.bull?.avg)}>{pct(m.bull?.avg)}</td>
                    <td>{m.bull?.samples ?? 0}</td>
                    <td className={cls(m.bear?.avg)}>{pct(m.bear?.avg)}</td>
                    <td>{m.bear?.samples ?? 0}</td>
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

function statusTone(statusKey) {
  if (statusKey === "strong_buy") return "strongBuy";
  if (statusKey === "buy") return "buy";
  if (statusKey === "sell") return "sell";
  return "hold";
}
