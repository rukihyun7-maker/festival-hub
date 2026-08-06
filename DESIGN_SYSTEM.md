# Design System · v2.0

**Version**: v2.0 (Handoff 확정판)
**Date**: 2026.05.11
**Source**: `_design_handoff/design_handoff_festival_hub/Festival Hub.dc.html` 확정
**Previous**: v1.0 (Toss·Linear·Stripe 참조)에서 실제 하이파이 프로토타입 토큰으로 대체

---

## Design Principles

1. **웜 페이퍼 위에 잉크 · 옐로우는 포인트만** — 배경은 페이퍼(`#FBF9F4`), 텍스트는 잉크(`#14120E`), 옐로우(`#FFC800`)는 CTA와 포인트에만 사용하고 면적으로 깔지 않는다.
2. **숫자가 많은 화면 → 폰트가 답** — Wanted Sans + `font-variant-numeric: tabular-nums` 없으면 표·금액이 흔들린다.
3. **미디어쿼리 없음** — `clamp()` + `flex-wrap` + `grid auto-fit minmax()` 조합만 사용.
4. **그림자는 두 개만** — 주 CTA `0 2px 0 #C99F00` (하드 셰도우) + 드롭다운 `0 16px 40px rgba(20,18,14,.16)`. 나머지는 border로 처리.
5. **애니메이션은 진입만** — `fhUp` (0.18–0.35s ease-out, 위로 10px 페이드인). 회전·확대·바운스 금지.

---

## Color Tokens

### Background

| 토큰 | 값 | 용도 |
|---|---|---|
| `bg/page` | `#FBF9F4` | 페이지 배경 (웜 페이퍼) |
| `bg/surface` | `#FFFFFF` | 카드 표면 |
| `bg/surface-sunken` | `#FDFBF6` | 카드 안쪽 보조 면 |
| `bg/muted` | `#F0ECE1` | 세그먼트 컨트롤 트랙 · 프로그레스 트랙 |
| `bg/muted-2` | `#F3EFE5` | 이미지 슬롯 배경 |

### Text · Ink

| 토큰 | 값 | 용도 |
|---|---|---|
| `ink` | `#14120E` | 기본 텍스트 · 다크 패널 · 선택 상태 |
| `ink/soft` | `#3C3626` | 라벨 |
| `text/secondary` | `#6F675A` | 본문 보조 |
| `text/tertiary` | `#8C8474` | 캡션 |
| `text/disabled` | `#B5AC98` | 비활성 |

### Line · Border

| 토큰 | 값 | 용도 |
|---|---|---|
| `line` | `#E7E2D6` | 카드 보더 |
| `line/strong` | `#E0DACB` | 인풋 보더 |
| `line/faint` | `#F3EFE5` · `#EDE8DC` | 행 구분선 |

### Accent · Yellow (브랜드 시그니처)

| 토큰 | 값 | 용도 |
|---|---|---|
| `accent` | `#FFC800` | 주 CTA · 강조 |
| `accent/hover` | `#FFD433` | CTA hover |
| `accent/shadow` | `#C99F00` | CTA 하단 2px 하드 셰도우 |
| `accent/text-warm` | `#B78A00` | 옐로우 계열 텍스트 (밝은) |
| `accent/text-deep` | `#7A5B00` | 옐로우 계열 텍스트 (진한) |

### Semantic

| 토큰 | 값 | 배경 |
|---|---|---|
| `success` | `#1D6B2A` | `#E2F3E4` · `#F1F9F2` |
| `warning` | `#7A5B00` | `#FFF3C4` |
| `danger` | `#9B2C22` · `#A33A24` · `#C7503E` | `#FBE3E1` · `#FFE9E4` · `#FFF9F7` |
| `info` | `#2B4B9B` | `#E9EEFB` · `#F4F7FE` · bar `#8FA6DE` |

> `info` 계열은 **정보형(info) 행사**에만 사용. 신청형(apply)과 시각적으로 구분되는 인프라 신호.

---

## Typography

### Fonts

```css
font-family: 'Wanted Sans Variable', 'Pretendard', system-ui, sans-serif;
font-variant-numeric: tabular-nums;
text-wrap: pretty;
-webkit-font-smoothing: antialiased;
```

