<script setup>
import { computed } from 'vue'

const props = defineProps({
  search: { type: String, default: '' },
  user:   { type: Object, default: null }
})

const emit = defineEmits(['update:search', 'logout'])

const initials = computed(() => {
  const name = props.user?.username || ''
  return name.slice(0, 1).toUpperCase() || 'A'
})
</script>

<template>
  <v-app-bar elevation="0" height="60" class="mart-appbar px-4">

    <!-- ── LOGO ── -->
    <div class="logo-block mr-5">
      <div class="logo-mark">
        <v-icon icon="mdi-barcode-scan" color="white" size="18" />
      </div>
      <div class="logo-meta">
        <span class="logo-name">MART<span class="text-primary">OS</span></span>
        <div class="d-flex align-center">
          <span class="status-dot" />
          <span class="status-text">TERM-01 · ONLINE</span>
        </div>
      </div>
    </div>

    <v-divider vertical class="mx-1 border-opacity-20" />

    <!-- ── SEARCH ── -->
    <v-responsive max-width="520" class="flex-grow-1 mx-5">
      <v-text-field
        :model-value="search"
        placeholder="Scan barcode or search product..."
        variant="outlined"
        density="compact"
        hide-details
        class="search-field"
        bg-color="grey-lighten-5"
        @update:model-value="emit('update:search', $event)"
      >
        <template #prepend-inner>
          <v-icon icon="mdi-magnify" color="grey-darken-1" size="18" class="mr-1" />
        </template>
        <template #append-inner>
          <v-chip size="x-small" variant="tonal" color="grey" class="cmd-chip">
            ⌘K
          </v-chip>
        </template>
      </v-text-field>
    </v-responsive>

    <v-spacer />

    <!-- ── RIGHT ACTIONS ── -->
    <div class="right-block">

      <!-- Notification bell -->
      <v-btn
        icon
        variant="text"
        size="small"
        color="grey-darken-1"
        rounded="lg"
      >
        <v-icon icon="mdi-bell-outline" size="20" />
      </v-btn>

      <v-divider
        vertical
        class="mx-3 border-opacity-20"
        style="height: 24px; align-self: center"
      />

      <!-- Operator label -->
      <div class="operator-info mr-3">
        <div class="op-label">OPERATOR</div>
        <div class="op-name">
          {{ user?.username?.toUpperCase() || '—' }}
        </div>
      </div>

      <!-- Avatar + dropdown -->
      <v-menu location="bottom end" :offset="[8, 0]">
        <template #activator="{ props: menuProps }">
          <v-avatar
            v-bind="menuProps"
            rounded="lg"
            size="36"
            color="primary"
            class="op-avatar cursor-pointer"
          >
            <v-img v-if="user?.avatar" :src="user.avatar" cover />
            <span v-else class="text-body-2 font-weight-black text-white">
              {{ initials }}
            </span>
          </v-avatar>
        </template>

        <!-- Dropdown card -->
        <v-card width="210" rounded="lg" elevation="4" border class="dropdown-card mt-1">

          <!-- User info header -->
          <div class="dropdown-header pa-3">
            <div class="text-body-2 font-weight-bold text-truncate">
              {{ user?.username?.toUpperCase() || 'Operator' }}
            </div>
            <div class="text-caption text-medium-emphasis">POS Cashier</div>
          </div>

          <v-divider />

          <v-list density="compact" class="pa-1">
            <v-list-item
              prepend-icon="mdi-logout"
              title="Logout"
              rounded="lg"
              base-color="error"
              slim
              class="font-weight-medium"
              @click="emit('logout')"
            />
          </v-list>
        </v-card>
      </v-menu>
    </div>

  </v-app-bar>
</template>

<style scoped>
/* ── APP BAR ── */
.mart-appbar {
  background: #ffffff !important;
  border-bottom: 1px solid #e2e8f0 !important;
}

/* ── LOGO ── */
.logo-block {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.logo-mark {
  width: 36px;
  height: 36px;
  background: #0f172a;
  border-radius: 8px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.logo-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.logo-name {
  font-size: 15px;
  font-weight: 900;
  letter-spacing: -0.5px;
  line-height: 1;
  color: #0f172a;
}

.status-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  background: #22c55e;
  border-radius: 50%;
  box-shadow: 0 0 6px #22c55e;
  flex-shrink: 0;
}

.status-text {
  font-size: 9px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.5px;
}

/* ── SEARCH ── */
.search-field :deep(.v-field) {
  border-radius: 8px !important;
  font-size: 13.5px;
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

/* ── RIGHT BLOCK ── */
.right-block {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.operator-info {
  text-align: right;
}

.op-label {
  font-size: 9px;
  font-weight: 800;
  color: #94a3b8;
  letter-spacing: 1px;
  line-height: 1;
}

.op-name {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.4;
}

.op-avatar {
  border: 2px solid #e2e8f0;
  transition: border-color 0.15s;
}

.op-avatar:hover {
  border-color: rgb(var(--v-theme-primary));
}

/* ── DROPDOWN ── */
.dropdown-card {
  border: 1px solid #e2e8f0 !important;
}

.dropdown-header {
  background: #f8fafc;
}
</style>