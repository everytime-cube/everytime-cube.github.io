# 화면 소스(src.html)에 힌트 엔진·공략 문구를 넣어 두 가지로 만들어요.
#   game/index.html : 앱용 게임 화면 (js/config.js, js/three.min.js를 불러옴). 웹 사이트(web/)는 앱 다운로드 안내만 한다
#   preview.html   : 미리보기(아티팩트)용 한 파일 (서버 없이 이 기기에만 저장, 가짜 광고)
#   python3 src/build.py
import pathlib
d = pathlib.Path(__file__).parent
root = d.parent
s = (d / 'src.html').read_text(encoding='utf-8')
s = s.replace('/*ENGINE*/', (d / 'hint-engine.js').read_text(encoding='utf-8') + '\n' + (d / 'hint-engine2.js').read_text(encoding='utf-8'))
s = s.replace('/*GUIDE*/', (d / 'guide.js').read_text(encoding='utf-8'))
CDN = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
assert '<!--CONFIG-->' in s and CDN in s
web = s.replace('<!--CONFIG-->', '<script src="js/config.js"></script>').replace(CDN, '<script src="js/three.min.js"></script>')
(root / 'game' / 'index.html').write_text(web, encoding='utf-8')
(root / 'preview.html').write_text(s.replace('<!--CONFIG-->\n', ''), encoding='utf-8')
print('game/index.html, preview.html 생성 완료')
