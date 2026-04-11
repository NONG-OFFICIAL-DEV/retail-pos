// src/composables/useReceipt.js
import { ref } from 'vue'

const payLabel = m =>
  ({
    cash: 'Cash',
    card: 'Card',
    qr_code: 'QR Code',
    qr: 'QR',
    online: 'Transfer',
    transfer: 'Transfer'
  })[m] ?? m

const buildHtml = receipt => {
  const itemsHtml = (receipt.items ?? [])
    .map(
      i => `
      <div class="item">
        <div class="item-name">
          ${i.name}
          ${i.unit ? `<span class="item-unit">(${i.unit})</span>` : ''}
        </div>
        <div class="item-calc">
          <span>${i.qty} × $${parseFloat(i.unit_price).toFixed(2)}</span>
          <span>$${parseFloat(i.total_price).toFixed(2)}</span>
        </div>
      </div>
    `
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Courier New',monospace; font-size:12px; width:80mm; padding:6px 8px 16px; }
    .header    { text-align:center; margin-bottom:10px; }
    .shop-name { font-size:15px; font-weight:bold; }
    .dashed    { border:none; border-top:1px dashed #888; margin:7px 0; }
    .double    { border:none; border-top:3px double #000; margin:7px 0; }
    .row       { display:flex; justify-content:space-between; margin:3px 0; font-size:11px; }
    .green     { color:#16a34a; }
    .bold      { font-weight:bold; }
    .item      { margin:6px 0; }
    .item-name { font-weight:bold; font-size:12px; }
    .item-unit { font-weight:normal; font-size:10px; color:#666; }
    .item-calc { display:flex; justify-content:space-between; font-size:11px; color:#444; padding-left:4px; margin-top:1px; }
    .grand     { display:flex; justify-content:space-between; font-size:17px; font-weight:bold; padding:3px 0; }
    .footer    { text-align:center; margin-top:12px; font-size:11px; color:#555; line-height:1.9; }
    @media print { @page { margin:0; size:80mm auto; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="shop-name">${receipt.branch_name ?? 'SmartStore'}</div>
  </div>

  <hr class="dashed" />

  <div class="row"><span>Order #</span><span class="bold">${receipt.order_number}</span></div>
  <div class="row"><span>Date</span><span>${receipt.printed_at}</span></div>
  <div class="row"><span>Cashier</span><span>${receipt.cashier}</span></div>
  <div class="row"><span>Type</span><span>${receipt.customer_type === 'wholesale' ? 'Wholesale' : 'Retail'}</span></div>

  <hr class="dashed" />

  ${itemsHtml}

  <hr class="dashed" />

  <div class="row"><span>Subtotal</span><span>$${parseFloat(receipt.subtotal).toFixed(2)}</span></div>
  ${
    parseFloat(receipt.discount ?? 0) > 0
      ? `<div class="row green"><span>Discount</span><span>-$${parseFloat(receipt.discount).toFixed(2)}</span></div>`
      : ''
  }
  ${
    parseFloat(receipt.tax ?? 0) > 0
      ? `<div class="row"><span>Tax</span><span>$${parseFloat(receipt.tax).toFixed(2)}</span></div>`
      : ''
  }

  <hr class="double" />

  <div class="grand"><span>TOTAL</span><span>$${parseFloat(receipt.total).toFixed(2)}</span></div>

  <hr class="dashed" />

  <div class="row"><span>Payment</span><span class="bold">${payLabel(receipt.payment_method)}</span></div>

  <hr class="dashed" />

  <div class="footer">
    <div>Thank you for your purchase!</div>
    <div>អរគុណសម្រាប់ការទិញ!</div>
  </div>
</body>
</html>`
}

export function useReceipt() {
  const printing = ref(false)
  const error = ref(null)

  // ─── Share to PeriPage app (Android Chrome) ───────────────────────────────
  const shareToApp = async receipt => {
    printing.value = true
    error.value = null

    try {
      const html = buildHtml(receipt)
      const blob = new Blob([html], { type: 'text/html' })
      const file = new File([blob], `receipt-${receipt.order_number}.html`, {
        type: 'text/html'
      })

      // Use Web Share API — opens Android share sheet including PeriPage app
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Receipt #${receipt.order_number}`,
          files: [file]
        })
      } else if (navigator.share) {
        // Fallback: share as text/URL if file sharing not supported
        await navigator.share({
          title: `Receipt #${receipt.order_number}`,
          text: `Order #${receipt.order_number} - Total: $${parseFloat(receipt.total).toFixed(2)}`
        })
      } else {
        // Browser doesn't support Web Share API — fallback to print dialog
        printDialog(receipt)
        return
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        // AbortError = user cancelled share sheet, not a real error
        error.value = err.message ?? 'Share failed'
      }
    } finally {
      printing.value = false
    }
  }

  // ─── Classic print dialog (desktop / fallback) ────────────────────────────
  const printDialog = receipt => {
    printing.value = true
    error.value = null

    try {
      const iframe = document.createElement('iframe')
      iframe.style.cssText =
        'position:fixed;top:0;left:0;width:0;height:0;border:none;opacity:0;'
      document.body.appendChild(iframe)

      const doc = iframe.contentDocument ?? iframe.contentWindow.document
      doc.open()
      doc.write(buildHtml(receipt))
      doc.close()

      iframe.onload = () => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        setTimeout(() => {
          document.body.removeChild(iframe)
          printing.value = false
        }, 1000)
      }
    } catch (err) {
      error.value = err.message ?? 'Print failed'
      printing.value = false
    }
  }

  // ─── Auto-pick best method ────────────────────────────────────────────────
  // On Android Chrome → shareToApp (opens PeriPage share sheet)
  // On desktop        → printDialog (opens print window)
  const print = receipt => {
    const isAndroid = /android/i.test(navigator.userAgent)
    const isMobile = /android|iphone|ipad/i.test(navigator.userAgent)

    if ((isAndroid || isMobile) && navigator.share) {
      return shareToApp(receipt)
    } else {
      return printDialog(receipt)
    }
  }

  return { printing, error, print, shareToApp, printDialog }
}
