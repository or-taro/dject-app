# Dject — 네이버·카카오 웹소설 작가 데뷔 제작 도구

Dject는 기존 GitHub Pages + Supabase 구조를 유지하면서, 아이디어 → 플랫폼 선택 → 작품 기획 → 회차 집필 → 플랫폼 점검 → 데뷔 준비까지 한 작품 안에서 이어가는 웹소설 제작 도구입니다.

## 이번 개편의 범위

- 목표 플랫폼은 **카카오페이지 / 네이버 / 아직 모르겠어요**만 지원합니다.
- 기존 `dject_novels.data` JSON 구조를 확장해 플랫폼 설정과 기획 필드를 저장합니다.
- 기존 작품의 `idea`, `genre`, `characters`, `world`, `summary` 및 기존 회차/본문 구조는 유지합니다.
- 별도 DB migration은 필요하지 않습니다.
- AI 결과는 원문과 별도 데이터 키에 저장하고, 사용자가 승인한 경우에만 편집 필드에 반영합니다.
- 회차 집필 결과는 기존처럼 별도로 확인한 뒤 `본문으로 사용`을 눌러야 본문에 적용됩니다.

## 주요 흐름

새 작품 만들기 → 아이디어 → 목표 플랫폼 → 도전 방식 → 장르 → 작품 콘셉트 → 등장인물 → 세계관 → 전체 플롯 → 회차 구성 → 집필 → 플랫폼 적합성 → 데뷔 준비

## 플랫폼 전략

집필 엔진은 하나를 유지하고 다음 구조로 프롬프트를 구성합니다.

- 공통 웹소설 제작 원칙 + 카카오페이지 전략
- 공통 웹소설 제작 원칙 + 네이버 전략
- 공통 웹소설 제작 원칙 + 네이버·카카오 비교 전략

특정 기존 작품을 모방하지 않고, 독자 기대·전개 속도·상품 구조·후킹·회차 구성 같은 추상적인 제작 특성만 사용합니다.

## 데이터 호환

새 설정은 기존 `dject_novels.data` 안에 추가됩니다.

- `target_platform`: `kakao` / `naver` / `undecided`
- `debut_goal`: `debut` / `serial` / `contest` / `undecided`
- `secondary_genres`
- `project_status`
- `logline`
- `work_intro`
- `differentiation`
- `long_term_plot`
- `early_episode_plan`

기존 작품에 새 키가 없으면 앱에서 안전하게 `플랫폼 미정` 등으로 표시합니다.

AI 산출물은 `ai_concept_suggestion`, `platform_analysis`, `platform_comparison`, `ai_revision_suggestion`, `latest_chapter_review`, `debut_package`, `prelaunch_check` 같은 별도 키를 사용합니다.

## 주의

이 저장소의 정적 웹앱은 별도 로그인 화면이 없는 기존 구조를 그대로 유지합니다. Supabase service/secret key는 브라우저 코드에 넣지 않습니다.

이 버전은 기존 Dject 프로젝트의 네이버·카카오 플랫폼 제작 흐름 확장판입니다. 배포 전후에는 기존 작품/회차 보존과 플랫폼별 집필·점검 분기를 회귀 확인합니다.
