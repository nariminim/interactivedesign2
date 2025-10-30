#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const assetDir = path.join(root, "asset");
const outFile = path.join(assetDir, "index.js");

function enc(segment) {
  // Only encode spaces, keep Korean characters as-is
  return segment.replace(/ /g, "%20");
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
  const folderPath = path.join(assetDir, folder);
  if (fs.existsSync(path.join(folderPath, "main.html"))) {
    return "asset/" + enc(folder) + "/main.html";
  } else {
    return "asset/" + enc(folder) + "/index.html";
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

  // Find any image file (case insensitive)
  const imageFiles = files
    .filter((name) => exts.includes(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  if (imageFiles.length > 0) {
    return "asset/" + enc(folderName) + "/" + imageFiles[0];
  }

  return null;
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
