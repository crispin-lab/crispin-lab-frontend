import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";

export function editorTable() {
  return [
    Table.configure({
      resizable: true,
      lastColumnResizable: false,
      // 좁은 모니터에서도 열이 통째로 깨지지 않게.
      cellMinWidth: 64,
    }),
    TableRow,
    TableHeader,
    TableCell,
  ];
}
