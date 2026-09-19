const KEY_PREFIX = "vibeblog.workspace.";

export function loadPersistedWorkspace(lessonId, defaultFiles) {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${lessonId}`);
    if (!raw) return structuredClone(defaultFiles);
    const data = JSON.parse(raw);
    if (!data?.files || typeof data.files !== "object") return structuredClone(defaultFiles);
    return data.files;
  } catch {
    return structuredClone(defaultFiles);
  }
}

export function savePersistedWorkspace(lessonId, files) {
  localStorage.setItem(
    `${KEY_PREFIX}${lessonId}`,
    JSON.stringify({ v: 1, savedAt: new Date().toISOString(), files }),
  );
}

export function clearPersistedWorkspace(lessonId) {
  localStorage.removeItem(`${KEY_PREFIX}${lessonId}`);
}
