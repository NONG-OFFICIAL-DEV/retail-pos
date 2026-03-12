<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useProductStore } from '@/stores/productStore'
  import { useCategoryStore } from '@/stores/categoryStore'
  import { useMartStore } from '@/stores/martStore'
  import { useLoadingStore } from '@/stores/loadingStore'
  import ProductUnitPicker from '@/components/mart/ProductUnitPicker.vue'

  const productStore = useProductStore()
  const categoryStore = useCategoryStore()
  const martStore = useMartStore()
  const loadingStore = useLoadingStore()
  const pickerDialog = ref(false)
  const pickerProduct = ref(null)
  const customerType = ref('retail') // toggle globally or per-session

  const openPicker = product => {
    // If product has no units → add directly, skip dialog
    if (!product.active_units?.length) {
      martStore.addToCart({ ...product, quantity: 1 })
      return
    }
    pickerProduct.value = product
    pickerDialog.value = true
  }
  const props = defineProps({
    search: { type: String, default: '' }
  })

  /* ── STATE ── */
  const selectedCategory = ref('all')

  /* ── DATA ── */
  const categories = computed(() => categoryStore.categories?.data || [])
  const isLoading = computed(() => loadingStore.isLoading)

  const minPrice = product =>
    Math.min(...product.active_units.map(u => parseFloat(u.retail_price)))

  const fmt = v =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(v ?? 0)

  const products = computed(() => {
    let list = productStore.products || []

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
    martStore.addToCart({
      id: product.id,
      name: product.name,
      price: product.base_price,
      image_url: product.image_url,
      qty: 1
    })
  }

  const handleAddToCart = payload => {
    martStore.addToCart({
      id: payload.product_id,
      product_unit_id: payload.product_unit_id,
      name: `${payload.name} (${payload.unit_name})`,
      price: payload.price,
      qty_per_base: payload.qty_per_base,
      image_url: payload.image_url,
      qty: payload.quantity
    })
  }

  function getPrice(product) {
    if (product.has_variants && product.variants?.length) {
      return product.variants[0].price
    }
    return product.base_price
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

    <v-row class="mt-2" dense>
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
        <p class="text-caption text-grey">
          Try adjusting your search or category
        </p>
      </v-col>
      <v-col
        v-for="product in products"
        :key="product.id"
        cols="12"
        sm="2"
        md="2"
        lg="2"
      >
        <v-card class="product-item-card" @click="openPicker(product)">
          <v-img :src="product.image_url" height="130" cover />
          <v-card-text class="pa-3">
            <div class="text-body-2 font-weight-bold">{{ product.name }}</div>

            <!-- Show price range if has units -->
            <div
              v-if="product.active_units?.length"
              class="text-caption text-primary font-weight-bold mt-1"
            >
              from {{ fmt(minPrice(product)) }}
            </div>
            <div
              v-else
              class="text-subtitle-2 font-weight-black text-primary mt-1"
            >
              {{ fmt(product.selling_price ?? product.base_price) }}
            </div>

            <!-- Unit badges -->
            <div class="d-flex gap-1 flex-wrap mt-1">
              <v-chip
                v-for="u in product.active_units?.slice(0, 3)"
                :key="u.id"
                size="x-small"
                variant="tonal"
                rounded="lg"
              >
                {{ u.unit_name }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <!-- Unit Picker Dialog -->
    <ProductUnitPicker
      v-model="pickerDialog"
      :product="pickerProduct"
      :customer-type="customerType"
      @add="handleAddToCart"
    />
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
  }

  .variant-chip {
    position: absolute;
    top: 8px;
    right: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .text-slate-900 {
    color: #0f172a;
  }
  .text-xxs {
    font-size: 0.65rem;
  }
  .uppercase {
    text-transform: uppercase;
  }

  /* Scrollbar styling for the category slider if arrows are hidden */
  :deep(.v-slide-group__content) {
    padding: 4px 0;
  }
</style>
