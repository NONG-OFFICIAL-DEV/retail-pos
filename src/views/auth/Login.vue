<script setup>
  import { ref, reactive } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '@/stores/authStore'
  import { useAppUtils } from '@/composables/useAppUtils'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()
  const { notif } = useAppUtils()
  const email = ref('')
  const password = ref('')
  const store = useAuthStore()
  const router = useRouter()
  const errors = reactive({
    email: '',
    password: '',
    general: ''
  })
  const visible = ref(false)
  const login = async () => {
    // clear previous errors
    errors.email = ''
    errors.password = ''
    errors.general = ''

    try {
      const success = await store.login({
        email: email.value,
        password: password.value
      })

      if (success) {
        router.push('/mart')

        notif(t('messages.login_sucess'), {
          type: 'success',
          color: 'primary'
        })
      }
    } catch (err) {
      const res = err.response?.data
      if (res?.status === 'validation_error') {
        errors.email = res.errors.email?.join(', ')
        errors.password = res.errors.password?.join(', ')
      }
      if (res?.status == 'invalid_credentials') {
        // console.log(res.status == 'invalid_credentials')
        errors.general = res.message
      }
    }
  }
</script>

<template>
  <v-container fluid class="login-page d-flex align-center justify-center pa-0">
    <div class="bg-shape shape-1"></div>
    <div class="bg-shape shape-2"></div>

    <v-card
      class="glass-card pa-10"
      width="100%"
      max-width="450"
      border="1px solid rgba(255,255,255,0.3)"
    >
      <div class="text-center mb-10">
        <div class="logo-wrapper mb-4">
          <v-icon icon="mdi-lightning-bolt" color="amber-darken-2" size="40" />
        </div>
        <h1 class="text-h4 font-weight-black tracking-tight text-slate-900">
          Nexus POS
        </h1>
        <p class="text-body-2 text-grey-darken-1 mt-2">
          Enter credentials to access your station
        </p>
      </div>

      <v-form @submit.prevent="login" class="fade-in">
        <v-text-field
          v-model="email"
          label="Email"
          variant="outlined"
          rounded="lg"
          prepend-inner-icon="mdi-email-outline"
          class="mb-4"
          density="comfortable"
          :error="!!errors.email"
          :error-messages="errors.email"
          required
        />

        <v-text-field
          v-model="password"
          label="Password"
          variant="outlined"
          rounded="lg"
          :append-inner-icon="visible ? 'mdi-eye-off' : 'mdi-eye'"
          :type="visible ? 'text' : 'password'"
          prepend-inner-icon="mdi-lock-outline"
          density="comfortable"
          :error="!!errors.password"
          :error-messages="errors.password"
          required
          @click:append-inner="visible = !visible"
        />
        <v-alert
          type="error"
          density="compact"
          v-if="errors.general"
          class="text-red mt-2"
        >
          {{ errors.general }}
        </v-alert>

        <v-btn
          type="submit"
          block
          height="56"
          elevation="0"
          class="login-gradient-btn mt-8 text-none text-subtitle-1 font-weight-bold bg-primary"
          :loading="loading"
        >
          Authorize Access
          <v-icon icon="mdi-arrow-right" end class="ml-2" />
        </v-btn>
      </v-form>
    </v-card>
  </v-container>
</template>

<style scoped>
  /* 1. Background Styling */
  .login-page {
    height: 100vh;
    background-color: #f8fafc;
    position: relative;
    overflow: hidden;
  }

  .bg-shape {
    position: absolute;
    filter: blur(80px);
    z-index: 0;
    border-radius: 50%;
  }

  .shape-1 {
    width: 400px;
    height: 400px;
    background: rgba(24, 103, 192, 0.15);
    top: -100px;
    right: -50px;
  }

  .shape-2 {
    width: 300px;
    height: 300px;
    background: rgba(92, 187, 255, 0.2);
    bottom: -50px;
    left: -50px;
  }

  /* 2. Glassmorphism Card */
  .glass-card {
    background: rgba(255, 255, 255, 0.7) !important;
    backdrop-filter: blur(20px);
    border-radius: 24px !important;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.05) !important;
    z-index: 1;
  }

  /* 3. Typography & Inputs */
  .tracking-tight {
    letter-spacing: -0.05em;
  }

  .custom-label {
    display: block;
    color: #64748b;
    margin-bottom: 6px;
    margin-left: 4px;
  }

  /* 4. The Button */
  .login-gradient-btn {
    color: white !important;
    border-radius: 12px !important;
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .login-gradient-btn:hover {
    transform: scale(1.02);
  }

  /* 5. Error Toast */
  .error-toast {
    background: #fef2f2;
    color: #dc2626;
    border-left: 4px solid #dc2626;
    border-radius: 8px;
  }

  .logo-wrapper {
    width: 64px;
    height: 64px;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    border-radius: 16px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
</style>
