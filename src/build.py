# 화면 소스(src.html)에 힌트 엔진·공략 문구를 넣어 루트 index.html을 만들어요.
#   python3 src/build.py
import pathlib
d = pathlib.Path(__file__).parent
s = (d / 'src.html').read_text(encoding='utf-8')
s = s.replace('/*ENGINE*/', (d / 'hint-engine.js').read_text(encoding='utf-8'))
s = s.replace('/*GUIDE*/', (d / 'guide.js').read_text(encoding='utf-8'))
(d.parent / 'index.html').write_text(s, encoding='utf-8')
print('index.html 생성 완료')
