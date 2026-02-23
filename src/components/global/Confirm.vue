<template>
  <v-bottom-sheet v-model="dialog" :close-on-content-click="false" @keydown.esc="cancel">
    <v-sheet rounded="t-xl">

      <!-- Drag handle -->
      <div class="d-flex justify-center pt-3 pb-1">
        <div class="bs-handle" />
      </div>

      <!-- Icon + Title -->
      <div class="d-flex flex-column align-center px-6 pt-4 pb-3 text-center">
        <div class="icon-ring mb-4" :class="options.type">
          <v-icon size="26" :color="iconColor">{{ iconName }}</v-icon>
        </div>

        <div class="bs-title">{{ title }}</div>

        <div v-if="message" class="bs-message mt-2" v-html="message" />
      </div>

      <!-- Actions -->
      <div class="d-flex gap-3 px-5 pb-safe mt-2">
        <v-btn
          variant="tonal"
          color="grey"
          rounded="xl"
          height="48"
          class="flex-grow-1 action-btn"
          @click="cancel"
        >
          {{ options.denyBtnText || $t('btn.cancel') }}
        </v-btn>

        <v-btn
          :color="btnColor"
          variant="flat"
          rounded="xl"
          height="48"
          class="flex-grow-1 action-btn"
          @click="agree"
        >
          <v-icon start size="15">{{ confirmIcon }}</v-icon>
          {{ options.agreeBtnText || $t('btn.yes') }}
        </v-btn>
      </div>

    </v-sheet>
  </v-bottom-sheet>
</template>

<script>
  export default {
    name: 'ConfirmDialog',
    data() {
      return {
        dialog: false,
        agreeCallback: null,
        cancelCallback: null,
        message: null,
        title: null,
        options: {
          type: 'error',
          width: 340,
          agreeBtnText: this.$t('btn.delete'),
          denyBtnText: this.$t('btn.cancel'),
        },
      }
    },
    computed: {
      iconName() {
        return {
          error:   'mdi-trash-can-outline',
          warning: 'mdi-alert-outline',
          info:    'mdi-information-outline',
        }[this.options.type] || 'mdi-trash-can-outline'
      },
      confirmIcon() {
        return {
          error:   'mdi-trash-can-outline',
          warning: 'mdi-check',
          info:    'mdi-check',
        }[this.options.type] || 'mdi-check'
      },
      iconColor() {
        return {
          error:   '#E53935',
          warning: '#F59E0B',
          info:    '#2D7A6E',
        }[this.options.type] || '#E53935'
      },
      btnColor() {
        return {
          error:   'error',
          warning: '#F59E0B',
          info:    '#2D7A6E',
        }[this.options.type] || 'error'
      },
    },
    methods: {
      open({ title, message, options, agree = () => {}, cancel = () => {} }) {
        this.dialog  = true
        this.title   = title
        this.message = message
        this.options = Object.assign({ ...this.options }, options)
        this.agreeCallback  = agree
        this.cancelCallback = cancel
      },
      async agree() {
        await this.agreeCallback()
        this.dialog = false
      },
      async cancel() {
        await this.cancelCallback()
        this.dialog = false
      },
    },
  }
</script>

<style scoped>
  .bs-handle {
    width: 36px;
    height: 4px;
    border-radius: 100px;
    background: rgba(0, 0, 0, 0.12);
  }

  .icon-ring {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: popIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  @keyframes popIn {
    from { transform: scale(0.5); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }

  .icon-ring.error   { background: rgba(229, 57, 53, 0.08); }
  .icon-ring.warning { background: rgba(245, 158, 11, 0.08); }
  .icon-ring.info    { background: rgba(45, 122, 110, 0.08); }

  .bs-title {
    font-size: 17px;
    font-weight: 800;
    color: #1C1C1E;
    letter-spacing: -0.2px;
  }

  .bs-message {
    font-size: 13px;
    color: #8E8E93;
    line-height: 1.6;
  }

  .gap-3 { gap: 12px; }

  .action-btn {
    font-size: 14px !important;
    font-weight: 600 !important;
    letter-spacing: 0 !important;
    transition: transform 0.15s !important;
  }

  .action-btn:active { transform: scale(0.96) !important; }

  .pb-safe {
    padding-bottom: max(20px, env(safe-area-inset-bottom));
  }
</style>