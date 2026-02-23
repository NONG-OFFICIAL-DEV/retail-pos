<template>
  <v-app class="bg-grey-lighten-5">
    <Notif ref="notifRef" dismissible :default-timeout="2000" />
    <Confirm ref="confirmRef" />
    <router-view />
    <Loading />
  </v-app>
</template>

<script setup>
  import { ref, onMounted, getCurrentInstance } from 'vue'
  import Notif from '@/components/global/Notification.vue'
  import Confirm from '@/components/global/Confirm.vue'
  import Loading from '@/components/global/Loading.vue'

  // Refs to components
  const notifRef = ref(null)
  const confirmRef = ref(null)

  // Get current Vue instance
  const instance = getCurrentInstance()

  onMounted(() => {
    const app = instance.appContext.app

    // Register global methods for both Options and Composition APIs
    app.config.globalProperties.$notif = notifRef.value?.newAlert
    app.config.globalProperties.$confirm = confirmRef.value?.open

    // Restore saved language preference
    const savedLang = localStorage.getItem('lang')
    if (savedLang) {
      instance.appContext.config.globalProperties.$i18n.locale = savedLang
    }
  })
</script>

<style>
  html,
  body {
    overflow-y: auto;
    width: 100%;
    overflow-x: hidden;
    overscroll-behavior-x: none;
    height: 100%;
  }

  #app {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #2c3e50;
    -webkit-text-size-adjust: 100%;
  }

  body {
    font-family: 'Poppins', sans-serif;
  }
  ::-webkit-scrollbar {
    display: none;
  }
</style>
