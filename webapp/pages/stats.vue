<template>
  <div
    class="flex w-full flex-1 flex-col gap-4 overflow-hidden text-slate-900 md:gap-6 [@media(min-aspect-ratio:21/9)]:max-w-[1920px] [@media(min-aspect-ratio:21/9)]:mx-auto"
  >
    <header class="flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900">
          Stats
        </h1>
        <p class="mt-1 text-sm text-slate-600">
          Key figures and charts about the images stored across your cluster.
        </p>
      </div>

      <div class="flex w-full items-center gap-2 sm:w-auto sm:mr-3">
        <UiButton
          label="Refresh"
          variant="aqua"
          @click="refreshAll()"
        >
          <IconRefresh />
        </UiButton>
      </div>
    </header>

    <div
      v-if="pending"
      class="flex min-h-[260px] flex-col items-center justify-center gap-4 p-8"
    >
      <div class="relative w-12 h-12">
        <div
          class="absolute inset-0 rounded-full border-4 border-black bg-[#4EC8D8] opacity-40 animate-ping"
        ></div>
        <div
          class="absolute inset-1 rounded-full border-4 border-black bg-[#6DBF8A] animate-[spin_1.1s_linear_infinite]"
        ></div>
      </div>
      <p class="text-sm font-medium text-slate-800">Loading stats…</p>
    </div>

    <div
      v-else-if="error"
      class="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center"
    >
      <p class="text-sm font-semibold text-red-700">
        Something went wrong while loading stats.
      </p>
      <p class="text-xs text-slate-600">
        {{ error?.message || "Please try again in a moment." }}
      </p>
      <UiButton
        label="Retry"
        variant="aqua"
        class="mt-2"
        @click="refreshAll()"
      >
        <IconRefresh />
      </UiButton>
    </div>

    <div
      v-else-if="!allImages.length"
      class="flex min-h-[220px] flex-col items-center justify-center gap-2 p-8 text-center"
    >
      <p class="text-sm font-semibold text-slate-800">
        No images reported yet.
      </p>
      <p class="text-xs text-slate-500">
        Agents may still be sending their first heartbeat. Check again in a few
        seconds.
      </p>
    </div>

    <div v-else class="flex flex-col flex-1 min-h-0 gap-6 pb-2 overflow-auto">
      <section class="grid grid-cols-2 gap-3 shrink-0 sm:grid-cols-3 xl:grid-cols-6">
        <div
          v-for="tile in tiles"
          :key="tile.label"
          class="px-4 py-3 border shadow-sm rounded-2xl border-slate-200 bg-white/90 backdrop-blur"
        >
          <p class="text-xs font-medium tracking-wide uppercase text-slate-500">
            {{ tile.label }}
          </p>
          <p class="mt-1 text-2xl font-black text-slate-900">
            {{ tile.value }}
          </p>
          <p class="mt-0.5 text-[11px] text-slate-500">
            {{ tile.hint }}
          </p>
        </div>
      </section>

      <section :class="cardClass">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p :class="cardTitleClass">Over time</p>
            <p :class="cardSubtitleClass">
              {{ activeMetric.description }} The server records a snapshot every 5 minutes.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <div class="inline-flex p-1 border-2 border-black rounded-xl bg-white shadow-[2px_2px_0_0_#000]">
              <button
                v-for="metric in historyMetrics"
                :key="metric.key"
                type="button"
                :class="segmentClass(selectedMetric === metric.key)"
                @click="selectedMetric = metric.key"
              >
                {{ metric.label }}
              </button>
            </div>
            <div class="inline-flex p-1 border-2 border-black rounded-xl bg-white shadow-[2px_2px_0_0_#000]">
              <button
                v-for="range in historyRanges"
                :key="range"
                type="button"
                :class="segmentClass(selectedRange === range)"
                @click="selectedRange = range"
              >
                {{ range }}
              </button>
            </div>
          </div>
        </div>

        <div class="mt-4">
          <p v-if="historyError" class="py-16 text-xs text-center text-red-700">
            Could not load history: {{ historyError.message }}
          </p>
          <p
            v-else-if="historyPending && !history"
            class="py-16 text-xs text-center text-slate-500"
          >
            Loading history…
          </p>
          <p
            v-else-if="historyPoints.length < 2"
            class="py-16 text-xs text-center text-slate-500"
          >
            Not enough history yet for this range. Come back once a few snapshots have been recorded.
          </p>
          <LineChart
            v-else
            :points="historyPoints"
            :format-value="activeMetric.format"
            :aria-label="`${activeMetric.label} over the last ${selectedRange}`"
          />
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-2">
        <div :class="cardClass">
          <p :class="cardTitleClass">Disk usage per node</p>
          <p :class="cardSubtitleClass">Sum of image sizes stored on each node.</p>
          <BarList :items="diskPerNode" color="#4A0AAA" class="mt-4" />
        </div>

        <div :class="cardClass">
          <p :class="cardTitleClass">Biggest cluster footprint</p>
          <p :class="cardSubtitleClass">
            Top 10 images by size × number of copies.
          </p>
          <BarList :items="topFootprint" color="#4A0AAA" class="mt-4" />
        </div>

        <div :class="cardClass">
          <p :class="cardTitleClass">Image spread</p>
          <p :class="cardSubtitleClass">
            Number of images present on 1, 2, … N nodes.
          </p>

          <div class="flex items-stretch h-48 gap-1 mt-6">
            <div
              v-for="bucket in spreadBuckets"
              :key="bucket.nodes"
              v-tippy="{
                content: `${bucket.count} image${bucket.count > 1 ? 's' : ''} on ${bucket.nodes} node${bucket.nodes > 1 ? 's' : ''}`,
              }"
              class="flex flex-col items-center justify-end flex-1 min-w-0 gap-1 rounded-md hover:bg-sky-50"
            >
              <span class="text-[11px] font-semibold tabular-nums text-slate-700">
                {{ bucket.count || "" }}
              </span>
              <div
                v-if="bucket.count"
                class="w-full max-w-[3rem] rounded-t-[4px] bg-[#4EC8D8] border-2 border-b-0 border-black transition-[height] duration-300"
                :style="{ height: `${spreadHeight(bucket.count)}%` }"
              ></div>
            </div>
          </div>
          <div class="flex gap-1 pt-1 border-t-2 border-black">
            <span
              v-for="bucket in spreadBuckets"
              :key="bucket.nodes"
              class="flex-1 min-w-0 text-[11px] text-center tabular-nums text-slate-500"
            >
              {{ bucket.nodes }}
            </span>
          </div>
          <p class="mt-1 text-[11px] text-center text-slate-500">Nodes</p>
        </div>

        <div :class="cardClass">
          <p :class="cardTitleClass">Registries</p>
          <p :class="cardSubtitleClass">Unique images pulled from each registry.</p>
          <BarList :items="registries" color="#4A0AAA" class="mt-4" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BarListItem } from "~/components/bar-list.vue";

