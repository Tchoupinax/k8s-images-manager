<template>
  <div
    class="flex w-full flex-1 flex-col gap-6 overflow-hidden pr-1.5 pb-1.5 [@media(min-aspect-ratio:21/9)]:max-w-[1920px] [@media(min-aspect-ratio:21/9)]:mx-auto"
  >
    <header class="flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900">
          Images
        </h1>
        <p class="mt-1 text-sm text-slate-600">
          Visualize and control container images detected across your cluster.
        </p>
      </div>

      <div class="flex items-center gap-3 mr-3">
        <Button
          icon="pi pi-trash"
          label="Clean"
          class="btn-danger"
          :loading="isCleaning"
          :disabled="!allImages.length"
          @click="onCleanAll()"
        />
        <Button
          icon="pi pi-refresh"
          label="Refresh"
          class="btn-aqua"
          @click="refresh()"
        />
      </div>
    </header>

    <section
      v-if="images && images.length"
      class="grid gap-4 shrink-0 sm:grid-cols-4"
    >
      <div
        class="rounded-2xl border-4 border-black bg-white px-4 py-3 shadow-[4px_4px_0_0_#000]"
      >
        <p class="text-xs font-black uppercase tracking-[0.18em] text-slate-900">
          Total images
        </p>
        <p class="mt-1 text-2xl font-black text-slate-900">
          {{ totalImages }}
        </p>
      </div>

      <div
        class="rounded-2xl border-4 border-black bg-white px-4 py-3 shadow-[4px_4px_0_0_#000]"
      >
        <p class="text-xs font-black uppercase tracking-[0.18em] text-slate-900">
          Unique repositories
        </p>
        <p class="mt-1 text-2xl font-black text-slate-900">
          {{ totalRepositories }}
        </p>
      </div>

      <div
        class="rounded-2xl border-4 border-black bg-white px-4 py-3 shadow-[4px_4px_0_0_#000]"
      >
        <p class="text-xs font-black uppercase tracking-[0.18em] text-slate-900">
          Nodes reporting
        </p>
        <p class="mt-1 text-2xl font-black text-slate-900">
          {{ totalNodes }}
        </p>
      </div>

      <div
        class="rounded-2xl border-4 border-black bg-white px-4 py-3 shadow-[4px_4px_0_0_#000]"
      >
        <p class="text-xs font-black uppercase tracking-[0.18em] text-slate-900">
          Total size on disk
        </p>
        <p class="mt-1 text-2xl font-black text-slate-900">
          {{ totalSize }}
        </p>
      </div>
    </section>

    <section
      class="flex flex-col flex-1 min-h-0 overflow-hidden rounded-2xl border-4 border-black bg-white shadow-[4px_4px_0_0_#000]"
    >
      <div
        class="flex flex-col gap-3 px-4 py-3 border-b-4 border-black bg-[#4EC8D8]/40 shrink-0 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p class="text-xs font-black uppercase tracking-[0.2em] text-slate-900">
            Images inventory
          </p>
          <p class="mt-1 text-xs font-medium text-slate-700">
            {{ groupedImages.length }} images after filters.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <MultiSelect
            v-model="selectedHostnames"
            :options="hostnameOptions"
            option-label="label"
            option-value="value"
            placeholder="Filter by node"
            display="chip"
            class="w-full min-w-[180px] max-w-xs text-xs"
          />
        </div>
      </div>

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
        <p class="text-sm font-medium text-slate-800">Loading images…</p>
      </div>

      <div
        v-else-if="error"
        class="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center"
      >
        <p class="text-sm font-semibold text-red-700">
          Something went wrong while loading images.
        </p>
        <p class="text-xs text-slate-600">
          {{ error?.message || "Please try again in a moment." }}
        </p>
        <Button
          label="Retry"
          icon="pi pi-refresh"
          class="mt-2 btn-aqua"
          @click="refresh()"
        />
      </div>

      <div v-else class="flex-1 min-h-0 overflow-auto">
        <table class="min-w-full text-xs text-left">
          <thead
            class="sticky top-0 z-10 border-b-4 border-black bg-[#4A0AAA]"
          >
            <tr class="text-[11px] font-black uppercase tracking-[0.18em] text-white">
              <th class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <button
                    type="button"
                    class="inline-flex shrink-0 items-center gap-1"
                    @click="toggleSort('name')"
                  >
                    <span>Image</span>
                    <i
                      v-if="sortBy === 'name'"
                      class="pi text-[10px]"
                      :class="
                        sortDirection === 'asc'
                          ? 'pi-sort-alpha-down'
                          : 'pi-sort-alpha-up-alt'
                      "
                    ></i>
                  </button>
                  <span class="relative inline-flex min-w-0 flex-1 max-w-sm items-center normal-case tracking-normal">
                    <i
                      class="absolute text-xs pointer-events-none pi pi-search left-3 text-slate-500"
                    ></i>
                    <InputText
                      v-model="search"
                      placeholder="Search repository, tag…"
                      class="w-full rounded-xl border-2 border-black bg-white px-7 py-1.5 text-xs font-medium text-slate-800 shadow-[2px_2px_0_0_#000] focus:outline-none"
                      @click.stop
                    />
                  </span>
                </div>
              </th>
              <th class="px-4 py-3">
                <button
                  type="button"
                  class="inline-flex items-center gap-1"
                  @click="toggleSort('size')"
                >
                  <span>Size</span>
                  <i
                    v-if="sortBy === 'size'"
                    class="pi text-[10px]"
                    :class="
                      sortDirection === 'asc'
                        ? 'pi-sort-amount-up'
                        : 'pi-sort-amount-down'
                    "
                  ></i>
                </button>
              </th>
              <th class="px-4 py-3">
                <button
                  type="button"
                  class="inline-flex items-center gap-1"
                  @click="toggleSort('nodes')"
                >
                  <span>Nodes</span>
                  <i
                    v-if="sortBy === 'nodes'"
                    class="pi text-[10px]"
                    :class="
                      sortDirection === 'asc'
                        ? 'pi-sort-amount-up'
                        : 'pi-sort-amount-down'
                    "
                  ></i>
                </button>
              </th>
              <th class="px-4 py-3">Last seen</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!groupedImages.length">
              <td colspan="5" class="px-4 py-12 text-center">
                <p class="text-sm font-semibold text-slate-800">
                  No images match your filters.
                </p>
                <p class="mt-1 text-xs text-slate-500">
                  Try clearing the node filter or adjusting your search query.
                </p>
              </td>
            </tr>
            <tr
              v-for="image in sortedGroupedImages"
              :key="image.key"
              class="border-b-2 border-black bg-white last:border-b-0 hover:bg-[#4EC8D8]/25"
            >
              <td class="px-4 py-3 align-top">
                <div class="flex items-center justify-between gap-2">
                  <span
                    class="min-w-0 flex-1 truncate font-bold text-slate-900 max-w-[42rem]"
                    :class="isNoneLabel(image.repository) ? 'font-mono text-sm' : 'text-base'"
                  >
                    {{ displayImageRepository(image) }}
                  </span>
                  <span
                    v-if="shouldShowImageTag(image)"
                    class="inline-flex shrink-0 items-center rounded-md border-2 border-black bg-[#4EC8D8] px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-slate-900 shadow-[2px_2px_0_0_#000]"
                  >
                    {{ displayImageTag(image) }}
                  </span>
                </div>
              </td>

              <td class="px-4 py-3 align-top">
                <span class="text-xs font-bold text-slate-800">
                  {{ image.size }}
                </span>
                <span class="block text-[11px] font-medium text-slate-500">
                  {{ image.count }} copy{{ image.count > 1 ? "ies" : "" }}
                </span>
              </td>

              <td class="px-4 py-3 align-top">
                <span
                  v-tooltip.top="
                    image.nodes.length
                      ? image.nodes.join(', ')
                      : 'Not reported on any node'
                  "
                  class="inline-flex items-center rounded-md border-2 border-black px-2 py-0.5 text-[11px] font-black shadow-[2px_2px_0_0_#000]"
                  :class="
                    totalNodes && image.nodes.length === totalNodes
                      ? 'bg-emerald-300 text-emerald-950'
                      : 'bg-white text-slate-800'
                  "
                >
                  {{ image.nodes.length }}
                  <span v-if="totalNodes" class="ml-0.5 font-medium text-slate-500">
                    / {{ totalNodes }}
                  </span>
                </span>
              </td>

              <td class="px-4 py-3 align-top">
                <span class="text-xs whitespace-nowrap text-slate-700">
                  {{ image.lastSeen ? format(image.lastSeen) : "—" }}
                </span>
              </td>

              <td class="px-4 py-3 text-right align-top">
                <div class="inline-flex items-center gap-2">
                  <Button
                    v-tooltip.top="'Pull this image on all nodes'"
                    icon="pi pi-download"
                    class="btn-ink"
                    :loading="isPulling(image)"
                    @click="onPullImage(image)"
                  />
                  <Button
                    v-tooltip.top="'Remove this image on all nodes'"
                    icon="pi pi-trash"
                    class="btn-danger"
                    :loading="isDeleting(image)"
                    @click="onRemoveImage(image)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useToast } from "primevue/usetoast";
