import { createI18n } from 'vue-i18n'

const dateTimeFormats = {
  kh: {
    date: {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    },
    datetime: {
      minute: 'numeric',
      hour: 'numeric',
      hour12: false,
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    },
    short: {
      day: 'numeric',
      month: 'numeric'
    },
    long: {
      minute: 'numeric',
      hour: 'numeric',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    },
    monthYear: {
      month: 'short',
      year: 'numeric'
    }
  }
}

function loadLocaleMessages() {
  const locales = import.meta.glob("../locales/*.json", { eager: true });
  const localesKey = Object.keys(locales);
  const messages = {};
  localesKey.forEach((key) => {
    const matched = key.match(/([A-Za-z0-9-_]+)\./i);
    if (matched && matched.length > 1) {
      const locale = matched[1].split("_")[0];
      messages[locale] = locales[key];
    }
  });
  return messages;
}

const i18n = createI18n({
  legacy: false, // for Vue 3, set to false
  locale: import.meta.env.VUE_APP_I18N_LOCALE || 'en',
  fallbackLocale: import.meta.env.VUE_APP_I18N_FALLBACK_LOCALE || 'en',
  messages: loadLocaleMessages(),
  dateTimeFormats
})

export function translateRoute(routeName) {
  return i18n.global.t(routeName)
}

export default i18n