**CDN**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfontfiles/variable/split/WantedSansVariable.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
```

### Scale (clamp 기반 반응형)

| 역할 | 크기 | 굵기 | 자간 |
|---|---|---|---|
| 페이지 타이틀 | `clamp(24px, 3vw, 32px)` | 800 | `-.035em` |
| 홈 히어로 | `clamp(26px, 3.4vw, 36px)` | 800 | `-.035em` |
| 로그인 히어로 | `clamp(28px, 4.2vw, 44px)` · line-height 1.24 | 800 | `-.035em` |
| 섹션 제목 | 18–19px | 800 | `-.02em` |
| 카드 제목 | 15.5–17.5px | 700–800 | `-.01em ~ -.02em` |
| 본문 | 15–15.5px · line-height 1.6–1.7 | 400–600 | – |
| 보조·캡션 | 12–13.5px | 600 | – |
| 숫자 지표 | 21–26px (모달 대형 46px) | 800 | `-.02em ~ -.04em` |

**금지**: `font-weight: 900` · 위 스케일 밖의 크기 · 이탤릭 · 언더라인 (링크 hover 외).

---

## Spacing

### Scale

`4 · 8 · 10 · 12 · 16 · 20 · 24 · 30 · 32 · 48 · 64`

이 값들만 사용. 5, 7, 15, 22 등 중간값 금지.

### Container

```css
max-width: 1180px;
padding-inline: clamp(16px, 3vw, 32px);
```

### Card

```css
padding: clamp(20px, 2.5vw, 30px);   /* 표준: 22–24px */
```

### Gap

- 그리드 갭: `10–16px`
- 폼 필드 갭: `16px`
- 칩 갭: `6–8px`

---

## Radius

**4단계만**:

| 토큰 | 값 | 용도 |
|---|---|---|
| `radius/input` | `9–11px` | 버튼 · 인풋 |
| `radius/card` | `12–16px` | 카드 |
| `radius/modal` | `20px 20px 0 0` | 모달 (하단 시트) |
| `radius/pill` | `99px` | 칩 · 아바타 · 라운드 배지 |

**금지**: 14 이외의 15, 17, 22, 24px 등 중간값 남발.

---

## Shadow

**2개만 존재. 나머지는 border로**:

```css
/* 주 CTA */
box-shadow: 0 2px 0 #C99F00;   /* 하드 셰도우 · 옐로우 아래 진한 */

/* 드롭다운·모달 */
box-shadow: 0 16px 40px rgba(20,18,14,.16);
```

**금지**: colored shadow · glow · 여러 겹 shadow · inset shadow.

---

## Border

```css
/* 카드 · 기본 */
border: 1px solid #E7E2D6;

/* 인풋 */
border: 1px solid #E0DACB;

