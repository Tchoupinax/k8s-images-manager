<template>
  <div class="grid grid-cols-5 gap-4 p-4">
    <div
      v-for="(selectedImage, selectedImageIndex) in selectedImages"
      :key="selectedImageIndex"
      v-tippy="{ content: selectedImage.name }"
      class="relative flex items-center justify-center transition-transform transform rounded-lg size-10 hover:scale-105"
      :style="{ backgroundColor: pastelColors[selectedImageIndex] }"
      :class="{
        'border-4 border-green-500': doesNodeHasThisImage(
          node,
          selectedImage.name,
        ),
        'border-4 border-red-500': !doesNodeHasThisImage(
          node,
          selectedImage.name,
        ),
      }"
    >
      <!-- Badge en coin pour signal positif/négatif -->
      <span
        class="absolute w-4 h-4 border-2 border-white rounded-full top-1 right-1"
        :class="
          doesNodeHasThisImage(node, selectedImage.name)
            ? 'bg-green-500'
            : 'bg-red-500'
        "
      ></span>

      <!-- SVG au centre -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="size-6"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
        />
      </svg>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { pastelColors } from "./colors";

export default defineComponent({
  name: "PastelGrid",
  props: {
    node: { type: Object, required: true },
    selectedImages: { type: Array, required: true },
  },
  setup() {
    return { pastelColors };
  },
  methods: {
    doesNodeHasThisImage(node: any, imageName: string) {
      // Exemple de logique positive/négative
      return node.images?.includes(imageName);
    },
  },
});
</script>

<style scoped>
.size-10 {
  width: 60px;
  height: 60px;
}
.size-6 {
  width: 24px;
  height: 24px;
}
</style>
