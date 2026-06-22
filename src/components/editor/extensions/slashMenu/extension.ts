import { Extension } from "@tiptap/core";
import { Suggestion } from "@tiptap/suggestion";

import { slashSuggestion } from "./suggestion";

// ReactRenderer 의존은 ./suggestion 한 파일에 격리 — viewer (RSC) 에서 잘못 import 안 되게.
export const SlashMenuExtension = Extension.create({
  name: "slashMenu",

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...slashSuggestion,
      }),
    ];
  },
});
