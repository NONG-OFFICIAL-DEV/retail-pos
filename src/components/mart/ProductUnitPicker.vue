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
          <!-- Stock display with color indicator -->
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
        <!-- Out of stock -->
        <v-alert
          v-if="isOutOfStock"
          type="error"
          variant="tonal"
          density="compact"
          rounded="lg"
          class="mb-4"
          icon="mdi-alert-circle-outline"
        >
          <strong>Out of stock.</strong>
          Cannot add to cart.
        </v-alert>

        <!-- Low stock warning -->
        <v-alert
          v-else-if="isLowStock"
          type="warning"
          variant="tonal"
          density="compact"
          rounded="lg"
          class="mb-4"
          icon="mdi-alert-outline"
        >
          Only
          <strong>
            {{ fmtQty(product.stock_quantity) }} {{ product.unit ?? 'pcs' }}
          </strong>
          left in stock.
        </v-alert>

        <!-- Customer type toggle -->
        <div class="d-flex align-center justify-space-between mb-4">
          <span class="text-caption font-weight-bold text-medium-emphasis">
            CUSTOMER TYPE
          </span>
          <v-btn-toggle
            v-model="customerType"
            mandatory
            density="compact"
            rounded="lg"
            variant="outlined"
          >
            <v-btn value="retail" size="small" class="text-none px-4">
              Retail
            </v-btn>
            <v-btn value="wholesale" size="small" class="text-none px-4">
              Wholesale
            </v-btn>
          </v-btn-toggle>
        </div>

        <!-- No units -->
        <template v-if="!hasUnits">
          <div class="text-caption font-weight-bold text-medium-emphasis mb-2">
            QUANTITY
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
              {{ fmt(unitPrice * qty) }}
            </div>
          </div>
          <!-- Exceeds stock warning -->
          <div v-if="qty > maxQtyNoUnit" class="text-caption text-error mt-2">
            <v-icon icon="mdi-alert-circle-outline" size="13" class="mr-1" />
            Exceeds available stock ({{ fmtQty(product.stock_quantity) }})
          </div>
        </template>

        <!-- Has units -->
        <template v-else>
          <div class="text-caption font-weight-bold text-medium-emphasis mb-2">
            SELECT UNIT
          </div>
          <div class="d-flex flex-column gap-2 mb-4">
            <v-card
              v-for="unit in product.active_units"
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
                    {{ unit.unit_label || unit.unit_name }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ unit.qty_per_base }} base unit{{
                      unit.qty_per_base > 1 ? 's' : ''
                    }}
                    <span v-if="unit.barcode" class="ml-2">
                      · {{ unit.barcode }}
                    </span>
                  </div>
                  <!-- Max available in this unit -->
                  <div
                    class="text-caption"
                    :class="
                      maxForUnit(unit) <= 0
                        ? 'text-error'
                        : 'text-medium-emphasis'
                    "
                  >
                    Max: {{ maxForUnit(unit) }}
                    {{ unit.unit_label ?? unit.unit_name }} available
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-body-1 font-weight-black text-primary">
                    {{ fmt(unitPriceFor(unit)) }}
                  </div>
                  <div
                    v-if="customerType === 'wholesale' && unit.wholesale_price"
                    class="text-caption text-success"
                  >
                    Wholesale
                  </div>
                  <!-- Out of stock badge on unit -->
                  <v-chip
                    v-if="maxForUnit(unit) <= 0"
                    size="x-small"
                    color="error"
                    variant="tonal"
                    rounded="lg"
                    class="mt-1"
                  >
                    Out of stock
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
              QUANTITY
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
                {{ fmt(unitPriceFor(selectedUnit) * qty) }}
              </div>
            </div>

            <!-- Exceeds stock warning -->
            <div
              v-if="qty > maxForUnit(selectedUnit)"
              class="text-caption text-error mt-2"
            >
              <v-icon icon="mdi-alert-circle-outline" size="13" class="mr-1" />
              Only {{ maxForUnit(selectedUnit) }}
              {{ selectedUnit.unit_label ?? selectedUnit.unit_name }} available
            </div>
          </div>
        </template>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4 gap-3">
        <v-btn variant="tonal" rounded="lg" @click="model = false">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          rounded="lg"
          class="flex-grow-1"
          prepend-icon="mdi-cart-plus"
          :disabled="!canAddToCart"
          @click="addToCart"
        >
          Add to Cart
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
  import { ref, computed, watch } from 'vue'

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    product: { type: Object, default: null },
    customerType: { type: String, default: 'retail' }
  })
  const emit = defineEmits(['update:modelValue', 'add'])

  const model = computed({
    get: () => props.modelValue,
    set: v => emit('update:modelValue', v)
  })
  const qty = ref(1)
  const selectedUnit = ref(null)
  const customerType = ref(props.customerType)

  const hasUnits = computed(() => props.product?.active_units?.length > 0)

  // ── Stock status ──────────────────────────────────────────────────────────
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
    if (isOutOfStock.value) return 'Out of stock'
    if (isLowStock.value)
      return `Low stock · ${fmtQty(stockQty.value)} ${props.product?.unit ?? 'pcs'} left`
    return `In stock · ${fmtQty(stockQty.value)} ${props.product?.unit ?? 'pcs'}`
  })

  // Max qty available when no units
  const maxQtyNoUnit = computed(() => Math.floor(stockQty.value))

  // Max qty available for a specific unit
  const maxForUnit = unit =>
    Math.floor(stockQty.value / parseFloat(unit.qty_per_base ?? 1))

  // Can add to cart
  const canAddToCart = computed(() => {
    if (isOutOfStock.value) return false
    if (hasUnits.value) {
      if (!selectedUnit.value) return false
      return qty.value <= maxForUnit(selectedUnit.value) && qty.value > 0
    }
    return qty.value <= maxQtyNoUnit.value && qty.value > 0
  })

  // ── Reset on product change ───────────────────────────────────────────────
  watch(
    () => props.product,
    () => {
      qty.value = 1
      selectedUnit.value = null
      if (hasUnits.value) {
        selectedUnit.value =
          props.product.active_units.find(u => u.is_base_unit) ??
          props.product.active_units[0]
      }
    },
    { immediate: true }
  )

  const selectUnit = unit => {
    selectedUnit.value = unit
    qty.value = 1
  }

  const unitPriceFor = unit => {
    if (customerType.value === 'wholesale' && unit.wholesale_price)
      return parseFloat(unit.wholesale_price)
    return parseFloat(unit.retail_price)
  }

  const unitPrice = computed(() =>
    parseFloat(props.product?.selling_price ?? props.product?.base_price ?? 0)
  )

  const addToCart = () => {
    if (!props.product || !canAddToCart.value) return
    emit('add', {
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
      customer_type: customerType.value
    })
    model.value = false
  }

  const fmtQty = v => {
    const n = parseFloat(v)
    return Number.isInteger(n) ? n : parseFloat(n.toFixed(2))
  }
  const fmt = v =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(v ?? 0)
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
