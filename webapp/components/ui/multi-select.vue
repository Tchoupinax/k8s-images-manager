<script setup lang="ts">
export type MultiSelectOption = {
  label: string;
  value: string;
};

const props = withDefaults(
  defineProps<{
    modelValue: string[];
    options: MultiSelectOption[];
    placeholder?: string;
    filter?: boolean;
    maxSelectedLabels?: number;
  }>(),
  {
    placeholder: "Select…",
    filter: false,
    maxSelectedLabels: 3,
  },
);

const emit = defineEmits<{
  "update:modelValue": [string[]];
}>();

const open = ref(false);
const filterQuery = ref("");
const root = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const panelStyle = ref<Record<string, string>>({});

const updatePanelPosition = () => {
  if (!root.value) {return;}
  const rect = root.value.getBoundingClientRect();
  panelStyle.value = {
    top: `${rect.bottom + 6}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  };
};

watch(open, async isOpen => {
  if (!isOpen) {return;}
  updatePanelPosition();
  await nextTick();
  updatePanelPosition();
});

const filteredOptions = computed(() => {
  const q = filterQuery.value.trim().toLowerCase();
  if (!q) {return props.options;}
  return props.options.filter(
    opt => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q),
  );
});

const summary = computed(() => {
  if (!props.modelValue.length) {return props.placeholder;}
  const labels = props.modelValue
    .map(v => props.options.find(o => o.value === v)?.label ?? v)
    .slice(0, props.maxSelectedLabels);
  const extra = props.modelValue.length - labels.length;
  const text = labels.join(", ");
  return extra > 0 ? `${text} +${extra}` : text;
});

const isSelected = (value: string) => props.modelValue.includes(value);

const toggle = (value: string) => {
  const next = isSelected(value)
    ? props.modelValue.filter(v => v !== value)
    : [...props.modelValue, value];
  emit("update:modelValue", next);
};

const onDocumentClick = (event: MouseEvent) => {
  if (!open.value || !root.value) {return;}
  const target = event.target as Node;
  if (!root.value.contains(target) && !panel.value?.contains(target)) {
    open.value = false;
  }
};

const onViewportChange = () => {
  if (open.value) {updatePanelPosition();}
};

onMounted(() => {
  document.addEventListener("click", onDocumentClick);
  // Capture so scrolling any ancestor container keeps the panel attached to the trigger
  window.addEventListener("scroll", onViewportChange, true);
  window.addEventListener("resize", onViewportChange);
});
onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
  window.removeEventListener("scroll", onViewportChange, true);
  window.removeEventListener("resize", onViewportChange);
});
</script>

<template>
  <div ref="root" class="relative text-xs">
    <button
      type="button"
      class="ui-multiselect-trigger"
      :class="{ 'ui-multiselect-trigger-open': open }"
      @click.stop="open = !open"
    >
      <span class="min-w-0 truncate text-left">{{ summary }}</span>
      <span class="shrink-0 text-[10px] font-black" aria-hidden="true">▼</span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panel"
        class="ui-multiselect-panel text-xs"
        :style="panelStyle"
        @click.stop
      >
        <div v-if="filter" class="border-b-2 border-black p-2">
          <input
            v-model="filterQuery"
            type="search"
            placeholder="Filter…"
            class="w-full rounded-lg border-2 border-black bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6DBF8A]"
          >
        </div>
        <ul class="max-h-56 overflow-auto p-1">
          <li
            v-for="opt in filteredOptions"
            :key="opt.value"
          >
            <label
              class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[#4EC8D8]/30"
            >
              <input
                type="checkbox"
                class="size-3.5 rounded border-2 border-black accent-[#6DBF8A]"
                :checked="isSelected(opt.value)"
                @change="toggle(opt.value)"
              >
              <span class="min-w-0 truncate text-slate-900">{{ opt.label }}</span>
            </label>
          </li>
          <li
            v-if="!filteredOptions.length"
            class="px-2 py-3 text-center text-slate-500"
          >
            No matches
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>
