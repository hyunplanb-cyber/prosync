-- ============================================================
-- ProSync — Supabase 테이블 스키마 (v2)
-- Supabase SQL Editor에서 순서대로 실행하세요
-- ============================================================

-- 1. users 테이블 (정수 ID 유지)
CREATE TABLE IF NOT EXISTS public.users (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member'
                CHECK (role IN ('master', 'member')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. projects 테이블 (UUID TEXT 키)
CREATE TABLE IF NOT EXISTS public.projects (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name        TEXT NOT NULL,
  description TEXT,
  start_date  DATE,
  end_date    DATE,
  members     JSONB NOT NULL DEFAULT '[]',
  color       TEXT NOT NULL DEFAULT '#6366f1',
  notion_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. tasks 테이블 (UUID TEXT 키, Phase / Task / SubTask 통합)
CREATE TABLE IF NOT EXISTS public.tasks (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id      TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id       TEXT REFERENCES public.tasks(id) ON DELETE CASCADE,
  depth           SMALLINT NOT NULL DEFAULT 0
                    CHECK (depth BETWEEN 0 AND 2),
  user_id         BIGINT,
  title           TEXT NOT NULL,
  role            TEXT,
  description     TEXT,
  task_start      DATE,
  task_end        DATE,
  current_start   DATE,
  current_end     DATE,
  status          TEXT NOT NULL DEFAULT '예정'
                    CHECK (status IN ('예정', '진행중', '완료', '지연')),
  color           TEXT,
  expanded        BOOLEAN NOT NULL DEFAULT TRUE,
  is_manual       BOOLEAN NOT NULL DEFAULT FALSE,
  status_manual   BOOLEAN NOT NULL DEFAULT FALSE,
  deliverables    JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. documents 테이블 (UUID TEXT 키)
CREATE TABLE IF NOT EXISTS public.documents (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id  TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  files       JSONB NOT NULL DEFAULT '[]',
  links       JSONB NOT NULL DEFAULT '[]',
  document_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 인덱스
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_project_id  ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id   ON public.tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON public.documents(project_id);

-- ============================================================
-- RLS 비활성화 (개발 단계)
-- 멀티테넌시 적용 시: ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
-- ============================================================
ALTER TABLE public.users     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 초기 유저 시드 (앱에서 첫 실행 시 프로젝트/태스크를 자동 시드)
-- ============================================================
INSERT INTO public.users (id, name, email, password, role) VALUES
  (1, '김마스터', 'master@test.com', '1234', 'master'),
  (2, '이디자인', 'lee@test.com',    '1234', 'member'),
  (3, '박개발',   'park@test.com',   '1234', 'member'),
  (4, '최기획',   'choi@test.com',   '1234', 'member')
ON CONFLICT (email) DO NOTHING;

SELECT setval('public.users_id_seq', 10);
