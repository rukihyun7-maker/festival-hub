# Festival Hub · 프로젝트 컨텍스트

이 파일은 Claude Code가 세션 시작 시 자동으로 읽는 프로젝트 안내서입니다. 새 세션에서는 이 문서만 봐도 프로젝트 전반과 규칙, 다음 우선순위를 파악할 수 있습니다.

## 프로젝트 요약

**이름**: Festival Hub · 야외행사 QR결제 플랫폼
**한 줄**: 푸드트럭·음식부스 사업자에게 행사 자리를 찾아주고, 주최사에게 검증된 셀러를 연결하는 B2B2C SaaS
**단계**: Investor demo 프로토타입 · 실사용자 온보딩 전 (2026-08 기준)
**독립 스타트업**: 이 서비스는 상현님 개인 신규 사업이며, **소프트먼트와 무관**합니다. 산출물에 "소프트먼트/Softment" 노출 금지.

## 기술 스택

- **Frontend**: Next.js 14.2 (App Router) · TypeScript · React 18
- **Styling**: Tailwind CSS 3.4 · CSS 변수 기반 커스텀 토큰 시스템 (globals.css)
- **UI Font**: Wanted Sans Variable · Pretendard (CDN)
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Charts**: Recharts 2.12
- **배포**: Vercel (예정) · 정적 handoff 프로토타입은 `_design_handoff/`에 별도

## 폴더 구조

```
prototype/
├── CLAUDE.md                            ← 이 파일
├── SETUP.md                             ← Supabase 셋업 3~5스텝 가이드
├── DESIGN_SYSTEM.md                     ← Handoff 확정 디자인 토큰 v2.0
├── .env.local.example                   ← 환경변수 템플릿
├── package.json                         ← Next 14 + supabase-js + recharts
├── tailwind.config.ts                   ← 확장 토큰 (accent · ink · info 등)
├── supabase/
│   ├── schema.sql                       ← 6 테이블 (profiles·events·applications·menus·sales·simulations)
│   ├── policies.sql                     ← Row Level Security 정책
│   ├── seed.sql                         ← 데모 계정 3개 + 시드 데이터
│   ├── schema_v2_documents.sql          ← documents 테이블 확장 (서류 5종)
│   └── storage_policies.sql             ← Storage 버킷 documents용 RLS
├── src/
│   ├── app/
│   │   ├── layout.tsx                   ← 폰트 CDN 로드
│   │   ├── page.tsx                     ← 랜딩 (미구현 · TODO)
│   │   ├── globals.css                  ← CSS 변수 + 컴포넌트 클래스
│   │   ├── login/page.tsx               ← 데모 원클릭 로그인 3계정
│   │   ├── dashboard/page.tsx           ← 셀러 홈 (서류·행사 실시간)
│   │   ├── events/
│   │   │   ├── page.tsx                 ← 이벤트 목록 (필터·정렬)
│   │   │   └── [id]/page.tsx            ← 이벤트 상세 (서류 게이팅 + 신청)
│   │   ├── seller/
│   │   │   ├── page.tsx                 ← 마이페이지 (참여이력·매출·메뉴)
│   │   │   ├── documents/page.tsx       ← 서류 5종 관리 + Storage 업로드
│   │   │   └── simulator/page.tsx       ← 손익 시뮬레이터 (저장 가능)
│   │   ├── host/
│   │   │   ├── page.tsx                 ← 주최사 대시보드 (신청자 승인/거절)
│   │   │   ├── create-event/page.tsx    ← 행사 등록 (EventForm 재사용)
│   │   │   └── events/[id]/edit/page.tsx← 행사 수정 (EventForm 재사용)
│   │   └── admin/
│   │       ├── page.tsx                 ← 인사이트 (GMV 차트·Top셀러·활동)
│   │       ├── users/page.tsx           ← 사용자 관리 (role 변경)
│   │       ├── events/page.tsx          ← 행사 검수 (status·삭제)
│   │       ├── documents/page.tsx       ← 서류 검증 (승인·반려)
│   │       └── payments/page.tsx        ← 결제 관제 (정산·이슈)
│   ├── components/
│   │   ├── AppNav.tsx                   ← 공통 상단 내비 (role별 메뉴)
│   │   └── EventForm.tsx                ← create/edit 공용 폼
│   └── lib/
│       ├── types.ts                     ← DB 타입 + 파생 유틸
│       └── supabase/
│           ├── client.ts                ← 브라우저 클라이언트
│           ├── server.ts                ← 서버 클라이언트 (cookies)
│           └── queries.ts               ← 조회·mutation 헬퍼 전체
```

