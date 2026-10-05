/** 넷플릭스 엔진 공용 헬퍼: 시청 시간 지표의 평균·SD (원시 / 윈저라이징 / 로그), 기간별 SD 보정. 서버 전용. */
import { lognormalMixtureMoments, mixtureQuantile, type Comparison } from "@/lib/sim/core";
import { HOURS_MIX, RHO_CUPED, WINDOW_RHO } from "./population";

export type SimOptions = { seed?: number; noise?: boolean; withTruth?: boolean };
export type HoursTreatment = "raw" | "winsorize_p99" | "log";

const momentFn = lognormalMixtureMoments(HOURS_MIX);
const RAW = momentFn(Infinity);
export const HOURS_MEAN_EXACT = RAW.m1;
const sdOf = (m: { m1: number; m2: number }) => Math.sqrt(Math.max(0, m.m2 - m.m1 * m.m1));
export const WINSOR_CAP = mixtureQuantile(HOURS_MIX, 0.99);

/** ln(1 + X·scale) 의 평균과 분산 (구적법). 0 질량은 값 0. */
function logMoments(scale: number): { mean: number; sd: number } {
  const { zeroMass, mu, sigma } = HOURS_MIX;
  const step = 0.05;
  let m1 = 0;
  let m2 = 0;
  for (let z = -6; z <= 6; z += step) {
    const w = (Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI)) * step;
    const y = Math.log(1 + Math.exp(mu + sigma * z) * scale);
    m1 += w * y;
    m2 += w * y * y;
  }
  m1 *= 1 - zeroMass;
  m2 *= 1 - zeroMass;
  return { mean: m1, sd: Math.sqrt(Math.max(0, m2 - m1 * m1)) };
}

/** 멤버 평균(w 주 창)의 SD 배율: 멤버 간 지속 성분은 기간이 길어도 남는다. */
export const windowFactor = (weeks: number) => Math.sqrt(WINDOW_RHO + (1 - WINDOW_RHO) / Math.max(1, weeks));
export const cupedFactor = Math.sqrt(1 - RHO_CUPED * RHO_CUPED);

export type HoursStat = { mA: number; mT: number; sd: number };

/** 대조군 평균 mA, 상대 효과 e 를 받은 처치군 평균 mT, 멤버 단위 SD(창 w주, CUPED 반영). 효과는 시청 시간에 곱해지는 형태. */
export function hoursStat(treatment: HoursTreatment, e: number, weeks: number, cuped: boolean): HoursStat {
  let mA: number, mT: number, sd0: number;
  if (treatment === "raw") {
    mA = RAW.m1;
    mT = RAW.m1 * (1 + e);
    sd0 = sdOf(RAW);
  } else if (treatment === "winsorize_p99") {
    const wA = momentFn(WINSOR_CAP);
    mA = wA.m1;
    mT = (1 + e) * momentFn(WINSOR_CAP / (1 + e)).m1;
    sd0 = sdOf(wA);
  } else {
    const a = logMoments(1);
    mA = a.mean;
    mT = logMoments(1 + e).mean;
    sd0 = a.sd;
  }
  return { mA, mT, sd: sd0 * windowFactor(weeks) * (cuped ? cupedFactor : 1) };
}

/** 주간 시청 시간 원시 SD (1주 창) */
export const RAW_WEEK_SD = sdOf(RAW);
/** 고래(주 60시간 이상) 비율 */
export function whaleShare(): number {
  const { zeroMass, mu, sigma } = HOURS_MIX;
  const zz = (Math.log(60) - mu) / sigma;
  // 1 - Φ(zz) 를 오차함수 근사 없이 구적법으로
  let s = 0;
  for (let z = zz; z <= 8; z += 0.01) s += (Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI)) * 0.01;
  return (1 - zeroMass) * s;
}

/** 로그 변환 지표는 효과를 기하평균 변화율로 읽는다 */
export function asLogComparison(c: Comparison): Comparison {
  return { ...c, rel: Math.exp(c.d) - 1, relCi: [Math.exp(c.ci[0]) - 1, Math.exp(c.ci[1]) - 1], method: "로그 변환(ln(1+시간)) 평균 차이 · 기하평균 변화율" };
}
