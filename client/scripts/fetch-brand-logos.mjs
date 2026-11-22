// scripts/fetch-brand-logos.mjs
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.resolve("public/brands");

// Maps brand id -> { slug (Simple Icons), hex (optional brand color) }
const SIMPLE_ICONS_MAP = {
  canon: { slug: "canon", hex: "BC0024" },
  sony: { slug: "sony", hex: "111111" },
  nikon: { slug: "nikon", hex: "FFE600" },
  fujifilm: { slug: "fujifilm", hex: "111111" },
  panasonic: { slug: "panasonic", hex: "0066CC" },
  zeiss: { slug: "zeiss", hex: "003B91" },
  gopro: { slug: "gopro", hex: "111111" },
  sandisk: { slug: "sandisk", hex: "E2001A" },
  toshiba: { slug: "toshiba", hex: "E60012" },
};

const ALL_BRAND_IDS = [
  "canon",
  "sony",
  "nikon",
  "fujifilm",
  "panasonic",
  "sigma",
  "zeiss",
  "tamron",
  "profoto",
  "godox",
  "aputure",
  "elinchrom",
  "nisi",
  "hoya",
  "manfrotto",
  "zhiyun",
  "gopro",
  "sandisk",
  "toshiba",
  "lowepro",
  "magmod",
  "tokina",
  "samyang",
  "vanguard",
];

await mkdir(OUTPUT_DIR, { recursive: true });

const manualNeeded = [];

for (const id of ALL_BRAND_IDS) {
  const entry = SIMPLE_ICONS_MAP[id];
  if (!entry) {
    manualNeeded.push(id);
    continue;
  }

  const url = `https://cdn.simpleicons.org/${entry.slug}/${entry.hex}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const svg = await res.text();
    await writeFile(path.join(OUTPUT_DIR, `${id}.svg`), svg, "utf8");
    console.log(`Saved public/brands/${id}.svg`);
  } catch {
    manualNeeded.push(id);
  }
}

if (manualNeeded.length > 0) {
  console.log("\nDownload official SVGs manually into public/brands/ for:");
  for (const id of manualNeeded) {
    console.log(`  - ${id}.svg`);
  }
}