**Handoff HTML** (별도): `../_design_handoff/design_handoff_festival_hub/Festival Hub.dc.html` · 하이파이 프로토타입 원본

## 디자인 시스템 v2.0 (엄수)

`DESIGN_SYSTEM.md` 참고. 요약:

- **배경**: 웜 페이퍼 `#FBF9F4` (검정 배경 X)
- **텍스트**: 잉크 `#14120E` (순검정 X)
- **브랜드 색**: 옐로우 `#FFC800` + 하드 셰도우 `0 2px 0 #C99F00` (CTA만)
- **정보형 강조**: 인포 블루 `#8FA6DE`
- **폰트**: Wanted Sans Variable · `font-variant-numeric: tabular-nums`
- **라운드**: input 10 / card 14 / modal 20 / pill 99
- **그림자**: 2개만 (CTA 하드 셰도우 · 드롭다운) · 나머지는 border
- **애니메이션**: `fhUp` 진입만 · rotate/scale/bounce 금지
- **반응형**: `@media` 사용 금지 · `clamp()` + `auto-fit/minmax`
- **아이콘**: 이모지 6종만 허용 (★ ☆ ✓ ✕ 🔔 ×) · 나머지는 lucide 등으로 대체
- **그라디언트 금지** · **font-weight 900 금지** (800까지)

## 코드 규칙

- 클라이언트 컴포넌트는 파일 상단 `'use client';`
- Supabase 조회는 `src/lib/supabase/queries.ts`에 헬퍼로 통합 (직접 클라이언트 호출 X)
- 새 DB 컬럼 추가 시: schema SQL 파일 → types.ts → queries.ts → 페이지 순서
- Tailwind는 커스텀 유틸 클래스(`.btn-primary`·`.card`·`.chip` 등) 우선 사용, 인라인 스타일 최소화
- 파일 상단 JSDoc 주석으로 페이지 목적 · 규칙 요약

### 금지 요소

- **소프트먼트/Softment 표기** — 이 서비스는 독립 스타트업
- **em-dash(—)와 가운뎃점(·) 남발** — 하이픈/콤마/슬래시로 대체
- **토스/Toss 등 외부 브랜드명** — 스타일 참조만, 이름 노출 X
- **하드코딩된 데이터** — Supabase 조회로 실제 반영

## Supabase 스키마

**6개 기본 테이블** (`schema.sql`):
- `profiles` — 사용자 (role: seller/host/admin)
- `events` — 행사 (status: open/upcoming/close/canceled)
- `applications` — 신청 (status: pending/approved/rejected/canceled) · unique(event_id, seller_id)
- `menus` — 셀러 메뉴 (category: MAIN/SIDE/DRINK/SET)
- `sales` — 매출 이력
- `simulations` — 시뮬 저장 (input/result JSONB)

**v2 확장** (`schema_v2_documents.sql`):
- `documents` — 서류 5종 (kind: business_reg/food_hygiene/insurance/hygiene_edu/vehicle_reg) · unique(seller_id, kind)

**v5 확장** (예정 · `schema_v5_local_info.sql`) · 인근지역 정보:
- `local_info` — 아파트·대학·축제·상권 통합 테이블 (category별 JSONB data)
- `event_nearby` — 이벤트-지역 매칭 캐시 (거리 m)
- `events.lat/lng/geocoded_at` 컬럼 추가
- `find_nearby(lat, lng, radius)` RPC 함수 (Haversine 근사)
- 상세: `docs/LOCAL_INFO_INTEGRATION.md`

**v3 확장** (`schema_v3.sql`) · 운영 테스트 대비:
- `ratings` — 주최사 → 셀러 평가 (hygiene/punctual/service) + `seller_rating_summary` 뷰
- `notifications` — 알림함 (kind: deadline/review/docs/new_event/settlement)
- `settlements` — 주최사 개별 지급 정산 (status: pending/paid) · PG 없이 운영형
- `platform_settings` — 평점 정책 싱글턴 1행
- 컬럼 보강: `profiles`(affiliation·hygiene_gear·share_flags·notif_prefs), `events`(kind·source), `menus`(description·signature·image_url)

**Storage 버킷** (`storage_policies.sql`):
- `documents` (private) · 경로 `{seller_id}/{kind}/{ts}_{filename}` · 서명 URL 1시간

**RLS 원칙**:
- profiles/events 조회는 공개
- applications/sales/simulations는 본인 + 관련 호스트 + admin
- documents는 본인 + admin

## 데모 계정 (seed.sql 시드 후)

| 역할 | 이메일 | 비밀번호 | 랜딩 |
|---|---|---|---|
| 셀러 | seller@festival.demo | festival2026 | /dashboard |
| 주최사 | host@festival.demo | festival2026 | /host |
| 관리자 | admin@festival.demo | festival2026 | /admin |

