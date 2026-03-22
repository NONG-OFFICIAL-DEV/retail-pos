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

  const logout = async () => {
    await authStore.logout()
    router.push({ name: 'Login' })
  }

  const completeOrder = async () => {
    try {
      const data = await martStore.checkout()

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

  const search = ref('')

  const {
    operator,
    cart,
    updateQty,
    removeItem,
    clearCart,
    setPayment,
    checkout
  } = useMartPos()
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
