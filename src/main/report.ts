import { BrowserWindow } from 'electron'
import {
  allocationByCategory,
  allocationByLiquidity,
  buildTimeline,
  formatCurrency,
  formatPct,
  formatPeriod,
  formatSigned,
  movementsForPeriod,
  shortPeriod
} from '../shared/domain'
import type { Database } from '../shared/types'

/** The Aureon logo (gold plate + faceted gem), inlined so the report stays self-contained. */
const LOGO_SVG = `<svg class="logo" width="34" height="34" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="agGold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f7dc94"/><stop offset="0.55" stop-color="#ecc06a"/><stop offset="1" stop-color="#cf9f38"/>
    </linearGradient>
    <linearGradient id="agSheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="512" height="512" rx="116" fill="url(#agGold)"/>
  <rect x="0" y="0" width="512" height="512" rx="116" fill="url(#agSheen)"/>
  <g stroke="#ffffff" stroke-opacity="0.09" stroke-width="1.6" stroke-linejoin="round">
    <polygon points="196,150 176,214 132,214" fill="#0e1320"/>
    <polygon points="316,150 380,214 336,214" fill="#1e2841"/>
    <polygon points="196,150 316,150 336,214 176,214" fill="#2b3654"/>
    <polygon points="132,214 176,214 256,372" fill="#0f1522"/>
    <polygon points="176,214 256,214 256,372" fill="#182138"/>
    <polygon points="256,214 336,214 256,372" fill="#212b47"/>
    <polygon points="336,214 380,214 256,372" fill="#131b2c"/>
  </g>
  <polygon points="208,162 250,162 224,198" fill="#ffffff" fill-opacity="0.16"/>
  <polygon points="196,150 316,150 380,214 256,372 132,214" fill="none" stroke="#000000" stroke-opacity="0.30" stroke-width="3" stroke-linejoin="round"/>
</svg>`

