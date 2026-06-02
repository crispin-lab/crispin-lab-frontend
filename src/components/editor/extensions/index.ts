import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";

import type { SpaceId } from "@/lib/api/ids";

import { editorPageLink, viewerPageLink } from "./pageLink";

export function editorExtensions({ spaceId }: { spaceId: SpaceId }) {
  return [StarterKit, Link, editorPageLink({ spaceId })];
}

export const viewerExtensions = [StarterKit, Link, viewerPageLink];
