// Handles every conversion that routes through LibreOffice headless.
// This covers: docx<->pdf, pptx<->pdf, xlsx<->pdf, pdf->docx/pptx/xlsx,
// txt->pdf/docx, rtf->pdf/docx.
//
// Requires LibreOffice to be installed on the host machine (see README).

const libre = require("libreoffice-convert");
const fs = require("fs/promises");
const { promisify } = require("util");

const libreConvert = promisify(libre.convert);

/**
 * Convert a file on disk to a target format using LibreOffice headless.
 * @param {string} inputPath  - path to the source file
 * @param {string} outputPath - path to write the converted file
 * @param {string} targetExt  - target extension WITHOUT the dot, e.g. "pdf"
 */
async function officeConvert(inputPath, outputPath, targetExt) {
  const inputBuf = await fs.readFile(inputPath);
  // LibreOffice picks the export filter from the extension we ask for.
  const outputBuf = await libreConvert(inputBuf, `.${targetExt}`, undefined);
  await fs.writeFile(outputPath, outputBuf);
  return outputPath;
}

module.exports = { officeConvert };
