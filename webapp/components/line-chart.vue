<template>
  <div ref="container" class="relative w-full select-none" :style="{ height: `${height}px` }">
    <svg
      v-if="width > 0"
      :width="width"
      :height="height"
      class="block overflow-visible"
      role="img"
      :aria-label="ariaLabel"
      @pointermove="onPointerMove"
      @pointerleave="hoverIndex = null"
    >
      <g v-for="tick in yTicks" :key="tick">
        <line
          :x1="padding.left"
          :x2="width - padding.right"
          :y1="yScale(tick)"
          :y2="yScale(tick)"
          stroke="#E2E8F0"
          stroke-width="1"
        />
        <text
          :x="padding.left - 8"
          :y="yScale(tick)"
          text-anchor="end"
          dominant-baseline="middle"
          class="fill-slate-500 text-[10px] tabular-nums"
        >
          {{ formatValue(tick) }}
        </text>
      </g>

      <text
        v-for="tick in xTicks"
        :key="tick.x"
        :x="tick.x"
        :y="height - 6"
        text-anchor="middle"
        class="fill-slate-500 text-[10px]"
      >
        {{ tick.label }}
      </text>

      <path :d="areaPath" :fill="color" fill-opacity="0.12" />
      <path
        :d="linePath"
        fill="none"
        :stroke="color"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      />

      <g v-if="hovered">
        <line
          :x1="hovered.x"
          :x2="hovered.x"
          :y1="padding.top"
          :y2="height - padding.bottom"
          stroke="#0F172A"
          stroke-width="1"
          stroke-dasharray="3 3"
        />
        <circle
          :cx="hovered.x"
          :cy="hovered.y"
          r="5"
          :fill="color"
          stroke="#FFFFFF"
          stroke-width="2"
        />
      </g>

      <!-- Full-size hit area so hovering anywhere in the plot picks the nearest point -->
      <rect
        :x="padding.left"
        :y="padding.top"
        :width="Math.max(plotWidth, 0)"
        :height="Math.max(plotHeight, 0)"
        fill="transparent"
      />
    </svg>

    <div
      v-if="hovered"
      class="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border-2 border-black bg-white px-2 py-1 text-[11px] shadow-[2px_2px_0_0_#000]"
      :style="tooltipStyle"
    >
      <p class="font-semibold tabular-nums text-slate-900">
        {{ formatValue(hovered.point.value) }}
      </p>
      <p class="text-slate-500">{{ formatTooltipDate(hovered.point.date) }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
export type LineChartPoint = {
  date: Date;
  value: number;
};

const $props = withDefaults(
  defineProps<{
    points: LineChartPoint[];
    formatValue?: (value: number) => string;
    color?: string;
    height?: number;
    ariaLabel?: string;
  }>(),
  {
    formatValue: (value: number) => `${Math.round(value)}`,
    color: "#4A0AAA",
    height: 240,
    ariaLabel: "Line chart",
  },
);

const padding = { top: 12, right: 16, bottom: 28, left: 64 };

const container = ref<HTMLElement | null>(null);
const width = ref(0);
const hoverIndex = ref<number | null>(null);

let observer: ResizeObserver | null = null;
onMounted(() => {
  if (!container.value) {return;}
  observer = new ResizeObserver(entries => {
    width.value = entries[0]?.contentRect.width ?? 0;
  });
  observer.observe(container.value);
});
onBeforeUnmount(() => observer?.disconnect());

const plotWidth = computed(() => width.value - padding.left - padding.right);
const plotHeight = computed(() => $props.height - padding.top - padding.bottom);

const timeExtent = computed(() => {
  const times = $props.points.map(p => p.date.getTime());
  return { min: Math.min(...times), max: Math.max(...times) };
});

// Rounds the max up to a 1/2/5 × 10^n step so gridlines land on readable values
const yTicks = computed(() => {
  const max = Math.max(0, ...$props.points.map(p => p.value));
  if (max === 0) {return [0, 1];}
  const rawStep = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 5, 10].map(m => m * magnitude).find(s => s >= rawStep) ?? rawStep;
  const ticks: number[] = [];
  for (let tick = 0; tick <= max + step * 0.001; tick += step) {
    ticks.push(tick);
  }
  if ((ticks.at(-1) ?? 0) < max) {ticks.push(ticks.length * step);}
  return ticks;
});

const yMax = computed(() => yTicks.value.at(-1) ?? 1);

const xScale = (time: number) => {
  const { min, max } = timeExtent.value;
  if (max === min) {return padding.left + plotWidth.value / 2;}
  return padding.left + ((time - min) / (max - min)) * plotWidth.value;
};

const yScale = (value: number) =>
  padding.top + plotHeight.value - (value / yMax.value) * plotHeight.value;

const coords = computed(() =>
  $props.points.map(point => ({
    point,
    x: xScale(point.date.getTime()),
    y: yScale(point.value),
  })),
);

const linePath = computed(() =>
  coords.value.map((c, i) => `${i ? "L" : "M"}${c.x},${c.y}`).join(" "),
);

const areaPath = computed(() => {
  const first = coords.value[0];
  const last = coords.value.at(-1);
  if (!first || !last) {return "";}
  const baseline = padding.top + plotHeight.value;
  return `${linePath.value} L${last.x},${baseline} L${first.x},${baseline} Z`;
});

const spanMs = computed(() => timeExtent.value.max - timeExtent.value.min);

const formatAxisDate = (date: Date) =>
  spanMs.value <= 36 * 60 * 60 * 1000
    ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

const formatTooltipDate = (date: Date) =>
  date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const xTicks = computed(() => {
  if (!$props.points.length || plotWidth.value <= 0) {return [];}
  const count = Math.max(2, Math.min(6, Math.floor(plotWidth.value / 110)));
  const { min, max } = timeExtent.value;
  return Array.from({ length: count }, (_, i) => {
    const time = min + ((max - min) * i) / (count - 1);
    return { x: xScale(time), label: formatAxisDate(new Date(time)) };
  });
});

const hovered = computed(() =>
  hoverIndex.value === null ? null : coords.value[hoverIndex.value] ?? null,
);

const onPointerMove = (event: PointerEvent) => {
  const svg = event.currentTarget as SVGSVGElement;
  const x = event.clientX - svg.getBoundingClientRect().left;
  let nearest = 0;
  coords.value.forEach((c, i) => {
    if (Math.abs(c.x - x) < Math.abs((coords.value[nearest]?.x ?? 0) - x)) {nearest = i;}
  });
  hoverIndex.value = coords.value.length ? nearest : null;
};

const tooltipStyle = computed(() => {
  if (!hovered.value) {return {};}
  // Flip to the left of the crosshair near the right edge so the tooltip stays inside
  const flip = hovered.value.x > width.value - 140;
  return {
    top: `${Math.max(hovered.value.y - 48, 0)}px`,
    left: `${hovered.value.x}px`,
    transform: flip ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
  };
});
</script>
