"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const I18N = {
  it: {
    back: "Torna allo screener",
    title: "ETF con stagionalità futura",
    subtitle: "Elenco dei fondi con una finestra stagionale favorevole in corso o imminente.",
    loading: "Caricamento in corso...",
    found: (n, avg) => `Trovati ${n} ETF · media success rate ${avg}%`,
    openDetails: "Apri dettaglio",
    noRows: "Nessun ETF con stagionalità futura rilevata.",
    ticker: "Ticker",
    name: "Nome ETF",
    window: "Finestra futura",
    duration: "Durata",
    success: "Successo min",
    avgWindowRef: "Rendimento medio finestra (10a/15a/20a)",
    details: "Dettagli",
    loadingDetails: "Caricamento dettagli stagionali...",
    modalFallback: "stagionalità",
    modalHint: "Dettaglio completo delle finestre stagionali future e della distribuzione storica.",
    close: "Chiudi",
    seasonalWindows: "Finestre stagionali",
    allDays: "Tutti i giorni",
    months: "Mesi",
    noWindow: "Nessuna finestra disponibile.",
    from: "dal",
    to: "al",
    avg: "Media",
    median: "Mediana",
    rate: "Success rate",
    samples: "Campioni",
    best: "Migliore",
    worst: "Peggiore",
    month: "Mese",
    count: "N",
    years: "anni",
    days: "gg",
    monthsList: ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"],
  },
  en: {
    back: "Back to screener",
    title: "ETFs with future seasonality",
    subtitle: "Funds with an active or upcoming favorable seasonal window.",
    loading: "Loading...",
    found: (n, avg) => `Found ${n} ETFs · average success rate ${avg}%`,
    openDetails: "Open details",
    noRows: "No ETFs with detected future seasonality.",
    ticker: "Ticker",
    name: "ETF name",
    window: "Future window",
    duration: "Duration",
    success: "Min success",
    avgWindowRef: "Average window return (10y/15y/20y)",
    details: "Details",
    loadingDetails: "Loading seasonality details...",
    modalFallback: "Seasonality",
    modalHint: "Full breakdown of future seasonal windows and historical distribution.",
    close: "Close",
    seasonalWindows: "Seasonal windows",
    allDays: "All days",
    months: "Months",
    noWindow: "No seasonal windows available.",
    from: "from",
    to: "to",
    avg: "Average",
    median: "Median",
    rate: "Success rate",
    samples: "Samples",
    best: "Best",
    worst: "Worst",
    month: "Month",
    count: "N",
    years: "years",
    days: "d",
    monthsList: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  },
};

const pct = (v) =>
  v == null || !Number.isFinite(Number(v))
    ? "-"
    : `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`;

const cls = (v) =>
  v == null ? "muted" : Number(v) > 0 ? "positive" : Number(v) < 0 ? "negative" : "muted";

const formatDateKey = (key) => {
  if (!key) return "-";
  const [m, d] = String(key).split("-");
  return m && d ? `${d}/${m}` : key;
};

