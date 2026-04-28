<template>
  <v-app>
    <v-main class="login-root">
      <!-- ── Left panel ──────────────────────────────────────────────────── -->
      <div
        class="left-panel d-none d-md-flex flex-column justify-space-between pa-10"
      >
        <!-- Brand -->
        <div class="d-flex align-center ga-3">
          <div class="brand-icon">
            <v-icon size="22" color="white">mdi-storefront-outline</v-icon>
          </div>
          <span class="brand-name">Nexus POS</span>
        </div>

        <!-- Center illustration -->
        <div class="left-center">
          <div class="illustration-ring ring-1" />
          <div class="illustration-ring ring-2" />
          <div class="illustration-ring ring-3" />
          <div class="left-icon-wrap">
            <v-icon size="64" color="white">mdi-cart-outline</v-icon>
          </div>
          <div class="left-headline mt-6">
            Fast checkout.
            <br />
            Every time.
          </div>
          <div class="left-sub mt-3">
            Manage orders, track stock and
            <br />
            close shifts — all from one screen.
          </div>
        </div>

        <!-- Stats row -->
        <div class="d-flex ga-6">
          <div v-for="s in stats" :key="s.label" class="stat-pill">
            <div class="stat-value">{{ s.value }}</div>
            <div class="stat-label">{{ s.label }}</div>
          </div>
        </div>
      </div>

      <!-- ── Right panel ─────────────────────────────────────────────────── -->
      <div
        class="right-panel d-flex flex-column align-center justify-center pa-6"
      >
        <!-- Lang switcher -->
        <div class="lang-bar">
          <button
            v-for="lang in langs"
            :key="lang.code"
            class="lang-btn"
            :class="{ active: locale === lang.code }"
            @click="locale = lang.code"
          >
            {{ lang.flag }}&nbsp;{{ lang.label }}
          </button>
        </div>

        <div class="login-box w-100">
          <!-- Header -->
          <div class="mb-7">
            <div class="login-title">
              {{ t('login.welcome') || 'Welcome back' }}
            </div>
            <div class="login-sub">
              {{ t('login.subtitle') || 'Sign in to your station' }}
            </div>
          </div>

          <!-- Tab toggle -->
          <div class="tab-toggle mb-6">
            <button
              class="mode-btn"
              :class="{ active: loginMode === 'pin' }"
              @click="setMode('pin')"
            >
              <v-icon icon="mdi-numeric" size="18" />
              {{ t('login.pin_code') || 'PIN Code' }}
            </button>

            <button
              class="mode-btn"
              :class="{ active: loginMode === 'password' }"
              @click="setMode('password')"
            >
              <v-icon icon="mdi-lock-open-outline" size="18" />
              {{ t('login.password') || 'Password' }}
            </button>
          </div>

          <!-- ── PIN window ───────────────────────────────────────────────── -->
          <transition name="fade" mode="out-in">
            <div v-if="tab === 'pin'" key="pin">
              <!-- Dots -->
              <div class="pin-dots-row mb-6">
                <div
                  v-for="i in 4"
                  :key="i"
                  class="pin-dot"
                  :class="{ filled: pin.length >= i }"
                />
              </div>

              <!-- Error -->
              <v-expand-transition>
                <v-alert
                  v-if="errorMsg"
                  type="error"
                  variant="tonal"
                  density="compact"
                  rounded="lg"
                  closable
                  class="mb-4 text-body-2"
                  @click:close="errorMsg = ''"
                >
                  {{ errorMsg }}
                </v-alert>
              </v-expand-transition>

              <!-- Numpad -->
              <div class="pin-grid mb-4">
                <button
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
                  :key="key + '_k'"
                  class="pin-key"
                  :class="{
                    'pin-key--ghost': key === '',
                    'pin-key--del': key === '⌫'
                  }"
                  :disabled="key === '' || loading"
                  @click="pinPress(key)"
                >
                  <v-icon v-if="key === '⌫'" size="20">
                    mdi-backspace-outline
                  </v-icon>
                  <span v-else>{{ key }}</span>
                </button>
              </div>

              <v-btn
                color="primary"
                size="large"
                block
                rounded="lg"
                class="submit-btn"
                :loading="loading"
                :disabled="pin.length < 4"
                @click="submitPin"
              >
                <v-icon start>mdi-login</v-icon>
                {{ t('login.verify_pin') || 'Verify PIN' }}
              </v-btn>
            </div>

            <!-- ── Email window ─────────────────────────────────────────── -->
            <div v-else key="email">
              <v-form
                ref="emailForm"
                v-model="emailValid"
                @submit.prevent="submitEmail"
              >
                <v-text-field
                  v-model="email"
                  :label="t('login.email_label') || 'Email address'"
                  type="email"
                  prepend-inner-icon="mdi-email-outline"
                  variant="outlined"
                  density="comfortable"
                  rounded="lg"
                  :rules="[rules.required, rules.email]"
                  class="mb-3"
                  autofocus
                />

                <v-text-field
                  v-model="password"
                  :label="t('login.password') || 'Password'"
                  :type="showPw ? 'text' : 'password'"
                  prepend-inner-icon="mdi-lock-outline"
                  :append-inner-icon="showPw ? 'mdi-eye-off' : 'mdi-eye'"
                  variant="outlined"
                  density="comfortable"
                  rounded="lg"
                  :rules="[rules.required]"
                  class="mb-4"
                  @click:append-inner="showPw = !showPw"
                />

                <v-expand-transition>
                  <v-alert
                    v-if="errorMsg"
                    type="error"
                    variant="tonal"
                    density="compact"
                    rounded="lg"
                    closable
                    class="mb-4 text-body-2"
                    @click:close="errorMsg = ''"
                  >
                    {{ errorMsg }}
                  </v-alert>
                </v-expand-transition>

                <v-btn
                  type="submit"
                  color="primary"
                  size="large"
                  block
                  rounded="lg"
                  class="submit-btn"
                  :loading="loading"
                  :disabled="!emailValid"
                >
                  {{ t('login.sign_in') || 'Sign In' }}
                  <v-icon end>mdi-arrow-right</v-icon>
                </v-btn>
              </v-form>
            </div>
          </transition>
        </div>

        <!-- Footer -->
        <div
          class="login-footer mt-8 text-center text-caption text-medium-emphasis"
        >
          © {{ new Date().getFullYear() }} Nexus POS · All rights reserved
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useI18n } from 'vue-i18n'
  import { useAuthStore } from '@/stores/authStore'

  const router = useRouter()
  const authStore = useAuthStore()
  const { t, locale } = useI18n()

  // ── Lang ───────────────────────────────────────────────────────────────────
  const langs = [
    { code: 'en', label: 'EN', flag: '🇺🇸' },
    { code: 'km', label: 'ខ្មែរ', flag: '🇰🇭' }
  ]

  // ── Left panel stats ───────────────────────────────────────────────────────
  const stats = [
    { value: '99.9%', label: 'Uptime' },
    { value: '< 1s', label: 'Response' },
    { value: '24/7', label: 'Support' }
  ]

  // ── Shared ─────────────────────────────────────────────────────────────────
  const tab = ref('pin')
  const loading = ref(false)
  const errorMsg = ref('')

  // ── Email ──────────────────────────────────────────────────────────────────
  const emailForm = ref(null)
  const emailValid = ref(false)
  const email = ref('')
  const password = ref('')
  const showPw = ref(false)
  const loginMode = ref('pin')

  const rules = {
    required: v => !!v || t('validation.required') || 'Required',
    email: v => /.+@.+\..+/.test(v) || t('validation.email') || 'Invalid email'
  }

  function redirect(data) {
    router.push(
      data?.bu_type === 'restaurant' ? '/pos/dining-table-view' : '/mart'
    )
  }

  function setMode(mode) {
    tab.value = mode // controls which panel shows (v-if="tab === 'pin'")
    loginMode.value = mode // controls which button is highlighted
    errorMsg.value = ''
    pin.value = ''
  }
  async function submitEmail() {
    const { valid } = await emailForm.value.validate()
    if (!valid) return
    loading.value = true
    errorMsg.value = ''
    try {
      const res = await authStore.login({
        email: email.value,
        password: password.value
      })
      redirect(res?.data)
    } catch (err) {
      errorMsg.value =
        err.response?.data?.message ??
        err.message ??
        t('messages.authFailed') ??
        'Login failed.'
    } finally {
      loading.value = false
    }
  }

  // ── PIN ────────────────────────────────────────────────────────────────────
  const pin = ref('')
  const branchId = null

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
      const res = await authStore.loginByPin(pin.value, branchId)
      redirect(res?.data)
    } catch (err) {
      errorMsg.value =
        err.response?.data?.message ?? t('login.pin_error') ?? 'Incorrect PIN.'
      pin.value = ''
    } finally {
      loading.value = false
    }
  }
