<template>
  <v-navigation-drawer
    location="right"
    width="340"
    permanent
    elevation="1"
    class="cart-drawer border-0"
  >
    <div class="d-flex flex-column fill-height bg-grey-lighten-4">
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
                  @update:model-value="
                    val => emit('update-qty', item._key, val)
                  "
                />
              </div>
            </div>
          </div>
        </v-card>
      </div>

      <div class="pa-3 bg-white border-t">
        <div class="mb-2">
          <div
            v-if="!cart.discount"
            class="d-flex align-center text-primary cursor-pointer py-1"
            @click="showDiscountDialog = true"
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
            @click:close="emit('remove-coupon')"
          >
            <v-icon icon="mdi-check-decagram" start />
            DISCOUNT APPLIED: -{{ fmt(cart.discount) }}
          </v-chip>
        </div>

        <div class="mb-3">
          <div class="d-flex justify-space-between text-tiny mb-1">
            <span class="text-medium-emphasis">{{ t('common.subtotal') }}</span>
            <span>{{ fmt(cart.subtotal) }}</span>
          </div>
          <div
            v-if="cart.discount"
            class="d-flex justify-space-between text-tiny mb-1 text-success font-weight-bold"
          >
            <span>Coupon Discount</span>
            <span>-{{ fmt(cart.discount) }}</span>
          </div>
          <div class="d-flex justify-space-between align-center border-t pt-2">
            <span class="text-body-2 font-weight-black">
              {{ t('common.total') }}
            </span>
            <span class="text-h6 font-weight-black text-primary">
              {{ fmt(cart.total) }}
            </span>
          </div>
        </div>

        <div class="d-flex gap-1 mb-3">
          <v-card
            v-for="method in paymentMethods"
            :key="method.id"
            flat
            border
            class="flex-grow-1 text-center py-1 rounded cursor-pointer transition-all"
            :color="cart.paymentMethod === method.id ? 'primary' : 'white'"
            @click="emit('set-payment', method.id)"
          >
            <v-icon :icon="method.icon" size="16" />
            <div class="text-tiny font-weight-bold">{{ method.label }}</div>
          </v-card>
        </div>

        <v-btn
          block
          size="large"
          color="primary"
          rounded="md"
          class="text-none font-weight-black"
          :disabled="cart.isEmpty"
          :loading="loading"
          @click="emit('checkout')"
        >
          {{ t('btn.pay') }} {{ fmt(cart.total) }}
        </v-btn>
      </div>
    </div>

    <v-dialog v-model="showDiscountDialog" max-width="400">
      <v-card rounded="xl" class="pa-4">
        <div class="text-h6 font-weight-black mb-1">Apply Discount</div>
        <div class="text-caption text-medium-emphasis mb-4">
          Enter a coupon code or promotional manual discount.
        </div>

        <v-text-field
          v-model="couponCode"
          label="Coupon Code"
          variant="outlined"
          prepend-inner-icon="mdi-ticket-percent-outline"
          color="primary"
          hide-details
          class="mb-4"
          autofocus
        />

        <div class="d-flex gap-2">
          <v-btn
            variant="outlined"
            class="flex-grow-1"
            @click="showDiscountDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn color="primary" class="flex-grow-1" @click="applyDiscount">
            Apply
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </v-navigation-drawer>
</template>

<script setup>
  import { computed, ref } from 'vue'
  import { formatKHR } from '@nong-official-dev/core'
  import QtyStepper from '@/components/customs/QtyStepper.vue'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()

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
    'clear',
    'apply-coupon',
    'remove-coupon'
  ])

  const showDiscountDialog = ref(false)
  const couponCode = ref('')

  const applyDiscount = () => {
    if (couponCode.value.trim()) {
      emit('apply-coupon', couponCode.value)
      couponCode.value = ''
      showDiscountDialog.value = false
    }
  }
  const paymentMethods = computed(() => [
    { id: 'cash', icon: 'mdi-cash', label: t('orders.cash') },
    { id: 'card', icon: 'mdi-credit-card-outline', label: t('orders.card') },
    { id: 'qr', icon: 'mdi-qrcode-scan', label: t('orders.qr') }
  ])
  const fmt = v => formatKHR(v ?? 0)
</script>

<style scoped>
  .text-tiny {
    font-size: 0.725rem !important;
  }
  .gap-1 {
    gap: 4px;
  }
  .gap-2 {
    gap: 8px;
  }
  .custom-scrollbar::-webkit-scrollbar {
    width: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #e2e8f0;
  }
</style>
