// composables/useReceipt.js
// ─────────────────────────────────────────────────────────────────────────────
// Universal printing — auto detects device:
//   Mac / Desktop  → QZ Tray (WiFi, Khmer canvas image rendering)
//   Android Tablet → WebUSB  (USB OTG cable, Khmer canvas image rendering)
// ─────────────────────────────────────────────────────────────────────────────

import { ref } from 'vue'

// Lazy load qz-tray
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
const PAPER_WIDTH_PX = 576 // ✅ 80mm @203dpi (approx)
const CHAR_WIDTH = 48 // ✅ correct text columns
const QZ_PRINTER = 'Diamond'
const CURRENCY = '៛'

// ─────────────────────────────────────────────────────────────────────────────
// ESC/POS constants
// ─────────────────────────────────────────────────────────────────────────────
const LF = '\x0A'

// ─────────────────────────────────────────────────────────────────────────────
// Payment labels (Khmer + English)
// ─────────────────────────────────────────────────────────────────────────────
const PAY_LABEL = {
  cash: 'សាច់ប្រាក់ / Cash',
  card: 'កាត / Card',
  qr_code: 'QR Code',
  qr: 'QR',
  online: 'ផ្ទេរប្រាក់ / Transfer',
  transfer: 'ផ្ទេរប្រាក់ / Transfer'
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
// Format as Riel — whole numbers with thousands separator
const money = v =>
  Math.round(parseFloat(v || 0)).toLocaleString('en-US') + ' ' + CURRENCY

const hasKhmer = s => /[\u1780-\u17FF]/.test(s)
const isAndroid = () => /android/i.test(navigator.userAgent)
const pad = (s, n) => {
  const str = String(s)
  const len = [...str].length
  const spaces = Math.max(n - len, 0)
  return str + ' '.repeat(spaces)
}

const twoCol = (l, r, w = CHAR_WIDTH) => {
  const gap = Math.max(1, w - l.length - r.length)
  return l + ' '.repeat(gap) + r
}
const line = () => '-'.repeat(CHAR_WIDTH) + LF
const dLine = () => '='.repeat(CHAR_WIDTH) + LF

// ─────────────────────────────────────────────────────────────────────────────
// Canvas → ESC/POS raster image
// Works for BOTH QZ Tray (desktop) and WebUSB (Android)
// ─────────────────────────────────────────────────────────────────────────────
function textToEscPosImage(
  text,
  { bold = false, fontSize = 22, align = 'left' } = {}
) {
  const canvas = document.createElement('canvas')
  const lineH = fontSize + 10
  canvas.width = PAPER_WIDTH_PX
  const fontStr =
    (bold ? 'bold ' : '') +
    `${fontSize}px Hanuman, "Noto Sans Khmer", Arial, sans-serif`
  const ctx = canvas.getContext('2d')
  ctx.font = fontStr

  // Word wrap
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
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000'
  ctx.font = fontStr
  ctx.textBaseline = 'top'

  lines.forEach((ln, i) => {
    const tw = ctx.measureText(ln).width
    let x = 4
    if (align === 'center') x = Math.max(0, (PAPER_WIDTH_PX - tw) / 2)
    if (align === 'right') x = Math.max(0, PAPER_WIDTH_PX - tw - 4)
    ctx.fillText(ln, x, i * lineH + 2)
  })

  return canvasToRaster(canvas)
}

function canvasToRaster(canvas) {
  const ctx = canvas.getContext('2d')
  const { width, height } = canvas
  const imgData = ctx.getImageData(0, 0, width, height).data
  const bytesPerRow = Math.ceil(width / 8)
  const rows = []

  for (let y = 0; y < height; y++) {
    const row = new Uint8Array(bytesPerRow)
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const lum =
        0.299 * imgData[idx] +
        0.587 * imgData[idx + 1] +
        0.114 * imgData[idx + 2]
      if (lum < 160) row[Math.floor(x / 8)] |= 0x80 >> x % 8
    }
    rows.push(row)
  }

  const xL = bytesPerRow & 0xff,
    xH = (bytesPerRow >> 8) & 0xff
  const yL = height & 0xff,
    yH = (height >> 8) & 0xff
  const out = [0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]
  for (const row of rows) out.push(...row)
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// Build receipt totals
// ─────────────────────────────────────────────────────────────────────────────
function buildTotals(r) {
  const items = r.items ?? []
  const subtotal = parseFloat(
    r.subtotal ?? items.reduce((s, i) => s + i.qty * i.unit_price, 0)
  )
  const discount = parseFloat(r.discount ?? 0)
  const tax = parseFloat(r.tax ?? 0)
  const total = parseFloat(r.total ?? subtotal - discount + tax)
  const cash = parseFloat(r.cash_tendered ?? 0)
  const change = parseFloat(r.change_given ?? 0)
  const payLbl = PAY_LABEL[r.payment_method] ?? r.payment_method ?? '-'
  return { items, subtotal, discount, tax, total, cash, change, payLbl }
}

// Draws a table row with fixed pixel positions for perfect alignment
function tableRowToEscPosImage(
  cols,
  { bold = false, fontSize = 20, marginTop = 10 } = {}
) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  // Calculate height: Font size + margin top + a little bottom padding
  const lineH = fontSize + marginTop + 10

  canvas.width = PAPER_WIDTH_PX
  canvas.height = lineH

  // Fill background white
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Text style
  ctx.fillStyle = '#000'
  ctx.font = `${bold ? 'bold ' : ''}${fontSize}px Hanuman, "Noto Sans Khmer", Arial, sans-serif`

  // IMPORTANT: Set Baseline to 'bottom' and use the full height to draw
  // This leaves the 'marginTop' pixels as empty space at the top
  ctx.textBaseline = 'bottom'
  const drawY = canvas.height - 5 // 5px buffer from the bottom

  const colNameX = 4
  const colQtyX = PAPER_WIDTH_PX * 0.52 // Adjust based on your preference
  const colTotalX = PAPER_WIDTH_PX - 4

  // Column 1: Name
  ctx.textAlign = 'left'
  ctx.fillText(cols[0], colNameX, drawY)

  // Column 2: Qty
  ctx.textAlign = 'left'
  ctx.fillText(cols[1], colQtyX, drawY)

  // Column 3: Total
  ctx.textAlign = 'right'
  ctx.fillText(cols[2], colTotalX, drawY)

  return canvasToRaster(canvas)
}

