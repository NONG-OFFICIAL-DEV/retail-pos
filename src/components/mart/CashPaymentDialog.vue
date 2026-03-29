<template>
  <v-dialog v-model="model" max-width="395" persistent>
    <v-card rounded="xl" class="pa-5">
      <div class="text-h6 font-weight-black mb-1">
        {{ t('orders.cash_payment') }}
      </div>
      <div class="text-caption text-medium-emphasis mb-4">
        {{ t('orders.enter_amount_received') }}
      </div>

      <div class="text-center mb-4">
        <div class="text-caption text-medium-emphasis">
          {{ t('common.total') }}
        </div>
        <div class="text-h4 font-weight-black text-primary">
          {{ fmt(total) }}
        </div>
      </div>

      <v-text-field
        v-model.number="cashReceived"
        :label="t('orders.cash_received')"
        variant="outlined"
        type="number"
        min="0"
        prepend-inner-icon="mdi-cash"
        color="primary"
        autofocus
        hide-details
        class="mb-3"
        @keyup.enter="confirm"
      />

      <!-- Quick amount buttons -->
      <div class="d-flex ga-2 mb-4">
        <v-btn
          v-for="amount in quickAmounts"
          :key="amount"
          size="small"
          variant="tonal"
          color="primary"
          class="flex-grow-1"
          @click="cashReceived = amount"
        >
          {{ fmt(amount) }}
        </v-btn>
      </div>

      <!-- Change -->
      <div
        class="pa-3 rounded-lg mb-4"
        :class="change >= 0 ? 'bg-green-lighten-5' : 'bg-red-lighten-5'"
      >
        <div class="d-flex justify-space-between align-center">
          <span class="text-body-2 font-weight-bold">
            {{ t('orders.change') }}
          </span>
          <span
            class="text-h6 font-weight-black"
            :class="change >= 0 ? 'text-success' : 'text-error'"
          >
            {{ fmt(Math.max(change, 0)) }}
          </span>
        </div>
      </div>

      <div class="d-flex ga-2">
        <v-btn variant="outlined" class="flex-grow-1" @click="cancel">
          {{ t('btn.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          class="flex-grow-1"
          :disabled="cashReceived < total"
          :loading="loading"
          @click="confirm"
        >
          {{ t('btn.confirm') }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
  import { ref, computed, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { formatKHR } from '@nong-official-dev/core'

  const { t } = useI18n()

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    total: { type: Number, default: 0 },
    loading: { type: Boolean, default: false }
  })

  const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

  const model = computed({
    get: () => props.modelValue,
    set: val => emit('update:modelValue', val)
  })

  const cashReceived = ref(0)

  // Pre-fill exact amount whenever dialog opens
  watch(
    () => props.modelValue,
    open => {
      if (open) cashReceived.value = props.total
    }
  )

  const fmt = v => formatKHR(v ?? 0)

  const change = computed(() => cashReceived.value - props.total)

  const quickAmounts = computed(() => {
    const t = props.total
    const steps = [10000, 20000, 50000, 100000]
    return steps
      .map(step => Math.ceil(t / step) * step)
      .filter((v, i, arr) => v >= t && arr.indexOf(v) === i)
      .slice(0, 4)
  })

  const confirm = () => {
    if (cashReceived.value < props.total) return
    emit('confirm', {
      cash_received: cashReceived.value,
      change: change.value
    })
  }

  const cancel = () => {
    emit('cancel')
    model.value = false
  }
</script>
