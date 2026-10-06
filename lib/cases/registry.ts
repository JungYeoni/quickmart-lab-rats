import "server-only";
import type { CaseKey } from "../cases";
import { baeminPlugin } from "./baemin";
import type { CasePlugin } from "./types";

/** 서버 전용. 아직 만들지 않은 사례(토스·당근·Netflix)는 마일스톤 5~7 에서 추가한다. */
const PLUGINS: Partial<Record<CaseKey, CasePlugin<never>>> = {
  baemin: baeminPlugin as CasePlugin<never>,
};

export const getPlugin = (key: string | null | undefined) => (key ? PLUGINS[key as CaseKey] : undefined);
