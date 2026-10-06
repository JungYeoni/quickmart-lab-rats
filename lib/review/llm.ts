import "server-only";
import OpenAI from "openai";

/** LLM 호출 경계. 모델이 JSON 문자열을 돌려준다고만 가정하고, 파싱·검증은 호출하는 쪽(generate.ts)이 한다. */
export interface ReviewLLM {
  readonly model: string;
  /** truncated=true 면 max_tokens 에 걸려 잘렸다는 뜻 */
  complete(args: { system: string; user: string; maxTokens: number }): Promise<{ text: string; truncated: boolean }>;
}

export const SOLAR_MODEL = "solar-pro4";

export function solarLLM(apiKey: string): ReviewLLM {
  const client = new OpenAI({ apiKey, baseURL: "https://api.upstage.ai/v1", timeout: 60_000, maxRetries: 1 });
  return {
    model: SOLAR_MODEL,
    async complete({ system, user, maxTokens }) {
      const res = await client.chat.completions.create({
        model: SOLAR_MODEL,
        temperature: 0.3,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        // 추론 토큰이 max_tokens 를 잠식하지 않도록 낮게 (Upstage 확장 파라미터)
        ...({ reasoning_effort: "low" } as object),
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      });
      const choice = res.choices[0];
      return { text: choice?.message?.content ?? "", truncated: choice?.finish_reason === "length" };
    },
  };
}

/** 키가 없을 때 쓰는 가짜 LLM. 호출하는 쪽이 넘긴 produce() 결과를 JSON 으로 돌려준다. */
export function mockLLM(produce: () => unknown): ReviewLLM {
  return {
    model: "mock",
    async complete() {
      return { text: JSON.stringify(produce()), truncated: false };
    },
  };
}

/** UPSTAGE_API_KEY 가 있으면 Solar, 없으면 mock. 키는 서버에서만 읽는다(규칙 5). */
export function getLLM(mockOutput: () => unknown): ReviewLLM {
  const key = process.env.UPSTAGE_API_KEY;
  return key ? solarLLM(key) : mockLLM(mockOutput);
}
