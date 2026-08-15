const express = require("express");
const { convertAudio } = require("./converters/audioConvert");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");
const fssync = require("fs");
const { randomUUID: uuid } = require("crypto"); // Node 16+

const { officeConvert } = require("./converters/officeConvert");
const { imageToPdf, pdfToImage, convertImage } = require("./converters/imageConvert");
const { csvToExcel, excelToCsv } = require("./converters/spreadsheetConvert");
const { htmlToPdf, htmlToWord, htmlToTxt } = require("./converters/htmlConvert");

const TMP_DIR = path.join(__dirname, "tmp");
if (!fssync.existsSync(TMP_DIR)) fssync.mkdirSync(TMP_DIR);

const upload = multer({ dest: TMP_DIR });
const app = express();
app.use(cors());

// ---------------------------------------------------------------------
// Conversion registry: "from_to" -> async (inputPath, outputPath) => outputPath
// This is the single source of truth for what the app supports.
// ---------------------------------------------------------------------
const CONVERTERS = {
  word_pdf: (i, o) => officeConvert(i, o, "pdf"),
  pdf_word: (i, o) => officeConvert(i, o, "docx"),
  word_jpg: async (i, o) => imageAfterOfficePdf(i, o, "jpg"),
  word_png: async (i, o) => imageAfterOfficePdf(i, o, "png"),
  pdf_jpg: async (i, o) => firstImage(await pdfToImage(i, TMP_DIR, "jpg")),
  pdf_png: async (i, o) => firstImage(await pdfToImage(i, TMP_DIR, "png")),
  jpg_pdf: (i, o) => imageToPdf(i, o, "jpg"),
  png_pdf: (i, o) => imageToPdf(i, o, "png"),
  txt_pdf: (i, o) => officeConvert(i, o, "pdf"),
  txt_word: (i, o) => officeConvert(i, o, "docx"),
  html_pdf: (i, o) => htmlToPdf(i, o),
  html_word: (i, o) => htmlToWord(i, o),
  ppt_pdf: (i, o) => officeConvert(i, o, "pdf"),
  pdf_ppt: (i, o) => officeConvert(i, o, "pptx"),
  excel_pdf: (i, o) => officeConvert(i, o, "pdf"),
  pdf_excel: (i, o) => officeConvert(i, o, "xlsx"),
  csv_excel: (i, o) => csvToExcel(i, o),
  excel_csv: (i, o) => excelToCsv(i, o),
  rtf_pdf: (i, o) => officeConvert(i, o, "pdf"),
  rtf_word: (i, o) => officeConvert(i, o, "docx"),

  // --- Document -> TXT / HTML (new) ---
  pdf_txt: (i, o) => officeConvert(i, o, "txt"),
  word_txt: (i, o) => officeConvert(i, o, "txt"),
  word_html: (i, o) => officeConvert(i, o, "html"),
  pdf_html: (i, o) => officeConvert(i, o, "html"),
  html_txt: (i, o) => htmlToTxt(i, o),

  // --- Audio (new, via ffmpeg) ---
  mp3_wav: (i, o) => convertAudio(i, o, "wav"),
  wav_mp3: (i, o) => convertAudio(i, o, "mp3"),
  mp3_aac: (i, o) => convertAudio(i, o, "aac"),
  aac_mp3: (i, o) => convertAudio(i, o, "mp3"),
  m4a_mp3: (i, o) => convertAudio(i, o, "mp3"),
  wav_aac: (i, o) => convertAudio(i, o, "aac"),
  // --- Image format <-> image format (new, via sharp) ---
  jpg_webp: (i, o) => convertImage(i, o, "webp"),
  webp_jpg: (i, o) => convertImage(i, o, "jpg"),
  png_webp: (i, o) => convertImage(i, o, "webp"),
  webp_png: (i, o) => convertImage(i, o, "png"),
  jpg_png: (i, o) => convertImage(i, o, "png"),
  png_jpg: (i, o) => convertImage(i, o, "jpg"),
  gif_jpg: (i, o) => convertImage(i, o, "jpg"),
  gif_png: (i, o) => convertImage(i, o, "png"),
  webp_pdf: (i, o) => imageToPdf(i, o, "webp"),
};

// Word/PDF -> image is a two-step: office doc -> pdf -> image
async function imageAfterOfficePdf(inputPath, outputPath, ext) {
  const intermediatePdf = path.join(TMP_DIR, `${uuid()}.pdf`);
  await officeConvert(inputPath, intermediatePdf, "pdf");
  const images = await pdfToImage(intermediatePdf, TMP_DIR, ext);
  await fs.unlink(intermediatePdf).catch(() => {});
  return firstImage(images, outputPath);
}

// pdf-poppler names files itself; copy the first rendered page to our
// expected outputPath so the rest of the pipeline is uniform.
async function firstImage(imagePaths, outputPath) {
  if (!imagePaths.length) throw new Error("No pages rendered");
  if (outputPath) {
    await fs.copyFile(imagePaths[0], outputPath);
    return outputPath;
  }
  return imagePaths[0];
}

const EXT_FOR = {
  word: "docx",
  pdf: "pdf",
  jpg: "jpg",
  png: "png",
  txt: "txt",
  html: "html",
  ppt: "pptx",
  excel: "xlsx",
  csv: "csv",
  rtf: "rtf",
  mp3: "mp3",
  wav: "wav",
  aac: "aac",
  m4a: "m4a",
  webp: "webp",
  gif: "gif",
};

app.post("/api/convert", upload.single("file"), async (req, res) => {
  const { from, to } = req.body;
  const key = `${from}_${to}`;
  const converter = CONVERTERS[key];

  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  if (!converter)
    return res.status(400).json({ error: `Unsupported conversion: ${from} -> ${to}` });

  const inputPath = req.file.path;
  const outputExt = EXT_FOR[to] || to;
  const outputPath = path.join(TMP_DIR, `${uuid()}.${outputExt}`);

  try {
    await converter(inputPath, outputPath);
    res.download(outputPath, `converted.${outputExt}`, async () => {
      // cleanup after the download stream finishes
      await fs.unlink(inputPath).catch(() => {});
      await fs.unlink(outputPath).catch(() => {});
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Conversion failed", details: err.message });
    await fs.unlink(inputPath).catch(() => {});
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Converter backend running on :${PORT}`));