<template>
  <v-app class="bg-grey-lighten-5">
    <!-- ── App Bar ──────────────────────────────────────────────────────────── -->
    <MartAppBar v-model:search="search" :operator="operator" @logout="logout" />

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
    <!-- <ReceiptPrint v-if="receipt" :receipt="receipt" /> -->
    <CashPaymentDialog
      v-model="cashDialog"
      :total="cart.total"
      :loading="cart.loading"
      @confirm="confirmCashPayment"
      @cancel="cashDialog = false"
    />
    <!-- ── Footer ───────────────────────────────────────────────────────────── -->
    <MartFooter />
  </v-app>
</template>

<script setup>
  import { ref, nextTick } from 'vue'
  import { useMartPos } from '@/composables/useMartPos'
  import MartAppBar from '@/components/mart/layout/MartAppBar.vue'
  import MartCartDrawer from '@/components/mart/layout/MartCartDrawer.vue'
  import MartFooter from '@/components/mart/layout/MartFooter.vue'
  import ReceiptPrint from '@/components/receipt/ReceiptPrint.vue'
  import CashPaymentDialog from '@/components/mart/CashPaymentDialog.vue'
  import { useAuthStore } from '@/stores/authStore'
  import { useRouter } from 'vue-router'
  import { useMartStore } from '@/stores/martStore'
  import { useAppUtils } from '@/composables/useAppUtils'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()
  const { notif } = useAppUtils()
  import { printReceipt } from '@/utils/printReceipt'

  const martStore = useMartStore()
  const authStore = useAuthStore()
  const router = useRouter()
  const receipt = ref(null)
  const cashDialog = ref(false)

  const logout = async () => {
    await authStore.logout()
    router.push({ name: 'Login' })
  }

  const processCheckout = async (extraPayload = {}) => {
    try {
      const data = await martStore.checkout(extraPayload)

      receipt.value = data.receipt

      notif('Order placed successfully', { type: 'success' }) // ✅ moved here

      await nextTick()
      printReceipt(data.receipt)
      // receipt.value = null
    } catch (err) {
      console.error(err)

      notif(err.message || 'Checkout failed', { type: 'error' }) // ✅ handle error here
    }
  }

  const completeOrder = async () => {
    if (cart.value?.paymentMethod === 'cash') {
      cashDialog.value = true
      return
    }
    await processCheckout()
  }

  const confirmCashPayment = async ({ cash_received, change }) => {
    cashDialog.value = false
    await processCheckout({
      cash_tendered: cash_received, // ← matches backend field
      change_given: change // ← matches backend field
    })
  }

  const search = ref('')

  const { operator, cart, updateQty, removeItem, clearCart, setPayment } =
    useMartPos()
</script>

<style scoped>
  .mart-content {
    height: calc(100vh - 60px - 32px); /* header - footer */
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
