export type ImageInfo = {
  hostname: string;
  repository: string;
  tag: string;
  digest: string;
  size: string; // "158MB"
  date: Date;
};

export function withServerEndpoint(path: string, endpoint: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const base = (endpoint ?? "").replace(/\/$/, "");
  return `${base}${suffix}`;
}

export function serverEndpointUrl(
  path: string,
  endpoint: string,
  params?: Record<string, string>,
): URL {
  const href = withServerEndpoint(path, endpoint);
  const url =
    href.startsWith("http://") || href.startsWith("https://")
      ? new URL(href)
      : new URL(href, import.meta.client ? window.location.origin : "http://127.0.0.1");

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return url;
}

export const useImagesStats = (images: Array<ImageInfo>) => {
  const nodes = images.map(node => node.hostname);

  return {
    nodes: computed(() => nodes),
  };
};
