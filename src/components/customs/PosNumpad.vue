<template>
  <div class="pos-pad">
    <div v-if="!hideModeSwitcher" class="mode-bar">
      <button
        v-for="m in modes"
        :key="m.key"
        :class="['mode-btn', { active: mode === m.key }]"
        @click="setMode(m.key)"
      >
        {{ m.label }}
      </button>
    </div>

    <div class="display-box">
      <div class="display-label">{{ modeConfig[mode].label }}</div>
      <div class="display-val">
        {{ displayValue }}
        <span class="cursor" />
      </div>
    </div>

    <div class="quick-row">
      <button
        v-for="q in modeConfig[mode].quicks"
        :key="q"
        class="quick-btn"
        @click="setRaw(String(q))"
      >
        {{ formatQuick(q) }}
      </button>
    </div>

    <div class="numpad-grid">
      <button
        v-for="d in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
        :key="d"
        class="key"
        @click="tap(d)"
      >
        {{ d }}
      </button>
      <button
        v-if="!modeConfig[mode].dec"
        class="key key-triple"
        @click="tap('000')"
      >
        000
      </button>
      <button v-else class="key key-dot" @click="tap('.')">.</button>
      <button class="key" @click="tap('0')">0</button>
      <button class="key key-del" @click="del">⌫</button>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useI18n } from 'vue-i18n'

  const props = defineProps({
    initialMode: { type: String, default: 'khr' },
    initialValue: { type: Number, default: 0 },
    hideModeSwitcher: { type: Boolean, default: false }
  })

  const emit = defineEmits(['change'])
  const { t } = useI18n()

  const modes = [
    { key: 'khr', label: 'KHR ៛' },
    // { key: 'usd', label: 'USD $' }
  ]

  const modeConfig = {
    khr: {
      label: t('payment.cash_received_khr'),
      prefix: '',
      suffix: ' ៛',
      dec: false,
      max: 12,
      quicks: [10000, 50000, 100000]
    },
    usd: {
      label: t('payment.cash_received_usd'),
      prefix: '$',
      suffix: '',
      dec: true,
      max: 10,
      quicks: [10, 20, 50]
    }
  }

  const mode = ref(props.initialMode)
  const raw = ref(props.initialValue > 0 ? String(props.initialValue) : '')

  const numericValue = computed(() => {
    if (!raw.value) return 0
    return modeConfig[mode.value].dec
      ? parseFloat(raw.value)
      : parseInt(raw.value)
  })

  const displayValue = computed(() => {
    const cfg = modeConfig[mode.value]
    if (cfg.dec) return cfg.prefix + (raw.value || '0')
    return (
      cfg.prefix +
      (numericValue.value || 0).toLocaleString('en-US') +
      cfg.suffix
    )
  })

  const formatQuick = q => {
    const cfg = modeConfig[mode.value]
    return cfg.dec
      ? cfg.prefix + q.toFixed(2)
      : cfg.prefix + q.toLocaleString('en-US') + cfg.suffix
  }

  const fire = () =>
    emit('change', { value: numericValue.value, mode: mode.value })

  const setMode = m => {
    mode.value = m
    raw.value = ''
    fire()
  }

  const setRaw = val => {
    raw.value = val
    fire()
  }

  const tap = digit => {
    const cfg = modeConfig[mode.value]
    if (digit === '.') {
      if (!cfg.dec || raw.value.includes('.')) return
      raw.value = (raw.value || '0') + '.'
    } else if (digit === '000') {
      if (!raw.value || raw.value === '0') return
      raw.value += '000'
    } else {
      raw.value = raw.value === '0' ? digit : raw.value + digit
    }
    if (raw.value.replace('.', '').length > cfg.max) {
      raw.value = raw.value.slice(0, -digit.length)
      return
    }
    fire()
  }

  const del = () => {
    raw.value = raw.value.slice(0, -1)
    fire()
  }
  const clear = () => {
    raw.value = ''
    fire()
  }

  defineExpose({ clear, setRaw, setMode, numericValue, mode })
</script>

<style scoped>
  .pos-pad {
    background: #ffffff; /* White background */
    border-radius: 14px;
    padding: 12px;
    width: 100%;
    box-sizing: border-box;
  }

  .mode-bar {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-bottom: 10px;
    background: #f1f3f4;
    padding: 4px;
    border-radius: 10px;
  }
  .mode-btn {
    padding: 7px 4px;
    border: none;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    background: transparent;
    color: #5f6368;
    transition: all 0.2s;
  }
  .mode-btn.active {
    background: #ffffff;
    color: #1867c0; /* Primary blue */
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .display-box {
    background: #f8f9fa; /* Light gray box */
    border: 1px solid #e8eaed;
    border-radius: 10px;
    padding: 9px 12px;
    margin-bottom: 9px;
  }
  .display-label {
    font-size: 11px;
    color: #80868b;
    margin-bottom: 1px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .display-val {
    font-size: 24px;
    font-weight: 700;
    color: #202124; /* Dark text */
    letter-spacing: 1px;
  }
  .cursor {
    display: inline-block;
    width: 2px;
    height: 22px;
    background: #1867c0;
    vertical-align: middle;
    animation: blink 1s step-end infinite;
  }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

  .quick-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 5px;
    margin-bottom: 7px;
  }
  .quick-btn {
    padding: 5px 2px;
    border: 1px solid #e3f2fd;
    border-radius: 7px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    background: #e3f2fd; /* Tonal primary */
    color: #1565c0;
  }
  .quick-btn:active {
    background: #bbdefb;
  }

  .numpad-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px;
  }
  .key {
    height: 48px;
    border: 1px solid #f1f3f4;
    border-radius: 9px;
    font-size: 19px;
    font-weight: 600;
    cursor: pointer;
    background: #ffffff;
    color: #202124;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    transition: transform 0.07s, background 0.07s;
  }
  .key:active {
    transform: scale(0.95);
    background: #f8f9fa;
  }
  .key-del {
    background: #fff5f5;
    color: #d32f2f;
    border-color: #ffebee;
  }
  .key-dot {
    background: #f1f8e9;
    color: #2e7d32;
    border-color: #e8f5e9;
  }
  .key-triple {
    background: #e3f2fd;
    color: #1565c0;
    border-color: #e3f2fd;
    font-size: 13px;
  }
</style>