export default function FutureSeasonalityPage() {
  const [lang, setLang] = useState("it");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const t = I18N[lang];

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("ui-lang") : null;
    if (saved === "it" || saved === "en") setLang(saved);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const listRes = await fetch("/api/etfs?page=1&pageSize=500", { cache: "no-store" });
        if (!listRes.ok) throw new Error(`API ETF ${listRes.status}`);

        const list = await listRes.json();
        const tickers = (list.data || []).filter((x) => x?.ok).map((x) => x.ticker);

        const details = await Promise.all(
          tickers.map(async (ticker) => {
            const res = await fetch(`/api/seasonality?ticker=${encodeURIComponent(ticker)}&windows=10,15,20`, {
              cache: "no-store",
            });
            if (!res.ok) return null;
            const data = await res.json();
            const best = (data.seasonalWindows || [])
              .slice()
              .sort((a, b) => (b.minSuccessRate ?? 0) - (a.minSuccessRate ?? 0))[0];
            if (!best) return null;
            return {
              ticker,
              name: data.name || ticker,
              best,
              minSuccessRate: best.minSuccessRate ?? 0,
              windows: data.windows || [10, 15, 20],
              data,
            };
          })
        );

        setRows(details.filter(Boolean).sort((a, b) => (b.minSuccessRate ?? 0) - (a.minSuccessRate ?? 0)));
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function openTicker(ticker) {
    const res = await fetch(`/api/seasonality?ticker=${encodeURIComponent(ticker)}&windows=10,15,20`, { cache: "no-store" });
    if (!res.ok) {
      setModal({ ticker, error: `Seasonality ${res.status}` });
      return;
    }
    const data = await res.json();
    setModal(data);
  }

  const summary = useMemo(() => {
    if (!rows.length) return 0;
    return rows.reduce((acc, item) => acc + (item.minSuccessRate || 0), 0) / rows.length;
  }, [rows]);

  return (
    <main className="page">
      <div className="actions" style={{ marginTop: 8 }}>
        <Link href="/" className="button">{t.back}</Link>
      </div>

      <h1 className="title">{t.title}</h1>
      <div className="subtitle">{t.subtitle}</div>
      {error ? <div className="error">{error}</div> : null}

      <div className="status">{loading ? t.loading : t.found(rows.length, (summary || 0).toFixed(1))}</div>

      <div className="tableWrap">
        <table className="table" style={{ minWidth: "1100px" }}>
          <thead>
            <tr>
              <th>{t.ticker}</th>
              <th>{t.name}</th>
              <th>{t.window}</th>
              <th>{t.duration}</th>
              <th>{t.success}</th>
              <th>{t.avgWindowRef}</th>
              <th>{t.details}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.ticker}>
                <td className="ticker">{item.ticker}</td>
                <td>{item.name}</td>
                <td>{item.best ? `${formatDateKey(item.best.startKey)} → ${formatDateKey(item.best.endKey)}` : "-"}</td>
                <td>{item.best ? `${item.best.durationDays} ${t.days}` : "-"}</td>
                <td className={cls(item.minSuccessRate)}>{item.minSuccessRate ? `${item.minSuccessRate.toFixed(1)}%` : "-"}</td>
                <td>{formatWindowAverages(item.best)}</td>
                <td>
                  <button
                    className="button small"
                    onClick={() => {
                      setModalLoading(true);
                      openTicker(item.ticker).finally(() => setModalLoading(false));
                    }}
                  >
                    {t.openDetails}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && !rows.length && (
              <tr>
                <td colSpan="7" className="loadingBox">{t.noRows}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalLoading && (
        <div className="modalBackdrop" onMouseDown={() => setModalLoading(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="loadingBox">{t.loadingDetails}</div>
          </div>
        </div>
      )}
      {modal && !modalLoading && <FutureSeasonalityModal data={modal} onClose={() => setModal(null)} lang={lang} />}
    </main>
  );
}

function FutureSeasonalityModal({ data, onClose, lang }) {
  const [tab, setTab] = useState("windows");
  const t = I18N[lang];

  if (!data) return null;

  const windows = data.windows || [10, 15, 20];
  const seasonalWindows = data.seasonalWindows || [];

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <div>
            <h2>{data.ticker} — {data.name || t.modalFallback}</h2>
            <div className="hint">{t.modalHint}</div>
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
                  <div className="cardTitle">{formatDateKey(data.todayKey)} · {w} {t.years}</div>
                  <div className={`cardValue ${cls(data.currentDay?.[w]?.avg)}`}>{pct(data.currentDay?.[w]?.avg)}</div>
                  <div className="muted">{t.rate} {data.currentDay?.[w]?.successRate?.toFixed(1) ?? "-"}% · {data.currentDay?.[w]?.samples || 0} {t.samples}</div>
                </div>
              ))}
            </div>

            <div className="tabs">
              <button className={`tab ${tab === "windows" ? "active" : ""}`} onClick={() => setTab("windows")}>{t.seasonalWindows}</button>
              <button className={`tab ${tab === "daily" ? "active" : ""}`} onClick={() => setTab("daily")}>{t.allDays}</button>
              <button className={`tab ${tab === "monthly" ? "active" : ""}`} onClick={() => setTab("monthly")}>{t.months}</button>
            </div>

            {tab === "windows" && (
              <div className="tableWrap" style={{ maxHeight: "55vh" }}>
                <table className="miniTable">
                  <thead>
                    <tr>
                      <th>{t.window}</th>
                      <th>{t.duration}</th>
                      {windows.flatMap((w) => [<th key={`m-${w}`}>{t.avg} {w}a</th>, <th key={`s-${w}`}>{t.rate} {w}a</th>, <th key={`n-${w}`}>{t.count} {w}a</th>])}
                    </tr>
                  </thead>
                  <tbody>
                    {seasonalWindows.map((r, i) => (
                      <tr key={`${r.startKey}-${r.endKey}-${i}`}>
                        <td className="ticker nowrap">{t.from} {formatDateKey(r.startKey)} {t.to} {formatDateKey(r.endKey)}</td>
                        <td>{r.durationDays} {t.days}</td>
                        {windows.flatMap((w) => [
                          <td key={`m-${w}-${i}`} className={cls(r.byWindow?.[w]?.avg)}>{pct(r.byWindow?.[w]?.avg)}</td>,
                          <td key={`s-${w}-${i}`}>{r.byWindow?.[w]?.successRate?.toFixed(1) ?? "-"}%</td>,
                          <td key={`n-${w}-${i}`}>{r.byWindow?.[w]?.samples || 0}</td>,
                        ])}
                      </tr>
                    ))}
                    {!seasonalWindows.length && <tr><td colSpan={windows.length * 3 + 2} className="loadingBox">{t.noWindow}</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "daily" && <DailyTables data={data} windows={windows} lang={lang} />}
            {tab === "monthly" && <MonthlyTables data={data} windows={windows} lang={lang} />}
          </>
        )}
      </div>
    </div>
  );
}

