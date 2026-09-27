# 실제 사이트 에셋 목록

총 **45개 에셋**. `manifest.json`은 목록용 메타데이터라 이 수에서 제외한다. 개별 아이콘 24개를 포함한다. 폰트 파일은 없다.

프로덕션 경로는 `/veil/...`; 실제 파일은 `public/veil/...`이다. 모든 SVG는 독립적인 벡터 파일이며 CSS/React UI를 이미지에 구워 넣지 않았다. 인물 사진만 원래 래스터이며, 고해상도라고 허위 표기하지 않는다. 파생 파일과 해시는 `public/veil/manifest.json`을 기준으로 확인한다.

| 파일 | bytes | 용도 |
|---|---:|---|
| `archival-paper.svg` | 1,598 | 서류 바탕 |
| `archive-grid.svg` | 334 | 중립 그리드 |
| `context-map.svg` | 813 | context 관계 벡터 도식 |
| `divider.svg` | 201 | 섹션 구분선 |
| `envelope.svg` | 1,952 | 히어로와 최종 CTA의 벡터 봉투 |
| `favicon-32.png` | 995 | 32×32 호환용 favicon |
| `favicon.svg` | 262 | 탭 아이콘 |
| `icons/arrow-down.svg` | 234 | UI icon / 24px viewBox |
| `icons/arrow-right.svg` | 234 | UI icon / 24px viewBox |
| `icons/arrow-up-right.svg` | 229 | UI icon / 24px viewBox |
| `icons/briefcase.svg` | 292 | UI icon / 24px viewBox |
| `icons/check.svg` | 225 | UI icon / 24px viewBox |
| `icons/chevron.svg` | 224 | UI icon / 24px viewBox |
| `icons/clock.svg` | 254 | UI icon / 24px viewBox |
| `icons/close.svg` | 229 | UI icon / 24px viewBox |
| `icons/code.svg` | 251 | UI icon / 24px viewBox |
| `icons/copy.svg` | 272 | UI icon / 24px viewBox |
| `icons/cube.svg` | 273 | UI icon / 24px viewBox |
| `icons/eye-off.svg` | 500 | UI icon / 24px viewBox |
| `icons/fingerprint.svg` | 321 | UI icon / 24px viewBox |
| `icons/info.svg` | 258 | UI icon / 24px viewBox |
| `icons/link.svg` | 291 | UI icon / 24px viewBox |
| `icons/lock.svg` | 293 | UI icon / 24px viewBox |
| `icons/person.svg` | 276 | UI icon / 24px viewBox |
| `icons/plus.svg` | 225 | UI icon / 24px viewBox |
| `icons/receipt.svg` | 265 | UI icon / 24px viewBox |
| `icons/revoke.svg` | 250 | UI icon / 24px viewBox |
| `icons/root.svg` | 322 | UI icon / 24px viewBox |
| `icons/shield-check.svg` | 419 | UI icon / 24px viewBox |
| `icons/shield.svg` | 261 | UI icon / 24px viewBox |
| `icons/users.svg` | 316 | UI icon / 24px viewBox |
| `icons.svg` | 5,589 | 24종 SVG symbol sprite |
| `monogram.svg` | 216 | VEIL V mark |
| `paper-grain.png` | 38,161 | 192×192 단색 alpha 질감, CSS 반복 |
| `portrait-256.webp` | 6,276 | 작은 화면용 256×256 파생본 |
| `portrait-512.webp` | 18,894 | 사용자 원본에서 변환; 512×512, 확대 금지 |
| `redaction.svg` | 234 | 검열 바 시각 패턴; 비밀 값 숨김 기능 아님 |
| `registration.svg` | 239 | 제작/아카이브 registration 표시 |
| `social-card.png` | 54,535 | OG 공유용 1200×630 PNG |
| `social-card.svg` | 7,140 | OG 시각 원본 |
| `touch-icon.png` | 4,882 | 180×180 touch icon |
| `vellum.svg` | 537 | 반투명 문서 레이어 |
| `wax-seal.svg` | 6,445 | 봉인/인텐트 모티프 |
| `wordmark-dark.svg` | 489 | 파치먼트 위 어두운 path 워드마크 |
| `wordmark.svg` | 489 | 밝은 path 워드마크 |

## 제작 스크립트

- `scripts/generate-assets.py --portrait <사용자 원본 PNG>`: 원본 치수 확인, SVG·아이콘·grain·256/512 WebP 생성. Pillow 필요.
- `scripts/export-raster-assets.py`: PNG favicon/touch/OG 파생본 생성 및 manifest 갱신. CairoSVG 필요.

이 스크립트는 제작용으로만 제공한다. 완성된 에셋은 이미 포함돼 있어 랜딩 빌드에 Python/Pillow/CairoSVG 설치가 필요하지 않다.

Lucide에서 가져온 두 아이콘에는 `docs/THIRD-PARTY-LICENSES.md`가 적용된다. 사용자 인물 이미지의 권리는 사용자가 관리한다. SVG fill을 임의의 초록/청록으로 일괄 변경하지 않는다.
