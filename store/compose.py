from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H=1179,2556
FONT='/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc'
FONT_B='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
KR=1  # ttc 안의 한국어(KR) 글꼴 번호
def font(path,size):
    for i in range(10):
        f=ImageFont.truetype(path,size,index=i)
        if 'KR' in f.getname()[0]: return f
    return ImageFont.truetype(path,size,index=KR)
ACC=(255,176,32)
items=[
 ('raw2_select.png','손으로 밀어서 돌리는','3D 큐브','블록을 눌러 줄을 고르고 손가락으로 밀어요'),
 ('raw3_tutorial.png','처음이어도 괜찮아요','7단계 공략 튜토리얼','지금 몇 단계인지, 몇 개 맞췄는지 알려줘요'),
 ('raw4_hint.png','막히면 조각 하나씩','알려주는 힌트','정답을 다 알려주지 않고 한 수씩 안내해요'),
 ('raw5_challenge.png','매일 모두가 같은 큐브','오늘의 챌린지','하루 한 번, 도움 없이 랭킹에 도전'),
 ('raw6_5x5.png','2×2부터 5×5까지','원하는 크기로','시간과 이동 수로 최고 기록에 도전'),
 ('raw1_home.png','짬 날 때 한 판','틈틈이 큐브','회원가입 없이 바로 시작해요'),
]
def bg():
    im=Image.new('RGB',(W,H),(19,21,27))
    glow=Image.new('L',(W,H),0); d=ImageDraw.Draw(glow)
    d.ellipse((-W*0.3,-H*0.12,W*1.3,H*0.42),fill=255)
    glow=glow.filter(ImageFilter.GaussianBlur(180))
    top=Image.new('RGB',(W,H),(44,49,64))
    return Image.composite(top,im,glow.point(lambda v:int(v*0.85)))
def rounded(im,r):
    m=Image.new('L',im.size,0); ImageDraw.Draw(m).rounded_rectangle((0,0,im.size[0]-1,im.size[1]-1),r,fill=255)
    out=im.convert('RGBA'); out.putalpha(m); return out
for i,(f,l1,l2,sub) in enumerate(items,1):
    canvas=bg()
    d=ImageDraw.Draw(canvas)
    f1=font(FONT,96); f2=font(FONT,96); f3=font(FONT_B,44)
    y=150
    for text,fnt,col in ((l1,f1,(238,240,244)),(l2,f2,ACC)):
        w=d.textlength(text,font=fnt); d.text(((W-w)/2,y),text,font=fnt,fill=col); y+=128
    w=d.textlength(sub,font=f3); d.text(((W-w)/2,y+18),sub,font=f3,fill=(150,158,174))
    # 화면 (기기 테두리 느낌)
    shot=Image.open('/tmp/shots/'+f).convert('RGB')
    sw=int(W*0.80); sh=int(shot.size[1]*sw/shot.size[0])
    shot=shot.resize((sw,sh),Image.LANCZOS)
    top=y+130
    frame_pad=18
    fw,fh=sw+frame_pad*2,sh+frame_pad*2
    fx=(W-fw)//2
    # 그림자
    sh_l=Image.new('L',(W,H),0); ImageDraw.Draw(sh_l).rounded_rectangle((fx+10,top+30,fx+fw-10,top+fh+40),110,fill=170)
    sh_l=sh_l.filter(ImageFilter.GaussianBlur(40))
    canvas=Image.composite(Image.new('RGB',(W,H),(0,0,0)),canvas,sh_l)
    frame=Image.new('RGB',(fw,fh),(46,50,61)); frame=rounded(frame,112)
    inner=Image.new('RGB',(fw-6,fh-6),(10,11,14)); inner=rounded(inner,108)
    canvas.paste(frame,(fx,top),frame)
    canvas.paste(inner,(fx+3,top+3),inner)
    s2=rounded(shot,92)
    canvas.paste(s2,(fx+frame_pad,top+frame_pad),s2)
    canvas.save(f'/tmp/shots/out/{i:02d}.png')
print('done')
