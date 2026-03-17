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
      @checkout="checkout"
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

    <!-- ── Footer ───────────────────────────────────────────────────────────── -->
    <MartFooter />
  </v-app>
</template>

<script setup>
  import { ref } from 'vue'
  import { useMartPos } from '@/composables/useMartPos'
  import MartAppBar from '@/components/mart/layout/MartAppBar.vue'
  import MartCartDrawer from '@/components/mart/layout/MartCartDrawer.vue'
  import MartFooter from '@/components/mart/layout/MartFooter.vue'

  const search = ref('')

  const {
    operator,
    cart,
    updateQty,
    removeItem,
    clearCart,
    setPayment,
    checkout,
    logout
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
