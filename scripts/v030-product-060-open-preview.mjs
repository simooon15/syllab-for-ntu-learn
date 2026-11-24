/** Open only the isolated P2E-060 preview with the shared network-disabled launcher. */
process.argv[2] ??= "evidence/private/product-060/PREVIEW_ENTRY.json";
await import("./v030-product-057-open-preview.mjs");
