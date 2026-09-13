# Business card and homepage QR

`build_business_card.py` generates the two-sided Crystal Powers card, print/proof PDFs, editable SVGs, 600 dpi previews and standalone PNG/SVG QR files in `output/pdf/`.

Use the bundled Python runtime with ReportLab, Pillow, pypdf and pypdfium2. Segoe UI fonts are embedded from Windows Fonts. The front places the project's original Blender render; the QR is generated as true vector modules with Q error correction and an intact quiet zone.

```powershell
python assets/branding/build_business_card.py --url https://crystal-production.onrender.com/ --name James
```

Optional `--email` and `--phone` values add public contact details. Inspect the resulting layout after changing content. No provider account, website deployment or printer order is changed by this script.

Finished card: 85 × 55 mm. The print PDF has 3 mm bleed and explicit TrimBox/BleedBox metadata. `output/pdf/PRINT-NOTES.txt` records colour, production and QR verification boundaries. ZXing-C++ in ignored local QA dependencies independently decoded the exported QR and print page; the application has no new dependency.
