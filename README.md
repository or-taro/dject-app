# Dject — GitHub Pages 버전

Vercel 없이 GitHub Pages + Supabase Edge Function으로 동작하는 Dject 웹소설 작업실입니다.

## 구성

- `site/` : GitHub Pages에 올릴 정적 웹앱
- `edge/dject-web/index.ts` : 웹앱 전용 Supabase Edge Function 소스

웹앱은 로그인 화면 없이 바로 열립니다. 개인 GPT의 기존 `dject-gateway` Action과 같은 Dject 데이터베이스를 사용합니다.

## GitHub Pages 배포

가장 간단한 방법은 새 GitHub 저장소의 루트에 `site/` 안의 파일들을 업로드한 뒤, 저장소 Settings → Pages에서 배포 소스를 선택하는 것입니다.

GitHub Pages가 프로젝트 하위 경로(`/저장소이름/`)에서 실행되어도 동작하도록 모든 정적 경로를 상대 경로로 변경했습니다.

## 보안 주의

이 버전은 사용자가 요청한 대로 별도 로그인/비밀번호가 없습니다. `site/app.js`에 있는 `X-Dject-Web-Key`는 공개 정적 코드에 포함되므로 **비밀키가 아닙니다**. 따라서 URL이나 웹 코드를 아는 제3자에 대한 강한 접근 통제를 제공하지 않습니다.

Supabase의 service/secret key는 브라우저 코드에 포함되지 않으며 Edge Function 안에서만 사용됩니다. 개인 GPT Action용 `dject-gateway`의 인증키도 이 웹앱에 포함되지 않습니다.


## Multi-GPT 연결 관리

이 버전은 여러 Custom GPT가 같은 Dject 저장소를 사용할 수 있도록 웹앱에 **GPT 연결 관리** 화면을 추가했습니다.

- GPT 이름/용도를 브라우저에 프로필로 저장
- 현재 회차에서 사용할 GPT 선택
- Dject Action OpenAPI 스키마 원클릭 복사
- 공통 GPT 지침 원클릭 복사
- GPT별 요청문에 선택한 GPT 이름 자동 반영
- Action용 Bearer 키는 보안상 GitHub Pages 코드에 포함하지 않음

각 GPT에는 한 번씩 `구성 → 작업 → 새 작업 만들기`에서 같은 Dject Action을 등록하고, Dject 전용 Bearer 키를 해당 GPT의 인증 설정에만 넣어야 합니다.