const cardClass =
  "px-4 py-4 border shadow-sm rounded-2xl border-slate-200 bg-white/90 backdrop-blur";
const cardTitleClass = "text-xs font-semibold uppercase tracking-[0.2em] text-slate-500";
const cardSubtitleClass = "mt-1 text-xs text-slate-500";

const $config = useRuntimeConfig();
const { data, pending, error, refresh } = useClientFetch(() =>
  $fetch<ImageInfo[]>(
    withServerEndpoint("/api/images", $config.public.serverEndpoint),
  ),
);

const allImages = computed(() => data.value || []);

type HistoryPoint = {
  date: string;
  nodeCount: number;
  imageCount: number;
  uniqueImageCount: number;
  totalBytes: number;
};

const historyRanges = ["24h", "7d", "30d", "90d"] as const;
const selectedRange = ref<(typeof historyRanges)[number]>("7d");

const {
  data: history,
  pending: historyPending,
  error: historyError,
  refresh: refreshHistory,
} = useClientFetch(() =>
  $fetch<HistoryPoint[]>(
    withServerEndpoint("/api/stats/history", $config.public.serverEndpoint),
    { query: { range: selectedRange.value } },
  ),
);

watch(selectedRange, () => refreshHistory());

const refreshAll = () => Promise.all([refresh(), refreshHistory()]);

