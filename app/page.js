"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const PAGE_SIZE = 25;
const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

const pct = (v) => v == null || !Number.isFinite(Number(v)) ? "-" : `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`;
const cls = (v) => v == null ? "muted" : Number(v) > 0 ? "positive" : Number(v) < 0 ? "negative" : "muted";
const formatAum = (v,c) => { if(v==null) return "-"; const n=Number(v); const x=Math.abs(n); let s=x>=1e12?(n/1e12).toFixed(2)+" T":x>=1e9?(n/1e9).toFixed(2)+" B":x>=1e6?(n/1e6).toFixed(1)+" M":n.toLocaleString("it-IT"); return s+(c?` ${c}`:""); };
const formatDateKey = (key) => { if(!key) return "-"; const [m,d]=String(key).split("-"); return m&&d?`${d}/${m}`:key; };
const formatIsoDate = (value) => { if(!value) return "-"; const d=new Date(value); return Number.isFinite(d.getTime())?new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"UTC"}).format(d):"-"; };
const formatAge = (v) => v==null||!Number.isFinite(Number(v))?"-":Number(v)<1?"< 1 anno":`${Number(v).toFixed(1)} anni`;
const fmt = (v, digits = 2) => v == null || !Number.isFinite(Number(v)) ? "-" : Number(v).toFixed(digits);

const COLUMN_HELP = {
  ticker: "Ticker o simbolo del fondo, ad esempio VTI, SPY o QQQ. Serve a individuare subito il titolo e confrontarlo con ETF simili senza dover leggere il nome completo.",
  name: "Nome ufficiale del fondo, come Vanguard S&P 500 ETF. Aiuta a capire il target di investimento e a distinguere ETF con ticker simili ma strategie diverse.",
  isin: "Codice ISIN internazionale, per esempio US9229087690. È utile per ricerche precise, confronti tra broker e verifiche di correttezza del titolo.",
  category: "Categoria o area di investimento, come equities, bonds o commodity. Serve a filtrare ETF per stile di portafoglio e scoprire dove si colloca il fondo.",
  trend: "Direzione del trend rispetto alle medie mobili. Esempio: se il prezzo è sopra SMA20, SMA50 e SMA200, di solito il trend è più forte; se è sotto, è più debole e da monitorare.",
  rsi14: "Indicatore di forza relativa su 14 periodi. Esempio: RSI 62 indica slancio positivo e ancora spazio, mentre RSI 28 suggerisce debolezza estrema e possibile pressione di vendita.",
  positive10: "Numero di sedute positive negli ultimi 10 giorni. Esempio: 7/10 significa che il fondo ha perso pochi giorni di impulso e il trend è abbastanza solido da sostenere il movimento.",
  positive20: "Numero di sedute positive negli ultimi 20 giorni. Esempio: 14/20 indica un trend persistente; 6/20 invece segnala un movimento molto più fragile e meno affidabile.",
  streak: "Numero di sedute consecutive positive negli ultimi 20 giorni. Esempio: 12/20 significa che il trend è molto coerente e continuo; 3/20 indica un movimento più stop-and-go e meno affidabile.",
  distanceSma20: "Differenza percentuale tra prezzo e SMA20. Esempio: +4% significa che il titolo è sopra la media di breve termine, mentre -6% può indicare che è abbastanza lontano dalla media e più vulnerabile.",
  rvol: "Volume relativo rispetto alla media dei 20 giorni. Esempio: 2.3x vuol dire che oggi si è scambiato 2,3 volte il volume medio: è un segnale di partecipazione reale sul movimento.",
  volatility20d: "Volatilità recente annualizzata. Esempio: un fondo a 18 è molto meno turbolento di uno a 35; questo aiuta a capire il rischio del movimento e il rapporto rischio/rendimento.",
  distance52wHigh: "Distanza dal massimo di 52 settimane. Esempio: -2% è vicino al top, mentre -30% indica distacco forte e possibile recupero o debolezza più marcata da verificare.",
  maxDrawdown52w: "Massimo drawdown negli ultimi 52 settimane. Esempio: -18% indica che il fondo ha perso un quarto del suo recupero recente; -40% è molto più critico e va interpretato come debolezza di fondo.",
  netAssets: "Dimensione dell'ETF in AUM. Esempio: 10 miliardi è molto più liquido e solido di 100 milioni; fondi più piccoli possono essere più volatili e meno profondi.",
  score: "Punteggio sintetico da 0 a 100. Esempio: 82 indica setup molto interessante; 46 vuol dire che il fondo è debole o poco convincente tra i parametri analizzati.",
  dailyReturn: "Rendimento dell'ultimo giorno. Esempio: +1.4% in 1 giorno può essere un movimento forte, ma va sempre controllato insieme a trend e RSI per non confonderlo con un rally breve e poco stabile.",
  threeDayReturn: "Rendimento di 3 sedute. Esempio: +4% in 3 giorni è molto più solido di +1.2% in un solo giorno e aiuta a distinguere un breakout vero da un rimbalzo superficiale.",
  weekReturn: "Rendimento delle ultime 5 sedute. Esempio: +3% in 1 settimana mostra ancora slancio, mentre un +1.5% dopo un rally più forte segnala che la forza sta rallentando.",
  monthReturn: "Rendimento negli ultimi 30 giorni. Esempio: +8% in 1 mese indica slancio di medio periodo; se combiniamo questo con RSI e trend, capiamo se il movimento è davvero sostenuto.",
  seasonality: "Stagionalità attiva rispetto alle finestre storiche favorevoli. Esempio: una finestra con 80% di successo sul 10-15-20 anni può essere molto interessante se il trend è anche positivo.",
  borsa: "Mercato di quotazione del fondo, come NYSE, NASDAQ o XETRA. Serve a capire dove si scambia e se il titolo è domestico, americano o internazionale."
};

