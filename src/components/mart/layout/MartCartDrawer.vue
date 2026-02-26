<script setup>
  import { formatCurrency } from '@nong-official-dev/core'
  import QtyStepper from '@/components/customs/QtyStepper.vue'

  import { computed } from 'vue'

  const props = defineProps({
    items: { type: Array, default: () => [] },
    subtotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paymentMethod: { type: String, default: 'cash' }
  })

  const emit = defineEmits([
    'checkout',
    'remove',
    'update-qty',
    'update:paymentMethod',
    'clear'
  ])

  const isEmpty = computed(() => props.items.length === 0)
  const itemCount = computed(() => props.items.reduce((s, i) => s + i.qty, 0))

  const discount = computed(() => 0) // wire to posStore later
  const tax = computed(() => 0) // wire to posStore later

  const paymentMethods = [
    { id: 'qr', icon: 'mdi-qrcode-scan', label: 'QR' },
    { id: 'cash', icon: 'mdi-cash', label: 'Cash' },
    { id: 'card', icon: 'mdi-credit-card-outline', label: 'Card' }
  ]

</script>

<template>
  <v-navigation-drawer
    location="right"
    width="400"
    permanent
    elevation="1"
    class="cart-drawer border-0"
  >
    <div class="d-flex flex-column fill-height bg-grey-lighten-5">
      <div class="px-4 py-3 border-b d-flex align-center justify-space-between">
        <div>
          <div class="text-subtitle-2 font-weight-black">CURRENT ORDER</div>

          <div class="text-caption">Items Count {{ itemCount }}</div>
        </div>

        <v-btn
          v-if="!isEmpty"
          icon="mdi-delete-sweep"
          variant="tonal"
          size="x-small"
          color="error"
          @click="$emit('clear')"
        />
      </div>

      <div class="flex-grow-1 overflow-y-auto pa-4">
        <div
          v-if="isEmpty"
          class="d-flex flex-column align-center justify-center fill-height text-grey-lighten-1"
        >
          <v-icon icon="mdi-cart-outline" size="64" class="mb-4" />
          <p class="text-body-1 font-weight-medium">Your cart is empty</p>
        </div>

        <v-card
          v-for="item in items"
          :key="item.id"
          flat
          rounded="lg"
          class="mb-2 border-sm"
        >
          <div class="pa-2 d-flex align-center">
            <v-avatar size="48" rounded="md" class="bg-grey-lighten-4 border">
              <v-img :src="item.image_url" cover />
            </v-avatar>

            <div class="ml-3 flex-grow-1">
              <div class="d-flex justify-space-between">
                <span class="font-weight-bold text-truncate">
                  {{ item.menu_name || item.name }}
                </span>

                <span class="font-weight-black text-primary">
                  {{ formatCurrency(item.price * item.qty) }}
                </span>
              </div>

              <!-- Customizations -->
              <div
                v-if="
                  item.customizations && Object.keys(item.customizations).length
                "
                class="d-flex flex-wrap gap-1 mt-1"
              >
                <v-chip
                  v-for="(val, key) in item.customizations"
                  :key="key"
                  size="x-small"
                  variant="tonal"
                >
                  {{ val }}
                </v-chip>
              </div>

              <!-- Qty -->
              <div class="d-flex justify-space-between align-center mt-2">
                <span class="text-caption text-grey">
                  {{ formatCurrency(item.price) }}
                </span>

                <!-- Editable qty ONLY for cart -->
                <QtyStepper
                  v-if="item.editable !== false"
                  :modelValue="item.qty"
                  :min="0"
                  :max="100"
                  small
                  strict
                  @update:modelValue="val => $emit('update-qty', item.id, val)"
                />

                <!-- Read-only qty (bill) -->
                <div v-else>
                  <span class="px-2 font-weight-bold text-caption">
                    × {{ item.qty }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </v-card>
      </div>

      <div class="pa-4 bg-white border-t">
        <div class="mb-4">
          <div class="d-flex justify-space-between text-body-2 mb-1">
            <span class="text-grey">Subtotal</span>
            <span>{{ formatCurrency(subtotal) }}</span>
          </div>
          <div
            class="d-flex justify-space-between text-body-2 mb-1 text-green-darken-1"
          >
            <span>Discount</span>
            <span>-{{ formatCurrency(discount) }}</span>
          </div>
          <v-divider class="my-2" />
          <div class="d-flex justify-space-between align-center">
            <span class="text-h6 font-weight-black">Total</span>
            <span class="text-h5 font-weight-black text-primary">
              {{ formatCurrency(total) }}
            </span>
          </div>
        </div>

        <p
          class="text-caption font-weight-black text-grey-darken-1 mb-2 uppercase"
        >
          Payment Method
        </p>
        <v-row no-gutters class="mx-n1 mb-4">
          <v-col
            cols="4"
            v-for="method in paymentMethods"
            :key="method.id"
            class="pa-1"
          >
            <v-card
              flat
              class="text-center py-2 rounded-lg border-sm"
              :color="
                paymentMethod === method.id ? 'orange-lighten-5' : 'white'
              "
              @click="$emit('select-payment', method.id)"
            >
              <v-icon :icon="method.icon" size="20" />
              <div class="text-caption font-weight-bold">
                {{ method.label }}
              </div>
            </v-card>
          </v-col>
        </v-row>

        <v-btn
          block
          size="x-large"
          color="primary"
          rounded="lg"
          class="text-none font-weight-black"
          elevation="1"
          :disabled="isEmpty"
          @click="emit('checkout')"
        >
          Proceed to Payment
          <v-icon icon="mdi-chevron-right" end />
        </v-btn>
      </div>
    </div>
  </v-navigation-drawer>
</template>

<style scoped>
  .gap-2 {
    gap: 8px;
  }

  .uppercase {
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Custom scrollbar for better look */
  .overflow-y-auto::-webkit-scrollbar {
    width: 4px;
  }
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;
  }
</style>
