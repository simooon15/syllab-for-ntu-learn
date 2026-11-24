/** Open the P2E-061 network-disabled isolated preview. */
process.argv[2] ??= "evidence/private/product-061/PREVIEW_ENTRY.json";
await import("./v030-product-057-open-preview.mjs");
