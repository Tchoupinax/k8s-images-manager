/** Client-only data loading without useFetch({ server: false }) to avoid SSR hydration mismatches. */
export function useClientFetch<T>(fetcher: () => Promise<T>) {
  const data = ref<T | null>(null);
  const pending = ref(false);
  const error = ref<Error | null>(null);

  const refresh = async () => {
    pending.value = true;
    error.value = null;
    try {
      data.value = await fetcher();
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
    } finally {
      pending.value = false;
    }
  };

  onMounted(() => {
    void refresh();
  });

  return { data, pending, error, refresh };
}
