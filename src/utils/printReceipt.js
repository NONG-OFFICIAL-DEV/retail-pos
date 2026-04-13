// composables/useReceipt.js
// RAW ESC/POS via QZ Tray + Canvas-based Khmer image rendering
// Diamond thermal printer over WiFi

import { ref } from 'vue'
import qz from 'qz-tray'

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const PAPER_WIDTH_PX = 576   // 80mm @ 203dpi = 576px. Use 384 for 58mm.
const CHAR_WIDTH     = 32    // chars per line for text rows

// ─────────────────────────────────────────────────────────────────────────────
// ESC/POS constants
// ─────────────────────────────────────────────────────────────────────────────
const ESC = '\x1B'
const GS  = '\x1D'
const LF  = '\x0A'

const INIT         = ESC + '@'
const ALIGN_CENTER = ESC + 'a\x01'
const ALIGN_LEFT   = ESC + 'a\x00'
const BOLD_ON      = ESC + 'E\x01'
const BOLD_OFF     = ESC + 'E\x00'
const DOUBLE_ON    = ESC + '!\x30'
const DOUBLE_OFF   = ESC + '!\x00'
const CUT          = GS  + 'V\x41\x05'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const PAY_LABEL = {
  cash: 'Cash', card: 'Card',
  qr_code: 'QR Code', qr: 'QR',
  online: 'Transfer', transfer: 'Transfer',
}

const money  = v      => parseFloat(v || 0).toFixed(2)
const pad    = (s, n) => String(s).padEnd(n, ' ')
const twoCol = (l, r) => {
  const gap = Math.max(1, CHAR_WIDTH - l.length - r.length)
  return l + ' '.repeat(gap) + r
}
const line  = () => '-'.repeat(CHAR_WIDTH) + LF
const dLine = () => '='.repeat(CHAR_WIDTH) + LF

const hasKhmer = s => /[\u1780-\u17FF]/.test(s)

// ─────────────────────────────────────────────────────────────────────────────
// Render text (Khmer or mixed) to ESC/POS raster image bytes via Canvas
// ─────────────────────────────────────────────────────────────────────────────
function textToEscPosImage(text, { bold = false, fontSize = 16, align = 'left' } = {}) {
  const canvas = document.createElement('canvas')
  const lineH  = fontSize + 10
  canvas.width = PAPER_WIDTH_PX

  const ctx = canvas.getContext('2d')
  const fontStr = (bold ? 'bold ' : '') + `${fontSize}px Hanuman, "Noto Sans Khmer", "Khmer OS", Arial, sans-serif`
  ctx.font = fontStr

  // Word-wrap
  const words = text.split(' ')
  const lines = []
  let cur = ''
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w
    if (ctx.measureText(test).width > PAPER_WIDTH_PX - 8) {
      if (cur) lines.push(cur)
      cur = w
    } else {
      cur = test
    }
  }
  if (cur) lines.push(cur)

  canvas.height = Math.max(1, lines.length * lineH + 4)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000000'
  ctx.font = fontStr
  ctx.textBaseline = 'top'

  lines.forEach((ln, i) => {
    const w = ctx.measureText(ln).width
    let x = 4
    if (align === 'center') x = Math.max(0, (PAPER_WIDTH_PX - w) / 2)
    if (align === 'right')  x = Math.max(0, PAPER_WIDTH_PX - w - 4)
    ctx.fillText(ln, x, i * lineH + 2)
  })

  return canvasToEscPosRaster(canvas)
}

