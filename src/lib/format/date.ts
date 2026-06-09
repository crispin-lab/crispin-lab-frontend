const UPDATED_AT_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatUpdatedAtKR(value: string | Date): string {
  return UPDATED_AT_FORMAT.format(typeof value === "string" ? new Date(value) : value);
}
