<template>
  <div
    class="relative flex flex-col h-screen overflow-hidden bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 text-slate-900"
  >
    <aside
      class="fixed flex flex-col items-center w-40 h-full p-4 border-r-4 border-black bg-blue-100/90 backdrop-blur"
    >
      <div class="mb-8 text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.25em] text-slate-600">
          K8s
        </p>
        <p class="text-sm font-black tracking-tight text-slate-900">
          Images Manager
        </p>
      </div>

      <nav class="flex flex-col items-stretch gap-4">
        <NuxtLink
          to="/"
          :class="[
            'bg-[#4EC8D8] flex size-24 flex-col justify-center rounded-xl border-4 border-black p-2 text-center text-slate-900 shadow-[4px_4px_0_0_#000] transition-transform duration-150 hover:-translate-y-1 hover:bg-[#2eb8cb] hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-[2px_2px_0_0_#000]',
            isActive('/') && 'ring-4 ring-offset-4 ring-black ring-offset-sky-200'
          ]"
        >
          <IconWhale class="w-full" />
          <p class="mt-1 text-xs font-semibold tracking-wide uppercase">Images</p>
        </NuxtLink>

        <NuxtLink
          to="/nodes"
          :class="[
            'relative flex size-24 flex-col justify-center rounded-xl border-4 border-black bg-[#4A0AAA] p-2 text-center text-white shadow-[4px_4px_0_0_#000] transition-transform duration-150 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000]',
            isActive('/nodes') && 'ring-4 ring-offset-4 ring-black ring-offset-indigo-300'
          ]"
        >
          <IconServer class="w-full" />
          <p class="mt-1 text-xs font-semibold tracking-wide uppercase">Nodes</p>
        </NuxtLink>

        <button
          type="button"
          class="relative flex size-24 flex-col items-center justify-center rounded-xl border-4 border-black bg-white p-2 text-center text-slate-900 shadow-[4px_4px_0_0_#000] transition-transform duration-150 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000]"
          @click="openPullModal()"
        >
          <i class="text-3xl pi pi-download"></i>
          <p class="mt-1 text-xs font-semibold tracking-wide uppercase">Pull</p>
        </button>
      </nav>
    </aside>

    <main class="flex flex-col flex-1 min-h-0 px-6 py-8 ml-40">
      <div class="flex flex-col flex-1 min-h-0 overflow-hidden">
        <slot />
      </div>
    </main>

    <Dialog
      v-model:visible="pullModalOpen"
      modal
      header="Pull image on all nodes"
      :pt="{
        root: { class: 'border-4 border-black rounded-2xl shadow-[6px_6px_0_0_#000]' },
        header: { class: 'text-slate-900 font-black' },
      }"
      :style="{ width: 'min(28rem, 92vw)' }"
      @show="onPullModalShow"
    >
      <p class="text-sm text-slate-600">
        Agents will pull this image on every node on the next heartbeat.
      </p>
      <InputText
        v-model="pullRef"
        placeholder="nginx:alpine"
        class="w-full mt-4 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-sky-500 focus:outline-none"
        @keyup.enter="onPullImageRef()"
      />
      <template #footer>
        <Button
          label="Cancel"
          class="btn-ghost"
          @click="pullModalOpen = false"
        />
        <Button
          label="Pull"
          icon="pi pi-download"
          class="btn-ink"
          :loading="isPulling"
          @click="onPullImageRef()"
        />
      </template>
    </Dialog>

    <Toast />
  </div>
</template>

<script setup lang="ts">
import { useToast } from "primevue/usetoast";

const route = useRoute();
const $config = useRuntimeConfig();
const toast = useToast();

const isActive = (path: string) => route.path === path;

const pullModalOpen = ref(false);
const pullRef = ref("");
const isPulling = ref(false);

const openPullModal = () => {
  pullRef.value = "";
  pullModalOpen.value = true;
};

const onPullModalShow = () => {
  nextTick(() => {
    const el = document.querySelector(".p-dialog input") as HTMLInputElement | null;
    el?.focus();
  });
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
