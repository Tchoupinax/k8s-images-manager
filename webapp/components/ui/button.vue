<script setup lang="ts">
defineOptions({ inheritAttrs: false });

type Variant = "aqua" | "ink" | "danger" | "ghost";

const props = withDefaults(
  defineProps<{
    label?: string;
    variant?: Variant;
    loading?: boolean;
    disabled?: boolean;
    iconOnly?: boolean;
  }>(),
  {
    variant: "aqua",
    loading: false,
    disabled: false,
    iconOnly: false,
  },
);
</script>

<template>
  <button
    type="button"
    class="ui-btn"
    v-bind="$attrs"
    :class="[
      `btn-${props.variant}`,
      {
        'ui-btn-icon-only': props.iconOnly || (!props.label && !!$slots.default),
      },
    ]"
    :disabled="props.disabled || props.loading"
    :aria-busy="props.loading || undefined"
  >
    <span
      v-if="props.loading"
      class="ui-btn-spinner"
      aria-hidden="true"
    />
    <slot v-else />
    <span v-if="props.label">{{ props.label }}</span>
  </button>
</template>
