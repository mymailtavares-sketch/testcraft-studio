import type { RefinementEntry, PublishedEntry } from "../models/refinement";
const DRAFTS = "testcraft-demo-refinement-drafts-v1";
const PUBLISHED = "testcraft-demo-refinement-published-v1";
function read<T>(key: string): T[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}
export function compactDrafts(entries: RefinementEntry[]): RefinementEntry[] {
 return entries.map(entry=>({...entry,...(entry.publishedCases?{publishedCases:entry.publishedCases.map(tc=>({localId:tc.localId,title:tc.title,azureDevOpsId:tc.azureDevOpsId,publishedPlanId:tc.publishedPlanId,publishedSuiteId:tc.publishedSuiteId}))}:{})}));
}
export const loadDrafts = () => compactDrafts(read<RefinementEntry>(DRAFTS));
export const loadPublished = () => read<PublishedEntry>(PUBLISHED);
export function saveDrafts(entries: RefinementEntry[]) {
  localStorage.setItem(DRAFTS, JSON.stringify(compactDrafts(entries)));
}
export function savePublished(entries: PublishedEntry[]) {
  localStorage.setItem(PUBLISHED, JSON.stringify(entries));
}
export function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
