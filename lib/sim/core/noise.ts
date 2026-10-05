/**
 * 노이즈 생성 (docs/sim-core.md §1). 모든 함수는 표준정규 난수 z 를 인자로 받는다 →
 * 호출하는 쪽이 crnStream 으로 키별 z 를 만들어 넘기면 공통 난수(CRN)가 지켜진다.
 */
import type { Rng } from "./rng";

/** 비율형 카운트: x = round(n·p + sqrt(n·p·(1−p))·z), 0 ≤ x ≤ n */
export function binomialCount(n: number, p: number, z: number): number {
  if (n <= 0) return 0;
  const mean = n * p;
  const sd = Math.sqrt(n * p * (1 - p));
  return Math.max(0, Math.min(n, Math.round(mean + sd * z)));
}

/** 평균형: 그룹 평균 = μ + (σ/√n)·z */
export function groupMean(mu: number, sigma: number, n: number, z: number): number {
  return mu + (sigma / Math.sqrt(n)) * z;
}

/** 표본 SD = σ·(1 + 0.02·z') */
export function sampleSd(sigma: number, z: number): number {
  return sigma * (1 + 0.02 * z);
}

/** 사용자 단위 적률 (Delta Method 용): X, Y 의 평균·분산·공분산 */
export type UserMoments = { meanX: number; meanY: number; varX: number; varY: number; covXY: number };

/**
 * 그룹 표본 적률 생성. 그룹 평균은 정규근사(상관 반영), 분산은 SD 에 0.02·z 의 흔들림.
 * next 는 표준정규 생성기(crnStream)이고 z 를 3개 소비한다.
 */
export function sampleGroupMoments(m: UserMoments, n: number, next: () => number): UserMoments {
  const z1 = next();
  const z2 = next();
  const z3 = next();
  const rho = m.covXY / Math.sqrt(m.varX * m.varY);
  const meanX = m.meanX + Math.sqrt(m.varX / n) * z1;
  const meanY = m.meanY + Math.sqrt(m.varY / n) * (rho * z1 + Math.sqrt(1 - rho * rho) * z2);
  const k = (1 + 0.02 * z3) ** 2; // 분산 배수(두 지표와 공분산에 같이 곱해 상관 유지)
  return { meanX, meanY, varX: m.varX * k, varY: m.varY * k, covXY: m.covXY * k };
}

/** 포아송 난수. λ<30 은 Knuth, 그 이상은 정규근사. */
export function poisson(lambda: number, rng: Rng): number {
  if (lambda <= 0) return 0;
  if (lambda < 30) {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= rng();
    } while (p > L);
    return k - 1;
  }
  // Box–Muller 한 번
  let u = 0;
  while (u === 0) u = rng();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
  return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * z));
}

export type HeavyTailParams = {
  /** 0 질량 (활동 없음) */
  zeroMass: number;
  /** 활동 사용자의 로그정규 μ, σ */
  mu: number;
  sigma: number;
  /** 사용자당 고래 확률과 고래 한 명의 평균 값 */
  whaleRate: number;
  whaleValue: number;
};

/**
 * 꼬리가 긴 지표(시청 시간 등)의 그룹 평균·SD.
 * 일반 사용자는 혼합분포의 해석적 적률로 정규근사하고, 고래 수는 포아송으로 뽑아 평균에 더한다
 * → 평균이 소수 사용자에 흔들리는 현상이 재현된다. z 는 일반 사용자 평균용, rng 는 고래 수용.
 */
export function heavyTailGroup(p: HeavyTailParams, n: number, z: number, rng: Rng): { mean: number; sd: number; whales: number } {
  const active = 1 - p.zeroMass;
  const m1 = active * Math.exp(p.mu + (p.sigma * p.sigma) / 2);
  const m2 = active * Math.exp(2 * p.mu + 2 * p.sigma * p.sigma);
  const sd0 = Math.sqrt(m2 - m1 * m1);
  const whales = poisson(n * p.whaleRate, rng);
  const mean = m1 + (sd0 / Math.sqrt(n)) * z + (whales * p.whaleValue) / n;
  // 고래가 섞이면 SD 도 커진다: 고래 몫의 2차 적률을 더함
  const wShare = (n * p.whaleRate * p.whaleValue * p.whaleValue) / n;
  const sd = Math.sqrt(sd0 * sd0 + wShare);
  return { mean, sd, whales };
}
