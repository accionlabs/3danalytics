/**
 * Canvas2D renderers for ALL chart types rendered in VR.
 *
 * WebGPU (ChartGPU) cannot be used in VR because creating a WebGPU context
 * while a WebXR session is active fails in all major VR browsers. Every
 * chart type therefore gets a pure Canvas2D renderer here.
 *
 *   drawLineTexture   → multi-line chart  (revenue / multi-metric time-series)
 *   drawAreaTexture   → area / fill chart (churn rate, single-metric trend)
 *   drawBarTexture    → vertical bar chart (product revenue, counts)
 *   drawKpiTexture    → metric cards (label + value + trend)
 *   drawCohortTexture → retention heatmap grid
 *   drawFunnelTexture → horizontal bar funnel
 *
 * All functions accept `data: unknown` and use runtime field introspection —
 * no domain-specific type imports or casts. They work with any object array
 * whose fields match the expected shape at runtime.
 *
 * All functions return a THREE.CanvasTexture ready for a VRPanel material map.
 */
import * as THREE from 'three'

const BG = '#080c1c'
const BORDER = '#4488cc'
const TEXT_PRIMARY = '#e0e8f0'
const TEXT_SECONDARY = '#7090b0'
const CARD_BG = 'rgba(20, 30, 50, 0.85)'
const BRAND_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef']

// ─── Shared canvas helpers ────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>

function asRecords(data: unknown): AnyRecord[] {
  if (!Array.isArray(data)) return []
  return data.filter((item) => item !== null && typeof item === 'object') as AnyRecord[]
}

function str(obj: AnyRecord, key: string): string {
  const v = obj[key]
  return typeof v === 'string' ? v : String(v ?? '')
}

function num(obj: AnyRecord, key: string): number {
  const v = obj[key]
  return typeof v === 'number' && isFinite(v) ? v : 0
}

/** First key whose value is a string in the first record. */
function firstStringKey(record: AnyRecord): string {
  return Object.keys(record).find((k) => typeof record[k] === 'string') ?? ''
}

/** All keys whose first-row value is a finite number. */
function numericKeys(record: AnyRecord): string[] {
  return Object.keys(record).filter((k) => typeof record[k] === 'number' && isFinite(record[k] as number))
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = BORDER
  ctx.lineWidth = 3
  ctx.strokeRect(2, 2, size - 4, size - 4)
  return [canvas, ctx]
}

function drawTitle(ctx: CanvasRenderingContext2D, title: string, size: number, y = 36): void {
  ctx.fillStyle = TEXT_PRIMARY
  ctx.font = 'bold 26px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(title, size / 2, y, size - 32)
}

function canvasToTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

// ─── KPI card renderer ────────────────────────────────────────────────────────

/**
 * Renders an array of metric objects as KPI cards.
 *
 * Field detection (first numeric key = value, first string key = label):
 *   { label, value, unit, trend, trendDirection } → ideal shape
 *   { name, count }                                → works (name=label, count=value)
 *   Any object with ≥1 string + ≥1 number fields  → renders with what it finds
 */
