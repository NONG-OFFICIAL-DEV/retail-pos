<template>
  <v-app>
    <v-main class="login-bg d-flex align-center justify-center">
      <v-card class="login-card" width="420" rounded="xl" elevation="1">
        <!-- Logo / Title -->
        <div class="text-center pt-8 pb-2 px-6">
          <v-avatar size="64" color="primary" class="mb-4">
            <v-icon size="36" color="white">mdi-storefront-outline</v-icon>
          </v-avatar>
          <div class="text-h5 font-weight-bold text-primary">POS System</div>
          <div class="text-body-2 text-medium-emphasis mt-1">
            Sign in to continue
          </div>

          <!-- Offline notice on login screen -->
          <v-chip
            v-if="!isOnline"
            color="warning"
            variant="tonal"
            size="small"
            prepend-icon="mdi-wifi-off"
            class="mt-2"
          >
            Offline — PIN only
          </v-chip>
        </div>

        <!-- Tabs -->
        <v-tabs v-model="tab" grow color="primary" class="mt-2">
          <v-tab value="pin">
            <v-icon start>mdi-dialpad</v-icon>
            PIN
          </v-tab>
          <!-- Hide email tab when offline (needs server) -->
          <v-tab value="email" :disabled="!isOnline">
            <v-icon start>mdi-email-outline</v-icon>
            Email
          </v-tab>
        </v-tabs>

        <v-divider />

        <v-card-text class="px-6 pt-4 pb-6">
          <v-window v-model="tab">
            <!-- ── Email Login ─────────────────────────────────── -->
            <v-window-item value="email">
              <v-form
                ref="emailForm"
                class="py-4"
                v-model="emailValid"
                @submit.prevent="submitEmail"
              >
                <v-text-field
                  v-model="email"
                  label="Email"
                  type="email"
                  prepend-inner-icon="mdi-email-outline"
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.required, rules.email]"
                  class="mb-3"
                  autofocus
                />

                <v-text-field
                  v-model="password"
                  label="Password"
                  :type="showPw ? 'text' : 'password'"
                  prepend-inner-icon="mdi-lock-outline"
                  :append-inner-icon="showPw ? 'mdi-eye-off' : 'mdi-eye'"
                  variant="outlined"
                  density="comfortable"
                  :rules="[rules.required]"
                  class="mb-4"
                  @click:append-inner="showPw = !showPw"
                />

                <v-alert
                  v-if="errorMsg"
                  type="error"
                  variant="tonal"
                  rounded="lg"
                  class="mb-4 text-body-2"
                  closable
                  @click:close="errorMsg = ''"
                >
                  {{ errorMsg }}
                </v-alert>

                <v-btn
                  type="submit"
                  color="primary"
                  size="large"
                  block
                  rounded="lg"
                  :loading="loading"
                  :disabled="!emailValid"
                >
                  Sign In
                </v-btn>
              </v-form>
            </v-window-item>

            <!-- ── PIN Login ───────────────────────────────────── -->
            <v-window-item value="pin">
              <div class="text-center">
                <!-- PIN dots -->
                <div
                  class="pin-dots d-flex justify-center align-center gap-3 my-4"
                >
                  <div
                    v-for="i in 4"
                    :key="i"
                    class="pin-dot"
                    :class="{ filled: pin.length >= i }"
                  />
                </div>

                <v-alert
                  v-if="errorMsg"
                  type="error"
                  variant="tonal"
                  rounded="lg"
                  class="mb-3 text-body-2"
                  closable
                  @click:close="errorMsg = ''"
                >
                  {{ errorMsg }}
                </v-alert>

                <!-- Number pad -->
                <div class="pin-grid mx-auto">
                  <v-btn
                    v-for="key in [
                      '1',
                      '2',
                      '3',
                      '4',
                      '5',
                      '6',
                      '7',
                      '8',
                      '9',
                      '',
                      '0',
                      '⌫'
                    ]"
                    :key="key"
                    :disabled="key === '' || loading"
                    class="pin-key"
                    :class="{ 'pin-key--ghost': key === '' }"
                    variant="tonal"
                    rounded="lg"
                    :loading="key === '0' && loading"
                    @click="pinPress(key)"
                  >
                    <template v-if="key === '⌫'">
                      <v-icon>mdi-backspace-outline</v-icon>
                    </template>
                    <span v-else class="text-h6 font-weight-bold">
                      {{ key }}
                    </span>
                  </v-btn>
                </div>

                <v-btn
                  color="primary"
                  size="large"
                  block
                  rounded="lg"
                  class="mt-4"
                  :loading="loading"
                  :disabled="pin.length < 4"
                  @click="submitPin"
                >
                  <v-icon start>mdi-login</v-icon>
                  Sign In with PIN
                </v-btn>
              </div>
            </v-window-item>
          </v-window>
        </v-card-text>
      </v-card>
    </v-main>
  </v-app>
