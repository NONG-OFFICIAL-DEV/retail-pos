<template>
  <div class="category-container">
    <v-slide-group
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      mandatory
      show-arrows
      class="category-slider"
    >
      <v-slide-group-item value="all" v-slot="{ isSelected, toggle }">
        <v-btn
          :class="['cat-pill', { 'cat-pill--active': isSelected }]"
          :variant="isSelected ? 'elevated' : 'flat'"
          @click="toggle"
          rounded="xl"
          elevation="0"
        >
          <v-icon start icon="mdi-apps" size="small" v-if="isSelected" />
          {{ t('product.all_product') }}
        </v-btn>
      </v-slide-group-item>

      <v-slide-group-item
        v-for="cat in categories"
        :key="cat.id"
        :value="cat.id"
        v-slot="{ isSelected, toggle }"
      >
        <v-btn
          :class="['cat-pill', { 'cat-pill--active': isSelected }]"
          :variant="isSelected ? 'elevated' : 'flat'"
          @click="toggle"
          rounded="xl"
          elevation="0"
        >
          {{ cat.name }}
        </v-btn>
      </v-slide-group-item>
    </v-slide-group>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

defineProps({
  modelValue: { type: [String, Number], default: 'all' },
  categories: { type: Array, default: () => [] }
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.category-container {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}

.cat-pill {
  margin: 0 6px;
  text-transform: none !important;
  font-weight: 600 !important;
  letter-spacing: 0.3px;
  border: 1px solid #e2e8f0 !important;
  transition: all 0.2s ease;
  height: 40px !important;
}

.cat-pill--active {
  background-color: rgb(var(--v-theme-primary)) !important;
  color: white !important;
  border-color: transparent !important;
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.3) !important;
}

/* Remove default slide group padding */
:deep(.v-slide-group__content) {
  padding: 8px 12px;
}
</style>