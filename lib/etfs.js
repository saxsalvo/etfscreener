export const FAMOUS_ETFS = {
  broadMarketUS: ["SPY","VOO","IVV","VTI","ITOT","SCHB","SPLG","QQQ","QQQM","DIA","IWM","IWB","IWV","VXF","MDY","IJH","IJR","VUG","VTV","IWF","IWD","SPYG","SPYV","SCHG","SCHV","IVW","IVE","IUSG","IUSV","VV","MGC","MGK","MGV","VO","VB","SCHA","IWR","IWS","IWP","IWO","IWN","IJT","IJS","IJK","IJJ","RSP"],
  international: ["VEA","VWO","EFA","EEM","IEFA","IEMG","ACWI","VT","URTH","VXUS","VEU","IXUS","ACWX","SCHF","SCHE","SPDW","SPEM","VSS","DFAI","DFAX","EFV","EFG","FNDF","FNDE","AAXJ","FEZ","EWJ","EWZ","EWG","EWU","EWC","EWA","EWH","EWY","EWT","EWQ","EWI","EWP","EWL","EWN","EWD","EWS","INDA","EPI","FLIN","FXI","MCHI","ASHR","KWEB","CQQQ","EIDO","THD","EWW","EZA","TUR","ARGT","GREK","FLJP","FLKR"],
  sectorSPDR: ["XLK","XLF","XLE","XLV","XLY","XLI","XLU","XLB","XLP","XLC","XLRE"],
  sectorVanguard: ["VGT","VFH","VDE","VHT","VCR","VIS","VPU","VAW","VDC","VOX","VNQ"],
  industry: ["SMH","SOXX","XSD","PSI","SOXQ","FTXL","IGV","SKYY","CLOU","WCLD","CIBR","HACK","IHAK","BUG","KRE","KBE","IAI","XBI","IBB","BBH","FBT","IHI","XPH","XOP","OIH","IEO","FCG","ITA","XAR","PPA","SHLD","IYT","XTN","XRT","ITB","XHB","XME","GDX","GDXJ","SIL","SILJ","MOO","VEGI","PAVE","IFRA"],
  thematic: ["AIQ","CHAT","THNQ","IRBO","ARTY","AIEQ","WTAI","BOTZ","ROBO","ARKQ","ROBT","QTUM","SMH","SOXX","XSD","PSI","SOXQ","FTXL","CIBR","HACK","IHAK","BUG","SKYY","CLOU","WCLD","IVES","FDN","PNQI","ARKW","KWEB","FINX","ARKF","IPAY","TPAY","BLOK","BITQ","BKCH","DAPP","ESPO","HERO","GAMR","NERD","METV","ARKX","UFO","ROKT","ITA","XAR","PPA","SHLD","DRIV","IDRV","KARS","HAIL","LIT","BATT","URA","URNM","NLR","TAN","FAN","ICLN","QCLN","PBW","ACES","CNRG","HYDR","HDRO","GRID","PAVE","IFRA","NFRA","IGF","SRVR","VPN","COPX","REMX","GDX","GDXJ","SIL","SILJ","MOO","VEGI","WOOD","CUT","PHO","FIW","CGW","PIO","EATV","XBI","IBB","BBH","FBT","ARKG","GNOM","IDNA","IHI","MJ","MSOS","PRNT","SNSR","FIVG","NXTG","ARKK","MAGS","QQQ","QQQM","VGT","XLK","IYW","FTEC"],
  factor: ["QUAL","MTUM","VLUE","SIZE","USMV","AVUV","AVLV","AVMV","DFAC","DFAU","VBR","VIOV","IJS","SPHQ","JQUA","FNDX","COWZ","CALF","MOAT","OMFL"],
  bonds: ["AGG","BND","BNDX","TLT","IEF","SHY","TIP","LQD","HYG","JNK","MUB","EMB","MBB","VCIT","VCSH","VGIT","VGLT","GOVT","SCHZ","BSV","BIV","BLV","IGIB","IGSB","IUSB","FBND","TOTL"],
  treasury: ["SGOV","BIL","SHV","SHY","VGSH","SCHO","IEF","VGIT","SCHR","TLT","VGLT","EDV","ZROZ","GOVT","SPTL","SPTS"],
  inflationBonds: ["TIP","SCHP","VTIP","STIP","LTPZ"],
  corporateBonds: ["LQD","VCIT","VCSH","IGIB","IGSB","HYG","JNK","USHY","SHYG","SJNK","ANGL","FALN"],
  municipalBonds: ["MUB","VTEB","TFI","HYD","SUB"],
  commodities: ["GLD","IAU","SLV","PPLT","PALL","USO","UNG","DBC","DBA","GLDM","SGOL","SIVR","CPER","GSG","PDBC","COMT","BCI","DBB","CORN","WEAT","SOYB","UGA","JJG","DJP","RJA","RJI","RJN","MOO","PHDG","USCI","BCLN","DBE"],
  gold: ["GLD","IAU","GLDM","SGOL","BAR","OUNZ","GDX","GDXJ","RING"],
  dividendValue: ["VYM","VIG","SCHD","DVY","HDV","SDY","SPYD","DGRO","NOBL","USMV","SPLV","SPHD","QUAL","MTUM","VLUE","DGRW","FDVV","FVD","DON","DES","DTD","DHS","RDVY","DIVB"],
  income: ["JEPI","JEPQ","DIVO","QYLD","XYLD","RYLD","SPYI","QQQI","PFF","PGX","PFFD"],
  reit: ["VNQ","IYR","SCHH","RWR","XLRE","REM","REZ","VNQI","USRT","REET","BBRE","FREL","SRVR","INDS"],
  crypto: ["IBIT","FBTC","GBTC","ARKB","BITB","BTCW","HODL","BRRR","EZBC","BTCO","ETHA","ETHE","BITO","BLOK","BITQ","BKCH","DAPP"],
  leveragedInverse: ["TQQQ","SQQQ","SPXL","SPXS","UPRO","SPXU","QLD","QID","SSO","SDS","SOXL","SOXS","TNA","TZA","FAS","FAZ","TECL","TECS","LABU","LABD","UDOW","SDOW","DDM","DXD","NUGT","DUST","JNUG","JDST","ERX","ERY","TMF","TMV","YINN","YANG","UVXY","SVXY"],
  volatility: ["VXX","VIXY","UVXY","SVXY","VIXM"],
  allocation: ["AOR","AOA","AOM","AOK","GAL","RPAR"],
  esg: ["ESGU","ESGV","SUSA","DSI","SUSL","ESGE","ESGD"],
  europeUCITS: ["SXR8.DE","EUNL.DE","VUSA.L","VWCE.DE","VWRL.L","IWDA.L","EIMI.L","XDWD.DE","CSPX.L","SXRV.DE","EXSA.DE","IUSA.L","SGLD.L","PPFB.DE","EUNK.DE","XMWO.DE","SUSW.L","AGGH.MI","SWDA.L","IUSN.L","WSML.L","IS3N.DE","EIMI.MI","CSPX.MI","VWCE.MI","VUSA.MI","VWRL.MI"]
};

export const ALL_FAMOUS_ETF_TICKERS = Array.from(
  new Set(Object.values(FAMOUS_ETFS).flat().map((ticker) => ticker.trim().toUpperCase()))
).sort();

export function getTickerCategories(ticker) {
  return Object.entries(FAMOUS_ETFS)
    .filter(([, tickers]) => tickers.includes(ticker))
    .map(([category]) => category);
}