export function drawKpiTexture(data: unknown, title: string, size: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size)
  drawTitle(ctx, title, size)

  const records = asRecords(data)
  if (records.length === 0) return canvasToTexture(canvas)

  const sample = records[0]
  const labelKey = firstStringKey(sample)
  const numKeys = numericKeys(sample)
  const valueKey = numKeys[0] ?? ''
  const trendKey = numKeys.find((k) => k.toLowerCase().includes('trend')) ?? numKeys[1] ?? ''
  const unitKey = Object.keys(sample).find((k) => k.toLowerCase() === 'unit') ?? ''
  const dirKey = Object.keys(sample).find((k) => k.toLowerCase().includes('direction')) ?? ''

  const cols = records.length <= 3 ? records.length : Math.ceil(records.length / 2)
  const rows = Math.ceil(records.length / cols)
  const pad = 16
  const topOffset = 56
  const cardW = Math.floor((size - pad * (cols + 1)) / cols)
  const cardH = Math.floor((size - topOffset - pad * (rows + 1)) / rows)

  records.forEach((metric, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = pad + col * (cardW + pad)
    const y = topOffset + pad + row * (cardH + pad)

    ctx.fillStyle = CARD_BG
    ctx.beginPath()
    ctx.roundRect(x, y, cardW, cardH, 8)
    ctx.fill()

    ctx.strokeStyle = '#1e2a40'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(x, y, cardW, cardH, 8)
    ctx.stroke()

    const labelSize = Math.max(13, Math.floor(cardH * 0.16))
    const valueSize = Math.max(20, Math.floor(cardH * 0.32))
    const trendSize = Math.max(12, Math.floor(cardH * 0.15))

    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    // Label
    ctx.fillStyle = TEXT_SECONDARY
    ctx.font = `${labelSize}px system-ui, sans-serif`
    ctx.fillText(labelKey ? str(metric, labelKey) : `Metric ${i + 1}`, x + 10, y + cardH * 0.12, cardW - 20)

    // Value
    const rawValue = valueKey ? num(metric, valueKey) : 0
    const unit = unitKey ? str(metric, unitKey) : ''
    const displayValue = unit === '$'
      ? rawValue >= 1e6 ? `$${(rawValue / 1e6).toFixed(1)}M`
        : rawValue >= 1e3 ? `$${(rawValue / 1e3).toFixed(rawValue >= 1e4 ? 0 : 1)}k`
          : `$${rawValue.toFixed(2)}`
      : unit === '%' ? `${rawValue}%`
        : rawValue >= 1e3 ? `${(rawValue / 1e3).toFixed(1)}k`
          : `${rawValue}`
    ctx.fillStyle = TEXT_PRIMARY
    ctx.font = `bold ${valueSize}px system-ui, sans-serif`
    ctx.fillText(displayValue, x + 10, y + cardH * 0.35, cardW - 20)

    // Trend
    const trendVal = trendKey ? num(metric, trendKey) : 0
    const dir = dirKey ? str(metric, dirKey) : (trendVal > 0 ? 'up' : trendVal < 0 ? 'down' : 'flat')
    const trendColor = dir === 'up' ? '#10b981' : dir === 'down' ? '#f43f5e' : '#6b7280'
    ctx.fillStyle = trendColor
    ctx.font = `${trendSize}px system-ui, sans-serif`
    ctx.fillText(`${trendVal > 0 ? '+' : ''}${trendVal}%`, x + 10, y + cardH * 0.68, cardW - 20)
  })

  return canvasToTexture(canvas)
}

// ─── Cohort heatmap renderer ──────────────────────────────────────────────────

/**
 * Renders a cohort retention heatmap.
 *
 * Field detection:
 *   { cohort, retention: number[] } → ideal shape
 *   Any object with a string field + an array-of-numbers field → works
 */
function cohortColor(value: number): string {
  if (value >= 80) return '#10b981'
  if (value >= 60) return '#34d399'
  if (value >= 40) return '#fbbf24'
  if (value >= 20) return '#f97316'
  return '#ef4444'
}

