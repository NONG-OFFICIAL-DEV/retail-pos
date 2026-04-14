// composables/useReceipt.js
// ─────────────────────────────────────────────────────────────────────────────
// Universal printing — auto detects device:
//   Mac / Desktop  → QZ Tray (WiFi, Khmer canvas image rendering)
//   Android Tablet → WebUSB  (USB OTG cable, raw ESC/POS bytes)
// ─────────────────────────────────────────────────────────────────────────────

import { ref } from 'vue'

// Lazy load qz-tray — avoids top-level await issues in some bundlers
let _qz = null
async function getQz() {
  if (_qz) return _qz
  try {
    const mod = await import('qz-tray')
    _qz = mod.default ?? mod
    return _qz
  } catch (_) {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const PAPER_WIDTH_PX = 576  // 80mm @203dpi. Use 384 for 58mm.
const CHAR_WIDTH     = 24   // chars per line — 58mm paper
const QZ_PRINTER     = 'Diamond' // QZ Tray printer name

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

const money    = v      => parseFloat(v || 0).toFixed(2)
const pad      = (s, n) => String(s).padEnd(n, ' ')
const hasKhmer = s      => /[\u1780-\u17FF]/.test(s)
const twoCol   = (l, r) => {
  const gap = Math.max(1, CHAR_WIDTH - l.length - r.length)
  return l + ' '.repeat(gap) + r
}
const line  = () => '-'.repeat(CHAR_WIDTH) + LF
const dLine = () => '='.repeat(CHAR_WIDTH) + LF

// Detect Android
const isAndroid = () => /android/i.test(navigator.userAgent)

// ─────────────────────────────────────────────────────────────────────────────
// Khmer canvas image → ESC/POS raster bytes (desktop/QZ Tray only)
// ─────────────────────────────────────────────────────────────────────────────
function textToEscPosImage(text, { bold = false, fontSize = 16, align = 'left' } = {}) {
  const canvas  = document.createElement('canvas')
  const lineH   = fontSize + 10
  canvas.width  = PAPER_WIDTH_PX
  const fontStr = (bold ? 'bold ' : '') + `${fontSize}px Hanuman, "Noto Sans Khmer", Arial, sans-serif`
  const ctx     = canvas.getContext('2d')
  ctx.font      = fontStr

  const words = text.split(' ')
  const lines = []
  let cur = ''
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w
    if (ctx.measureText(test).width > PAPER_WIDTH_PX - 8) {
      if (cur) lines.push(cur)
      cur = w
    } else { cur = test }
  }
  if (cur) lines.push(cur)

  canvas.height = Math.max(1, lines.length * lineH + 4)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000'
  ctx.font = fontStr
  ctx.textBaseline = 'top'
  lines.forEach((ln, i) => {
    const w = ctx.measureText(ln).width
    let x = 4
    if (align === 'center') x = Math.max(0, (PAPER_WIDTH_PX - w) / 2)
    if (align === 'right')  x = Math.max(0, PAPER_WIDTH_PX - w - 4)
    ctx.fillText(ln, x, i * lineH + 2)
  })
  return canvasToRaster(canvas)
}

function canvasToRaster(canvas) {
  const ctx         = canvas.getContext('2d')
  const { width, height } = canvas
  const imgData     = ctx.getImageData(0, 0, width, height).data
  const bytesPerRow = Math.ceil(width / 8)
  const rows        = []
  for (let y = 0; y < height; y++) {
    const row = new Uint8Array(bytesPerRow)
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const lum = 0.299 * imgData[idx] + 0.587 * imgData[idx+1] + 0.114 * imgData[idx+2]
      if (lum < 128) row[Math.floor(x / 8)] |= (0x80 >> (x % 8))
    }
    rows.push(row)
  }
  const xL = bytesPerRow & 0xFF, xH = (bytesPerRow >> 8) & 0xFF
  const yL = height & 0xFF,      yH = (height >> 8) & 0xFF
  const out = [0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]
  for (const row of rows) out.push(...row)
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Build receipt totals
// ─────────────────────────────────────────────────────────────────────────────
function buildTotals(r) {
  const items    = r.items ?? []
  const subtotal = parseFloat(r.subtotal      ?? items.reduce((s, i) => s + i.qty * i.unit_price, 0))
  const discount = parseFloat(r.discount      ?? 0)
  const tax      = parseFloat(r.tax           ?? 0)
  const total    = parseFloat(r.total         ?? subtotal - discount + tax)
  const cash     = parseFloat(r.cash_tendered ?? 0)
  const change   = parseFloat(r.change_given  ?? 0)
  const payLbl   = PAY_LABEL[r.payment_method] ?? r.payment_method ?? '-'
  return { items, subtotal, discount, tax, total, cash, change, payLbl }
}

// ─────────────────────────────────────────────────────────────────────────────
// QZ Tray print job (desktop — supports Khmer image)
// ─────────────────────────────────────────────────────────────────────────────
function toBase64(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/gi,
    (_, p1) => String.fromCharCode(parseInt(p1, 16))))
}
function uint8ToBase64(bytes) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function buildQzJob(r) {
  const { items, subtotal, discount, tax, total, cash, change, payLbl } = buildTotals(r)
  const job = []
  const pushText  = str  => job.push({ type: 'raw', format: 'base64', data: toBase64(str) })
  const pushImage = (txt, opts) => {
    job.push({ type: 'raw', format: 'base64', data: uint8ToBase64(textToEscPosImage(txt, opts)) })
  }

  pushText(INIT)
  // Double HEIGHT only for shop name — 0x10 prevents overflow on 58mm
  pushText(ALIGN_CENTER + BOLD_ON + ESC + '!\x10')
  pushText((r.branch_name ?? 'MY STORE') + LF)
  pushText(ESC + '!\x00' + BOLD_OFF)
  if (r.branch_phone) pushText('Tel: ' + r.branch_phone + LF)

  pushText(ALIGN_LEFT + line())
  pushText(twoCol('Order #:', r.order_number ?? '-') + LF)
  pushText(twoCol('Date:',    r.printed_at   ?? new Date().toLocaleString()) + LF)
  pushText(twoCol('Cashier:', r.cashier      ?? '-') + LF)
  pushText(twoCol('Type:',    r.customer_type === 'wholesale' ? 'Wholesale' : 'Retail') + LF)
  pushText(line())

  for (const item of items) {
    const label = (item.name ?? '') + (item.unit ? ` (${item.unit})` : '')
    pushText(ALIGN_LEFT)
    if (hasKhmer(label)) {
      pushImage(label, { bold: true, fontSize: 16 })
    } else {
      pushText(BOLD_ON + label + BOLD_OFF + LF)
    }
    const qtyStr   = `  ${item.qty} x $${money(item.unit_price)}`
    const totalStr = '$' + money(item.total_price ?? item.qty * item.unit_price)
    pushText(pad(qtyStr, CHAR_WIDTH - totalStr.length) + totalStr + LF)
  }

  pushText(line())
  pushText(twoCol('Subtotal:', '$' + money(subtotal)) + LF)
  if (discount > 0) pushText(twoCol('Discount:', '-$' + money(discount)) + LF)
  if (tax > 0)      pushText(twoCol('Tax:',       '$' + money(tax))      + LF)
  pushText(dLine())
  pushText(BOLD_ON + DOUBLE_ON + twoCol('TOTAL', '$' + money(total)) + LF + DOUBLE_OFF + BOLD_OFF)
  pushText(dLine())
  pushText(twoCol('Payment:', payLbl) + LF)
  if (cash   > 0) pushText(twoCol('Cash:',   '$' + money(cash))   + LF)
  if (change > 0) pushText(BOLD_ON + twoCol('Change:', '$' + money(change)) + BOLD_OFF + LF)
  pushText(line() + ALIGN_CENTER)
  pushText('Thank you for your purchase!' + LF)
  pushImage('អរគុណសម្រាប់ការទិញ!', { fontSize: 16, align: 'center' })
  pushText(LF + LF + LF + CUT)

  return job
}

