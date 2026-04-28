<template>
  <v-navigation-drawer
    location="right"
    width="340"
    permanent
    elevation="1"
    class="cart-drawer border-0"
  >
    <div class="d-flex flex-column fill-height bg-grey-lighten-4">
      <!-- Header -->
      <div class="pa-3 bg-white border-b">
        <div class="d-flex align-center justify-space-between">
          <div>
            <div
              class="text-caption font-weight-black text-uppercase text-medium-emphasis"
            >
              {{ t('orders.current_order') }}
            </div>
            <div class="text-body-2 font-weight-black">
              {{ cart.itemCount }} {{ t('common.items') }}
            </div>
          </div>
          <v-btn
            v-if="!cart.isEmpty"
            icon="mdi-delete-outline"
            variant="text"
            density="compact"
            color="error"
            @click="emit('clear')"
          />
        </div>
      </div>

      <!-- Items -->
      <div class="flex-grow-1 overflow-y-auto pa-2 custom-scrollbar">
        <v-card
          v-for="item in cart.items"
          :key="item.id"
          flat
          class="mb-1 rounded-md border-sm bg-white"
        >
          <div class="pa-2 d-flex align-center gap-2">
            <v-avatar
              size="40"
              rounded="sm"
              class="bg-grey-lighten-4 border flex-shrink-0"
            >
              <v-img :src="item.image_url" cover />
            </v-avatar>
            <div class="flex-grow-1 min-w-0">
              <div class="d-flex justify-space-between align-center">
                <div class="text-caption font-weight-bold text-truncate pr-2">
                  {{ item.name }}
                </div>
                <div class="text-caption font-weight-black text-primary">
                  {{ fmt(item.price * item.qty) }}
                </div>
              </div>
              <div class="d-flex align-center justify-space-between mt-1">
                <span class="text-tiny text-medium-emphasis">
                  {{ fmt(item.price) }} / {{ item.unit }}
                </span>
                <QtyStepper
                  :model-value="item.qty"
                  density="compact"
                  small
                  :min="0"
                  @update:model-value="
                    val => emit('update-qty', item._key, val)
                  "
                />
              </div>
            </div>
          </div>
        </v-card>
      </div>
      <div v-if="!cart.items.length" class="empty-cart-container pa-8">
        <div class="empty-visual mb-4">
          <v-icon icon="mdi-basket-outline" size="48" color="brown-lighten-4" />
        </div>
        <div class="text-subtitle-2 font-weight-bold text-brown-darken-1">
          {{ t('common.emptyCart') }}
        </div>
      </div>

      <!-- Footer -->
      <div class="pa-3 bg-white border-t">
        <!-- Discount trigger / applied chip -->
        <div class="mb-2">
          <div
            v-if="!mart.discount"
            class="d-flex align-center py-1"
            :class="
              mart.isEmpty
                ? 'text-disabled cursor-not-allowed'
                : 'text-primary cursor-pointer'
            "
            @click="!mart.isEmpty && (showDiscountDialog = true)"
          >
            <v-icon icon="mdi-tag-plus-outline" size="16" class="mr-1" />
            <span class="text-tiny font-weight-black text-uppercase">
              {{ t('common.add_disscount_coupon') }}
            </span>
          </div>

          <v-chip
            v-else
            color="success"
            size="x-small"
            variant="flat"
            closable
            class="w-100 justify-space-between mb-1"
            @click:close="removeDiscount"
          >
            <v-icon icon="mdi-check-decagram" start />
            {{ appliedDiscountLabel }} &mdash; -{{ fmt(mart.discount) }}
          </v-chip>
        </div>

        <!-- Totals -->
        <div class="mb-3">
          <div class="d-flex justify-space-between text-tiny mb-1">
            <span class="text-medium-emphasis">{{ t('common.subtotal') }}</span>
            <span>{{ fmt(mart.subtotal) }}</span>
          </div>
          <div
            v-if="mart.discount"
            class="d-flex justify-space-between text-tiny mb-1 text-success font-weight-bold"
          >
            <span>{{ t('common.discount') }}</span>
            <span>-{{ fmt(mart.discount) }}</span>
          </div>
          <div class="d-flex justify-space-between align-center border-t pt-2">
            <span class="text-body-2 font-weight-black">
              {{ t('common.total') }}
            </span>
            <span class="text-h6 font-weight-black text-primary">
              {{ fmt(mart.total) }}
            </span>
          </div>
        </div>

        <!-- Payment Methods -->
        <div class="d-flex gap-1 mb-3">
          <v-card
            v-for="method in paymentMethods"
            :key="method.id"
            flat
            border
            class="flex-grow-1 text-center py-1 rounded cursor-pointer transition-all"
            :color="mart.paymentMethod === method.id ? 'primary' : 'white'"
            @click="emit('set-payment', method.id)"
          >
            <v-icon :icon="method.icon" size="16" />
            <div class="text-tiny font-weight-bold">{{ method.label }}</div>
          </v-card>
        </div>

        <!-- Pay Button -->
        <v-btn
          block
          size="large"
          color="primary"
          rounded="md"
          class="text-none font-weight-black"
          :disabled="mart.isEmpty"
          :loading="loading"
          @click="emit('checkout')"
        >
          {{ t('btn.pay') }} {{ fmt(mart.total) }}
        </v-btn>
      </div>
    </div>

    <!-- Discount Dialog -->
    <DiscountDialog
      v-model="showDiscountDialog"
      :subtotal="mart.subtotal"
      @apply="onDiscountApplied"
    />
  </v-navigation-drawer>
