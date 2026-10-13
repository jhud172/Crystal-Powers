# Manrope font delivery

`frontend/public/fonts/manrope` contains the unmodified six WOFF2 language subsets from the existing Google Fonts Manrope v20 stylesheet. The active CSS retains its four weights (400, 500, 600, 700), Unicode ranges and `font-display: swap`. Only URLs change to local, versioned files.

`source-manifest.json` records original URLs, byte sizes and SHA256 hashes. `OFL.txt` preserves the original copyright and SIL Open Font License 1.1; `FONTLOG.txt` preserves the upstream history. Both accompany the fonts in the application package.

Run `node scripts/verify-font-assets.cjs` from the repository root to validate original bytes and faces offline. Do not re-encode or subset files silently. Actual delivery, font loading, delayed/failed fallbacks and responsive typography are checked by `scripts/verify-fonts-browser.cjs`.
