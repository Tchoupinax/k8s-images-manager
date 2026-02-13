<template>
  <div class="flex flex-col max-w-6xl gap-6 mx-auto">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900">
          Images
        </h1>
        <p class="mt-1 text-sm text-slate-600">
          Visualize and control container images detected across your cluster.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <Button
          icon="pi pi-refresh"
          label="Refresh"
          rounded
          raised
          class="hidden sm:inline-flex bg-[#4EC8D8] border border-black text-slate-900 hover:bg-[#3bb6c7]"
          @click="refresh()"
        />
        <Button
          icon="pi pi-refresh"
          rounded
          raised
          class="inline-flex sm:hidden bg-[#4EC8D8] border border-black text-slate-900 hover:bg-[#3bb6c7]"
          @click="refresh()"
        />
      </div>
    </header>

    <section
      class="grid gap-3 sm:grid-cols-3"
      v-if="images && images.length"
    >
      <div
        class="px-4 py-3 border shadow-sm rounded-2xl border-slate-200 bg-white/90 backdrop-blur"
      >
        <p class="text-xs font-medium tracking-wide uppercase text-slate-500">
          Total images
        </p>
        <p class="mt-1 text-2xl font-black text-slate-900">
          {{ totalImages }}
        </p>
      </div>

      <div
        class="px-4 py-3 border shadow-sm rounded-2xl border-slate-200 bg-white/90 backdrop-blur"
      >
        <p class="text-xs font-medium tracking-wide uppercase text-slate-500">
          Unique repositories
        </p>
        <p class="mt-1 text-2xl font-black text-slate-900">
          {{ totalRepositories }}
        </p>
      </div>

      <div
        class="px-4 py-3 border shadow-sm rounded-2xl border-slate-200 bg-white/90 backdrop-blur"
      >
        <p class="text-xs font-medium tracking-wide uppercase text-slate-500">
          Nodes reporting
        </p>
        <p class="mt-1 text-2xl font-black text-slate-900">
          {{ totalNodes }}
        </p>
      </div>
    </section>

    <section
      class="overflow-hidden border shadow-sm rounded-2xl border-slate-200 bg-white/90 backdrop-blur"
    >
      <div
        class="flex flex-col gap-3 px-4 py-3 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Images inventory
          </p>
          <p class="mt-1 text-xs text-slate-500">
            {{ groupedImages.length }} images after filters.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <MultiSelect
            v-model="selectedHostnames"
            :options="hostnameOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Filter by node"
            display="chip"
            class="w-full min-w-[180px] max-w-xs text-xs"
          />

          <span class="relative inline-flex items-center flex-1 max-w-xs">
            <i
              class="absolute text-xs pointer-events-none pi pi-search left-2 text-slate-400"
            ></i>
            <InputText
              v-model="search"
              placeholder="Search repository, tag, digest…"
              class="w-full rounded-lg border border-slate-300 bg-white px-7 py-2 text-xs text-slate-800 shadow-[2px_2px_0_0_#00000020] focus:border-sky-500 focus:outline-none"
            />
          </span>
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
          rounded
          raised
          class="mt-2 bg-[#4EC8D8] border border-black text-slate-900 hover:bg-[#3bb6c7]"
          @click="refresh()"
        />
      </div>

      <div
        v-else-if="!groupedImages.length"
        class="flex min-h-[220px] flex-col items-center justify-center gap-2 p-8 text-center"
      >
        <p class="text-sm font-semibold text-slate-800">
          No images match your filters.
        </p>
        <p class="text-xs text-slate-500">
          Try clearing the node filter or adjusting your search query.
        </p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-xs text-left border-t border-slate-100">
          <thead
            class="sticky top-0 z-10 border-b bg-slate-50/90 backdrop-blur border-slate-100"
          >
            <tr class="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <th class="px-4 py-3 font-semibold">
                <button
                  type="button"
                  class="inline-flex items-center gap-1"
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
              </th>
              <th class="px-4 py-3 font-semibold">Nodes</th>
              <th class="px-4 py-3 font-semibold">
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
              <th class="px-4 py-3 font-semibold">Last seen</th>
              <th class="px-4 py-3 font-semibold">Digest</th>
              <th class="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="image in sortedGroupedImages"
              :key="image.key"
              class="border-t border-l-4 border-slate-100 bg-white/70 last:border-b hover:bg-sky-50/60"
              :class="
                image.nodes.length > 3
                  ? 'border-l-[#4A0AAA]'
                  : 'border-l-[#4EC8D8]'
              "
            >
              <td class="px-4 py-3 align-top">
                <div class="flex items-center justify-between gap-2">
                  <span
                    class="truncate text-xs font-medium text-slate-900 max-w-[220px] flex-1"
                  >
                    {{ image.repository }}
                  </span>
                  <span
                    class="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-900"
                  >
                    {{ image.tag }}
                  </span>
                </div>
              </td>

              <td class="px-4 py-3 align-top">
                <div class="flex flex-col gap-1">
                  <span class="text-[11px] font-medium text-slate-800">
                    {{ image.nodes.length }} node{{ image.nodes.length > 1 ? "s" : "" }}
                  </span>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="hostname in image.nodes.slice(0, 3)"
                      :key="hostname"
                      class="inline-flex max-w-[120px] items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                    >
                      <span class="truncate">{{ hostname }}</span>
                    </span>
                    <span
                      v-if="image.nodes.length > 3"
                      class="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-800"
                    >
                      +{{ image.nodes.length - 3 }} more
                    </span>
                  </div>
                </div>
              </td>

              <td class="px-4 py-3 align-top">
                <span class="text-xs font-medium text-slate-800">
                  {{ image.size }}
                </span>
                <span class="block text-[11px] text-slate-500">
                  {{ image.count }} copy{{ image.count > 1 ? "ies" : "" }}
                </span>
              </td>

              <td class="px-4 py-3 align-top">
                <span class="text-xs whitespace-nowrap text-slate-700">
                  {{ image.lastSeen ? format(image.lastSeen) : "—" }}
                </span>
              </td>

              <td class="px-4 py-3 align-top">
                <span class="font-mono text-[11px] text-slate-700">
                  {{ image.digest?.slice(0, 18) }}<span
                    v-if="image.digest && image.digest.length > 18"
                    >…</span
                  >
                </span>
              </td>

              <td class="px-4 py-3 text-right align-top">
                <Button
                  icon="pi pi-trash"
                  class="!h-8 !w-8 !p-0 bg-red-500 border border-black text-white hover:bg-red-600"
                  v-tooltip.top="'Remove this image on all nodes'"
                  :loading="isDeleting(image)"
                  @click="onRemoveImage(image)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { format } from "timeago.js";