/* Hover */
border-color: #14120E;   /* 잉크로 강조 · 색상 변화 없음 */
```

Hover 시 색상을 바꾸지 않고 **borderColor를 잉크로 강화** + `translateY(-1~2px)`로 상승 효과만 준다.

---

## Icons

- **이모지 사용 금지** (필수 UX: ★ ☆ ✓ ✕ 🔔 × 6개만 텍스트 글리프 허용)
- 실제 구현: 프로젝트의 아이콘 라이브러리(Lucide·Phosphor·Iconoir)로 대체
- 크기: 16 · 20 · 24px (3단계만)
- 색상: `currentColor` 상속

---

## Components

### Button (주 CTA)

```css
.btn-primary {
  background: #FFC800;
  color: #14120E;
  font-weight: 800;
  border: none;
  border-radius: 10px;
  padding: 12px 20px;
  box-shadow: 0 2px 0 #C99F00;
  transition: background .15s ease-out;
}
.btn-primary:hover { background: #FFD433; }
.btn-primary:disabled {
  background: #EDE8DC;
  color: #B5AC98;
  cursor: not-allowed;
  box-shadow: none;
}
```

### Button (Secondary)

```css
.btn-secondary {
  background: #FFFFFF;
  color: #14120E;
  border: 1px solid #E0DACB;
  border-radius: 10px;
  padding: 12px 20px;
  font-weight: 700;
}
.btn-secondary:hover { border-color: #14120E; }
```

### Button (Dark · Ink)

```css
.btn-dark {
  background: #14120E;
  color: #FFFFFF;
  border-radius: 10px;
  padding: 12px 20px;
  font-weight: 700;
}
.btn-dark:hover { background: #3C3626; }
```

### Input

```css
.input {
  background: #FFFFFF;
  border: 1px solid #E0DACB;
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 15px;
  color: #14120E;
  font-variant-numeric: tabular-nums;
}
.input:focus {
  outline: none;
  border-color: #14120E;
  box-shadow: 0 0 0 3px rgba(20,18,14,.08);
}
```

### Card

```css
.card {
  background: #FFFFFF;
  border: 1px solid #E7E2D6;
  border-radius: 14px;
  padding: clamp(20px, 2.5vw, 30px);
}
.card:hover {
  border-color: #14120E;
  transform: translateY(-1px);
  transition: all .15s ease-out;
}
```

### Card (신청형 vs 정보형 구분)

카드 상단 5px 바:

```css
.card--apply::before { background: #FFC800; }   /* 옐로우 */
.card--info::before  { background: #8FA6DE; }   /* 인포 블루 */
```

### Chip · Segment

```css
.chip {
  padding: 6px 12px;
  border-radius: 99px;
  background: transparent;
  border: 1px solid #E0DACB;
  font-size: 13px;
  font-weight: 600;
  color: #6F675A;
}
.chip[aria-selected="true"] {
  background: #14120E;
  color: #FFFFFF;
  border-color: #14120E;
}
```

### Modal · Bottom Sheet

- 배경 딤: `rgba(20,18,14,.4)`
- 시트: `max-width: 640px` · `max-height: 92vh` · `border-radius: 20px 20px 0 0`
- 진입 애니메이션: `fhUp .3s ease-out`
- 배경 클릭 시 닫힘 · 내부 클릭은 `stopPropagation`

### Toast

- 위치: `bottom: 24px` · 화면 중앙
- 배경: 잉크 `#14120E` · 텍스트 화이트
- Radius: 999px (필)
- 자동 사라짐: 2.6s

---

## Motion

**허용된 애니메이션**:

```css
@keyframes fhUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fhToast {
  from { opacity: 0; transform: translate(-50%, 12px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes fhMarquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
```

- `fhUp`: 화면·확장 패널 진입 (0.18–0.35s ease-out)
- `fhToast`: 토스트 진입
- `fhMarquee`: 로그인 히어로의 행사명 롤링 (34s linear)

**금지**: rotate · scale · bounce · spring · elastic · parallax.

---

## Responsive · No Media Query

미디어쿼리 없이 3가지 패턴만 사용.

### 타이포 · 패딩

```css
font-size: clamp(24px, 3vw, 32px);
padding: clamp(20px, 2.5vw, 30px);
```

### 2단 레이아웃

```css
display: grid;
grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
gap: 16px;
```

### 카드 그리드

```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));   /* 표준 카드 */
grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));   /* 메뉴 카드 */
gap: 12px;
```

### 행 · 툴바

```css
display: flex;
flex-wrap: wrap;
gap: 8px;
```

**margin 대신 항상 `gap` 사용.**

### 좁은 화면 내비게이션

```css
.nav { overflow-x: auto; -webkit-overflow-scrolling: touch; }
```

---

## Anti-Patterns

프로덕션 톤을 해치는 요소 · 절대 사용 금지.

1. **이모지 남발** — 텍스트 글리프 6종(★☆✓✕🔔×) 외 금지
2. **그라디언트** — 배경·카드·버튼 어디에도 X
3. **컬러 shadow** — colored shadow는 주 CTA의 옐로우 하드 셰도우만 예외
4. **font-weight: 900** — 800까지만
5. **미디어쿼리** — `@media` 사용 금지 · clamp/auto-fit로 처리
6. **여러 강조 배지** — 화면당 강조 배지 1개 이하
7. **하드코딩 픽셀** — spacing scale에서만 선택
8. **큰 라운드 20px+** — 필·모달 상단만 예외
9. **긴 카피** — 헤드라인 12자 이내
10. **색상만으로 정보 전달** — 배지·상태에는 텍스트 병기

---

## Verification Checklist

각 화면 배포 전 체크.

- [ ] 배경이 웜 페이퍼 `#FBF9F4` 인가?
- [ ] 텍스트가 잉크 `#14120E` (검정 아님) 인가?
- [ ] 옐로우가 CTA와 포인트에만 있는가? (배경 X)
- [ ] 그림자가 CTA 하드 셰도우 + 드롭다운 외 없는가?
- [ ] 미디어쿼리 없이 clamp/auto-fit만 쓰는가?
- [ ] font-variant-numeric: tabular-nums 적용?
- [ ] 이모지 6종(★☆✓✕🔔×) 외 없는가?
- [ ] 강조 배지 화면당 1개 이하?
- [ ] 신청형(옐로우 바) / 정보형(인포 블루 바) 구분?
- [ ] Wanted Sans + Pretendard 폴백 로드?

---

## Migration from v1

이전 v1(Toss·Linear·Stripe 참조)에서 v2(Handoff 확정)로의 변화.

| 항목 | v1 | v2 |
|---|---|---|
| 배경 | Gray-50 `#F9FAFB` (차가움) | 페이퍼 `#FBF9F4` (웜) |
| 텍스트 | Gray-950 `#0B0D10` (검정) | 잉크 `#14120E` (짙은 갈색빛) |
| 브랜드 색 | Blue `#2563EB` | Yellow `#FFC800` |
| CTA 배경 | 검정 `#111827` | 옐로우 `#FFC800` + 하드 셰도우 |
| 폰트 | Pretendard | Wanted Sans + Pretendard |
| 반응형 | 미디어쿼리 | clamp + auto-fit (No media query) |
| 카드 라운드 | 8·12px | 12·14·16px (Handoff 확정) |
| 그림자 | 3단계 | 2개만 (CTA · 드롭다운) |
| 정보형 색 | 없음 | 인포 블루 `#8FA6DE` |

**v1의 파일들** (`03_데모_시연용_v3.html`·`v4.html`)은 이제 참고용 · v2 톤으로 재작업 대상.

---

**작성**: 2026.05.11
**Handoff 원본**: `_design_handoff/design_handoff_festival_hub/Festival Hub.dc.html`
**변경 시**: Handoff 원본과 동기화 필수
