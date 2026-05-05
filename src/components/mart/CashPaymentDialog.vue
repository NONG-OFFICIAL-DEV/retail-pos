<template>
  <v-dialog v-model="model" :max-width="680" persistent>
    <v-card rounded="xl" class="dialog-card">
      <!-- ── Left panel: order summary + change ── -->
      <div class="left-panel">
        <div class="panel-title">{{ t('orders.cash_payment') }}</div>
        <div class="panel-sub">{{ t('orders.enter_amount_received') }}</div>

        <div class="divider" />

        <!-- Total -->
        <div class="info-block">
          <span class="info-label">{{ t('common.total') }}</span>
          <span class="info-amount total-amount">{{ fmtKhr(total) }}</span>
        </div>

        <!-- Received -->
        <div class="info-block">
          <span class="info-label">{{ t('orders.cash_received') }}</span>
          <span
            class="info-amount"
          
          >
            {{ receivedInKhr > 0 ? fmtDisplay(cashReceived) : '—' }}
          </span>
        </div>

        <div class="divider" />

        <!-- Change -->
        <div
          class="change-block"
          :class="isEnough ? 'change-ok' : 'change-short'"
        >
          <span class="change-label">{{ t('orders.change') }}</span>
          <span class="change-value">
            {{
              cashReceived > 0
                ? isEnough
                  ? fmtDisplay(changeInMode)
                  : t('payment.insufficient')
                : '—'
            }}
          </span>
          <span
            v-if="isEnough && changeInMode > 0 && usdRate > 0"
            class="cross-hint"
          >
            ≈ {{ crossAmount }}
          </span>
        </div>

        <div class="spacer" />

        <!-- Action buttons -->
        <div class="action-row">
          <v-btn
            variant="outlined"
            color="default"
            class="btn-cancel"
            @click="cancel"
          >
            {{ t('btn.cancel') }}
          </v-btn>

          <v-btn
            :disabled="!isEnough || loading"
            :loading="loading"
            color="primary"
            class="btn-confirm"
            @click="confirm"
          >
            {{ t('btn.confirm') }}
          </v-btn>
        </div>
      </div>

      <!-- ── Right panel: numpad ── -->
      <div class="right-panel">
        <PosNumpad
          ref="numpadRef"
          :initial-mode="numpadMode"
          :initial-value="total"
          @change="onNumpadChange"
        />
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
  import { ref, computed, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { formatKHR ,formatCurrency} from '@nong-official-dev/core'
  import PosNumpad from '@/components/customs/PosNumpad.vue'

  const { t } = useI18n()

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    total: { type: Number, default: 0 },
    loading: { type: Boolean, default: false },
    usdRate: { type: Number, default: 0 } // KHR per 1 USD, e.g. 4100
  })

  const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

  const model = computed({
    get: () => props.modelValue,
    set: val => emit('update:modelValue', val)
  })

  const numpadRef = ref(null)
  const numpadMode = ref('khr')
  const cashReceived = ref(0)

  // Reset on open/close
  watch(
    () => props.modelValue,
    open => {
      if (open) {
        numpadMode.value = 'khr'
        cashReceived.value = props.total
      } else {
        numpadRef.value?.clear()
        cashReceived.value = props.total
      }
    }
  )

  // ── Change math ──────────────────────────────────────────────────────────────
  const receivedInKhr = computed(() => {
    if (numpadMode.value === 'usd' && props.usdRate > 0)
      return cashReceived.value * props.usdRate
    return cashReceived.value
  })

  // Change expressed back in the currency the cashier entered
  const changeInMode = computed(() => {
    if (numpadMode.value === 'usd' && props.usdRate > 0)
      return (receivedInKhr.value - props.total) / props.usdRate
    return receivedInKhr.value - props.total
  })

  const isEnough = computed(() => receivedInKhr.value >= props.total)

  // Cross-rate hint (opposite currency)
  const crossAmount = computed(() => {
    if (!props.usdRate || changeInMode.value <= 0) return ''
    if (numpadMode.value === 'usd')
      return fmtKhr(changeInMode.value * props.usdRate)
    return formatCurrency(changeInMode.value / props.usdRate)
  })

  // ── Format helpers ────────────────────────────────────────────────────────────
  const fmtKhr = v => formatKHR(v ?? 0)

  const fmtDisplay = v => {
    if (numpadMode.value === 'usd') return formatCurrency(v)
    return fmtKhr(v)
  }

  // ── Numpad handler ────────────────────────────────────────────────────────────
  const onNumpadChange = ({ value, mode }) => {
    cashReceived.value = value
    numpadMode.value = mode
  }

  // ── Actions ───────────────────────────────────────────────────────────────────
  const confirm = () => {
    if (!isEnough.value) return
    emit('confirm', {
      cash_received: cashReceived.value,
      cash_mode: numpadMode.value,
      cash_received_khr: receivedInKhr.value,
      change: changeInMode.value,
      change_khr: receivedInKhr.value - props.total
    })
  }

  const cancel = () => {
    emit('cancel')
    model.value = false
  }
</script>

<style scoped>
  .dialog-card {
    display: flex !important;
    flex-direction: row !important;
    overflow: hidden;
    min-height: 420px;
  }

  /* ── Left panel ── */
  .left-panel {
    flex: 1 1 52%;
    display: flex;
    flex-direction: column;
    padding: 28px 24px 24px;
    background: var(--v-surface-variant, #f8f8fb);
    border-right: 1px solid rgba(0, 0, 0, 0.07);
  }

  .panel-title {
    font-size: 18px;
    font-weight: 700;
    color: rgba(0, 0, 0, 0.87);
    margin-bottom: 2px;
  }
  .panel-sub {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.45);
    margin-bottom: 0;
  }

  .divider {
    height: 1px;
    background: rgba(0, 0, 0, 0.08);
    margin: 16px 0;
  }

  .info-block {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 10px;
  }
  .info-label {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.5);
  }
  .info-amount {
    font-size: 17px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.82);
  }
  .total-amount {
    font-size: 22px;
    font-weight: 700;
  }

  .change-block {
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .change-ok {
    background: #eaf6ee;
  }
  .change-short {
    background: #fdecea;
  }
  .change-label {
    font-size: 12px;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.45);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .change-block.change-ok .change-value {
    font-size: 26px;
    font-weight: 700;
    color: #2e7d32;
  }
  .change-block.change-short .change-value {
    font-size: 20px;
    font-weight: 600;
    color: #c62828;
  }
  .cross-hint {
    font-size: 12px;
    color: rgba(46, 125, 50, 0.65);
  }

  .spacer {
    flex: 1;
  }

  .action-row {
    display: flex;
    gap: 10px;
  }
  .btn-cancel {
    flex: 0 0 38%;
  }
  .btn-confirm {
    flex: 1;
    font-weight: 600;
  }

  /* ── Right panel ── */
  .right-panel {
    flex: 0 0 48%;
    /* background: #1a1a2e; */
    border-radius: 0 12px 12px 0;
    padding: 16px;
    display: flex;
    align-items: center;
  }
  .right-panel > * {
    width: 100%;
  }
</style>
