import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";

// nested: true — 중첩 체크리스트 허용.
export function editorTaskList() {
  return [TaskList, TaskItem.configure({ nested: true })];
}
