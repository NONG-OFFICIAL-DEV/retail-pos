<template>
  <v-dialog v-model="model" max-width="440" :persistent="false">
    <v-card rounded="xl" border elevation="0">
      <!-- Product header -->
      <div class="d-flex align-center gap-3 pa-4 pb-3">
        <v-avatar
          size="56"
          rounded="lg"
          class="bg-grey-lighten-4 border flex-shrink-0"
        >
          <v-img :src="product?.image_url" cover />
        </v-avatar>
        <div class="flex-grow-1 min-w-0">
          <div class="text-body-1 font-weight-black text-truncate">
            {{ product?.name }}
          </div>
          <div class="d-flex align-center gap-1 mt-1">
            <v-icon :icon="stockIcon" :color="stockColor" size="13" />
            <span class="text-caption" :class="`text-${stockColor}`">
              {{ stockLabel }}
            </span>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="model = false"
        />
      </div>

      <v-divider />

      <v-card-text class="pa-4">
        <!-- ── Stock alerts ─────────────────────────────────────────────── -->
        <v-alert
          v-if="isOutOfStock"
          type="error"
          variant="tonal"
          density="compact"
          rounded="lg"
          class="mb-4"
          icon="mdi-alert-circle-outline"
        >
          <strong>{{ t('common.out_of_stock') }}.</strong>
          {{ t('common.cannot_add') }}
        </v-alert>

        <v-alert
          v-else-if="isLowStock"
          type="warning"
          variant="tonal"
          density="compact"
          rounded="lg"
          class="mb-4"
          icon="mdi-alert-outline"
        >
          {{ t('common.only') }}
          <strong>
            {{ fmtQty(product.stock_quantity) }} {{ product.unit ?? 'pcs' }}
          </strong>
          {{ t('common.left_in_stock') }}
        </v-alert>

        <!-- ── Customer type toggle (3 options) ────────────────────────── -->
        <div class="d-flex align-center justify-space-between mb-4">
          <span class="text-caption font-weight-bold text-medium-emphasis">
            {{ t('unit.customer_type') }}
          </span>
          <v-btn-toggle
            v-model="customerType"
            mandatory
            density="compact"
            rounded="lg"
            variant="outlined"
          >
            <v-btn value="retail" size="small" class="text-none px-3">
              {{ t('unit.retail') }}
            </v-btn>
            <v-btn value="wholesale" size="small" class="text-none px-3">
              {{ t('unit.wholsale') }}
            </v-btn>
            <v-btn value="lid_exchange" size="small" class="text-none px-3">
              {{ t('lid_exchange.title') }}
            </v-btn>
          </v-btn-toggle>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- MODE A: Normal sale (retail / wholesale)                       -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <template v-if="!isLidExchange">
          <!-- No units -->
          <template v-if="!hasUnits">
            <div
              class="text-caption font-weight-bold text-medium-emphasis mb-2"
            >
              {{ t('common.quantity') }}
            </div>
            <div class="d-flex align-center gap-3">
              <v-btn
                icon="mdi-minus"
                variant="tonal"
                size="small"
                rounded="lg"
                :disabled="qty <= 1"
                @click="qty--"
              />
              <v-text-field
                v-model.number="qty"
                type="number"
                min="1"
                variant="outlined"
                density="compact"
                rounded="lg"
                hide-details
                class="text-center"
                style="max-width: 80px"
              />
              <v-btn
                icon="mdi-plus"
                variant="tonal"
                size="small"
                rounded="lg"
                :disabled="qty >= maxQtyNoUnit"
                @click="qty++"
              />
              <div class="text-body-1 font-weight-black text-primary ml-auto">
                {{ formatKHR(unitPrice * qty) }}
              </div>
            </div>
            <div v-if="qty > maxQtyNoUnit" class="text-caption text-error mt-2">
              <v-icon icon="mdi-alert-circle-outline" size="13" class="mr-1" />
              {{ t('common.exceeds_stock') }} ({{
                fmtQty(product.stock_quantity)
              }})
            </div>
          </template>

          <!-- Has units -->
          <template v-else>
            <div
              class="text-caption font-weight-bold text-medium-emphasis mb-2"
            >
              {{ t('unit.select_unit') }}
            </div>
            <div class="d-flex flex-column gap-2 mb-4">
              <v-card
                v-for="unit in sortedUnits"
                :key="unit.id"
                flat
                border
                rounded="lg"
                class="pa-3 cursor-pointer unit-card"
                :class="{ 'selected-unit': selectedUnit?.id === unit.id }"
                @click="selectUnit(unit)"
              >
                <div class="d-flex align-center justify-space-between">
                  <div>
                    <div class="text-body-2 font-weight-bold">
                      <strong>{{ unit.qty_per_base }}</strong>
                      x {{ unit.unit_label || unit.unit_name }}
                    </div>
                    <div
                      class="text-caption"
                      :class="
                        maxForUnit(unit) <= 0
                          ? 'text-error'
                          : 'text-medium-emphasis'
                      "
                    >
                      {{ t('common.max') }}: {{ maxForUnit(unit) }}
                      {{ unit.unit_label ?? unit.unit_name }}
                      {{ t('common.available') }}
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-body-1 font-weight-black text-primary">
                      {{ formatKHR(unitPriceFor(unit)) }}
                    </div>
                    <div
                      v-if="
                        customerType === 'wholesale' && unit.wholesale_price
                      "
                      class="text-caption text-success"
                    >
                      {{ t('unit.wholsale') }}
                    </div>
                    <v-chip
                      v-if="maxForUnit(unit) <= 0"
                      size="x-small"
                      color="error"
                      variant="tonal"
                      rounded="lg"
                      class="mt-1"
                    >
                      {{ t('common.out_of_stock') }}
                    </v-chip>
                  </div>
                </div>
              </v-card>
            </div>

            <!-- Qty for selected unit -->
            <div v-if="selectedUnit">
              <div
                class="text-caption font-weight-bold text-medium-emphasis mb-2"
              >
                {{ t('common.quantity') }}
              </div>
              <div class="d-flex align-center gap-3">
                <v-btn
                  icon="mdi-minus"
                  variant="tonal"
                  size="small"
                  rounded="lg"
                  :disabled="qty <= 1"
                  @click="qty--"
                />
                <v-text-field
                  v-model.number="qty"
                  type="number"
                  min="1"
                  variant="outlined"
                  density="compact"
                  rounded="lg"
                  hide-details
                  class="text-center"
                  style="max-width: 80px"
                />
                <v-btn
                  icon="mdi-plus"
                  variant="tonal"
                  size="small"
                  rounded="lg"
                  :disabled="qty >= maxForUnit(selectedUnit)"
                  @click="qty++"
                />
                <div class="text-body-1 font-weight-black text-primary ml-auto">
                  {{ formatKHR(unitPriceFor(selectedUnit) * qty) }}
                </div>
              </div>
              <div
                v-if="qty > maxForUnit(selectedUnit)"
                class="text-caption text-error mt-2"
              >
                <v-icon
                  icon="mdi-alert-circle-outline"
                  size="13"
                  class="mr-1"
                />
                {{ t('common.only') }} {{ maxForUnit(selectedUnit) }}
                {{ selectedUnit.unit_label ?? selectedUnit.unit_name }}
                {{ t('common.available') }}
              </div>
            </div>
          </template>
        </template>

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- MODE B: Lid Exchange                                           -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        <template v-else>
          <LidExchangeSection
            v-model:qty="qty"
            v-model:topupPreset="topupPreset"
            v-model:customTopup="customTopup"
            :selected-unit="selectedUnit"
            :sorted-units="sortedUnits"
            :has-units="hasUnits"
            :stock-qty="stockQty"
            @select-unit="selectUnit"
          />
        </template>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 gap-3">
        <v-btn variant="tonal" rounded="lg" @click="model = false">
          {{ t('btn.cancel') }}
        </v-btn>

        <!-- Normal sale button -->
        <v-btn
          v-if="!isLidExchange"
          color="primary"
          variant="flat"
          rounded="lg"
          class="flex-grow-1"
          prepend-icon="mdi-cart-plus"
          :disabled="!canAddToCart"
          @click="addToCart"
        >
          {{ t('btn.add_to_cart') }}
        </v-btn>

        <!-- Lid exchange button -->
        <v-btn
          v-else
          color="warning"
          variant="flat"
          rounded="lg"
          class="flex-grow-1"
          prepend-icon="mdi-swap-horizontal"
          :disabled="!canAddLidExchange"
          @click="addToCart"
        >
          {{ t('btn.add_exchange') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
  import { ref, computed, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { formatKHR } from '@nong-official-dev/core'
  import LidExchangeSection from './LidExchangeSection.vue'

  const { t } = useI18n()

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    product: { type: Object, default: null },
    customerType: { type: String, default: 'retail' }
  })
  const emit = defineEmits(['update:modelValue', 'addToCart'])

  const model = computed({
    get: () => props.modelValue,
    set: v => emit('update:modelValue', v)
  })

  // ── Local state ────────────────────────────────────────────────────────────
  const qty = ref(1)
  const selectedUnit = ref(null)
  const customerType = ref(props.customerType)

  // Lid exchange state
  const topupPreset = ref(500)
  const customTopup = ref(null)

  // ── Mode ───────────────────────────────────────────────────────────────────
  const isLidExchange = computed(() => customerType.value === 'lid_exchange')

  // ── Units ──────────────────────────────────────────────────────────────────
  const hasUnits = computed(
    () => (props.product?.active_units?.length ?? 0) > 0
  )
  const sortedUnits = computed(() =>
    [...(props.product?.active_units || [])].sort(
      (a, b) => a.qty_per_base - b.qty_per_base
    )
  )

  // ── Stock ──────────────────────────────────────────────────────────────────
  const stockQty = computed(() =>
    parseFloat(props.product?.stock_quantity ?? 0)
  )
  const isOutOfStock = computed(() => stockQty.value <= 0)
  const isLowStock = computed(
    () =>
      props.product?.reorder_level != null &&
      stockQty.value > 0 &&
      stockQty.value <= parseFloat(props.product.reorder_level)
  )
  const stockColor = computed(() => {
    if (isOutOfStock.value) return 'error'
    if (isLowStock.value) return 'warning'
    return 'success'
  })
  const stockIcon = computed(() => {
    if (isOutOfStock.value) return 'mdi-alert-circle'
    if (isLowStock.value) return 'mdi-alert'
    return 'mdi-check-circle'
  })
  const stockLabel = computed(() => {
    if (isOutOfStock.value) return t('common.out_of_stock')
    if (isLowStock.value)
      return t('common.low_stock', {
        qty: fmtQty(stockQty.value),
        unit: props.product?.unit ?? 'pcs'
      })
    return t('common.in_stock', {
      qty: fmtQty(stockQty.value),
      unit: props.product?.unit ?? 'pcs'
    })
  })

  // ── Normal sale helpers ────────────────────────────────────────────────────
  const maxQtyNoUnit = computed(() => Math.floor(stockQty.value))
  const maxForUnit = unit =>
    Math.floor(stockQty.value / parseFloat(unit.qty_per_base ?? 1))

  const unitPriceFor = unit => {
    if (customerType.value === 'wholesale' && unit.wholesale_price)
      return parseFloat(unit.wholesale_price)
    return parseFloat(unit.retail_price)
  }
  const unitPrice = computed(() =>
    parseFloat(props.product?.selling_price ?? props.product?.base_price ?? 0)
  )

  const canAddToCart = computed(() => {
    if (isOutOfStock.value) return false
    if (hasUnits.value) {
      if (!selectedUnit.value) return false
      return qty.value <= maxForUnit(selectedUnit.value) && qty.value > 0
    }
    return qty.value <= maxQtyNoUnit.value && qty.value > 0
  })

  // ── Lid exchange helpers ───────────────────────────────────────────────────
  const lidMaxQty = computed(() => {
    if (selectedUnit.value) return maxForUnit(selectedUnit.value)
    return Math.floor(stockQty.value)
  })

  const effectiveTopup = computed(() =>
    customTopup.value > 0
      ? Number(customTopup.value)
      : Number(topupPreset.value ?? 500)
  )

  const canAddLidExchange = computed(() => {
    if (isOutOfStock.value) return false
    if (hasUnits.value && !selectedUnit.value) return false
    if (qty.value < 1 || qty.value > lidMaxQty.value) return false
    if (effectiveTopup.value <= 0) return false
    return true
  })

  // ── Reset on product change ────────────────────────────────────────────────
  watch(
    () => props.product,
    () => {
      qty.value = 1
      selectedUnit.value = null
      customTopup.value = null
      topupPreset.value = 500

      if (hasUnits.value) {
        if (isLidExchange.value) {
          // lid exchange → always pick qty_per_base === 1
          selectedUnit.value =
            props.product.active_units.find(
              u => Number(u.qty_per_base) === 1
            ) ?? null
        } else {
          // normal sale → pick base unit or first
          selectedUnit.value =
            props.product.active_units.find(u => u.is_base_unit) ??
            props.product.active_units[0]
        }
      }
    },
    { immediate: true }
  )

  watch(isLidExchange, val => {
    qty.value = 1
    if (!hasUnits.value) return

    if (val) {
      // switching TO lid exchange
      selectedUnit.value =
        props.product.active_units.find(u => Number(u.qty_per_base) === 1) ??
        null
    } else {
      // switching BACK to normal
      selectedUnit.value =
        props.product.active_units.find(u => u.is_base_unit) ??
        props.product.active_units[0]
    }
  })

  // Sync customerType from prop (POS page level change)
  watch(
    () => props.customerType,
    val => {
      customerType.value = val
    }
  )

  const selectUnit = unit => {
    selectedUnit.value = unit
    qty.value = 1
    customTopup.value = null
    topupPreset.value = 500
  }

  // ── Add to cart ────────────────────────────────────────────────────────────
  const addToCart = () => {
    if (!props.product) return

    if (isLidExchange.value) {
      // Lid exchange emit
      emit('addToCart', {
        product_id: props.product.id,
        product_unit_id: selectedUnit.value?.id ?? null,
        name: props.product.name,
        unit_name:
          selectedUnit.value?.unit_label ??
          selectedUnit.value?.unit_name ??
          props.product.unit ??
          'pcs',
        qty_per_base: selectedUnit.value?.qty_per_base ?? 1,
        price: effectiveTopup.value,
        topup_amount: effectiveTopup.value,
        image_url: props.product.image_url,
        quantity: qty.value,
        customer_type: 'lid_exchange',
        _unitData: selectedUnit.value ?? null,
        _is_lid_exchange: true
      })
    } else {
      // Normal sale emit
      emit('addToCart', {
        product_id: props.product.id,
        product_unit_id: selectedUnit.value?.id ?? null,
        name: props.product.name,
        unit_name:
          selectedUnit.value?.unit_label ??
          selectedUnit.value?.unit_name ??
          props.product.unit ??
          'pcs',
        qty_per_base: selectedUnit.value?.qty_per_base ?? 1,
        price: selectedUnit.value
          ? unitPriceFor(selectedUnit.value)
          : unitPrice.value,
        image_url: props.product.image_url,
        quantity: qty.value,
        customer_type: customerType.value,
        _unitData: selectedUnit.value ?? null,
        _is_lid_exchange: false
      })
    }

    model.value = false
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fmtQty = v => {
    const n = parseFloat(v)
    return Number.isInteger(n) ? n : parseFloat(n.toFixed(2))
  }
</script>

<style scoped>
  .unit-card {
    transition: all 0.15s;
    cursor: pointer;
  }
  .selected-unit {
    border-color: rgb(var(--v-theme-primary)) !important;
    background: rgba(var(--v-theme-primary), 0.05) !important;
  }
  .gap-1 {
    gap: 4px;
  }
  .gap-2 {
    gap: 8px;
  }
  .gap-3 {
    gap: 12px;
  }
  .min-w-0 {
    min-width: 0;
  }
  .cursor-pointer {
    cursor: pointer;
  }
</style>