function formatWindowAverages(bestWindow) {
  if (!bestWindow?.byWindow) return "-";
  const avg10 = bestWindow.byWindow?.[10]?.avg;
  const avg15 = bestWindow.byWindow?.[15]?.avg;
  const avg20 = bestWindow.byWindow?.[20]?.avg;
  return `${pct(avg10)} | ${pct(avg15)} | ${pct(avg20)}`;
}

function DailyTables({ data, windows, lang }) {
  const [window, setWindow] = useState(Math.max(...windows));
  const t = I18N[lang];
  const rows = Object.entries(data.daily?.[window] || {}).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <>
      <div className="actions">
        {windows.map((w) => (
          <button key={w} className={`tab ${window === w ? "active" : ""}`} onClick={() => setWindow(w)}>
            {w} {t.years}
          </button>
        ))}
      </div>
      <div className="tableWrap" style={{ maxHeight: "55vh" }}>
        <table className="miniTable">
          <thead>
            <tr>
              <th>Date DD/MM</th>
              <th>{t.avg}</th>
              <th>{t.median}</th>
              <th>{t.rate}</th>
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
  const t = I18N[lang];
  return (
    <div className="grid2">
      {windows.map((w) => (
        <div key={w}>
          <h3>{w} {t.years}</h3>
          <div className="tableWrap" style={{ maxHeight: "52vh" }}>
            <table className="miniTable">
              <thead>
                <tr>
                  <th>{t.month}</th>
                  <th>{t.avg}</th>
                  <th>{t.rate}</th>
                  <th>{t.count}</th>
                </tr>
              </thead>
              <tbody>
                {(data.monthly?.[w] || []).map((m) => (
                  <tr key={m.month}>
                    <td>{t.monthsList[m.month - 1]}</td>
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
