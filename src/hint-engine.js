// ---------- 조각 단위 힌트 엔진 (초보자 7단계, 3×3) ----------
// 상태: 스티커 배열 [{p:[x,y,z], n:[x,y,z], c:'U'|'D'|'R'|'L'|'F'|'B'}]  (c = 색 키, D=흰색, U=노랑)
// 이동: {ax:0|1|2, layer:-1|0|1, q:1|2|3}  (q = 축 기준 오른손 법칙 양의 방향 90° 회전 수)
var HintEngine=(function(){
  var W='D', Y='U';   // 기준 면(1~3단계를 맞추는 면)과 그 반대 면 — 상태마다 바뀔 수 있음
  var OPP={U:'D',D:'U',R:'L',L:'R',F:'B',B:'F'};
  var ADJ={U:'노란',D:'흰',R:'주황',L:'빨간',F:'초록',B:'파란'};
  function setBase(b){ W=b||'D'; Y=OPP[W]; }
  var COLOR_NAME={U:'노랑',D:'흰',R:'주황',L:'빨강',F:'초록',B:'파랑'};
  function rotV(v,ax,q){
    var x=v[0],y=v[1],z=v[2],t;
    for(var i=0;i<q;i++){
      if(ax===0){ t=y; y=-z; z=t; }
      else if(ax===1){ t=x; x=z; z=-t; }
      else { t=x; x=-y; y=t; }
    }
    return [x,y,z];
  }
  function eq(a,b){ return a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2]; }
  function add(a,b){ return [a[0]+b[0],a[1]+b[1],a[2]+b[2]]; }
  function neg(a){ return [-a[0],-a[1],-a[2]]; }
  function cross(a,b){ return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }
  function dot(a,b){ return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
  function axOf(n){ return n[0]?0:(n[1]?1:2); }
  function clone(st){ return st.map(function(s){ return {p:s.p.slice(),n:s.n.slice(),c:s.c}; }); }
  function apply(st,m){
    for(var i=0;i<st.length;i++){ var s=st[i]; if(s.p[m.ax]===m.layer){ s.p=rotV(s.p,m.ax,m.q); s.n=rotV(s.n,m.ax,m.q); } }
    return st;
  }
  function applyAll(st,ms){ for(var i=0;i<ms.length;i++) apply(st,ms[i]); return st; }
  // 면 회전: 면 법선 n, t=1 시계(그 면을 정면에서 볼 때), -1 반시계, 2 반 바퀴
  function faceMove(n,t){
    var ax=axOf(n), sg=n[ax], dir=-sg*t;
    return {ax:ax,layer:sg,q:((dir%4)+4)%4};
  }
  function alg(str,u,f){
    var r=cross(u,f);
    var F={U:u,D:neg(u),F:f,B:neg(f),R:r,L:neg(r)};
    return str.split(' ').map(function(tk){
      var t=tk.indexOf('2')>=0?2:(tk.indexOf("'")>=0?-1:1);
      return faceMove(F[tk[0]],t);
    });
  }
  function centers(st){
    var C={};
    st.forEach(function(s){ var nz=(s.p[0]?1:0)+(s.p[1]?1:0)+(s.p[2]?1:0); if(nz===1) C[s.c]=s.n.slice(); });
    return C;
  }
  function pieces(st){
    var m={};
    st.forEach(function(s){ var nz=(s.p[0]?1:0)+(s.p[1]?1:0)+(s.p[2]?1:0); if(nz<2) return; var k=s.p.join(','); (m[k]=m[k]||[]).push(s); });
    return Object.keys(m).map(function(k){ var ss=m[k]; return {key:ss.map(function(s){return s.c;}).sort().join(''),st:ss}; });
  }
  function findPiece(st,key){ var ps=pieces(st); for(var i=0;i<ps.length;i++) if(ps[i].key===key) return ps[i]; return null; }
  function pieceSolved(pc,C){
    var tgt=[0,0,0];
    for(var i=0;i<pc.st.length;i++){ var s=pc.st[i]; if(!eq(s.n,C[s.c])) return false; tgt=add(tgt,C[s.c]); }
    return eq(pc.st[0].p,tgt);
  }
  function has(pc,c){ return pc.key.indexOf(c)>=0; }
  function pname(pc){ return pc.st.map(function(s){return s.c;}).sort(function(a,b){ return a===W?-1:b===W?1:a===Y?-1:b===Y?1:0; }).map(function(c){return COLOR_NAME[c];}).join('·'); }

  var SIDES_OF=function(u){ var out=[]; [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].forEach(function(v){ if(dot(v,u)===0) out.push(v); }); return out; };

  // 단계별 조각 목록
  function groups(st,C){
    var ps=pieces(st);
    return {
      crossE: ps.filter(function(p){return p.st.length===2&&has(p,W);}),
      whiteC: ps.filter(function(p){return p.st.length===3&&has(p,W);}),
      midE:   ps.filter(function(p){return p.st.length===2&&!has(p,W)&&!has(p,Y);}),
      yelE:   ps.filter(function(p){return p.st.length===2&&has(p,Y);}),
      yelC:   ps.filter(function(p){return p.st.length===3&&has(p,Y);})
    };
  }
  function headlights(st,C,u){
    var res=[];
    SIDES_OF(u).forEach(function(s){
      var t=cross(u,s), a=add(add(u,s),t), b=add(add(u,s),neg(t)), ca=null, cb=null;
      st.forEach(function(x){ if(eq(x.p,a)&&eq(x.n,s)) ca=x.c; if(eq(x.p,b)&&eq(x.n,s)) cb=x.c; });
      if(ca&&ca===cb) res.push(s);
    });
    return res;
  }
  function stageOf(st,base){
    if(base) setBase(base);
    var C=centers(st), u=C[Y], g=groups(st,C);
    var solved=function(p){return pieceSolved(p,C);};
    if(!g.crossE.every(solved)) return 1;
    if(!g.whiteC.every(solved)) return 2;
    if(!g.midE.every(solved)) return 3;
    var yUp=function(p){ return p.st.some(function(s){return s.c===Y&&eq(s.n,u);}); };
    if(!g.yelE.every(yUp)) return 4;
    if(!g.yelC.every(yUp)) return 5;
    if(headlights(st,C,u).length<4) return 6;
    if(!g.yelC.every(solved)||!g.yelE.every(solved)) return 7;
    return 8; // 완성
  }

  // --- 십자 단계: 작은 IDA* 탐색 ---
  var MOVES=[]; [0,1,2].forEach(function(ax){ [-1,1].forEach(function(l){ [1,2,3].forEach(function(q){ MOVES.push({ax:ax,layer:l,q:q}); }); }); });
  function pkey(ss){ return ss.map(function(s){return s.p.join(',')+'/'+s.n.join(',');}).join('|'); }
  function distTable(pc,C){
    var start=pc.st.map(function(s){ var p=[0,0,0]; pc.st.forEach(function(x){p=add(p,C[x.c]);}); return {p:p,n:C[s.c].slice(),c:s.c}; });
    var T={}; T[pkey(start)]=0; var fr=[start], d=0;
    while(fr.length){ var nx=[]; d++;
      fr.forEach(function(ss){ MOVES.forEach(function(m){ var ns=apply(clone(ss),m), k=pkey(ns); if(T[k]===undefined){ T[k]=d; nx.push(ns); } }); });
      fr=nx; }
    return T;
  }
  // opt.strict: 이미 맞춘 조각(tracked[1..])은 매 수마다 제자리 유지
  // opt.ban: 이 면은 돌리지 않음 (흰 십자가 있는 아래면)
  function ida(tracked,C,maxDepth,budget,opt){
    opt=opt||{};
    var tables=tracked.map(function(ss){ return distTable({st:ss},C); });
    var nodes=0, path=[];
    function h(state){ var m=0; for(var i=0;i<state.length;i++){ var v=tables[i][pkey(state[i])]; if(v>m) m=v; } return m; }
    function dfs(state,g,bound,lax,llay){
      var hv=h(state); if(hv===0) return true; if(g+hv>bound) return false; if(++nodes>budget) return false;
      for(var i=0;i<MOVES.length;i++){ var m=MOVES[i];
        if(m.ax===lax&&(m.layer===llay||m.layer<llay)) continue;
        if(opt.ban&&m.ax===opt.ban.ax&&m.layer===opt.ban.layer) continue;
        var ns=state.map(function(ss){ return apply(clone(ss),m); });
        if(opt.strict){ var bad=false; for(var j=1;j<ns.length;j++) if(tables[j][pkey(ns[j])]!==0){ bad=true; break; } if(bad) continue; }
        path.push(m); if(dfs(ns,g+1,bound,m.ax,m.layer)) return true; path.pop();
      }
      return false;
    }
    for(var b=h(tracked);b<=maxDepth;b++){ path=[]; if(dfs(tracked,0,b,-1,9)) return path.slice(); if(nodes>budget) break; }
    return null;
  }

  function sideFront(u,pref,test){ // test(f) 만족하는 앞면 찾기, 없으면 pref
    var sides=SIDES_OF(u);
    if(pref){ sides.sort(function(a,b){ return dot(b,pref)-dot(a,pref); }); }
    for(var i=0;i<sides.length;i++) if(!test||test(sides[i])) return sides[i];
    return null;
  }
  function uTurnsTo(st,u,check){ // U를 k번 돌려 check(상태) 만족시키기
    for(var k=0;k<4;k++){
      var ms=k===0?[]:[faceMove(u,k===3?-1:k)];
      if(check(applyAll(clone(st),ms))) return ms;
    }
    return null;
  }

  // 메인: 다음 힌트 계획
  // pref: 화면 정면에 가까운 방향 (공식 기준 앞면으로 우선 사용)
  function plan(st,pref,base){
    setBase(base);
    var C=centers(st), u=C[Y], stage=stageOf(st);
    if(stage===8) return {stage:8,label:'이미 완성됐어요',moves:[]};
    var g=groups(st,C), best=null;
    // 위층에 있어서 바로 넣을 수 있는 조각을 먼저, 없을 때만 꺼내기
    var consider=function(p){ if(!p) return; var rank=function(x){return (x.extract?1000:0)+(x.tier||0)*100+x.moves.length;}; if(!best||rank(p)<rank(best)) best=p; };

    if(stage===1){
      var done=g.crossE.filter(function(p){return pieceSolved(p,C);});
      // 흰색은 모두 아래를 보는데 옆 색이 센터와 안 맞는 '가짜 십자'
      var fake=g.crossE.every(function(p){ return p.st.some(function(x){ return x.c===W&&eq(x.n,neg(u)); }); });
      if(fake){ // 아래 면만 돌리면 4개가 다 맞는 경우
        var dm=uTurnsTo(st,neg(u),function(s2){ var C2=centers(s2); return groups(s2,C2).crossE.every(function(p){return pieceSolved(p,C2);}); });
        if(dm&&dm.length) return {stage:1,label:ADJ[W]+' 십자 모양은 됐어요! '+ADJ[W]+' 면을 돌려 옆 색을 센터에 맞추기',moves:dm};
      }
      g.crossE.filter(function(p){return !pieceSolved(p,C);}).forEach(function(p){
        var tracked=[p.st].concat(done.map(function(d){return d.st;}));
        // 1순위: 맞춘 조각을 전혀 안 건드리기 → 2순위: 아래면은 안 돌리기(잠깐 비켰다 복귀) → 마지막: 제한 없음
        var down=neg(u), ban={ax:axOf(down),layer:down[axOf(down)]}, ms=null, tier=0;
        var tries=[{strict:true,ban:ban,d:6,b:12000},{ban:ban,d:8,b:25000},{d:9,b:40000}];
        for(var t=0;t<tries.length&&!ms;t++){ tier=t; ms=ida(tracked.map(function(ss){return clone(ss);}),C,tries[t].d,tries[t].b,tries[t]); }
        if(ms) consider({stage:1,target:p.key,tier:tier,label:fake?(pname(p)+' 조각 옆 색을 센터에 맞추기 ('+ADJ[W]+' 십자 모양은 됐지만 옆 색이 달라요)'):(pname(p)+' 조각을 '+ADJ[W]+' 십자 자리에 넣기'),moves:ms});
      });
      return best;
    }
    if(stage===2){
      g.whiteC.filter(function(p){return !pieceSolved(p,C);}).forEach(function(p){
        var pos=p.st[0].p, cols=p.st.filter(function(s){return s.c!==W;}).map(function(s){return s.c;});
        if(dot(pos,u)<0){ // 아래층에 잘못 들어간 코너 → 위로 꺼내기
          var sides=SIDES_OF(u).filter(function(s){return dot(s,pos)>0;});
          var f=dot(cross(u,sides[0]),sides[1])>0?sides[0]:sides[1];
          consider({stage:2,target:p.key,extract:true,label:pname(p)+' 코너를 '+ADJ[Y]+' 쪽 층으로 꺼내기',moves:alg("R U R' U'",u,f)});
          return;
        }
        var a=C[cols[0]], b=C[cols[1]], tgt=add(add(u,a),b);
        var setup=uTurnsTo(st,u,function(s2){ return eq(findPiece(s2,p.key).st[0].p,tgt); });
        if(!setup) return;
        var f2=dot(cross(u,a),b)>0?a:b, unit=alg("R U R' U'",u,f2), ms=setup.slice(), s3=applyAll(clone(st),setup);
        for(var k=0;k<6;k++){ applyAll(s3,unit); ms=ms.concat(unit); if(pieceSolved(findPiece(s3,p.key),C)) break; }
        consider({stage:2,target:p.key,label:pname(p)+' 코너를 '+ADJ[W]+' 면에 넣기',moves:ms});
      });
      return best;
    }
    if(stage===3){
      g.midE.filter(function(p){return !pieceSolved(p,C);}).forEach(function(p){
        var pos=p.st[0].p;
        if(dot(pos,u)===0){ // 가운데 층에 잘못 끼어 있음 → 꺼내기
          var sides=p.st.map(function(s){return s.n;});
          sides=SIDES_OF(u).filter(function(s){return dot(s,pos)>0;});
          var f=dot(cross(u,sides[0]),sides[1])>0?sides[0]:sides[1];
          consider({stage:3,target:p.key,extract:true,label:pname(p)+' 조각을 '+ADJ[Y]+' 쪽 층으로 꺼내기',moves:alg("U R U' R' U' F' U F",u,f)});
          return;
        }
        var side=p.st.filter(function(s){return !eq(s.n,u);})[0], top=p.st.filter(function(s){return eq(s.n,u);})[0];
        var f=C[side.c];
        var setup=uTurnsTo(st,u,function(s2){ return eq(findPiece(s2,p.key).st[0].p,add(u,f)); });
        if(!setup) return;
        var right=eq(C[top.c],cross(u,f));
        var ms=setup.concat(alg(right?"U R U' R' U' F' U F":"U' L' U L U F U' F'",u,f));
        consider({stage:3,target:p.key,label:pname(p)+' 조각을 가운데 층 '+(right?'오른쪽':'왼쪽')+'에 넣기',moves:ms});
      });
      return best;
    }
    if(stage===4){
      var up=g.yelE.filter(function(p){return p.st.some(function(s){return s.c===Y&&eq(s.n,u);});}).map(function(p){return add(p.st[0].p,neg(u));});
      var f=null;
      if(up.length===2&&eq(up[0],neg(up[1]))) f=sideFront(u,pref,function(f){ return dot(up[0],f)===0; });
      else if(up.length===2) f=sideFront(u,pref,function(f){ var r=cross(u,f); return up.some(function(d){return eq(d,neg(f));})&&up.some(function(d){return eq(d,neg(r));}); });
      if(!f) f=sideFront(u,pref);
      var shape=up.length===0?'점':(up.length===2&&eq(up[0],neg(up[1]))?'일자':'ㄱ자');
      return {stage:4,label:ADJ[Y]+' 십자 공식 ('+shape+' 모양)',moves:alg("F R U R' U' F'",u,f)};
    }
    if(stage===5){
      var yc=g.yelC.map(function(p){ var ys=p.st.filter(function(s){return s.c===Y;})[0]; return {p:p.st[0].p,n:ys.n}; });
      var cnt=yc.filter(function(x){return eq(x.n,u);}).length;
      var f=sideFront(u,pref,function(f){
        var l=neg(cross(u,f)), pos=add(add(u,f),l), c=yc.filter(function(x){return eq(x.p,pos);})[0];
        if(!c) return false;
        if(cnt===1) return eq(c.n,u);
        if(cnt===0) return eq(c.n,l);
        return eq(c.n,f);
      })||sideFront(u,pref);
      return {stage:5,label:ADJ[Y]+' 면 공식 ('+ADJ[Y]+' 코너 '+cnt+'개)',moves:alg("R U R' U R U2 R'",u,f)};
    }
    if(stage===6){
      var hl=headlights(st,C,u);
      var f=hl.length?neg(hl[0]):sideFront(u,pref);
      if(hl.length){ var f0=sideFront(u,pref,function(f){ return hl.some(function(s){return eq(s,neg(f));}); }); if(f0) f=f0; }
      return {stage:6,label:hl.length?'헤드라이트를 뒤에 두고 코너 공식':'코너 공식 한 번 (헤드라이트 만들기)',moves:alg("R' F R' B2 R F' R' B2 R2",u,f)};
    }
    if(stage===7){
      var cornersOk=g.yelC.every(function(p){return pieceSolved(p,C);});
      if(!cornersOk){
        var ms=uTurnsTo(st,u,function(s2){ var C2=centers(s2); return groups(s2,C2).yelC.every(function(p){return pieceSolved(p,C2);}); });
        if(ms&&ms.length) return {stage:7,label:ADJ[Y]+' 면을 돌려 코너 맞추기',moves:ms};
      }
      var solvedSides=SIDES_OF(u).filter(function(s){ var pos=add(u,s); return st.some(function(x){ return eq(x.p,pos)&&eq(x.n,s)&&eq(C[x.c],s); }); });
      var f=solvedSides.length?(sideFront(u,pref,function(f){ return solvedSides.some(function(s){return eq(s,neg(f));}); })):sideFront(u,pref);
      return {stage:7,label:solvedSides.length?'맞은 면을 뒤에 두고 마무리 공식':'마무리 공식 한 번',moves:alg("R U' R U R U R U' R' U' R2",u,f)};
    }
    return null;
  }
  function progress(st,base){
    if(base) setBase(base);
    var C=centers(st), u=C[Y], g=groups(st,C), s=stageOf(st);
    var solved=function(p){return pieceSolved(p,C);};
    var yUp=function(p){ return p.st.some(function(x){return x.c===Y&&eq(x.n,u);}); };
    var cnt={1:g.crossE.filter(solved).length,2:g.whiteC.filter(solved).length,3:g.midE.filter(solved).length,
      4:g.yelE.filter(yUp).length,5:g.yelC.filter(yUp).length,6:headlights(st,C,u).length,7:g.yelE.filter(solved).length};
    return {stage:s,done:cnt[s]||0,total:4};
  }
  function stageName(s,base){
    var w=ADJ[base||'D'], y=ADJ[OPP[base||'D']];
    return {1:'1단계 '+w+' 십자',2:'2단계 '+w+' 코너',3:'3단계 가운데 층',4:'4단계 '+y+' 십자',5:'5단계 '+y+' 면',6:'6단계 코너 위치',7:'7단계 마무리',8:'완성'}[s];
  }
  var STAGE_NAME={1:stageName(1),2:stageName(2),3:stageName(3),4:stageName(4),5:stageName(5),6:stageName(6),7:stageName(7),8:'완성'};
  // 사용자가 어느 색부터 맞추고 있는지: 진행이 가장 많은 색을 기준 면으로 (같으면 흰색)
  function bestBase(st){
    var score=function(b){ setBase(b); var sg=stageOf(st); return sg*10+(sg<8?progress(st).done:0); };
    // 흰색이 기본. 다른 색이 조각 2개 이상 더 맞춰져 있거나 단계가 앞서 있을 때만 그 색으로
    var best='D', bs=score('D')+1;
    ['U','R','L','F','B'].forEach(function(b){ var sc=score(b); if(sc>bs){ bs=sc; best=b; } });
    setBase('D'); return best;
  }
  return {OPP:OPP,ADJ:ADJ,plan:plan,stageOf:stageOf,progress:progress,bestBase:bestBase,stageName:stageName,apply:apply,applyAll:applyAll,clone:clone,centers:centers,pieces:pieces,pieceSolved:pieceSolved,STAGE_NAME:STAGE_NAME};
})();
if(typeof module!=='undefined') module.exports=HintEngine;
