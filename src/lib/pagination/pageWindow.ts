// SearchPagination · SpacesPagination 등 여러 화면이 공유.
export type PageWindowEntry = number | "ellipsis-start" | "ellipsis-end";

const WINDOW_RADIUS = 2;

export function buildPageWindow(
  current: number,
  totalPages: number,
): ReadonlyArray<PageWindowEntry> {
  const entries: PageWindowEntry[] = [];
  const start = Math.max(0, current - WINDOW_RADIUS);
  const end = Math.min(totalPages - 1, current + WINDOW_RADIUS);

  if (start > 0) {
    entries.push(0);
    const hidden = start - 1;
    if (hidden === 1) entries.push(1);
    else if (hidden >= 2) entries.push("ellipsis-start");
  }
  for (let i = start; i <= end; i++) entries.push(i);
  if (end < totalPages - 1) {
    const lastPage = totalPages - 1;
    const hidden = lastPage - end - 1;
    if (hidden === 1) entries.push(lastPage - 1);
    else if (hidden >= 2) entries.push("ellipsis-end");
    entries.push(lastPage);
  }
  return entries;
}
