// 게임 화면 설정 (로컬에서 브라우저로 확인할 때용). 앱은 app/scripts/build-web.mjs가 이 파일을 앱용으로 바꿔 넣는다.
window.CUBE_CONFIG = {
  // 오늘의 챌린지 서버 (Cloudflare Worker). 로컬 개발: 주소 뒤에 ?api=http://localhost:8787
  API_BASE: (new URLSearchParams(location.search).get('api')) || 'https://api.ohsangplay.com/cube',
  SITE: 'https://every-cube.ohsangplay.com/',
  APP: false,
};
