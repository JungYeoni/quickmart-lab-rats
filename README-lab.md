# 사례별 A/B 테스트 실습 플랫폼 시작 키트 (Claude Code용)

```
quickmart-lab/
├ CLAUDE.md               ← Claude Code가 자동으로 읽는 프로젝트 명세
├ docs/sim-core.md        ← 공통 엔진 규칙 + 사례 플러그인 인터페이스
├ docs/cases/             ← 사례 4개 명세 (배민, 토스, 당근, Netflix) + 개념 커버리지
├ docs/review-contract.md ← LLM 리뷰 계약
├ supabase/schema.sql     ← DB 스키마
└ reference/prototype.html← 지금까지 만든 단일 HTML (UI·카피 원본)
```

---

## 0. 준비 (15분)

1. 계정: GitHub, Vercel, Supabase, Upstage Console(Solar API 키 발급, 결제 수단 등록)
2. Node.js 20 이상 설치 → 터미널에서 `node -v`
3. Claude Code 설치 (데스크톱 앱 또는 `npm install -g @anthropic-ai/claude-code`)
4. 이 키트 압축을 풀고 폴더 이름을 `quickmart-lab`으로

## 1. Supabase 세팅 (5분)

1. Supabase → New project (Region: Northeast Asia (Seoul))
2. SQL Editor → `supabase/schema.sql` 전체 붙여넣기 → Run
3. Project Settings → API 에서 세 값 복사: Project URL, anon key, service_role key

### Supabase 없이 먼저 화면 보기 (데모)

`npm install` 후 `npm run dev` 를 실행하고 `http://localhost:3000/demo/baemin` 을 열면, DB 없이 배민 사례의 조 화면(진단 → 설계 → 실행 → 결과 → 결정)을 처음부터 끝까지 눌러볼 수 있어요. 제출한 내용은 그 브라우저에만 저장되고 왼쪽 아래 "데모 초기화"로 지울 수 있어요. 운영 배포에서는 기본적으로 꺼져 있고, 켜려면 `ENABLE_DEMO=1` 을 넣어요.

> 이미 예전 `schema.sql` 을 실행해 둔 DB 라면 SQL Editor 에서 다음 두 줄을 한 번 실행하세요. 숨긴 경고 플래그가 들어 있는 `sim_runs` 를 수강생이 직접 읽지 못하게 막는 거예요.
> ```sql
> drop policy if exists "read sim_runs" on sim_runs;
> drop policy if exists "read ai_reviews" on ai_reviews;
> ```

## 2. 환경변수

