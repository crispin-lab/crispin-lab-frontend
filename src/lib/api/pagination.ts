export type PaginationParams = {
  page?: number;
  size?: number;
};

export function buildPaginationQuery(params: PaginationParams): string {
  const search = new URLSearchParams();
  if (params.page !== undefined) search.append("page", String(params.page));
  if (params.size !== undefined) search.append("size", String(params.size));
  return search.toString();
}
