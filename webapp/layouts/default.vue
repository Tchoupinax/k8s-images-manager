<template>
  <div class="relative flex">
    <div
      class="fixed flex flex-col items-center w-40 h-full p-4 text-black bg-blue-100 border-r-4 border-r-black"
    >
      <!--<NuxtLink
        to="/"
        class="flex flex-col justify-center p-2 text-center border-4 border-black rounded-lg size-24"
      >
        <IconWhale class="size-16" />
        <p class="">Images</p>
      </NuxtLink>-->

      <NuxtLink
        to="/nodes"
        class="flex flex-col justify-center p-2 mt-4 text-center border-4 border-black rounded-lg size-24"
      >
        <IconWhale class="size-16" />
        <p class="">Nodes</p>
      </NuxtLink>
    </div>

    <div class="w-full min-w-0 ml-40">
      <slot />
    </div>
  </div>
</template>
