<template>
  <div>
    <MultiSelect
      name="city"
      v-model="selectedImages"
      :options="
        Array.from(
          new Set(data?.map((node) => `${node.repository}:${node.tag}`))
        ).map((image) => ({ name: image }))
      "
      optionLabel="name"
      filter
      placeholder="Select images"
      :maxSelectedLabels="10"
      class="w-full h-full md:w-80"
    />
  </div>

  <div class="my-10">
    <div
      v-for="(selectedImage, selectedImageIndex) of selectedImages"
      class="text-2xl"
      :style="{ color: pastelColors[selectedImageIndex] }"
    >
      {{ selectedImage.name }}
    </div>
  </div>

  <div class="grid w-full grid-cols-3 gap-0 mt-40 xl:grid-cols-6">
    <div
      v-for="node of nodes"
      class="p-4 m-2 border-4 border-black rounded-xl size-60"
    >
      <p class="text-xl">
        {{ node }}
      </p>

      <p v-if="selectedImages.length === 0" class="text-2xl">
        {{ getImagesCountByNodeName(node) }}
      </p>

      <div v-else class="grid grid-cols-4 gap-2 mt-4">
        <div
          v-for="(selectedImage, selectedImageIndex) in selectedImages"
          :key="selectedImageIndex"
          v-tippy="{ content: selectedImage.name }"
          class="relative flex items-center justify-center transition-transform transform rounded-lg size-10 hover:scale-105"
          :style="{ backgroundColor: pastelColors[selectedImageIndex] }"
          :class="{
            'shadow-lg': doesNodeHasThisImage(
              node,
              selectedImage.name
            ),
            'shadow-lg opacity-30': !doesNodeHasThisImage(
              node,
              selectedImage.name
            ),
          }"
        >
          <span
            class="absolute top-0 right-0 w-6 h-6 -mt-1 -mr-1 border-2 border-white rounded-full"
            :class="
              doesNodeHasThisImage(node, selectedImage.name)
                ? 'bg-green-500'
                : 'bg-red-500'
            "
          ></span>
        </div>
      </div>
    </div>
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
const { data } = useFetch<ImageInfo[]>(
  `${$config.public.serverEndpoint}/api/images`
);

const selectedImages = ref([
]);

const nodes = computed(() => new Set(data.value?.map((node) => node.hostname)));
const getImagesCountByNodeName = (nodeName: string) => {
  return data.value?.filter((node) => node.hostname === nodeName)?.length;
};
const doesNodeHasThisImage = (nodeName: string, imageName: string) => {
  return (
    data.value
      ?.filter((node) => node.hostname === nodeName)
      .find((image) => `${image.repository}:${image.tag}` === imageName) !==
    undefined
  );
};
</script>
