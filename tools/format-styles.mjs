import fs from "node:fs";
import path from "node:path";
import { root, config, read } from "./project.mjs";
import { formatStyles } from "./styles.mjs";

const files = [
  "src/theme/project.css",
  ...config.features
    .flatMap((feature) => [
      feature.files["style.css"],
      ...(feature.styleFiles ?? []).map((name) => `src/features/${feature.id}/${name}`),
    ])
    .filter(Boolean),
];
for (const filename of files) {
  const source = read(filename);
  if (source.trim()) fs.writeFileSync(path.join(root, filename), await formatStyles(source));
}
console.log(`Formatted ${files.length} stylesheets; custom-property values preserved.`);