export function drawCohortTexture(data: unknown, title: string, size: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size)
  drawTitle(ctx, title, size)

  const records = asRecords(data)
  if (records.length === 0) return canvasToTexture(canvas)

  const sample = records[0]
  const labelKey = firstStringKey(sample)

  // Find the key whose value is an array of numbers
  const arrayKey = Object.keys(sample).find((k) => {
    const v = sample[k]
    return Array.isArray(v) && v.length > 0 && typeof v[0] === 'number'
  }) ?? ''

  // If no array key, fall back to numeric keys rendered as cells
  const useNumericFallback = !arrayKey
  const numKeys = useNumericFallback ? numericKeys(sample) : []

  const maxMonths = arrayKey
    ? Math.max(...records.map((r) => (Array.isArray(r[arrayKey]) ? (r[arrayKey] as number[]).length : 0)), 1)
    : numKeys.length

  const labelW = 58
  const headerH = 28
  const top = 54
  const left = 10
  const cellW = Math.floor((size - left - labelW - 6) / Math.max(maxMonths, 1))
  const cellH = Math.floor((size - top - headerH - 6) / Math.max(records.length, 1))

  // Month / column headers
  ctx.fillStyle = TEXT_SECONDARY
  ctx.font = '13px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const headerLabels = useNumericFallback ? numKeys : Array.from({ length: maxMonths }, (_, i) => `M${i}`)
  headerLabels.forEach((lbl, m) => {
    const x = left + labelW + m * cellW + cellW / 2
    ctx.fillText(lbl, x, top + headerH / 2)
  })

  // Rows
  records.forEach((row, ri) => {
    const rowY = top + headerH + ri * cellH

    ctx.fillStyle = TEXT_SECONDARY
    ctx.font = '12px system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(labelKey ? str(row, labelKey) : `Row ${ri + 1}`, left + labelW - 4, rowY + cellH / 2)

    const cells: number[] = arrayKey
      ? ((row[arrayKey] as number[]) ?? [])
      : numKeys.map((k) => num(row, k))

    cells.forEach((value, mi) => {
      const cellX = left + labelW + mi * cellW
      ctx.fillStyle = cohortColor(value)
      ctx.fillRect(cellX + 1, rowY + 1, cellW - 2, cellH - 2)
      ctx.fillStyle = value >= 40 ? '#0a0a1a' : '#ffffff'
      ctx.font = 'bold 11px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${value}%`, cellX + cellW / 2, rowY + cellH / 2)
    })
  })

  return canvasToTexture(canvas)
}

// ─── Funnel renderer ──────────────────────────────────────────────────────────

/**
 * Renders a funnel chart as horizontal bars.
 *
 * Field detection:
 *   { stage, count, conversionRate } → ideal shape
 *   Any object with a string field + at least one numeric field → works
 */
export function drawFunnelTexture(data: unknown, title: string, size: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size)
  drawTitle(ctx, title, size)

  const records = asRecords(data)
  if (records.length === 0) return canvasToTexture(canvas)

  const sample = records[0]
  const labelKey = firstStringKey(sample)
  const keys = numericKeys(sample)
  const countKey = keys[0] ?? ''
  const rateKey = keys.find((k) => k.toLowerCase().includes('rate') || k.toLowerCase().includes('conv')) ?? keys[1] ?? ''

  const maxCount = records.reduce((m, r) => Math.max(m, countKey ? num(r, countKey) : 0), 1)

  const top = 56
  const pad = 12
  const labelH = 18
  const barH = Math.max(14, Math.floor((size - top - pad * 2 - records.length * (labelH + 6)) / records.length))
  const rowH = labelH + barH + 8

  records.forEach((stage, i) => {
    const rowY = top + pad + i * rowH
    const count = countKey ? num(stage, countKey) : 0
    const barWidth = Math.max(40, Math.floor((count / maxCount) * (size - pad * 2)))
    const color = BRAND_COLORS[i % BRAND_COLORS.length]
    const label = labelKey ? str(stage, labelKey) : `Stage ${i + 1}`
    const rate = rateKey ? num(stage, rateKey) : 0

    ctx.fillStyle = TEXT_PRIMARY
    ctx.font = 'bold 13px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(label, pad, rowY, size * 0.55)

    ctx.fillStyle = TEXT_SECONDARY
    ctx.font = '12px system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(
      `${count.toLocaleString()}${rateKey ? ` (${rate}%)` : ''}`,
      size - pad, rowY, size * 0.4,
    )

    const grd = ctx.createLinearGradient(pad, 0, pad + barWidth, 0)
    grd.addColorStop(0, color)
    grd.addColorStop(1, `${color}88`)
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.roundRect(pad, rowY + labelH + 2, barWidth, barH, 3)
    ctx.fill()
  })

  return canvasToTexture(canvas)
}

