# Splash assets

Editable source:

- `laplapla-splash-master.svg`, when present; otherwise
- `laplapla-splash-master-1280.png`.

Everything under `generated/` is produced by `npm run generate:splash` and must
not be edited independently. The web splash uses the compact generated WebP;
Android density resources remain lossless PNG files.
The Android density directories are staging resources for the future TWA
project.

For a future AppLab application, update the splash paths and brand values in
`config/pwa.json`, replace its single master source, and run the generator.

A real authored SVG is preferred over automatic PNG tracing. Adding the SVG at
the configured path automatically makes it the source for every generated
splash size.
