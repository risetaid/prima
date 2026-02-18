/**
 * convert-to-webp.ts
 * Converts specific public images (bg_desktop.png, david.jpg, stella.jpg, windra.jpg)
 * to WebP format using sharp.
 *
 * PWA icons (public/icons/, apple-touch-icon.png, icon-192x192.png, icon-512x512.png)
 * are intentionally skipped because iOS/Android require PNG for app icons.
 *
 * Usage: bun run scripts/convert-to-webp.ts
 * Add --delete flag to remove original files after conversion
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";

const DELETE_ORIGINALS = process.argv.includes("--delete");

const IMAGES_TO_CONVERT = [
  "public/bg_desktop.png",
  "public/david.jpg",
  "public/stella.jpg",
  "public/windra.jpg",
];

const WEBP_QUALITY = 85; // Good balance between quality and file size

async function convertToWebP(inputPath: string): Promise<void> {
  const absoluteInput = path.resolve(process.cwd(), inputPath);

  if (!fs.existsSync(absoluteInput)) {
    console.warn(`⚠️  Skipping (not found): ${inputPath}`);
    return;
  }

  const ext = path.extname(inputPath);
  const outputPath = inputPath.replace(new RegExp(`${ext}$`), ".webp");
  const absoluteOutput = path.resolve(process.cwd(), outputPath);

  try {
    const inputStats = fs.statSync(absoluteInput);
    const inputSizeKB = (inputStats.size / 1024).toFixed(1);

    await sharp(absoluteInput)
      .webp({ quality: WEBP_QUALITY, effort: 6 })
      .toFile(absoluteOutput);

    const outputStats = fs.statSync(absoluteOutput);
    const outputSizeKB = (outputStats.size / 1024).toFixed(1);
    const savings = (
      ((inputStats.size - outputStats.size) / inputStats.size) *
      100
    ).toFixed(1);

    console.log(
      `✅ ${inputPath} → ${outputPath}  (${inputSizeKB}KB → ${outputSizeKB}KB, saved ${savings}%)`,
    );

    if (DELETE_ORIGINALS) {
      fs.unlinkSync(absoluteInput);
      console.log(`   🗑️  Deleted original: ${inputPath}`);
    }
  } catch (err) {
    console.error(`❌ Failed to convert ${inputPath}:`, err);
    process.exit(1);
  }
}

async function main() {
  console.log("🔄 Converting images to WebP...\n");
  console.log(`   Quality: ${WEBP_QUALITY}`);
  console.log(
    `   Delete originals: ${DELETE_ORIGINALS ? "YES" : "NO (pass --delete to enable)"}\n`,
  );

  for (const imagePath of IMAGES_TO_CONVERT) {
    await convertToWebP(imagePath);
  }

  console.log("\n✨ Done! Don't forget to update references in your code.");
  if (!DELETE_ORIGINALS) {
    console.log(
      "   Run with --delete flag to remove originals after verifying the WebP files look correct.",
    );
  }
}

main();
