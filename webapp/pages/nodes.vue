<template>
  <div class="flex flex-col max-w-6xl gap-6 mx-auto text-slate-900">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900">
          Nodes
        </h1>
        <p class="mt-1 text-sm text-slate-600">
          See how selected images are distributed across your cluster nodes.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Button
          icon="pi pi-refresh"
          rounded
          raised
          class="inline-flex bg-[#4EC8D8] border border-black text-slate-900 hover:bg-[#3bb6c7]"
          @click="refresh()"
        />
      </div>
    </header>

    <section
      class="px-4 py-3 border shadow-sm rounded-2xl border-slate-200 bg-white/90 backdrop-blur"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Images focus
          </p>
          <p class="mt-1 text-xs text-slate-500">
            Select images to see which nodes are running them.
          </p>
        </div>

        <MultiSelect
          v-model="selectedImages"
          :options="imageOptions"
          optionLabel="label"
          optionValue="value"
          filter
          display="chip"
          placeholder="Select images"
          :maxSelectedLabels="3"
          :highlightOnSelect="true"
          class="w-full min-w-[240px] max-w-xl text-xs"
        />
      </div>

      <div v-if="selectedImages.length" class="flex flex-wrap gap-2 mt-3">
        <div
          v-for="(image, index) in selectedImages"
          :key="image"
          class="inline-flex items-center gap-2 rounded-full border border-black px-3 py-1 text-[11px] font-medium text-white shadow-[3px_3px_0_0_#000]"
          :style="{ backgroundColor: pastelColors[index % pastelColors.length] }"
        >
          <span class="max-w-xs truncate">{{ image }}</span>
        </div>
      </div>
    </section>

    <section
      class="overflow-hidden border shadow-sm rounded-2xl border-slate-200 bg-white/90 backdrop-blur"
    >
      <div
        v-if="pending"
        class="flex min-h-[260px] flex-col items-center justify-center gap-4 p-8"
      >
        <div class="relative w-12 h-12">
          <div
            class="absolute inset-0 rounded-full border-4 border-black bg-[#4EC8D8] opacity-40 animate-ping"
          ></div>
          <div
            class="absolute inset-1 rounded-full border-4 border-black bg-[#4A0AAA] animate-[spin_1.1s_linear_infinite]"
          ></div>
        </div>
        <p class="text-sm font-medium text-slate-800">Loading node information…</p>
      </div>

      <div
        v-else-if="error"
        class="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center"
      >
        <p class="text-sm font-semibold text-red-700">
          Something went wrong while loading nodes.
        </p>
        <p class="text-xs text-slate-600">
          {{ error?.message || "Please try again in a moment." }}
        </p>
        <Button
          label="Retry"
          icon="pi pi-refresh"
          rounded
          raised
          class="mt-2 bg-[#4EC8D8] border border-black text-slate-900 hover:bg-[#3bb6c7]"
          @click="refresh()"
        />
      </div>

      <div
        v-else-if="!nodesArray.length"
        class="flex min-h-[220px] flex-col items-center justify-center gap-2 p-8 text-center"
      >
        <p class="text-sm font-semibold text-slate-800">
          No nodes reported yet.
        </p>
        <p class="text-xs text-slate-500">
          Agents may still be sending their first heartbeat. Check again in a few
          seconds.
        </p>
      </div>

      <div v-else class="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="node in nodesArray"
          :key="node"
          class="flex flex-col justify-between rounded-2xl border-4 border-black bg-white px-4 py-3 shadow-[4px_4px_0_0_#000]"
        >
          <div>
            <p class="text-sm font-semibold truncate text-slate-900">
              {{ node }}
            </p>

            <p v-if="!selectedImages.length" class="mt-1 text-xs text-slate-500">
              {{ getImagesCountByNodeName(node) }} images detected
            </p>
          </div>

          <div v-if="selectedImages.length" class="grid grid-cols-4 gap-2 mt-3">
            <div
              v-for="(image, index) in selectedImages"
              :key="image"
              v-tippy="{ content: image }"
              class="relative flex items-center justify-center rounded-lg border border-black text-[10px] font-semibold text-white transition-transform hover:scale-105"
              :style="{ backgroundColor: pastelColors[index % pastelColors.length] }"
              :class="{
                'shadow-[2px_2px_0_0_#000] opacity-100': doesNodeHasThisImage(node, image),
                'shadow-none opacity-40': !doesNodeHasThisImage(node, image),
              }"
            >
              <span class="px-1 truncate">
                {{ index + 1 }}
              </span>
              <span
                class="absolute w-4 h-4 border-2 border-white rounded-full -right-1 -top-1"
                :class="
                  doesNodeHasThisImage(node, image) ? 'bg-green-500' : 'bg-red-700'
                "
              ></span>
            </div>
          </div>

          <div class="flex items-center justify-between mt-3 text-xs">
            <div class="mr-2 font-semibold text-slate-900">
              {{
                selectedImages.length
                  ? `${countHowManyImagesTheNodeHas(
                      node,
                      selectedImages
                    )} / ${selectedImages.length} images`
                  : 'No reference images selected'
              }}
            </div>

            <div
              v-if="selectedImages.length"
              class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
              :class="{
                'bg-green-200 text-green-900':
                  calculateImagePercentageByNode(node, selectedImages) > 60,
                'bg-yellow-200 text-yellow-900':
                  calculateImagePercentageByNode(node, selectedImages) <= 60 &&
                  calculateImagePercentageByNode(node, selectedImages) >= 40,
                'bg-red-200 text-red-900':
                  calculateImagePercentageByNode(node, selectedImages) < 40,
              }"
            >
              {{ calculateImagePercentageByNode(node, selectedImages) }}%
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const pastelColors: string[] = [
  "#FF6B81", // Pastel Pink foncé
  "#6CA0DC", // Pastel Blue foncé
  "#47B174", // Pastel Green foncé
  "#FFE066", // Pastel Yellow foncé
  "#C586C0", // Pastel Purple foncé
  "#FF9F43", // Pastel Orange foncé
  "#3EC1C1", // Pastel Mint foncé
  "#B39CD0", // Pastel Lavender foncé
  "#FFB085", // Pastel Peach foncé
  "#A9A9A9", // Pastel Gray foncé
];

