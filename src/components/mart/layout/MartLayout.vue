<template>
  <v-app class="bg-grey-lighten-5">
    <!-- ── App Bar ──────────────────────────────────────────────────────────── -->
    <MartAppBar
      v-model:search="search"
      :operator="operator"
      @logout="logout"
      @scan="onAppBarScan"
      @open-branch-switcher="branchDrawer = true"
    />
    <input
      ref="barcodeInputRef"
      v-model="barcodeBuffer"
      class="barcode-capture"
      autocomplete="off"
      tabindex="-1"
      @keydown.enter.prevent="onBarcodeEnter"
    />
    <BranchSwitcherDrawer
      v-if="authStore.isOwner"
      v-model="branchDrawer"
      @branch-changed="onBranchChanged"
    />
    <!-- ── Cart Drawer ──────────────────────────────────────────────────────── -->
    <MartCartDrawer
      :cart="cart"
      :loading="cart.loading"
      @update-qty="updateQty"
      @remove="removeItem"
      @clear="clearCart"
      @checkout="completeOrder"
      @set-payment="setPayment"
    />

    <!-- ── Main Content ─────────────────────────────────────────────────────── -->
    <v-main>
      <v-container fluid class="pa-0">
        <div class="mart-content">
          <router-view :search="search" :scanned-barcode="scannedBarcode"/>
        </div>
      </v-container>
    </v-main>

    <CashPaymentDialog
      v-model="cashDialog"
      :total="cart.total"
      :loading="cart.loading"
      @confirm="confirmCashPayment"
      @cancel="cashDialog = false"
    />

    <!-- ── Print Receipt Dialog (shown after checkout) ──────────────────────── -->
    <v-dialog v-model="printDialog" max-width="320" persistent>
      <v-card rounded="lg" class="pa-2">
        <v-card-title class="text-center pt-4">
          <v-icon size="40" color="success">mdi-check-circle</v-icon>
          <div class="mt-2 text-h6">{{ t('orders.order_placed') }}</div>
        </v-card-title>

        <v-card-text class="text-center text-body-2 text-grey-darken-1">
          {{ t('orders.current_order') }}
          <strong>#{{ receipt?.order_number }}</strong>
          — {{ t('common.total') }}:
          <strong>{{ formatKHR(receipt?.total ?? 0) }}</strong>
        </v-card-text>

        <v-card-actions class="flex-column ga-2 px-4 pb-4">
          <!-- 🖨️ This button is a direct user tap → share sheet works! -->
          <v-btn
            block
            color="primary"
            variant="flat"
            rounded="lg"
            :loading="printing"
            prepend-icon="mdi-printer"
            @click="handlePrint"
          >
            {{ t('btn.print_receipt') }}
          </v-btn>

          <v-btn block variant="tonal" rounded="lg" @click="closePrintDialog">
            {{ t('btn.skip') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ── Footer ───────────────────────────────────────────────────────────── -->
    <MartFooter
      :connectUsb="connectUsb"
      :usbConnected="usbConnected"
      :usbSupported="usbSupported"
    />
  </v-app>
</template>

<script setup>
  import { ref, watch, onMounted, nextTick } from 'vue'
  import { useMartPos } from '@/composables/useMartPos'
  import MartAppBar from '@/components/mart/layout/MartAppBar.vue'
  import MartCartDrawer from '@/components/mart/layout/MartCartDrawer.vue'
  import MartFooter from '@/components/mart/layout/MartFooter.vue'
  import CashPaymentDialog from '@/components/mart/CashPaymentDialog.vue'
  import BranchSwitcherDrawer from '@/components/BranchSwitcherDrawer.vue'
  import { useAuthStore } from '@/stores/authStore'
  import { useRouter } from 'vue-router'
  import { useMartStore } from '@/stores/martStore'
  import { useProductStore } from '@/stores/productStore'
  import { useCategoryStore } from '@/stores/categoryStore'
  import { useAppUtils } from '@/composables/useAppUtils'
  import { useI18n } from 'vue-i18n'
  import { useReceipt } from '@/utils/printReceipt'
  import { formatKHR } from '@nong-official-dev/core'

  const { t } = useI18n()
  const { notif, confirm } = useAppUtils()

  const {
    printing,
    error,
    print,
    connectUsb,
    disconnectUsb,
    usbConnected,
    usbSupported,
    printMethod
  } = useReceipt()

  const productStore = useProductStore()
  const categoryStore = useCategoryStore()
  const martStore = useMartStore()
  const authStore = useAuthStore()
  const router = useRouter()

  const receipt = ref(null)
  const cashDialog = ref(false)
  const printDialog = ref(false)
  const branchDrawer = ref(false)

  async function onBranchChanged(branch) {
    await Promise.all([
      productStore.fetchProducts({ branch_id: branch.id }),
      categoryStore.fetchCategories({ branch_id: branch.id })
    ])
  }
  // ── Android printer check ─────────────────────────────────────────────────
  const isAndroid = () => /android/i.test(navigator.userAgent)

  const checkPrinterBeforeCheckout = () => {
    if (isAndroid() && usbSupported && !usbConnected.value) {
      notif(t('printer.not_connected') || 'Please connect the printer first.', {
        type: 'warning'
      })
      return false
    }
    return true
  }

  // ── Watch for print errors ────────────────────────────────────────────────
  watch(error, val => {
    if (!val) return
    if (val === 'not_connected') {
      notif(t('printer.not_connected'), {
        type: 'warning'
      })
    } else if (val === 'disconnected') {
      notif(t('printer.disconnected'), {
        type: 'error'
      })
    } else {
      notif(val, { type: 'error' })
    }
  })

  const logout = async () => {
    await authStore.logout()
    router.push({ name: 'Login' })
  }

  const processCheckout = async (extraPayload = {}) => {
    try {
      const data = await martStore.checkout(extraPayload)
      receipt.value = data.receipt
      notif(t('notification.orderPlaced'), { type: 'success' })
      printDialog.value = true
    } catch (err) {
      console.error(err)
      notif(err.message || 'Checkout failed', { type: 'error' })
    }
  }

  const handlePrint = async () => {
    if (!receipt.value) return
    const data = JSON.parse(JSON.stringify(receipt.value))
    const ok = await print(data)
    if (ok) closePrintDialog()
  }

  const closePrintDialog = () => {
    printDialog.value = false
    receipt.value = null
  }

  // ── Checkout — check printer first on Android ─────────────────────────────
  const completeOrder = async () => {
    if (!checkPrinterBeforeCheckout()) return // ← stop if not connected

    if (cart.value?.paymentMethod === 'cash') {
      cashDialog.value = true
      return
    }
    await processCheckout()
  }

  const confirmCashPayment = async ({ cash_received, change }) => {
    if (!checkPrinterBeforeCheckout()) return // ← stop if not connected

    cashDialog.value = false
    await processCheckout({
      cash_tendered: cash_received,
      change_given: change
    })
  }

  const search = ref('')
  // add these refs in <script setup>
  const barcodeInputRef = ref(null)
  const barcodeBuffer = ref('')
  const scannedBarcode = ref('') // passed to router-view

  const onAppBarScan = barcode => {
    scannedBarcode.value = ''
    nextTick(() => {
      scannedBarcode.value = barcode
    })
  }
  const onBarcodeEnter = () => {
    const code = barcodeBuffer.value.trim()
    barcodeBuffer.value = ''
    if (!code) return
    scannedBarcode.value = code // triggers watcher in ProductsView
  }

  // keep it always focused (scanners type into whatever is focused)
  onMounted(() => {
    document.addEventListener('click', () => {
      // don't steal focus from real inputs (search box, qty fields, dialogs)
      const tag = document.activeElement?.tagName
      const isRealInput =
        ['INPUT', 'TEXTAREA'].includes(tag) &&
        document.activeElement !== barcodeInputRef.value
      if (!isRealInput) barcodeInputRef.value?.focus()
    })
    barcodeInputRef.value?.focus()
  })

  const { operator, cart, updateQty, removeItem, clearCart, setPayment } =
    useMartPos()
</script>

<style scoped>
  .barcode-capture {
    position: fixed;
    opacity: 0;
    pointer-events: none;
    width: 1px;
    height: 1px;
    top: 0;
    left: 0;
  }
  .mart-content {
    height: calc(100vh - 60px - 32px);
    overflow-y: auto;
    scroll-behavior: smooth;
    padding: 16px;
  }
  .mart-content::-webkit-scrollbar {
    width: 6px;
  }
  .mart-content::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
  }
</style>
