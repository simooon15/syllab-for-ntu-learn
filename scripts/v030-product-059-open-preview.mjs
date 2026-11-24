/** Open only the isolated P2E-059 preview, using the existing network-blocked launcher. */
process.argv[2] ??= "evidence/private/product-059/PREVIEW_ENTRY.json";
await import("./v030-product-057-open-preview.mjs");
