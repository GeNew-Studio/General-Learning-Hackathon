/** Single-segment file name for flat web workspace (no folders yet). */
export function normalizeSingleFileName(raw) {
  if (raw == null) return null;
  const name = String(raw).trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!name || name.includes("..") || name.includes("/")) return null;
  if (/[\0<>:"|?*]/.test(name)) return null;
  return name;
}

export function defaultContentForFile(name) {
  const lang = name.split(".").pop()?.toLowerCase();
  if (lang === "js" || lang === "ts") return "// 新檔案\n";
  if (lang === "css") return "/* 新檔案 */\n";
  if (lang === "html") return "<!DOCTYPE html>\n<html lang=\"zh-Hant\">\n<head><meta charset=\"UTF-8\" /></head>\n<body>\n</body>\n</html>\n";
  return "";
}

export function duplicateFileName(existingNames, sourceName) {
  const dot = sourceName.lastIndexOf(".");
  const stem = dot > 0 ? sourceName.slice(0, dot) : sourceName;
  const ext = dot > 0 ? sourceName.slice(dot) : "";
  let i = 1;
  while (existingNames.includes(`${stem}-copy${i}${ext}`)) i += 1;
  return `${stem}-copy${i}${ext}`;
}
