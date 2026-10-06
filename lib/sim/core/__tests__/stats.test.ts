import { describe, expect, it } from "vitest";
import {
  chiSquareSf, clusterSE, cuped, cupedVarianceRatio, deltaRatio, designEffect, lognormalMixtureMoments, meanTest,
  mixtureQuantile, nonInferiority, normCdf, normInv, normSf, obfBoundary, powerMean, powerProp, propTest, sigFlags,
  srm, ssMean, ssProp, winsorize,
} from "../stats";
import { gaussian, mulberry32 } from "../rng";

const close = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe("정규분포", () => {
  it("normCdf 는 알려진 값과 일치", () => {
    close(normCdf(0), 0.5, 1e-14);
    close(normCdf(1.96), 0.9750021048517795, 1e-12);
    close(normCdf(-1), 0.15865525393145707, 1e-12);
  });
  it("꼬리에서도 정밀하다 (normSf)", () => {
    close(normSf(6) / 9.865876450376946e-10, 1, 1e-8);
    expect(normSf(10)).toBeGreaterThan(0);
  });
  it("normInv 는 알려진 분위수와 일치하고 normCdf 의 역함수", () => {
    close(normInv(0.975), 1.959963984540054, 1e-12);
    close(normInv(0.999), 3.090232306167813, 1e-10);
    close(normInv(0.5), 0, 1e-14);
    for (const p of [1e-8, 0.001, 0.2, 0.7, 0.999999]) close(normCdf(normInv(p)), p, 1e-12);
  });
  it("무한대·경계 입력에서 NaN 이 나오지 않는다", () => {
    expect(normCdf(Infinity)).toBe(1);
    expect(normCdf(-Infinity)).toBe(0);
    expect(normInv(0)).toBe(-Infinity);
    expect(normInv(1)).toBe(Infinity);
  });
});

describe("카이제곱 · SRM", () => {
  it("df=1, df=2 는 닫힌 형태와 일치", () => {
    close(chiSquareSf(3.84, 1), 2 * normSf(Math.sqrt(3.84)), 1e-12);
    close(chiSquareSf(5, 2), Math.exp(-2.5), 1e-12);
  });
  it("df=3 임계값 7.815 의 p 는 약 0.05 (프로토타입의 exp 근사는 틀리는 구간)", () => {
    close(chiSquareSf(7.814727903251179, 3), 0.05, 1e-9);
    expect(Math.abs(Math.exp(-7.8147 / 2) - 0.05)).toBeGreaterThan(0.01);
  });
  it("정확히 반반이면 p=1", () => {
    expect(srm([5000, 5000], [0.5, 0.5]).p).toBeCloseTo(1, 10);
  });
  it("당근 시나리오: 51.5 : 48.5 가 큰 표본에서는 SRM", () => {
    expect(srm([515000, 485000], [0.5, 0.5]).p).toBeLessThan(0.001);
    expect(srm([5150, 4850], [0.5, 0.5]).p).toBeGreaterThan(0.001); // 표본이 작으면 안 잡힘
  });
  it("3군 균등 배정, 비율이 합 1 이 아니어도 정규화", () => {
    const r = srm([100, 100, 100], [1, 1, 1]);
    expect(r.df).toBe(2);
    close(r.chi, 0);
  });
  it("길이가 다르면 에러", () => {
    expect(() => srm([1, 2], [1])).toThrow();
  });
});

describe("propTest / meanTest", () => {
  it("200/1000 vs 240/1000", () => {
    const r = propTest({ x: 200, n: 1000 }, { x: 240, n: 1000 });
    close(r.d, 0.04);
    expect(r.p).toBeGreaterThan(0.0305);
    expect(r.p).toBeLessThan(0.0312);
    expect(r.ci[0]).toBeGreaterThan(0);
    close(r.rel, 0.2);
  });
  it("alpha 를 줄이면 신뢰구간이 넓어진다", () => {
    const a = propTest({ x: 200, n: 1000 }, { x: 240, n: 1000 }, 0.05);
    const b = propTest({ x: 200, n: 1000 }, { x: 240, n: 1000 }, 0.01);
    expect(b.ci[1] - b.ci[0]).toBeGreaterThan(a.ci[1] - a.ci[0]);
  });
  it("meanTest: 평균 100 vs 102, SD 20, n 400 → z ≈ 1.414", () => {
    const r = meanTest({ m: 100, sd: 20, n: 400 }, { m: 102, sd: 20, n: 400 });
    close(r.z, 2 / Math.sqrt(2), 1e-9);
    close(r.p, 2 * normSf(Math.SQRT2), 1e-12);
  });
  it("차이가 0 이면 p=1, win=0.5", () => {
    const r = meanTest({ m: 5, sd: 1, n: 100 }, { m: 5, sd: 1, n: 100 });
    close(r.p, 1, 1e-12);
    close(r.win, 0.5, 1e-12);
  });
});

