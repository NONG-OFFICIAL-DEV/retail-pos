<template>
  <v-btn
    :color="active ? 'primary' : color"
    :variant="active ? 'elevated' : variant"
    class="text-none"
    :prepend-icon="icon"
    @click="$emit('click')"
  >
    Filter
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
      default: 'outlined'
    },
    icon: {
      type: String,
      default: 'mdi-filter-outline'
    },
    active: {
      type: Boolean,
      default: false
    }
  })

  defineEmits(['click'])
</script>
