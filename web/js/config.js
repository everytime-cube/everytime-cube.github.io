// 배포 설정 (웹 사이트용). 앱은 app/scripts/build-web.mjs가 이 파일을 앱용으로 바꿔 넣는다.
window.CUBE_CONFIG = {
  // 오늘의 챌린지 서버 (Cloudflare Worker). 로컬 개발: 주소 뒤에 ?api=http://localhost:8787
  API_BASE: (new URLSearchParams(location.search).get('api')) || 'https://api.ohsangplay.com/cube',
  SITE: 'https://every-cube.ohsangplay.com/',
  APP: false,
};
