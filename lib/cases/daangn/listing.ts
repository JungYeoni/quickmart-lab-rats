/**
 * 거래완료 게시글 검색 노출 실험 엔진 (docs/cases/daangn.md §2-4, §3-6): p3.
 * 개인 지표(작성률·채팅 전환·재시도)와 시장 지표(판매완료율)를 함께 만든다. 시장 지표는 사용자 단위 배정에서 간섭으로 희석되고,
 * 동네 단위 배정은 간섭이 사라지는 대신 유효 표본이 동네 수로 줄어(디자인 효과) 표준오차가 커진다.
 */
import {
  binomialCount, crnZ, designHash, normCdf, normInv, propTest, srm, ssProp,
  type Comparison, type Flag, type MetricResult, type PeriodRow, type Readout,
} from "@/lib/sim/core";
import { CALIB } from "./effects";
import { BASE, ICC, LISTINGS_PER_DAY, NEIGHBORHOODS, SALT, SEARCH_USERS_PER_DAY, SEED } from "./population";
import type { DesignP3 } from "./schema";

export type SimOptions = { seed?: number; noise?: boolean; withTruth?: boolean };

type Key = "create" | "chat" | "retry" | "sell";
const META: Record<Key, { id: string; label: string; unit: "user" | "listing" }> = {
  create: { id: "listing_creation_rate", label: "게시글 작성률 (검색 사용자 중 7일 내 작성 완료)", unit: "user" },
  chat: { id: "search_to_chat", label: "검색 → 채팅 시작 전환율", unit: "user" },
  retry: { id: "search_retry", label: "검색 재시도율", unit: "user" },
  sell: { id: "sell_through_7d", label: "신규 게시글 7일 내 판매완료율", unit: "listing" },
};
const BY_ID: Record<string, Key> = { listing_creation_rate: "create", sell_through_7d: "sell", search_to_chat: "chat", search_retry: "retry" };

/** 처치군 상대 효과 (진짜 값). 시장 지표는 배정 단위에 따라 다르다. */
const relEffect = (k: Key, unit: "user" | "neighborhood") =>
  k === "create" ? CALIB.listing.create : k === "chat" ? CALIB.listing.chat : k === "retry" ? CALIB.listing.retry : unit === "neighborhood" ? CALIB.listing.sell : CALIB.listing.sellUser;