const $config = useRuntimeConfig();
const { data, pending, error, refresh } = useFetch<ImageInfo[]>(
  `${$config.public.serverEndpoint}/api/images`
);

const selectedImages = ref<string[]>([]);

const imageOptions = computed(() =>
  Array.from(
    new Set(
      (data.value || []).map((node) => `${node.repository}:${node.tag}`)
    )
  )
    .sort()
    .map((image) => ({ label: image, value: image }))
);

const nodesArray = computed(
  () => Array.from(new Set(data.value?.map((node) => node.hostname) || [])).sort()
);
const getImagesCountByNodeName = (nodeName: string) => {
  return data.value?.filter((node) => node.hostname === nodeName)?.length ?? 0;
};
const doesNodeHasThisImage = (nodeName: string, imageName: string) => {
  return (
    data.value
      ?.filter((node) => node.hostname === nodeName)
      .find((image) => `${image.repository}:${image.tag}` === imageName) !==
    undefined
  );
};
const countHowManyImagesTheNodeHas = (nodeName: string, imageNames: string[]) => {
  const allImages =
    data.value
      ?.filter((node) => node.hostname === nodeName)
      .map((node) => `${node.repository}:${node.tag}`) ?? [];
  return imageNames.filter((v) => allImages.includes(v)).length;
};
const calculateImagePercentageByNode = (nodeName: string, selectedImages: string[]) => {
  if (!selectedImages.length) return 0;

  return Math.floor(
    (countHowManyImagesTheNodeHas(nodeName, selectedImages) /
      selectedImages.length) *
      100
  );
};
</script>
