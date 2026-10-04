import { randomInt } from "node:crypto";

// 0/O, 1/I/L 처럼 헷갈리는 글자를 뺀 6자리 수업 코드
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateClassCode(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function normalizeClassCode(raw: string): string {
  return raw.trim().toUpperCase();
}
