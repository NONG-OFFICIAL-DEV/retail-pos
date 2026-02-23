<template>
  <v-card class="d-flex justify-space-between py-0 px-0 elevation-0 mb-3 bg-background">
    <div class="header-title-wrapper d-flex align-center">
      <h2 class="d-flex align-center">
        <v-icon class="mr-2" v-if="icon" color="primary">
          {{ icon }}
        </v-icon>
        <!-- {{ $route.name }} -->
        <slot />
      </h2>
    </div>
    <div class="d-flex align-center">
      <slot name="right">
        <v-btn v-if="rightIcon">
          <v-icon>
            {{ rightIcon }}
          </v-icon>
        </v-btn>
      </slot>
    </div>
  </v-card>
</template>

<script>
  export default {
    name: 'CustomTitle',
    props: {
      icon: { type: String, required: false },
      rightIcon: { type: String },
      centeredTitle: { type: Boolean, default: false },
    }
  }
</script>

<style scoped>
  .header-title-wrapper {
    width: 100%;
  }
</style>
