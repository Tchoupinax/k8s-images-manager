<template>
  <div class="p-6 mx-auto text-black max-w-7xl bg-whmarker:ite">
    <div>
      <MultiSelect
        name="city"
        checkmark
        v-model="selectedImages"
        :options="
          Array.from(
            new Set(data?.map((node) => `${node.repository}:${node.tag}`)),
          )
            .sort()
            .map((image) => ({ name: image }))
        "
        optionLabel="name"
        filter
        placeholder="Select images"
        :maxSelectedLabels="3"
        :highlightOnSelect="true"
        class="w-full h-full text-xl"
      />
    </div>

    <div class="my-4">
      <div
        v-for="(selectedImage, selectedImageIndex) of selectedImages"
        class="p-1 px-4 pl-4 mt-2 text-2xl text-white border"
        :style="{ backgroundColor: pastelColors[selectedImageIndex] }"
      >
        {{ selectedImage.name }}
      </div>
    </div>

    <div
      class="inline-grid justify-center grid-cols-3 mt-8 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5"
    >
      <div
        v-for="node of nodes"
        class="flex flex-col items-center justify-between p-3 m-2 border-4 border-black rounded-xl size-60"
      >
        <div>
          <p class="w-48 text-xl text-center truncate">
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
                'shadow-lg': doesNodeHasThisImage(node, selectedImage.name),
                'shadow-lg opacity-40': !doesNodeHasThisImage(
                  node,
                  selectedImage.name,
                ),
              }"
            >
              <span
                class="absolute top-0 right-0 w-6 h-6 -mt-1 -mr-1 border-2 border-white rounded-full"
                :class="
                  doesNodeHasThisImage(node, selectedImage.name)
                    ? 'bg-green-500'
                    : 'bg-red-700'
                "
              ></span>
            </div>
          </div>
        </div>

        <div class="flex justify-between w-full text-2xl">
          <div class="mr-2">
            {{
              countHowManyImagesTheNodeHas(
                node,
                selectedImages.map((g) => g.name),
              )
            }}
            / {{ selectedImages.length }}
          </div>

          <div
            class="px-2 font-light rounded-md"
            :class="{
              'bg-green-200':
                calculateImagePercentageByNode(node, selectedImages) > 60,
              'bg-yellow-200':
                calculateImagePercentageByNode(node, selectedImages) < 60 &&
                calculateImagePercentageByNode(node, selectedImages) > 40,
              'bg-red-200':
                calculateImagePercentageByNode(node, selectedImages) < 40,
            }"
          >
            {{ calculateImagePercentageByNode(node, selectedImages) }}%
          </div>
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
  `${$config.public.serverEndpoint}/api/images`,
);

const selectedImages = ref([
  //{ name: "docker.io/coredns/coredns:1.13.1" },
  //{ name: "docker.io/grafana/alloy:v1.12.0" },
  //{ name: "docker.io/longhornio/csi-node-driver-registrar:v2.15.0-20251030" },
  //{ name: "docker.io/longhornio/livenessprobe:v2.17.0-20251030" },
  //{ name: "docker.io/chrislusf/seaweedfs:4.02" },
  //{ name: "docker.io/n8nio/n8n:1.123.4" },
  //{ name: "docker.io/mattermost/mattermost-team-edition:10.12.0" },
  //{ name: "docker.io/marlonb/mailcrab:latest" },
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
const countHowManyImagesTheNodeHas = (
  nodeName: string,
  imageNames: Array<string>,
) => {
  const allImages =
    data.value
      ?.filter((node) => node.hostname === nodeName)
      .map((node) => `${node.repository}:${node.tag}`) ?? [];
  return imageNames.filter((v) => allImages.includes(v)).length;
};
const calculateImagePercentageByNode = (
  nodeName: string,
  selectedImages: Array<{ name: string }>,
) => {
  return Math.floor(
    (countHowManyImagesTheNodeHas(
      nodeName,
      selectedImages.map((g) => g.name),
    ) /
      selectedImages.length) *
      100,
  );
};
</script>