import { format } from "timeago.js";

const $config = useRuntimeConfig();
const toast = useToast();

const { data: images, pending, error, refresh } = useFetch<Array<ImageInfo>>(
  () => withServerEndpoint("/api/images", $config.public.serverEndpoint),
  { server: false },
);

const allImages = computed(() => images.value || []);

const totalImages = computed(() => allImages.value.length);
const totalRepositories = computed(
  () => new Set(allImages.value.map(img => img.repository)).size,
);
const totalNodes = computed(
  () => new Set(allImages.value.map(img => img.hostname)).size,
);

const formatBytes = (bytes: number): string => {
  if (bytes === 0) {return "0 B";}
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

const totalSize = computed(() =>
  formatBytes(allImages.value.reduce((sum, img) => sum + parseSize(img.size), 0)),
);

const hostnameOptions = computed(() =>
  Array.from(new Set(allImages.value.map(img => img.hostname)))
    .sort()
    .map(hostname => ({ label: hostname, value: hostname })),
);

const search = ref("");
const selectedHostnames = ref<string[]>([]);

const filteredImages = computed(() => {
  const q = search.value.trim().toLowerCase();

  return allImages.value.filter(img => {
    if (
      selectedHostnames.value.length &&
      !selectedHostnames.value.includes(img.hostname)
    ) {
      return false;
    }

    if (!q) {return true;}

    const haystack = `${img.repository}:${img.tag} ${img.hostname} ${img.digest}`.toLowerCase();

    return haystack.includes(q);
  });
});

const groupedImages = computed(() => {
  const groups = new Map<
    string,
    {
      repository: string;
      tag: string;
      size: string;
      digest: string;
      lastSeen: string | null;
      nodes: Set<string>;
      count: number;
    }
  >();

  for (const img of filteredImages.value) {
    const key = imageGroupKey(img);
    let group = groups.get(key);

    if (!group) {
      group = {
        repository: img.repository,
        tag: img.tag,
        size: img.size,
        digest: img.digest,
        lastSeen: img.date ?? null,
        nodes: new Set<string>(),
        count: 0,
      };
      groups.set(key, group);
    }

    group.count += 1;
    group.nodes.add(img.hostname);

    const date = img.date;
    if (date && (!group.lastSeen || new Date(date) > new Date(group.lastSeen))) {
      group.lastSeen = date;
    }
  }

  return Array.from(groups.values()).map(g => ({
    key: imageGroupKey(g),
    repository: g.repository,
    tag: g.tag,
    size: g.size,
    digest: g.digest,
    lastSeen: g.lastSeen,
    nodes: Array.from(g.nodes).sort(),
    count: g.count,
  }));
});

type RemovableImage = {
  repository: string;
  tag: string;
  digest?: string;
};

const sortBy = ref<"name" | "size" | "nodes">("name");
const sortDirection = ref<"asc" | "desc">("asc");

const parseSize = (size: string | undefined) => {
  if (!size) {return 0;}
  const match = size.match(/([\d.]+)\s*([KMG])?B?/i);
  if (!match) {return 0;}
  const value = parseFloat(match[1] ?? "0");
  const unit = (match[2] ?? "").toUpperCase();
  const factor =
    unit === "G" ? 1024 * 1024 * 1024 : unit === "M" ? 1024 * 1024 : unit === "K" ? 1024 : 1;
  return value * factor;
};

const sortedGroupedImages = computed(() => {
  const items = [...groupedImages.value];

  items.sort((a, b) => {
    let cmp = 0;

    if (sortBy.value === "name") {
      cmp = displayImageRepository(a).localeCompare(displayImageRepository(b));
    } else if (sortBy.value === "size") {
      cmp = parseSize(a.size) - parseSize(b.size);
    } else if (sortBy.value === "nodes") {
      cmp = a.nodes.length - b.nodes.length;
    }

    return sortDirection.value === "asc" ? cmp : -cmp;
  });

  return items;
});

const toggleSort = (field: "name" | "size" | "nodes") => {
  if (sortBy.value === field) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = field;
    sortDirection.value = "asc";
  }
};

