// SpaceDetailView 의 viewer role warm-up fetch 와 캐시 키를 공유해 진입시 재요청을 피한다.
// 100 은 BE pagination `size` 상한 — 소규모~중규모 스페이스는 첫 페이지로 전량 노출된다.
export const MEMBERS_DEFAULT_SIZE = 100;
