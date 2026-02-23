<template>
  <div>
    <v-snackbar
      v-for="alert in alerts"
      :key="alert.id"
      v-model="alert.visible"
      :timeout="alert.timeout || defaultTimeout"
      location="top"
      rounded="pill"
      elevation="0"
      class="snackbar-item"
      @update:model-value="val => !val && closeAlert(alert.id)"
    >
      <!-- Content -->
      <div class="d-flex align-center gap-2">
        <v-icon size="17" :color="iconColor(alert.type)">
          {{ alert.icon || iconName(alert.type) }}
        </v-icon>
        <span class="snack-message capitalize-first-letter">
          {{ alert.message }}
        </span>
      </div>

      <!-- Close action -->
      <template v-if="alert.dismissible" #actions>
        <v-btn
          icon
          size="x-small"
          variant="text"
          color="rgba(255,255,255,0.6)"
          @click="closeAlert(alert.id)"
        >
          <v-icon size="16">mdi-close</v-icon>
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script>
  export default {
    name: 'NotificationAlert',
    props: {
      outlined:        { type: Boolean, default: true },
      text:            { type: Boolean, default: false },
      dense:           { type: Boolean, default: false },
      prominent:       { type: Boolean, default: false },
      dismissible:     { type: Boolean, default: false },
      defaultTimeout:  { type: Number,  default: 3000 },
      defaultMaxAlert: { type: Number,  default: 4 },
    },
    data() {
      return {
        alerts: [],
      }
    },
    methods: {
      newAlert(
        message,
        {
          type        = 'success',
          icon        = null,
          timeout     = this.defaultTimeout,
          dense       = this.dense,
          prominent   = this.prominent,
          dismissible = this.dismissible,
        } = {}
      ) {
        if (this.alerts.length >= this.defaultMaxAlert) this.alerts.shift()

        const id = new Date().valueOf() + Math.random()
        this.alerts.push({ id, type, icon, message, dense, prominent, dismissible, timeout, visible: true })

        if (timeout) {
          setTimeout(() => this.closeAlert(id), timeout)
        }
      },

      closeAlert(id) {
        this.alerts = this.alerts.filter(el => el.id !== id)
      },

      iconName(type) {
        return {
          success: 'mdi-check-circle-outline',
          error:   'mdi-close-circle-outline',
          warning: 'mdi-alert-outline',
          info:    'mdi-information-outline',
        }[type] || 'mdi-information-outline'
      },

      iconColor(type) {
        return {
          success: '#4ADE80',
          error:   '#FF8A80',
          warning: '#FFD54F',
          info:    '#90CAF9',
        }[type] || '#4ADE80'
      },
    },
  }
</script>

<style scoped>
  .snack-message {
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
    letter-spacing: 0.1px;
  }

  .gap-2 { gap: 8px; }
</style>

<style>
  /* unscoped — targets Vuetify's internal snackbar wrapper */
  .snackbar-item .v-snackbar__wrapper {
    background: #1C1C1E !important;
    min-width: 0 !important;
    max-width: calc(100vw - 32px) !important;
    padding: 10px 16px !important;
  }

  .snackbar-item .v-snackbar__content {
    padding: 0 !important;
  }

  .snackbar-item .v-snackbar__actions {
    padding: 0 !important;
    margin-left: 8px !important;
  }
</style>