const deletingKey = ref<string | null>(null);
const pullingKey = ref<string | null>(null);
const isCleaning = ref(false);

const makeImageKey = (image: RemovableImage) =>
  `${image.repository}:${image.tag}:${image.digest ?? ""}`;

const isDeleting = (image: RemovableImage) =>
  deletingKey.value === makeImageKey(image);

const isPulling = (image: RemovableImage) =>
  pullingKey.value === makeImageKey(image);

const requestPull = async (image: RemovableImage) => {
  const url = serverEndpointUrl("/api/images/pull", $config.public.serverEndpoint, {
    repository: image.repository,
    tag: image.tag,
  });

  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) {
    throw new Error(`Failed with status ${res.status}`);
  }
};

const onPullImage = async (image: RemovableImage) => {
  if (isPulling(image)) {return;}

  pullingKey.value = makeImageKey(image);
  try {
    await requestPull(image);
    toast.add({
      severity: "success",
      summary: "Pull requested",
      detail: `Pulling ${displayImageRepository(image)} on all nodes`,
      life: 3500,
    });
  } catch (e) {
    if (e instanceof Error) {
      toast.add({
        severity: "error",
        summary: "Pull failed",
        detail: e.message,
        life: 4500,
      });
    }
  } finally {
    pullingKey.value = null;
  }
};