const PLOT_PAD = { top: 58, right: 20, bottom: 36, left: 52 }

function valueRange(records: AnyRecord[], keys: string[]): [number, number] {
  let lo = Infinity, hi = -Infinity
  for (const r of records) for (const k of keys) {
    const v = num(r, k); lo = Math.min(lo, v); hi = Math.max(hi, v)
  }
  if (!isFinite(lo)) { lo = 0; hi = 1 }
  if (lo === hi) { lo -= 1; hi += 1 }
  return [lo, hi]
}

function drawCartesianGrid(
  ctx: CanvasRenderingContext2D,
  size: number,
  minVal: number,
  maxVal: number,
): { toX: (i: number, n: number) => number; toY: (v: number) => number } {
  const { top, right, bottom, left } = PLOT_PAD
  const pw = size - left - right
  const ph = size - top - bottom

  ctx.strokeStyle = '#1a2540'
  ctx.lineWidth = 1
  const gridCount = 4
  for (let g = 0; g <= gridCount; g++) {
    const y = top + (g / gridCount) * ph
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(size - right, y); ctx.stroke()
    const val = maxVal - (g / gridCount) * (maxVal - minVal)
    ctx.fillStyle = TEXT_SECONDARY
    ctx.font = '11px system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    const label = val >= 1e6 ? `${(val / 1e6).toFixed(1)}M`
      : val >= 1e3 ? `${(val / 1e3).toFixed(0)}k`
        : val.toFixed(val < 10 ? 1 : 0)
    ctx.fillText(label, left - 4, y)
  }
  ctx.strokeStyle = '#2a3550'
  ctx.lineWidth = 1
  ctx.strokeRect(left, top, pw, ph)

  return {
    toX: (i: number, n: number) => left + (i / Math.max(n - 1, 1)) * pw,
    toY: (v: number) => top + ph - ((v - minVal) / (maxVal - minVal)) * ph,
  }
}

function drawLegend(ctx: CanvasRenderingContext2D, keys: string[], size: number): void {
  if (keys.length <= 1) return
  const y = size - 14
  let x = PLOT_PAD.left
  ctx.font = '11px system-ui, sans-serif'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < Math.min(keys.length, 4); i++) {
    const color = BRAND_COLORS[i % BRAND_COLORS.length]
    ctx.fillStyle = color
    ctx.fillRect(x, y - 4, 14, 8)
    ctx.fillStyle = TEXT_SECONDARY
    ctx.textAlign = 'left'
    const label = keys[i].length > 12 ? keys[i].slice(0, 11) + '…' : keys[i]
    ctx.fillText(label, x + 18, y)
    x += 18 + ctx.measureText(label).width + 14
    if (x > size - 40) break
  }
}

// ─── Line chart renderer ──────────────────────────────────────────────────────

/**
 * Multi-line chart: one line per numeric field found in the data.
 * Ideal for time-series data with multiple metrics (e.g. MRR, new revenue, churned).
 */
