<template>
  <div class="pos-products-view">
    <CategorySlider v-model="selectedCategory" :categories="categories" />
    <v-row class="mt-2" dense>
      <!-- Skeleton -->
      <template v-if="isLoading">
        <v-col v-for="n in 12" :key="n" cols="6" sm="3" md="2">
          <v-skeleton-loader
            type="image, list-item-two-line"
            rounded="xl"
            class="border"
          />
        </v-col>
      </template>

      <!-- Empty -->
      <v-col v-else-if="isEmpty" cols="12" class="text-center py-12">
        <v-icon icon="mdi-magnify-close" size="64" color="grey-lighten-1" />
        <div class="text-h6 text-grey mt-4">No products found</div>
        <p class="text-caption text-grey">
          Try adjusting your search or category
        </p>
      </v-col>

      <!-- Product cards -->
      <v-col
        v-for="product in products"
        :key="product.id"
        cols="6"
        sm="3"
        md="2"
      >
        <v-card
          class="product-card"
          :class="{
            'product-card--out': isOutOfStock(product),
            'product-card--low': isLowStock(product),
            'product-card--disabled': isOutOfStock(product)
          }"
          :ripple="!isOutOfStock(product)"
          @click="isOutOfStock(product) ? null : openPicker(product)"
        >
          <!-- ── Image area ─────────────────────────────────────────────── -->
          <div
            class="product-img-wrap"
            :class="{ 'img-out': isOutOfStock(product) }"
          >
            <!-- Image with fallback -->
            <div v-if="product.image_url" class="product-img">
              <img
                :src="product.image_url"
                :alt="product.name"
                class="product-img__img"
                @error="e => (e.target.style.display = 'none')"
              />
            </div>

            <!-- Fallback placeholder when no image -->
            <div v-else class="product-img product-img--placeholder">
              <div class="placeholder-initial">
                {{ product.name?.charAt(0)?.toUpperCase() }}
              </div>
              <div class="placeholder-name text-caption text-medium-emphasis">
                {{ product.name }}
              </div>
            </div>

            <!-- Out of stock overlay -->
            <div v-if="isOutOfStock(product)" class="out-overlay">
              <v-icon
                icon="mdi-close-circle"
                size="28"
                color="white"
                class="mb-1"
              />
              <div class="text-caption font-weight-bold text-white">
                Out of Stock
              </div>
            </div>

            <!-- Low stock badge (top right) -->
            <v-chip
              v-else-if="isLowStock(product)"
              size="x-small"
              color="warning"
              variant="flat"
              rounded="lg"
              class="stock-badge"
            >
              <v-icon start size="10" icon="mdi-alert" />
              Low
            </v-chip>

            <!-- Stock qty badge (bottom left) -->
            <v-chip
              size="x-small"
              variant="flat"
              rounded="lg"
              class="qty-badge"
              :color="stockChipColor(product)"
            >
              {{ fmtQty(product.stock_quantity) }}
            </v-chip>
          </div>

          <!-- ── Info area ──────────────────────────────────────────────── -->
          <v-card-text class="pa-2 pt-2">
            <div class="product-name text-body-2 font-weight-bold mb-1">
              {{ product.name }}
            </div>

            <!-- Price -->
            <div
              v-if="product.active_units?.length"
              class="text-caption text-primary font-weight-black"
            >
              {{ t('common.from') }} {{ formatKHR(minPrice(product)) }}
            </div>
            <div v-else class="text-caption text-primary font-weight-black">
              {{ formatKHR(product.selling_price ?? product.base_price) }}
            </div>

            <!-- Unit chips -->
            <div class="d-flex gap-1 flex-wrap mt-1">
              <v-chip
                v-for="u in product.active_units?.slice(0, 2)"
                :key="u.id"
                size="x-small"
                variant="tonal"
                rounded="lg"
                :color="u.is_base_unit ? 'primary' : 'default'"
              >
                {{ u.unit_label ?? u.unit_name }}
              </v-chip>
              <v-chip
                v-if="(product.active_units?.length ?? 0) > 2"
                size="x-small"
                variant="tonal"
                rounded="lg"
                color="grey"
              >
                +{{ product.active_units.length - 2 }}
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

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useProductStore } from '@/stores/productStore'
  import { useCategoryStore } from '@/stores/categoryStore'
  import { useMartStore } from '@/stores/martStore'
  import { useLoadingStore } from '@/stores/loadingStore'
  import { useAuthStore } from '@/stores/authStore'
  import ProductUnitPicker from '@/components/mart/ProductUnitPicker.vue'
  import CategorySlider from '@/components/mart/CategorySlider.vue'
  import { useI18n } from 'vue-i18n'
  import { formatKHR } from '@nong-official-dev/core'
  const { t } = useI18n()

  const props = defineProps({ search: { type: String, default: '' } })

  const productStore = useProductStore()
  const categoryStore = useCategoryStore()
  const martStore = useMartStore()
  const loadingStore = useLoadingStore()
  const authStore = useAuthStore()

  const selectedCategory = ref('all')
  const pickerDialog = ref(false)
  const pickerProduct = ref(null)
  const customerType = ref('retail')

  const categories = computed(() => categoryStore.categories ?? [])
  const isLoading = ref(false)

  const products = computed(() => {
    let list = productStore.products ?? []
    if (selectedCategory.value !== 'all')
      list = list.filter(p => p.category_id === selectedCategory.value)
    if (props.search) {
      const q = props.search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q))
    }
    return list
  })

  const isEmpty = computed(() => !products.value.length && !isLoading.value)

  const isOutOfStock = p => parseFloat(p.stock_quantity) <= 0
  const isLowStock = p =>
    p.reorder_level != null &&
    parseFloat(p.stock_quantity) > 0 &&
    parseFloat(p.stock_quantity) <= parseFloat(p.reorder_level)

  const stockChipColor = p => {
    if (isOutOfStock(p)) return 'error'
    if (isLowStock(p)) return 'warning'
    return 'success'
  }

  const fmtQty = qty => {
    const n = parseFloat(qty)
    return Number.isInteger(n) ? n : parseFloat(n.toFixed(2))
  }

  const minPrice = product =>
    Math.min(...product.active_units.map(u => parseFloat(u.retail_price)))

  const openPicker = product => {
    if (!product.active_units?.length) {
      martStore.addToCart({ ...product, quantity: 1 })
      return
    }
    pickerProduct.value = product
    pickerDialog.value = true
  }

  const handleAddToCart = payload => {
    martStore.addToCart({
      id: payload.product_id,
      product_unit_id: payload.product_unit_id,
      name: payload.name,
      unit: payload.unit_name,
      price: payload.price,
      qty_per_base: payload.qty_per_base,
      image_url: payload.image_url,
      qty: payload.quantity
    })
  }

  onMounted(async () => {
    isLoading.value = true
    await Promise.all([
      productStore.fetchProducts({ branch_id: authStore.branch_id }),
      categoryStore.fetchCategories({ branch_id: authStore.branch_id })
    ])
    isLoading.value = false
  })
