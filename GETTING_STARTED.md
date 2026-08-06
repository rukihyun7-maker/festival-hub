# 30분 시작 가이드

프로토타입을 실제로 실행하고 배포하는 완전한 절차입니다.

---

## Step 1 · Supabase 계정 & 프로젝트 (5분)

1. https://supabase.com 접속 → GitHub 계정으로 회원가입 (무료)
2. Dashboard → **New Project** 클릭
3. 정보 입력:
   - Name: `festival-hub`
   - Database Password: (강력한 비밀번호 · 안전한 곳에 저장)
   - Region: **Northeast Asia (Seoul)**
4. Create → 2분 정도 대기

## Step 2 · DB 스키마 실행 (5분)

1. 좌측 메뉴 → **SQL Editor** → **New Query**
2. `supabase/schema.sql` 파일 열어서 전체 내용 복사·붙여넣기
3. **Run** (또는 Ctrl+Enter) 클릭 → 성공 메시지 확인
4. 다시 New Query → `supabase/policies.sql` 붙여넣고 실행
5. Database → Tables 에서 6개 테이블 생성 확인

## Step 3 · API 키 확보 (2분)

1. Settings → **API** 메뉴로 이동
2. 아래 두 값 복사:
   - `Project URL` (예: `https://xxxx.supabase.co`)
   - `anon public` key (긴 JWT 토큰)

## Step 4 · 로컬 실행 (10분)

1. 이 `prototype` 폴더에서 터미널 열기
2. Node.js 20 이상 설치 (https://nodejs.org)
3. 명령어 실행:

```bash
# 의존성 설치 (약 1분)
npm install

# 환경변수 파일 생성
cp .env.example .env.local
# 또는 Windows에서는:
# copy .env.example .env.local
```

4. `.env.local` 파일 편집 → Step 3에서 복사한 값 붙여넣기:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx...
```

5. 개발 서버 실행:

```bash
npm run dev
```

6. 브라우저에서 `http://localhost:3000` 접속
7. **회원가입** 클릭 → 이메일·비밀번호·역할 입력 → 완료
8. Supabase Dashboard → Authentication → Users 에서 생성된 계정 확인
9. Table Editor → profiles 에서 프로필 자동 생성 확인

## Step 5 · Vercel 배포 (10분)

### GitHub에 코드 푸시

```bash
git init
git add .
git commit -m "initial prototype"
# GitHub에서 새 저장소 생성 후:
git remote add origin https://github.com/[본인]/festival-hub.git
git branch -M main
git push -u origin main
```

### Vercel 배포

1. https://vercel.com → GitHub 계정으로 로그인
2. **Add New → Project** → 방금 만든 저장소 선택 → **Import**
3. **Root Directory**: `01_야외행사_QR결제_창업/prototype` 지정 (또는 저장소 루트에 prototype 폴더 자체를 두었다면 그대로)
4. **Environment Variables** 두 개 추가:
   - `NEXT_PUBLIC_SUPABASE_URL` (Supabase URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase anon key)
5. **Deploy** 클릭 → 2~3분 후 배포 완료
6. 자동 발급된 URL 확인 (예: `festival-hub-xxx.vercel.app`)

## Step 6 · 도메인 확인 & 시연 (3분)

1. 배포된 URL 접속 → 회원가입 · 로그인 확인
2. 이메일 인증이 활성화되어 있다면 Supabase → Authentication → Providers 에서 Email confirm 옵션 조정
3. 시드 미팅 자료에 URL 추가 · 투자자에게 링크 공유

---

## 🎯 완료 후 확인 체크리스트

- [ ] `festival-hub-xxx.vercel.app` 접속 가능
- [ ] 회원가입 페이지 정상 표시
- [ ] 3역할(셀러·주최사·관리자) 선택 가능
- [ ] 회원가입 후 자동 프로필 생성
- [ ] 역할별 다른 대시보드로 리다이렉트
- [ ] 로그아웃 정상 동작
- [ ] Supabase 대시보드에서 실제 데이터 확인 가능

---

## 💡 자주 묻는 질문

**Q. 이메일 인증이 필요한가요?**
초기 개발 편의를 위해 비활성화 권장. Supabase → Authentication → Providers → Email → "Confirm email" 옵션 OFF.

**Q. 도메인을 바꾸고 싶어요.**
Vercel → Project → Settings → Domains 에서 커스텀 도메인 연결 가능. 도메인 구매는 별도(가비아·후이즈).

**Q. Supabase 무료 티어 한계는?**
- 500MB DB · 1GB 파일 · 2GB 대역폭/월 · 50,000 MAU
- 실 사용자 수백~수천 명까지 무료
- 넘으면 Pro 플랜 월 25달러

**Q. 다음 단계에서 무엇을 만드나요?**
셀러 페이지 5개 탭(홈·행사찾기·내신청·시뮬레이터·마이페이지) → 주최사 페이지 → 관리자 셀러 인사이트 → 결제 연동(PortOne) → 이메일 알림 순서.

---

**다음 요청**: Claude에게 "셀러 페이지 5개 탭 개발해줘"라고 하시면 코드를 이 폴더에 추가합니다.
