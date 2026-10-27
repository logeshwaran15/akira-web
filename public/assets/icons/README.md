Drop icon images here for the sidebar footer links (User Manual, Support Center, Policy).

Expected filenames (referenced from `src/components/layout/AppLayout.tsx`):

- `user-manual.png`
- `support-center.png`
- `policy.png`

Any raster format works (PNG/JPG/WEBP/GIF) or SVG — just keep the filename and extension
matching what's referenced in `FOOTER_LINKS` in AppLayout.tsx (update the `image` path there
if you use a different extension, e.g. `.svg`).

Recommended: square images (e.g. 64x64 or 128x128), transparent background. They're displayed
with `object-contain` inside a small icon tile, so any aspect ratio is fitted automatically
without cropping or stretching.

If a file is missing, the sidebar automatically falls back to a built-in flat icon instead of
showing a broken image.
