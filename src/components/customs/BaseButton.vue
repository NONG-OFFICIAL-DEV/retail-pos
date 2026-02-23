<template>
  <v-btn
    :color="color"
    :variant="variant"
    @click="$emit('click')"
  >
    <v-icon v-if="icon" :icon="icon" class="mr-2" />
    <slot />
  </v-btn>
</template>

<script setup>
defineProps({
  color: {
    type: String,
    default: 'primary'
  },
  variant: {
    type: String,
    default: 'elevated' // can be flat, tonal, outlined
  },
  icon: {
    type: String,
    default: null
  }
})

defineEmits(['click'])
</script>
