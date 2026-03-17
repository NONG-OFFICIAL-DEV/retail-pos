<template>
  <div class="category-bar px-2">
    <v-slide-group
      v-model="internalValue"
      mandatory
      show-arrows
      class="category-slide-group py-1"
    >
      <!-- Arrow overrides -->
      <template #prev>
        <v-btn
          icon
          variant="flat"
          size="x-small"
          color="white"
          class="arrow-btn border"
          elevation="2"
        >
          <v-icon icon="mdi-chevron-left" size="16" />
        </v-btn>
      </template>
      <template #next>
        <v-btn
          icon
          variant="flat"
          size="x-small"
          color="white"
          class="arrow-btn border"
          elevation="2"
        >
          <v-icon icon="mdi-chevron-right" size="16" />
        </v-btn>
      </template>

      <!-- All products -->
      <v-slide-group-item value="all" v-slot="{ isSelected, toggle }">
        <v-chip
          class="cat-chip ma-1"
          :class="{ 'cat-chip--active': isSelected }"
          :color="isSelected ? 'primary' : undefined"
          :variant="isSelected ? 'flat' : 'outlined'"
          :elevation="isSelected ? 2 : 0"
          size="default"
          rounded="pill"
          @click="toggle"
        >
          <template #prepend>
            <v-icon
              :icon="isSelected ? 'mdi-view-grid' : 'mdi-view-grid-outline'"
              size="15"
              class="mr-1"
            />
          </template>
          {{ t('product.all_product') }}
        </v-chip>
      </v-slide-group-item>

      <!-- Category items -->
      <v-slide-group-item
        v-for="cat in categories"
        :key="cat.id"
        :value="cat.id"
        v-slot="{ isSelected, toggle }"
      >
        <v-chip
          class="cat-chip ma-1"
          :class="{ 'cat-chip--active': isSelected }"
          :color="isSelected ? 'primary' : undefined"
          :variant="isSelected ? 'flat' : 'outlined'"
          :elevation="isSelected ? 2 : 0"
          size="default"
          rounded="pill"
          @click="toggle"
        >
          <template v-if="cat.icon" #prepend>
            <v-icon :icon="cat.icon" size="15" class="mr-1" />
          </template>
          {{ cat.name }}
        </v-chip>
      </v-slide-group-item>
    </v-slide-group>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  const props = defineProps({
    modelValue: { type: [String, Number], default: 'all' },
    categories: { type: Array, default: () => [] }
  })

  const emit = defineEmits(['update:modelValue'])

  const internalValue = computed({
    get: () => props.modelValue,
    set: val => val !== undefined && emit('update:modelValue', val)
  })
</script>

<style scoped>
  /* ── Sticky bar ── */
  .category-bar {
    position: sticky;
    top: -16px;
    z-index: 5;
    margin: -16px -16px 0 -16px;
    background: rgba(248, 250, 252, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-bottom: 1px solid #e2e8f0;
  }

  /* ── Remove default slide-group padding ── */
  :deep(.v-slide-group__content) {
    padding: 2px 0;
  }

  /* ── Arrow buttons ── */
  .arrow-btn {
    border-radius: 50% !important;
  }
  :deep(.v-slide-group__prev),
  :deep(.v-slide-group__next) {
    min-width: 32px !important;
    align-items: center;
    justify-content: center;
  }

  /* ── Chip base ── */
  .cat-chip {
    font-weight: 600 !important;
    font-size: 13px !important;
    letter-spacing: 0 !important;
    transition: all 0.18s ease !important;
    border-color: #e2e8f0 !important;
    color: #64748b !important;
  }
  .cat-chip:hover:not(.cat-chip--active) {
    border-color: rgb(var(--v-theme-primary)) !important;
    color: rgb(var(--v-theme-primary)) !important;
    transform: translateY(-1px);
  }

  /* ── Active chip ── */
  .cat-chip--active {
    color: white !important;
    box-shadow: 0 3px 10px rgba(var(--v-theme-primary), 0.35) !important;
  }

</style>