import { useToast } from "primevue/usetoast";

const $config = useRuntimeConfig();
const toast = useToast();

const { data: images, pending, error, refresh } = useFetch<Array<ImageInfo>>(
  `${$config.public.serverEndpoint}/api/images`
);

const allImages = computed(() => images.value || []);

const totalImages = computed(() => allImages.value.length);
const totalRepositories = computed(
  () => new Set(allImages.value.map((img) => img.repository)).size
);
const totalNodes = computed(
  () => new Set(allImages.value.map((img) => img.hostname)).size
);

const hostnameOptions = computed(() =>
  Array.from(new Set(allImages.value.map((img) => img.hostname)))
    .sort()
    .map((hostname) => ({ label: hostname, value: hostname }))
);

const search = ref("");
const selectedHostnames = ref<string[]>([]);

const filteredImages = computed(() => {
  const q = search.value.trim().toLowerCase();

  return allImages.value.filter((img) => {
    if (
      selectedHostnames.value.length &&
      !selectedHostnames.value.includes(img.hostname)
    ) {
      return false;
    }

    if (!q) return true;

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
    const key = `${img.repository}:${img.tag}`;
    let group = groups.get(key);

    if (!group) {
      group = {
        repository: img.repository,
        tag: img.tag,
        size: img.size,
        digest: img.digest,
        lastSeen: (img as any).date ?? null,
        nodes: new Set<string>(),
        count: 0,
      };
      groups.set(key, group);
    }

    group.count += 1;
    group.nodes.add(img.hostname);

    const date = (img as any).date;
    if (date && (!group.lastSeen || new Date(date) > new Date(group.lastSeen))) {
      group.lastSeen = date;
    }
  }

  return Array.from(groups.values()).map((g) => ({
    key: `${g.repository}:${g.tag}`,
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

const sortBy = ref<"name" | "size">("name");
const sortDirection = ref<"asc" | "desc">("asc");

const parseSize = (size: string | undefined) => {
  if (!size) return 0;
  const match = size.match(/([\d.]+)\s*([KMG])?B?/i);
  if (!match) return 0;
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
      cmp = a.repository.localeCompare(b.repository);
    } else if (sortBy.value === "size") {
      cmp = parseSize(a.size) - parseSize(b.size);
    }

    return sortDirection.value === "asc" ? cmp : -cmp;
  });

  return items;
});

const toggleSort = (field: "name" | "size") => {
  if (sortBy.value === field) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = field;
    sortDirection.value = "asc";
  }
};

const deletingKey = ref<string | null>(null);

const makeImageKey = (image: RemovableImage) =>
  `${image.repository}:${image.tag}:${image.digest ?? ""}`;

const isDeleting = (image: RemovableImage) =>
  deletingKey.value === makeImageKey(image);

const onRemoveImage = async (image: RemovableImage) => {
  if (isDeleting(image)) return;

  deletingKey.value = makeImageKey(image);
  try {
    const url = new URL(
      `${$config.public.serverEndpoint}/api/images`
    );
    url.searchParams.set("repository", image.repository);
    url.searchParams.set("tag", image.tag);

    const res = await fetch(url.toString(), { method: "DELETE" });

    if (!res.ok) {
      throw new Error(`Failed with status ${res.status}`);
    }

    toast.add({
      severity: "success",
      summary: "Image removed",
      detail: `Removed ${image.repository}:${image.tag} on all nodes`,
      life: 3500,
    });

    await refresh();
  } catch (e: any) {
    toast.add({
      severity: "error",
      summary: "Removal failed",
      detail: e?.message ?? "Unable to remove image",
      life: 4500,
    });
  } finally {
    deletingKey.value = null;
  }
};
</script>
