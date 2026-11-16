// Author: kamekingdom (2026-10-28)

import { CONFIG } from "./config.js";

export async function fetchPages(project, signal, onProgress) {
  const all = [];
  let followingId = "";
  const seen = new Set();
  for (let i = 0; i < 100 && all.length < CONFIG.maxPages; i++) {
    const url = new URL(`/api/pages/${encodeURIComponent(project)}/search/titles`, location.origin);
    if (followingId) url.searchParams.set("followingId", followingId);
    const response = await fetch(url.href, {
      credentials: "same-origin",
      signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok)
      throw new Error(
        `APIエラー: HTTP ${response.status}（閲覧権限やログイン状態を確認してください）`,
      );
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error("APIの応答形式が想定と異なります。");
    all.push(...batch);
    onProgress(all.length);
    const next = response.headers.get("X-Following-Id");
    if (!next || batch.length === 0 || seen.has(next)) break;
    seen.add(next);
    followingId = next;
  }
  return all.slice(0, CONFIG.maxPages);
}
