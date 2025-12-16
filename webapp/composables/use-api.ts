export type ImageInfo = {
  hostname: string;
  repository: string;
  tag: string;
  digest: string;
  size: string; // "158MB"
};

export const useImagesStats = (images: Array<ImageInfo>) => {
  const nodes = images.map((node) => node.hostname);

  return {
    nodes: computed(() => nodes),
  };
};
