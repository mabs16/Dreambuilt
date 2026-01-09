import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const dataPath = path.join(__dirname, '../../Data_Meta');

function analyzeFile(filename: string) {
  const filePath = path.join(dataPath, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filename}`);
    return;
  }

  console.log(`\n📂 Analyzing: ${filename}`);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Get headers (first row)
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (data.length === 0) {
    console.log('Empty file.');
    return;
  }

  const headers = data[0] as string[];
  console.log('🔹 Headers found:');
  headers.forEach((h) => console.log(`  - "${h}"`));
}

const files = [
  'Dream-uilt-2022-Campañas-1-ene-2025---8-ene-2026.xlsx',
  'Dream-uilt-2022-Conjuntos-de-anuncios-1-ene-2025---8-ene-2026.xlsx',
  'Dream-uilt-2022-Anuncios-1-ene-2025---8-ene-2026.xlsx',
];

files.forEach((f) => analyzeFile(f));
