<template>
  <div
    class="relative flex flex-col h-[100dvh] overflow-hidden bg-gradient-to-br from-sky-100 via-blue-50 to-green-50 text-slate-900"
  >
    <aside
      class="fixed hidden md:flex flex-col items-center w-40 h-full p-4 border-r-4 border-black bg-blue-100/90 backdrop-blur"
    >
      <div class="mb-8 text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.25em] text-slate-600">
          K8s
        </p>
        <p class="text-sm font-black tracking-tight text-slate-900">
          Images Manager
        </p>
      </div>

      <nav class="flex flex-col items-stretch gap-6">
        <NuxtLink
          to="/"
          :class="desktopNavClass('/', 'bg-[#4EC8D8] text-slate-900 hover:bg-[#2eb8cb]', 'ring-offset-sky-200')"
        >
          <IconWhale class="w-full" />
          <p class="mt-2 text-xs font-semibold tracking-wide uppercase">Images</p>
        </NuxtLink>

        <NuxtLink
          to="/nodes"
          :class="desktopNavClass('/nodes', 'bg-[#6DBF8A] text-white hover:bg-[#5AAA78]', 'ring-offset-green-100')"
        >
          <IconServer class="w-full" />
          <p class="mt-2 text-xs font-semibold tracking-wide uppercase">Nodes</p>
        </NuxtLink>

        <button
          type="button"
          class="relative flex size-24 flex-col items-center justify-center rounded-xl border-4 border-black bg-white p-2 text-center text-slate-900 shadow-[4px_4px_0_0_#000] transition-transform duration-150 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000]"
          @click="openPullModal()"
        >
          <IconDownload class="size-10" />
          <p class="mt-2 text-xs font-semibold tracking-wide uppercase">Pull</p>
        </button>
      </nav>
    </aside>

    <header
      class="shrink-0 border-b-4 border-black bg-blue-100/90 px-4 py-3 backdrop-blur md:hidden"
    >
      <p class="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-600">
        K8s
      </p>
      <p class="text-sm font-black tracking-tight text-slate-900">
        Images Manager
      </p>
    </header>

    <main
      class="flex flex-col flex-1 min-h-0 overflow-hidden px-4 py-3 pb-[calc(6.25rem+env(safe-area-inset-bottom,0px))] md:ml-40 md:px-6 md:py-8 md:pb-8"
    >
      <div class="flex flex-col flex-1 min-h-0 overflow-hidden">
        <slot />
      </div>
    </main>

    <nav
      class="fixed inset-x-0 bottom-0 z-50 md:hidden pointer-events-none"
      aria-label="Main navigation"
    >
      <div
        class="pointer-events-auto mx-3 flex gap-2 rounded-2xl border-4 border-black bg-blue-100/95 p-2 shadow-[4px_4px_0_0_#000] backdrop-blur mb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
      >
        <NuxtLink
          to="/"
          :class="mobileNavLinkClass('/')"
          :aria-current="isActive('/') ? 'page' : undefined"
        >
          <span class="flex size-9 items-center justify-center" aria-hidden="true">
            <IconWhale class="size-8" />
          </span>
          <span class="text-[10px] font-black uppercase tracking-wide leading-none">
            Images
          </span>
        </NuxtLink>

        <NuxtLink
          to="/nodes"
          :class="mobileNavLinkClass('/nodes')"
          :aria-current="isActive('/nodes') ? 'page' : undefined"
        >
          <span class="flex size-9 items-center justify-center" aria-hidden="true">
            <IconServer class="size-8" />
          </span>
          <span class="text-[10px] font-black uppercase tracking-wide leading-none">
            Nodes
          </span>
        </NuxtLink>

        <button
          type="button"
          :class="mobilePullClass"
          @click="openPullModal()"
        >
          <span
            class="flex size-9 items-center justify-center rounded-lg border-2 border-black bg-white shadow-[2px_2px_0_0_#000]"
            aria-hidden="true"
          >
            <IconDownload class="size-5" />
          </span>
          <span class="text-[10px] font-black uppercase tracking-wide leading-none">
            Pull
          </span>
        </button>
      </div>
    </nav>

    <UiModal
      v-model:open="pullModalOpen"
      title="Pull image on all nodes"
      @show="onPullModalShow"
    >
      <p class="text-sm text-slate-600">
        Agents will pull this image on every node on the next heartbeat.
      </p>
      <input
        ref="pullInputEl"
        v-model="pullRef"
        type="text"
        placeholder="nginx:alpine"
        class="w-full mt-4 rounded-lg border-2 border-black bg-white px-3 py-2 text-sm text-slate-800 shadow-[2px_2px_0_0_#000] focus:border-sky-500 focus:outline-none"
        @keyup.enter="onPullImageRef()"
      >
      <template #footer>
        <UiButton
          label="Cancel"
          variant="ghost"
          @click="pullModalOpen = false"
        />
        <UiButton
          label="Pull"
          variant="ink"
          :loading="isPulling"
          @click="onPullImageRef()"
        >
          <IconDownload />
        </UiButton>
      </template>
    </UiModal>

    <ClientOnly>
      <NuxtNotifications
        position="bottom right"
        :speed="400"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const $config = useRuntimeConfig();
