# LLM 리뷰 계약 (`/api/review`)

- 모델 Solar `solar-pro4` (Upstage, OpenAI 호환 API: `https://api.upstage.ai/v1`), max_tokens 2500, temperature 0.3, 응답은 **JSON만**(`response_format`의 JSON 모드 또는 json_schema 사용 → zod 검증, 실패 시 1회 재시도)
- 추론(reasoning) 토큰이 max_tokens를 잠식하지 않도록 `reasoning_effort`는 낮게 두고, 응답이 잘리면 max_tokens를 늘린다
- 루브릭 원천: `docs/cases/<case>.md`의 "루브릭"과 "결정 옵션" 섹션 (빌드 시 `lib/cases/<case>/rubric.ts`로 임베드)
- 원문 문장을 길게 인용하지 않는다. 사실은 각 사례 문서의 "원문에서 확인된 사실"만 사용

## 1. scope = team (조별, 제출 직후 자동)
입력
```json
{ "case": "toss", "step": "s2_design", "rubric": "...", "facts": "...",
  "submission": {...}, "sim": { "metrics": [...], "srmP": 0.41, "achievedPower": 0.83, "flags": ["RATIO_COMPOSITION"] },
  "revealed": false }
```
출력
```json
{ "score": 0-100, "strengths": ["..."], "issues": ["..."], "nudge_questions": ["..."], "vs_original": "" }
```
규칙
- flags는 조가 스스로 발견해야 할 함정. 플래그 이름이나 정답을 직접 말하지 말고 **질문으로 유도**(예: "CTR이 오른 게 사람들이 더 눌러서일까요, 덜 보내서일까요?")
- 수치는 sim에 있는 것만 인용. 지어내지 않음
- revealed=false면 vs_original은 빈 문자열
- 루브릭과 달라도 논리가 타당하면 인정

## 2. scope = class (강사용, 스텝 마감 후 버튼)
여러 사례가 섞여 있으므로 **개념 기준**으로 가로질러 비교한다.
입력: `{ "step": "s4_readout", "teams": [{ "team": "1조", "case": "baemin", "submission": {...}, "sim": {...} }, ...], "rubrics": { "<case>": "..." } }`
출력
```json
{
  "summary": "전체 경향 2~3문장",
  "concept_board": [{ "concept": "비율 지표의 구성 효과", "found_by": ["2조"], "missed_by": ["5조"], "note": "..." }],
  "team_cards": [{ "team": "1조", "case": "baemin", "score": 0-100, "one_liner": "...", "trap_status": { "SRM": "found|missed|n/a" } }],
  "cross_case_insight": "다른 사례의 같은 개념끼리 연결 (예: 배민 P3의 트리거 분석과 당근의 트리거 배정)",
  "discussion_questions": ["...", "..."]
}
```

## 3. scope = share (직소 공유용, s8)
조별 2분 브리핑 초안 생성: `{ "case", "story_in_3_lines", "traps_we_hit": [...], "one_lesson_for_other_teams": "..." }`

구현(M8): 비용을 아끼려고 조마다 호출하지 않고 **한 번의 호출로 모든 조를 만든다.** 출력은 위 객체에 `team` 을 더해 `{ "briefs": [ ... ] }` 로 감싼다. 입력은 조별 `{ team, case, memo, decisions, flags }`(결정 메모 + 결정 요약 + 시뮬레이션 함정). 강사만 만들 수 있고(`scope=share`, `team_id` null), 조 화면은 `/api/share` 로 최신 결과를 읽는다. 정답 공개 전에는 함정 이름이 든 문장을 서버에서 걸러서 내려준다(규칙 3).

## 4. 비용 가드
- team: 제출 1회당 1번, 재제출 30초 쿨다운 / class·share: 강사 버튼, 스텝당 30초 스로틀
- input_hash 동일 시 ai_reviews 캐시 재사용
