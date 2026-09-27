# VEIL — 실제 구현 계획과 설계 기준

## 0. 이번 결과의 범위

이 패키지는 컨셉 이미지를 웹페이지에 붙인 결과가 아니다. 실제 React/TypeScript 컴포넌트, 격리된 CSS, 독립 SVG 에셋, 인터랙티브 공개 범위 예시, 오프라인 실행 프리뷰, 회귀 검사와 안전한 적용 도구를 제공한다.

기준 레포: `sapgun/VEIL`, 검토 기준 커밋 `4ec7829e849aaaca1793bd97a6eec456b0bdaa4b`.
기존 `/app`, `/verifier`, Node Core, Compact 계약, 지갑/증명 로직을 변경하지 않는다. 새 랜딩에서 모든 제품 CTA는 실제 `<a href="/app">`다. 앱에 들어가기 전에 가입, 모달, 지갑 연결을 강제하지 않는다.

현재 패키지는 작성·브라우저 검사까지 완료한 결과다. 이 세션에서 원격 GitHub 커밋과 Vercel 배포는 수행하지 않았다. 생성 이미지와 브라우저가 모든 환경에서 픽셀 단위로 같다고 보장하지 않는다. 대신 색상·레이아웃·에셋 해상도·기능 동작을 코드와 검사 기준으로 고정한다.

## 1. 구현 순서와 완료 상태

| 단계 | 실제 산출물 | 상태 |
|---|---|---|
| 현황 확인 | 현재 Landing, main 라우팅, 메타데이터, 보안 문서 확인 | 완료 |
| 브랜드 고정 | `tokens.css`, `.vl-site` / `.vl-*` 격리 | 완료 |
| 에셋 제작 | 벡터 워드마크·봉인·봉투·문서·아이콘·래스터 파생본 | 완료 |
| 구조 구현 | Header, Hero, 원칙, 철학, 공개 예시, 흐름, FAQ, CTA, Footer | 완료 |
| 동작 구현 | 탭/키보드 포커스, 선택적 동의, 아코디언, reduced-motion | 완료 |
| 브라우저 검사 | Chromium 실제 React 렌더링, 31개 검사 | 완료 |
| 적용 준비 | 기준 파일 해시 검사, 백업, 충돌 차단, binary patch | 패키지에 포함 |
| 레포 전체 빌드 | 사용자 레포의 `npm run build`, `npm test` | 적용 후 실행 필요 |
| 실제 배포 확인 | Vercel 최신 배포, `/app` 클릭 및 Core 연결 확인 | 배포 후 필요 |

## 2. 아트디렉션을 코드로 유지하는 방법

### 색상

| 토큰 | 값 | 용도 |
|---|---|---|
| `--vl-bg` | `#111111` | 배경 |
| `--vl-surface` | `#191919` | 카드 |
| `--vl-surface-raised` | `#222222` | 상승된 표면 |
| `--vl-text` | `#e8e2d8` | 주요 글자 |
| `--vl-muted` | `#b3afa7` | 본문 보조 |
| `--vl-dim` | `#96928c` | 작은 정보 |
| `--vl-paper` | `#cec3b0` | 파치먼트 CTA |
| `--vl-line` | `#363636` | 구분선 |
| `--vl-success` | `#8fa998` | 검증 의미의 작은 상태 표시 |

배경은 R=G=B인 무채색이다. 이전 앱의 초록 CSS 위에 전역 덮어쓰기를 쌓지 않는다. 랜딩 루트와 개별 클래스에 범위를 부여해, 이전 CSS를 뒤에 읽어도 랜딩의 핵심 색이 유지되게 한다. 실제 브라우저 검사에 이 순서 충돌을 포함했다. 상태 배지의 색만으로 검증 여부를 판단하거나 프로토콜 검증을 대신하지 않는다.

### 타이포그래피·여백

- 본문 최대 폭 1280 CSS px. 양쪽 여백은 `clamp(24px, 5vw, 80px)`.
- 메인 카피는 세 줄의 serif display. 본문은 짧은 문장과 넉넉한 줄 높이로 분리한다.
- 기본 serif는 Georgia / Times New Roman, UI는 시스템 sans, 작은 라벨은 시스템 monospace다. 폰트 파일은 포함하지 않는다.
- 워드마크는 폰트 의존 텍스트가 아닌 직접 정의한 SVG path다.
- 카드 반경은 5px 계열. 과한 pill 카드, 원색 광원, 유리 질감, 많은 그림자는 쓰지 않는다.
- 레퍼런스는 방향 기준이지 이미지 전체를 확대해서 넣는 배경이 아니다. 실제 문구·버튼·상태·레이아웃은 DOM이다.

시스템 폰트는 OS에 따라 자폭/자간이 다를 수 있다. 정확히 같은 조판이 필요한 최종 단계에서는 사용자가 사용권을 확보한 브랜드 웹폰트를 직접 배포하고 Windows/macOS를 함께 검수한다. 폰트 교체 후에는 헤드라인 줄바꿈과 버튼 폭을 다시 확인한다.

## 3. 페이지 구조

```text
src/Landing.tsx → landing/LandingPage.tsx
  Header                 · 우측 APP, sticky, 직접 링크
  Hero / ArchiveArtwork  · 카피 + 작은 원본 인물 + 벡터 문서 레이어
  PrincipleStrip         · 네 가지 원칙
  Philosophy             · Identity / Proof / Control
  Experience             · DisclosurePreview (실제 작동하는 UI 예시)
  Flow                   · Root → Context → Authorize → Revoke
  Boundaries             · 사실에 기반한 프로토타입 경계
  FinalCTA               · 다시 /app
  Footer                 · 소스와 보안 경계
```