type HistoryMetricKey = "totalBytes" | "imageCount" | "uniqueImageCount" | "nodeCount";

const formatCount = (value: number) => `${Math.round(value)}`;

const historyMetrics: Array<{
  key: HistoryMetricKey;
  label: string;
  description: string;
  format: (value: number) => string;
}> = [
  {
    key: "totalBytes",
    label: "Disk",
    description: "Total disk used by images across all nodes.",
    format: (value: number) => formatBytes(value),
  },
  {
    key: "imageCount",
    label: "Copies",
    description: "Number of image copies across all nodes.",
    format: formatCount,
  },
  {
    key: "uniqueImageCount",
    label: "Unique",
    description: "Number of distinct images (repository:tag) in the cluster.",
    format: formatCount,
  },
  {
    key: "nodeCount",
    label: "Nodes",
    description: "Number of nodes reporting.",
    format: formatCount,
  },
];

const selectedMetric = ref<HistoryMetricKey>("totalBytes");

const activeMetric = computed(
  () => historyMetrics.find(m => m.key === selectedMetric.value) ?? historyMetrics[0]!,
);

const historyPoints = computed(() =>
  (history.value ?? []).map(point => ({
    date: new Date(point.date),
    value: point[selectedMetric.value],
  })),
);

const segmentClass = (active: boolean) => [
  "rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors",
  active ? "bg-black text-white" : "text-slate-700 hover:bg-slate-100",
];

const parseSizeToBytes = (sizeStr: string): number => {
  const match = sizeStr.trim().match(/^([\d.]+)\s*([a-zA-Z]*)/);
  if (!match) {return 0;}
  const value = parseFloat(match[1] ?? "0");
  const unit = (match[2] ?? "").toLowerCase();
  const multipliers: Record<string, number> = {
    "": 1, b: 1,
    kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12,
    kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, tib: 1024 ** 4,
  };
  return value * (multipliers[unit] ?? 1);
};

const formatBytes = (bytes: number): string => {
  if (bytes >= 1e12) {return `${(bytes / 1e12).toFixed(1)} TB`;}
  if (bytes >= 1e9) {return `${(bytes / 1e9).toFixed(1)} GB`;}
  if (bytes >= 1e6) {return `${(bytes / 1e6).toFixed(1)} MB`;}
  if (bytes >= 1e3) {return `${(bytes / 1e3).toFixed(1)} kB`;}
  return `${Math.round(bytes)} B`;
};

// Docker convention: the first path segment is a registry only if it looks like a host
const getRegistry = (repository: string): string => {
  const [first, ...rest] = repository.split("/");
  if (rest.length && first && (first.includes(".") || first.includes(":") || first === "localhost")) {
    return first;
  }
  return "docker.io";
};

const nodes = computed(() => Array.from(new Set(allImages.value.map(img => img.hostname))).sort());

const uniqueImages = computed(() => {
  const groups = new Map<string, { name: string; size: number; nodes: Set<string>; copies: number }>();

  for (const img of allImages.value) {
    const name = `${img.repository}:${img.tag}`;
    let group = groups.get(name);
    if (!group) {
      group = { name, size: parseSizeToBytes(img.size), nodes: new Set(), copies: 0 };
      groups.set(name, group);
    }
    group.copies += 1;
    group.nodes.add(img.hostname);
  }

  return Array.from(groups.values());
});

const totalBytes = computed(() =>
  allImages.value.reduce((sum, img) => sum + parseSizeToBytes(img.size), 0),
);
const uniqueBytes = computed(() =>
  uniqueImages.value.reduce((sum, img) => sum + img.size, 0),
);

