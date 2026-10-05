/** 배민 사례 고정 모집단 (docs/cases/baemin.md §1). 모든 수치는 교육용 가상 데이터. */

export const SEED = 20241001;

export const DAILY_INFLOW = 52000;
/** 실험 1일차 = 월요일로 둔다. 요일 인덱스 = (day-1) % 7 → 0~4 평일, 5 토, 6 일 */
export const WEEKDAY_MULT = [1, 1, 1, 1, 1, 1.08, 1.12];
export const SURFACE_STORE_HOME_MULT = 0.56;
/** 유입 일별 변동 ±4% */
export const INFLOW_NOISE = 0.04;

export const OS_KEYS = ["android", "ios_new", "ios_old"] as const;
export const TYPE_KEYS = ["general", "first_order", "member"] as const;
export const ACT_KEYS = ["heavy", "light"] as const;
export type Os = (typeof OS_KEYS)[number];
export type CustomerType = (typeof TYPE_KEYS)[number];
export type Activity = (typeof ACT_KEYS)[number];

const OS_SHARE: Record<Os, number> = { android: 0.59, ios_new: 0.33, ios_old: 0.08 };
const TYPE_SHARE: Record<CustomerType, number> = { general: 0.73, first_order: 0.08, member: 0.19 };
const ACT_SHARE: Record<Activity, number> = { heavy: 0.3, light: 0.7 };

export type Segment = { key: string; os: Os; type: CustomerType; act: Activity; share: number };

/** OS × 고객 유형 × 활동성 (곱 구조, 독립 가정) */
export const SEGMENTS: Segment[] = OS_KEYS.flatMap((os) =>
  TYPE_KEYS.flatMap((type) =>
    ACT_KEYS.map((act) => ({ key: `${os}/${type}/${act}`, os, type, act, share: OS_SHARE[os] * TYPE_SHARE[type] * ACT_SHARE[act] })),
  ),
);

// ── 기본 퍼널 (대조군) ──
export const CART_ADD: Record<CustomerType, number> = { general: 0.32, first_order: 0.3, member: 0.36 };
export const ABANDON: Record<CustomerType, number> = { general: 0.627, first_order: 0.712, member: 0.485 };
export const AOV: Record<CustomerType, number> = { general: 25200, first_order: 22800, member: 27500 };
export const NEAR_MIN: Record<CustomerType, number> = { general: 0.18, first_order: 0.22, member: 0.15 };
export const AOV_SD = 10300; // 주문 단위
export const GMV_SD = 9190; // 사용자 단위
export const CRASH: Record<Os, number> = { android: 0.0042, ios_new: 0.0042, ios_old: 0.008 };
export const REPURCHASE7 = 0.213;
export const MIN_ORDER_KRW = 15000;

export const WEEKEND_CART = 0.02;
export const WEEKEND_ABANDON = -0.012;
export const HEAVY_ABANDON = -0.03;
/** 실험 8~14일차는 대형 프로모션 */
export const PROMO = { from: 8, to: 14, abandon: -0.06, cart: 0.04 };

/**
 * 스펙에 기본값이 없어 가상으로 채운 지표들(진짜 효과는 모두 0, 노이즈만 있음).
 * 교육용 가상 데이터이며 CALIBRATION.md 에 기록되어 있다.
 */
export const VIRTUAL = {
  loadMeanMs: 1240,
  loadSdMs: 520,
  csRate: 0.012, // 주문 대비 문의율
  minReach: 0.74, // 장바구니 사용자 중 최소주문금액 도달 비율
  barClick: { general: 0.24, first_order: 0.3, member: 0.27 } as Record<CustomerType, number>, // 장바구니 사용자 중 바 클릭
};

/** P3 트리거 사용자(고허들 쿠폰 보유 + 최소금액 달성) */
export const TRIGGER = {
  share: { low: 0.041, high: 0.18 },
  /** 트리거 사용자는 장바구니에 담은 상태이고, 담은 뒤 주문까지 가는 기본 비율이 0.50 */
  cartRate: 1,
  baseConv: 0.5,
  baseAov: 29400,
  /** 쿠폰 운영 확대 시 트리거 사용자 1명당 가상 쿠폰 비용(원) */
  couponCostKrw: 1200,
};

export const isWeekend = (day: number) => (day - 1) % 7 >= 5;
export const isPromo = (day: number) => day >= PROMO.from && day <= PROMO.to;
