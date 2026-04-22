<template>
  <!-- Unit selector (if product has units) -->
  <div class="d-flex align-center justify-space-between mb-2">
    <span class="text-caption font-weight-bold text-medium-emphasis">
      {{ t('unit.select_unit') }}
    </span>
    <v-btn
      variant="text"
      size="small"
      :append-icon="showUnits ? 'mdi-chevron-up' : 'mdi-chevron-down'"
      class="text-none"
      @click="showUnits = !showUnits"
    >
      {{
        selectedUnit
          ? selectedUnit.unit_label ?? selectedUnit.unit_name
          : t('unit.select_unit')
      }}
    </v-btn>
  </div>
  <v-divider class="my-3" />
  <template v-if="hasUnits && showUnits">
    <div class="d-flex flex-column gap-2 mb-4">
      <v-card
        v-for="unit in sortedUnits"
        :key="unit.id"
        flat
        border
        rounded="lg"
        class="pa-3 unit-card"
        :class="{
          'selected-unit': selectedUnit?.id === unit.id,
          'cursor-pointer': Number(unit.qty_per_base) === 1,
          'disabled-unit': Number(unit.qty_per_base) !== 1
        }"
        @click="unit.qty_per_base === 1 ? emit('selectUnit', unit) : null"
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
                maxForUnit(unit) <= 0 ? 'text-error' : 'text-medium-emphasis'
              "
            >
              {{ t('common.max') }}: {{ maxForUnit(unit) }}
              {{ unit.unit_label ?? unit.unit_name }}
              {{ t('common.available') }}
            </div>
          </div>
          <div class="d-flex align-center gap-2">
            <v-icon
              v-if="selectedUnit?.id === unit.id"
              icon="mdi-check-circle"
              color="primary"
              size="18"
            />
            <v-chip
               v-else-if="Number(unit.qty_per_base) !== 1"
              size="x-small"
              color="secondary"
              variant="tonal"
              rounded="lg"
            >
              {{ t('common.out_of_stock') }}
            </v-chip>
            <v-chip
              v-else-if="maxForUnit(unit) <= 0"
              size="x-small"
              color="error"
              variant="tonal"
              rounded="lg"
            >
              {{ t('common.out_of_stock') }}
            </v-chip>
          </div>
        </div>
      </v-card>
    </div>
  </template>

  <!-- Lid count -->
  <div class="text-caption font-weight-bold text-medium-emphasis mb-1">
    {{ t('lid_exchange.lid_count') }}
    <span class="text-caption font-weight-regular text-medium-emphasis ml-1">
      ({{ t('lid_exchange.lid_count_hint') }})
    </span>
  </div>
  <div class="d-flex align-center gap-3 mb-1">
    <v-btn
      icon="mdi-minus"
      variant="tonal"
      size="small"
      rounded="lg"
      :disabled="qty <= 1"
      @click="emit('update:qty', qty - 1)"
    />
    <v-text-field
      :model-value="qty"
      type="number"
      min="1"
      :max="lidMaxQty"
      variant="outlined"
      density="compact"
      rounded="lg"
      hide-details
      style="max-width: 80px"
      @update:modelValue="emit('update:qty', Number($event))"
    />
    <v-btn
      icon="mdi-plus"
      variant="tonal"
      size="small"
      rounded="lg"
      :disabled="qty >= lidMaxQty"
      @click="emit('update:qty', qty + 1)"
    />
    <div class="text-caption text-medium-emphasis ml-auto">
      {{ t('common.max') }}: {{ lidMaxQty }}
      {{ selectedUnit?.unit_label ?? selectedUnit?.unit_name ?? 'pcs' }}
    </div>
  </div>
  <div v-if="qty > lidMaxQty" class="text-caption text-error mt-1 mb-2">
    <v-icon icon="mdi-alert-circle-outline" size="13" class="mr-1" />
    {{ t('common.exceeds_stock') }}
  </div>

  <v-divider class="my-3" />

  <!-- Top-up per can -->
  <div class="text-caption font-weight-bold text-medium-emphasis mb-2">
    {{ t('lid_exchange.topup_per_can') }}
  </div>
  <div class="d-flex align-center gap-3 mb-3">
    <v-btn-toggle
      :model-value="topupPreset"
      mandatory
      density="compact"
      rounded="lg"
      variant="outlined"
      color="primary"
      @update:modelValue="emit('update:topupPreset', $event)"
    >
      <v-btn :value="500" class="text-none px-5">
        <span class="font-weight-black">500</span>
        <span class="text-caption ml-1 opacity-70">រ</span>
      </v-btn>
      <v-btn :value="1000" class="text-none px-5">
        <span class="font-weight-black">1000</span>
        <span class="text-caption ml-1 opacity-70">រ</span>
      </v-btn>
    </v-btn-toggle>

    <v-text-field
      :model-value="customTopup"
      :placeholder="t('lid_exchange.custom_topup')"
      prefix="៛"
      type="number"
      min="0"
      variant="outlined"
      density="compact"
      rounded="lg"
      hide-details
      clearable
      class="flex-grow-1"
      @update:modelValue="onCustomTopup"
    />
  </div>

  <!-- Summary -->
  <v-card flat rounded="lg" color="primary" class="pa-3">
    <div class="d-flex align-center justify-space-between">
      <div class="text-caption text-white opacity-80">
        {{ qty }} {{ t('lid_exchange.lids') }} × {{ formatKHR(effectiveTopup) }}
      </div>
      <div class="text-body-1 font-weight-black text-white">
        {{ formatKHR(lidTotalPrice) }}
      </div>
    </div>
  </v-card>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { formatKHR } from '@nong-official-dev/core'

  const { t } = useI18n()

  const props = defineProps({
    qty: { type: Number, required: true },
    topupPreset: { type: Number, default: 500 },
    customTopup: { type: Number, default: null },
    selectedUnit: { type: Object, default: null },
    sortedUnits: { type: Array, default: () => [] },
    hasUnits: { type: Boolean, default: false },
    stockQty: { type: Number, default: 0 }
  })
  const showUnits = ref(false)

  const emit = defineEmits([
    'update:qty',
    'update:topupPreset',
    'update:customTopup',
    'selectUnit'
  ])

  const maxForUnit = unit =>
    Math.floor(props.stockQty / parseFloat(unit.qty_per_base ?? 1))

  const lidMaxQty = computed(() => Math.floor(props.stockQty)) // always base qty since qty_per_base = 1

  const effectiveTopup = computed(() =>
    props.customTopup > 0
      ? Number(props.customTopup)
      : Number(props.topupPreset ?? 500)
  )
  const lidTotalPrice = computed(() => effectiveTopup.value * props.qty)

  const onCustomTopup = val => {
    const n = Number(val)
    emit('update:customTopup', n > 0 ? n : null)
    if (n > 0) emit('update:topupPreset', null)
    else emit('update:topupPreset', 500)
  }
</script>

<style scoped>
  .disabled-unit {
    opacity: 0.45;
    cursor: not-allowed !important;
  }
  .unit-card {
    transition: all 0.15s;
    cursor: pointer;
  }
  .selected-unit {
    border-color: rgb(var(--v-theme-primary)) !important;
    background: rgba(var(--v-theme-primary), 0.05) !important;
  }
  .gap-2 {
    gap: 8px;
  }
  .gap-3 {
    gap: 12px;
  }
  .cursor-pointer {
    cursor: pointer;
  }
</style>
