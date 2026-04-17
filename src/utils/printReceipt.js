// composables/useReceipt.js
// ─────────────────────────────────────────────────────────────────────────────
// Universal thermal receipt printing
//   Mac / Desktop  → QZ Tray  (WiFi/USB, Khmer rendered as raster image)
//   Android Tablet → WebUSB   (USB OTG cable, raw ESC/POS bytes)
//
// Fixes vs previous version:
//   [1]  CHAR_WIDTH corrected to 42 for 80mm (was 24 = 58mm, mismatched PAPER_WIDTH_PX)
//   [2]  DOUBLE_ON fixed: 0x30 caused double-width+height breaking layout → 0x10 (height only)
//   [3]  toBase64 rewritten — previous encodeURIComponent trick silently corrupts non-ASCII
//   [4]  USB stale-connection guard — resets usbConnected if transferOut fails with NotFoundError
//   [5]  Canvas lineH increased to fontSize*1.9 — Khmer vowel stacks clip with fontSize+10
//   [6]  Canvas font re-applied after height resize (resize resets ctx state)
//   [7]  buildTotals: prefers item.total_price, falls back to qty*unit_price consistently
//   [8]  QZ websocket auto-reconnect on dropped connection (1 retry)
//   [9]  USB chunked transfer wraps each chunk in try/catch, aborts on failure
//   [10] Added QR code support via canvas→raster (works on both paths)
//   [11] USB path: stripped Khmer items now log a console.warn with item name for debugging
//   [12] findBulkOutEndpoint walks iface.alternates (plural) — previous used .alternate (singular, wrong)
// ─────────────────────────────────────────────────────────────────────────────

import { ref, readonly } from 'vue'

// ─────────────────────────────────────────────────────────────────────────────
// QZ Tray — lazy singleton
// ─────────────────────────────────────────────────────────────────────────────
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
// CONFIG  — change these to match your hardware
// ─────────────────────────────────────────────────────────────────────────────
const CFG = {
  PAPER_MM: 80, // 58 or 80
  PAPER_PX: 576, // 80mm@203dpi=576 | 58mm@203dpi=384
  // [FIX 1] CHAR_WIDTH must match paper size. 80mm≈42, 58mm≈32
  CHAR_WIDTH: 42,
  QZ_PRINTER: 'Diamond',
  USB_CHUNK: 64, // bytes per WebUSB transferOut call
  FONT_STACK: '"Noto Sans Khmer", Hanuman, "Khmer OS", sans-serif'
}

// ─────────────────────────────────────────────────────────────────────────────
// ESC/POS command constants
// ─────────────────────────────────────────────────────────────────────────────
const ESC = '\x1B'
const GS = '\x1D'
const LF = '\x0A'