</script>

<style scoped>
  /* ── Root layout ─────────────────────────────────────────────────────────── */
  .login-root {
    display: flex;
    width: 100vw;
    height: 100vh;
    min-height: 0;
    overflow: hidden;
  }

  /* ── Left panel ──────────────────────────────────────────────────────────── */
  /* ── Left panel ────────────────────────────────────────────────────────── */
  .left-panel {
    position: relative;
    flex: 1;
    flex-shrink: 0;
    background: linear-gradient(150deg, #1a237e 0%, #1565c0 55%, #0288d1 100%);
    overflow: hidden;
  }
  .brand-icon {
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
  }
  .brand-name {
    font-size: 18px;
    font-weight: 700;
    color: white;
    letter-spacing: -0.3px;
  }

  .left-center {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .illustration-ring {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.1);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  .ring-1 {
    width: 180px;
    height: 180px;
  }
  .ring-2 {
    width: 280px;
    height: 280px;
  }
  .ring-3 {
    width: 380px;
    height: 380px;
  }

  .left-icon-wrap {
    width: 100px;
    height: 100px;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(6px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  .left-headline {
    font-size: 28px;
    font-weight: 800;
    color: white;
    line-height: 1.3;
    letter-spacing: -0.5px;
  }
  .left-sub {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.65);
    line-height: 1.6;
  }

  .stat-pill {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 10px 16px;
    backdrop-filter: blur(4px);
  }
  .stat-value {
    font-size: 18px;
    font-weight: 800;
    color: white;
    line-height: 1;
  }
  .stat-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 3px;
  }

  /* ── Right panel ─────────────────────────────────────────────────────────── */
  .right-panel {
    flex: 1;
    background: #f8fafc;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 48px;
    position: relative;
    overflow-y: auto;
  }

  /* ── Language bar ── */
  .lang-bar {
    position: absolute;
    top: 24px;
    right: 32px;
    display: flex;
    gap: 8px;
  }

  .lang-btn {
    padding: 5px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid #e0e4ee;
    background: white;
    color: #888;
    cursor: pointer;
    transition: all 0.15s;
  }
  .lang-btn.active {
    background: rgb(var(--v-theme-primary));
    border-color: rgb(var(--v-theme-primary));
    color: white;
  }
  .lang-btn:hover:not(.active) {
    border-color: rgb(var(--v-theme-primary));
    color: rgb(var(--v-theme-primary));
  }

  /* Login box */
  .login-box {
    max-width: 380px;
  }

  .login-title {
    font-size: 26px;
    font-weight: 800;
    color: #1a1a2e;
    letter-spacing: -0.5px;
    line-height: 1.2;
  }
  .login-sub {
    font-size: 14px;
    color: #888;
    margin-top: 4px;
  }

  /* Tab toggle */
  .tab-toggle {
    display: flex;
    background: #edf0f7;
    border-radius: 12px;
    padding: 4px;
    gap: 4px;
  }
  .tab-btn {
    flex: 1;
    padding: 9px 0;
    border: none;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 600;
    color: #888;
    background: transparent;
    cursor: pointer;
    transition: all 0.18s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tab-btn.active {
    background: white;
    color: rgb(var(--v-theme-primary));
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  /* PIN dots */
  .pin-dots-row {
    display: flex;
    justify-content: center;
    gap: 14px;
  }
  .pin-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid #c5cadc;
    background: transparent;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .pin-dot.filled {
    background: rgb(var(--v-theme-primary));
    border-color: rgb(var(--v-theme-primary));
    transform: scale(1.15);
    box-shadow: 0 0 0 4px rgba(var(--v-theme-primary), 0.15);
  }

  /* Numpad */
  .pin-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    max-width: 280px;
    margin: 0 auto;
  }
  .pin-key {
    aspect-ratio: 1;
    background: white;
    border: 1px solid #e8eaf2;
    border-radius: 14px;
    font-size: 20px;
    font-weight: 700;
    color: #1a1a2e;
    cursor: pointer;
    transition: all 0.12s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pin-key:hover:not(:disabled) {
    background: rgb(var(--v-theme-primary));
    color: white;
    border-color: rgb(var(--v-theme-primary));
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.3);
  }
  .pin-key:active:not(:disabled) {
    transform: translateY(0);
  }
  .pin-key--ghost {
    visibility: hidden;
    pointer-events: none;
  }
  .pin-key--del {
    color: #e53935;
  }
  .pin-key--del:hover:not(:disabled) {
    background: #e53935;
    color: white;
    border-color: #e53935;
  }
  .mode-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 16px;
    border-radius: 9px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    background: transparent;
    position: relative;
    z-index: 1;
    color: #64748b;
    transition: color 0.2s;
  }

  .mode-btn.active {
    color: #0f172a;
  }
  /* Submit button */
  .submit-btn {
    font-weight: 700 !important;
    letter-spacing: 0.3px;
  }

  /* Fade transition */
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.18s ease;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }

  .login-footer {
    opacity: 0.45;
  }
</style>
