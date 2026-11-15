/*
 * Parses one line of the scanned-folders list, e.g.
 *   Y:\01.JANAR\05012026\F.1018\2015\859
 *   Y:\#recycle\01.JANAR\05012026\F.1018\2015\859
 *   Y:\SALLA . JANAR\SALLA 17 JANAR\P.J. 2\F.149\PARA 1939\III-1745
 *
 * The fond is the first segment that starts with "F." (wherever it is), the
 * year is the segment after it and the file the segment after that. The scan
 * date is the closest date-looking segment (05012026 or 05.01.2026) before
 * the fond.
 */

const DRIVE = /^[A-Za-z]:[/\\]/;
const FOND_SEGMENT = /^F\s*\.\s*(.+)$/i;
const DATE_SEGMENT = /^(\d{2})\.?(\d{2})\.?(\d{4})$/;

/** "F.1018" / "f. 1018" / "1018" -> "1018";  "132.a" -> "132.A" */
function normalizeFond(value) {
  if (value === undefined || value === null) return "";
  return String(value)
    .trim()
    .replace(/^F\s*\.\s*/i, "")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

/** Year / file codes: trimmed, case-insensitive */
function normalizeCode(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim().replace(/\s+/g, " ").toUpperCase();
}

function parseFondPath(line) {
  // fullPath is stored as given (drive letter included, if any)
  const fullPath = String(line || "")
    .trim()
    .replace(/[/\\]+$/, "")
    .trim();
  const relative = fullPath.replace(DRIVE, "");
  if (!relative) return null;

  const parts = relative.split(/[/\\]/).map((p) => p.trim());
  const recycled = parts[0].toLowerCase() === "#recycle";
  const fondIndex = parts.findIndex((p) => FOND_SEGMENT.test(p));

  let scanDate = null;
  const searchUntil = fondIndex === -1 ? parts.length : fondIndex;
  for (let i = searchUntil - 1; i >= 0; i--) {
    const m = parts[i].match(DATE_SEGMENT);
    if (m) {
      scanDate = `${m[1]}.${m[2]}.${m[3]}`;
      break;
    }
  }

  const base = recycled ? 1 : 0;
  const doc = {
    fullPath,
    location: parts[base] || null, // e.g. "01.JANAR", "SALLA . JANAR"
    scanDate,
    recycled,
    fondCode: null,
    yearCode: null,
    fileCode: null,
    // legacy display fields
    fond: null,
    year: null,
    file: null,
  };

  if (fondIndex !== -1) {
    doc.fond = parts[fondIndex];
    doc.year = parts[fondIndex + 1] || null;
    doc.file = parts[fondIndex + 2] || null;
    doc.fondCode = normalizeFond(doc.fond) || null;
    doc.yearCode = doc.year ? normalizeCode(doc.year) : null;
    doc.fileCode = doc.file ? normalizeCode(doc.file) : null;
  }

  return doc;
}

module.exports = { parseFondPath, normalizeFond, normalizeCode };