describe("표본 크기 · 검정력", () => {
  it("ssProp(10% vs 12%, α .05, power .8) ≈ 3,841", () => {
    const n = ssProp(0.1, 0.12, 0.05, 0.8);
    expect(n).toBeGreaterThan(3835);
    expect(n).toBeLessThan(3850);
  });
  it("ssMean: σ=10, δ=1 → 약 1,570", () => {
    expect(ssMean(10, 1, 0.05, 0.8)).toBe(1570);
  });
  it("계산한 표본 크기에서 달성 검정력은 목표 근처", () => {
    const n = ssProp(0.1, 0.12, 0.05, 0.8);
    close(powerProp(0.1, 0.02, n, 0.05), 0.8, 0.02);
    close(powerMean(10, 1, ssMean(10, 1, 0.05, 0.8), 0.05), 0.8, 0.01);
  });
  it("표본이 클수록 검정력이 높다", () => {
    expect(powerProp(0.1, 0.01, 50000, 0.05)).toBeGreaterThan(powerProp(0.1, 0.01, 5000, 0.05));
  });
});

describe("sigFlags", () => {
  it("none / bonferroni / bh", () => {
    expect(sigFlags([0.001, 0.02, 0.04], 0.05, "none")).toEqual([true, true, true]);
    expect(sigFlags([0.001, 0.02, 0.04], 0.05, "bonferroni")).toEqual([true, false, false]);
    expect(sigFlags([0.01, 0.04, 0.03, 0.2], 0.05, "bh")).toEqual([true, false, false, false]);
    expect(sigFlags([0.001, 0.02, 0.04], 0.05, "bh")).toEqual([true, true, true]);
  });
  it("BH 는 입력 순서를 보존한다", () => {
    expect(sigFlags([0.2, 0.001, 0.9], 0.05, "bh")).toEqual([false, true, false]);
  });
  it("빈 배열", () => {
    expect(sigFlags([], 0.05, "bh")).toEqual([]);
  });
});

describe("deltaRatio (Delta Method)", () => {
  it("X = c·Y 이면 비율이 상수라 SE = 0", () => {
    const r = deltaRatio(0.3 * 8, 8, 0.09 * 4, 4, 0.3 * 4, 1000);
    close(r.ratio, 0.3);
    close(r.se, 0, 1e-12);
  });
  it("몬테카를로: 이질적 사용자에서 델타 SE 가 실제 SD 와 맞고, 푸시 단위 이항 SE 는 과소", () => {
    const rng = mulberry32(12345);
    const user = () => {
      const heavy = rng() < 0.5;
      const p = heavy ? 0.04 : 0.24;
      const lam = heavy ? 15 : 3;
      // 1 + Poisson(lam)
      const L = Math.exp(-lam);
      let k = 0;
      let q = 1;
      do { k++; q *= rng(); } while (q > L);
      const s = k; // = 1 + poisson
      let c = 0;
      for (let i = 0; i < s; i++) if (rng() < p) c++;
      return [c, s] as const;
    };
    // 모집단 적률
    const N = 150000;
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    for (let i = 0; i < N; i++) { const [c, s] = user(); sx += c; sy += s; sxx += c * c; syy += s * s; sxy += c * s; }
    const mx = sx / N, my = sy / N;
    const vx = sxx / N - mx * mx, vy = syy / N - my * my, cxy = sxy / N - mx * my;
    const n = 1500;
    const { se } = deltaRatio(mx, my, vx, vy, cxy, n);
    // 실제 비율의 표본 변동
    const ratios: number[] = [];
    for (let r = 0; r < 500; r++) {
      let c = 0, s = 0;
      for (let i = 0; i < n; i++) { const [ci, si] = user(); c += ci; s += si; }
      ratios.push(c / s);
    }
    const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const sd = Math.sqrt(ratios.reduce((a, b) => a + (b - mean) ** 2, 0) / (ratios.length - 1));
    expect(se / sd).toBeGreaterThan(0.88);
    expect(se / sd).toBeLessThan(1.12);
    const naive = Math.sqrt((mx / my) * (1 - mx / my) / (my * n));
    // 푸시를 독립으로 보면 SE 가 좁게 나온다. (이 테스트의 이질성에서는 약 1.2배; 토스의 2.5~3배는 M5 에서 사례 적률로 검증)
    expect(sd / naive).toBeGreaterThan(1.1);
  });
});

describe("nonInferiority", () => {
  it("d=-0.2%p, se=0.3%p, 마진 -1%p → 통과", () => {
    const r = nonInferiority(-0.002, 0.003, -0.01);
    close(r.z, 0.008 / 0.003, 1e-9);
    expect(r.passed).toBe(true);
    expect(r.lowerBound).toBeGreaterThan(-0.01);
  });
  it("d=-1.2%p 이면 실패", () => {
    const r = nonInferiority(-0.012, 0.003, -0.01);
    expect(r.passed).toBe(false);
    expect(r.p).toBeGreaterThan(0.5);
  });
  it("단측이므로 같은 z 에서 양측 p 의 절반", () => {
    const r = nonInferiority(0.003, 0.003, 0);
    close(r.p, normSf(1), 1e-12);
  });
});

