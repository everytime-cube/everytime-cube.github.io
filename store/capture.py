import asyncio, time
from playwright.async_api import async_playwright
URL='http://localhost:8765/_shot.html'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        async def page():
            ctx=await b.new_context(viewport={'width':393,'height':852},device_scale_factor=3,has_touch=False,user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')
            pg=await ctx.new_page()
            pg.on('pageerror',lambda e:print('ERR',e))
            await pg.goto(URL); await pg.wait_for_timeout(600)
            return pg
        async def idle(pg,extra=300):
            for _ in range(200):
                if not await pg.evaluate('window.__ttc.busy()'): break
                await pg.wait_for_timeout(100)
            await pg.wait_for_timeout(extra)
        # 1 홈
        pg=await page(); await pg.screenshot(path='/tmp/shots/raw1_home.png')
        # 2 일반 3×3: 섞은 뒤 줄 선택
        await pg.click('[data-mode=normal]'); await pg.wait_for_timeout(500); await idle(pg,1200)
        # 큐브 앞면 블록 탭
        box=await pg.locator('#stage').bounding_box()
        cx,cy=box['x']+box['width']*0.40,box['y']+box['height']*0.62
        await pg.mouse.click(cx,cy); await pg.wait_for_timeout(300)
        # 한 수 돌려서 시간이 흐르게
        await pg.mouse.move(cx,cy); await pg.mouse.down(); await pg.mouse.move(cx+60,cy,steps=6); await pg.mouse.move(cx+130,cy,steps=6); await pg.mouse.up(); await idle(pg,900)
        # 다음 줄을 손으로 돌리는 중인 모습
        await pg.mouse.move(cx,cy); await pg.mouse.down(); await pg.mouse.move(cx+25,cy,steps=4); await pg.mouse.move(cx+58,cy+6,steps=6); await pg.wait_for_timeout(250)
        await pg.screenshot(path='/tmp/shots/raw2_select.png')
        await pg.mouse.up(); await idle(pg,300)
        # 4 힌트
        await pg.mouse.click(box['x']+10,box['y']+10); await pg.wait_for_timeout(200)
        await pg.click('#btnHint'); await idle(pg,200)
        await pg.wait_for_timeout(1800)   # 큐브 돌리기 안내 토스트가 힌트 토스트로 바뀔 때까지
        await pg.screenshot(path='/tmp/shots/raw4_hint.png')
        # 6 5×5
        await pg.click('#btnHint'); await pg.wait_for_timeout(200)
        await pg.click('#sizes [data-n="5"]'); await pg.wait_for_timeout(500); await idle(pg,1500)
        await pg.screenshot(path='/tmp/shots/raw6_5x5.png')
        # 3 튜토리얼: 1단계 일부 진행 후 공략 패널
        pg=await page()
        await pg.click('[data-mode=tutorial]'); await pg.wait_for_timeout(500); await idle(pg,1500)
        # 힌트 두 조각만 따라가기
        await pg.click('#btnHint'); await pg.wait_for_timeout(200)
        for _ in range(60):
            hs=await pg.evaluate('window.__ttc.hs()&&{a:__ttc.hs().moves[__ttc.hs().idx],n:__ttc.hs().label}')
            prog=await pg.inner_text('#stageText')
            if '(2/4)' in prog or '(3/4)' in prog: break
            if not hs: await pg.wait_for_timeout(300); continue
            await idle(pg,50)
            hs=await pg.evaluate('window.__ttc.hs()?__ttc.hs().moves[__ttc.hs().idx]:null')
            if hs: await pg.evaluate('m=>window.__ttc.move(m)',hs); await idle(pg,50)
        await pg.evaluate("window.__ttc.hs()&&document.getElementById('btnHint').click()")
        await pg.wait_for_timeout(2500)
        await pg.screenshot(path='/tmp/shots/raw3_tutorial.png')
        # 5 챌린지 패널
        await pg.click('#btnBack'); await pg.wait_for_timeout(300)
        await pg.click('[data-mode=challenge]'); await pg.wait_for_timeout(800)
        await pg.screenshot(path='/tmp/shots/raw5_challenge.png')
        # 5b 챌린지 진행 화면 (카운트다운 끝난 직후)
        await pg.click('#btnChStart'); await pg.wait_for_timeout(500); await idle(pg,200)
        await pg.wait_for_timeout(2300)
        await pg.screenshot(path='/tmp/shots/raw5b_countdown.png')
        await b.close()
asyncio.run(main())