// ─────────────────────────────────────────────────────────────────────────────
// WebUSB print job (Android — raw Uint8Array)
// Khmer stripped — printer cannot render Unicode in raw mode
// ─────────────────────────────────────────────────────────────────────────────
function buildUsbBytes(r) {
  const { items, subtotal, discount, tax, total, cash, change, payLbl } = buildTotals(r)

  const bytes = []
  // Strip ALL non-ASCII chars first, then encode as Latin-1 bytes
  // This prevents Khmer/unicode from reaching the printer as garbled bytes
  const t = str => {
    const safe = str.replace(/[^\x20-\x7E\n]/g, '') // only printable ASCII + newline
    for (let i = 0; i < safe.length; i++) bytes.push(safe.charCodeAt(i) & 0xFF)
  }
  const b     = arr => bytes.push(...arr)
  const ESC_B = 0x1B, GS_B = 0x1D

  // Strip Khmer — keep Latin chars only
  // Strip all non-ASCII-printable chars (Khmer, special unicode, etc.)
  const stripKhmer = s => s.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim()

  b([ESC_B, 0x40])                              // init
  b([ESC_B, 0x61, 0x01])                        // center
  b([ESC_B, 0x45, 0x01, ESC_B, 0x21, 0x10])    // bold + double HEIGHT only
  t((r.branch_name ?? 'MY STORE') + '\n')
  b([ESC_B, 0x21, 0x00, ESC_B, 0x45, 0x00])    // normal
  if (r.branch_phone) t('Tel: ' + r.branch_phone + '\n')

  b([ESC_B, 0x61, 0x00])                        // left
  t(line())
  t(twoCol('Order #:', r.order_number ?? '-') + '\n')
  t(twoCol('Date:',    r.printed_at   ?? new Date().toLocaleString()) + '\n')
  t(twoCol('Cashier:', r.cashier      ?? '-') + '\n')
  t(twoCol('Type:',    r.customer_type === 'wholesale' ? 'Wholesale' : 'Retail') + '\n')
  t(line())

  for (const item of items) {
    const raw   = (item.name ?? '') + (item.unit ? ` (${item.unit})` : '')
    const latinOnly = stripKhmer(raw)
    const label = latinOnly || stripKhmer(item.name ?? '').split(' ')[0] || 'Item'
    // Double height for item name — easier to read on 58mm paper
    b([ESC_B, 0x45, 0x01])          // bold on
    b([ESC_B, 0x21, 0x10])          // double height only (not width, keeps layout)
    t(label.slice(0, CHAR_WIDTH) + '\n')
    b([ESC_B, 0x21, 0x00])          // normal size
    b([ESC_B, 0x45, 0x00])          // bold off
    const qtyStr   = `  ${item.qty} x $${money(item.unit_price)}`
    const totalStr = '$' + money(item.total_price ?? item.qty * item.unit_price)
    t(pad(qtyStr, CHAR_WIDTH - totalStr.length) + totalStr + '\n')
  }

  t(line())
  t(twoCol('Subtotal:', '$' + money(subtotal)) + '\n')
  if (discount > 0) t(twoCol('Discount:', '-$' + money(discount)) + '\n')
  if (tax > 0)      t(twoCol('Tax:',       '$' + money(tax))      + '\n')
  t(dLine())
  b([ESC_B, 0x45, 0x01, ESC_B, 0x21, 0x10])    // bold + double HEIGHT only
  t(twoCol('TOTAL', '$' + money(total)) + '\n')
  b([ESC_B, 0x21, 0x00, ESC_B, 0x45, 0x00])
  t(dLine())
  t(twoCol('Payment:', payLbl) + '\n')
  if (cash   > 0) t(twoCol('Cash:',   '$' + money(cash))   + '\n')
  if (change > 0) {
    b([ESC_B, 0x45, 0x01])
    t(twoCol('Change:', '$' + money(change)) + '\n')
    b([ESC_B, 0x45, 0x00])
  }
  t(line())
  b([ESC_B, 0x61, 0x01])  // center
  t('Thank you!\n')
  t('Please come again :)\n')
  t('\n\n\n')
  b([GS_B, 0x56, 0x41, 0x05])  // cut

  return new Uint8Array(bytes)
}

