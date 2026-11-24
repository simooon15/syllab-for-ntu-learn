/** Open the isolated P2E-058 preview; the shared launcher blocks network requests. */
process.argv[2] ??= "evidence/private/product-058/PREVIEW_ENTRY.json";
await import("./v030-product-057-open-preview.mjs");
