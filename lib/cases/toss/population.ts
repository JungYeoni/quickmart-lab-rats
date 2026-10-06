/** 토스 사례 고정 모집단 (docs/cases/toss.md §1). 모든 수치는 교육용 가상 데이터. 스펙에 값이 없는 것은 "가상"으로 표시한다. */
import { SEGMENTS, type SegKey } from "./replay";

export const SEED = 20251001;
export const USERS = 24_000_000;

/**
 * 사용자 간 이질성 (가상, 스펙에 없음): 활동량 배수 a 와 반응 성향 배수 b 의 분산. E[a]=E[b]=1, 서로 독립.
 * 이 값이 클수록 같은 사용자의 푸시 반응이 서로 닮아서(군집) 푸시 단위 SE 가 실제보다 좁게 나온다.
 * 스펙 검증 시나리오 #2(푸시 단위 SE 가 사용자 단위 대비 2.5~3.5배 좁음)에 맞춰 정했다.
 */
export const HET = { sigmaA2: 0.3, sigmaB2: 0.3 };

/** CUPED 공변량 상관 (스펙): 실험 전 4주 클릭 수 ρ=0.70, 앱 오픈 여부 ρ=0.60 */
export const PRE_RHO = { clicks: 0.7, au: 0.6 };

/** 주간 AU 의 사용자 내 지속성(가상): 같은 사용자의 주간 AU 는 서로 매우 닮아서, 주마다 잡음이 새로 생기지 않고 대부분 공유된다. */
export const AU_PERSIST = 0.8;

/**
 * 노이즈 스트림 라벨(보정용). 같은 시드에서도 라벨이 다르면 다른 난수열이다. 검증 시나리오(#6 우연히 유의한 서비스 1~2개, #8 CUPED 효과)가
 * 고정 시드의 우연한 한 가지 경우를 요구하므로, 효과 크기는 스펙 그대로 두고 이 라벨만 골라 맞췄다. CALIBRATION.md 참고.
 */
export const SALT = { au: 31, svc: 0 };

export const OPT_OUT_MONTHLY = 0.003;

/** 서비스 12개: 주간 서비스 AU(가상). S10~S12 는 저빈도 서비스 */
export const SERVICES = [
  { id: "S01", au: 0.42 }, { id: "S02", au: 0.35 }, { id: "S03", au: 0.3 }, { id: "S04", au: 0.26 },
  { id: "S05", au: 0.22 }, { id: "S06", au: 0.18 }, { id: "S07", au: 0.15 }, { id: "S08", au: 0.12 },
  { id: "S09", au: 0.1 }, { id: "S10", au: 0.05 }, { id: "S11", au: 0.04 }, { id: "S12", au: 0.03 },
] as const;
export const isLowFreq = (id: string) => id === "S10" || id === "S11" || id === "S12";

/** 인당 주간 매출: 0 질량 0.82 + 로그정규(활동 사용자 평균 9,000원, 꼬리 두꺼움) + 드문 고래 */
export const REVENUE = (() => {
  const sigma = 1.4;
  return { zeroMass: 0.82, mu: Math.log(9000) - (sigma * sigma) / 2, sigma, whaleRate: 2e-6, whaleValue: 3_000_000 };
})();

// ───────────────────────── 사용자 적률 (닫힌 형태) ─────────────────────────
// 사용자 i 의 주간 발송 수 S ~ Poisson(λ·a_i), 클릭 수 C | S ~ Binomial(S, c·b_i).
// 한 주: Var(S)=λ+λ²σa², Var(C)=λc+(λc)²Vab, Cov=λc+λ²cσa² (Vab = (1+σa²)(1+σb²)−1).
// "사용자 안의 우연"(주마다 새로 생김, D 주면 D 배)과 "사용자 간 차이"(주마다 공유, D 주면 D² 배)로 나뉜다.

export type Cov2 = { s: number; c: number; sc: number };

const vab = () => (1 + HET.sigmaA2) * (1 + HET.sigmaB2) - 1;

export const withinWeek = (lam: number, c: number): Cov2 => ({ s: lam, c: lam * c, sc: lam * c });
export const betweenWeek = (lam: number, c: number): Cov2 => ({ s: lam * lam * HET.sigmaA2, c: lam * lam * c * c * vab(), sc: lam * lam * c * HET.sigmaA2 });

export type Moments = { meanS: number; meanC: number; varS: number; varC: number; cov: number };

/** 한 세그먼트의 D 주 합계 적률 */
export function totalMoments(lam: number, c: number, D: number): Moments {
  const w = withinWeek(lam, c);
  const b = betweenWeek(lam, c);
  return { meanS: D * lam, meanC: D * lam * c, varS: D * w.s + D * D * b.s, varC: D * w.c + D * D * b.c, cov: D * w.sc + D * D * b.sc };
}

/** 세그먼트 구성(사용자 무작위 배정)을 포함한 전체 사용자 적률 */
export function mixMoments(parts: { share: number; m: Moments }[]): Moments {
  const mean = (f: (m: Moments) => number) => parts.reduce((s, p) => s + p.share * f(p.m), 0);
  const meanS = mean((m) => m.meanS);
  const meanC = mean((m) => m.meanC);
  return {
    meanS, meanC,
    varS: mean((m) => m.varS) + parts.reduce((s, p) => s + p.share * (p.m.meanS - meanS) ** 2, 0),
    varC: mean((m) => m.varC) + parts.reduce((s, p) => s + p.share * (p.m.meanC - meanC) ** 2, 0),
    cov: mean((m) => m.cov) + parts.reduce((s, p) => s + p.share * (p.m.meanS - meanS) * (p.m.meanC - meanC), 0),
  };
}

export { SEGMENTS };
export type { SegKey };
