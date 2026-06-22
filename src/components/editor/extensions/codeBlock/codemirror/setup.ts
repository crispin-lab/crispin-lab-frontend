import type { Editor } from "@tiptap/core";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import {
  bracketMatching,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from "@codemirror/language";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { drawSelection, EditorView, keymap } from "@codemirror/view";

import { buildCodeBlockKeymap } from "./keymaps";
import { codeBlockEditorTheme, codeBlockHighlightStyle } from "./theme";

export type CodeBlockCompartments = {
  language: Compartment;
  editable: Compartment;
};

type BuildArgs = {
  editor: Editor;
  getPos: () => number | undefined;
  compartments: CodeBlockCompartments;
  isEditable: boolean;
};

export function buildCodeBlockExtensions({
  editor,
  getPos,
  compartments,
  isEditable,
}: BuildArgs): Extension[] {
  return [
    // 본 NodeView 의 keymap (탈출 / history forward) 이 defaultKeymap 보다 우선 — 순서가 invariant.
    keymap.of(buildCodeBlockKeymap({ editor, getPos })),
    keymap.of([indentWithTab, ...defaultKeymap]),
    bracketMatching(),
    indentOnInput(),
    indentUnit.of("  "),
    EditorState.tabSize.of(2),
    EditorState.allowMultipleSelections.of(true),
    drawSelection(),
    codeBlockEditorTheme,
    syntaxHighlighting(codeBlockHighlightStyle),
    compartments.language.of([]),
    compartments.editable.of([
      EditorView.editable.of(isEditable),
      EditorState.readOnly.of(!isEditable),
    ]),
  ];
}
