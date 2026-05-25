<template>
  <v-navigation-drawer
    v-model="model"
    location="right"
    width="300"
    temporary
    rounded="s-xl"
  >
    <!-- Header -->
    <div class="drawer-header pa-5">
      <div class="d-flex align-center justify-space-between mb-1">
        <span class="text-subtitle-1 font-weight-bold">Switch Branch</span>
        <v-btn icon size="small" variant="text" @click="model = false">
          <v-icon icon="mdi-close" size="18" />
        </v-btn>
      </div>
      <div class="text-caption text-medium-emphasis">
        Select a branch to operate in
      </div>
    </div>

    <v-divider />

    <!-- Branch list -->
    <div class="pa-3">
      <v-skeleton-loader
        v-if="loading"
        type="list-item-avatar-two-line"
      ></v-skeleton-loader>
      <v-list v-else lines="two" class="pa-0">
        <v-list-item
          v-for="branch in branches"
          :key="branch.id"
          rounded="lg"
          class="mb-1"
          :active="branch.id === authStore.branch_id"
          border
          @click="select(branch)"
        >
          <template #prepend>
            <v-avatar
              rounded="lg"
              size="38"
              :color="
                branch.id === authStore.branch_id ? 'primary' : 'grey-lighten-3'
              "
              class="mr-1"
            >
              <v-icon
                :icon="
                  branch.id === authStore.branch_id
                    ? 'mdi-store-check'
                    : 'mdi-store-outline'
                "
                :color="
                  branch.id === authStore.branch_id ? 'white' : 'grey-darken-1'
                "
                size="18"
              />
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-semibold text-body-2">
            {{ branch.name }}
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            {{ branch.address_line1 || '—' }}
          </v-list-item-subtitle>

          <template #append>
            <v-icon
              v-if="branch.id === authStore.branch_id"
              icon="mdi-check-circle"
              color="primary"
              size="18"
            />
          </template>
        </v-list-item>
      </v-list>
    </div>
  </v-navigation-drawer>
</template>

<script setup>
  import { ref, watch } from 'vue'
  import { useAuthStore } from '@/stores/authStore'
  import branchService from '@/api/branch'

  const model = defineModel({ type: Boolean, default: false })
  const emit = defineEmits(['branch-changed'])

  const authStore = useAuthStore()
  const branches = ref([])
  const loading = ref(false)

  // Load branches when drawer opens
  watch(model, async open => {
    if (open && branches.value.length === 0) {
      loading.value = true
      try {
        const { data } = await branchService.list()
        branches.value = data?.data?.data ?? []
      } finally {
        loading.value = false
      }
    }
  })

  function select(branch) {
    authStore.branch_id = branch.id
    authStore.branch_name = branch.name
    emit('branch-changed', branch)
    model.value = false
  }
</script>

<style scoped>
  .drawer-header {
    background: #f8fafc;
  }
</style>
