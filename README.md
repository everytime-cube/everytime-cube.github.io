# 틈틈이 큐브

손으로 돌리는 3D 큐브 — 튜토리얼 · 일반 · 오늘의 챌린지 (iPhone·안드로이드 앱 전용)

- 안내 페이지: https://every-cube.ohsangplay.com (앱 다운로드 링크, 약관)
- 번들 ID / 패키지명: `com.ohsang.play.cube`, 세로 화면 고정
- 챌린지 서버: `https://api.ohsangplay.com/cube`

## 구조

```
src/                 화면 소스
  src.html           화면·게임 코드 (Three.js)
  hint-engine.js     조각 단위 힌트 엔진 (초보자 7단계, 서버 테스트도 같이 씀)
  guide.js           튜토리얼 공략 문구
  build.py           → game/index.html (앱용), preview.html (아티팩트 미리보기용)
game/                앱에 들어가는 게임 화면 (app/scripts/build-web.mjs가 app/www로 복사)
  js/config.js       서버 주소 (앱 빌드 때 앱용으로 바뀜)
  js/three.min.js    Three.js r128 (앱이 인터넷 없이도 뜨게 파일로 둠)
web/                 안내 페이지 → GitHub Pages (CNAME: every-cube.ohsangplay.com)
  index.html         앱 다운로드 링크 (스토어 주소·출시 예정 표시는 파일 아래 스크립트에서)
  privacy.html terms.html app-ads.txt
worker/              오늘의 챌린지 서버 (Cloudflare Worker + Durable Object)
  src/cube.ts        오늘의 섞기, 이동 재생·완성 확인
  src/daily.ts       날짜 하나 = Durable Object 하나 (도전 횟수·진행 중인 도전·기록, SQLite)
  src/index.ts       API
app/                 스토어 앱 (Capacitor 8). game/을 앱 안에 묶는다
  scripts/build-web.mjs  game/ → app/www/ 복사, 앱용 설정·네이티브 묶음(cap.js) 넣기
  src/native.js      AdMob·진동·브라우저·뒤로가기를 window.CubeNative로
  assets/            아이콘·스플래시 원본 (npx @capacitor/assets generate)
.github/workflows/
  pages.yml          web/ 변경 → 안내 페이지 배포
  server.yml         worker/ 변경 → 타입 검사·테스트 후 서버 배포
  android-build.yml  수동 실행 → AAB(서명) 또는 디버그 APK
  ios-testflight.yml 수동 실행 → TestFlight 업로드
```

화면을 고치면 `python3 src/build.py`로 `game/index.html`을 다시 만들어 같이 커밋해요.

## 모드

- **튜토리얼**: 공략 7단계 + 조각 단위 힌트 무제한. 노랑 위·흰색 아래를 자동으로 유지
- **일반**: 2×2~5×5. 3×3은 한 판에 힌트 3개 (다 쓰면 보상형 광고로 +3, 3분에 한 번)
- **오늘의 챌린지**: 한국 시간 날짜마다 같은 섞기. 하루 1번 (보상형 광고로 하루 1번 더). 시간 → 이동 수 순 랭킹, 이니셜 영문 3글자

## 챌린지 서버 API

| 요청 | 내용 |
|---|---|
| `GET /api/challenge/today?device=` | 오늘 상태 (남은 도전, 내 기록). 섞기는 알려 주지 않음 |
| `POST /api/challenge/start {device}` | 도전 1회 사용, 섞기와 runId (서버 시각 기록) |
| `POST /api/challenge/bonus {device}` | 광고 보상: 하루 한 번 +1 |
| `POST /api/challenge/giveup {device}` | 진행 중인 도전 포기 |
| `POST /api/challenge/submit {device, runId, name, ms, moves}` | 서버가 섞기+이동을 재생해 완성 확인, 시간은 서버가 잰 시간 이하만 인정. 기기마다 최고 기록 하나 |
| `GET /api/challenge/ranking?device=` | 상위 50명 + 내 순위 |

로컬: `cd worker && npm install && npx wrangler dev --port 8787` → `cd game && python3 -m http.server 8080` → `http://localhost:8080/?api=http://localhost:8787`

## 설정 (한 번만)

저장소 **Settings → Pages → Source**: GitHub Actions

**Settings → Secrets and variables → Actions → Secrets** (다른 앱과 같은 값)

| 이름 | 용도 |
|---|---|
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | 챌린지 서버 배포 |
| `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8_BASE64` | iOS 빌드·TestFlight |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` | 안드로이드 서명 (`cube-upload.jks`) |
| `PLAY_SERVICE_ACCOUNT_JSON` (선택) | Play 자동 업로드 |

**Variables** (AdMob, 없으면 구글 테스트 광고)

| 이름 | 값 |
|---|---|
| `ADMOB_IOS_APP_ID` / `ADMOB_ANDROID_APP_ID` | 앱 ID `ca-app-pub-…~…` |
| `ADMOB_IOS_BANNER_ID` / `ADMOB_ANDROID_BANNER_ID` | 하단 배너 |
| `ADMOB_IOS_REWARDED_ID` / `ADMOB_ANDROID_REWARDED_ID` | 보상형: 힌트 +3 |
| `ADMOB_IOS_REWARDED_CHALLENGE_ID` / `ADMOB_ANDROID_REWARDED_CHALLENGE_ID` (선택) | 보상형: 챌린지 한 번 더 (없으면 힌트용을 같이 씀) |

배너가 실제 ID인데 보상형 ID가 비어 있으면 보상형은 꺼져요 (실제 앱에 테스트 광고가 나가지 않게).
