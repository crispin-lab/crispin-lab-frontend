// SearchPagination · SpacesPagination 등 여러 화면이 공유.
export type PageWindowEntry = number | "ellipsis-start" | "ellipsis-end";

const WINDOW_RADIUS = 2;

export function buildPageWindow(
  current: number,
  totalPages: number,
): ReadonlyArray<PageWindowEntry> {
  const entries: PageWindowEntry[] = [];
  // URL 조작 (?page=999 등) 으로 범위 밖 current 가 들어와도 마지막 페이지 링크가 살아 있어 사용자가 되돌아갈
  // 수 있게 clamp. totalPages=0 인 화면에서는 caller 가 이미 early return.
  const normalizedCurrent = totalPages > 0 ? Math.min(Math.max(current, 0), totalPages - 1) : 0;
  const start = Math.max(0, normalizedCurrent - WINDOW_RADIUS);
  const end = Math.min(totalPages - 1, normalizedCurrent + WINDOW_RADIUS);

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
