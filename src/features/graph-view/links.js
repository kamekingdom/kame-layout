// Author: kamekingdom (2026-10-28)

export const keyOf = (value) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase();

export const shortTitle = (title, limit = 18) =>
  [...title].length > limit ? [...title].slice(0, limit - 1).join("") + "…" : title;

export const pageUrl = (project, title) =>
  `/${encodeURIComponent(project)}/${encodeURIComponent(title)}`;
