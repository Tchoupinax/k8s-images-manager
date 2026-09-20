export function parseSize(size: string | undefined): number {
  if (!size) {
    return 0;
  }
  const match = size.match(/([\d.]+)\s*([KMG])?B?/i);
  if (!match) {
    return 0;
  }
  const value = parseFloat(match[1] ?? "0");
  const unit = (match[2] ?? "").toUpperCase();
  const factor =
    unit === "G"
      ? 1024 * 1024 * 1024
      : unit === "M"
        ? 1024 * 1024
        : unit === "K"
          ? 1024
          : 1;
  return value * factor;
}
