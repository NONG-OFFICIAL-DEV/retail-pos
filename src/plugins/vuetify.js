import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { km, en } from 'vuetify/locale'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import * as labs from 'vuetify/labs/components'
import { VDateInput } from 'vuetify/labs/VDateInput'

const vuetify = createVuetify({
  components: {
    VDateInput,
    ...components,
    ...labs
  },
  directives,
  // 👉 DEFAULT PROPS
  defaults: {
    VDateInput: {
      density: 'comfortable',
      variant: 'outlined',
      color: 'primary',
      prependIcon: '',
      appendInnerIcon: '$calendar',
      format: 'DD-MM-YYYY',
      hideActions: true
    },

    VSelect: {
      density: 'comfortable',
      variant: 'outlined',
      color: 'primary'
    },

    // Text field defaults
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary'
    },

    // Textarea defaults
    VTextarea: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary',
      autoGrow: true,
      rows: 3
    },

    // Autocomplete defaults
    VAutocomplete: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary'
    },

    VDataTableServer: {
      class: 'rounded-lg'
    }
  },
  theme: {
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#89474b',
          secondary: '#c17290',
          textField: '#2f9dab',
          icon: '#653748',
          btnEdit: '#a0627f',
          background: '#f8f7f8',
          warning: '#FB8C00',
          error: '#B00020'
        }
      }
    }
  },
  locale: {
    messages: { km, en },
    locale: 'en'
  },
  icons: {
    iconfont: 'mdi'
  },
  date: {
    locale: {
      en: 'en-GB'
    }
  }
})

export default vuetify