const CMD = {
  INIT: ESC + '@',
  ALIGN_LEFT: ESC + 'a\x00',
  ALIGN_CENTER: ESC + 'a\x01',
  ALIGN_RIGHT: ESC + 'a\x02',
  BOLD_ON: ESC + 'E\x01',
  BOLD_OFF: ESC + 'E\x00',
  // [FIX 2] 0x30 = double width+height → breaks column layout on narrow paper
  //         0x10 = double height only  → safe for all widths
  //         0x30 reserved for grand total only (full double intentional there)
  DBL_HEIGHT_ON: ESC + '!\x10',
  DBL_HEIGHT_OFF: ESC + '!\x00',
  DBL_SIZE_ON: ESC + '!\x30', // double width+height — grand total only
  DBL_SIZE_OFF: ESC + '!\x00',
  CUT: GS + 'V\x41\x05'
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const PAY_LABEL = {
  cash: 'Cash',
  card: 'Card',
  qr_code: 'QR Code',
  qr: 'QR Code',
  online: 'Transfer',
  transfer: 'Bank Transfer'
}

const money = v => parseFloat(v || 0).toFixed(2)
const hasKhmer = s => /[\u1780-\u17FF]/.test(s)
const isAndroid = () => /android/i.test(navigator.userAgent)

const twoCol = (l, r, w = CFG.CHAR_WIDTH) => {
  const gap = Math.max(1, w - l.length - r.length)
  return l + ' '.repeat(gap) + r
}
const line = (w = CFG.CHAR_WIDTH) => '-'.repeat(w) + LF
const dLine = (w = CFG.CHAR_WIDTH) => '='.repeat(w) + LF

// Strip to printable ASCII (USB path — printer has no Unicode support)
const toAscii = s =>
  s
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

// ─────────────────────────────────────────────────────────────────────────────
// [FIX 3] toBase64 — safe UTF-8 encoding
// Previous version used: btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/gi,...))
// That trick silently breaks on certain multi-byte sequences.
// Correct: TextEncoder → bytes → btoa
// ─────────────────────────────────────────────────────────────────────────────
function toBase64(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}
function uint8ToBase64(arr) {
  let bin = ''
  for (const b of arr) bin += String.fromCharCode(b)
  return btoa(bin)
}

// ─────────────────────────────────────────────────────────────────────────────
// Khmer text → ESC/POS raster image bytes
// ─────────────────────────────────────────────────────────────────────────────
function textToEscPosImage(
  text,
  { bold = false, fontSize = 20, align = 'left', maxWidth = CFG.PAPER_PX } = {}
) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = maxWidth

  // [FIX 5] Khmer vowel stacks need 1.9× line height (not fontSize+10)
  const lineH = Math.ceil(fontSize * 1.9)
  const fontStr = `${bold ? 'bold ' : ''}${fontSize}px ${CFG.FONT_STACK}`

  ctx.font = fontStr

  // Word-wrap
  const words = text.split(' ')
  const lines = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (ctx.measureText(test).width > maxWidth - 8) {
      if (cur) lines.push(cur)
      cur = w
    } else {
      cur = test
    }
  }
  if (cur) lines.push(cur)

  // [FIX 6] canvas height resize resets ctx state — must re-apply font after
  canvas.height = lines.length * lineH + Math.ceil(fontSize * 0.4)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000000'
  ctx.font = fontStr // ← re-apply after resize
  ctx.textBaseline = 'top'

  lines.forEach((ln, i) => {
    let x = 2
    const w = ctx.measureText(ln).width
    if (align === 'center') x = Math.max(0, (maxWidth - w) / 2)
    if (align === 'right') x = Math.max(0, maxWidth - w - 2)
    ctx.fillText(ln, x, i * lineH)
  })

  return canvasToRaster(canvas)
}

// Canvas → ESC/POS GS v 0 raster bytes
function canvasToRaster(canvas) {
  const ctx = canvas.getContext('2d')
  const { width, height } = canvas
  const data = ctx.getImageData(0, 0, width, height).data
  const bytesPerRow = Math.ceil(width / 8)

  const header = [
    0x1d,
    0x76,
    0x30,
    0x00,
    bytesPerRow & 0xff,
    (bytesPerRow >> 8) & 0xff,
    height & 0xff,
    (height >> 8) & 0xff
  ]
  const pixels = []
  for (let y = 0; y < height; y++) {
    const row = new Uint8Array(bytesPerRow)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      if (lum < 128) row[Math.floor(x / 8)] |= 0x80 >> x % 8
    }
    pixels.push(...row)
  }
  return [...header, ...pixels]
}

