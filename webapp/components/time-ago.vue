<script setup lang="ts">
import { format } from "timeago.js";

const props = defineProps<{
  date: string;
}>();

const label = ref("—");

onMounted(() => {
  label.value = format(props.date);
});
</script>

<template>
  <span>{{ label }}</span>
</template>
