#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const assetDir = path.join(root, "asset");
const outFile = path.join(assetDir, "index.js");

function enc(segment) {
  // Normalize to NFC to ensure consistency between macOS (NFD) and Linux (NFC)
  // This prevents 404 errors when files are served from GitHub Pages (Linux)
  const normalized = segment.normalize('NFC');
  return encodeURIComponent(normalized);
}

// Slugify function for converting folder names to URL-friendly slugs
// Currently unused, but available for future use if needed
function slugify(s) {
  return s
    .normalize('NFKD')         // Normalize to decomposed form
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters (simple approach)
    .replace(/\s+/g, '-')       // Replace spaces with hyphens
    .replace(/[^a-zA-Z0-9\-]/g, '') // Remove special characters
    .toLowerCase();             // Convert to lowercase
}

// Extract the English part from folder name (everything after the last space or korean character)
function getEnglishPath(folderName) {
  // Find the pattern "KoreanName EnglishName" and extract just the EnglishName
  const match = folderName.match(/[A-Z][a-zA-Z0-9\s]+$/);
  if (match) {
    return match[0].trim();
  }
  // If no English found, return the whole folder name
  return folderName;
}

function toHref(folder) {
  // const folderPath = path.join(assetDir, folder);
  // if (fs.existsSync(path.join(folderPath, "main.html"))) {
  //   return "asset/" + enc(folder) + "/main.html";
  // } else {
  //   return "asset/" + enc(folder) + "/index.html";
  // }
  const folderPath = path.join(assetDir, folder);
  const encodedFolder = enc(folder); // "문래원 Piet Mondrian" → "%EB%AC%B8..."

  if (fs.existsSync(path.join(folderPath, "main.html"))) {
    return `asset/${encodedFolder}/main.html`; // 상대경로 유지
  } else {
    return `asset/${encodedFolder}/index.html`; // 상대경로 유지
  }
}

function findThumbnail(folderPath, folderName) {
  const exts = [
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".svg",
    ".bmp",
    ".tiff",
  ];
  let files;
  try {
    files = fs
      .readdirSync(folderPath, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);
  } catch {
    return null;
  }

  const imageFiles = files
    .filter((name) => exts.includes(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  if (imageFiles.length > 0) {
    // 폴더명 + 파일명 모두 인코딩
    return `asset/${enc(folderName)}/${enc(imageFiles[0])}`;
  }
  return null;
  // const exts = [
  //   ".png",
  //   ".jpg",
  //   ".jpeg",
  //   ".webp",
  //   ".gif",
  //   ".svg",
  //   ".bmp",
  //   ".tiff",
  // ];
  // let files;
  // try {
  //   files = fs
  //     .readdirSync(folderPath, { withFileTypes: true })
  //     .filter((d) => d.isFile())
  //     .map((d) => d.name);
  // } catch {
  //   return null;
  // }

  // // Find any image file (case insensitive)
  // const imageFiles = files
  //   .filter((name) => exts.includes(path.extname(name).toLowerCase()))
  //   .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  // if (imageFiles.length > 0) {
  //   return "asset/" + enc(folderName) + "/" + imageFiles[0];
  // }

  // return null;
}

function parseDescription() {
  const descFile = path.join(root, "description.txt");
  try {
    const content = fs.readFileSync(descFile, "utf8");
    const parts = content.split("===");
    const koreanPart = parts[0].trim();
    const englishPart = parts.length > 1 ? parts[1].trim() : null;

    const koreanLines = koreanPart.split("\n");
    const title =
      koreanLines[0].trim() || "Reactive books 2.0 : Artist Edition";
    const description =
      koreanLines.slice(1).join("\n").trim() || "No description available.";

    let result = { title, description };

    // If English translation exists, add it to the result
    if (englishPart) {
      result.descriptionEn = englishPart;
    }

    return result;
  } catch (e) {
    console.warn("Could not read description.txt, using defaults");
    return {
      title: "Reactive books 2.0 : Artist Edition",
      description:
        '"Reactive Book 2.0"은 학생들이 각자 영감을 받아온 예술가와 디자이너의 작품을 시각적 모티프로 삼아, 터치 기반 인터랙션과 물리 엔진을 통해 재해석한 실험적 디자인 작업입니다.',
    };
  }
}

function main() {
  const descData = parseDescription();
  const { title, description, descriptionEn } = descData;
  const entries = fs
    .readdirSync(assetDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => {
      const folderPath = path.join(assetDir, name);
      return (
        fs.existsSync(path.join(folderPath, "index.html")) ||
        fs.existsSync(path.join(folderPath, "main.html"))
      );
    })
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  const list = entries.map((name) => {
    const folderPath = path.join(assetDir, name);
    const thumbnail = findThumbnail(folderPath, name);
    const entry = {
      name,
      href: toHref(name),
    };
    // Only include thumbnail if it exists
    if (thumbnail) {
      entry.thumbnail = thumbnail;
    }
    return entry;
  });

  const siteInfo = { title, description };
  if (descriptionEn) {
    siteInfo.descriptionEn = descriptionEn;
  }

  const contents =
    "window.ASSET_INDEX = " +
    JSON.stringify(list, null, 2) +
    ";\n" +
    "window.SITE_INFO = " +
    JSON.stringify(siteInfo, null, 2) +
    ";\n";
  fs.writeFileSync(outFile, contents);
  console.log(`Wrote ${outFile} with ${list.length} entries.`);
}

main();