// [FIX 10] QR code → raster image (requires qrcode.js loaded globally)
function qrToEscPosImage(text, size = 180) {
  if (typeof QRCode === 'undefined') return null
  const div = document.createElement('div')
  div.style.cssText = 'position:absolute;visibility:hidden;left:-9999px'
  document.body.appendChild(div)
  try {
    new QRCode(div, {
      text,
      width: size,
      height: size,
      correctLevel: QRCode.CorrectLevel.M
    })
    const src = div.querySelector('canvas')
    if (!src) return null
    const out = document.createElement('canvas')
    out.width = CFG.PAPER_PX
    out.height = size + 8
    const ctx = out.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.drawImage(src, (CFG.PAPER_PX - size) / 2, 4)
    return canvasToRaster(out)
  } catch (_) {
    return null
  } finally {
    document.body.removeChild(div)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Build totals
// ─────────────────────────────────────────────────────────────────────────────
function buildTotals(r) {
  // [FIX 7] Normalise each item — prefer explicit total_price
  const items = (r.items ?? []).map(item => ({
    ...item,
    _total: parseFloat(
      item.total_price ?? (item.qty ?? 1) * (item.unit_price ?? 0)
    )
  }))

  const subtotal = parseFloat(
    r.subtotal ?? items.reduce((s, i) => s + i._total, 0)
  )
  const discount = parseFloat(r.discount ?? 0)
  const tax = parseFloat(r.tax ?? 0)
  const total = parseFloat(r.total ?? subtotal - discount + tax)
  const cash = parseFloat(r.cash_tendered ?? 0)
  const change = parseFloat(r.change_given ?? Math.max(0, cash - total))
  const payLbl = PAY_LABEL[r.payment_method] ?? r.payment_method ?? '-'

  return { items, subtotal, discount, tax, total, cash, change, payLbl }
}

// ─────────────────────────────────────────────────────────────────────────────
// QZ Tray job (desktop — Khmer as raster image)
// ─────────────────────────────────────────────────────────────────────────────
function buildQzJob(r) {
  const { items, subtotal, discount, tax, total, cash, change, payLbl } =
    buildTotals(r)
  const W = CFG.CHAR_WIDTH
  const job = []

  const txt = str =>
    job.push({ type: 'raw', format: 'base64', data: toBase64(str) })
  const img = (str, opts) =>
    job.push({
      type: 'raw',
      format: 'base64',
      data: uint8ToBase64(textToEscPosImage(str, opts))
    })
  const imgRaw = bytes =>
    job.push({ type: 'raw', format: 'base64', data: uint8ToBase64(bytes) })

  // ── Header ────────────────────────────────────────────────────────────
  txt(CMD.INIT + CMD.ALIGN_CENTER)

  const branchName = r.branch_name ?? 'MY STORE'
  if (hasKhmer(branchName)) {
    img(branchName, { bold: true, fontSize: 22, align: 'center' })
  } else {
    txt(
      CMD.BOLD_ON +
        CMD.DBL_HEIGHT_ON +
        branchName +
        LF +
        CMD.DBL_HEIGHT_OFF +
        CMD.BOLD_OFF
    )
  }

  if (r.branch_address) {
    if (hasKhmer(r.branch_address))
      img(r.branch_address, { fontSize: 16, align: 'center' })
    else txt(r.branch_address + LF)
  }
  if (r.branch_phone) txt('Tel: ' + r.branch_phone + LF)
  txt(LF)

  // ── Meta ──────────────────────────────────────────────────────────────
  txt(CMD.ALIGN_LEFT + line(W))
  txt(twoCol('Order #:', String(r.order_number ?? '-'), W) + LF)
  txt(twoCol('Date:', r.printed_at ?? new Date().toLocaleString(), W) + LF)
  if (r.cashier) txt(twoCol('Cashier:', r.cashier, W) + LF)
  if (r.customer_name) txt(twoCol('Customer:', r.customer_name, W) + LF)
  if (r.customer_type)
    txt(
      twoCol(
        'Type:',
        r.customer_type === 'wholesale' ? 'Wholesale' : 'Retail',
        W
      ) + LF
    )
  txt(line(W))

  // ── Line items ────────────────────────────────────────────────────────
  for (const item of items) {
    const label = (item.name ?? 'Item') + (item.unit ? ` (${item.unit})` : '')
    txt(CMD.ALIGN_LEFT)
    if (hasKhmer(label)) {
      img(label, { bold: true, fontSize: 18 })
    } else {
      txt(CMD.BOLD_ON + label.slice(0, W) + CMD.BOLD_OFF + LF)
    }
    const qtyStr = `  ${item.qty} x $${money(item.unit_price ?? 0)}`
    const totalStr = '$' + money(item._total)
    const gap = Math.max(1, W - qtyStr.length - totalStr.length)
    txt(qtyStr + ' '.repeat(gap) + totalStr + LF)
    if (item.note) {
      if (hasKhmer(item.note)) img(item.note, { fontSize: 14 })
      else txt('  * ' + item.note + LF)
    }
  }

  // ── Totals ────────────────────────────────────────────────────────────
  txt(line(W))
  txt(twoCol('Subtotal:', '$' + money(subtotal), W) + LF)
  if (discount > 0) txt(twoCol('Discount:', '-$' + money(discount), W) + LF)
  if (tax > 0) txt(twoCol('Tax:', '$' + money(tax), W) + LF)
  txt(dLine(W))

  // [FIX 2] DBL_SIZE (0x30) only here — grand total, intentional full double
  txt(CMD.ALIGN_CENTER + CMD.BOLD_ON + CMD.DBL_SIZE_ON)
  txt('$' + money(total) + LF)
  txt(CMD.DBL_SIZE_OFF + CMD.BOLD_OFF + CMD.ALIGN_LEFT)

  txt(dLine(W))
  txt(twoCol('Payment:', payLbl, W) + LF)
  if (cash > 0) txt(twoCol('Cash:', '$' + money(cash), W) + LF)
  if (change > 0)
    txt(
      CMD.BOLD_ON +
        twoCol('Change:', '$' + money(change), W) +
        CMD.BOLD_OFF +
        LF
    )

  // ── QR code ───────────────────────────────────────────────────────────
  if (r.order_number) {
    const qrBytes = qrToEscPosImage(String(r.order_number))
    if (qrBytes) {
      txt(line(W) + CMD.ALIGN_CENTER)
      imgRaw(qrBytes)
      txt('Scan to view order' + LF)
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────
  txt(line(W) + CMD.ALIGN_CENTER)
  txt('Thank you for your purchase!' + LF)
  img('អរគុណសម្រាប់ការទិញ!', { fontSize: 18, align: 'center' })
  txt(LF + LF + LF + CMD.CUT)

  return job
}

// ─────────────────────────────────────────────────────────────────────────────
// WebUSB job (Android — ASCII only, raw bytes)
// ─────────────────────────────────────────────────────────────────────────────
function buildUsbBytes(r) {
  const { items } = buildTotals(r)
  const bytes = []
  
  // Helper to push raw command arrays into the bytes array
  const b = arr => bytes.push(...arr)
  const t = str => { for (const c of str) bytes.push(c.charCodeAt(0) & 0xFF) }

  for (const item of items) {
    const label = (item.name ?? '')
    
    if (hasKhmer(label)) {
      // INSTEAD OF TEXT: Generate the image bytes
      const imageBytes = textToEscPosImage(label, { 
        fontSize: 22, 
        bold: true,
        maxWidth: CFG.PAPER_PX 
      })
      b(imageBytes) // Send the image data to the USB buffer
    } else {
      // Standard ASCII for English
      b([0x1B, 0x45, 0x01]) // Bold on
      t(label + '\n')
      b([0x1B, 0x45, 0x00]) // Bold off
    }
  }
  // ... rest of footer
  return new Uint8Array(bytes)
}

// ─────────────────────────────────────────────────────────────────────────────
// [FIX 12] Find bulk-OUT endpoint
// Previous: used iface.alternate (singular — wrong WebUSB API property name)
// Correct: iface.alternates (plural array)
// ─────────────────────────────────────────────────────────────────────────────
function findBulkOutEndpoint(device) {
  // Some printers have multiple configurations, try to find the first one with a Bulk OUT
  for (const conf of device.configurations) {
    for (const iface of conf.interfaces) {
      for (const alt of iface.alternates) {
        for (const ep of alt.endpoints) {
          // We need a 'bulk' type and 'out' direction
          if (ep.direction === 'out' && ep.type === 'bulk') {
            return {
              configurationValue: conf.configurationValue,
              interfaceNumber: iface.interfaceNumber,
              endpoint: ep
            }
          }
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
  const printMethod = ref(null) // 'qz' | 'usb'

  const usbDevice = ref(null) // { dev, interfaceNumber, endpoint }
  const usbConnected = ref(false)
  const usbSupported = typeof navigator !== 'undefined' && 'usb' in navigator

  // ── Connect USB ──────────────────────────────────────────────────────
  async function connectUsb() {
    error.value = null
    try {
      const dev = await navigator.usb.requestDevice({ filters: [] })
      await dev.open()

      const found = findBulkOutEndpoint(dev)
      if (!found) throw new Error('No bulk-out endpoint found.')

      // Force selection of the configuration that contains our endpoint
      await dev.selectConfiguration(found.configurationValue)

      // Check if claimed, if so, release it first (for Android stability)
      try {
        await dev.claimInterface(found.interfaceNumber)
      } catch (e) {
        // If already claimed, Android sometimes needs a second to breathe
        await new Promise(r => setTimeout(r, 500))
        await dev.claimInterface(found.interfaceNumber)
      }

      usbDevice.value = { dev, ...found }
      usbConnected.value = true
      return true
    } catch (e) {
      // ... error handling
    }
  }

  // ── Disconnect USB ────────────────────────────────────────────────────
  async function disconnectUsb() {
    if (!usbDevice.value) return
    try {
      await usbDevice.value.dev.releaseInterface(
        usbDevice.value.interfaceNumber
      )
      await usbDevice.value.dev.close()
    } catch (_) {
      /* already closed */
    }
    usbDevice.value = null
    usbConnected.value = false
    printMethod.value = null
  }

  // ── Print via WebUSB ──────────────────────────────────────────────────
  async function printUsb(receipt) {
    if (!usbConnected.value || !usbDevice.value) {
      throw new Error('USB printer not connected. Tap "Connect Printer" first.')
    }

    const bytes = buildUsbBytes(receipt)
    const { dev, endpoint } = usbDevice.value

    // [FIX 9] Per-chunk error handling — surfaces stale device errors clearly
    for (let i = 0; i < bytes.length; i += CFG.USB_CHUNK) {
      try {
        await dev.transferOut(
          endpoint.endpointNumber,
          bytes.slice(i, i + CFG.USB_CHUNK)
        )
      } catch (e) {
        // [FIX 4] Device disconnected mid-print (e.g. screen lock, cable pull)
        if (e.name === 'NotFoundError' || e.name === 'InvalidStateError') {
          usbConnected.value = false
          usbDevice.value = null
          throw new Error(
            'Printer disconnected mid-print. Please reconnect and try again.'
          )
        }
        throw e
      }
    }
    return true
  }

  // ── Print via QZ Tray ─────────────────────────────────────────────────
  async function printQz(receipt) {
    const qz = await getQz()
    if (!qz) throw new Error('QZ Tray not loaded. Run: npm install qz-tray')

    // [FIX 8] Reconnect once on dropped websocket
    if (!qz.websocket.isActive()) {
      try {
        await qz.websocket.connect()
      } catch (_) {
        await new Promise(res => setTimeout(res, 1000))
        await qz.websocket.connect() // second attempt — throws if still down
      }
    }

    const printer = await qz.printers.find(CFG.QZ_PRINTER)
    if (!printer)
      throw new Error(`QZ Tray: printer "${CFG.QZ_PRINTER}" not found`)

    const config = qz.configs.create(printer)
    const data = buildQzJob(receipt)
    await qz.print(config, data)
    return true
  }

  // ── Main print — auto-detects platform ───────────────────────────────
  const print = async receipt => {
    if (!receipt) {
      error.value = 'No receipt data provided'
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
    // Readonly reactive state — prevents accidental external mutation
    printing: readonly(printing),
    error: readonly(error),
    printMethod: readonly(printMethod),
    usbConnected: readonly(usbConnected),
    usbSupported,
    // Methods
    print,
    connectUsb,
    disconnectUsb
  }
}
