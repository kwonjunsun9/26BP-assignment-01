# My Blueprint

권준성의 개인 포트폴리오입니다. Hugo Extended와 Tailwind CSS로 제작했습니다.

- 배포 주소: <https://kwonjunsun9.github.io/26BP-assignment-01/>
- 페이지: Home, About, Project, Contact 및 프로젝트 상세 소개 4개
- 정리·검증 기록: [REVIEW.md](REVIEW.md)

## 실행 환경

GitHub Actions와 동일하게 다음 버전에서 검증했습니다.

- Hugo **Extended 0.167.0**
- Node.js **24** / npm
- Go **1.27.1**
- Python **3.12** (최소 3.11)

각 도구를 설치하고 PATH에 등록한 뒤 **저장소 루트**에서 실행합니다.
첫 실행에는 npm 패키지와 Hugo 모듈을 내려받을 인터넷 연결이 필요합니다.

```sh
# site/package-lock.json 기준으로 의존성 설치
npm run setup

# http://localhost:1314/ 에서 개발 서버 실행
npm run dev
```

## 제출 전 검증

```sh
# 프로덕션 빌드와 내부 링크·리소스 검증
npm run verify
```

결과물은 루트의 `public/`에 생성됩니다. 검증기는 필수 페이지, 내부 링크와
앵커, 이미지·CSS·JS·폰트 파일, 중복 HTML ID, 리소스 무결성 해시를 확인합니다.
외부 사이트의 접속 가능 여부는 검사하지 않습니다.

빌드만 실행하려면 `npm run build`, 이미 빌드한 결과만 검사하려면 `npm run check`를 사용합니다.

## 수정할 파일

| 위치 | 역할 |
| --- | --- |
| `site/content/english/` | 페이지 본문과 소개·연락처 정보 |
| `site/data/bp_projects.json` | 홈 카드와 Project 목록의 프로젝트 정보 |
| `site/layouts/` | 실제 사용하는 페이지 템플릿과 공통 부분 |
| `site/assets/css/`, `site/assets/js/` | Hugo가 처리하는 스타일과 스크립트 |
| `site/static/` | 경로를 그대로 유지하는 이미지·폰트 |
| `site/hugo.toml`, `site/config/_default/` | 사이트 주소와 Hugo 설정 |
| `.github/pages_build.py`, `scripts/check_site.py` | 공통 실행 명령과 빌드 결과 검증 |

공통 색상·글자 크기 토큰은 `site/assets/css/generated-theme.css`에서 수정합니다.
`site/data/theme.json`은 테마의 폰트 설정 등에 사용합니다.
`public/`, `resources/`, `hugo_stats.json`, `node_modules/`는 자동 생성되며 커밋하지 않습니다.

## 배포

GitHub Settings → Pages → Source를 **GitHub Actions**로 설정합니다.
`main`에 push하면 `.github/workflows/hugo-pages.yml`이 설치·빌드·검증 후 배포합니다.
Pull Request에서는 설치·빌드·검증만 실행합니다.

Roxo Hugo를 바탕으로 제작했으며 원본의 MIT 라이선스를 [LICENSE](LICENSE)에 유지했습니다.
기술 로고의 출처는 해당 템플릿에, Contact 폰트의 라이선스는 `site/static/fonts/Anton-OFL.txt`에 있습니다.
