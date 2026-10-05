/**
 * 숨겨진 진짜 효과 (docs/cases/toss.md §2-4, §2-6). 서버 전용 — 조 화면 번들에 들어가면 안 된다.
 * 보정 노브(±50%)는 CALIB 에 모으고 CALIBRATION.md 에 기록한다.
 */
import { ctrSuppressed, replay, type Rule } from "./replay";

export const CALIB = {
  /** ΔC = −clickRecovery·L_off + clickBonus·s  (스펙 −0.25 / 0.012) */
  deltaC: { offlineKeep: 0.25, bonus: 0.012 },
  /** light AU 습관 침식 (스펙 −0.4% 상대, s=0.20 초과분 0.05 당) */
  erosion: { perStep: 0.004, threshold: 0.2, step: 0.05, samePurposeMult: 1.3, scale: 1 },
  /** 알림 수신 거부율 상대 변화 = −optOut·s */
  optOut: 0.35,
  /** 저빈도 서비스 S10~S12 에 집중되는 배수 */
  lowFreqMult: 3,
} as const;

export type Effect = {
  s: number;
  /** 인당 클릭 상대 변화 (온라인 진짜 값) */
  deltaC: number;
  /** light AU 상대 변화(완전 반영 시) */
  erosionRel: number;
  optOutRel: number;
};

export const ZERO: Effect = { s: 0, deltaC: 0, erosionRel: 0, optOutRel: 0 };

export function trueEffect(r: Rule): Effect {
  const { s, clickLossOffline } = replay(r);
  const deltaC = -CALIB.deltaC.offlineKeep * clickLossOffline + CALIB.deltaC.bonus * s;
  const over = Math.max(0, (s - CALIB.erosion.threshold) / CALIB.erosion.step);
  const erosionRel = -CALIB.erosion.perStep * CALIB.erosion.scale * over * (r.G === "same_purpose" ? CALIB.erosion.samePurposeMult : 1);
  return { s, deltaC, erosionRel, optOutRel: -CALIB.optOut * s };
}

/** 노출 n주차의 침식 진행률: 5주차부터 나타나 8주차에 완전 반영 */
export const erosionRamp = (week: number) => (week < 5 ? 0 : Math.min(1, (week - 4) / 4));

export { ctrSuppressed };