const onRemoveImage = async (image: RemovableImage) => {
  if (isDeleting(image)) {return;}

  deletingKey.value = makeImageKey(image);
  try {
    const url = serverEndpointUrl("/api/images", $config.public.serverEndpoint, {
      repository: image.repository,
      tag: image.tag,
    });

    const res = await fetch(url.toString(), { method: "DELETE" });

    if (!res.ok) {
      throw new Error(`Failed with status ${res.status}`);
    }

    toast.add({
      severity: "success",
      summary: "Removal requested",
      detail: `Removing ${displayImageRepository(image)} on all nodes`,
      life: 3500,
    });
  } catch (e) {
    if (e instanceof Error) {
      toast.add({
        severity: "error",
        summary: "Removal failed",
        detail: e?.message ?? "Unable to remove image",
        life: 4500,
      });
    }
  } finally {
    deletingKey.value = null;
  }
};

const onCleanAll = async () => {
  if (isCleaning.value || !allImages.value.length) {return;}

  isCleaning.value = true;
  try {
    const res = await fetch(
      withServerEndpoint("/api/images/all", $config.public.serverEndpoint),
      { method: "DELETE" },
    );
    if (!res.ok) {
      throw new Error(`Failed with status ${res.status}`);
    }

    toast.add({
      severity: "success",
      summary: "Clean requested",
      detail: "Removing every image on every node",
      life: 4000,
    });
  } catch (e) {
    if (e instanceof Error) {
      toast.add({
        severity: "error",
        summary: "Clean failed",
        detail: e.message,
        life: 4500,
      });
    }
  } finally {
    isCleaning.value = false;
  }
};
</script>
