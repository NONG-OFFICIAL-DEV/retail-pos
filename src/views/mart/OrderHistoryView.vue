<template>
  <div class="order-history-view">
    <!-- ── Toolbar ─────────────────────────────────────────────────────────── -->
    <div class="order-toolbar d-flex align-center flex-wrap gap-2">
      <div class="flex-grow-1">
        <div class="text-h6 font-weight-black">{{ t('orders.history_title') }}</div>
        <div class="text-caption text-medium-emphasis">
          {{ t('orders.history_subtitle') }}
        </div>
      </div>

      <v-btn-toggle
        v-model="quickFilter"
        mandatory
        density="compact"
        rounded="lg"
        variant="outlined"
        class="mr-2"
      >
        <v-btn value="today" size="small" class="text-none px-3">
          {{ t('orders.filter_today') }}
        </v-btn>
        <v-btn value="all" size="small" class="text-none px-3">
          {{ t('orders.filter_all') }}
        </v-btn>
      </v-btn-toggle>

      <v-text-field
        v-model="search"
        :placeholder="t('orders.search_placeholder')"
        variant="outlined"
        density="compact"
        rounded="lg"
        hide-details
        prepend-inner-icon="mdi-magnify"
        style="max-width: 260px"
        clearable
      />

      <v-btn
        icon="mdi-refresh"
        variant="tonal"
        rounded="lg"
        density="comfortable"
        :loading="isLoading"
        @click="loadOrders"
      />
    </div>

    <!-- ── Skeleton ────────────────────────────────────────────────────────── -->
    <template v-if="isLoading">
      <v-skeleton-loader
        v-for="n in 6"
        :key="n"
        type="list-item-two-line"
        rounded="lg"
        class="border mb-2"
      />
    </template>

    <!-- ── Empty ───────────────────────────────────────────────────────────── -->
    <div v-else-if="!filteredOrders.length" class="text-center py-12">
      <v-icon icon="mdi-receipt-text-remove-outline" size="56" color="grey-lighten-1" />
      <div class="text-h6 text-grey mt-4">{{ t('orders.no_orders') }}</div>
    </div>

    <!-- ── Order list ──────────────────────────────────────────────────────── -->
    <template v-else>
      <v-card
        v-for="order in filteredOrders"
        :key="order.id"
        flat
        border
        rounded="lg"
        class="order-row mb-2 pa-3 cursor-pointer"
        @click="openDetail(order)"
      >
        <div class="d-flex align-center gap-3">
          <v-avatar rounded="lg" size="40" color="primary" variant="tonal">
            <v-icon :icon="paymentIcon(order)" size="18" />
          </v-avatar>

          <div class="flex-grow-1 min-w-0">
            <div class="d-flex align-center gap-2">
              <span class="text-body-2 font-weight-black">
                #{{ orderNumber(order) }}
              </span>
              <v-chip
                size="x-small"
                variant="tonal"
                rounded="lg"
                :color="statusColor(order)"
              >
                {{ statusLabel(order) }}
              </v-chip>
            </div>
            <div class="text-caption text-medium-emphasis text-truncate">
              {{ formatDateTime(orderDate(order)) }}
              <span v-if="cashierName(order)"> · {{ cashierName(order) }}</span>
            </div>
          </div>

          <div class="text-right flex-shrink-0">
            <div class="text-body-1 font-weight-black text-primary">
              {{ fmt(orderTotal(order)) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ itemCount(order) }} {{ t('common.items') }}
            </div>
          </div>

          <v-icon icon="mdi-chevron-right" color="grey" size="20" />
        </div>
      </v-card>

      <!-- Infinite scroll sentinel -->
      <div ref="loadMoreTrigger" class="d-flex justify-center py-3">
        <v-progress-circular v-if="loadingMore" size="22" width="2" indeterminate color="primary" />
        <span v-else-if="!hasMoreOrders" class="text-caption text-medium-emphasis">
          {{ t('orders.end_of_list') }}
        </span>
      </div>
    </template>

    <!-- ── Detail dialog ───────────────────────────────────────────────────── -->
    <v-dialog v-model="detailDialog" max-width="480" scrollable>
      <v-card rounded="xl">
        <div class="d-flex align-center pa-4 pb-3">
          <div class="flex-grow-1">
            <div class="text-body-1 font-weight-black">
              #{{ orderNumber(selectedOrder ?? {}) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ formatDateTime(orderDate(selectedOrder ?? {})) }}
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="detailDialog = false" />
        </div>

        <v-divider />

        <v-card-text class="pa-4" style="max-height: 55vh">
          <template v-if="detailLoading">
            <v-skeleton-loader type="list-item-three-line" v-for="n in 3" :key="n" />
          </template>

          <template v-else-if="selectedOrder">
            <div
              v-for="(item, idx) in orderItems(selectedOrder)"
              :key="idx"
              class="d-flex justify-space-between align-center mb-2"
            >
              <div class="min-w-0">
                <div class="text-body-2 font-weight-bold text-truncate">
                  {{ item.name ?? item.product_name ?? '-' }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ item.qty ?? item.quantity ?? 0 }} × {{ fmt(item.unit_price ?? item.price ?? 0) }}
                  <span v-if="item.unit"> ({{ item.unit }})</span>
                </div>
              </div>
              <div class="text-body-2 font-weight-black">
                {{ fmt(item.total_price ?? (item.qty ?? item.quantity ?? 0) * (item.unit_price ?? item.price ?? 0)) }}
              </div>
            </div>

            <v-divider class="my-3" />

            <div class="d-flex justify-space-between text-caption mb-1">
              <span class="text-medium-emphasis">{{ t('common.subtotal') }}</span>
              <span>{{ fmt(selectedOrder.subtotal) }}</span>
            </div>
            <div
              v-if="selectedOrder.discount_amount || selectedOrder.discount"
              class="d-flex justify-space-between text-caption mb-1 text-success"
            >
              <span>{{ t('common.discount') }}</span>
              <span>-{{ fmt(selectedOrder.discount_amount ?? selectedOrder.discount) }}</span>
            </div>
            <div class="d-flex justify-space-between align-center border-t pt-2 mb-3">
              <span class="text-body-2 font-weight-black">{{ t('common.total') }}</span>
              <span class="text-h6 font-weight-black text-primary">
                {{ fmt(orderTotal(selectedOrder)) }}
              </span>
            </div>

            <div class="d-flex justify-space-between text-caption mb-1">
              <span class="text-medium-emphasis">{{ t('orders.payment_method') }}</span>
              <span class="font-weight-bold">{{ paymentLabel(selectedOrder) }}</span>
            </div>
            <div
              v-if="selectedOrder.cash_tendered"
              class="d-flex justify-space-between text-caption mb-1"
            >
              <span class="text-medium-emphasis">{{ t('payment.cash_tendered') }}</span>
              <span>{{ fmt(selectedOrder.cash_tendered) }}</span>
            </div>
            <div
              v-if="selectedOrder.change_given"
              class="d-flex justify-space-between text-caption"
            >
              <span class="text-medium-emphasis">{{ t('payment.change') }}</span>
              <span>{{ fmt(selectedOrder.change_given) }}</span>
            </div>
          </template>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-btn
            block
            color="primary"
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-printer"
            :loading="printing"
            :disabled="detailLoading || !selectedOrder"
            @click="reprint"
          >
            {{ t('orders.reprint') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { formatKHR } from '@nong-official-dev/core'
  import { useOrderStore } from '@/stores/orderStore'
  import { useAuthStore } from '@/stores/authStore'
  import { useAppUtils } from '@/composables/useAppUtils'
  import { useReceipt } from '@/utils/printReceipt'

  const { t } = useI18n()
  const { notif } = useAppUtils()
  const orderStore = useOrderStore()
  const authStore = useAuthStore()
  const { printing, error, print } = useReceipt()

  const isLoading = ref(false)
  const loadingMore = ref(false)
  const search = ref('')
  const quickFilter = ref('today')
  const hasMoreOrders = computed(() => orderStore.hasMoreOrders)
  const loadMoreTrigger = ref(null)

  const detailDialog = ref(false)
  const detailLoading = ref(false)
  const selectedOrder = ref(null)

  // ── Field access helpers (backend field names may vary) ────────────────────
  const orderNumber = o => o.order_number ?? o.id ?? '-'
  const orderDate = o => o.created_at ?? o.placed_at ?? o.date ?? null
  const orderTotal = o => parseFloat(o.total ?? o.total_amount ?? 0)
  const orderItems = o => o.items ?? o.order_items ?? []
  const itemCount = o => orderItems(o).length
  const cashierName = o =>
    o.cashier ?? o.cashier_name ?? o.user?.name ?? o.created_by?.name ?? ''
  const paymentLabel = o => {
    const method = o.payment_method
    const key = { cash: 'orders.cash', card: 'orders.card', qr: 'orders.qr' }[method]
    return key ? t(key) : (method ?? '-')
  }
  const paymentIcon = o =>
    ({ cash: 'mdi-cash', card: 'mdi-credit-card-outline', qr: 'mdi-qrcode-scan' }[
      o.payment_method
    ] ?? 'mdi-receipt-text-outline')

  const STATUS_COLOR = {
    completed: 'success',
    paid: 'success',
    pending: 'warning',
    cancelled: 'error',
    voided: 'error',
    refunded: 'error'
  }
  const statusColor = o => STATUS_COLOR[o.status?.toLowerCase()] ?? 'grey'
  const statusLabel = o => o.status ?? t('orders.status_completed')

  const fmt = v => formatKHR(v ?? 0)
  const formatDateTime = d => {
    if (!d) return '-'
    const date = new Date(d)
    if (Number.isNaN(date.getTime())) return String(d)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // ── Load ─────────────────────────────────────────────────────────────────
  const listParams = () => ({ branch_id: authStore.branch_id })

  const loadOrders = async () => {
    isLoading.value = true
    try {
      await orderStore.fetchAllOrders(listParams())
    } catch (err) {
      notif(err.message || 'Failed to load orders', { type: 'error' })
    } finally {
      isLoading.value = false
    }
  }

  const loadMore = async () => {
    if (loadingMore.value || !hasMoreOrders.value) return
    loadingMore.value = true
    try {
      await orderStore.fetchMoreOrders(listParams())
    } catch (err) {
      notif(err.message || 'Failed to load more orders', { type: 'error' })
    } finally {
      loadingMore.value = false
    }
  }

  // ── Infinite scroll — observe the sentinel at the bottom of the list ──────
  let observer = null
  watch(loadMoreTrigger, (el, prevEl) => {
    if (prevEl && observer) observer.unobserve(prevEl)
    if (el && observer) observer.observe(el)
  })

  onMounted(() => {
    observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '200px' }
    )
    if (loadMoreTrigger.value) observer.observe(loadMoreTrigger.value)
  })
  onUnmounted(() => observer?.disconnect())

  const isToday = d => {
    if (!d) return false
    const date = new Date(d)
    const now = new Date()
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    )
  }

  const filteredOrders = computed(() => {
    let list = orderStore.orders ?? []
    if (quickFilter.value === 'today') {
      list = list.filter(o => isToday(orderDate(o)))
    }
    if (search.value?.trim()) {
      const q = search.value.trim().toLowerCase()
      list = list.filter(o => String(orderNumber(o)).toLowerCase().includes(q))
    }
    return list
  })

  // ── Detail ───────────────────────────────────────────────────────────────
  const openDetail = async order => {
    detailDialog.value = true
    selectedOrder.value = order
    detailLoading.value = true
    try {
      const full = await orderStore.fetchOrder(order.id)
      selectedOrder.value = full ?? order
    } catch (err) {
      // Fall back to the summary row data already shown — detail fetch is best-effort
      notif(err.message || 'Failed to load order details', { type: 'error' })
    } finally {
      detailLoading.value = false
    }
  }

  // ── Reprint ──────────────────────────────────────────────────────────────
  const reprint = async () => {
    if (!selectedOrder.value) return
    const receiptData = selectedOrder.value.receipt ?? selectedOrder.value
    const ok = await print(receiptData)
    if (ok) notif(t('btn.print_receipt'), { type: 'success' })
  }

  watch(error, val => {
    if (!val) return
    if (val === 'not_connected') notif(t('printer.not_connected'), { type: 'warning' })
    else if (val === 'disconnected') notif(t('printer.disconnected'), { type: 'error' })
    else notif(val, { type: 'error' })
  })

  onMounted(loadOrders)
</script>

<style scoped>
  .order-history-view {
    position: relative;
  }

  /* ── Sticky toolbar — same treatment as CategorySlider on the POS grid ── */
  .order-toolbar {
    position: sticky;
    top: -16px;
    z-index: 5;
    margin: -16px -16px 16px -16px;
    padding: 16px 16px 12px;
    background: rgba(248, 250, 252, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-bottom: 1px solid #e2e8f0;
  }

  .order-row {
    transition: all 0.15s ease;
  }
  .order-row:hover {
    border-color: rgb(var(--v-theme-primary)) !important;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06) !important;
  }
  .gap-2 {
    gap: 8px;
  }
  .gap-3 {
    gap: 12px;
  }
  .min-w-0 {
    min-width: 0;
  }
  .cursor-pointer {
    cursor: pointer;
  }
  .border-t {
    border-top: 1px solid rgba(0, 0, 0, 0.08);
  }
</style>
