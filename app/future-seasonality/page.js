"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

const pct = (v) => v == null || !Number.isFinite(Number(v)) ? "-" : `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}%`;
const cls = (v) => v == null ? "muted" : Number(v) > 0 ? "positive" : Number(v) < 0 ? "negative" : "muted";
const formatDateKey = (key) => { if(!key) return "-"; const [m,d]=String(key).split("-"); return m&&d?`${d}/${m}`:key; };

export default function FutureSeasonalityPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const listRes = await fetch("/api/etfs?page=1&pageSize=500", { cache: "no-store" });
        if (!listRes.ok) throw new Error(`API ETF ${listRes.status}`);
        const list = await listRes.json();
        const tickers = (list.data || []).filter((x) => x && x.ok).map((x) => x.ticker);

        const details = await Promise.all(
          tickers.map(async (ticker) => {
            const res = await fetch(`/api/seasonality?ticker=${encodeURIComponent(ticker)}&windows=10,15,20`, { cache: "no-store" });
            if (!res.ok) return null;
            const data = await res.json();
            const best = (data.seasonalWindows || []).slice().sort((a,b) => (b.minSuccessRate ?? 0) - (a.minSuccessRate ?? 0))[0];
            if (!best) return null;
            return { ticker, name: data.name || ticker, best, minSuccessRate: best.minSuccessRate ?? 0, windows: data.windows || [10,15,20], data };
          })
        );

        const filtered = details.filter(Boolean).sort((a,b) => (b.minSuccessRate ?? 0) - (a.minSuccessRate ?? 0));
        setRows(filtered);
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
      setModal({ ticker, error: `Errore stagionalità ${res.status}` });
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
        <Link href="/" className="button">Torna allo screener</Link>
      </div>
      <h1 className="title">ETF con stagionalità futura</h1>
      <div className="subtitle">Elenco dei fondi con una finestra stagionale favorevole in corso o imminente.</div>
      {error ? <div className="error">{error}</div> : null}
      <div className="status">
        {loading ? "Caricamento in corso..." : <>Trovati {rows.length} ETF · media success rate {summary ? summary.toFixed(1) : "0.0"}%</>}
      </div>

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Nome ETF</th>
              <th>Finestra futura</th>
              <th>Durata</th>
              <th>Successo min</th>
              <th>Dettagli</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.ticker}>
                <td className="ticker">{item.ticker}</td>
                <td>{item.name}</td>
                <td>{item.best ? `${formatDateKey(item.best.startKey)} → ${formatDateKey(item.best.endKey)}` : "-"}</td>
                <td>{item.best ? `${item.best.durationDays} gg` : "-"}</td>
                <td className={cls(item.minSuccessRate)}>{item.minSuccessRate ? `${item.minSuccessRate.toFixed(1)}%` : "-"}</td>
                <td><button className="button small" onClick={() => { setModalLoading(true); openTicker(item.ticker).finally(() => setModalLoading(false)); }}>Apri dettaglio</button></td>
              </tr>
            ))}
            {!loading && !rows.length && <tr><td colSpan="6" className="loadingBox">Nessun ETF con stagionalità futura rilevata.</td></tr>}
          </tbody>
        </table>
      </div>

      {modalLoading && <div className="modalBackdrop" onMouseDown={() => setModalLoading(false)}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><div className="loadingBox">Caricamento dettagli stagionali...</div></div></div>}
      {modal && !modalLoading && <FutureSeasonalityModal data={modal} onClose={() => setModal(null)} />}
    </main>
  );
}

