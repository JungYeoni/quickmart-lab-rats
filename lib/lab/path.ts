/** 점 표기 경로(예: "metrics.primary")로 중첩 객체를 읽고 쓴다. 쓰기는 불변. */
type Obj = Record<string, unknown>;

export function getPath(obj: Obj, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Obj)[k] : undefined), obj);
}

export function setPath(obj: Obj, path: string, value: unknown): Obj {
  const [head, ...rest] = path.split(".");
  if (rest.length === 0) return { ...obj, [head]: value };
  const child = obj[head] && typeof obj[head] === "object" ? (obj[head] as Obj) : {};
  return { ...obj, [head]: setPath(child, rest.join("."), value) };
}