export function simulateListing(d: DesignP3, opts: SimOptions = {}): Readout {
  const seed = opts.seed ?? SEED;
  const noise = opts.noise ?? true;
  const withTruth = opts.withTruth ?? true;
  const aa = d.aa === true;
  const cluster = d.randomization_unit === "neighborhood";
  const D = d.duration_days;
  const primary = BY_ID[d.primary];
  const guard = d.guardrails.map((g) => BY_ID[g]);
  const secondary: Key = primary === "sell" ? "create" : "sell";
  const keys: Key[] = [primary, ...guard.filter((k) => k !== primary), ...(guard.includes(secondary) ? [] : [secondary])];

  const perDay = (k: Key) => (META[k].unit === "user" ? SEARCH_USERS_PER_DAY : LISTINGS_PER_DAY) / 2;
  const nTot = (k: Key) => perDay(k) * D;
  const perCluster = (k: Key) => nTot(k) / (NEIGHBORHOODS / 2);
  const deff = (k: Key) => 1 + (perCluster(k) - 1) * ICC[k];
  const p0 = (k: Key) => BASE[k];
  const pT = (k: Key, expected = true) => p0(k) * (1 + (aa || !expected ? 0 : relEffect(k, d.randomization_unit)));

  const z = (day: number | string, arm: string, metric: string) =>
    noise ? crnZ(seed, { case: "daangn", phase: "p3", period: day, segment: "*", arm, metric: `${metric}${SALT.listing}` }) : 0;
  const count = (n: number, p: number, zz: number) => (noise ? binomialCount(n, p, zz) : n * p);

  // ── 일별 생성 (동네 단위 배정이면 모든 날에 공유되는 동네 효과를 더한다) ──
  type Day = Record<Key, { n: number; x: number }>;
  const days: Record<"A" | "B", Day[]> = { A: [], B: [] };
  const persist = {} as Record<Key, Record<"A" | "B", number>>;
  for (const k of ["create", "chat", "retry", "sell"] as Key[]) {
    persist[k] = { A: 0, B: 0 };
    if (cluster && noise) {
      const sdP = Math.sqrt(((p0(k) * (1 - p0(k))) / nTot(k)) * (deff(k) - 1));
      persist[k] = { A: sdP * z("persist", "A", k), B: sdP * z("persist", "B", k) };
    }
  }
  for (let day = 1; day <= D; day++) {
    for (const arm of ["A", "B"] as const) {
      const row = {} as Day;
      for (const k of ["create", "chat", "retry", "sell"] as Key[]) {
        // 동네 단위 배정은 그룹 크기가 동네 크기에 따라 조금씩 다르다
        const share = 0.5 + (cluster && noise ? 0.006 * z(day, "A", `${k}size`) : 0);
        const total = META[k].unit === "user" ? SEARCH_USERS_PER_DAY : LISTINGS_PER_DAY;
        const n = Math.round(total * (arm === "A" ? share : 1 - share));
        const p = Math.min(0.999, Math.max(0.001, (arm === "A" ? p0(k) : pT(k)) + (arm === "A" ? persist[k].A : persist[k].B)));
        row[k] = { n, x: Math.round(count(n, p, z(day, arm, k))) };
      }
      days[arm].push(row);
    }
  }
  const sum = (arm: "A" | "B", k: Key) => days[arm].reduce((s, r) => ({ n: s.n + r[k].n, x: s.x + r[k].x }), { n: 0, x: 0 });

  const se = d.analysis_se === "cluster_robust" && cluster;
  const compare = (k: Key) => {
    const a = sum("A", k);
    const b = sum("B", k);
    const scale = se ? Math.sqrt(deff(k)) : 1;
    const r = propTest(a, b, d.alpha, scale);
    const c: Comparison = {
      vs: "A", arm: "B", d: r.d, ci: r.ci, rel: r.rel, relCi: r.relCi, p: r.p, win: r.win, significant: r.p < d.alpha,
      method: `비율 z 검정${se ? " · 클러스터 강건 SE" : cluster ? " · 사용자 단위 SE" : ""}`,
    };
    return { a, b, c };
  };

  const roleOf = (k: Key): "P" | "G" | "S" => (k === primary ? "P" : guard.includes(k) ? "G" : "S");
  const metrics: MetricResult[] = keys.map((k) => {
    const { a, b, c } = compare(k);
    return { key: META[k].id, label: META[k].label, role: roleOf(k), type: "prop", arms: { A: a, B: b }, comparisons: [c] };
  });

  // ── SRM: 사용자 배정은 사용자 수, 동네 배정은 동네 수로 확인한다 ──
  const counts = cluster
    ? (() => {
        const a = noise ? binomialCount(NEIGHBORHOODS, 0.5, z("srm", "*", "hoods")) : NEIGHBORHOODS / 2;
        return [a, NEIGHBORHOODS - a];
      })()
    : [sum("A", "create").n, sum("B", "create").n];
  const srmRes = srm(counts, [0.5, 0.5]);

  const periods: PeriodRow[] = Array.from({ length: D }, (_, i) => ({
    period: i + 1,
    arms: Object.fromEntries(
      (["A", "B"] as const).map((arm) => {
        const r = days[arm][i];
        return [arm, { users: r.create.n, creators: r.create.x, chats: r.chat.x, retries: r.retry.x, listings: r.sell.n, sold: r.sell.x }];
      }),
    ),
  }));

  const panels: Record<string, unknown> = { meta: { aa, unit: d.randomization_unit } };
  if (cluster) {
    const kk = primary;
    panels.clusters = {
      neighborhoods: NEIGHBORHOODS,
      perArm: [counts[0], counts[1]],
      meanUsersPerNeighborhood: Math.round(nTot("create") / (NEIGHBORHOODS / 2)),
      meanListingsPerNeighborhood: Math.round(nTot("sell") / (NEIGHBORHOODS / 2)),
      iccEstimate: noise ? ICC[kk] * (1 + 0.1 * z("icc", "*", kk)) : ICC[kk],
    };
  }

  // ── 진짜 효과 · 계획 · 달성 검정력 (강사 전용) ──
  let planned: Readout["planned"];
  let achievedPower: number | undefined;
  if (withTruth) {
    const base = p0(primary);
    const mdeAbs = base * (d.mde_pct / 100);
    const nPer = Math.ceil(ssProp(base, base + mdeAbs, d.alpha, d.power) * (cluster ? deff(primary) : 1));
    planned = { nPerArm: nPer, days: Math.ceil(nPer / perDay(primary)) };
    if (!aa) {
      const dTrue = base * relEffect(primary, d.randomization_unit);
      const seTrue = Math.sqrt(((2 * base * (1 - base)) / nTot(primary)) * (cluster ? deff(primary) : 1));
      achievedPower = normCdf(Math.abs(dTrue) / seTrue - normInv(1 - d.alpha / 2));
    }
    panels._truth = {
      note: "진짜 효과(상대). 조 화면에 보내지 않는다.",
      effects: Object.fromEntries((["create", "chat", "retry", "sell"] as Key[]).map((k) => [META[k].id, aa ? 0 : relEffect(k, d.randomization_unit)])),
      marketEffectIfCluster: CALIB.listing.sell,
      designEffect: Object.fromEntries((["create", "chat", "retry", "sell"] as Key[]).map((k) => [META[k].id, cluster ? deff(k) : 1])),
    };
  }

  const flags: Flag[] = [];
  if (srmRes.p < 0.001) flags.push("SRM");
  if (!cluster && primary === "sell") flags.push("CONTAMINATION");
  if (cluster && !se) flags.push("NAIVE_SE");
  if (achievedPower !== undefined && achievedPower < 0.5) flags.push("UNDERPOWERED");

  return {
    caseKey: "daangn",
    phase: "p3",
    designHash: designHash("daangn", "p3", d),
    periods,
    stoppedAt: D,
    srm: { counts, ratios: [0.5, 0.5], p: srmRes.p },
    metrics,
    planned,
    achievedPower,
    panels,
    flags,
  };
}