function FutureSeasonalityModal({ data, onClose }) {
  if (!data) return null;
  const [tab, setTab] = useState("windows");
  const windows = data.windows || [10,15,20];
  const seasonalWindows = data.seasonalWindows || [];

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <div>
            <h2>{data.ticker} — {data.name || "Stagionalità"}</h2>
            <div className="hint">Dettaglio completo delle finestre stagionali future e della distribuzione storica.</div>
          </div>
          <button className="button" onClick={onClose}>Chiudi</button>
        </div>

        {data.error ? <div className="error">{data.error}</div> : (
          <>
            <div className="cards">{windows.map((w) => (
              <div className="card" key={w}>
                <div className="cardTitle">Oggi {formatDateKey(data.todayKey)} · ultimi {w} anni</div>
                <div className={`cardValue ${cls(data.currentDay?.[w]?.avg)}`}>{pct(data.currentDay?.[w]?.avg)}</div>
                <div className="muted">Success rate {data.currentDay?.[w]?.successRate?.toFixed(1) ?? "-"}% · {data.currentDay?.[w]?.samples || 0} campioni</div>
              </div>
            ))}</div>

            <div className="tabs">
              <button className={`tab ${tab === "windows" ? "active" : ""}`} onClick={() => setTab("windows")}>Finestre stagionali</button>
              <button className={`tab ${tab === "daily" ? "active" : ""}`} onClick={() => setTab("daily")}>Tutti i giorni</button>
              <button className={`tab ${tab === "monthly" ? "active" : ""}`} onClick={() => setTab("monthly")}>Mesi</button>
            </div>

            {tab === "windows" && (
              <div className="tableWrap" style={{ maxHeight: "55vh" }}>
                <table className="miniTable">
                  <thead>
                    <tr>
                      <th>Finestra</th>
                      <th>Durata</th>
                      {windows.flatMap((w) => [<th key={`m-${w}`}>Media {w}a</th>, <th key={`s-${w}`}>Successo {w}a</th>, <th key={`n-${w}`}>N {w}a</th>])}
                    </tr>
                  </thead>
                  <tbody>
                    {(seasonalWindows || []).map((r, i) => (
                      <tr key={`${r.startKey}-${r.endKey}-${i}`}>
                        <td className="ticker nowrap">dal {formatDateKey(r.startKey)} al {formatDateKey(r.endKey)}</td>
                        <td>{r.durationDays} gg</td>
                        {windows.flatMap((w) => [
                          <td key={`m-${w}-${i}`} className={cls(r.byWindow?.[w]?.avg)}>{pct(r.byWindow?.[w]?.avg)}</td>,
                          <td key={`s-${w}-${i}`}>{r.byWindow?.[w]?.successRate?.toFixed(1) ?? "-"}%</td>,
                          <td key={`n-${w}-${i}`}>{r.byWindow?.[w]?.samples || 0}</td>
                        ])}
                      </tr>
                    ))}
                    {!seasonalWindows.length && <tr><td colSpan={windows.length * 3 + 2} className="loadingBox">Nessuna finestra disponibile.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "daily" && (
              <DailyTables data={data} windows={windows} />
            )}

            {tab === "monthly" && (
              <MonthlyTables data={data} windows={windows} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DailyTables({ data, windows }) {
  const [window, setWindow] = useState(Math.max(...windows));
  const rows = Object.entries(data.daily?.[window] || {}).sort((a,b) => a[0].localeCompare(b[0]));

  return (
    <>
      <div className="actions">
        {windows.map((w) => <button key={w} className={`tab ${window === w ? "active" : ""}`} onClick={() => setWindow(w)}>{w} anni</button>)}
      </div>
      <div className="tableWrap" style={{ maxHeight: "55vh" }}>
        <table className="miniTable">
          <thead>
            <tr>
              <th>Data GG/MM</th>
              <th>Media</th>
              <th>Mediana</th>
              <th>Success rate</th>
              <th>Campioni</th>
              <th>Migliore</th>
              <th>Peggiore</th>
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

function MonthlyTables({ data, windows }) {
  return (
    <div className="grid2">
      {windows.map((w) => (
        <div key={w}>
          <h3>{w} anni</h3>
          <div className="tableWrap" style={{ maxHeight: "52vh" }}>
            <table className="miniTable">
              <thead>
                <tr>
                  <th>Mese</th>
                  <th>Media</th>
                  <th>Successo</th>
                  <th>N</th>
                </tr>
              </thead>
              <tbody>
                {(data.monthly?.[w] || []).map((m) => (
                  <tr key={m.month}>
                    <td>{MONTHS[m.month - 1]}</td>
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
