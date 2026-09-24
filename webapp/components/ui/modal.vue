<script setup lang="ts">
const props = defineProps<{
  open: boolean;
  title: string;
}>();

const emit = defineEmits<{
  "update:open": [boolean];
  show: [];
}>();

const dialogEl = ref<HTMLDialogElement | null>(null);

watch(
  () => props.open,
  (isOpen) => {
    const dialog = dialogEl.value;
    if (!dialog) {return;}
    if (isOpen && !dialog.open) {
      dialog.showModal();
      emit("show");
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  },
);

const onClose = () => {
  emit("update:open", false);
};
</script>

<template>
  <dialog
    ref="dialogEl"
    class="ui-modal"
    @close="onClose"
    @click.self="dialogEl?.close()"
  >
    <form
      method="dialog"
      class="ui-modal-panel"
      @submit.prevent
    >
      <header class="ui-modal-header">
        <h2 class="text-lg font-black text-slate-900">
          {{ title }}
        </h2>
        <button
          type="button"
          class="ui-modal-close"
          aria-label="Close"
          @click="dialogEl?.close()"
        >
          ×
        </button>
      </header>
      <div class="ui-modal-body">
        <slot />
      </div>
      <footer
        v-if="$slots.footer"
        class="ui-modal-footer"
      >
        <slot name="footer" />
      </footer>
    </form>
  </dialog>
</template>
