<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/productStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { usePosStore } from '@/stores/posStore'
import { useLoadingStore } from '@/stores/loadingStore'

const productStore  = useProductStore()
const categoryStore = useCategoryStore()
const posStore      = usePosStore()
const loadingStore  = useLoadingStore()

const props = defineProps({
  search: { type: String, default: '' }
})

/* ── STATE ── */
const selectedCategory = ref('all')

/* ── DATA ── */
const categories = computed(() => categoryStore.categories?.data || [])
const isLoading  = computed(() => loadingStore.isLoading)

const products = computed(() => {
  let list = productStore.products?.data || []

  if (selectedCategory.value !== 'all') {
    list = list.filter(p => p.category_id === selectedCategory.value)
  }

  if (props.search) {
    const q = props.search.toLowerCase()
    list = list.filter(p => p.name.toLowerCase().includes(q))
  }

  return list
})

const isEmpty = computed(() => !products.value.length && !isLoading.value)

/* ── ACTIONS ── */
function addToCart(product) {
  posStore.addToCart({
    id:        product.id,
    name:      product.name,
    price:     product.price,
    image_url: product.image_url,
    qty:       1
  })
}

function getPrice(product) {
  if (product.has_variants && product.variants?.length) {
    return product.variants[0].price
  }
  return product.price
}

/* ── INIT ── */
onMounted(async () => {
  await Promise.all([
    productStore.fetchProducts({}, { loading: 'skeleton' }),
    categoryStore.fetchCategories({}, { loading: 'skeleton' })
  ])
})
</script>

<template>
  <div class="pos-products-view">
    <div class="sticky-category-wrapper bg-grey-lighten-5 px-3">
      <v-slide-group
        v-model="selectedCategory"
        mandatory
        show-arrows
        class="category-slider"
      >
        <v-slide-group-item value="all" v-slot="{ isSelected, toggle }">
          <v-btn
            :color="isSelected ? 'primary' : 'white'"
            :variant="isSelected ? 'elevated' : 'flat'"
            class="ma-2 text-none font-weight-bold px-6 border"
            rounded="lg"
            @click="toggle"
          >
            All Products
          </v-btn>
        </v-slide-group-item>

        <v-slide-group-item
          v-for="cat in categories"
          :key="cat.id"
          :value="cat.id"
          v-slot="{ isSelected, toggle }"
        >
          <v-btn
            :color="isSelected ? 'primary' : 'white'"
            :variant="isSelected ? 'elevated' : 'flat'"
            class="ma-2 text-none font-weight-bold px-6 border"
            rounded="lg"
            @click="toggle"
          >
            {{ cat.name }}
          </v-btn>
        </v-slide-group-item>
      </v-slide-group>
    </div>

    <v-row class="mt-2">
      <template v-if="isLoading">
        <v-col v-for="n in 12" :key="n" cols="12" sm="6" md="4" lg="3">
          <v-skeleton-loader
            type="image, list-item-two-line"
            rounded="xl"
            class="border"
          />
        </v-col>
      </template>

      <v-col v-else-if="isEmpty" cols="12" class="text-center py-12">
        <v-icon icon="mdi-magnify-close" size="64" color="grey-lighten-1" />
        <div class="text-h6 text-grey mt-4">No products found</div>
        <p class="text-caption text-grey">Try adjusting your search or category</p>
      </v-col>

      <v-col
        v-for="product in products"
        :key="product.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card
          flat
          class="product-item-card rounded-xl border overflow-hidden"
          @click="addToCart(product)"
        >
          <div class="position-relative">
            <v-img
              :src="product.image_url || 'https://placehold.co/400x300?text=No+Image'"
              height="150"
              cover
              class="bg-grey-lighten-4"
            />
            
            <v-chip
              v-if="product.has_variants"
              size="x-small"
              color="primary"
              variant="flat"
              class="variant-chip font-weight-bold"
            >
              OPTIONS
            </v-chip>
          </div>

          <v-card-text class="pa-3">
            <div class="text-subtitle-2 font-weight-bold text-truncate text-slate-900">
              {{ product.name }}
            </div>
            
            <div class="d-flex align-center justify-space-between mt-1">
              <div class="d-flex flex-column">
                <span class="text-xxs text-grey-darken-1 font-weight-bold uppercase">Price</span>
                <span class="text-subtitle-1 font-weight-black text-primary">
                  ${{ getPrice(product) }}
                </span>
              </div>
              
              <v-btn
                icon="mdi-plus"
                size="small"
                color="primary"
                variant="elevated"
                elevation="2"
                class="rounded-lg"
              />
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.pos-products-view {
  position: relative;
}

.sticky-category-wrapper {
  position: sticky;
  top: -16px;
  z-index: 5;
  margin: -16px -16px 0 -16px;
  background: rgba(248, 250, 252, 0.9) !important;
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #e2e8f0;
}

.product-item-card {
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  background: white !important;
}

.product-item-card:hover {
  transform: translateY(-4px);
  border-color: rgb(var(--v-theme-primary)) !important;
  box-shadow: 0 10px 20px -10px rgba(0, 0, 0, 0.1) !important;
}

.variant-chip {
  position: absolute;
  top: 8px;
  right: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.text-slate-900 { color: #0f172a; }
.text-xxs { font-size: 0.65rem; }
.uppercase { text-transform: uppercase; }

/* Scrollbar styling for the category slider if arrows are hidden */
:deep(.v-slide-group__content) {
  padding: 4px 0;
}
</style>