function totalsRowToEscPosImage(
  label,
  value,
  { bold = false, fontSize = 20, marginTop = 8 } = {}
) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const lineH = fontSize + marginTop + 10

  canvas.width = PAPER_WIDTH_PX
  canvas.height = lineH

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000'
  ctx.font = `${bold ? 'bold ' : ''}${fontSize}px Hanuman, "Noto Sans Khmer", Arial, sans-serif`
  ctx.textBaseline = 'bottom'

  const drawY = canvas.height - 5

  // Label (Far Left)
  ctx.textAlign = 'left'
  ctx.fillText(label, 4, drawY)

  // Value (Far Right)
  ctx.textAlign = 'right'
  ctx.fillText(value, PAPER_WIDTH_PX - 4, drawY)

  return canvasToRaster(canvas)
}
// ─────────────────────────────────────────────────────────────────────────────
// Build shared byte array — used by BOTH QZ Tray and WebUSB
// Khmer text → canvas raster image bytes (works on any printer)
// ASCII text → raw charCodeAt bytes
// ─────────────────────────────────────────────────────────────────────────────
function buildBytes(r) {
  const { items, subtotal, discount, tax, total, cash, change, payLbl } =
    buildTotals(r)

  const bytes = []
  const b = arr => bytes.push(...arr)

  // ASCII text → raw bytes
  const t = str => {
    for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i) & 0xff)
  }

  // Khmer or mixed text → canvas raster image bytes
  const img = (text, opts = {}) => b(textToEscPosImage(text, opts))

  // Smart text: ASCII → t(), anything with non-ASCII → img()
  const auto = (text, opts = {}) => {
    if (/[^\x00-\x7F]/.test(text)) {
      img(text, opts)
    } else {
      t(text)
    }
  }

  const E = 0x1b,
    G = 0x1d

  // ── INIT ──
  b([E, 0x40])

  // ── HEADER ──
  b([E, 0x61, 0x01]) // center
  if (hasKhmer(r.branch_name ?? '')) {
    img(r.branch_name ?? 'MY STORE', {
      bold: true,
      fontSize: 26,
      align: 'center'
    })
  } else {
    b([E, 0x45, 0x01, E, 0x21, 0x10]) // bold + double height
    t((r.branch_name ?? 'MY STORE') + '\n')
    b([E, 0x21, 0x00, E, 0x45, 0x00])
  }
  if (r.branch_address) {
    auto(r.branch_address, { fontSize: 18, align: 'center' })
    if (!/[^\x00-\x7F]/.test(r.branch_address)) t('\n')
  }
  if (r.branch_phone) t('Tel: ' + r.branch_phone + '\n')

  // ── ORDER INFO ──
  b([E, 0x61, 0x00]) // left
  t(line())
  t(twoCol('Order #:', r.order_number ?? '-') + '\n')
  t(twoCol('Date:', r.printed_at ?? new Date().toLocaleString()) + '\n')

  if (r.cashier) {
    if (hasKhmer(r.cashier)) {
      t('Cashier: ')
      img(r.cashier, { fontSize: 20 })
    } else {
      t(twoCol('Cashier:', r.cashier) + '\n')
    }
  }
  t(
    twoCol('Type:', r.customer_type === 'wholesale' ? 'Wholesale' : 'Retail') +
      '\n'
  )
  t(line())

  // ── ITEMS TABLE HEADER ──
  b([E, 0x61, 0x00]) // left

  // Render Header as an image so it matches the rows exactly
  b(
    tableRowToEscPosImage(['Name', 'Qty', 'Total'], {
      bold: true,
      fontSize: 18
    })
  )
  t(line())

  // ── ITEMS ──
  for (const item of items) {
    const label = (item.name ?? '') + (item.unit ? ` (${item.unit})` : '')
    const qtyStr = `${item.qty} x ${money(item.unit_price)}` // Simplified for table
    const totalAmt = money(item.total_price ?? item.qty * item.unit_price)

    // ALWAYS render as image using fixed pixel positions
    // Pass marginTop: 15 for a nice gap between items
    b(
      tableRowToEscPosImage([label, qtyStr, totalAmt], {
        fontSize: 20,
        marginTop: 15
      })
    )
  }

  // ── TOTALS ──
  t(line())

  // Subtotal
  b(totalsRowToEscPosImage('Subtotal / សរុបរង:', money(subtotal)))

  if (discount > 0) {
    b(totalsRowToEscPosImage('Discount / បញ្ចុះ:', '-' + money(discount)))
  }

  if (tax > 0) {
    b(totalsRowToEscPosImage('Tax / ពន្ធ:', money(tax)))
  }

  t(dLine())

  // Grand total - Bold and slightly larger font
  b(
    totalsRowToEscPosImage('Total / សរុបទាំងអស់:', money(total), {
      bold: true,
      fontSize: 24,
      marginTop: 12
    })
  )

  t(dLine())

  // ── PAYMENT ──
  b(totalsRowToEscPosImage('Payment / បង់:', payLbl))

  if (cash > 0) {
    b(totalsRowToEscPosImage('Cash / ទទួល:', money(cash)))
  }

  if (change > 0) {
    // Change is usually important, make it bold
    b(totalsRowToEscPosImage('Change / អាប:', money(change), { bold: true }))
  }

  // ── FOOTER ──
  t(line())
  b([E, 0x61, 0x01]) // center
  t('Thank you for your purchase!\n')
  img('អរគុណសម្រាប់ការទិញ!', { fontSize: 20, align: 'center' })
  t('\n\n\n')
  b([G, 0x56, 0x41, 0x05]) // cut

  return new Uint8Array(bytes)
}

