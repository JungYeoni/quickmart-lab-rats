/** 데모 모드(DB 없이 플러그인만으로 화면 확인): 개발 환경에서는 항상, 운영에서는 ENABLE_DEMO=1 일 때만 */
export const demoEnabled = () => process.env.NODE_ENV !== "production" || process.env.ENABLE_DEMO === "1";