function scoreTone(value) {
  if (value == null) return "neutral";
  if (value >= 85) return "excellent";
  if (value >= 70) return "good";
  if (value >= 55) return "watch";
  return "weak";
}

function trendTone(value) {
  const label = String(value || "").trim();
  if (label === "Forte") return "strong";
  if (label === "Neutro") return "neutral";
  return "weak";
}

function tooltip(title, body) {
  return `${title}: ${body}`;
}

export default function Home() {
  const [rows,setRows]=useState([]); const [total,setTotal]=useState(0); const [loading,setLoading]=useState(true); const [loaded,setLoaded]=useState(0); const [error,setError]=useState("");
  const [sort,setSort]=useState({key:"score",dir:-1}); const [search,setSearch]=useState(""); const [only,setOnly]=useState(""); const [excluded,setExcluded]=useState([]); const [minAum,setMinAum]=useState(""); const [maxTer,setMaxTer]=useState(""); const [missing,setMissing]=useState("include");
  const [seasonCache,setSeasonCache]=useState({}); const [modal,setModal]=useState(null); const [modalLoading,setModalLoading]=useState(false); const [scanProgress,setScanProgress]=useState(null); const [minSuccess,setMinSuccess]=useState(60); const [flowOpen,setFlowOpen]=useState(false);
  const abortRef=useRef(null);

  async function loadAll(force=false){
    abortRef.current?.abort(); const controller=new AbortController(); abortRef.current=controller;
    setRows([]); setTotal(0); setLoaded(0); setLoading(true); setError("");
    try{
      let page=1, hasMore=true, acc=[];
      while(hasMore){
        const r=await fetch(`/api/etfs?page=${page}&pageSize=${PAGE_SIZE}${force?"&refresh=1":""}`,{signal:controller.signal,cache:"no-store"});
        if(!r.ok) throw new Error(`API ETF ${r.status}`);
        const out=await r.json(); setTotal(out.total); acc=[...acc,...out.data]; setRows(acc); setLoaded(acc.length); hasMore=out.hasMore; page++;
      }
    }catch(e){ if(e.name!=="AbortError") setError(e.message||String(e)); } finally{ setLoading(false); }
  }
  useEffect(()=>{loadAll(false); return()=>abortRef.current?.abort();},[]);

  const categories=useMemo(()=>[...new Set(rows.flatMap(r=>r.categories||[]))].sort(),[rows]);
  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase(); const min=minAum===""?null:Number(minAum)*1e6; const mt=maxTer===""?null:Number(maxTer); const ex=new Set(excluded);
    const data=rows.filter(x=>{
      if(!x.ok) return false;
      const isin=(x.isin||"").toLowerCase();
      if(q && !x.ticker.toLowerCase().includes(q) && !(x.name||"").toLowerCase().includes(q) && !(x.categories||[]).some(c=>c.toLowerCase().includes(q)) && !isin.includes(q)) return false;
      if(only && !(x.categories||[]).includes(only)) return false;
      if((x.categories||[]).some(c=>ex.has(c))) return false;
      if(min!=null && (x.netAssets==null ? missing!=="include" : x.netAssets<min)) return false;
      if(mt!=null && (x.ter==null ? missing!=="include" : x.ter>mt)) return false;
      if(missing==="exclude" && (x.netAssets==null || x.ter==null)) return false;
      return true;
    });
    data.sort((a,b)=>{ const {key,dir}=sort; if(["ticker","name"].includes(key)) return String(a[key]||"").localeCompare(String(b[key]||""))*dir; return ((a[key]??-Infinity)-(b[key]??-Infinity))*dir; }); return data;
  },[rows,search,only,excluded,minAum,maxTer,missing,sort]);

  const capitalFlow = useMemo(() => {
    const ranked = [...rows].filter(x => x.ok && Number.isFinite(Number(x.monthReturn))).sort((a,b) => Number(b.monthReturn ?? 0) - Number(a.monthReturn ?? 0));
    const weak = [...rows].filter(x => x.ok && Number.isFinite(Number(x.monthReturn))).sort((a,b) => Number(a.monthReturn ?? 0) - Number(b.monthReturn ?? 0));
    return {
      inflow: ranked.slice(0, 5).map(x => ({ ticker: x.ticker, name: x.name || x.ticker, value: Number(x.monthReturn ?? 0) })),
      outflow: weak.slice(0, 5).map(x => ({ ticker: x.ticker, name: x.name || x.ticker, value: Number(x.monthReturn ?? 0) }))
    };
  }, [rows]);

  function doSort(key){setSort(s=>s.key===key?{key,dir:-s.dir}:{key,dir:["ticker","name"].includes(key)?1:-1});}
  function clearFilters(){setSearch("");setOnly("");setExcluded([]);setMinAum("");setMaxTer("");setMissing("include");}

  async function getSeasonality(ticker, open=true){
    if(seasonCache[ticker]){ if(open)setModal(seasonCache[ticker]); return seasonCache[ticker]; }
    if(open)setModalLoading(true);
    try{ const r=await fetch(`/api/seasonality?ticker=${encodeURIComponent(ticker)}&windows=10,15,20`,{cache:"no-store"}); if(!r.ok) throw new Error(`Stagionalita ${r.status}`); const data=await r.json(); setSeasonCache(c=>({...c,[ticker]:data})); if(open)setModal(data); return data; }
    catch(e){ if(open)setModal({error:e.message,ticker}); return null; }
    finally{ if(open)setModalLoading(false); }
  }

  async function scanVisible(){
    const tickers=filtered.map(x=>x.ticker); setScanProgress({done:0,total:tickers.length});
    let cursor=0; const workers=Array.from({length:2},async()=>{while(true){const i=cursor++; if(i>=tickers.length)return; await getSeasonality(tickers[i],false); setScanProgress(p=>p?{...p,done:p.done+1}:p);}}); await Promise.all(workers);
  }

  return <main className="page">
    <h1 className="title">ETF Performance Screener</h1>
    <div className="subtitle">Momentum, trend, volume, rischio e stagionalita in una sola vista</div>

    <div className="filters">
      <Field label="Cerca"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ticker, nome, categoria o ISIN..."/></Field>
      <Field label="Mostra solo tipologia"><select value={only} onChange={e=>setOnly(e.target.value)}><option value="">Tutte le categorie</option>{categories.map(c=><option key={c}>{c}</option>)}</select></Field>
      <Field label="Escludi tipologie"><select multiple value={excluded} onChange={e=>setExcluded([...e.target.selectedOptions].map(o=>o.value))}>{categories.map(c=><option key={c}>{c}</option>)}</select></Field>
      <Field label="AUM minimo (milioni)"><input type="number" min="0" value={minAum} onChange={e=>setMinAum(e.target.value)} placeholder="Es. 500"/></Field>
      <Field label="TER massimo (%)"><input type="number" min="0" step="0.01" value={maxTer} onChange={e=>setMaxTer(e.target.value)} placeholder="Es. 0.50"/></Field>
      <Field label="Dati AUM/TER mancanti"><select value={missing} onChange={e=>setMissing(e.target.value)}><option value="include">Includi</option><option value="exclude">Escludi</option></select></Field>
      <Field label="Success rate stagionale min. (%)"><input type="number" min="0" max="100" value={minSuccess} onChange={e=>setMinSuccess(Number(e.target.value||0))}/></Field>
    </div>

    <div className="actions">
      <button className="button" onClick={clearFilters}>Azzera filtri</button>
      <button className="button" onClick={()=>loadAll(true)}>Aggiorna quotazioni</button>
      <button className="button primary" onClick={()=>setFlowOpen(true)}>Flussi di capitale</button>
      <Link href="/future-seasonality" className="button">Stagionalità future</Link>
      <button className="button primary" disabled={!filtered.length||scanProgress?.done<scanProgress?.total} onClick={scanVisible}>Analizza stagionalita ETF filtrati</button>
    </div>
    <div className="hint">Questo screener combina momentum, trend, volume, rischio e stagionalita. I tooltip spiegano quando una lettura è forte, neutra o da monitorare.</div>
    <div className="status">{error?<span className="error">Errore: {error}</span>:<>Caricati {loaded}/{total||"..."} ETF · mostrati {filtered.length}{loading?" · caricamento in corso...":""}{scanProgress?` · stagionalita ${scanProgress.done}/${scanProgress.total}`:""}</>}</div>
    {total>0&&<div className="progress"><div style={{width:`${Math.min(100,loaded/total*100)}%`}}/></div>}

    <div className="tableWrap"><table className="table"><thead><tr>
      <Th onClick={()=>doSort("ticker")}><ColumnHeader label="Ticker" keyName="ticker" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("name")}><ColumnHeader label="Nome ETF" keyName="name" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("isin")}><ColumnHeader label="ISIN" keyName="isin" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("category")}><ColumnHeader label="Categoria" keyName="category" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("trend")}><ColumnHeader label="Trend" keyName="trend" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("rsi14")}><ColumnHeader label="RSI 14" keyName="rsi14" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("positive10")}><ColumnHeader label="Positivi 10G" keyName="positive10" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("positive20")}><ColumnHeader label="Positivi 20G" keyName="positive20" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("streak")}><ColumnHeader label="Streak 20G" keyName="streak" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("distanceSma20")}><ColumnHeader label="Dist SMA20" keyName="distanceSma20" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("rvol")}><ColumnHeader label="RVOL" keyName="rvol" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("volatility20d")}><ColumnHeader label="Vol 20D" keyName="volatility20d" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("distance52wHigh")}><ColumnHeader label="52W High" keyName="distance52wHigh" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("maxDrawdown52w")}><ColumnHeader label="Max DD 52W" keyName="maxDrawdown52w" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("netAssets")}><ColumnHeader label="AUM" keyName="netAssets" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("score")}><ColumnHeader label="Score" keyName="score" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("dailyReturn")}><ColumnHeader label="1D" keyName="dailyReturn" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("threeDayReturn")}><ColumnHeader label="3D" keyName="threeDayReturn" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("weekReturn")}><ColumnHeader label="1W" keyName="weekReturn" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("monthReturn")}><ColumnHeader label="1M" keyName="monthReturn" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("seasonality")}><ColumnHeader label="Seasonality" keyName="seasonality" activeKey={sort.key} dir={sort.dir}/></Th>
      <Th onClick={()=>doSort("borsa")}><ColumnHeader label="Borsa" keyName="borsa" activeKey={sort.key} dir={sort.dir}/></Th>
    </tr></thead><tbody>{filtered.map(x=>{
      const s=seasonCache[x.ticker]; const activeWindow=(s?.seasonalWindows||[]).find(w=>(w.minSuccessRate??0)>=minSuccess) || null;
      const trendLabel = x.trend || "-";
      const rsi = x.rsi14 == null ? "-" : `${fmt(x.rsi14, 0)}`;
      const score = x.score ?? 0;
      const seasonLabel = activeWindow ? (score >= 80 ? "🟢 Aligned" : "🟡 Watch") : "-";
      const positionTooltip = tooltip("Positivi 10/20 giorni", "7/10 o 14/20 indica persistenza del trend: un +10% ottenuto in 14 sedute positive è molto più robusto di un rally concentrato in pochi giorni.");
      return <tr key={x.ticker}>
        <td className="tickerCell"><button className="tickerButton" onClick={() => { void getSeasonality(x.ticker, true); }}>{x.ticker}</button></td>
        <td className="name">{x.name||"-"}</td>
        <td className="mutedCell" title={tooltip("ISIN", "Identificativo internazionale del titolo: utile per confrontare ETF simili e per ricerche precise.")}>{x.isin||"-"}</td>
        <td className="category">{(x.categories||[]).join(", ")}</td>
        <td className={`trendBadge ${trendTone(trendLabel)}`} title={tooltip("Trend", "Prezzo > SMA20 > SMA50 > SMA200: struttura di trend molto pulita. Se il prezzo è sopra tutte le medie mobili, la tendenza è generalmente più forte e meno 'debole'.")}>{trendLabel}</td>
        <td className={rsi === "-" ? "muted" : x.rsi14 > 70 ? "positive" : x.rsi14 < 35 ? "negative" : "muted"} title={tooltip("RSI 14", "RSI intorno a 62 con 1D +1.8%, 3D +4.2% e 1M +8.1% è un segnale di forza continua, non di eccesso. RSI molto basso invece può indicare slancio ancora debole o downtrend.")}>{rsi}</td>
        <td title={positionTooltip}>{x.positive10 != null ? `${x.positive10}/10` : "-"}</td>
        <td title={positionTooltip}>{x.positive20 != null ? `${x.positive20}/20` : "-"}</td>
        <td title={tooltip("Streak 20G", "Quante sedute consecutive sono state positive negli ultimi 20 giorni. La persistenza è un segnale di trend confermato e meno rumoroso di un singolo breakout.")}>{x.streak != null ? `${x.streak}/20` : "-"}</td>
        <td className={cls(x.distanceSma20)} title={tooltip("Distanza da SMA20", "Calcolo: (Prezzo / SMA20 - 1) × 100. Un +18% rispetto alla SMA20 può essere esteso e più rischioso di un +4%, che spesso è più sano e coerente con un trend in corso.")}>{x.distanceSma20 == null ? "-" : `${fmt(x.distanceSma20, 1)}%`}</td>
        <td title={tooltip("Volume relativo", "Volume oggi / volume medio 20 giorni. Un ETF con +4.5% e RVOL 2.3x mostra più partecipazione rispetto a +4.5% con RVOL 0.5x.")}>{x.relativeVolume == null ? "-" : `${fmt(x.relativeVolume, 1)}x`}</td>
        <td title={tooltip("Volatilità 20D", "Rischio recente annualizzato. Evita di trattare +5% su LABU e +5% su SPY come se avessero lo stesso rischio: i leveraged hanno volatilità molto superiore.")}>{x.volatility20d == null ? "-" : `${fmt(x.volatility20d, 1)}`}</td>
        <td className={cls(x.distance52wHigh)} title={tooltip("Distanza 52W High", "Un ETF a -2.4% dal massimo 52 settimane è molto più forte di uno a -35%, che potrebbe essere semplicemente un rimbalzo dentro un downtrend.")}>{x.distance52wHigh == null ? "-" : `${fmt(x.distance52wHigh, 1)}%`}</td>
        <td className={cls(x.maxDrawdown52w)} title={tooltip("Max Drawdown 52W", "Il peggiore calo di prezzo negli ultimi 52 settimane. Un fondo che ha perso -14% rispetto al massimo recente è più prudente di uno che ha toccato -35% e ancora non si è ripreso.")}>{x.maxDrawdown52w == null ? "-" : `${fmt(x.maxDrawdown52w, 1)}%`}</td>
        <td className="mutedCell" title={tooltip("AUM", "Dimensione del fondo in asset under management. ETF grandi e profondi tendono a essere più liquidi e meno soggetti a salti di prezzo improvvisi.")}>{x.netAssets == null ? "-" : formatAum(x.netAssets)}</td>
        <td className={`scoreBadge ${scoreTone(score)}`} title={tooltip("ETF Score 0-100", "Combinazione di momentum, trend, stagionalità, volume, rischio e qualità ETF. Valori superiori a 80 indicano una struttura molto interessante; sotto 55 la lettura dominante è più debole.")}>{score}</td>
        <td className={cls(x.dailyReturn)} title={tooltip("1 giorno", "Misura il rendimento dell'ultimo giorno. Un momentum positivo in 1D ma con RSI basso e trend debole può essere solo un rimbalzo tecnico.")}>{pct(x.dailyReturn)}</td>
        <td className={cls(x.threeDayReturn)} title={tooltip("3 giorni", "Rendimento di 3 sedute. Aiuta a separare un breakout vero da un movimento monopolare e molto breve.")}>{pct(x.threeDayReturn)}</td>
        <td className={cls(x.weekReturn)} title={tooltip("1 settimana", "Rendimento delle ultime 5 sedute. È utile capire se il movimento è ancora vivo o se il rally degli ultimi giorni si è già spento.")}>{pct(x.weekReturn)}</td>
        <td className={cls(x.monthReturn)} title={tooltip("1 mese", "Rendimento degli ultimi 30 giorni. Un uptrend sostenato su 1M con RSI positivo è molto più interessante di un movimento solo giornaliero.")}>{pct(x.monthReturn)}</td>
        <td title={tooltip("Seasonality Alignment", "Se oggi siamo in una finestra stagionale favorevole e il trend è forte, la combinazione è molto più interessante di un singolo rendimento giornaliero. Esempio: +6.2% nella finestra, 81% success rate, 19 campioni.")}>
          <div className="seasonalityCell">
            <span className="seasonMarker">{seasonLabel}</span>
            <button type="button" className="button small detailButton" onClick={() => { void getSeasonality(x.ticker, true); }}>Dettaglio</button>
          </div>
        </td>
        <td>{x.exchange||"-"}</td>
      </tr>
    })}{!filtered.length&&!loading&&<tr><td colSpan="21" className="loadingBox">Nessun ETF con i filtri correnti.</td></tr>}</tbody></table></div>

    {flowOpen && <div className="modalBackdrop" onMouseDown={()=>setFlowOpen(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}>
      <div className="modalHead"><div><h2>Flussi di capitale</h2><div className="hint">Vista sintetica di dove si sta concentrando la forza del mercato: entrate in asset più forti e uscite da quelli più deboli.</div></div><button className="button" onClick={()=>setFlowOpen(false)}>Chiudi</button></div>
      <div className="flowGrid">
        <div className="flowPanel">
          <h3>Entrate / forza</h3>
          {capitalFlow.inflow.length ? capitalFlow.inflow.map(item => <div key={item.ticker} className="flowRow"><span><strong>{item.ticker}</strong> · {item.name}</span><strong className="positive">{pct(item.value)}</strong></div>) : <div className="muted">Nessun dato disponibile.</div>}
        </div>
        <div className="flowPanel">
          <h3>Uscite / debolezza</h3>
          {capitalFlow.outflow.length ? capitalFlow.outflow.map(item => <div key={item.ticker} className="flowRow"><span><strong>{item.ticker}</strong> · {item.name}</span><strong className="negative">{pct(item.value)}</strong></div>) : <div className="muted">Nessun dato disponibile.</div>}
        </div>
      </div>
    </div></div>}
    {(modalLoading||modal)&&<SeasonModal data={modal} loading={modalLoading} minSuccess={minSuccess} onClose={()=>{setModal(null);setModalLoading(false)}}/>}
  </main>;
}

