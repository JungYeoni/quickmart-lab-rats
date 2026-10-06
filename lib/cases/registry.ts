import "server-only";
import type { CaseKey } from "../cases";
import { baeminPlugin } from "./baemin";
import { tossPlugin } from "./toss";
import type { CasePlugin } from "./types";

/** 서버 전용. 아직 만들지 않은 사례(당근·Netflix)는 마일스톤 6~7 에서 추가한다. */
const PLUGINS: Partial<Record<CaseKey, CasePlugin<never>>> = {
  baemin: baeminPlugin as CasePlugin<never>,
  toss: tossPlugin as CasePlugin<never>,
};

export const getPlugin = (key: string | null | undefined) => (key ? PLUGINS[key as CaseKey] : undefined);
