# VEIL 디자인 검증 기록

## 실행한 검증

실제 TSX를 TypeScript로 transpile하고 React 런타임으로 Chromium에서 렌더했다. 기존 전역 CSS를 새 랜딩 CSS보다 뒤에 읽는 스트레스 조건에서 수행했다. 결과 전문: 패키지 `qa/browser-results.json`. 현재 31/31 통과.

검사 항목:

- 실제 TSX 헤드라인, 네 개 `/app` 링크, 가입/모달 가로채기 없는 native anchor.
- Hero 에셋 디코드와 핵심 표면의 R=G=B 무채색 확인.
- Daily/API/DeFi 탭 클릭, ArrowLeft/Right·Home·End 포커스, checkbox 키보드.
- 선택적 공개 반영, 컨텍스트 변경 시 동의 초기화.
- FAQ 열림, 공개 사이트와 로컬 증명 실행 조건의 구분.
- 1920/1440/1280/1024/390 CSS px에서 가로 넘침 없음.
- 인물 표시 폭이 512px 원본의 DPR2 조건을 넘지 않도록 transform 배율까지 계산.
- 개발용 갤러리, 24 SVG 아이콘, input에 이전 초록 CSS가 새어 들어오지 않음.
- clipboard 실패를 성공처럼 표시하지 않음.
- reduced-motion 환경에서 애니메이션 없음.
- 프리뷰 내 JavaScript 런타임 오류 0, 외부 네트워크 리소스 요청 0.

스냅샷은 `qa/hero-1440.png`, `qa/landing-1440.png`, `qa/landing-1920.png`, `qa/landing-1280.png`, `qa/landing-390.png`, `qa/component-library-1440.png`에 있다. 이는 새 생성 시안이 아니라 실제 컴포넌트를 렌더한 결과다.

## 검증 환경의 한계

이 환경의 localhost 브라우저 탐색은 제한되어 있어 self-contained HTML을 Playwright `page.set_content()`로 로드했다. 이 방식은 실제 React 상태·CSS·키보드·DOM을 실행하지만 실제 호스트의 HTTP/CSP/서비스워커/네트워크 탐색을 대체하지 않는다.

`transpileModule`의 진단 0은 전체 TypeScript semantic typecheck 통과와 같지 않다. 전체 레포의 `npm run build`, `npm test`, Compact 컴파일, ZK 통합 검증은 이번 디자인 패키지에서 실행하지 않았다. 기존 코드와 서버는 변경하지 않는다.

추가로 확인할 것:

1. 실제 레포에서 기존 설치 의존성으로 빌드와 단위 테스트.
2. Vercel 배포의 `/`, `/app`, `/verifier` 실제 링크 이동·직접 접속·새로고침.
3. Windows/macOS 글꼴 조판, Safari와 Firefox.
4. 실제 호스팅의 LCP/CLS/INP, 이미지 캐시·Content-Type, CSP. Lighthouse 수치는 측정하지 않았으므로 성능 점수를 주장하지 않는다.
5. DPR3 디스플레이에서 인물은 새 768px 이상 원본을 제공하거나 표시 크기를 추가 제한.

핵심 텍스트 색 조합은 별도의 수치 대비 검사에 포함하지만, 이것이 모든 상태에 대한 WCAG 인증이나 전면적인 접근성 감사는 아니다.
