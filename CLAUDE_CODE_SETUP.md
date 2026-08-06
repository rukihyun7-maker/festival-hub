# Claude Code로 이 프로젝트 이어서 작업하기

Cowork에서 만든 Festival Hub 프로토타입을 Claude Code(CLI)에서 열어 개발을 계속하는 방법입니다. 5분 셋업.

## 1. Claude Code 설치 (한 번만)

Windows PowerShell을 관리자 권한으로 열고 다음 중 하나:

### 방법 A · 네이티브 인스톨러 (권장, Node.js 불필요)

```powershell
irm https://claude.ai/install.ps1 | iex
```

### 방법 B · npm (Node.js 22+ 필요)

```powershell
npm install -g @anthropic-ai/claude-code
```

설치 확인:

```powershell
claude --version
```

## 2. 인증

Pro/Max/Team/Enterprise 구독 또는 Console API 키가 필요합니다.

### 구독 계정 (권장)

첫 실행 시 브라우저 로그인 창이 뜹니다. Claude 구독 계정으로 로그인하면 API 키 별도 설정 없이 자동 인증됩니다.

### 또는 API 키 직접 설정

```powershell
[Environment]::SetEnvironmentVariable('ANTHROPIC_API_KEY', 'sk-ant-xxxxxxxxxxxx', 'User')
```

PowerShell 재시작 후 반영. `console.anthropic.com`에서 발급.

## 3. 프로젝트 폴더에서 실행

PowerShell에서:

```powershell
cd "C:\Users\USER\OneDrive\문서\Claude\Projects\나의 업무 비서\01_야외행사_QR결제_창업\prototype"
claude
```

이렇게만 하면:

1. 현재 폴더가 자동 컨텍스트가 됨
2. `CLAUDE.md`가 즉시 로드됨 (프로젝트 규칙·구조·다음 우선순위 모두 인식)
3. `package.json`·`tsconfig.json`·`.env.local` 존재 확인
4. Tailwind 설정과 Next.js App Router 구조 이해

이후는 대화형 세션. 프롬프트만 입력하면 됩니다.

## 4. 첫 세션 · 추천 프롬프트

Claude Code가 어떤 상태인지 파악하도록 다음 3개를 순서대로:

**A. 프로젝트 이해 확인**

```
CLAUDE.md 읽고 이 프로젝트의 현재 상태와 다음 P1 우선순위 3개 정리해줘
```

**B. 빌드 상태 점검**

```
npm run build 실행해서 컴파일 에러 없는지 확인해줘
```

**C. 다음 작업 착수**

```
CLAUDE.md의 Priority 1 첫 번째 항목(랜딩 페이지) 시작하자.
디자인 시스템 규칙 지켜서 /app/page.tsx 만들어줘.
```

## 5. Cowork 세션과의 차이 · 상호 보완

| 특성 | Cowork | Claude Code |
|---|---|---|
| 위치 | 데스크탑 앱 · 파일 카드 UI | 터미널 CLI · 텍스트 대화 |
| 파일 접근 | 지정된 워크스페이스 폴더 | 실행한 현재 폴더 (repo root) |
| Git 통합 | 간접 (bash 명령) | 직접 · commit/push 명령 자체 인식 |
| 자동 컨텍스트 | 세션별 개별 | CLAUDE.md 자동 로드 |
| 실행 명령 | Bash tool | 셸이 곧 워크스페이스 |
| 대화 이력 | 세션 종료 시 요약 저장 | 세션 내 유지 (`/clear`로 리셋) |

**추천 워크플로우**

- Cowork = 새 기능 스캐폴딩·문서 작성·이미지 편집 등 "탐색적 작업"
- Claude Code = git 커밋·의존성 관리·테스트·리팩터링 등 "저장소 작업"

두 도구 모두 같은 `CLAUDE.md`를 읽으니 규칙이 자동으로 동기화됩니다.

## 6. 자주 쓰는 slash 명령

Claude Code 세션 내에서:

- `/help` — 사용 가능한 명령 전체
- `/clear` — 현재 대화 히스토리 초기화 (컨텍스트 리셋)
- `/compact` — 긴 컨텍스트를 요약 압축 (토큰 절약)
- `/init` — 신규 프로젝트에서 CLAUDE.md 자동 생성 (이 프로젝트는 이미 있으므로 사용 X)
- `/config` — 설정 확인

## 7. Git 작업 예시

Claude Code는 git 명령을 안전하게 활용합니다.

```
현재 변경사항 확인하고 커밋 메시지 좋게 작성해서 커밋해줘
```
→ `git status` + `git diff` 확인 후 conventional commit 규칙에 맞춰 커밋

```
main 브랜치와 비교해서 어떤 파일이 바뀌었는지 요약해줘
```
→ `git log main..HEAD` 요약

**주의**: `git push` 는 명시적으로 요청해야 실행됩니다 (안전 장치).

## 8. Cowork에서 만든 산출물 이어받기

Claude Code 첫 세션에서:

```
프로젝트 상위 폴더의 이전 산출물 목록 알려줘. 
../01_사업계획서.html · ../02_투자자_레퍼런스.html · ../부속자료 등이 있을거야.
```

Claude Code는 상위 폴더 접근도 가능(사용자 허가 필요). 산출물이 필요하면 자동으로 요청합니다.

## 9. 트러블슈팅

### `claude` 명령을 찾을 수 없음

- 네이티브 인스톨러: 새 PowerShell 창 열기 (환경변수 반영)
- npm: `npm root -g`로 전역 경로 확인, PATH에 추가

### Supabase 환경변수 못 읽음

- `.env.local` 파일이 프로젝트 루트에 있는지 확인
- Windows에서 `.env.local` 파일 인코딩이 UTF-8인지 확인 (BOM 없이)

### CLAUDE.md가 로드되지 않는 것 같음

- 파일이 `prototype/CLAUDE.md`에 정확히 있는지 확인
- 파일 인코딩 UTF-8
- `claude` 재시작 후 `CLAUDE.md 요약해줘` 프롬프트로 로드 확인

### PowerShell 스크립트 실행 정책 오류

관리자 PowerShell에서:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 10. 다음 스텝

1. 위 1~3 순서대로 설치 및 프로젝트 열기
2. `CLAUDE.md 요약해줘` 프롬프트로 인식 확인
3. `Priority 1` 항목부터 착수

Cowork에서 진행 중이던 대화 맥락이 필요하면 이 파일의 "Cowork에서 만든 산출물 이어받기" 섹션 참고.

---

**작성일**: 2026-08-04
**대상 사용자**: 이상현
**참고**: 이 파일은 최초 셋업 후 삭제/무시해도 됩니다. `CLAUDE.md`만 있으면 Claude Code 세션은 정상 동작합니다.
