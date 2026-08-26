import fs from "node:fs";
import { ALL_FAMOUS_ETF_TICKERS, getTickerCategories } from "../lib/etfs.js";
import { yahooFinance } from "../lib/yahoo.js";

const out=[]; let cursor=0; const concurrency=5;
async function worker(){while(true){const i=cursor++; if(i>=ALL_FAMOUS_ETF_TICKERS.length)return; const ticker=ALL_FAMOUS_ETF_TICKERS[i]; try{const q=await yahooFinance.quote(ticker); out[i]={ticker,ok:true,name:q.longName||q.shortName||ticker,quoteType:q.quoteType||null,categories:getTickerCategories(ticker)};}catch(e){out[i]={ticker,ok:false,error:e?.message||String(e),categories:getTickerCategories(ticker)};} console.log(`${i+1}/${ALL_FAMOUS_ETF_TICKERS.length} ${ticker}`)}}
await Promise.all(Array.from({length:concurrency},worker));
fs.writeFileSync("etf_verification_results.json",JSON.stringify(out,null,2));
fs.writeFileSync("valid_etf_tickers.json",JSON.stringify(out.filter(x=>x.ok).map(x=>x.ticker),null,2));
fs.writeFileSync("invalid_etf_tickers.json",JSON.stringify(out.filter(x=>!x.ok),null,2));
console.log("File di verifica generati.");
