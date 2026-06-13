<template>
  <v-app-bar elevation="0" height="56" class="mart-appbar px-3">
    <!-- Logo -->
    <div class="logo-block mr-3">
      <div class="logo-mark">
        <v-icon icon="mdi-barcode-scan" color="white" size="16" />
      </div>
      <div class="logo-meta">
        <span class="logo-name">
          {{ operator.buName || 'MART' }}
          <span class="text-primary">POS</span>
        </span>
        <div class="d-flex align-center gap-1">
          <span class="status-dot" :class="{ offline: !isOnline }" />
          <span class="status-text">
            {{ operator.branchName?.toUpperCase() || 'BRANCH' }} ·
            {{ isOnline ? 'ONLINE' : 'OFFLINE' }}
          </span>
        </div>
      </div>
    </div>

    <v-app-bar-title>
      <v-responsive max-width="400" class="mx-auto">
        <div class="d-flex align-center">
          <v-text-field
            :model-value="search"
            :placeholder="t('common.search')"
            variant="outlined"
            density="compact"
            hide-details
            class="search-field mx-auto"
            bg-color="grey-lighten-5"
            @update:model-value="emit('update:search', $event)"
            @keydown.enter.prevent="onSearchEnter"
          >
            <template #prepend-inner>
              <v-icon
                icon="mdi-magnify"
                color="grey-darken-1"
                size="16"
                class="mr-1"
              />
            </template>
            <template #append-inner>
              <v-chip
                size="x-small"
                variant="tonal"
                color="grey"
                class="cmd-chip d-none d-md-flex"
              >
                ⌘K
              </v-chip>
            </template>
          </v-text-field>
          <!-- Scan test button — sits right after the search box -->
          <v-btn
            icon="mdi-barcode-scan"
            variant="tonal"
            size="small"
            rounded="lg"
            color="primary"
            class="ml-1 mr-2"
            title="Scan barcode (test)"
            @click="openScanDialog"
          />
        </div>
      </v-responsive>
    </v-app-bar-title>

    <!-- Right block — shrinks gracefully -->
    <template v-slot:append>
      <div class="right-block">
        <LanguageSwicher />
        <v-divider vertical class="border-opacity-20 mx-2" />

        <!-- Fullscreen toggle -->
        <v-btn
          icon
          variant="text"
          size="small"
          :color="isFullscreen ? 'primary' : 'grey-darken-1'"
          rounded="lg"
          class="mr-1"
          :title="isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'"
          @click="toggleFullscreen"
        >
          <v-icon
            :icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"
            size="20"
          />
        </v-btn>

        <v-divider vertical class="border-opacity-20 mx-2" />

        <!-- Operator info: hide on small screens, show on md+ -->
        <div class="operator-info mr-3 d-none d-lg-block">
          <div class="op-label">
            {{ operator.roleName?.toUpperCase() || 'OPERATOR' }}
          </div>
          <div class="op-name">
            {{ operator.displayName?.toUpperCase() || '—' }}
          </div>
        </div>

        <!-- Avatar + menu -->
        <v-menu location="bottom end" :offset="[8, 0]">
          <template #activator="{ props: mp }">
            <v-avatar
              v-bind="mp"
              rounded="lg"
              size="34"
              color="primary"
              class="op-avatar cursor-pointer"
            >
              <v-img v-if="operator.avatar" :src="operator.avatar" cover />
              <span v-else class="text-body-2 font-weight-black text-white">
                {{ operator.initials }}
              </span>
            </v-avatar>
          </template>

          <v-card
            width="230"
            rounded="lg"
            elevation="4"
            border
            class="dropdown-card mt-1"
          >
            <div class="pa-4">
              <div class="d-flex align-center gap-3">
                <v-avatar rounded="lg" size="38" color="primary">
                  <span class="text-body-2 font-weight-black text-white">
                    {{ operator.initials }}
                  </span>
                </v-avatar>
                <div class="flex-grow-1 min-w-0">
                  <div class="text-body-2 font-weight-bold text-truncate">
                    {{ operator.displayName }}
                  </div>
                  <v-chip
                    size="x-small"
                    color="primary"
                    variant="tonal"
                    rounded="lg"
                    class="mt-1"
                  >
                    {{ operator.branchName }}
                  </v-chip>
                </div>
              </div>
            </div>
            <v-divider />

            <v-list density="compact" class="pa-1">
              <template v-if="operator.isOwner">
              <v-list-item
                prepend-icon="mdi-store-cog-outline"
                title="Switch Branch"
                rounded="lg"
                slim
                @click="emit('open-branch-switcher')"
              >
                <template #append>
                  <v-icon size="14" color="medium-emphasis">
                    mdi-chevron-right
                  </v-icon>
                </template>
              </v-list-item>
              </template>
            </v-list>
            <v-divider v-if="operator.isOwner"/>
            <!-- Logout -->
            <div class="pa-3">
              <v-btn
                block
                variant="tonal"
                rounded="lg"
                color="error"
                prepend-icon="mdi-logout"
                @click="emit('logout')"
              >
                {{ t('common.logout') }}
              </v-btn>
            </div>
          </v-card>
        </v-menu>
      </div>
    </template>
    <!-- Test scan dialog -->
    <v-dialog v-model="scanDialog" max-width="320">
      <v-card rounded="xl" border elevation="0">
        <v-card-text class="pa-4">
          <div
            class="text-body-2 font-weight-bold mb-3 d-flex align-center gap-2"
          >
            <v-icon icon="mdi-barcode-scan" color="primary" size="18" class="mr-2"/>
            {{ t('common.scan_barcode') ?? 'Scan / Enter Barcode' }}
          </div>
          <v-text-field
            ref="scanInputRef"
            v-model="scanInput"
            variant="outlined"
            density="compact"
            rounded="lg"
            hide-details
            autofocus
            placeholder="e.g. 8850006140013"
            @keydown.enter.prevent="submitScan"
          />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0 gap-2">
          <v-btn variant="tonal" rounded="lg" @click="scanDialog = false">
            {{ t('btn.cancel') ?? 'Cancel' }}
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="lg"
            class="flex-grow-1"
            prepend-icon="mdi-check"
            :disabled="!scanInput.trim()"
            @click="submitScan"
          >
            {{ t('btn.confirm') ?? 'Confirm' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app-bar>
</template>

<script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import LanguageSwicher from '@/components/customs/LanguageSwicher.vue'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  const props = defineProps({
    search: { type: String, default: '' },
    operator: {
      type: Object,
      default: () => ({
        displayName: '',
        roleName: '',
        branchName: '',
        buName: '',
        avatar: null,
        initials: 'OP'
      })
    }
  })

  const emit = defineEmits([
    'update:search',
    'logout',
    'open-branch-switcher',
    'scan'
  ])
  // Clock
  const now = ref(new Date())
  let timer = null
  const currentTime = computed(() =>
    now.value.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  )
  const currentDate = computed(() =>
    now.value.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  )
  onMounted(() => {
    timer = setInterval(() => (now.value = new Date()), 1000)
  })
  onUnmounted(() => clearInterval(timer))

  // Online status
  const isOnline = ref(navigator.onLine)
  onMounted(() => {
    window.addEventListener('online', () => (isOnline.value = true))
    window.addEventListener('offline', () => (isOnline.value = false))
  })

  // Fullscreen
  const isFullscreen = ref(false)

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }
  // ── Scan dialog (for testing without a real scanner) ──────────────────────
  const scanDialog = ref(false)
  const scanInput = ref('')

  const openScanDialog = () => {
    scanInput.value = ''
    scanDialog.value = true
  }

  const submitScan = () => {
    const code = scanInput.value.trim()
    if (!code) return
    emit('scan', code) // ← emit up to MartLayout
    scanInput.value = ''
    scanDialog.value = false
  }

  // Search bar Enter → also triggers scan if value looks like a barcode
  const onSearchEnter = () => {
    const val = props.search.trim()
    if (/^\d{6,14}$/.test(val)) {
      emit('scan', val)
      emit('update:search', '') // clear search box
    }
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', () => {
      isFullscreen.value = !!document.fullscreenElement
    })
  })
