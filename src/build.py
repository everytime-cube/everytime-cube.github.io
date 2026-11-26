# 화면 소스(src.html)에 힌트 엔진·공략 문구를 넣어 두 가지로 만들어요.
#   web/index.html : 웹 사이트·앱용 (js/config.js, js/three.min.js를 불러옴)
#   preview.html   : 미리보기(아티팩트)용 한 파일 (서버 없이 이 기기에만 저장, 가짜 광고)
#   python3 src/build.py
import pathlib
d = pathlib.Path(__file__).parent
root = d.parent
s = (d / 'src.html').read_text(encoding='utf-8')
s = s.replace('/*ENGINE*/', (d / 'hint-engine.js').read_text(encoding='utf-8'))
s = s.replace('/*GUIDE*/', (d / 'guide.js').read_text(encoding='utf-8'))
CDN = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
assert '<!--CONFIG-->' in s and CDN in s
web = s.replace('<!--CONFIG-->', '<script src="js/config.js"></script>').replace(CDN, '<script src="js/three.min.js"></script>')
(root / 'web' / 'index.html').write_text(web, encoding='utf-8')
(root / 'preview.html').write_text(s.replace('<!--CONFIG-->\n', ''), encoding='utf-8')
print('web/index.html, preview.html 생성 완료')