describe("cuped", () => {
  const a = { n: 10000, meanY: 10, varY: 100, meanX: 5, varX: 100, covYX: 70 };
  const b = { n: 10000, meanY: 11, varY: 100, meanX: 5.5, varX: 100, covYX: 70 };
  it("분산 배수 = 1 − ρ², θ = Cov/Var", () => {
    const r = cuped(a, b);
    close(r.theta, 0.7);
    close(r.varianceRatio, cupedVarianceRatio(0.7), 1e-12);
    close(r.se, r.rawSe * Math.sqrt(0.51), 1e-12);
  });
  it("공변량 평균이 우연히 벌어진 만큼 효과 추정을 보정", () => {
    const r = cuped(a, b);
    close(r.rawD, 1);
    close(r.d, 1 - 0.7 * 0.5, 1e-12);
  });
  it("θ=0 이면 원래 분석과 같다", () => {
    const r = cuped(a, b, 0);
    close(r.se, r.rawSe, 1e-12);
    close(r.d, r.rawD, 1e-12);
  });
});

describe("clusterSE", () => {
  it("같은 크기면 클러스터 평균의 표준오차", () => {
    const r = clusterSE([1, 3], [10, 10]);
    close(r.mean, 2);
    close(r.se, 1, 1e-12);
  });
  it("크기가 다르면 가중", () => {
    const r = clusterSE([1, 3], [10, 30]);
    close(r.mean, 2.5);
    close(r.se, 0.75, 1e-12);
  });
  it("클러스터가 1개면 에러", () => {
    expect(() => clusterSE([1], [10])).toThrow();
  });
  it("디자인 효과: m=3000, ICC=0.02 → sqrt ≈ 7.7", () => {
    close(Math.sqrt(designEffect(3000, 0.02)), Math.sqrt(1 + 2999 * 0.02), 1e-12);
    expect(Math.sqrt(designEffect(3000, 0.02))).toBeGreaterThan(7.5);
  });
});

describe("obfBoundary", () => {
  it("마지막 확인은 고정 표본 경계와 같고, 앞쪽일수록 엄격", () => {
    close(obfBoundary(5, 5, 0.05), 1.959963984540054, 1e-12);
    close(obfBoundary(1, 5, 0.05), 1.959963984540054 * Math.sqrt(5), 1e-12);
    const zs = [1, 2, 3, 4, 5].map((k) => obfBoundary(k, 5, 0.05));
    for (let i = 1; i < zs.length; i++) expect(zs[i]).toBeLessThan(zs[i - 1]);
  });
});

describe("winsorize (0 질량 + 로그정규)", () => {
  const mix = { zeroMass: 0.12, mu: 1.5, sigma: 1.1 };
  const fn = lognormalMixtureMoments(mix);

  it("cap=Infinity 는 해석적 적률과 같다", () => {
    const m1 = 0.88 * Math.exp(1.5 + 1.1 ** 2 / 2);
    close(fn(Infinity).m1, m1, 1e-9);
    close(fn(1e12).m1, m1, 1e-6);
  });
  it("cap 이 작을수록 평균·SD 가 줄고, cap=0 이면 0", () => {
    const raw = winsorize(fn, Infinity, 1000);
    const w = winsorize(fn, mixtureQuantile(mix, 0.99), 1000);
    expect(w.mean).toBeLessThan(raw.mean);
    expect(w.sd).toBeLessThan(raw.sd);
    expect(w.se).toBeLessThan(raw.se);
    expect(winsorize(fn, 0, 1000).mean).toBe(0);
  });
  it("몬테카를로: 표본에서 min(x, cap) 평균·SD 와 일치", () => {
    const g = gaussian(mulberry32(99));
    const rng = mulberry32(100);
    const cap = mixtureQuantile(mix, 0.99);
    const N = 400000;
    let s = 0, ss = 0;
    for (let i = 0; i < N; i++) {
      const x = rng() < mix.zeroMass ? 0 : Math.min(Math.exp(mix.mu + mix.sigma * g()), cap);
      s += x; ss += x * x;
    }
    const mean = s / N;
    const sd = Math.sqrt(ss / N - mean * mean);
    const w = winsorize(fn, cap, N);
    expect(Math.abs(w.mean / mean - 1)).toBeLessThan(0.01);
    expect(Math.abs(w.sd / sd - 1)).toBeLessThan(0.02);
  });
  it("분위수: q 가 0 질량 이하면 0", () => {
    expect(mixtureQuantile(mix, 0.1)).toBe(0);
    expect(mixtureQuantile(mix, 0.99)).toBeGreaterThan(mixtureQuantile(mix, 0.9));
  });
});