</script>

<style scoped>
  .mart-appbar {
    background: #ffffff !important;
    border-bottom: 1px solid #e2e8f0 !important;
    overflow: hidden;
  }

  /* ── Logo ── */
  .logo-block {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .logo-mark {
    width: 32px;
    height: 32px;
    background: #0f172a;
    border-radius: 7px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  .logo-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .logo-name {
    font-size: 14px;
    font-weight: 900;
    letter-spacing: -0.5px;
    line-height: 1;
    color: #0f172a;
  }

  /* ── Status dot ── */
  .status-dot {
    display: inline-block;
    width: 5px;
    height: 5px;
    background: #22c55e;
    border-radius: 50%;
    box-shadow: 0 0 6px #22c55e;
    flex-shrink: 0;
  }
  .status-dot.offline {
    background: #ef4444;
    box-shadow: 0 0 6px #ef4444;
  }
  .status-text {
    font-size: 9px;
    font-weight: 700;
    color: #94a3b8;
    letter-spacing: 0.5px;
  }

  /* ── Search ── */
  .search-field :deep(.v-field) {
    border-radius: 8px !important;
    font-size: 13px;
  }
  .search-field :deep(.v-field__outline) {
    --v-field-border-width: 1.5px;
  }
  .search-field :deep(.v-field--focused .v-field__outline) {
    --v-field-border-width: 2px;
  }
  .cmd-chip {
    font-size: 10px;
    font-weight: 700;
  }

  /* ── Clock ── */
  .datetime-block {
    text-align: right;
    flex-shrink: 0;
  }
  .dt-time {
    font-size: 13px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.3px;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .dt-date {
    font-size: 9px;
    font-weight: 600;
    color: #94a3b8;
    letter-spacing: 0.3px;
    white-space: nowrap;
  }

  /* ── Right block ── */
  .right-block {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    min-width: 0;
  }

  /* ── Operator info ── */
  .operator-info {
    text-align: right;
    flex-shrink: 0;
  }
  .op-label {
    font-size: 9px;
    font-weight: 800;
    color: #94a3b8;
    letter-spacing: 1px;
    line-height: 1;
  }
  .op-name {
    font-size: 12px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.3;
    white-space: nowrap;
  }
  .op-branch {
    font-size: 9px;
    font-weight: 600;
    color: #94a3b8;
    white-space: nowrap;
  }

  /* ── Avatar ── */
  .op-avatar {
    border: 2px solid #e2e8f0;
    transition: border-color 0.15s;
    cursor: pointer;
    flex-shrink: 0;
  }
  .op-avatar:hover {
    border-color: rgb(var(--v-theme-primary));
  }

  /* ── Dropdown ── */
  .dropdown-card {
    border: 1px solid #e2e8f0 !important;
  }
  /* ── Utilities ── */
  .gap-1 {
    gap: 4px;
  }
  .gap-3 {
    gap: 12px;
  }
  .min-w-0 {
    min-width: 0;
  }
</style>