function Field({label,children}){return <div className="field"><label>{label}</label>{children}</div>}
function ColumnHeader({ label, keyName, activeKey, dir }) {
  const [open, setOpen] = useState(false);
  const isActive = activeKey === keyName;
  const sortChar = isActive ? (dir > 0 ? "▲" : "▼") : "↕";
  return <span className="columnHead">
    <button type="button" className="columnLabel" onClick={(event) => { event.stopPropagation(); setOpen((v) => !v); }}>{label}<span className={`sortArrow ${isActive ? "active" : ""}`}>{sortChar}</span></button>
    {open && <span className="headerTooltip" role="tooltip">{COLUMN_HELP[keyName] || label}</span>}
  </span>;
}
function Th({children,onClick}){return <th onClick={onClick}>{children}</th>}

function SeasonModal({data,loading,onClose,minSuccess}){
  const [tab,setTab]=useState("windows");
  if(loading) return <div className="modalBackdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="loadingBox">Caricamento fino a 20 anni di storico giornaliero...</div></div></div>;
  if(!data) return null;
  const windows=data.windows||[10,15,20]; const intersection=(data.intersections||[]).filter(x=>(x.minSuccessRate??0)>=minSuccess); const seasonalWindows=(data.seasonalWindows||[]).filter(x=>(x.minSuccessRate??0)>=minSuccess);
  return <div className="modalBackdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e=>e.stopPropagation()}>
    <div className="modalHead"><div><h2>{data.ticker} — {data.name||"Stagionalita"}</h2><div className="hint">Storico disponibile circa {data.availableYears||0} anni. Le date sono mostrate nel formato italiano GG/MM. Il giorno specifico misura il rendimento della seduta rispetto alla seduta precedente.</div></div><button className="button" onClick={onClose}>Chiudi</button></div>
    {data.error?<div className="error">{data.error}</div>:<>
      <div className="cards">{windows.map(w=><div className="card" key={w}><div className="cardTitle">Oggi {formatDateKey(data.todayKey)} · ultimi {w} anni</div><div className={`cardValue ${cls(data.currentDay?.[w]?.avg)}`}>{pct(data.currentDay?.[w]?.avg)}</div><div className="muted">Success rate {data.currentDay?.[w]?.successRate?.toFixed(1)??"-"}% · {data.currentDay?.[w]?.samples||0} campioni</div></div>)}</div>
      <div className="tabs"><button className={`tab ${tab==="windows"?"active":""}`} onClick={()=>setTab("windows")}>Finestre stagionali</button><button className={`tab ${tab==="intersection"?"active":""}`} onClick={()=>setTab("intersection")}>Giorni comuni 10/15/20</button><button className={`tab ${tab==="daily"?"active":""}`} onClick={()=>setTab("daily")}>Tutti i giorni</button><button className={`tab ${tab==="monthly"?"active":""}`} onClick={()=>setTab("monthly")}>Mesi</button></div>
      {tab==="windows"&&<SeasonWindowTable rows={seasonalWindows} windows={windows} minSuccess={minSuccess}/>}      
      {tab==="intersection"&&<><h3 className="sectionTitle">Intersezione stagionale positiva · success rate minimo {minSuccess}%</h3><div className="hint">Sono inclusi solo i giorni con rendimento medio positivo in tutte le finestre 10, 15 e 20 anni e un numero minimo di campioni.</div><IntersectionTable rows={intersection} windows={windows}/></>}
      {tab==="daily"&&<DailyTables data={data} windows={windows}/>} 
      {tab==="monthly"&&<MonthlyTables data={data} windows={windows}/>} 
    </>}
  </div></div>;
}