</template>

<script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '@/stores/authStore'
  import { warmUpCache } from '@/services/offlineProductService'
  import { useOffline } from '@/composables/useOffline'

  const router = useRouter()
  const authStore = useAuthStore()

  // Know if we're online so we can disable email tab offline
  const { isOnline } = useOffline()

  // ── Shared ────────────────────────────────────────────────────
  const tab = ref('pin')
  const loading = ref(false)
  const errorMsg = ref('')

  // ── Email form ────────────────────────────────────────────────
  const emailForm = ref(null)
  const emailValid = ref(false)
  const email = ref('')
  const password = ref('')
  const showPw = ref(false)

  const rules = {
    required: v => !!v || 'This field is required',
    email: v => /.+@.+\..+/.test(v) || 'Enter a valid email'
  }

  async function submitEmail() {
    const { valid } = await emailForm.value.validate()
    if (!valid) return

    loading.value = true
    errorMsg.value = ''
    try {
      await authStore.login({ email: email.value, password: password.value })

      // ← NEW: pre-cache products & categories in background after login
      //   so the app works offline next time
      warmUpCache().catch(console.error)

      router.push('/mart')
    } catch (err) {
      errorMsg.value =
        err.response?.data?.message ??
        err.message ??
        'Login failed. Please try again.'
    } finally {
      loading.value = false
    }
  }

  // ── PIN pad ───────────────────────────────────────────────────
  const pin = ref('')
  const branchId = null // set from route.query.branch_id if needed

  function pinPress(key) {
    if (key === '⌫') {
      pin.value = pin.value.slice(0, -1)
      return
    }
    if (pin.value.length >= 4) return
    pin.value += key
    if (pin.value.length === 4) submitPin()
  }

  async function submitPin() {
    if (pin.value.length < 4) return

    loading.value = true
    errorMsg.value = ''
    try {
      await authStore.loginByPin(pin.value, branchId)

      // ← NEW: pre-cache products & categories after PIN login too
      warmUpCache().catch(console.error)

      router.push('/mart')
    } catch (err) {
      errorMsg.value =
        err.response?.data?.message ?? 'Incorrect PIN. Please try again.'
      pin.value = ''
    } finally {
      loading.value = false
    }
  }
</script>

<style scoped>
  .login-bg {
    min-height: 100vh;
  }
  .login-card {
    backdrop-filter: blur(10px);
  }

  /* PIN dots */
  .pin-dots {
    gap: 12px;
  }
  .pin-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid rgb(var(--v-theme-primary));
    background: transparent;
    transition:
      background 0.15s ease,
      transform 0.1s ease;
  }
  .pin-dot.filled {
    background: rgb(var(--v-theme-primary));
    transform: scale(1.15);
  }

  /* PIN grid: 3 columns */
  .pin-grid {
    display: grid;
    grid-template-columns: repeat(3, 72px);
    gap: 10px;
    justify-content: center;
  }
  .pin-key {
    width: 72px !important;
    height: 56px !important;
    font-size: 1.25rem !important;
  }
  .pin-key--ghost {
    visibility: hidden;
    pointer-events: none;
  }
</style>