// ─────────────────────────────────────────────────────────────────────────────
// QZ Tray — wraps byte array as base64 data objects
// ─────────────────────────────────────────────────────────────────────────────
function uint8ToBase64(bytes) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function buildQzJob(r) {
  const bytes = buildBytes(r)
  return [{ type: 'raw', format: 'base64', data: uint8ToBase64(bytes) }]
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
  const printing = ref(false)
  const error = ref(null)
  const printMethod = ref(null)

  const usbDevice = ref(null)
  const usbConnected = ref(false)
  const usbSupported = 'usb' in navigator

  // ── Connect USB (Android) ─────────────────────────────────────────────────
  async function connectUsb() {
    error.value = null
    try {
      const dev = await navigator.usb.requestDevice({ filters: [] })
      await dev.open()
      if (dev.configuration === null) await dev.selectConfiguration(1)

      const found = findBulkOutEndpoint(dev)
      if (!found)
        throw new Error(
          'No bulk-out USB endpoint found. Make sure printer is selected.'
        )

      await dev.claimInterface(found.interfaceNumber)
      usbDevice.value = { dev, ...found }
      usbConnected.value = true
      printMethod.value = 'usb'
      return true
    } catch (e) {
      error.value = e.message
      usbConnected.value = false
      return false
    }
  }

  // ── Disconnect USB ────────────────────────────────────────────────────────
  async function disconnectUsb() {
    if (usbDevice.value) {
      try {
        await usbDevice.value.dev.releaseInterface(
          usbDevice.value.interfaceNumber
        )
        await usbDevice.value.dev.close()
      } catch (_) {}
      usbDevice.value = null
      usbConnected.value = false
    }
  }

  // ── Print via WebUSB ──────────────────────────────────────────────────────
  async function printUsb(receipt) {
    if (!usbConnected.value || !usbDevice.value) {
      error.value = 'USB printer not connected. Tap "Connect Printer" first.'
      return false
    }
    const bytes = buildBytes(receipt) // same builder as QZ Tray!
    const CHUNK = 64
    for (let i = 0; i < bytes.length; i += CHUNK) {
      await usbDevice.value.dev.transferOut(
        usbDevice.value.endpoint.endpointNumber,
        bytes.slice(i, i + CHUNK)
      )
    }
    return true
  }

  // ── Print via QZ Tray ─────────────────────────────────────────────────────
  async function printQz(receipt) {
    const qz = await getQz()
    if (!qz)
      throw new Error('QZ Tray not loaded. Make sure qz-tray is installed.')
    if (!qz.websocket.isActive()) await qz.websocket.connect()
    const printer = await qz.printers.find(QZ_PRINTER)
    const config = qz.configs.create(printer)
    await qz.print(config, buildQzJob(receipt))
    return true
  }

  // ── Auto-detect and print ─────────────────────────────────────────────────
  const print = async receipt => {
    if (!receipt) {
      error.value = 'No receipt data'
      return false
    }
    printing.value = true
    error.value = null
    try {
      if (isAndroid()) {
        printMethod.value = 'usb'
        return await printUsb(receipt)
      } else {
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
    printing,
    error,
    printMethod,
    usbConnected,
    usbSupported,
    print,
    connectUsb,
    disconnectUsb
  }
}
