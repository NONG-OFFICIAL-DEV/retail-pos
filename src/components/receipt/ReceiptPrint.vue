<template>
  <div class="receipt">

    <!-- Header -->
    <div class="receipt-header">
      <div v-if="receipt.logo_url" class="receipt-logo">
        <img :src="receipt.logo_url" alt="logo" />
      </div>
      <div class="receipt-shop-name">{{ receipt.branch_name }}</div>
      <div v-if="receipt.branch_address" class="receipt-shop-sub">
        {{ receipt.branch_address }}
      </div>
      <div v-if="receipt.branch_phone" class="receipt-shop-sub">
        Tel: {{ receipt.branch_phone }}
      </div>
    </div>

    <div class="divider dashed" />

    <!-- Meta -->
    <div class="receipt-row"><span>Order #</span><span class="bold">{{ receipt.order_number }}</span></div>
    <div class="receipt-row"><span>Date</span><span>{{ receipt.printed_at }}</span></div>
    <div class="receipt-row"><span>Cashier</span><span>{{ receipt.cashier }}</span></div>
    <div class="receipt-row">
      <span>Type</span>
      <span>{{ receipt.customer_type === 'wholesale' ? 'Wholesale' : 'Retail' }}</span>
    </div>

    <div class="divider dashed" />

    <!-- Items -->
    <div class="receipt-items">
      <div v-for="(item, i) in receipt.items" :key="i" class="receipt-item">
        <div class="item-name">
          {{ item.name }}
          <span class="item-unit" v-if="item.unit">({{ item.unit }})</span>
        </div>
        <div class="item-calc">
          <span>{{ item.qty }} × {{ fmt(item.unit_price) }}</span>
          <span class="bold">{{ fmt(item.total_price) }}</span>
        </div>
      </div>
    </div>

    <div class="divider dashed" />

    <!-- Subtotals -->
    <div class="receipt-row"><span>Subtotal</span><span>{{ fmt(receipt.subtotal) }}</span></div>
    <div v-if="parseFloat(receipt.discount ?? 0) > 0"
      class="receipt-row green">
      <span>Discount</span><span>-{{ fmt(receipt.discount) }}</span>
    </div>
    <div v-if="parseFloat(receipt.tax ?? 0) > 0"
      class="receipt-row">
      <span>Tax</span><span>{{ fmt(receipt.tax) }}</span>
    </div>

    <div class="divider double" />

    <!-- Grand total -->
    <div class="grand-total">
      <span>TOTAL</span>
      <span>{{ fmt(receipt.total) }}</span>
    </div>

    <div class="divider dashed" />

    <!-- Payment -->
    <div class="receipt-row">
      <span>Payment</span>
      <span class="bold">{{ payLabel(receipt.payment_method) }}</span>
    </div>
    <div v-if="receipt.cash_tendered" class="receipt-row">
      <span>Cash Tendered</span><span>{{ fmt(receipt.cash_tendered) }}</span>
    </div>
    <div v-if="parseFloat(receipt.change_given ?? 0) > 0"
      class="receipt-row bold">
      <span>Change</span><span>{{ fmt(receipt.change_given) }}</span>
    </div>

    <div class="divider dashed" />

    <!-- Footer -->
    <div class="receipt-footer">
      <div>Thank you for your purchase!</div>
      <div class="kh">អរគុណសម្រាប់ការទិញ!</div>
    </div>

  </div>
</template>

<script setup>
defineProps({ receipt: { type: Object, default: () => ({}) } })

const fmt = v =>
  v !== null && v !== undefined
    ? '$' + parseFloat(v).toFixed(2)
    : '$0.00'

const payLabel = m => ({
  cash: 'Cash', card: 'Card',
  qr_code: 'QR Code', qr: 'QR Code',
  online: 'Transfer', transfer: 'Transfer',
})[m] ?? m
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Khmer:wght@400;700&display=swap');

.receipt {
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  color: #000;
  background: #fff;
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
  padding: 10px 8px 16px;
}

/* ── Header ── */
.receipt-header { text-align: center; margin-bottom: 10px; }
.receipt-logo img {
  max-width: 80px;
  max-height: 60px;
  display: block;
  margin: 0 auto 6px;
}
.receipt-shop-name { font-size: 15px; font-weight: bold; line-height: 1.3; }
.receipt-shop-sub  { font-size: 10px; color: #555; margin-top: 2px; }

/* ── Dividers ── */
.divider       { margin: 7px 0; border: none; }
.divider.dashed{ border-top: 1px dashed #888; }
.divider.double{ border-top: 3px double #000; }

/* ── Rows ── */
.receipt-row {
  display: flex;
  justify-content: space-between;
  margin: 3px 0;
  font-size: 11px;
}
.receipt-row.green { color: #16a34a; }
.bold { font-weight: bold; }

/* ── Items ── */
.receipt-items  { margin: 4px 0; }
.receipt-item   { margin: 6px 0; }
.item-name      { font-weight: bold; font-size: 12px; word-break: break-word; }
.item-unit      { font-weight: normal; font-size: 10px; color: #666; margin-left: 3px; }
.item-calc {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #444;
  margin-top: 1px;
  padding-left: 4px;
}

/* ── Grand total ── */
.grand-total {
  display: flex;
  justify-content: space-between;
  font-size: 17px;
  font-weight: bold;
  padding: 3px 0;
}

/* ── Footer ── */
.receipt-footer {
  text-align: center;
  margin-top: 12px;
  font-size: 11px;
  color: #555;
  line-height: 1.9;
}
.receipt-footer .kh {
  font-family: 'Noto Sans Khmer', sans-serif;
  font-size: 11px;
}

/* ── Print ── */
@media print {
  @page { margin: 0; size: 80mm auto; }

  .receipt {
    max-width: 100%;
    padding: 4px 6px 12px;
    font-size: 11px;
  }
  .receipt-shop-name { font-size: 14px; }
  .grand-total       { font-size: 15px; }
}
</style>