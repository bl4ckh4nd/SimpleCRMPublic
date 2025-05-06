export default function localImageLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}) {
  // For local images in Electron, we can use the path as is
  return src
}