## 개발 명령어

```bash
npm install          # 의존성 설치
npm run dev          # 로컬 개발 서버 (localhost:3000)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint
```

**Supabase 설정 순서** (SETUP.md 참고):
1. https://supabase.com 프로젝트 생성
2. `.env.local.example` → `.env.local` 복사 + URL/anon key 입력
3. SQL Editor에서 실행: `schema.sql` → `policies.sql` → `seed.sql` → `schema_v2_documents.sql` → `schema_v3.sql`
4. Storage 대시보드에서 `documents` 버킷 생성 (Public OFF · 10MB · PDF/JPG/PNG) → `storage_policies.sql`

## 현재 미구현 · 우선순위

작업 순서 제안. 위에서 아래로:

**Priority 1 · MVP 필수**
- [ ] 랜딩 페이지 `/` — 셀러/주최사 각 방향 CTA
- [ ] 회원가입 후 온보딩 (셀러: 프로필+서류 유도, 주최사: 첫 행사 등록 유도)
- [ ] 실제 결제 흐름 — Toss/PortOne 등 PG 연동 (Sandbox 먼저)
- [ ] 알림 시스템 — `notifications` 테이블 + 벨 실시간 반영

**Priority 2 · 운영 정착**
- [ ] 셀러 매출 기록 폼 — 현재 `sales` 테이블에 자동 기록 없음
- [ ] QR 코드 발급 페이지 — 승인된 셀러에게 QR 생성 및 다운로드
- [ ] 정산 명세서 PDF 다운로드 — `/admin/payments`에서
- [ ] 결제 수단별 통계 실 데이터화 — `sales` 테이블에 `by_method jsonb` 컬럼 추가
- [ ] **인근지역 정보 통합** — 아파트 세대수·대학 학생수·대학축제 데이터를 이벤트 상세/시뮬레이터에 표시. 상세 실행 명세는 `docs/LOCAL_INFO_INTEGRATION.md` 참조. Phase A~G 총 4-5일 예상. schema_v5_local_info.sql · scripts/geocode-events.ts · scripts/sync-universities.ts · scripts/sync-apartments.ts · /admin/festivals · NearbyInfoCard 순서로 진행.

**Priority 3 · 완성도**
- [ ] 알림 설정 페이지 `/settings`
- [ ] 회원 정보 수정 (프로필 폼)
- [ ] Storage 이미지 리사이즈 (썸네일 CDN)
- [ ] 모바일 하단 탭바 (좁은 화면 UX)
- [ ] i18n (영어 버전)

**Priority 4 · 배포**
- [ ] Vercel 프로덕션 배포 + 커스텀 도메인
- [ ] 이메일 인증 흐름 확인 (Supabase Auth 기본 SMTP → SendGrid/Resend 교체)
- [ ] 프로덕션 시드 별도 관리 (데모 계정 분리)

## 자주 하는 작업 · Claude Code 프롬프트 예시

- **새 페이지 추가**: "`/notifications` 페이지 만들어줘 · 알림 목록 + 읽음 처리"
- **DB 컬럼 추가**: "sales 테이블에 `by_method jsonb` 컬럼 추가하고 셀러 매출 페이지에서 활용"
- **디자인 톤 조정**: "이 카드에 옐로우 accent 바 추가해줘 (card-apply 스타일)"
- **버그 수정**: "seller/documents에서 파일 삭제 시 storage 파일 정리 안 되는 문제 확인"
- **리팩터**: "queries.ts가 커졌으니 events / documents / admin 파일로 분할"

## 커뮤니케이션 규칙 (사용자 선호)

- **간결 · 직접적**: 불필요한 설명 최소화 · 리마인드성 문장 X
- **실행 전 사용 스킬 밝히기**: `▶ 사용 스킬: xxx` 한 줄
- **em-dash · 가운뎃점 남발 금지**: 하이픈/콤마/슬래시 사용
- **파일 링크 필수**: 산출물은 `computer://` 경로로 공유

## 관련 산출물 (프로젝트 상위 폴더)

- `../01_사업계획서.html/.md` — 마스터 IR 문서
- `../02_투자자_레퍼런스.html/.md` — 6개 글로벌 케이스 + FAQ 10
- `../부속자료/` — 시장 인사이트·Case Study·Investor FAQ
- `../_design_handoff/` — 하이파이 HTML 프로토타입 + Vercel 배포 설정

---

**마지막 갱신**: 2026-08-04
**작성자 컨텍스트**: 이상현 (독립 스타트업 오너)
