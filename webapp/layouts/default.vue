<template>
  <div
    class="relative flex min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 text-slate-900"
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
            'bg-[#4EC8D8] flex size-24 flex-col justify-center rounded-xl border-4 border-black p-2 text-center text-slate-900 shadow-[4px_4px_0_0_#000] transition-transform duration-150 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000]',
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
      </nav>
    </aside>

    <main class="flex w-full min-w-0 px-6 py-8 ml-40">
      <div class="w-full">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();

const isActive = (path: string) => route.path === path;
</script>
