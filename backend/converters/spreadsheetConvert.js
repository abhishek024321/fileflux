const XLSX = require("xlsx");

/**
 * CSV -> XLSX
 */
function csvToExcel(inputPath, outputPath) {
  const workbook = XLSX.readFile(inputPath, { raw: true });
  XLSX.writeFile(workbook, outputPath, { bookType: "xlsx" });
  return outputPath;
}

/**
 * XLSX -> CSV (uses the first sheet)
 */
function excelToCsv(inputPath, outputPath) {
  const workbook = XLSX.readFile(inputPath);
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const csv = XLSX.utils.sheet_to_csv(sheet);
  require("fs").writeFileSync(outputPath, csv);
  return outputPath;
}

module.exports = { csvToExcel, excelToCsv };
