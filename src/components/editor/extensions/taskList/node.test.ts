import { generateHTML, generateJSON } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

import { viewerTaskList } from "./viewer";

const extensions = [StarterKit, ...viewerTaskList];

describe("TaskList extension — JSON round-trip", () => {
  it("checked / unchecked 항목이 모두 직렬화된다", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: true },
              content: [{ type: "paragraph", content: [{ type: "text", text: "스펙 확정" }] }],
            },
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                { type: "paragraph", content: [{ type: "text", text: "리뷰 코멘트 반영" }] },
              ],
            },
          ],
        },
      ],
    };

    const html = generateHTML(json, extensions);

    expect(html).toContain('data-type="taskList"');
    expect(html).toContain('data-checked="true"');
    expect(html).toContain('data-checked="false"');
    expect(html).toContain("스펙 확정");
    expect(html).toContain("리뷰 코멘트 반영");
  });

  it("HTML 의 taskList 를 JSON 으로 복원할 때 checked attr 가 유지된다", () => {
    const html = `
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked><span></span></label><div><p>스펙 확정</p></div></li>
        <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>리뷰 반영</p></div></li>
      </ul>
    `;

    const json = generateJSON(html, extensions);
    const serialized = JSON.stringify(json);

    expect(serialized).toContain('"type":"taskList"');
    expect(serialized).toContain('"checked":true');
    expect(serialized).toContain('"checked":false');
    expect(serialized).toContain("스펙 확정");
  });
});
