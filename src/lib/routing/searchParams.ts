// Next.js Server Component 의 `searchParams` (Promise<Record<string, string | string[] | undefined>>) 를
// URLSearchParams 로 변환. `?tag=A&tag=B` 같이 같은 키가 반복되는 케이스를 배열로 보존해 silently drop 하지 않는다.

export function toURLSearchParams(
  raw: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") search.set(key, value);
    else if (Array.isArray(value)) {
      for (const item of value) search.append(key, item);
    }
  }
  return search;
}
