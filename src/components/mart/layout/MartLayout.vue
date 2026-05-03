<template>
  <v-app class="bg-grey-lighten-5">
    <!-- ── App Bar ──────────────────────────────────────────────────────────── -->
    <MartAppBar
      v-model:search="search"
      :operator="operator"
      :branches="operator.branches"
      :current-branch-id="operator.currentBranchId"
      @logout="logout"
      @branch-changed="handleBranchChange"
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
          <router-view :search="search" />
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
  import { ref, watch } from 'vue'
  import { useMartPos } from '@/composables/useMartPos'
  import MartAppBar from '@/components/mart/layout/MartAppBar.vue'
  import MartCartDrawer from '@/components/mart/layout/MartCartDrawer.vue'
  import MartFooter from '@/components/mart/layout/MartFooter.vue'
  import CashPaymentDialog from '@/components/mart/CashPaymentDialog.vue'
  import { useAuthStore } from '@/stores/authStore'
  import { useRouter } from 'vue-router'
  import { useMartStore } from '@/stores/martStore'
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

  const martStore = useMartStore()
  const authStore = useAuthStore()
  const router = useRouter()

  const receipt = ref(null)
  const cashDialog = ref(false)
  const printDialog = ref(false)

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

  const handleBranchChange = async branch => {
    authStore.setActiveBranch(branch)

    // await Promise.all([
    //   productStore.fetchProducts({ branch_id: branch.id }),
    //   categoryStore.fetchCategories({ branch_id: branch.id })
    // ])
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

  const { operator, cart, updateQty, removeItem, clearCart, setPayment } =
    useMartPos()
</script>

<style scoped>
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