프로젝트 루트에 `.env.local` (Claude Code가 스캐폴딩한 뒤 만들어도 됨):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
UPSTAGE_API_KEY=up_...
ADMIN_PASSWORD=원하는-강사-비밀번호
ADMIN_SESSION_SECRET=아무-긴-랜덤-문자열
```

`.env.local`은 절대 GitHub에 올리지 않기 (`.gitignore` 확인).

## 3. Claude Code에 붙여넣을 프롬프트 (마일스톤 순서대로)

`quickmart-lab` 폴더에서 Claude Code를 열고 하나씩. 각 단계 끝에 직접 `npm run dev`로 확인한 뒤 다음으로.

**M1. 스캐폴딩**
```
CLAUDE.md와 docs/ 전체, reference/prototype.html을 읽고 마일스톤 1을 진행해줘.
Next.js 15 + TS + Tailwind로 스캐폴딩하고(기존 파일 유지), prototype.html의 CSS 토큰(라이트/다크)을 Tailwind 테마로 옮겨줘.
수업 생성 → 조 입장 → 사례 선택(사례당 최대 조 수 제한) → 스텝 상태 Realtime까지. 끝나면 확인 방법을 알려줘.
```

**M2. 공통 엔진**
```
마일스톤 2. docs/sim-core.md대로 lib/sim/core를 만들고 통계 함수 단위 테스트를 작성해줘.
deltaRatio, nonInferiority, cuped, clusterSE, obfBoundary, winsorize까지 포함. UI는 아직 손대지 마.
```

**M3. 배민 사례 (공통 컴포넌트 확정)**
```
마일스톤 3. docs/cases/baemin.md로 배민 플러그인을 만들고 검증 시나리오를 Vitest로 전부 통과시켜줘.
그다음 조 화면 전 스텝을 배민 기준으로 완성해줘. 폼은 designSchema+formMeta 자동 렌더링, Readout은 공통 컴포넌트로.
이후 사례들이 이 컴포넌트를 재사용하니 사례 전용 로직이 공통 컴포넌트에 새지 않게 해줘.
스펙과 다르게 해야 할 부분이 생기면 임의로 바꾸지 말고 먼저 물어봐.
```

**M4. 강사 화면 + AI 리뷰**
```
마일스톤 4. 강사 화면(스텝 컨트롤, 사례 선택 현황, 사례별 라이브 보드, 같은 사례 조끼리 결과 비교표)과
docs/review-contract.md의 team/class 리뷰를 만들어줘. 조 화면 API 응답에 flags가 절대 안 나가는지 테스트도 추가해줘.
```

**M5~M7. 나머지 사례 (하나씩)**
```
마일스톤 5. docs/cases/toss.md로 토스 플러그인을 만들어줘. 검증 시나리오 전부 통과가 먼저고,
그다음 전용 패널(오프라인 리플레이, 구성 효과 분해, 서비스별 AU 표, HTE)을 components/cases/toss에 만들어줘.
파라미터 보정이 필요하면 ±50% 안에서 하고 CALIBRATION.md에 기록해줘.
```
(M6은 daangn.md, M7은 netflix.md로 같은 문장에서 사례명과 패널 이름만 바꿔서)

**M8. 함정 연구소 + 직소 공유 + 정답 공개**
```
마일스톤 8. prototype.html의 함정 연구소를 s7_lab으로 옮기고, s8_share(AI share 브리핑 초안 + 결정 메모)와 정답 공개 토글을 만들어줘.
```

**M9. 점검과 배포**
```
마일스톤 9. 10개 조가 서로 다른 사례로 동시에 제출·시뮬하는 상황을 스크립트로 점검하고 느린 부분을 고쳐줘.
그다음 GitHub 저장소 생성과 Vercel 배포를 단계별로 같이 진행해줘. 환경변수는 Vercel 대시보드에 넣을게.
```

## 4. 배포

```
npm i -g vercel
vercel login
vercel          # preview 배포
vercel --prod   # 운영 배포
```
Vercel 대시보드 → Settings → Environment Variables에 `.env.local` 값 전부 등록 후 재배포.

## 5. 수업 전날 체크리스트

- [ ] Supabase 프로젝트 깨우기 (무료 티어는 1주 비활성 시 일시정지)
- [ ] 리허설 수업 하나 만들어서 폰 2대 + 노트북으로 조 3개 입장 테스트
- [ ] AI 종합 분석 1회 실행해서 응답 시간·비용 확인
- [ ] 사례당 최대 조 수 설정 확인 (조 수 ÷ 4 올림 권장)
- [ ] Netflix 사례: 원문 재확인 후 reveal 해설의 수치 보완
- [ ] 수업 코드 QR 만들어 첫 슬라이드에 넣기
- [ ] 유료 강의라면 Vercel Pro 여부 확인 (Hobby는 비상업용)

## 알아둘 트레이드오프

- 스키마상 anon 키로 sim_runs를 읽을 수 있어서, 마음먹은 수강생은 숨긴 경고 플래그를 볼 수 있어요. 수업용으로는 감수 가능한 수준이고, 막고 싶으면 sim_runs/ai_reviews의 read 정책을 지우고 서버 라우트로만 내려주면 돼요(Claude Code에 요청).
- 모든 숫자는 가상 데이터예요. 화면에 출처와 함께 계속 명시하세요.
