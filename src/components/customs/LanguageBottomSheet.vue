<script setup>
  import { ref, computed, onMounted, getCurrentInstance } from 'vue'
  import { useI18n } from 'vue-i18n'

  const props = defineProps({
    stackedBtn: { type: Boolean, default: true },
    iconBtn: { type: Boolean, default: true }
  })

  const { locale, t } = useI18n()
  const { proxy } = getCurrentInstance()

  // Reactive for bottom sheet (if you want to use it later)
  const langSheet = ref(false)

  // Language list
  const languages = computed(() => [
    {
      lang: 'km',
      imgSrc: 'https://flagcdn.com/w80/kh.png',
      alt: 'Khmer Flag',
      label: t('lang.km')
    },
    {
      lang: 'en',
      imgSrc: 'https://flagcdn.com/w80/gb.png',
      alt: 'English Flag',
      label: t('lang.en')
    }
  ])

  // Current language flag image
  const currentLanguageImage = computed(() =>
    locale.value === 'en'
      ? 'https://flagcdn.com/w80/gb.png'
      : 'https://flagcdn.com/w80/kh.png'
  )

  // Switch language
  const switchLanguage = lang => {
    langSheet.value = false
    locale.value = lang
    localStorage.setItem('lang', lang)
    // If using Vuetify locale
    if (proxy?.$vuetify?.locale) {
      proxy.$vuetify.locale.current = lang
    }
  }

  onMounted(() => {
    const savedLang = localStorage.getItem('lang')
    if (savedLang) {
      locale.value = savedLang
      if (proxy?.$vuetify?.locale) {
        proxy.$vuetify.locale.current = savedLang
      }
    }
  })
</script>

<template>
  <v-btn
    v-if="iconBtn"
    icon
    size="small"
    variant="flat"
    class="swicher-btn"
    @click="langSheet = true"
    :title="locale"
  >
    <v-avatar size="24">
      <v-img :src="currentLanguageImage" />
    </v-avatar>
  </v-btn>

  <v-btn v-if="stackedBtn" class="px-3 rounded-pill" @click="langSheet = true">
    <v-avatar size="24" class="mr-2">
      <v-img :src="currentLanguageImage" />
    </v-avatar>
    <span>{{ locale.toUpperCase() }}</span>
  </v-btn>

  <!-- Optional Bottom Sheet / Dropdown -->
  <v-bottom-sheet v-model="langSheet">
    <v-card class="pa-4 rounded-t-xl">
      <div class="text-h6 mb-4">{{ t('common.selectLanguage') }}</div>
      <v-list>
        <v-list-item
          v-for="lang in languages"
          :key="lang.lang"
          @click="switchLanguage(lang.lang)"
          :active="locale === lang.lang"
          class="rounded-pill mb-2 border"
        >
          <template #prepend>
            <v-avatar size="28">
              <v-img :src="lang.imgSrc" />
            </v-avatar>
          </template>
          <v-list-item-title class="ml-2">{{ lang.label }}</v-list-item-title>
          <template #append v-if="locale === lang.lang">
            <v-icon color="primary">mdi-check-circle</v-icon>
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </v-bottom-sheet>
</template>
<style scoped>
  .swicher-btn {
    border-radius: 14px;
    background: white !important;
    border: 1px solid rgba(0, 0, 0, 0.06);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
  }
</style>
