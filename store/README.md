# 스토어 스크린샷

`ios/01~06.png`: App Store 스크린샷 (1179×2556, Dynamic Island iPhone 6.1인치 규격, 세로)

다시 만들기 (게임 화면을 바꿨을 때):
1. `python3 src/build.py`
2. `preview.html`을 `game/_shot.html`로 복사하고 Three.js를 `js/three.min.js`로, 배너는 숨김 → `cd game && python3 -m http.server 8765`
3. `python3 store/capture.py` (Playwright + Chrome, 원본 화면을 /tmp/shots/raw*.png로)
4. `python3 store/compose.py` (문구 + 기기 테두리를 얹어 /tmp/shots/out/에 저장) → `store/ios/`로 복사
