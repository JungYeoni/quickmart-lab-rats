import "server-only";
import type { CaseKey } from "../cases";
import { baeminPlugin } from "./baemin";
import { daangnPlugin } from "./daangn";
import { netflixPlugin } from "./netflix";
import { tossPlugin } from "./toss";
import type { CasePlugin } from "./types";

/** 서버 전용. 네 사례 모두 등록돼 있다. */
const PLUGINS: Partial<Record<CaseKey, CasePlugin<never>>> = {
  baemin: baeminPlugin as CasePlugin<never>,
  toss: tossPlugin as CasePlugin<never>,
  daangn: daangnPlugin as CasePlugin<never>,
  netflix: netflixPlugin as CasePlugin<never>,
};

export const getPlugin = (key: string | null | undefined) => (key ? PLUGINS[key as CaseKey] : undefined);
