import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";

export function editorTable() {
  return [
    Table.configure({
      resizable: true,
      // 우측 경계까지 늘리는 동작이 본문 흐름과 모호. code-highlight.css 의 resize 시각 룰도 마지막 열에서 자동 제외된다.
      lastColumnResizable: false,
      // 좁은 모니터에서도 열이 통째로 깨지지 않게.
      cellMinWidth: 64,
    }),
    TableRow,
    TableHeader,
    TableCell,
  ];
}
