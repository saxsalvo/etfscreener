export const PROFILE_METRICS = {
  short: ["trend", "rsi14", "positive20", "distanceSma20", "rvol", "volatility20d", "monthReturn"],
  long: ["distanceSma200", "smaCross", "drawdownFromAth", "range52wPosition", "year1Return", "quality"],
};

export const CUSTOM_METRICS = [
  "trend", "rsi14", "positive10", "positive20", "streak", "distanceSma20", "rvol", "volatility20d",
  "dailyReturn", "threeDayReturn", "weekReturn", "monthReturn", "distance52wHigh", "maxDrawdown52w",
  "distanceSma200", "smaCross", "drawdownFromAth", "range52wPosition", "year1Return", "quality",
];

export function normalizeProfile(profile) {
  const mode = ["short", "long", "custom"].includes(profile?.mode) ? profile.mode : "long";
  const selectedMetrics = mode === "custom"
    ? [...new Set((profile?.selectedMetrics || []).filter((metric) => CUSTOM_METRICS.includes(metric)))]
    : PROFILE_METRICS[mode];
  return { mode, selectedMetrics: selectedMetrics.length ? selectedMetrics : PROFILE_METRICS.long };
}

function assessment(metric, row) {
  const value = row[metric];
  if (metric === "trend") return row.trend === "Forte" ? 2 : row.trend === "Debole" ? -2 : 0;
  if (metric === "rsi14") return value >= 55 && value < 70 ? 2 : value >= 45 && value < 55 ? 0 : -1;
  if (metric === "positive20") return value >= 14 ? 2 : value >= 10 ? 1 : value >= 7 ? 0 : -2;
  if (metric === "positive10") return value >= 7 ? 2 : value >= 5 ? 0 : -2;
  if (metric === "streak") return value >= 3 ? 1 : value === 0 ? -1 : 0;
  if (metric === "distanceSma20") return value >= -3 && value <= 10 ? 1 : Math.abs(value) > 20 ? -2 : -1;
  if (metric === "rvol") return value >= 1.3 ? 1 : value < 0.7 ? -1 : 0;
  if (metric === "volatility20d") return value <= 18 ? 1 : value > 32 ? -1 : 0;
  if (metric === "monthReturn") return value > 3 ? 1 : value < -3 ? -1 : 0;
  if (metric === "dailyReturn" || metric === "threeDayReturn" || metric === "weekReturn") return value > 0 ? 1 : value < 0 ? -1 : 0;
  if (metric === "distance52wHigh") return value >= -5 ? 1 : value < -30 ? -1 : 0;
  if (metric === "maxDrawdown52w") return value >= -12 ? 1 : value < -30 ? -1 : 0;
  if (metric === "distanceSma200") return value >= -8 && value <= -3 ? 2 : value >= -3 && value <= 8 ? 1 : value < -15 ? -1 : 0;
  if (metric === "smaCross") return row.smaCross?.regime === "golden" ? 2 : row.smaCross?.regime === "death" ? -2 : 0;
  if (metric === "drawdownFromAth") return value <= -25 ? 2 : value <= -15 ? 1 : value <= -5 ? 0 : -1;
  if (metric === "range52wPosition") return value >= 20 && value <= 40 ? 2 : value < 20 ? 1 : value > 80 ? -1 : 0;
  if (metric === "year1Return") return value > 8 ? 1 : value < 0 ? -1 : 0;
  if (metric === "quality") return value >= 3 ? 1 : value <= 1 ? -1 : 0;
  return 0;
}

const METRIC_LABELS = {
  trend: { it: "Trend", en: "Trend" },
  rsi14: { it: "RSI 14", en: "RSI 14" },
  positive20: { it: "Positivi 20G", en: "Positive 20D" },
  positive10: { it: "Positivi 10G", en: "Positive 10D" },
  streak: { it: "Serie positiva 20G", en: "Positive streak 20D" },
  distanceSma20: { it: "Distanza SMA20", en: "SMA20 distance" },
  rvol: { it: "RVOL", en: "RVOL" },
  volatility20d: { it: "Volatilita 20G", en: "20D volatility" },
  monthReturn: { it: "Rendimento 1M", en: "1M return" },
  dailyReturn: { it: "Rendimento 1G", en: "1D return" },
  threeDayReturn: { it: "Rendimento 3G", en: "3D return" },
  weekReturn: { it: "Rendimento 1S", en: "1W return" },
  distance52wHigh: { it: "Distanza massimo 52S", en: "52W high distance" },
  maxDrawdown52w: { it: "Drawdown massimo 52S", en: "52W maximum drawdown" },
  distanceSma200: { it: "Distanza SMA200", en: "SMA200 distance" },
  smaCross: { it: "Regime SMA50/SMA200", en: "SMA50/SMA200 regime" },
  drawdownFromAth: { it: "Drawdown da ATH", en: "Drawdown from ATH" },
  range52wPosition: { it: "Posizione range 52W", en: "52W range position" },
  year1Return: { it: "Rendimento 1Y", en: "1Y return" },
  quality: { it: "Qualita fondo", en: "Fund quality" },
};

export function computeProfileStatus(row, profile) {
  const normalized = normalizeProfile(profile);
  const evaluations = normalized.selectedMetrics.map((metric) => ({ metric, value: assessment(metric, row) }));
  const total = evaluations.reduce((sum, item) => sum + item.value, 0);
  const maximum = evaluations.length * 2;
  const score = maximum ? Math.round(((total + maximum) / (maximum * 2)) * 100) : 50;
  const status = score >= 75 ? "strong_buy" : score >= 55 ? "buy" : score >= 35 ? "hold" : "sell";
  const reasons = { it: [], en: [] };
  for (const item of evaluations) {
    const label = METRIC_LABELS[item.metric];
    const direction = item.value > 0 ? ["favorevole", "favorable"] : item.value < 0 ? ["sfavorevole", "unfavorable"] : ["neutra", "neutral"];
    reasons.it.push(`${label.it}: lettura ${direction[0]} (${item.value > 0 ? "+" : ""}${item.value}).`);
    reasons.en.push(`${label.en}: ${direction[1]} reading (${item.value > 0 ? "+" : ""}${item.value}).`);
  }
  return { ...normalized, status, score, reasons };
}