import type { components as SpaceComponentsType } from "./schema.space";

export type { components as UserComponents } from "./schema.user";
export type { components as SpaceComponents } from "./schema.space";

type PageSchemas = SpaceComponentsType["schemas"];

export type Page = PageSchemas["PageGetResponse"];
export type PageSearchResult = PageSchemas["PageSearchResponse"];
export type PageSummary = PageSearchResult["items"][number];
export type PageCreateRequest = PageSchemas["PageRegisterRequest"];
export type PageCreateResult = PageSchemas["PageRegisterResponse"];
export type PageUpdateRequest = PageSchemas["PageEditRequest"];
export type PageUpdateResult = PageSchemas["PageEditResponse"];
