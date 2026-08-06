# 인근지역 정보 통합 · 실행 명세서

**목적**: 셀러가 행사 신청 전에 예상 유동인구·수요를 판단할 수 있도록, 이벤트 반경 1km 이내의 **아파트 세대수 · 대학교 학생수 · 대학 축제 일정**을 실 데이터로 표시.

**대상**: Claude Code 세션에서 이 문서를 읽고 순서대로 실행. 각 스텝은 독립적으로 커밋 가능한 단위.

**전제**: `CLAUDE.md` 규칙 준수 (디자인 시스템 v2.0 · queries.ts 통합 · em-dash 금지 · 하드코딩 데이터 X).

---

## 1. 데이터 소스 · API 목록

| 카테고리 | 소스 | 엔드포인트 | 필드 | 갱신 주기 |
|---|---|---|---|---|
| 아파트 | 국토교통부 공동주택 기본정보 | `apis.data.go.kr/1613000/AptBasisInfoServiceV3` | 단지명·주소·세대수·동수·사용승인일 | 월 1회 |
| 아파트 (서울) | 서울시 열린데이터광장 | data.seoul.go.kr `OA-15818` | 세대수·주소 | 월 1회 |
| 대학교 | 대학알리미 (한국대학교육협의회) | `openapi.academyinfo.go.kr` | 대학명·주소·재학생·정원 | 연 1회 |
| 대학축제 | 공식 API 없음 | 위키트리·univ20 크롤링 또는 관리자 수동 입력 | 대학명·일정·라인업 | 연 1회 (4월 갱신) |

**API 키 발급 (실행 담당자가 수동으로)**
- https://www.data.go.kr 회원가입 → 마이페이지 → 개발계정 신청
- 위 API 3개(국토부·서울시·대학알리미) 각각 활용 신청 · 즉시 승인
- 발급 후 `.env.local`에 저장:
  ```
  DATA_GO_KR_API_KEY=xxxxxxxxxx
  DATA_SEOUL_API_KEY=xxxxxxxxxx
  ```
