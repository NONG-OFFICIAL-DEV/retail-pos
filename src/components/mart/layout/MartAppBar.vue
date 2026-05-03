<template>
  <div>
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

      <v-divider
        vertical
        class="mx-2 border-opacity-20"
        style="height: 24px; align-self: center"
      />

      <!-- Search — grows but won't push right-block off screen -->
      <v-responsive max-width="400" min-width="120" class="flex-grow-1 mx-3">
        <v-text-field
          :model-value="search"
          :placeholder="t('common.search')"
          variant="outlined"
          density="compact"
          hide-details
          class="search-field"
          bg-color="grey-lighten-5"
          @update:model-value="emit('update:search', $event)"
        >
          <template #prepend-inner>
            <v-icon
              icon="mdi-magnify"
              color="grey-darken-1"
              size="16"
              class="mr-1"
            />
          </template>
          <!-- hide ⌘K chip on small tablets to save space -->
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
      </v-responsive>

      <v-spacer />

      <!-- Right block — shrinks gracefully -->
      <div class="right-block">
        <!-- Clock: hide date label on xs -->
        <div class="datetime-block mr-3">
          <div class="dt-time">{{ currentTime }}</div>
          <div class="dt-date d-none d-sm-block">{{ currentDate }}</div>
        </div>

        <v-divider
          vertical
          class="border-opacity-20 mx-2"
          style="height: 24px; align-self: center"
        />
        <LanguageSwicher />
        <v-divider
          vertical
          class="border-opacity-20 mx-2"
          style="height: 24px; align-self: center"
        />

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

        <v-divider
          vertical
          class="border-opacity-20 mx-2"
          style="height: 24px; align-self: center"
        />

        <!-- Operator info: hide on small screens, show on md+ -->
        <div class="operator-info mr-3 d-none d-lg-block">
          <div class="op-label">
            {{ operator.roleName?.toUpperCase() || 'OPERATOR' }}
          </div>
          <div class="op-name">
            {{ operator.displayName?.toUpperCase() || '—' }}
          </div>
          <div class="op-branch">{{ operator.branchName }}</div>
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
            <div class="dropdown-header pa-4">
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
                  <div class="text-caption text-medium-emphasis">
                    {{ operator.roleName || 'POS Cashier' }}
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
              <v-list-item
                prepend-icon="mdi-cog-outline"
                title="Preferences"
                rounded="lg"
                slim
                @click="preferencesDialog = true"
              />
              <v-list-item
                prepend-icon="mdi-logout"
                title="Logout"
                rounded="lg"
                base-color="error"
                slim
                @click="emit('logout')"
              />
            </v-list>
          </v-card>
        </v-menu>
      </div>
    </v-app-bar>
    <PreferencesDialog
      v-model="preferencesDialog"
      :branches="branches"
      :current-branch-id="currentBranchId"
      @branch-changed="emit('branch-changed', $event)"
    />
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import LanguageSwicher from '@/components/customs/LanguageSwicher.vue'
  import PreferencesDialog from '@/components/PreferencesDialog.vue'
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
    },
    // ✅ top-level props — not nested inside operator
    branches: { type: Array, default: () => [] },
    currentBranchId: { type: String, default: null }
  })

  const preferencesDialog = ref(false)
  const emit = defineEmits(['update:search', 'logout', 'branch-changed'])

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
    /* ensure it never wraps or causes overflow */
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
    /* prevent right block from ever wrapping */
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
  .dropdown-header {
    background: #f8fafc;
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