export function drawLineTexture(data: unknown, title: string, size: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size)
  drawTitle(ctx, title, size)

  const records = asRecords(data)
  if (records.length === 0) return canvasToTexture(canvas)

  const keys = numericKeys(records[0])
  if (keys.length === 0) return canvasToTexture(canvas)

  const [minVal, maxVal] = valueRange(records, keys)
  const { toX, toY } = drawCartesianGrid(ctx, size, minVal, maxVal)

  keys.forEach((key, ki) => {
    const color = BRAND_COLORS[ki % BRAND_COLORS.length]
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.beginPath()
    records.forEach((r, i) => {
      const x = toX(i, records.length)
      const y = toY(num(r, key))
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()
  })

  drawLegend(ctx, keys, size)
  return canvasToTexture(canvas)
}

// ─── Area chart renderer ──────────────────────────────────────────────────────

/**
 * Filled-area chart using the first numeric field.
 * Ideal for single-metric trend data (e.g. churn rate over time).
 */
export function drawAreaTexture(data: unknown, title: string, size: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size)
  drawTitle(ctx, title, size)

  const records = asRecords(data)
  if (records.length === 0) return canvasToTexture(canvas)

  const keys = numericKeys(records[0])
  if (keys.length === 0) return canvasToTexture(canvas)

  const valueKey = keys[0]
  const [minVal, maxVal] = valueRange(records, [valueKey])
  const { top, right, bottom, left } = PLOT_PAD
  const ph = size - top - bottom
  const baseY = top + ph
  const { toX, toY } = drawCartesianGrid(ctx, size, minVal, maxVal)
  const color = '#f43f5e'

  ctx.beginPath()
  records.forEach((r, i) => {
    const x = toX(i, records.length)
    const y = toY(num(r, valueKey))
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.lineTo(toX(records.length - 1, records.length), baseY)
  ctx.lineTo(toX(0, records.length), baseY)
  ctx.closePath()
  ctx.fillStyle = `${color}55`
  ctx.fill()

  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.beginPath()
  records.forEach((r, i) => {
    const x = toX(i, records.length)
    const y = toY(num(r, valueKey))
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.stroke()

  // suppress unused var warning
  void right; void left; void bottom

  return canvasToTexture(canvas)
}

// ─── Vertical bar chart renderer ─────────────────────────────────────────────

/**
 * Vertical bar chart using the first numeric field.
 * Each record becomes one bar; the first string field labels the x-axis.
 */
export function drawBarTexture(data: unknown, title: string, size: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(size)
  drawTitle(ctx, title, size)

  const records = asRecords(data)
  if (records.length === 0) return canvasToTexture(canvas)

  const sample = records[0]
  const keys = numericKeys(sample)
  const valueKey = keys[0] ?? ''
  const labelKey = firstStringKey(sample)
  if (!valueKey) return canvasToTexture(canvas)

  const [, maxVal] = valueRange(records, [valueKey])
  const { top, right, bottom, left } = PLOT_PAD
  const pw = size - left - right
  const ph = size - top - bottom
  const baseY = top + ph

  ctx.strokeStyle = '#1a2540'
  ctx.lineWidth = 1
  for (let g = 1; g <= 4; g++) {
    const y = baseY - (g / 4) * ph
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(size - right, y); ctx.stroke()
    const val = (g / 4) * maxVal
    ctx.fillStyle = TEXT_SECONDARY
    ctx.font = '11px system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(val >= 1e3 ? `${(val / 1e3).toFixed(0)}k` : `${val.toFixed(0)}`, left - 4, y)
  }
  ctx.strokeStyle = '#2a3550'
  ctx.lineWidth = 1
  ctx.strokeRect(left, top, pw, ph)

  const barW = Math.max(4, Math.floor(pw / records.length) - 4)

  records.forEach((r, i) => {
    const value = num(r, valueKey)
    const barH = Math.max(2, Math.floor((value / maxVal) * ph))
    const x = left + Math.floor((i / records.length) * pw) + 2
    const y = baseY - barH
    const color = BRAND_COLORS[i % BRAND_COLORS.length]
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0])
    ctx.fill()
    if (labelKey) {
      const lbl = str(r, labelKey)
      const short = lbl.length > 6 ? lbl.slice(0, 5) + '…' : lbl
      ctx.fillStyle = TEXT_SECONDARY
      ctx.font = '11px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(short, x + barW / 2, baseY + 4)
    }
  })

  void right; void bottom

  return canvasToTexture(canvas)
}
