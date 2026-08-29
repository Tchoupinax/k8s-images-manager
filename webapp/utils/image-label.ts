const NONE = "<none>";

type LabeledImage = {
  repository: string;
  tag: string;
  digest?: string;
};

export function isNoneLabel(value: string | undefined): boolean {
  return !value || value.toLowerCase() === NONE;
}

export function formatImageDigest(digest: string | undefined): string {
  if (!digest) {
    return "—";
  }

  return digest.startsWith("sha256:") ? digest : `sha256:${digest}`;
}

export function displayImageRepository(image: LabeledImage): string {
  if (isNoneLabel(image.repository)) {
    return formatImageDigest(image.digest);
  }

  return image.repository;
}

export function displayImageTag(image: LabeledImage): string {
  if (isNoneLabel(image.tag)) {
    return formatImageDigest(image.digest);
  }

  return image.tag;
}

export function shouldShowImageTag(image: LabeledImage): boolean {
  if (isNoneLabel(image.repository) && isNoneLabel(image.tag)) {
    return false;
  }

  return !isNoneLabel(image.tag);
}

export function imageGroupKey(image: LabeledImage): string {
  if (isNoneLabel(image.repository) || isNoneLabel(image.tag)) {
    return `${image.repository}:${image.tag}:${formatImageDigest(image.digest)}`;
  }

  return `${image.repository}:${image.tag}`;
}
