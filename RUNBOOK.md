# Festival Hub · 실 환경 셋업 런북

정식 프로토타입을 실제로 띄우는 순서. `[명령]`은 터미널에서 실행, `[상현님]`은 계정/대시보드 작업(제가 대신 못 하는 부분).

전제: Node 18+ / Git 설치. 모든 터미널 명령은 이 `prototype/` 폴더에서 실행.

---

## 1. 의존성 설치 `[명령]`

```bash
npm install
```

참고: 이 프로젝트는 OneDrive 안에 있어 `node_modules`가 동기화되면 느려질 수 있다. OneDrive 설정에서 `prototype/node_modules` 폴더를 동기화 제외(선택적 동기화)하면 좋다.

---

## 2. Supabase 프로젝트 생성 `[상현님]`

1. https://supabase.com 로그인 후 New project
2. Region은 `Northeast Asia (Seoul)` 권장
3. Database Password는 안전하게 보관
4. 프로젝트 생성 완료까지 1-2분 대기

---

## 3. 환경변수 작성 `[상현님]`

1. Supabase 대시보드 > Project Settings > API 에서 두 값 복사
   - Project URL
   - anon public key
2. 예시 파일 복사 후 값 붙여넣기 `[명령]`

```bash
copy .env.local.example .env.local
```

3. `.env.local` 열어서 두 값 입력

```
NEXT_PUBLIC_SUPABASE_URL=https://<프로젝트>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

---

## 4. SQL 실행 `[상현님]`

Supabase 대시보드 > SQL Editor 에서 아래 순서 그대로 실행 (각 파일 내용 붙여넣고 Run).

1. `supabase/schema.sql`
2. `supabase/policies.sql`
3. `supabase/seed.sql`
4. `supabase/schema_v2_documents.sql`
5. `supabase/schema_v3.sql`  ← 신규 (평가/알림/정산/정책 + 컬럼 보강)

각 단계에서 에러 없이 완료되는지 확인. seed.sql은 데모 계정 3종을 만든다.

---

## 5. Storage 버킷 생성 `[상현님]`

1. 대시보드 > Storage > New bucket
   - 이름 `documents`
   - Public OFF (비공개)
   - File size limit 10MB
   - Allowed MIME: `application/pdf`, `image/jpeg`, `image/png`
2. SQL Editor에서 `supabase/storage_policies.sql` 실행

---

## 6. 로컬 실행 `[명령]`

```bash
npm run dev
```

- http://localhost:3000 접속
- 데모 계정 (seed.sql)
  - 셀러 `seller@festival.demo` / `festival2026` → /dashboard
  - 주최사 `host@festival.demo` / `festival2026` → /host
  - 관리자 `admin@festival.demo` / `festival2026` → /admin

---

## 7. 빌드/타입 검증 `[명령]`

```bash
npm run build
```

에러 없이 통과하면 스키마 v3 반영(types.ts / queries.ts)까지 정상.

---

## 다음 (Phase 1 이후)

- v3 테이블을 쓰는 화면 이관: 평가, 알림함, 개별 지급 정산, 소속/위생/매출공개 필드
- 이메일 인증번호 실발송(트랜잭션 메일) 연동
- 서류 종류 재조정 결정 (보건증/부스·트럭 사진 추가 여부, schema_v3.sql 하단 주석 참고)

**작성일 2026-08-05**
