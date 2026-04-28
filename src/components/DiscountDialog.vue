<template>
  <v-dialog v-model="model" max-width="460" persistent scrollable>
    <v-card rounded="xl" class="pa-0">
      <!-- Header -->
      <div class="dialog-header pa-5 pb-4">
        <div class="d-flex align-center justify-space-between mb-1">
          <div class="text-h6 font-weight-black">{{ t('discount.title') }}</div>
          <v-btn
            icon="mdi-close"
            variant="text"
            density="compact"
            @click="close"
          />
        </div>
        <div class="text-caption text-medium-emphasis">
          {{ t('discount.subtitle') }}
        </div>
      </div>

      <v-divider />

      <div class="pa-4">
        <!-- Discount Type Tabs -->
        <v-tabs
          v-model="activeTab"
          color="primary"
          density="compact"
          class="mb-4"
        >
          <v-tab value="fixed">
            <v-icon icon="mdi-cash-minus" size="16" class="mr-1" />
            {{ t('discount.tabs.fixed') }}
          </v-tab>
          <v-tab value="percentage">
            <v-icon icon="mdi-percent" size="16" class="mr-1" />
            {{ t('discount.tabs.percentage') }}
          </v-tab>
          <v-tab value="coupon">
            <v-icon icon="mdi-ticket-percent-outline" size="16" class="mr-1" />
            {{ t('discount.tabs.coupon') }}
          </v-tab>
        </v-tabs>

        <!-- Percentage Tab -->
        <v-window v-model="activeTab">
          <!-- Fixed Amount Tab -->
          <v-window-item value="fixed">
            <div
              class="text-caption text-medium-emphasis mb-3 font-weight-medium"
            >
              {{ t('discount.fixed.hint') }}
            </div>

            <!-- 7 Quick Fixed Options -->
            <v-row dense class="mb-3">
              <v-col v-for="opt in fixedOptions" :key="opt.value" cols="auto">
                <v-chip
                  :color="selectedFixed === opt.value ? 'primary' : 'default'"
                  :variant="selectedFixed === opt.value ? 'flat' : 'outlined'"
                  class="cursor-pointer font-weight-black"
                  size="small"
                  @click="selectFixed(opt.value)"
                >
                  {{ opt.label }}
                </v-chip>
              </v-col>
            </v-row>

            <v-text-field
              v-model.number="customFixed"
              :label="t('discount.fixed.label')"
              variant="outlined"
              density="compact"
              type="number"
              min="0"
              prepend-inner-icon="mdi-cash-minus"
              color="primary"
              hide-details="auto"
              :hint="
                customFixed
                  ? `${t('common.discount')}: ${fmt(customFixed)}`
                  : ''
              "
              persistent-hint
              @focus="selectedFixed = null"
            />
          </v-window-item>
          <v-window-item value="percentage">
            <div
              class="text-caption text-medium-emphasis mb-3 font-weight-medium"
            >
              {{ t('discount.percentage.hint') }}
            </div>

            <!-- 7 Quick Percentage Options -->
            <v-row dense class="mb-3">
              <v-col
                v-for="opt in percentageOptions"
                :key="opt.value"
                cols="auto"
              >
                <v-chip
                  :color="
                    selectedPercentage === opt.value ? 'primary' : 'default'
                  "
                  :variant="
                    selectedPercentage === opt.value ? 'flat' : 'outlined'
                  "
                  class="cursor-pointer font-weight-black"
                  size="small"
                  @click="selectPercentage(opt.value)"
                >
                  {{ opt.label }}
                </v-chip>
              </v-col>
            </v-row>

            <v-text-field
              v-model.number="customPercentage"
              :label="t('discount.percentage.label')"
              variant="outlined"
              density="compact"
              type="number"
              min="0"
              max="100"
              prepend-inner-icon="mdi-percent-outline"
              color="primary"
              hide-details="auto"
              :hint="
                customPercentage
                  ? `${t('discount.percentage.hint_discount')}: ${fmt(computedPercentageDiscount)}`
                  : ''
              "
              persistent-hint
              @focus="selectedPercentage = null"
            />
          </v-window-item>
          <!-- Coupon Tab -->
          <v-window-item value="coupon">
            <div
              class="text-caption text-medium-emphasis mb-3 font-weight-medium"
            >
              {{ t('discount.coupon.hint') }}
            </div>

            <v-text-field
              v-model="couponCode"
              :label="t('discount.coupon.label')"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-ticket-percent-outline"
              color="primary"
              hide-details
              class="mb-3"
              autofocus
              :loading="validatingCoupon"
              @keyup.enter="validateCoupon"
            />

            <!-- Coupon result feedback -->
            <v-alert
              v-if="couponResult"
              :type="couponResult.valid ? 'success' : 'error'"
              density="compact"
              variant="tonal"
              rounded="lg"
              class="mb-3"
            >
              <template v-if="couponResult.valid">
                <strong>{{ couponResult.code }}</strong>
                — {{ couponResult.description }}
                <div class="font-weight-black">
                  {{ t('discount.coupon.saves') }}:
                  {{ fmt(couponResult.discount) }}
                </div>
              </template>
              <template v-else>{{ t('discount.coupon.invalid') }}</template>
            </v-alert>

            <v-btn
              block
              variant="outlined"
              color="primary"
              :loading="validatingCoupon"
              :disabled="!couponCode.trim()"
              @click="validateCoupon"
            >
              {{ t('btn.validate') }}
            </v-btn>
          </v-window-item>
        </v-window>

        <!-- Preview -->
        <v-sheet
          v-if="previewDiscount > 0"
          color="primary"
          rounded="lg"
          class="pa-3 mt-4 d-flex justify-space-between align-center"
        >
          <div>
            <div class="text-caption text-white opacity-80">
              {{ t('discount.preview.title') }}
            </div>
            <div class="text-white font-weight-black text-body-2">
              {{ previewLabel }}
            </div>
          </div>
          <div class="text-h6 font-weight-black text-white">
            -{{ fmt(previewDiscount) }}
          </div>
        </v-sheet>
      </div>

      <v-divider />

      <!-- Actions -->
      <div class="d-flex gap-2 pa-4">
        <v-btn variant="outlined" class="flex-grow-1" @click="close">
          {{ t('btn.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          class="flex-grow-1 font-weight-black"
          :disabled="!canApply"
          @click="apply"
        >
          {{ t('btn.apply') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
  import { ref, computed, watch } from 'vue'
  import { formatKHR } from '@nong-official-dev/core'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()
  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    subtotal: { type: Number, default: 0 }
  })

  const emit = defineEmits(['update:modelValue', 'apply'])

  const model = computed({
    get: () => props.modelValue,
    set: val => emit('update:modelValue', val)
  })

  const activeTab = ref('fixed')
  const fmt = v => formatKHR(v ?? 0)

  // ── Percentage ──────────────────────────────────────────────
  const percentageOptions = [
    { label: '5%', value: 5 },
    { label: '10%', value: 10 },
    { label: '15%', value: 15 },
    { label: '20%', value: 20 },
    { label: '25%', value: 25 },
    { label: '30%', value: 30 },
    { label: '50%', value: 50 }
  ]
  const selectedPercentage = ref(null)
  const customPercentage = ref(null)

  const selectPercentage = val => {
    selectedPercentage.value = val
    customPercentage.value = val
  }

  const computedPercentageDiscount = computed(() => {
    const pct = customPercentage.value
    if (!pct || pct <= 0) return 0
    return Math.round((props.subtotal * pct) / 100)
  })

  // ── Fixed Amount ─────────────────────────────────────────────
  const fixedOptions = [
    { label: '500', value: 500 },
    { label: '1,000', value: 1000 },
    { label: '2,000', value: 2000 },
    { label: '5,000', value: 5000 },
    { label: '10,000', value: 10000 },
    { label: '20,000', value: 20000 }
  ]
  const selectedFixed = ref(null)
  const customFixed = ref(null)

  const selectFixed = val => {
    selectedFixed.value = val
    customFixed.value = val
  }

  // ── Coupon ────────────────────────────────────────────────────
  const couponCode = ref('')
  const validatingCoupon = ref(false)
  const couponResult = ref(null)

  watch(couponCode, () => {
    couponResult.value = null
  })

  // Simulate coupon validation — replace with real API call
  const MOCK_COUPONS = {
    SAVE10: {
      valid: true,
      type: 'percentage',
      value: 10,
      description: '10% off entire order'
    },
    VIP20: {
      valid: true,
      type: 'percentage',
      value: 20,
      description: '20% VIP discount'
    },
    FLAT5K: {
      valid: true,
      type: 'fixed',
      value: 5000,
      description: 'KHR 5,000 flat off'
    }
  }

  const validateCoupon = async () => {
    if (!couponCode.value.trim()) return
    validatingCoupon.value = true
    couponResult.value = null
    await new Promise(r => setTimeout(r, 700)) // simulate network
    const found = MOCK_COUPONS[couponCode.value.trim().toUpperCase()]
    if (found) {
      const discount =
        found.type === 'percentage'
          ? Math.round((props.subtotal * found.value) / 100)
          : found.value
      couponResult.value = {
        valid: true,
        code: couponCode.value.toUpperCase(),
        description: found.description,
        discount
      }
    } else {
      couponResult.value = { valid: false }
    }
    validatingCoupon.value = false
  }

  // ── Computed preview ─────────────────────────────────────────
  const previewDiscount = computed(() => {
    if (activeTab.value === 'percentage')
      return computedPercentageDiscount.value
    if (activeTab.value === 'fixed')
      return Math.min(customFixed.value ?? 0, props.subtotal)
    if (activeTab.value === 'coupon')
      return couponResult.value?.valid ? couponResult.value.discount : 0
    return 0
  })

  const previewLabel = computed(() => {
    if (activeTab.value === 'percentage')
      return `${customPercentage.value}% ${t('discount.preview.percentage_label')}`
    if (activeTab.value === 'fixed') return t('discount.preview.fixed_label')
    if (activeTab.value === 'coupon')
      return `${t('discount.preview.coupon_label')}: ${couponResult.value?.code}`
    return ''
  })
  const canApply = computed(() => previewDiscount.value > 0)

  // ── Actions ───────────────────────────────────────────────────
  const apply = () => {
    emit('apply', {
      type: activeTab.value,
      discount: previewDiscount.value,
      label: previewLabel.value,
      couponCode: activeTab.value === 'coupon' ? couponResult.value?.code : null
    })
    close()
  }

  const close = () => {
    model.value = false
    // reset
    activeTab.value = 'fixed'
    selectedPercentage.value = null
    customPercentage.value = null
    selectedFixed.value = null
    customFixed.value = null
    couponCode.value = ''
    couponResult.value = null
  }
</script>

<style scoped>
  .dialog-header {
    background: #fafafa;
  }
  .gap-2 {
    gap: 8px;
  }
  .cursor-pointer {
    cursor: pointer;
  }
</style>