</script>

<style scoped>
  .pos-products-view {
    position: relative;
  }
  /* ── Card ── */
  .product-card {
    cursor: pointer;
    transition: all 0.18s ease;
    background: white !important;
    border: 1px solid #e2e8f0;
    border-radius: 12px !important;
    overflow: hidden;
  }
  .product-card:not(.product-card--disabled):hover {
    transform: translateY(-3px);
    border-color: rgb(var(--v-theme-primary)) !important;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08) !important;
  }
  .product-card--out {
    opacity: 0.75;
    cursor: not-allowed !important;
    border-color: rgba(var(--v-theme-error), 0.35) !important;
  }
  .product-card--low {
    border-color: rgba(var(--v-theme-warning), 0.5) !important;
  }

  /* ── Image wrapper ── */
  .product-img-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1; /* perfect square, works for any card width */
    overflow: hidden;
    background: #f8fafc;
  }
  .img-out {
    filter: grayscale(55%);
  }

  /* Real image */
  .product-img {
    width: 100%;
    height: 100%;
  }
  .product-img__img {
    width: 100%;
    height: 100%;
    object-fit: cover; /* fills the square, crops sides if needed */
    object-position: center;
    display: block;
    transition: transform 0.2s ease;
  }
  .product-card:not(.product-card--disabled):hover .product-img__img {
    transform: scale(1.04); /* subtle zoom on hover */
  }

  /* Placeholder when no image */
  .product-img--placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
    padding: 8px;
  }
  .placeholder-initial {
    font-size: 2rem;
    font-weight: 900;
    color: #94a3b8;
    line-height: 1;
    margin-bottom: 4px;
  }
  .placeholder-name {
    text-align: center;
    font-size: 10px;
    color: #94a3b8;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    max-width: 90%;
  }

  /* Out of stock overlay */
  .out-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1;
  }

  /* Badges */
  .qty-badge {
    position: absolute;
    bottom: 6px;
    left: 6px;
    font-size: 10px !important;
    font-weight: 700 !important;
    z-index: 2;
  }
  .stock-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    font-size: 10px !important;
    z-index: 2;
  }

  /* Name */
  .product-name {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.3;
    min-height: 2.6em;
  }

  .gap-1 {
    gap: 4px;
  }
  :deep(.v-slide-group__content) {
    padding: 4px 0;
  }
</style>
