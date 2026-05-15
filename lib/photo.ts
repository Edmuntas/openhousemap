import type { PhotoSet } from "@/types/event";

/** Resize-extension suffix matched against the storage filename. */
const RESIZE_EXTENSIONS = /\.(jpe?g|png|webp)(\?|$)/i;

/** Insert a resize suffix before the file extension in a Firebase Storage URL.
 *  e.g. "events/abc/photo_0.jpg?alt=media" + "800x600"
 *    →  "events/abc/photo_0_800x600.jpg?alt=media"
 *
 *  Returns the original URL unchanged if the extension can't be located —
 *  better to render the heavy original than to render a 404. */
export function withResizeSuffix(url: string, suffix: string): string {
  if (!url) return url;
  return url.replace(RESIZE_EXTENSIONS, `_${suffix}.$1$2`);
}

/** Build a PhotoSet from a freshly uploaded full-size URL. The Firebase
 *  Resize Images extension creates _800x600 / _400x300 variants in the same
 *  directory; we just point the medium/thumb slots at where they will land.
 *
 *  There is a small window after upload where the resize may not be ready
 *  yet (typically <5s for normal photos), during which the unfurler / gallery
 *  may 404. Callers that need an instant render should fall back to .full. */
export function buildPhotoSet(fullUrl: string): PhotoSet {
  return {
    full: fullUrl,
    medium: withResizeSuffix(fullUrl, "800x600"),
    thumb: withResizeSuffix(fullUrl, "400x300"),
  };
}

/** Pick the best URL for OG/Twitter unfurl previews from a stored PhotoSet.
 *  WhatsApp and Facebook unfurlers reject images >600KB / >1200px, so we
 *  always prefer medium. If the stored medium happens to mirror full
 *  (legacy events uploaded before buildPhotoSet was wired up), derive the
 *  expected resize URL on the fly. */
export function previewUrlFor(
  photo: { full?: string; medium?: string } | undefined
): string {
  if (!photo?.full) return "";
  if (photo.medium && photo.medium !== photo.full) return photo.medium;
  return withResizeSuffix(photo.full, "800x600");
}
