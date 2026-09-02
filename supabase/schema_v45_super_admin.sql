-- ============================================
-- Festival Hub · Schema v45 · 메인(최고) 관리자 + 서브 관리자 생성
-- is_super_admin: 메인 관리자만 true. 관리자(admin) 계정 생성/삭제는 메인 관리자만 가능.
-- 서브 관리자는 role='admin'(전체 권한)이지만 is_super_admin=false → 다른 관리자를 만들 수 없음.
-- 재실행 안전.
-- ============================================

alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

-- 메인 관리자 지정 (본인 실계정) · 이메일은 실제 값으로 확인 후 실행
update public.profiles set is_super_admin = true
where email = 'rukihyun@naver.com';
