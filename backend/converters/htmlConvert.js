const fs = require("fs/promises");
const puppeteer = require("puppeteer");
const HTMLtoDOCX = require("html-to-docx");
const { convert: htmlToPlainText } = require("html-to-text");

/**
 * HTML -> PDF using a real headless browser (best fidelity: CSS, images, fonts).
 */
async function htmlToPdf(inputPath, outputPath) {
  const html = await fs.readFile(inputPath, "utf-8");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });
  } finally {
    await browser.close();
  }
  return outputPath;
}

/**
 * HTML -> DOCX
 */
async function htmlToWord(inputPath, outputPath) {
  const html = await fs.readFile(inputPath, "utf-8");
  const buffer = await HTMLtoDOCX(html, null, {
    table: { row: { cantSplit: true } },
    footer: false,
    pageNumber: false,
  });
  await fs.writeFile(outputPath, buffer);
  return outputPath;
}

/**
 * HTML -> plain TXT. Strips tags/scripts/styles and keeps readable
 * line breaks for block elements and list items.
 */
async function htmlToTxt(inputPath, outputPath) {
  const html = await fs.readFile(inputPath, "utf-8");
  const text = htmlToPlainText(html, {
    wordwrap: false,
    selectors: [
      { selector: "img", format: "skip" },
      { selector: "a", options: { ignoreHref: true } },
    ],
  });
  await fs.writeFile(outputPath, text, "utf-8");
  return outputPath;
}

module.exports = { htmlToPdf, htmlToWord, htmlToTxt };