const tiles = computed(() => {
  const nodeCount = nodes.value.length;
  const singleNode = uniqueImages.value.filter(img => img.nodes.size === 1).length;
  const onAllNodes = uniqueImages.value.filter(img => img.nodes.size === nodeCount).length;

  return [
    {
      label: "Unique images",
      value: uniqueImages.value.length,
      hint: `${new Set(allImages.value.map(img => img.repository)).size} repositories`,
    },
    {
      label: "Image copies",
      value: allImages.value.length,
      hint: `${(allImages.value.length / Math.max(uniqueImages.value.length, 1)).toFixed(1)} copies per image`,
    },
    {
      label: "Nodes",
      value: nodeCount,
      hint: `${Math.round(allImages.value.length / Math.max(nodeCount, 1))} images per node on average`,
    },
    {
      label: "Total disk",
      value: formatBytes(totalBytes.value),
      hint: `${formatBytes(totalBytes.value / Math.max(nodeCount, 1))} per node on average`,
    },
    {
      label: "Duplicated data",
      value: formatBytes(totalBytes.value - uniqueBytes.value),
      hint: `${formatBytes(uniqueBytes.value)} of unique image data`,
    },
    {
      label: "On a single node",
      value: singleNode,
      hint: `${onAllNodes} image${onAllNodes === 1 ? "" : "s"} present on every node`,
    },
  ];
});

const diskPerNode = computed<BarListItem[]>(() => {
  const totals = new Map<string, { bytes: number; count: number }>();
  for (const img of allImages.value) {
    const entry = totals.get(img.hostname) ?? { bytes: 0, count: 0 };
    entry.bytes += parseSizeToBytes(img.size);
    entry.count += 1;
    totals.set(img.hostname, entry);
  }

  return Array.from(totals.entries())
    .sort((a, b) => b[1].bytes - a[1].bytes)
    .map(([hostname, { bytes, count }]) => ({
      label: hostname,
      value: bytes,
      display: formatBytes(bytes),
      tooltip: `${hostname}: ${formatBytes(bytes)} across ${count} images`,
    }));
});

const topFootprint = computed<BarListItem[]>(() =>
  uniqueImages.value
    .map(img => ({ ...img, footprint: img.size * img.copies }))
    .sort((a, b) => b.footprint - a.footprint)
    .slice(0, 10)
    .map(img => ({
      // Registry prefixes are long and shared, so keep only the image name (full name in tooltip)
      label: img.name.split("/").pop() ?? img.name,
      value: img.footprint,
      display: formatBytes(img.footprint),
      tooltip: `${img.name}: ${formatBytes(img.size)} × ${img.copies} cop${img.copies > 1 ? "ies" : "y"}`,
    })),
);

const spreadBuckets = computed(() => {
  const buckets = Array.from({ length: nodes.value.length }, (_, i) => ({ nodes: i + 1, count: 0 }));
  for (const img of uniqueImages.value) {
    const bucket = buckets[img.nodes.size - 1];
    if (bucket) {bucket.count += 1;}
  }
  return buckets;
});

const spreadMax = computed(() => Math.max(0, ...spreadBuckets.value.map(b => b.count)));

const spreadHeight = (count: number) => {
  if (!spreadMax.value || !count) {return 0;}
  // Leave room above the tallest bar for its value label
  return Math.max((count / spreadMax.value) * 85, 2);
};

const registries = computed<BarListItem[]>(() => {
  const counts = new Map<string, { images: number; bytes: number }>();
  for (const img of uniqueImages.value) {
    const registry = getRegistry(img.name);
    const entry = counts.get(registry) ?? { images: 0, bytes: 0 };
    entry.images += 1;
    entry.bytes += img.size;
    counts.set(registry, entry);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1].images - a[1].images)
    .map(([registry, { images, bytes }]) => ({
      label: registry,
      value: images,
      display: `${images}`,
      tooltip: `${registry}: ${images} image${images > 1 ? "s" : ""} · ${formatBytes(bytes)}`,
    }));
});
</script>
