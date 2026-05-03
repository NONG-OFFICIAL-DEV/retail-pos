<!-- components/PreferencesDialog.vue -->
<template>
  <v-dialog v-model="model" max-width="420" persistent>
    <v-card rounded="xl">
      <v-card-title class="pa-4 pb-2 text-subtitle-1 font-weight-medium">
        Preferences
      </v-card-title>

      <v-card-text class="pa-4 pt-2">
        <p class="text-body-2 text-medium-emphasis mb-4">
          Select the branch you want to operate in.
        </p>

        <v-list density="compact" rounded="lg" border>
          <v-list-item
            v-for="branch in branches"
            :key="branch.id"
            :title="branch.name"
            rounded="lg"
            slim
            @click="selectedBranchId = branch.id"
          >
            <template #append>
              <v-icon
                v-if="branch.id === selectedBranchId"
                icon="mdi-check-circle"
                color="primary"
                size="18"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="model = false">Cancel</v-btn>
        <v-btn variant="flat" color="primary" @click="confirm">Confirm</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  branches: {
    type: Array,
    default: () => [],
  },
  currentBranchId: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['branch-changed'])

const model = defineModel({ type: Boolean, default: false })
const selectedBranchId = ref(props.currentBranchId)

// sync if currentBranchId changes from outside
watch(() => props.currentBranchId, (val) => {
  selectedBranchId.value = val
})

function confirm() {
  const branch = props.branches.find(b => b.id === selectedBranchId.value)
  if (branch) emit('branch-changed', branch)
  model.value = false
}
</script>