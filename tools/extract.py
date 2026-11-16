#!/usr/bin/env python3
"""Extract a Scrapbox export into a new directory without exporting account data."""

import argparse
import collections
import hashlib
import json
import re
from pathlib import Path, PurePosixPath
from urllib.parse import quote


def extract(export_path, destination):
    project = json.loads(export_path.read_text())
    source_dir = destination / "src"
    if source_dir.exists():
        raise SystemExit("src already exists; use a fresh output directory to avoid overwriting edits")

    grouped = collections.OrderedDict()
    for page in project["pages"]:
        title = page["title"]
        if "/" in title or title in (".", ".."):
            raise ValueError(f"Unsafe page title: {title}")
        lines = [line["text"] if isinstance(line, dict) else line for line in page["lines"]]
        for index, line in enumerate(lines):
            match = re.fullmatch(r"code:([^\s/]+\.(?:css|js|txt))", line)
            if not match:
                continue
            body = []
            for text in lines[index + 1:]:
                if not text.startswith((" ", "\t")):
                    break
                body.append(text[1:])
            filename = match[1]
            entry = grouped.setdefault((title, filename), {
                "page": title,
                "filename": filename,
                "sourceUrl": f"https://scrapbox.io/{project['name']}/{quote(title, safe='')}",
                "blocks": [],
            })
            entry["blocks"].append({"line": index + 1, "text": "\n".join(body)})

    manifest = {
        "project": project["name"],
        "exported": project["exported"],
        "sourceSha256": hashlib.sha256(export_path.read_bytes()).hexdigest(),
        "concatenation": "Same-name blocks are joined in page order with a newline, matching /api/code.",
        "files": [],
    }
    for (title, filename), entry in grouped.items():
        text = "\n".join(block["text"] for block in entry["blocks"])
        path = PurePosixPath("src", title, filename)

        output_path = destination / str(path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(text.encode("utf-8"))
        manifest["files"].append({
            "path": str(path),
            "sourcePage": title,
            "sourceUrl": entry["sourceUrl"],
            "codeBlock": filename,
            "blockLines": [block["line"] for block in entry["blocks"]],
            "sha256": hashlib.sha256(text.encode()).hexdigest(),
        })

    migration_dir = destination / "migration"
    migration_dir.mkdir(parents=True, exist_ok=True)
    (migration_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"Extracted {len(manifest['files'])} files from {sum(len(v['blocks']) for v in grouped.values())} blocks.")
    print(dict(collections.Counter(PurePosixPath(v['path']).suffix for v in manifest['files'])))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("export", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    extract(args.export, args.destination)