function SeasonWindowTable({rows,windows,minSuccess}){return <><h3 className="sectionTitle">Finestre stagionali attive · success rate minimo {minSuccess}%</h3><div className="hint">Ogni finestra contiene la data odierna. La classifica privilegia coerenza del success rate e rendimento positivo sulle tre profondita storiche.</div><div className="tableWrap" style={{maxHeight:"55vh"}}><table className="miniTable"><thead><tr><th>Finestra</th><th>Durata</th>{windows.flatMap(w=>[<th key={`wa${w}`}>Media {w}a</th>,<th key={`ws${w}`}>Successo {w}a</th>,<th key={`wn${w}`}>N {w}a</th>])}<th>Successo minimo</th></tr></thead><tbody>{rows.map((r,i)=><tr key={`${r.startKey}-${r.endKey}-${i}`}><td className="ticker nowrap">dal {formatDateKey(r.startKey)} al {formatDateKey(r.endKey)}</td><td>{r.durationDays} gg</td>{windows.flatMap(w=>[<td key={`wa${w}`} className={cls(r.byWindow?.[w]?.avg)}>{pct(r.byWindow?.[w]?.avg)}</td>,<td key={`ws${w}`}>{r.byWindow?.[w]?.successRate?.toFixed(1)??"-"}%</td>,<td key={`wn${w}`}>{r.byWindow?.[w]?.samples||0}</td>])}<td><strong>{r.minSuccessRate?.toFixed(1)??"-"}%</strong></td></tr>)}{!rows.length&&<tr><td colSpan={windows.length*3+3} className="loadingBox">Nessuna finestra soddisfa la soglia selezionata.</td></tr>}</tbody></table></div></>}

