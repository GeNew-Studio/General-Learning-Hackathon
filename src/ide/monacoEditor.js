import * as monaco from "monaco-editor";

export function createEditor(host, { value, language, fontSize = 13, onChange }) {
  const editor = monaco.editor.create(host, {
    value,
    language,
    theme: "vs-dark",
    fontSize,
    fontFamily: 'Consolas, "Courier New", monospace',
    automaticLayout: true,
    minimap: { enabled: fontSize <= 13 },
    scrollBeyondLastLine: false,
    padding: { top: 8 },
  });

  if (onChange) {
    editor.onDidChangeModelContent(() => onChange(editor.getValue()));
  }

  return {
    getValue: () => editor.getValue(),
    setValue: (next) => editor.setValue(next),
    setLanguage: (lang) => monaco.editor.setModelLanguage(editor.getModel(), lang),
    focus: () => editor.focus(),
    dispose: () => editor.dispose(),
  };
}
