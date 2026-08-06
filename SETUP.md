# Festival Hub · 셋업 가이드

3스텝(약 10분)으로 로컬 개발 환경을 구성합니다.

---

## Step 1 · Supabase 프로젝트 생성 (5분)

1. https://supabase.com 접속 → **Start your project**
2. GitHub·이메일로 가입 (무료)
3. **New Project** 클릭
4. 값 입력:
   - Name: `festival-hub-dev`
   - Database Password: 안전한 비밀번호 (관리자용 · 저장해두기)
   - Region: **Northeast Asia (Seoul)**
   - Pricing Plan: Free
5. **Create new project** → 2분 정도 대기
6. 완료되면 대시보드로 이동

**API 키 확인**
1. 왼쪽 사이드바 → **Project Settings** → **API**
2. 두 값을 복사해서 메모:
   - `Project URL`
   - `Project API keys > anon public`

---

## Step 2 · DB 스키마 설치 (2분)

Supabase 대시보드에서 SQL Editor를 열고 3개 파일을 순서대로 실행합니다.

**왼쪽 사이드바 → SQL Editor → + New query**

### 2-1. 스키마 생성
- `prototype/supabase/schema.sql` 파일을 열고 전체 복사
- SQL Editor에 붙여넣기 → **Run** (Ctrl+Enter)
- 정상 실행되면 "Success. No rows returned"

### 2-2. RLS 정책 설정
- `prototype/supabase/policies.sql` 파일을 열고 전체 복사
- SQL Editor → **+ New query** → 붙여넣기 → **Run**

### 2-3. 시드 데이터
- `prototype/supabase/seed.sql` 파일을 열고 전체 복사
- SQL Editor → **+ New query** → 붙여넣기 → **Run**
- 3개 계정과 8개 행사 + 신청 + 메뉴 + 매출 이력이 생성됩니다.

### 2-4. 스키마 v2 · 서류 관리 (선택)
- `prototype/supabase/schema_v2_documents.sql` 파일을 열고 전체 복사
- SQL Editor → **+ New query** → 붙여넣기 → **Run**
- `documents` 테이블 + RLS + 셀러 서류 5종 시드가 추가됩니다.
- `/seller/documents`에서 서류 관리 페이지 활성화

### 2-5. Storage 버킷 · 파일 업로드 활성화 (선택 · v2 필요)

서류 파일 실제 업로드를 원한다면:

**Step A · 버킷 생성**
1. Supabase 대시보드 → 좌측 사이드바 → **Storage**
2. **New bucket** 클릭
3. 설정 입력:
   - Name: `documents`
   - **Public bucket: OFF** (반드시 비공개)
   - File size limit: `10 MB`
   - Allowed MIME types: `application/pdf, image/jpeg, image/png`
4. **Create bucket** 클릭

**Step B · RLS 정책 실행**
1. SQL Editor → **+ New query**
2. `prototype/supabase/storage_policies.sql` 전체 복사 → 붙여넣기 → **Run**
3. 정책 4개(select · insert · update · delete)가 생성됩니다.

**동작 방식**
- 파일 경로: `{seller_id}/{kind}/{timestamp}_{filename}`
- 셀러: 본인 폴더 하위만 업로드/조회/삭제 가능
- 관리자: 전체 조회/삭제 가능
- 다운로드: 1시간 유효한 서명 URL 발급 (public URL 없음)

정책이 없으면 업로드 시 `new row violates row-level security policy` 에러가 발생합니다. Storage 활성화 후 `/seller/documents`에서 실제 PDF/이미지 업로드 가능.

**설치 확인**
- 사이드바 → **Table Editor**
- `events` 테이블에 8건, `profiles` 테이블에 3건, `menus`에 4건이 보이면 성공

---

## Step 3 · 로컬 앱 실행 (3분)

터미널에서 `prototype/` 폴더로 이동:

```bash
cd "01_야외행사_QR결제_창업/prototype"
```

### 3-1. 의존성 설치

```bash
npm install
```

### 3-2. 환경변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 열어 Step 1에서 복사한 두 값을 붙여넣습니다:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3-3. 개발 서버 시작

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

---

## 데모 계정

Step 2-3의 시드가 실행되었다면 다음 3계정으로 즉시 로그인 가능합니다.

| 역할 | 이메일 | 비밀번호 |
|---|---|---|
| 셀러 | `seller@festival.demo` | `festival2026` |
| 주최사 | `host@festival.demo` | `festival2026` |
| 관리자 | `admin@festival.demo` | `festival2026` |

**셀러로 로그인 → `/dashboard`** — 마감 임박 행사·서류 상태
**주최사로 로그인 → `/host`** — 신청자 관리·QR 발급
**관리자로 로그인 → `/admin`** — 전체 인사이트 (구현 예정)

---

## 다음 단계

- 로그인 후 `/events`에서 8개 행사 확인
- `/events/11111111-0000-4000-8000-000000000001` 상세 페이지 접속
- 셀러 계정으로 `/seller/simulator` 손익 시뮬레이터 사용
- 시뮬레이션 결과는 **저장** 시 `simulations` 테이블에 기록됨

---

## 트러블슈팅

### `Invalid API key` 에러
- `.env.local`의 `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 정확한지 확인
- 개발 서버 재시작 (`Ctrl+C` 후 `npm run dev`)

### 로그인 안 됨
- Supabase 대시보드 → **Authentication** → **Providers** → **Email**이 활성화 되어 있는지 확인
- **Confirm email** 옵션이 켜져 있으면 시드로 만든 계정은 이미 confirmed 상태

### `permission denied` 에러
- RLS 정책이 제대로 설치되지 않음
- `policies.sql`을 다시 실행
- 사이드바 → **Database** → **Tables** → 각 테이블의 **RLS enabled** 표시 확인

### 시드 실행 시 `crypt` 함수 에러
- Supabase는 기본 `pgcrypto` 확장을 제공하지만 활성화되어 있어야 함
- SQL Editor에서 다음 실행: `create extension if not exists pgcrypto;`

### 데이터가 안 보임
- 브라우저 콘솔(F12)에서 에러 확인
- Supabase 대시보드 → **Table Editor**에서 실제 데이터 존재 확인
- `.env.local`의 URL이 올바른 프로젝트인지 확인

---

## Vercel 배포 (선택)

로컬 확인 후 프로덕션 배포:

```bash
npm install -g vercel
vercel login
vercel --prod
```

배포 시 환경변수 2개를 Vercel 대시보드에서 설정:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Vercel → 프로젝트 → **Settings** → **Environment Variables**에서 추가.
