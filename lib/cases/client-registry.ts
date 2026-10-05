import type { CaseKey } from "../cases";
import { baeminClient } from "./baemin/ui";
import { tossClient } from "./toss/ui";
import type { ClientCase } from "./types";

/** 클라이언트에서 쓰는 사례 정의. 서버 전용 코드(시뮬 엔진, 루브릭, 정답 해설)는 import 하지 않는다. */
const CLIENT_CASES: Partial<Record<CaseKey, ClientCase>> = { baemin: baeminClient, toss: tossClient };

export const getClientCase = (key: string | null | undefined) => (key ? CLIENT_CASES[key as CaseKey] : undefined);
