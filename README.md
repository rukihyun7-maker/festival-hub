# Festival Hub · 프로토타입

야외행사·푸드트럭 QR결제 창업 프로젝트의 실제 구동 프로토타입.
Next.js 14 (App Router) + Supabase(Postgres + Auth) + Tailwind + Vercel 배포.

---

## 🎯 이 프로토타입의 목적

로컬 HTML 데모(`03_데모_시연용.html`)를 **실제 URL·실제 DB·실제 로그인**이 되는 웹 서비스로 발전시킨다.

- 여러 대의 폰·PC에서 접속 가능
- 실시간 데이터 동기화 (셀러 신청 → 주최사 즉시 확인)
- 실제 이메일 회원가입·비밀번호 암호화 로그인
- 배포 URL 확보 (예: `festival-hub.vercel.app`)
- 시드 미팅에서 링크 공유 → 투자자가 직접 접속 가능

---

## 📦 기술 스택

| 계층 | 기술 | 이유 |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS | 표준 · Vercel 최적화 · 서버 컴포넌트 |
| Backend | Supabase (Postgres + Auth + Storage) | 무료 티어 · 실시간 · RLS 보안 |
| 배포 | Vercel (프론트) + Supabase 호스팅 (백엔드) | 무료 · GitHub 연동 · 자동 배포 |
| 결제 (선택) | PortOne V2 SDK | 국내 PG 표준 · 테스트 모드 |

**월 비용**: 초기 무료. 사용자 1,000명 넘어가면 월 25달러 (Supabase Pro).

---

## 🗂 폴더 구조

```
prototype/
├── README.md                    ← 지금 이 파일
├── GETTING_STARTED.md          ← 30분 시작 가이드
├── DEPLOYMENT.md               ← 배포 상세 절차
├── package.json                ← npm 의존성
├── next.config.js              ← Next.js 설정
├── tsconfig.json               ← TypeScript 설정
├── tailwind.config.ts          ← Tailwind 설정
├── .env.example                ← 환경변수 예시
├── .gitignore
├── supabase/
│   ├── schema.sql             ← DB 테이블 정의 (즉시 실행 가능)
│   ├── policies.sql           ← Row Level Security (권한)
│   └── seed.sql               ← 샘플 데이터
├── src/
│   ├── app/
│   │   ├── layout.tsx         ← 전체 레이아웃
│   │   ├── page.tsx           ← 랜딩 페이지
│   │   ├── login/page.tsx     ← 로그인
│   │   ├── signup/page.tsx    ← 회원가입 (역할 선택)
│   │   ├── dashboard/page.tsx ← 로그인 후 역할별 리다이렉트
│   │   ├── seller/            ← 셀러 페이지 (5개 탭)
│   │   ├── host/              ← 주최사 페이지
│   │   └── admin/             ← 관리자 페이지
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts      ← 브라우저용 Supabase
│   │       └── server.ts      ← 서버용 Supabase
│   └── components/            ← 공통 컴포넌트
```

---

## 🚀 시작하기 (Quick Start)

### 1. 사전 준비 (한 번만)

**Supabase 계정 생성** (무료):
1. https://supabase.com 접속 → 회원가입
2. New Project 클릭 → 프로젝트명 `festival-hub`, 리전 `Northeast Asia (Seoul)`, 비밀번호 설정
3. 프로젝트 대시보드 → Settings → API → `Project URL`과 `anon public key` 복사

**Vercel 계정 생성** (무료):
1. https://vercel.com 접속 → GitHub 연동 회원가입

**Node.js 설치** (로컬 개발용):
- https://nodejs.org 에서 LTS 버전 다운로드 · 설치

### 2. 로컬 실행 (개발)

```bash
# 이 폴더로 이동
cd prototype

# 의존성 설치
npm install

# 환경변수 파일 생성
cp .env.example .env.local
# .env.local 편집 → Supabase URL·anon key 입력

# 개발 서버 실행
npm run dev
# → http://localhost:3000 접속
```

### 3. DB 스키마 실행 (한 번만)

Supabase 프로젝트 → SQL Editor → New Query:
1. `supabase/schema.sql` 내용 복사 → 실행
2. `supabase/policies.sql` 내용 복사 → 실행
3. (선택) `supabase/seed.sql` 실행 → 샘플 데이터 로드

### 4. 배포 (프로덕션)

**Vercel 배포**:
1. 이 `prototype` 폴더를 GitHub 저장소로 푸시
2. Vercel → New Project → GitHub 저장소 선택 → Import
3. Environment Variables에 `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_ANON_KEY` 추가
4. Deploy 클릭 → 2~3분 후 배포 완료
5. 자동 URL 확보 (예: `festival-hub-xxx.vercel.app`)

---

## 📊 개발 진행 상황

| 단계 | 상태 | 다음 요청 시 진행 |
|---|---|---|
| ✅ 프로젝트 스켈레톤 | 완료 (이번 단계) | - |
| ✅ Supabase 스키마 | 완료 | - |
| ✅ 인증 (로그인·회원가입) | 완료 (기본형) | 이메일 인증 강화 |
| ⏳ 셀러 페이지 5개 탭 | 미개발 | 다음 단계에서 진행 |
| ⏳ 주최사 페이지 | 미개발 | 다음 단계에서 진행 |
| ⏳ 관리자 페이지 | 미개발 | 다음 단계에서 진행 |
| ⏳ 결제 연동 (PortOne) | 미개발 | Phase 2 |
| ⏳ 이메일 알림 | 미개발 | Phase 2 |

---

## 🎬 시드 미팅용 시연 시나리오 (배포 후)

1. **투자자 앞에서 URL 공유** → `festival-hub.vercel.app`
2. **셀러 계정으로 로그인** → 프로필·메뉴 등록 · 시뮬레이터 사용
3. **로그아웃 → 주최사 계정 로그인** → 방금 셀러 신청이 실시간으로 표시됨
4. **주최사가 승인** → 다시 셀러로 로그인 → 승인 알림 확인
5. **관리자 계정 로그인** → 셀러 인사이트에서 실시간 매출·활동 통계 확인
6. **투자자 폰으로 직접 접속** → 미팅 후에도 확인 가능

**이것이 다른 시드 라운드 스타트업 대비 결정적 차별점**입니다. 기획서만 있는 곳 vs. 실제 서비스가 살아있는 곳.

---

## 📞 다음 단계 요청 방법

Claude에게 다음처럼 요청하시면 됩니다:

- "셀러 페이지 5개 탭 개발해줘"
- "주최사 대시보드 만들어줘"
- "관리자 셀러 인사이트 페이지 만들어줘"
- "PortOne 결제 연동 넣어줘"
- "이메일 알림 기능 추가해줘"

각 요청마다 완성된 코드가 이 폴더에 추가됩니다.
