<template>
  <div :class="['qty-stepper', { 'is-small': small }]">
    <v-btn
      icon="mdi-minus"
      variant="flat"
      :size="small ? 24 : 32"
      :class="['stepper-btn', { disabled: modelValue <= min }]"
      @click="updateQty(-1)"
    />

    <span class="qty-display">{{ modelValue }}</span>

    <v-btn
      icon="mdi-plus"
      variant="flat"
      color="primary"
      :size="small ? 24 : 32"
      :class="['elevation-1', { 'is-disabled': strict && modelValue >= max }]"
      @click="updateQty(1)"
    />
  </div>
</template>

<script setup>
  const props = defineProps({
    modelValue: {
      type: Number,
      required: true
    },
    min: {
      type: Number,
      default: 1
    },
    max: {
      type: Number,
      default: 5
    },
    small: {
      type: Boolean,
      default: false
    },
    strict: { type: Boolean, default: false }
  })

  const emit = defineEmits(['update:modelValue', 'change'])

  const updateQty = delta => {
    const newValue = props.modelValue + delta

    // --- INCREASE LOGIC ---
    if (delta > 0) {
      if (newValue > props.max) {
        // If strict, we do nothing. If not strict, we emit change so parent can alert.
        if (!props.strict) emit('change', delta)
        return
      }
    }

    // --- DECREASE LOGIC ---
    if (delta < 0 && newValue < props.min) {
      return // Usually we don't alert for "less than min", just stop.
    }

    // Standard Update
    emit('update:modelValue', newValue)
    emit('change', delta)
  }
</script>

<style scoped>
  .qty-stepper {
    display: flex;
    align-items: center;
    background: #f5f5f5; /* Light grey pill background */
    padding: 4px;
    border-radius: 50px;
    width: fit-content;
    border: 1px solid rgba(0, 0, 0, 0.03);
  }

  .qty-display {
    min-width: 32px;
    text-align: center;
    font-weight: 800;
    font-size: 0.95rem;
    color: #2c3e50;
    user-select: none;
  }

  .stepper-btn {
    background: white !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05) !important;
    transition: transform 0.1s active;
  }

  .stepper-btn:active {
    transform: scale(0.9);
  }

  /* Small Variant Styles */
  .is-small {
    padding: 2px;
  }
  .is-small .qty-display {
    min-width: 24px;
    font-size: 0.8rem;
  }

  .disabled {
    opacity: 0.5;
    pointer-events: none;
  }
  .v-btn--disabled {
    opacity: 0.4;
  }
  .is-disabled {
    opacity: 0.4;
    pointer-events: none;
  }
</style>