원래 제안의 중복 Context 카드 섹션은 인터랙티브 Experience 내부의 Daily/API/DeFi 탭으로 통합했다. 설명을 늘리는 대신 선택에 따른 결과를 보여준다. 내부 디자인 설명이나 “멋진 UI입니다” 같은 문구는 고객용 페이지에 넣지 않는다.

## 4. 컴포넌트 구조와 재사용

- `primitives.tsx`: `Icon`, `AppLink`, `Reveal`, `SectionHeading`, `Wordmark`, `Disclosure`.
- `controls.tsx`: `Button`(primary/quiet/danger), `StatusBadge` 6종, `Redaction`, `TextField`, `Notice`, `EmptyState`, `CopyButton`.
- `DisclosurePreview.tsx`: roving tab focus, ArrowLeft/Right, Home/End, 컨텍스트별 공개 예시, 동의 변경.
- `ComponentGallery.tsx`: 실제 컨트롤·24개 아이콘을 볼 수 있는 개발용 갤러리. 공개 앱 라우터에는 자동 추가하지 않는다.
- `content.ts`: 카피·컨텍스트·흐름·소스 URL 분리.
- `icon-paths.ts`: 정적 SVG geometry만 들어가는 타입 제한 맵.

신규 npm 런타임 의존성은 없다. 기존 React/Vite 위에 들어간다. shadcn 전체나 Motion 런타임을 설치해서 기존 환경을 바꾸지 않는다.

## 5. 에셋 해상도 정책

인물 원본은 512×512다. 고해상도라고 이름만 바꾸거나 이미지를 늘리지 않는다. 변환본 256/512 WebP와 `srcset`을 제공하며 표시 폭을 약 254 CSS px로 제한한다. 따라서 DPR2 기준으로 512px 원본을 활용한다. DPR3 모든 화면에서 원본 해상도를 충족하는 것은 아니므로, 그 조건까지 요구할 경우 별도 원본 교체가 필요하다.

크기와 밀도는 봉투, 봉인, 파치먼트, registration mark 같은 진짜 벡터 레이어로 만든다. 사용자 인물 이미지를 임의의 새 인물로 교체하지 않는다. 사진의 원래 soft-focus와 grain은 의도된 컨셉이며, 새 고해상도 사진의 디테일을 복원했다고 주장하지 않는다.

에셋 파일명·크기·SHA256은 `public/veil/manifest.json`, 용도는 `ASSET-MANIFEST.md`에 기록했다.

## 6. 인터랙션과 프라이버시 경계

공개 범위 예시는 온체인 증명, 실제 서명, 지갑 연결, 결제가 아니다. `INTERFACE PREVIEW`, `Fictional example. No proof has been generated.`를 명시한다. 아무 요청도 전송하지 않으며 기존 앱 상태와 연결하지 않는다.

컨텍스트 전환 시 optional 동의는 다시 false가 된다. 검열 바 뒤에 실제 개인정보 문자열을 숨겨 두지 않는다. 화면에 표시할 필요 없는 값은 DOM에 넣지 않는 게 원칙이다. SVG `innerHTML`은 빌드 시 고정된 아이콘 path만 받으며 사용자 입력 SVG를 받지 않는다.

프로토타입 경계 문구는 현재 레포의 보안 문서를 따른다. 로컬 Midnight/offline ledger 구현과 공개 Vercel 프런트엔드를 구분한다. 철회가 과거에 이미 공유된 정보를 지운다고 설명하지 않는다.

## 7. 모션·접근성·성능

- CTA hover 180ms. 섹션은 IntersectionObserver + WAAPI 300ms, 작은 10px 이동.
- React 렌더 후 콘텐츠는 애니메이션을 기다리며 숨겨지지 않는다. SPA이므로 JavaScript가 완전히 꺼진 환경의 SSR은 별도 범위다.
- `prefers-reduced-motion`에서 모션을 생략하며 설정 변경 시 실행 중 애니메이션도 중단한다.
- 제목 계층, label, role=tab/tablist/tabpanel, focus-visible, native details, aria-live 상태를 사용한다.
- Hero 이미지만 높은 우선순위. 아래쪽 에셋은 lazy loading. 과도한 preload 또는 외부 추적기는 없다.
- WebGL, WebGPU, 자동재생 영상, 무한 마퀴, 폰트 CDN, 원격 이미지 hotlink는 사용하지 않는다.

## 8. 적용·릴리스 순서

1. `apply-to-repo.mjs --repo <VEIL 경로>`로 쓰기 없는 사전 검사.
2. 충돌이 없을 때 같은 명령에 `--apply`를 붙인다. 기존 두 파일은 Git 디렉터리 안에 백업된다.
3. 실제 레포에서 `npm run build`, `npm test`를 실행한다. 이 패키지의 렌더 검사는 이를 대체하지 않는다.
4. `git diff`, 새 파일 목록, 현재 보안 카피를 검토하고 커밋한다.
5. Vercel 배포 후 `/`, `/app`, `/verifier`를 각각 직접 열고, 새로고침/뒤로가기/APP 클릭을 확인한다.
6. 1440×900과 1920×1080에서 스크린샷을 다시 남긴다. 캐시된 이전 페이지와 혼동하지 않도록 배포 커밋을 함께 기록한다.

색상, 사진 원본, 브라우저 조판을 통제해도 모든 OS와 GPU에서 절대 동일한 출력은 보장할 수 없다. 해당 조건을 검사 가능한 수치와 원본 관리로 바꾼 것이 이 구현의 품질 전략이다.