const toast = useAppToast();

const isActive = (path: string) => route.path === path;

const desktopNavBase =
  "flex size-24 flex-col justify-center rounded-xl border-4 border-black p-2 text-center shadow-[4px_4px_0_0_#000] transition-transform duration-150 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-[2px_2px_0_0_#000]";

const desktopNavClass = (path: string, palette: string, ringOffset: string) => [
  desktopNavBase,
  palette,
  isActive(path) && `ring-4 ring-offset-4 ring-black ${ringOffset}`,
];

const mobileTabBase =
  "flex flex-1 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-black py-2 text-slate-900 shadow-[2px_2px_0_0_#000] transition-[transform,box-shadow,background-color] active:translate-y-px active:shadow-[1px_1px_0_0_#000]";

const mobileNavLinkClass = (path: string) => [
  mobileTabBase,
  isActive(path)
    ? path === "/nodes"
      ? "bg-[#6DBF8A] text-white"
      : "bg-[#4EC8D8] text-slate-900"
    : "bg-white hover:bg-slate-50",
];

const mobilePullClass = `${mobileTabBase} bg-white hover:bg-slate-50`;

const pullModalOpen = ref(false);
const pullRef = ref("");
const pullInputEl = ref<HTMLInputElement | null>(null);
const isPulling = ref(false);

const openPullModal = () => {
  pullRef.value = "";
  pullModalOpen.value = true;
};

const onPullModalShow = () => {
  nextTick(() => pullInputEl.value?.focus());
};

const parseImageRef = (input: string) => {
  const value = input.trim();
  if (!value) {return null;}

  const nameStart = Math.max(value.lastIndexOf("/") + 1, 0);
  const colon = value.indexOf(":", nameStart);
  if (colon === -1) {
    return { repository: value, tag: "latest" };
  }

  const repository = value.slice(0, colon);
  const tag = value.slice(colon + 1);
  if (!repository || !tag) {return null;}

  return { repository, tag };
};

const onPullImageRef = async () => {
  const image = parseImageRef(pullRef.value);
  if (!image) {
    toast.add({
      severity: "warn",
      summary: "Invalid image",
      detail: "Use repository:tag, for example nginx:alpine",
      life: 3500,
    });
    return;
  }

  if (isPulling.value) {return;}
  isPulling.value = true;
  try {
    const url = serverEndpointUrl("/api/images/pull", $config.public.serverEndpoint, {
      repository: image.repository,
      tag: image.tag,
    });

    const res = await fetch(url.toString(), { method: "POST" });
    if (!res.ok) {
      throw new Error(`Failed with status ${res.status}`);
    }

    toast.add({
      severity: "success",
      summary: "Pull requested",
      detail: `Pulling ${image.repository}:${image.tag} on all nodes`,
      life: 3500,
    });
    pullModalOpen.value = false;
    pullRef.value = "";
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
    isPulling.value = false;
  }
};
</script>