function IntersectionTable({rows,windows}){return <div className="tableWrap" style={{maxHeight:"55vh"}}><table className="miniTable"><thead><tr><th>Data</th>{windows.flatMap(w=>[<th key={`a${w}`}>Media {w}a</th>,<th key={`s${w}`}>Successo {w}a</th>,<th key={`n${w}`}>N {w}a</th>])}<th>Successo minimo</th></tr></thead><tbody>{rows.map(r=><tr key={r.dateKey}><td className="ticker nowrap">{formatDateKey(r.dateKey)}</td>{windows.flatMap(w=>[<td key={`a${w}`} className={cls(r.byWindow[w]?.avg)}>{pct(r.byWindow[w]?.avg)}</td>,<td key={`s${w}`}>{r.byWindow[w]?.successRate?.toFixed(1)??"-"}%</td>,<td key={`n${w}`}>{r.byWindow[w]?.samples||0}</td>])}<td><strong>{r.minSuccessRate?.toFixed(1)??"-"}%</strong></td></tr>)}{!rows.length&&<tr><td colSpan={windows.length*3+2} className="loadingBox">Nessun giorno soddisfa la soglia.</td></tr>}</tbody></table></div>}

function DailyTables({data,windows}){const [window,setWindow]=useState(Math.max(...windows)); const rows=Object.entries(data.daily?.[window]||{}).sort((a,b)=>a[0].localeCompare(b[0])); return <><div className="actions">{windows.map(w=><button key={w} className={`tab ${window===w?"active":""}`} onClick={()=>setWindow(w)}>{w} anni</button>)}</div><div className="tableWrap" style={{maxHeight:"55vh"}}><table className="miniTable"><thead><tr><th>Data GG/MM</th><th>Media</th><th>Mediana</th><th>Success rate</th><th>Campioni</th><th>Migliore</th><th>Peggiore</th></tr></thead><tbody>{rows.map(([key,s])=><tr key={key}><td className="ticker">{formatDateKey(key)}</td><td className={cls(s.avg)}>{pct(s.avg)}</td><td className={cls(s.median)}>{pct(s.median)}</td><td>{s.successRate?.toFixed(1)??"-"}%</td><td>{s.samples}</td><td className={cls(s.best)}>{pct(s.best)}</td><td className={cls(s.worst)}>{pct(s.worst)}</td></tr>)}</tbody></table></div></>}

function MonthlyTables({data,windows}){return <div className="grid2">{windows.map(w=><div key={w}><h3>{w} anni</h3><div className="tableWrap" style={{maxHeight:"52vh"}}><table className="miniTable"><thead><tr><th>Mese</th><th>Media</th><th>Successo</th><th>N</th></tr></thead><tbody>{(data.monthly?.[w]||[]).map(m=><tr key={m.month}><td>{MONTHS[m.month-1]}</td><td className={cls(m.avg)}>{pct(m.avg)}</td><td>{m.successRate?.toFixed(1)??"-"}%</td><td>{m.samples}</td></tr>)}</tbody></table></div></div>)}</div>}
