<script setup>
  import { ref, computed, onMounted, getCurrentInstance } from 'vue'
  import { useI18n } from 'vue-i18n'

  defineProps({
    iconOnly: { type: Boolean, default: false }
  })

  const { locale, t } = useI18n()
  const { proxy } = getCurrentInstance()

  const langMenu = ref(false)

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

  const currentLanguageImage = computed(() =>
    locale.value === 'en'
      ? 'https://flagcdn.com/w80/gb.png'
      : 'https://flagcdn.com/w80/kh.png'
  )

  const switchLanguage = lang => {
    langMenu.value = false
    locale.value = lang
    localStorage.setItem('lang', lang)
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
  <v-menu
    v-model="langMenu"
    :close-on-content-click="false"
    location="bottom end"
    transition="scale-transition"
    offset="8"
  >
    <!-- ── Activator ─────────────────────────────────────────────────── -->
    <template #activator="{ props: menuProps }">
      <!-- Icon only -->
      <v-btn
        v-if="iconOnly"
        v-bind="menuProps"
        icon
        size="small"
        variant="flat"
        class="lang-btn"
      >
        <v-avatar size="22">
          <v-img :src="currentLanguageImage" />
        </v-avatar>
      </v-btn>

      <!-- Icon + label -->
      <v-btn
        v-else
        v-bind="menuProps"
        variant="flat"
        class="lang-btn px-2"
        size="small"
      >
        <v-avatar size="20" class="mr-1">
          <v-img :src="currentLanguageImage" />
        </v-avatar>
        <span class="lang-label">{{ locale.toUpperCase() }}</span>
        <v-icon size="14" class="ml-1" :class="{ 'rotate-180': langMenu }">
          mdi-chevron-down
        </v-icon>
      </v-btn>
    </template>

    <!-- ── Dropdown ──────────────────────────────────────────────────── -->
    <v-card rounded="xl" elevation="3" width="180" class="lang-card">
      <v-list density="compact" nav class="pa-2">
        <v-list-item
          v-for="lang in languages"
          :key="lang.lang"
          :active="locale === lang.lang"
          active-color="primary"
          rounded="lg"
          class="mb-1"
          @click="switchLanguage(lang.lang)"
        >
          <template #prepend>
            <v-avatar size="22">
              <v-img :src="lang.imgSrc" :alt="lang.alt" />
            </v-avatar>
          </template>

          <v-list-item-title class="text-body-2 ml-1">
            {{ lang.label }}
          </v-list-item-title>

          <template v-if="locale === lang.lang" #append>
            <v-icon size="14" color="primary">mdi-check</v-icon>
          </template>
        </v-list-item>
      </v-list>
    </v-card>
  </v-menu>
</template>

<style scoped>
.lang-btn {
  border-radius: 12px;
  background: white !important;
  border: 1px solid rgba(0, 0, 0, 0.07);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.lang-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.lang-card {
  border: 1px solid rgba(0, 0, 0, 0.07);
}

.rotate-180 {
  transform: rotate(180deg);
  transition: transform 0.2s ease;
}
</style>