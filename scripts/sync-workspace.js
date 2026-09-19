import { writeFileSync, mkdirSync, rmSync } from "fs";
import { catchFruitProject } from "../src/project/catchFruitProject.js";

const dir = new URL("../workspace/catch-fruit/", import.meta.url);
mkdirSync(dir, { recursive: true });

for (const name of Object.keys(catchFruitProject.files)) {
  writeFileSync(new URL(name, dir), catchFruitProject.files[name], "utf8");
}

const examples = new URL("../workspace/catch-fruit/examples/", import.meta.url);
rmSync(examples, { recursive: true, force: true });
mkdirSync(examples, { recursive: true });

const samples = {
  "hello.py": `# 範例：之後 Phase 1 可在 Terminal 跑\nprint("hello")\n`,
  "hello.cs": "// C# 範例\nclass Hello {}\n",
  "hello.cpp": '#include <iostream>\nint main() { std::cout << "hello\\n"; }\n',
};

for (const [name, content] of Object.entries(samples)) {
  writeFileSync(new URL(name, examples), content, "utf8");
}

console.log("workspace/catch-fruit synced (lesson + examples/)");