function canvasToEscPosRaster(canvas) {
  const ctx = canvas.getContext('2d')
  const { width, height } = canvas
  const imgData    = ctx.getImageData(0, 0, width, height).data
  const bytesPerRow = Math.ceil(width / 8)
  const rows = []

  for (let y = 0; y < height; y++) {
    const row = new Uint8Array(bytesPerRow)
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const lum = 0.299 * imgData[idx] + 0.587 * imgData[idx+1] + 0.114 * imgData[idx+2]
      if (lum < 128) row[Math.floor(x / 8)] |= (0x80 >> (x % 8))
    }
    rows.push(row)
  }

  // GS v 0 raster bit image
  const xL = bytesPerRow & 0xFF
  const xH = (bytesPerRow >> 8) & 0xFF
  const yL = height & 0xFF
  const yH = (height >> 8) & 0xFF

  const out = [0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]
  for (const row of rows) out.push(...row)
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Build QZ Tray print job array
// ─────────────────────────────────────────────────────────────────────────────
function buildPrintJob(r) {
  const items    = r.items ?? []
  const subtotal = parseFloat(r.subtotal      ?? items.reduce((s, i) => s + i.qty * i.unit_price, 0))
  const discount = parseFloat(r.discount      ?? 0)
  const tax      = parseFloat(r.tax           ?? 0)
  const total    = parseFloat(r.total         ?? subtotal - discount + tax)
  const cash     = parseFloat(r.cash_tendered ?? 0)
  const change   = parseFloat(r.change_given  ?? 0)
  const payLbl   = PAY_LABEL[r.payment_method] ?? r.payment_method ?? '-'

  const job = []

  const pushText = str => {
    job.push({ type: 'raw', format: 'base64', data: toBase64(str) })
  }
  const pushImage = (text, opts) => {
    const bytes = textToEscPosImage(text, opts)
    job.push({ type: 'raw', format: 'base64', data: uint8ToBase64(bytes) })
  }

  // ── Init ──
  pushText(INIT)

  // ── Header ──
  pushText(ALIGN_CENTER + BOLD_ON + DOUBLE_ON)
  pushText((r.branch_name ?? 'MY STORE') + LF)
  pushText(DOUBLE_OFF + BOLD_OFF)
  if (r.branch_phone) pushText('Tel: ' + r.branch_phone + LF)

  // ── Order info ──
  pushText(ALIGN_LEFT + line())
  pushText(twoCol('Order #:', r.order_number ?? '-') + LF)
  pushText(twoCol('Date:',    r.printed_at   ?? new Date().toLocaleString()) + LF)
  pushText(twoCol('Cashier:', r.cashier      ?? '-') + LF)
  pushText(twoCol('Type:',    r.customer_type === 'wholesale' ? 'Wholesale' : 'Retail') + LF)
  pushText(line())

  // ── Items ──
  for (const item of items) {
    const name  = item.name ?? ''
    const unit  = item.unit ? ` (${item.unit})` : ''
    const label = name + unit

    pushText(ALIGN_LEFT)
    if (hasKhmer(label)) {
      // Render Khmer as canvas image
      pushImage(label, { bold: true, fontSize: 16, align: 'left' })
    } else {
      pushText(BOLD_ON + label + BOLD_OFF + LF)
    }

    const qtyStr   = `  ${item.qty} x $${money(item.unit_price)}`
    const totalStr = '$' + money(item.total_price ?? item.qty * item.unit_price)
    pushText(pad(qtyStr, CHAR_WIDTH - totalStr.length) + totalStr + LF)
  }

  // ── Totals ──
  pushText(line())
  pushText(twoCol('Subtotal:', '$' + money(subtotal)) + LF)
  if (discount > 0) pushText(twoCol('Discount:', '-$' + money(discount)) + LF)
  if (tax > 0)      pushText(twoCol('Tax:',       '$' + money(tax))      + LF)
  pushText(dLine())
  pushText(BOLD_ON + DOUBLE_ON)
  pushText(twoCol('TOTAL', '$' + money(total)) + LF)
  pushText(DOUBLE_OFF + BOLD_OFF + dLine())

  // ── Payment ──
  pushText(twoCol('Payment:', payLbl) + LF)
  if (cash   > 0) pushText(twoCol('Cash:',   '$' + money(cash))   + LF)
  if (change > 0) pushText(BOLD_ON + twoCol('Change:', '$' + money(change)) + BOLD_OFF + LF)

  // ── Footer ──
  pushText(line() + ALIGN_CENTER)
  pushText('Thank you for your purchase!' + LF)
  // Khmer footer as image
  pushImage('អរគុណសម្រាប់ការទិញ!', { fontSize: 16, align: 'center' })
  pushText(LF + LF + LF + CUT)

  return job
}

// ─────────────────────────────────────────────────────────────────────────────
// Encoding helpers
// ─────────────────────────────────────────────────────────────────────────────
function toBase64(str) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/gi,
      (_, p1) => String.fromCharCode(parseInt(p1, 16)))
  )
}

function uint8ToBase64(bytes) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

// ─────────────────────────────────────────────────────────────────────────────
// Composable
// ─────────────────────────────────────────────────────────────────────────────
export function useReceipt() {
  const printing = ref(false)
  const error    = ref(null)

  const print = async (receipt, printerName = 'Diamond') => {
    if (!receipt) { error.value = 'No receipt data'; return false }

    printing.value = true
    error.value    = null

    try {
      if (!qz.websocket.isActive()) await qz.websocket.connect()

      const printer = await qz.printers.find(printerName)
      const config  = qz.configs.create(printer)
      const data    = buildPrintJob(receipt)

      await qz.print(config, data)
      return true

    } catch (err) {
      error.value = err.message ?? 'Print failed'
      console.error('QZ Tray error:', err)
      return false
    } finally {
      printing.value = false
    }
  }

  return { printing, error, print }
}