</template>

<script setup>
  import { computed, ref } from 'vue'
  import { formatKHR } from '@nong-official-dev/core'
  import { useI18n } from 'vue-i18n'
  import { useMartStore } from '@/stores/martStore'
  import QtyStepper from '@/components/customs/QtyStepper.vue'
  import DiscountDialog from '@/components/DiscountDialog.vue'

  const { t } = useI18n()
  const mart = useMartStore()

  const props = defineProps({
    cart: {
      type: Object,
      default: () => ({
        items: [],
        subtotal: 0,
        total: 0,
        discount: 0,
        paymentMethod: 'cash',
        isEmpty: true,
        itemCount: 0
      })
    },
    loading: { type: Boolean, default: false }
  })

  const emit = defineEmits([
    'checkout',
    'remove',
    'update-qty',
    'set-payment',
    'clear'
  ])

  // ── Discount ──────────────────────────────────────────────────
  const showDiscountDialog = ref(false)
  const appliedDiscountLabel = ref('')

  const onDiscountApplied = ({ discount, label }) => {
    mart.setDiscount(discount) // writes to store → subtotal/total react instantly
    appliedDiscountLabel.value = label
  }

  const removeDiscount = () => {
    mart.setDiscount(0)
    appliedDiscountLabel.value = ''
  }

  // ─────────────────────────────────────────────────────────────
  const paymentMethods = computed(() => [
    { id: 'cash', icon: 'mdi-cash', label: t('orders.cash') },
    { id: 'card', icon: 'mdi-credit-card-outline', label: t('orders.card') },
    { id: 'qr', icon: 'mdi-qrcode-scan', label: t('orders.qr') }
  ])

  const fmt = v => formatKHR(v ?? 0)
</script>

<style scoped>
  .text-tiny {
    font-size: 0.825rem !important;
  }
  .gap-1 {
    gap: 4px;
  }
  .gap-2 {
    gap: 8px;
  }
  .cursor-pointer {
    cursor: pointer;
  }
  .custom-scrollbar::-webkit-scrollbar {
    width: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #e2e8f0;
  }
  .cursor-pointer {
    cursor: pointer;
  }
  .cursor-not-allowed {
    cursor: not-allowed;
  }
  .custom-scrollbar::-webkit-scrollbar {
    width: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #e2e8f0;
  }
  /* Empty State Styling */
  .empty-cart-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    height: 100%;
    min-height: 300px;
  }

  .empty-visual {
    width: 80px;
    height: 80px;
    background: #efebe9;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
