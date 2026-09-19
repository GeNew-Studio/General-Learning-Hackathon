export function createWorkspace(initialFiles = {}) {
  const files = { ...initialFiles };

  return {
    list() {
      return Object.keys(files).sort();
    },
    get(path) {
      return files[path];
    },
    set(path, content) {
      files[path] = content;
    },
    has(path) {
      return path in files;
    },
    remove(path) {
      delete files[path];
    },
    add(path, content = "") {
      if (files[path] !== undefined) throw new Error(`${path} already exists`);
      files[path] = content;
    },
    rename(from, to) {
      if (!(from in files)) throw new Error(`${from} missing`);
      if (to in files) throw new Error(`${to} already exists`);
      files[to] = files[from];
      delete files[from];
    },
    duplicate(path) {
      if (!(path in files)) throw new Error(`${path} missing`);
      return files[path];
    },
    exportJson() {
      return JSON.stringify({ v: 1, files }, null, 2);
    },
    importJson(text) {
      const data = JSON.parse(text);
      if (!data?.files || typeof data.files !== "object") throw new Error("Invalid workspace bundle");
      for (const key of Object.keys(files)) delete files[key];
      Object.assign(files, data.files);
    },
  };
}