/** Builds a self-contained, printable HTML report for a given period. */
export function generateReportHtml(db: Database, period: string): string {
  const { currency, locale } = db.profile
  const timeline = buildTimeline(db)
  const current = timeline.find((t) => t.period === period)
  const total = current?.total ?? 0
  const delta = current?.delta ?? 0
  const flow = current?.flow ?? 0
  const perf = current?.performance ?? 0
  const perfPct = current?.performancePct ?? null

  const cats = allocationByCategory(db, period)
  const liq = allocationByLiquidity(db, period)
  const movements = movementsForPeriod(db, period)

  const notes = movements.filter((m) => m.note && m.note.trim().length > 0)

  const spark = sparkline(timeline.map((t) => t.total))

  const kpi = (label: string, value: string, tone = '') =>
    `<div class="kpi"><div class="kpi-l">${label}</div><div class="kpi-v ${tone}">${value}</div></div>`

  const catRows = cats
    .map(
      (c) => `<tr>
        <td><span class="dot" style="background:${c.color}"></span>${esc(c.label)}</td>
        <td class="num">${formatCurrency(c.value, currency, locale)}</td>
        <td class="num muted">${c.pct.toFixed(1)} %</td></tr>`
    )
    .join('')

  const moveRows = movements
    .map((m) => {
      const tone = m.performance > 0 ? 'pos' : m.performance < 0 ? 'neg' : 'muted'
      return `<tr>
        <td>${esc(m.productName)}<div class="sub">${esc(m.platformName)}</div></td>
        <td class="num">${formatCurrency(m.value, currency, locale)}</td>
        <td class="num">${m.flow !== 0 ? formatSigned(m.flow, currency, locale) : '—'}</td>
        <td class="num ${tone}">${m.prevValue === null ? '—' : formatSigned(m.performance, currency, locale)}</td>
      </tr>`
    })
    .join('')

  const notesBlock = notes.length
    ? `<div class="section"><h2>Justifications</h2>${notes
        .map(
          (n) =>
            `<div class="note"><strong>${esc(n.productName)}</strong> · ${formatSigned(
              n.delta,
              currency,
              locale
            )} — ${esc(n.note ?? '')}</div>`
        )
        .join('')}</div>`
    : ''

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
  <title>Aureon — ${esc(formatPeriod(period, locale))}</title>
  <style>
    :root{--bg:#0b0f1a;--card:#141a28;--line:#232c40;--txt:#e8eefc;--mut:#9fb0cc;
      --gold:#e8c169;--pos:#4ade9a;--neg:#ff7a85}
    *{box-sizing:border-box}
    body{margin:0;padding:40px;font-family:Inter,Segoe UI,system-ui,sans-serif;
      background:var(--bg);color:var(--txt);-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .head{display:flex;justify-content:space-between;align-items:flex-end;
      border-bottom:1px solid var(--line);padding-bottom:20px;margin-bottom:28px}
    .brand{display:flex;align-items:center;gap:12px;font-weight:700;font-size:20px}
    .logo{width:34px;height:34px;display:block;flex-shrink:0}
    .period{color:var(--mut);font-size:14px;text-align:right}
    .period b{display:block;color:var(--txt);font-size:18px}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
    .kpi{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px}
    .kpi-l{color:var(--mut);font-size:12px;text-transform:uppercase;letter-spacing:.06em}
    .kpi-v{font-size:22px;font-weight:700;margin-top:6px}
    .pos{color:var(--pos)} .neg{color:var(--neg)} .muted{color:var(--mut)}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
    .section{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px 22px;margin-bottom:20px}
    h2{font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:var(--mut);margin:0 0 14px}
    table{width:100%;border-collapse:collapse;font-size:14px}
    th{text-align:left;color:var(--mut);font-weight:500;font-size:12px;padding:6px 8px;border-bottom:1px solid var(--line)}
    td{padding:9px 8px;border-bottom:1px solid rgba(35,44,64,.5)}
    .num{text-align:right;font-variant-numeric:tabular-nums}
    .dot{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:8px;vertical-align:middle}
    .sub{color:var(--mut);font-size:11px}
    .note{padding:8px 0;border-bottom:1px solid rgba(35,44,64,.5);font-size:13px;color:var(--txt)}
    .note strong{color:var(--gold)}
    .spark{margin-top:8px}
    .foot{margin-top:24px;color:var(--mut);font-size:11px;text-align:center}
    .liq{display:flex;gap:8px;margin-top:6px}
    .liq .seg{height:10px;border-radius:5px}
  </style></head><body>
    <div class="head">
      <div class="brand">${LOGO_SVG}Aureon</div>
      <div class="period">Rapport patrimonial<b>${esc(formatPeriod(period, locale))}</b></div>
    </div>
    <div class="kpis">
      ${kpi('Patrimoine total', formatCurrency(total, currency, locale))}
      ${kpi('Variation du mois', formatSigned(delta, currency, locale), delta >= 0 ? 'pos' : 'neg')}
      ${kpi('Flux (apports/retraits)', flow !== 0 ? formatSigned(flow, currency, locale) : '—')}
      ${kpi('Performance réelle', formatSigned(perf, currency, locale) + ' · ' + formatPct(perfPct, locale), perf >= 0 ? 'pos' : 'neg')}
    </div>
    <div class="section">
      <h2>Évolution du patrimoine</h2>
      ${spark}
      <div style="display:flex;justify-content:space-between;color:var(--mut);font-size:11px;margin-top:6px">
        <span>${timeline.length ? shortPeriod(timeline[0].period, locale) : ''}</span>
        <span>${timeline.length ? shortPeriod(timeline[timeline.length - 1].period, locale) : ''}</span>
      </div>
    </div>
    <div class="grid2">
      <div class="section">
        <h2>Répartition par catégorie</h2>
        <table><tbody>${catRows || '<tr><td class="muted">Aucune donnée</td></tr>'}</tbody></table>
      </div>
      <div class="section">
        <h2>Disponibilité</h2>
        <div class="liq">${liq
          .map((l) => `<div class="seg" style="flex:${Math.max(l.pct, 0.5)};background:${l.color}"></div>`)
          .join('')}</div>
        <table style="margin-top:12px"><tbody>${liq
          .map(
            (l) =>
              `<tr><td><span class="dot" style="background:${l.color}"></span>${l.label}</td>
              <td class="num">${formatCurrency(l.value, currency, locale)}</td>
              <td class="num muted">${l.pct.toFixed(1)} %</td></tr>`
          )
          .join('')}</tbody></table>
      </div>
    </div>
    <div class="section">
      <h2>Détail par produit</h2>
      <table>
        <thead><tr><th>Produit</th><th class="num">Valeur</th><th class="num">Flux</th><th class="num">Perf. réelle</th></tr></thead>
        <tbody>${moveRows || '<tr><td class="muted">Aucune saisie</td></tr>'}</tbody>
      </table>
    </div>
    ${notesBlock}
    <div class="foot">Généré par Aureon le ${new Date().toLocaleString(locale)} · Document personnel</div>
  </body></html>`
}

/** Renders an HTML string to a PDF buffer using an offscreen window. */
export async function renderPdf(html: string): Promise<Buffer> {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true }
  })
  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    // Give the layout a tick to settle.
    await new Promise((r) => setTimeout(r, 250))
    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    })
    return pdf
  } finally {
    win.destroy()
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string
  )
}

/** Minimal inline SVG area sparkline of the value timeline. */
function sparkline(values: number[]): string {
  const w = 720
  const h = 90
  if (values.length === 0) return `<svg class="spark" width="100%" viewBox="0 0 ${w} ${h}"></svg>`
  if (values.length === 1) values = [values[0], values[0]]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = w / (values.length - 1)
  const pts = values.map((v, i) => {
    const x = i * step
    const y = h - ((v - min) / range) * (h - 12) - 6
    return [x, y] as const
  })
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`
  return `<svg class="spark" width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#e8c169" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#e8c169" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#g)"/>
    <path d="${line}" fill="none" stroke="#e8c169" stroke-width="2.5" stroke-linejoin="round"/>
  </svg>`
}
