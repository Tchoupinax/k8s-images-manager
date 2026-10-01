<template>
  <div class="flex flex-col gap-2">
    <div
      v-for="(item, index) in items"
      :key="`${index}-${item.label}`"
      v-tippy="{ content: item.tooltip ?? `${item.label}: ${item.display}` }"
      class="grid grid-cols-[minmax(0,7rem)_1fr_auto] sm:grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-3 rounded-md px-1 py-0.5 hover:bg-sky-50"
    >
      <span class="text-xs font-medium truncate text-slate-800" :title="item.label">
        {{ item.label }}
      </span>
      <div class="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          class="h-full rounded-r-[4px] transition-[width] duration-300"
          :style="{ width: `${barWidth(item.value)}%`, backgroundColor: color }"
        ></div>
      </div>
      <span class="text-xs font-semibold text-right tabular-nums text-slate-700">
        {{ item.display }}
      </span>
    </div>

    <p v-if="!items.length" class="py-6 text-xs text-center text-slate-500">
      No data yet.
    </p>
  </div>
</template>

<script setup lang="ts">
export type BarListItem = {
  label: string;
  value: number;
  display: string;
  tooltip?: string;
};

const $props = withDefaults(
  defineProps<{
    items: BarListItem[];
    color?: string;
  }>(),
  { color: "#4A0AAA" },
);

const maxValue = computed(() => Math.max(0, ...$props.items.map(item => item.value)));

const barWidth = (value: number) => {
  if (!maxValue.value) {return 0;}
  // Keep a visible sliver for tiny but non-zero values
  return Math.max((value / maxValue.value) * 100, value > 0 ? 1.5 : 0);
};
</script>
