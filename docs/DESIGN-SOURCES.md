# 출처·도입 방식·권리 경계

## designeer에서 선택한 리소스

Designeer는 여기서 컴포넌트 소스를 한꺼번에 가져오는 패키지가 아니라, 적절한 공개 리소스를 찾는 디렉터리로 이용했다.

- https://designeer.xyz/
- https://designeer.xyz/components
- https://designeer.xyz/visuals

| 리소스 | 실제로 사용한 것 | 적용 방식 |
|---|---|---|
| Lucide | `shield-check`, `eye-off` 두 SVG의 path | 소스 geometry를 vendoring. ISC notice 포함. VEIL 선두께 1.5로 조정 |
| shadcn Tabs 문서 | List/Trigger/Panel 구성과 접근 가능한 탭 패턴 | 기존 React와 CSS로 새 구현. shadcn/Radix/Base UI 패키지는 설치하지 않음 |
| Motion Primitives InView | 뷰포트 진입 시 작은 reveal라는 인터랙션 패턴 | native IntersectionObserver/WAAPI로 독립 구현. 소스 구현을 복사하지 않음 |

정확한 링크:

- https://github.com/lucide-icons/lucide/blob/main/icons/shield-check.svg — 검토 blob `da48f664e51be4ceb800dbe4f6c10c5e7cfa800e`
- https://github.com/lucide-icons/lucide/blob/main/icons/eye-off.svg — 검토 blob `0083aaa8722f3b9d2b24a316f9cc6125a248c14c`
- https://github.com/lucide-icons/lucide/blob/main/LICENSE
- https://ui.shadcn.com/docs/components/base/tabs
- https://github.com/ibelick/motion-primitives/blob/main/components/core/in-view.tsx — 검토 blob `dd8911453cac4457672b5b9781eee2e8843dcd1f`
- https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- https://web.dev/learn/images/responsive-images

Lucide 이외의 22개 단순 아이콘, 봉투, 봉인, 문서, 패턴, SVG path 워드마크, React/CSS는 이번 VEIL 구현을 위해 작성했다. “24개 전부 Lucide” 또는 “designeer 유료 컴포넌트 설치 완료”라고 해석하지 않는다. 유료 템플릿이나 권한 없는 사진을 가져오지 않았다.

## 사용자 제공 아트

`portrait-256.webp`, `portrait-512.webp`는 사용자 제공 `image(20260927-144250).png`의 512px 원본에서 변환했다. 새 인물 생성, 얼굴 식별, 가짜 고해상도 복원은 하지 않았다. 원본 아트에 대한 사용 권리는 사용자가 관리한다. 이 패키지는 사용자 아트를 제3자 스톡 자산으로 재라이선스하지 않는다.

## 오프라인 프리뷰

오프라인 프리뷰는 현재 대화에 제공된 VEIL 빌드에서 분리한 React/ReactDOM/Scheduler 런타임을 사용한다. 프리뷰 런타임 버전은 19.3.0이고, 프로덕션 통합 코드는 기존 레포의 React 의존성을 그대로 쓴다. 프리뷰는 전체 Node Core나 Midnight proving runtime을 포함하지 않는다.

React MIT 공지는 배포 패키지 `licenses/REACT-MIT.txt`와 self-contained HTML에 포함한다. 프로덕션 레포에서는 기존 npm 라이선스가 적용된다.

외부 라이브러리의 이름이나 링크는 해당 제작자가 VEIL을 승인하거나 보안 감사를 수행했다는 뜻이 아니다.
