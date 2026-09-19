export function languageFromPath(path) {
  const name = path.split("/").pop() || path;
  const i = name.lastIndexOf(".");
  const ext = i >= 0 ? name.slice(i + 1).toLowerCase() : "";
  const map = {
    js: "javascript",
    mjs: "javascript",
    ts: "typescript",
    py: "python",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    h: "cpp",
    cs: "csharp",
    html: "html",
    htm: "html",
    css: "css",
    json: "json",
    ipynb: "json",
    md: "markdown",
  };
  return map[ext] || "plaintext";
}
