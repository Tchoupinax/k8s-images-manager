<template>
  <DataTable
    stripedRows
    :value="images"
    sortField="price"
    :sortOrder="-1"
    size="small"
  >
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-xl font-bold">Products</span>
        <Button icon="pi pi-refresh" rounded raised />
      </div>
    </template>

    <Column field="hostname" header="Hostname" sortable style="width: 20%" />

    <Column field="image" header="Repository" sortable />

    <Column field="size" header="Size" sortable>
      <template #body="slotProps">
        <Tag :value="slotProps.data.size" severity="info" /> </template
    ></Column>

    <Column field="digest" header="Digest" sortable />

    <Column field="tag" header="Tag" sortable />

    <Column field="date" header="Date" sortable>
      <template #body="slotProps">
        {{ format(slotProps.data.date) }}
      </template>
    </Column>

    <Column field="quantity" header="Up-to-date">
      <template #body="slotProps">
        <Badge value="✔" severity="success" />
      </template>
    </Column>
  </DataTable>
</template>

<script setup lang="ts">
import { format } from "timeago.js";

const $config = useRuntimeConfig();

const { data: images, error } = await useFetch<Array<ImageInfo>>(
  `${$config.public.serverEndpoint}/api/images`
);
</script>
