const fs = require("fs/promises");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const pdf2img = require("pdf-img-convert");
const sharp = require("sharp");

/**
 * JPG, PNG, or WEBP -> single-page PDF sized to the image.
 * pdf-lib only embeds jpg/png directly, so WEBP is re-encoded to PNG
 * first via sharp (lossless, no visible quality loss).
 */
async function imageToPdf(inputPath, outputPath, ext) {
  let imageBytes = await fs.readFile(inputPath);
  let embedAs = ext;

  if (ext === "webp" || ext === "gif") {
    imageBytes = await sharp(inputPath).png().toBuffer();
    embedAs = "png";
  }

  const pdfDoc = await PDFDocument.create();
  const image =
    embedAs === "png"
      ? await pdfDoc.embedPng(imageBytes)
      : await pdfDoc.embedJpg(imageBytes);

  const page = pdfDoc.addPage([image.width, image.height]);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: image.width,
    height: image.height,
  });

  const pdfBytes = await pdfDoc.save();
  await fs.writeFile(outputPath, pdfBytes);
  return outputPath;
}

/**
 * Raster format <-> raster format (jpg/png/webp/gif) via sharp.
 * Covers: jpg<->png, jpg<->webp, png<->webp, gif->jpg, gif->png.
 * JPG has no alpha channel, so we flatten onto white first.
 */
async function convertImage(inputPath, outputPath, toExt) {
  let pipeline = sharp(inputPath);

  if (toExt === "jpg" || toExt === "jpeg") {
    pipeline = pipeline.flatten({ background: "#ffffff" }).jpeg({ quality: 92 });
  } else if (toExt === "png") {
    pipeline = pipeline.png();
  } else if (toExt === "webp") {
    pipeline = pipeline.webp({ quality: 92 });
  } else {
    throw new Error(`Unsupported image target format: ${toExt}`);
  }

  await pipeline.toFile(outputPath);
  return outputPath;
}

/**
 * PDF -> JPG/PNG. Renders every page and returns an array of file paths.
 * (Multi-page PDFs produce multiple images; caller decides how to package
 * them, e.g. zip, or just return the first page.)
 */
async function pdfToImage(inputPath, outputDir, ext) {
  const opts = {
    format: ext === "jpg" ? "jpeg" : "png",
    out_dir: outputDir,
    out_prefix: path.basename(inputPath, path.extname(inputPath)),
    page: null, // null = all pages
  };
  await pdfPoppler.convert(inputPath, opts);
  const files = await fs.readdir(outputDir);
  return files
    .filter((f) => f.startsWith(opts.out_prefix))
    .map((f) => path.join(outputDir, f));
}

module.exports = { imageToPdf, pdfToImage, convertImage };