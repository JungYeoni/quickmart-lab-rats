-- 퀵마트 실험실 스키마
-- Supabase SQL Editor에 통째로 붙여넣고 Run

create extension if not exists pgcrypto;

-- 수업 (강의 회차)
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                -- 6자리 수업 코드
  title text not null,
  reveal_answers boolean not null default false,  -- 원문 정답 공개 여부
  allowed_cases text[] not null default array['baemin','toss','daangn','netflix'],
  max_teams_per_case int not null default 2,
  created_at timestamptz not null default now()
);

-- 조
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  name text not null,
  case_key text check (case_key in ('baemin','toss','daangn','netflix')),  -- 조가 고른 사례 (선택 전 null)
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (class_id, name)
);

-- 스텝 상태 (강사가 열고 닫음)
create table if not exists step_states (
  class_id uuid not null references classes(id) on delete cascade,
  step text not null check (step in ('s0_pick','s1_diagnose','s2_design','s3_run','s4_readout','s5_deep','s6_final','s7_lab','s8_share')),
  status text not null default 'locked' check (status in ('locked','open','closed')),
  updated_at timestamptz not null default now(),
  primary key (class_id, step)
);

-- 제출 (설계서, 결정, 근거). 재제출은 version 증가, 최신만 사용
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  case_key text not null,
  step text not null,
  phase text not null default 'main',      -- 사례 내부 Phase (예: baemin의 p2, p3)
  kind text not null check (kind in ('design','decision','note','diagnosis')),
  payload jsonb not null,
  version int not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists submissions_lookup on submissions (class_id, step, phase, kind, team_id, version desc);

-- 최신 제출만 보는 뷰
create or replace view latest_submissions as
select distinct on (class_id, team_id, step, phase, kind) *
from submissions
order by class_id, team_id, step, phase, kind, version desc;

-- 시뮬 결과 (design_hash로 캐시)
create table if not exists sim_runs (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  case_key text not null,
  phase text not null,
  design jsonb not null,
  design_hash text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists sim_runs_lookup on sim_runs (class_id, team_id, phase, created_at desc);

-- AI 리뷰
create table if not exists ai_reviews (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,   -- scope=class면 null
  step text not null,
  scope text not null check (scope in ('team','class','share')),
  model text not null,
  input_hash text not null,
  output jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_reviews_lookup on ai_reviews (class_id, step, scope, created_at desc);

-- 새 수업 생성 시 스텝 행 자동 생성
create or replace function init_steps() returns trigger language plpgsql as $$
begin
  insert into step_states (class_id, step)
  select new.id, s from unnest(array['s0_pick','s1_diagnose','s2_design','s3_run','s4_readout','s5_deep','s6_final','s7_lab','s8_share']) as s;
  return new;
end $$;
drop trigger if exists trg_init_steps on classes;
create trigger trg_init_steps after insert on classes for each row execute function init_steps();

-- RLS: 클라이언트(anon)는 읽기만. 쓰기는 서버(service role)에서만
alter table classes      enable row level security;
alter table teams        enable row level security;
alter table step_states  enable row level security;
alter table submissions  enable row level security;
alter table sim_runs     enable row level security;
alter table ai_reviews   enable row level security;

create policy "read classes"     on classes     for select using (true);
create policy "read teams"       on teams       for select using (true);
create policy "read steps"       on step_states for select using (true);
create policy "read submissions" on submissions for select using (true);
-- insert/update/delete 정책 없음 → anon 쓰기 불가, service role은 RLS 우회
-- sim_runs / ai_reviews 는 anon 읽기 정책을 두지 않는다(RLS 켜져 있으므로 anon 은 읽을 수 없음).
--   sim_runs.result 에는 숨긴 flags 와 진짜 효과가 들어 있어서, 서버 라우트(/api/simulate 등)가 조 화면용으로 걸러 내려준다.
-- 이미 예전 스키마를 적용한 DB 라면 아래 두 줄을 한 번 실행하세요(정책이 없으면 아무 일도 안 일어납니다).
drop policy if exists "read sim_runs" on sim_runs;
drop policy if exists "read ai_reviews" on ai_reviews;

-- Realtime 구독 대상
alter publication supabase_realtime add table step_states;
alter publication supabase_realtime add table submissions;
alter publication supabase_realtime add table ai_reviews;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table classes;