- 대학알리미는 별도 회원가입 후 [openapi.academyinfo.go.kr](https://openapi.academyinfo.go.kr) 에서 키 발급
  ```
  ACADEMYINFO_API_KEY=xxxxxxxxxx
  ```
- `.env.local.example`에 위 3개 키 이름만 추가하고, 실제 키는 노출 금지

---

## 2. 스키마 확장 · `schema_v5_local_info.sql`

### 2-1. 파일 생성

```
prototype/supabase/schema_v5_local_info.sql
```

### 2-2. 내용

```sql
-- ============================================
-- Festival Hub · Schema v5 · Local Info
-- 인근지역 정보 (아파트·대학·축제·상권)
-- ============================================

-- events에 위경도 추가 (지오코딩 결과)
alter table public.events
  add column if not exists lat numeric(9,6),
  add column if not exists lng numeric(9,6),
  add column if not exists geocoded_at timestamptz;

create index if not exists idx_events_geo on public.events(lat, lng) where lat is not null;

-- 인근 지역 정보 통합 테이블 (다형)
create table if not exists public.local_info (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('apartment', 'university', 'festival', 'commercial', 'transit')),
  external_id text,        -- 원본 시스템 식별자 (중복 방지용, 예: 국토부 단지고유번호)
  name text not null,
  region text not null,
  address text,
  lat numeric(9,6) not null,
  lng numeric(9,6) not null,
  data jsonb not null default '{}'::jsonb,  -- category별 자유 필드
  source text not null,     -- 'molit' | 'seoul' | 'academyinfo' | 'manual' | 'crawler'
  synced_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(category, external_id, source)
);

create index if not exists idx_local_info_region on public.local_info(region);
create index if not exists idx_local_info_category on public.local_info(category);
create index if not exists idx_local_info_geo on public.local_info(lat, lng);

-- 이벤트-지역 매칭 캐시 (반경 조회 결과 저장)
create table if not exists public.event_nearby (
  event_id uuid references public.events(id) on delete cascade,
  local_info_id uuid references public.local_info(id) on delete cascade,
  distance_m integer not null,
  primary key (event_id, local_info_id)
);

create index if not exists idx_event_nearby_event on public.event_nearby(event_id);

-- updated_at 자동 갱신
drop trigger if exists trg_local_info_updated on public.local_info;
create trigger trg_local_info_updated before update on public.local_info
  for each row execute function public.set_updated_at();

-- RLS · 조회는 전체 공개, 쓰기는 admin만
alter table public.local_info enable row level security;
alter table public.event_nearby enable row level security;

drop policy if exists "local_info_select_all" on public.local_info;
create policy "local_info_select_all" on public.local_info
  for select using (true);

drop policy if exists "local_info_admin_write" on public.local_info;
create policy "local_info_admin_write" on public.local_info
  for all using (public.user_role() = 'admin');

drop policy if exists "event_nearby_select_all" on public.event_nearby;
create policy "event_nearby_select_all" on public.event_nearby
  for select using (true);

drop policy if exists "event_nearby_admin_write" on public.event_nearby;
create policy "event_nearby_admin_write" on public.event_nearby
  for all using (public.user_role() = 'admin');

-- 반경 조회 함수 (m 단위 · Haversine 근사)
create or replace function public.find_nearby(
  event_lat numeric,
  event_lng numeric,
  radius_m integer default 1000
) returns table (
  id uuid,
  category text,
  name text,
  distance_m integer,
  data jsonb
) as $$
  select
    li.id,
    li.category,
    li.name,
    (6371000 * acos(
      cos(radians(event_lat)) * cos(radians(li.lat)) *
      cos(radians(li.lng) - radians(event_lng)) +
      sin(radians(event_lat)) * sin(radians(li.lat))
    ))::integer as distance_m,
    li.data
  from public.local_info li
  where (6371000 * acos(
      cos(radians(event_lat)) * cos(radians(li.lat)) *
      cos(radians(li.lng) - radians(event_lng)) +
      sin(radians(event_lat)) * sin(radians(li.lat))
    )) < radius_m
  order by distance_m
$$ language sql stable;
```

### 2-3. `data` JSONB 구조 예시

```jsonc
// category = 'apartment'
{
  "households": 1240,
  "buildings": 8,
  "type": "아파트",
  "approval_date": "2015-03-15"
}

// category = 'university'
{
  "enrolled": 18500,        // 재학생 수
  "capacity": 3200,         // 정원
  "campus": "본교",
  "type": "종합대"
}

// category = 'festival'
{
  "university_id": "uuid-of-local-info-university-row",
  "start_date": "2026-05-24",
  "end_date": "2026-05-26",
  "lineup": ["아티스트A", "아티스트B"],
  "external_entry": true    // 외부인 입장 가능 여부
}
```

---

## 3. 타입 확장 · `src/lib/types.ts`

```ts
export type LocalInfoCategory = 'apartment' | 'university' | 'festival' | 'commercial' | 'transit';

export interface LocalInfo {
  id: string;
  category: LocalInfoCategory;
  external_id: string | null;
  name: string;
  region: string;
  address: string | null;
  lat: number;
  lng: number;
  data: Record<string, unknown>;
  source: 'molit' | 'seoul' | 'academyinfo' | 'manual' | 'crawler';
  synced_at: string;
  updated_at: string;
}

export interface NearbyRow {
  id: string;
  category: LocalInfoCategory;
  name: string;
  distance_m: number;
  data: Record<string, unknown>;
}

export interface ApartmentData {
  households: number;
  buildings?: number;
  type?: string;
  approval_date?: string;
}

export interface UniversityData {
  enrolled: number;
  capacity?: number;
  campus?: string;
  type?: string;
}

export interface FestivalData {
  university_id?: string;
  start_date: string;
  end_date: string;
  lineup?: string[];
  external_entry?: boolean;
}
```

---

## 4. 쿼리 헬퍼 · `src/lib/supabase/queries.ts` 추가

```ts
export async function fetchNearby(eventId: string, radiusM = 1000): Promise<NearbyRow[]> {
  const supabase = createClient();
  const { data: e, error: e1 } = await supabase
    .from('events').select('lat, lng').eq('id', eventId).maybeSingle();
  if (e1 || !e?.lat || !e?.lng) return [];

  const { data, error } = await supabase.rpc('find_nearby', {
    event_lat: e.lat,
    event_lng: e.lng,
    radius_m: radiusM,
  });
  if (error) throw error;
  return (data ?? []) as NearbyRow[];
}

/** admin: 지역 정보 수동 등록/수정 */
export async function upsertLocalInfo(input: Omit<LocalInfo, 'id' | 'synced_at' | 'updated_at'>): Promise<LocalInfo> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('local_info')
    .upsert(input, { onConflict: 'category,external_id,source' })
    .select().single();
  if (error) throw error;
  return data as LocalInfo;
}
```

---

## 5. 데이터 수집 스크립트

### 5-1. 지오코딩 (이벤트 위경도 자동 저장)

**파일**: `prototype/scripts/geocode-events.ts`

**동작**: `events` 중 `lat is null`인 행에 대해 카카오 로컬 API로 주소 → 위경도 조회 후 업데이트.

- 사용 API: [카카오 로컬](https://developers.kakao.com/product/local) (무료 · 하루 30만 건)
- 환경변수: `KAKAO_REST_API_KEY`
- 실행: `npx tsx scripts/geocode-events.ts`

### 5-2. 아파트 배치 수집

**파일**: `prototype/scripts/sync-apartments.ts`

**동작**:
1. 국토부 API 호출 (시·군·구 단위 페이징)
2. 각 단지의 세대수 파싱
3. 주소 → 카카오 로컬로 위경도 획득 (배치 후 저장)
4. `local_info` 테이블에 upsert (`category='apartment'`, `external_id=단지고유번호`, `source='molit'`)

**초기 스코프**: 우선 서울·경기 대단지(500세대+) 약 3,000개만.
**실행 주기**: cron 월 1회 (Vercel Cron 또는 GitHub Actions).

### 5-3. 대학교 시딩 (연 1회)

**파일**: `prototype/scripts/sync-universities.ts`

**동작**:
1. 대학알리미 OpenAPI 호출 · 전체 4년제 대학 240여 개 조회
2. 주소 → 카카오 로컬로 위경도
3. `local_info` 테이블에 upsert (`category='university'`)

### 5-4. 대학축제 관리자 등록 페이지

**파일**: `prototype/src/app/admin/festivals/page.tsx`

- 매년 3~4월 관리자가 위키트리·univ20 참고해 수동 입력
- 필드: 대학 선택(local_info university 드롭다운) · 시작일 · 종료일 · 라인업 텍스트에어리어 · 외부인 입장 여부
- `local_info` 테이블에 upsert (`category='festival'`, `source='manual'`)

### 5-5. 이벤트 등록 후 매칭 배치

**파일**: `prototype/src/app/api/events/[id]/refresh-nearby/route.ts`

- 이벤트 등록/수정 시 자동 호출 (혹은 수동 트리거)
- `find_nearby()` 호출 후 결과를 `event_nearby`에 upsert
- 매칭 캐시가 있으면 `fetchNearby`는 캐시 활용

---

## 6. UI 통합 지점

### 6-1. 이벤트 상세 (`/events/[id]`)

기본 정보 카드 아래에 **인근 지역 정보 카드** 추가:

```
┌─ 반경 1km 내 잠재 수요 ────────────────────┐
│ 🏢 아파트    12단지 · 총 8,240세대         │
│    (자세히)                              │
│ 🎓 대학교    2개 (건국대 15,600명·세종대 8,200명) │
│ 🎤 대학축제  세종대 해오름제 5.24 - 5.26   │
│ 🚇 지하철역  건대입구·화양·군자           │
└────────────────────────────────────────┘
```

내용: `fetchNearby(event.id)` 결과를 category별 그룹핑, 상위 3-5개만 요약.
스타일: `.card` + 각 행에 이모지 대신 lucide 아이콘 (Building2 / GraduationCap / PartyPopper / Train). 옐로우 강조 X, 인포 블루 톤.

### 6-2. 이벤트 목록 (`/events`) 필터 확장

기존 필터 옆에 새 칩:
- **대학축제 인근** — `event_nearby` 조인해서 category='festival'인 행 있는 이벤트만
- **대단지 인근** — apartment category 세대수 합 5000+ 이벤트만

### 6-3. 손익 시뮬레이터 (`/seller/simulator`) 힌트

이벤트 선택 시 계산된 인근 세대수·학생수 기반으로:
```
힌트: 반경 1km 내 아파트 8,240세대 · 학생 24,000명
→ 예상 유동인구 계수 x 0.3 적용 시 일 예상 방문객 약 9,700명
```

세대수 계수는 `platform_settings`에 관리자 조정 가능한 값으로:
```jsonc
{
  "traffic_coef": {
    "apartment_household": 0.3,
    "student": 0.15
  }
}
```

---

## 7. 실행 순서 · 체크리스트

Claude Code에서 순서대로 진행. 각 항목은 독립 커밋 대상.

### Phase A · 스키마 & 인프라 (0.5일)

- [ ] `.env.local`에 3개 API 키 추가 (담당자가 수동 발급 후)
- [ ] `.env.local.example`에 키 이름만 문서화
- [ ] `supabase/schema_v5_local_info.sql` 작성
- [ ] Supabase SQL Editor에서 실행
- [ ] Table Editor에서 `local_info` · `event_nearby` 확인, `find_nearby()` 함수 확인
- [ ] `src/lib/types.ts`에 LocalInfo · NearbyRow · ApartmentData 등 타입 추가
- [ ] `src/lib/supabase/queries.ts`에 `fetchNearby` · `upsertLocalInfo` 추가
- [ ] `CLAUDE.md`의 스키마 섹션에 v5 항목 추가

### Phase B · 지오코딩 (0.5일)

- [ ] 카카오 개발자 등록 + REST API 키 발급
- [ ] `scripts/geocode-events.ts` 작성 (tsx로 실행 가능한 Node 스크립트)
- [ ] 기존 시드 8개 이벤트에 대해 실행 → lat/lng 채워짐 확인
- [ ] `EventForm.tsx`에서 주소 변경 시 geocoded_at 리셋 로직 검토 (선택)

### Phase C · 대학교 시딩 (0.5일)

- [ ] `scripts/sync-universities.ts` 작성
- [ ] 대학알리미 API로 4년제 대학 240개 수집
- [ ] 카카오 로컬로 위경도 붙여 `local_info`에 upsert
- [ ] 시드된 데이터 Supabase Table Editor에서 확인
- [ ] `README.md`에 실행 명령 문서화

### Phase D · 아파트 시딩 (1일)

- [ ] `scripts/sync-apartments.ts` 작성
- [ ] 서울·경기 대단지(500세대+)부터 우선 수집
- [ ] 배치 지오코딩 (Rate limit 고려 · sleep 100ms)
- [ ] `local_info`에 3,000건 내외 시딩 확인

### Phase E · 매칭 배치 (0.5일)

- [ ] `src/app/api/events/[id]/refresh-nearby/route.ts` API route 작성
- [ ] 이벤트 등록/수정 시 자동 호출 (`EventForm` submit 후 fire-and-forget)
- [ ] 기존 8개 이벤트에 대해 수동 호출 → `event_nearby` 캐시 확인

### Phase F · UI 통합 (1일)

- [ ] `/events/[id]`에 NearbyInfoCard 컴포넌트 추가 (`src/components/NearbyInfoCard.tsx`)
- [ ] `/events` 목록에 "대학축제 인근" · "대단지 인근" 필터 칩 추가
- [ ] `/seller/simulator`에 유동인구 힌트 표시
- [ ] 디자인 시스템 v2.0 준수 (인포 블루 톤 · 옐로우는 CTA만)

### Phase G · 관리자 도구 (0.5일)

- [ ] `/admin/festivals` 페이지 신규 (대학축제 수동 입력)
- [ ] `/admin/local-info` 페이지 신규 (전체 지역 정보 검색·수정·삭제)
- [ ] AppNav admin 메뉴에 항목 추가

**총 예상**: 4-5일 (담당자 API 키 발급 시간 별도)

---

## 8. 주의사항

### 저작권 · 이용약관

- 국토부·서울시 데이터는 상업 이용 가능 (공공데이터 오픈 라이선스)
- 대학알리미는 상업 이용 가능하지만 출처 표기 필요 · UI에 "출처: 대학알리미" 명시
- 대학축제 정보는 언론사 크롤링 금지 · 관리자 수동 입력 또는 대학 공식 자료만

### 위경도 정확도

- 카카오 로컬 API의 지오코딩 정확도는 도로명주소 기준 95% 이상
- 지번 주소 · 축제/팝업의 임시 좌표는 오차 100m 이상 가능 → 관리자 수동 보정 필드 필요할 수 있음

### 개인정보

- `local_info`에는 개인정보 없음 (공공 시설·단지 정보만)
- 매칭 결과 `event_nearby`도 공개 가능

### 성능

- `find_nearby()`는 인덱스 없이 전체 스캔 (Haversine은 인덱스 못 씀)
- 3,000건 규모에서는 50ms 이내 예상, 10,000건 넘으면 PostGIS 도입 검토
- 이벤트당 한 번만 매칭하고 `event_nearby`에 캐시하므로 실사용 시 지연 없음

---

## 9. 향후 확장 (Priority 3 이상)

- **PostGIS** 도입 · `GEOGRAPHY` 타입으로 반경 조회 최적화 (10만 건 이상 대비)
- **상권 정보 (`category='commercial'`)** · 소상공인마당 상권분석 API 연동 · 주변 F&B 매장 수·평균 매출
- **지하철·버스 (`category='transit'`)** · 국토부 대중교통 API · 반경 500m 내 역 리스트
- **날씨·기상** · 기상청 API · 행사 기간 강수 확률 자동 표시 (야외행사에 필수)
- **관광지 방문객 통계** · KTO 관광객 유입 데이터로 축제 기간 방문객 예측
- **아파트 세대수 → 실 유동인구 계수 조정** · 실사용자 매출 데이터 축적 후 회귀 분석으로 계수 자동 보정

---

## 10. 관련 문서

- `CLAUDE.md` — 프로젝트 전체 컨텍스트 · 이 문서는 그 확장
- `SETUP.md` — Supabase 셋업 (Step 2-6으로 이 v5 SQL 실행 추가 예정)
- `DESIGN_SYSTEM.md` — 카드·아이콘·색상 규칙
- 국토부 API 문서: https://www.data.go.kr/data/15058453/openapi.do
- 대학알리미 API 문서: https://openapi.academyinfo.go.kr
- 카카오 로컬 API: https://developers.kakao.com/docs/latest/ko/local/dev-guide

---

**작성**: 2026-08-05
**우선순위**: Priority 2 (운영 정착)
**다음 검토 시점**: Phase A 완료 후, 실 데이터 수집 전
