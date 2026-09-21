# Festival Hub · Supabase 인증 메일 한글 템플릿

Supabase 대시보드 → **Authentication → Emails → Templates** 에서 각 템플릿의
**Subject(제목)** 와 **Message body(HTML)** 를 아래 내용으로 교체.
변수 `{{ .ConfirmationURL }}` 은 그대로 두어야 링크가 동작함.

---

## 1) Reset Password (비밀번호 재설정) — ⭐ 지금 문제된 메일

**Subject**
```
[Festival Hub] 비밀번호 재설정 안내
```

**Message body (HTML)**
```html
<div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#14120E;">
  <div style="font-size:20px;font-weight:800;color:#E8A33D;margin-bottom:24px;">Festival Hub</div>
  <h1 style="font-size:19px;font-weight:800;margin:0 0 12px;">비밀번호 재설정</h1>
  <p style="font-size:14px;line-height:1.7;color:#5C554B;margin:0 0 24px;">
    비밀번호 재설정 요청을 받았습니다. 아래 버튼을 눌러 새 비밀번호를 설정해 주세요.
    링크는 일정 시간 후 만료됩니다.
  </p>
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;background:#E8A33D;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 28px;border-radius:12px;">
    새 비밀번호 설정하기
  </a>
  <p style="font-size:12.5px;line-height:1.7;color:#8A8175;margin:28px 0 0;">
    본인이 요청하지 않았다면 이 메일은 무시하셔도 됩니다. 비밀번호는 변경되지 않습니다.
  </p>
  <hr style="border:none;border-top:1px solid #EDE8DC;margin:24px 0;">
  <p style="font-size:11px;color:#A39C8E;margin:0;">Festival Hub · 리윤하우스</p>
</div>
```

---

## 2) Confirm signup (회원가입 이메일 확인)

**Subject**
```
[Festival Hub] 이메일 인증을 완료해 주세요
```

**Message body (HTML)**
```html
<div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#14120E;">
  <div style="font-size:20px;font-weight:800;color:#E8A33D;margin-bottom:24px;">Festival Hub</div>
  <h1 style="font-size:19px;font-weight:800;margin:0 0 12px;">이메일 인증</h1>
  <p style="font-size:14px;line-height:1.7;color:#5C554B;margin:0 0 24px;">
    Festival Hub 가입을 환영합니다. 아래 버튼을 눌러 이메일 인증을 완료하면 가입이 마무리됩니다.
  </p>
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;background:#E8A33D;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 28px;border-radius:12px;">
    이메일 인증하기
  </a>
  <p style="font-size:12.5px;line-height:1.7;color:#8A8175;margin:28px 0 0;">
    본인이 가입하지 않았다면 이 메일은 무시하셔도 됩니다.
  </p>
  <hr style="border:none;border-top:1px solid #EDE8DC;margin:24px 0;">
  <p style="font-size:11px;color:#A39C8E;margin:0;">Festival Hub · 리윤하우스</p>
</div>
```

---

## 3) Magic Link (매직 링크 로그인) — 사용 시

**Subject**
```
[Festival Hub] 로그인 링크
```

**Message body (HTML)**
```html
<div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#14120E;">
  <div style="font-size:20px;font-weight:800;color:#E8A33D;margin-bottom:24px;">Festival Hub</div>
  <h1 style="font-size:19px;font-weight:800;margin:0 0 12px;">로그인</h1>
  <p style="font-size:14px;line-height:1.7;color:#5C554B;margin:0 0 24px;">
    아래 버튼을 눌러 로그인하세요. 링크는 일정 시간 후 만료됩니다.
  </p>
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;background:#E8A33D;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 28px;border-radius:12px;">
    로그인하기
  </a>
  <hr style="border:none;border-top:1px solid #EDE8DC;margin:24px 0;">
  <p style="font-size:11px;color:#A39C8E;margin:0;">Festival Hub · 리윤하우스</p>
</div>
```

---

## 4) Change Email Address (이메일 변경 확인) — 사용 시

**Subject**
```
[Festival Hub] 이메일 변경 확인
```

**Message body (HTML)**
```html
<div style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#14120E;">
  <div style="font-size:20px;font-weight:800;color:#E8A33D;margin-bottom:24px;">Festival Hub</div>
  <h1 style="font-size:19px;font-weight:800;margin:0 0 12px;">이메일 변경 확인</h1>
  <p style="font-size:14px;line-height:1.7;color:#5C554B;margin:0 0 24px;">
    이메일 주소 변경 요청을 확인하려면 아래 버튼을 눌러 주세요.
  </p>
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;background:#E8A33D;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 28px;border-radius:12px;">
    변경 확인하기
  </a>
  <hr style="border:none;border-top:1px solid #EDE8DC;margin:24px 0;">
  <p style="font-size:11px;color:#A39C8E;margin:0;">Festival Hub · 리윤하우스</p>
</div>
```

---

### 참고
- 발신자(noreply@festivalhub.co.kr)는 이미 커스텀 SMTP로 설정되어 있으므로 제목/본문만 바꾸면 됨.
- 저장 후 실제 재설정 메일을 한 번 발송해 한글로 나오는지 확인.