// ─────────────────────────────────────────────────────────────────────────────
// WebUSB helpers
// ─────────────────────────────────────────────────────────────────────────────
function findBulkOutEndpoint(device) {
  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      for (const ep of alt.endpoints) {
        if (ep.direction === 'out' && ep.type === 'bulk') {
          return { interfaceNumber: iface.interfaceNumber, endpoint: ep }
        }
      }
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Composable
// ─────────────────────────────────────────────────────────────────────────────
export function useReceipt() {
  const printing    = ref(false)
  const error       = ref(null)
  const printMethod = ref(null)   // 'qz' | 'usb'

  // USB device state (Android)
  const usbDevice      = ref(null)
  const usbConnected   = ref(false)
  const usbSupported   = 'usb' in navigator

  // ── Connect USB printer (Android) ─────────────────────────────────────────
  async function connectUsb() {
    error.value = null
    try {
      const dev = await navigator.usb.requestDevice({ filters: [] })
      await dev.open()
      if (dev.configuration === null) await dev.selectConfiguration(1)

      const found = findBulkOutEndpoint(dev)
      if (!found) throw new Error('No bulk-out USB endpoint found. Make sure printer is selected.')

      await dev.claimInterface(found.interfaceNumber)
      usbDevice.value    = { dev, ...found }
      usbConnected.value = true
      printMethod.value  = 'usb'
      return true
    } catch (e) {
      error.value        = e.message
      usbConnected.value = false
      return false
    }
  }

  // ── Disconnect USB ────────────────────────────────────────────────────────
  async function disconnectUsb() {
    if (usbDevice.value) {
      try {
        await usbDevice.value.dev.releaseInterface(usbDevice.value.interfaceNumber)
        await usbDevice.value.dev.close()
      } catch (_) {}
      usbDevice.value    = null
      usbConnected.value = false
    }
  }

  // ── Print via WebUSB (Android) ────────────────────────────────────────────
  async function printUsb(receipt) {
    if (!usbConnected.value || !usbDevice.value) {
      error.value = 'USB printer not connected. Tap "Connect Printer" first.'
      return false
    }
    const bytes = buildUsbBytes(receipt)
    const CHUNK = 64
    for (let i = 0; i < bytes.length; i += CHUNK) {
      await usbDevice.value.dev.transferOut(
        usbDevice.value.endpoint.endpointNumber,
        bytes.slice(i, i + CHUNK)
      )
    }
    return true
  }

  // ── Print via QZ Tray (desktop) ───────────────────────────────────────────
  async function printQz(receipt) {
    const qz = await getQz()
    if (!qz) throw new Error('QZ Tray library not loaded. Make sure qz-tray is installed.')
    if (!qz.websocket.isActive()) await qz.websocket.connect()
    const printer = await qz.printers.find(QZ_PRINTER)
    const config  = qz.configs.create(printer)
    const data    = buildQzJob(receipt)
    await qz.print(config, data)
    return true
  }

  // ── Main print function — auto detects ───────────────────────────────────
  const print = async (receipt) => {
    if (!receipt) { error.value = 'No receipt data'; return false }

    printing.value = true
    error.value    = null

    try {
      if (isAndroid()) {
        // Android → WebUSB
        printMethod.value = 'usb'
        return await printUsb(receipt)
      } else {
        // Desktop → QZ Tray
        printMethod.value = 'qz'
        return await printQz(receipt)
      }
    } catch (e) {
      error.value = e.message ?? 'Print failed'
      console.error('[useReceipt]', e)
      return false
    } finally {
      printing.value = false
    }
  }

  return {
    // State
    printing,
    error,
    printMethod,
    usbConnected,
    usbSupported,
    // Methods
    print,
    connectUsb,
    disconnectUsb,
  }
}