<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePosStore } from '@/stores/posStore'
import { useProductStore } from '@/stores/productStore'
import { useSaleStore } from '@/stores/saleStore'
import { useAuthStore } from '@/stores/authStore'
import { useAppUtils } from '@/composables/useAppUtils'

import MartAppBar    from '@/components/mart/layout/MartAppBar.vue'
import MartCartDrawer from '@/components/mart/layout/MartCartDrawer.vue'

const posStore     = usePosStore()
const productStore = useProductStore()
const saleStore    = useSaleStore()
const authStore    = useAuthStore()
const router       = useRouter()
const { notif }    = useAppUtils()

/* ── STATE ── */
const search      = ref('')
const user        = ref(null)
const isLoading   = ref(false)

/* ── COMPUTED ── */
const activeItems     = computed(() => posStore.activeItems)
const subtotal        = computed(() => posStore.subtotal)
const total           = computed(() => posStore.total)
const paymentMethod   = computed(() => posStore.paymentMethod)
const paymentMethods  = computed(() => posStore.paymentMethods)

/* ── CART ACTIONS ── */
function handleIncrement(item) {
  posStore.incrementQty(item)
}

function handleDecrement(item) {
  posStore.decrementQty(item)
}

function handleRemove(item) {
  posStore.removeFromCart(item)
}

function handleClear() {
  posStore.clearCart()
}

/* ── CHECKOUT ── */
async function handleCheckout() {
  if (!activeItems.value.length) {
    notif('Cart is empty!', { type: 'warning' })
    return
  }

  isLoading.value = true
  try {
    const payload = {
      items: activeItems.value.map(i => ({
        product_id:     i.id,
        qty:            i.qty,
        price:          i.price,
        customizations: i.customizations || null
      })),
      total_amount:   total.value,
      payment_method: paymentMethod.value
    }

    await saleStore.checkout(payload)
    posStore.clearCart()
    notif('Checkout successful!', { type: 'success' })
    await productStore.fetchProducts({}, { loading: 'skeleton' })
  } catch (err) {
    console.error('[mart:checkout]', err)
    notif('Checkout failed. Please try again.', { type: 'error' })
  } finally {
    isLoading.value = false
  }
}

/* ── LOGOUT ── */
async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'Login' })
}

/* ── INIT ── */
onMounted(async () => {
  try {
    await authStore.fetchMe()
    user.value = authStore.me
  } catch {
    router.push({ name: 'Login' })
  }
})
</script>
<template>
  <v-app class="bg-grey-lighten-5">
    <MartAppBar
      v-model:search="search"
      :user="user"
      @logout="handleLogout"
    />

    <MartCartDrawer
      :items="activeItems"
      :subtotal="subtotal"
      :total="total"
      :payment-method="paymentMethod"
      :payment-methods="paymentMethods"
      @increment="handleIncrement"
      @decrement="handleDecrement"
      @remove="handleRemove"
      @clear="handleClear"
      @checkout="handleCheckout"
      @update:payment-method="posStore.setPaymentMethod"
    />

    <v-main>
      <v-container fluid class="pa-0">
        <div class="main-content-wrapper w-100">
          <router-view :search="search" />
        </div>
      </v-container>
    </v-main>

    <v-footer app color="white" border height="32" class="px-4">
      <div class="d-flex w-100 justify-space-between align-center">
        <div class="d-flex align-center">
          <v-icon icon="mdi-database-check" size="14" color="success" class="mr-1" />
          <span class="text-xxs font-weight-bold text-grey">DB SYNCED</span>
        </div>
        <div class="text-xxs font-weight-bold text-grey">
          V.2.4.0-MART &copy; {{ new Date().getFullYear() }}
        </div>
      </div>
    </v-footer>
  </v-app>
</template>

<style scoped>
/* Ensure the layout feels like a desktop app, not a website */
.main-content-wrapper {
  /* Subtract header height and footer height */
  height: calc(100vh - 70px - 32px);
  overflow-y: auto;
  scroll-behavior: smooth;
  padding: 16px;
}

/* Custom Scrollbar for Main Content */
.main-content-wrapper::-webkit-scrollbar {
  width: 6px;
}
.main-content-wrapper::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}

.text-xxs {
  font-size: 0.65rem;
  letter-spacing: 0.5px;
}

/* Fix for mobile: Ensure the drawer doesn't overlap content awkwardly */
@media (max-width: 960px) {
  .main-content-wrapper {
    padding-bottom: 80px; /* Space for a floating checkout button if mobile */
  }
}
</style>