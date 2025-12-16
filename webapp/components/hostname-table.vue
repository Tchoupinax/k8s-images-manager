<template>
  <div class="p-4 bg-white shadow rounded-xl">
    <h2 class="mb-4 text-xl font-semibold">Images par hostname</h2>

    <div class="mb-4">
      <button
        class="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
        @click="changeSortBy('hostname')"
      >
        Trier par Hostname
      </button>
      <button
        class="px-4 py-2 ml-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
        @click="changeSortBy('count')"
      >
        Trier par Nombre d'images
      </button>
    </div>

    <table class="w-full text-sm">
      <thead class="text-left text-gray-500">
        <tr>
          <th>
            <button
              @click="changeSortBy('hostname')"
              class="flex items-center justify-between"
            >
              Hostname
              <span class="text-xs text-gray-400">
                <!-- Affichage de la direction -->
                {{ sortDirection === "asc" ? "↑" : "↓" }}
              </span>
            </button>
          </th>
          <th>
            <button
              @click="changeSortBy('count')"
              class="flex items-center justify-between"
            >
              Nombre d'images
              <span class="text-xs text-gray-400">
                {{ sortDirection === "asc" ? "↑" : "↓" }}
              </span>
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="([host, count], index) in sortedData" :key="index">
          <td class="font-mono">{{ host }}</td>
          <td>{{ count }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

const $props = defineProps({
  data: {
    type: Object,
    required: true,
  },
});

// Ref pour le critère de tri et la direction
const sortBy = ref<"hostname" | "count">("hostname");
const sortDirection = ref<"asc" | "desc">("asc");

// Fonction de tri
const sortedData = computed(() => {
  const entries = Object.entries($props.data);

  // Tri en fonction du critère sélectionné
  entries.sort((a, b) => {
    const [keyA, valueA] = a;
    const [keyB, valueB] = b;

    // Tri par nom de hostname (alphabetique)
    if (sortBy.value === "hostname") {
      return sortDirection.value === "asc"
        ? keyA.localeCompare(keyB)
        : keyB.localeCompare(keyA);
    }

    // Tri par nombre d'images
    return sortDirection.value === "asc" ? valueA - valueB : valueB - valueA;
  });

  return entries;
});

// Changer la direction du tri
const toggleSortDirection = () => {
  sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
};

// Changer le critère de tri
const changeSortBy = (key: "hostname" | "count") => {
  sortBy.value = key;
  toggleSortDirection(); // inverser la direction à chaque changement de critère
};
</script>
