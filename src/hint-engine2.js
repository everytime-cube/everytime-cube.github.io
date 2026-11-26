// ---------- 2×2 조각 단위 힌트 엔진 ----------
// 2×2는 가운데 조각이 없어서, 흰 코너 하나를 "기준 조각"으로 정하고 그 조각의 색 방향으로 각 면의 색을 정한다.
// 기준 조각을 움직이지 않는 세 면만 돌리므로 기준이 끝까지 유지된다.
// 좌표: 화면의 ±0.5를 2배 한 ±1 (3×3 엔진과 같은 스티커 형식 {p, n, c})
// 단계: 1 흰 면(첫 층) → 2 노란 면 → 3 코너 위치 → 4 마무리 → 5 완성
var HintEngine2=(function(){
  var W='D', Y='U';
  var OPP={U:'D',D:'U',R:'L',L:'R',F:'B',B:'F'};
  var NAME={U:'노랑',D:'흰',R:'주황',L:'빨강',F:'초록',B:'파랑'};
  function rotV(v,ax,q){ var x=v[0],y=v[1],z=v[2],t; for(var i=0;i<q;i++){ if(ax===0){t=y;y=-z;z=t;} else if(ax===1){t=x;x=z;z=-t;} else {t=x;x=-y;y=t;} } return [x,y,z]; }
  function eq(a,b){ return a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2]; }
  function add(a,b){ return [a[0]+b[0],a[1]+b[1],a[2]+b[2]]; }
  function neg(a){ return [-a[0],-a[1],-a[2]]; }
  function cross(a,b){ return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }
  function dot(a,b){ return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
  function axOf(n){ return n[0]?0:(n[1]?1:2); }
  function clone(st){ return st.map(function(s){ return {p:s.p.slice(),n:s.n.slice(),c:s.c}; }); }
  function apply(st,m){ for(var i=0;i<st.length;i++){ var s=st[i]; if(s.p[m.ax]===m.layer){ s.p=rotV(s.p,m.ax,m.q); s.n=rotV(s.n,m.ax,m.q); } } return st; }
  function applyAll(st,ms){ for(var i=0;i<ms.length;i++) apply(st,ms[i]); return st; }
  function faceMove(n,t){ var ax=axOf(n), sg=n[ax], dir=-sg*t; return {ax:ax,layer:sg,q:((dir%4)+4)%4}; }
  function alg(str,u,f){
    var r=cross(u,f), F={U:u,D:neg(u),F:f,B:neg(f),R:r,L:neg(r)};
    return str.split(' ').map(function(tk){ var t=tk.indexOf('2')>=0?2:(tk.indexOf("'")>=0?-1:1); return faceMove(F[tk[0]],t); });
  }
  function pieces(st){
    var m={};
    st.forEach(function(s){ var k=s.p.join(','); (m[k]=m[k]||[]).push(s); });
    return Object.keys(m).map(function(k){ var ss=m[k]; return {key:ss.map(function(s){return s.c;}).sort().join(''),st:ss}; });
  }
  function findPiece(st,key){ var ps=pieces(st); for(var i=0;i<ps.length;i++) if(ps[i].key===key) return ps[i]; return null; }
  // 기준 조각으로 "각 색이 있어야 할 면 방향" 만들기
  function colorDirs(ref){
    var C={};
    ref.st.forEach(function(s){ C[s.c]=s.n.slice(); C[OPP[s.c]]=neg(s.n); });
    return C;
  }
  function solvedIn(pc,C){
    var tgt=[0,0,0];
    for(var i=0;i<pc.st.length;i++){ var s=pc.st[i]; if(!eq(s.n,C[s.c])) return false; tgt=add(tgt,C[s.c]); }
    return eq(pc.st[0].p,tgt);
  }
  function has(pc,c){ return pc.key.indexOf(c)>=0; }
  function pname(pc){ return pc.st.map(function(s){return s.c;}).sort(function(a,b){ return a===W?-1:b===W?1:a===Y?-1:b===Y?1:0; }).map(function(c){return NAME[c];}).join('·'); }
  // 기준 조각: 흰 코너 중 함께 맞아 있는 흰 코너가 가장 많은 것
  function chooseRef(st){
    var ps=pieces(st), whites=ps.filter(function(p){return has(p,W);}), best=null, bs=-1;
    whites.forEach(function(r){ var C=colorDirs(r), n=whites.filter(function(p){return solvedIn(p,C);}).length; if(n>bs){ bs=n; best=r; } });
    return best;
  }
  function frameOf(st){
    var ref=chooseRef(st), C=colorDirs(ref), u=C[Y];
    // 기준 조각을 안 건드리는 면들 (기준 조각 좌표의 반대쪽 줄)
    var p=ref.st[0].p, free=[0,1,2].map(function(ax){ return {ax:ax,layer:-p[ax]}; });
    // 공식 기준 앞면: 기준 조각이 왼쪽 뒤 아래(D·L·B)에 오도록
    var f=null;
    [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].forEach(function(v){ if(dot(v,u)!==0||f) return; var r=cross(u,v); if(eq(p,add(add(neg(u),neg(r)),neg(v)))) f=v; });
    return {ref:ref,C:C,u:u,f:f,free:free};
  }
  function stageOf(st){
    var fr=frameOf(st), C=fr.C, u=fr.u, ps=pieces(st);
    if(!ps.filter(function(p){return has(p,W);}).every(function(p){return solvedIn(p,C);})) return 1;
    var yel=ps.filter(function(p){return has(p,Y);});
    if(!yel.every(function(p){ return p.st.some(function(s){ return s.c===Y&&eq(s.n,u); }); })) return 2;
    if(headlights(st,u).length<4) return 3;
    if(!yel.every(function(p){return solvedIn(p,C);})) return 4;
    return 5;
  }
  function headlights(st,u){
    var res=[];
    [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].forEach(function(s){
      if(dot(s,u)!==0) return;
      var t=cross(u,s), a=add(add(u,s),t), b=add(add(u,s),neg(t)), ca=null, cb=null;
      st.forEach(function(x){ if(eq(x.p,a)&&eq(x.n,s)) ca=x.c; if(eq(x.p,b)&&eq(x.n,s)) cb=x.c; });
      if(ca&&ca===cb) res.push(s);
    });
    return res;
  }
  // --- 1단계: 흰 코너 하나씩 (작은 IDA*, 기준을 안 건드리는 세 면만) ---
  function pkey(ss){ return ss.map(function(s){return s.p.join(',')+'/'+s.n.join(',');}).join('|'); }
  function distTable(ss,C,moves){
    var start=ss.map(function(s){ var p=[0,0,0]; ss.forEach(function(x){p=add(p,C[x.c]);}); return {p:p,n:C[s.c].slice(),c:s.c}; });
    var T={}; T[pkey(start)]=0; var fr=[start], d=0;
    while(fr.length){ var nx=[]; d++; fr.forEach(function(x){ moves.forEach(function(m){ var ns=apply(clone(x),m), k=pkey(ns); if(T[k]===undefined){ T[k]=d; nx.push(ns); } }); }); fr=nx; }
    return T;
  }
  function ida(tracked,C,moves,maxDepth,strict,budget){
    var tables=tracked.map(function(ss){ return distTable(ss,C,moves); }), nodes=0, path=[];
    function h(state){ var m=0; for(var i=0;i<state.length;i++){ var v=tables[i][pkey(state[i])]; if(v===undefined) v=99; if(v>m) m=v; } return m; }
    function dfs(state,g,bound,lax){
      var hv=h(state); if(hv===0) return true; if(g+hv>bound) return false; if(++nodes>budget) return false;
      for(var i=0;i<moves.length;i++){ var m=moves[i]; if(m.ax===lax) continue;
        var ns=state.map(function(ss){ return apply(clone(ss),m); });
        if(strict){ var bad=false; for(var j=1;j<ns.length;j++) if(tables[j][pkey(ns[j])]!==0){ bad=true; break; } if(bad) continue; }
        path.push(m); if(dfs(ns,g+1,bound,m.ax)) return true; path.pop(); }
      return false;
    }
    for(var b=h(tracked);b<=maxDepth;b++){ path=[]; if(dfs(tracked,0,b,-1)) return path.slice(); if(nodes>budget) break; }
    return null;
  }
  function uTurns(st,u,check){
    for(var k=0;k<4;k++){ var ms=k===0?[]:[faceMove(u,k===3?-1:k)]; if(check(applyAll(clone(st),ms))) return ms; }
    return null;
  }
  var SUNE="R U R' U R U2 R'", T_PERM="R U R' U' R' F R2 U' R' U' R U R' F'", Y_PERM="F R U' R' U' R U R' F' R U R' U' R' F R F'";
  function plan(st){
    var fr=frameOf(st), C=fr.C, u=fr.u, f=fr.f, stage=stageOf(st), ps=pieces(st);
    var res={stage:stage,showUp:stage===1?neg(u):u};
    if(stage===5){ res.label='이미 완성됐어요'; res.moves=[]; return res; }
    if(stage===1){
      var moves=[]; fr.free.forEach(function(m){ [1,2,3].forEach(function(q){ moves.push({ax:m.ax,layer:m.layer,q:q}); }); });
      var whites=ps.filter(function(p){return has(p,W);}), done=whites.filter(function(p){return solvedIn(p,C);}), best=null;
      whites.filter(function(p){return !solvedIn(p,C);}).forEach(function(p){
        var tracked=[p.st].concat(done.map(function(d){return d.st;})).map(function(ss){return clone(ss);});
        var ms=ida(tracked,C,moves,7,true,20000), tier=0;
        if(!ms){ tier=1; ms=ida(tracked.map(function(ss){return clone(ss);}),C,moves,9,false,60000); }
        if(ms&&(!best||tier*100+ms.length<best.tier*100+best.moves.length)) best={tier:tier,moves:ms,label:pname(p)+' 코너를 흰 면에 넣기'};
      });
      if(!best) return null;
      res.label=best.label; res.moves=best.moves; return res;
    }
    if(stage===2){
      // 노란 코너가 위를 보는 개수에 따라 윗면을 돌려 놓고 공식 (3×3 5단계와 같은 규칙), 안 맞으면 해 보고 고른다
      var yel=ps.filter(function(p){return has(p,Y);}).map(function(p){ var ys=p.st.filter(function(s){return s.c===Y;})[0]; return {p:p.st[0].p,n:ys.n}; });
      var cnt=yel.filter(function(x){return eq(x.n,u);}).length, l=neg(cross(u,f)), fl=add(add(u,f),l);
      var rule=function(s2){
        var c=null; s2.forEach(function(x){ if(x.c===Y&&eq(x.p,fl)) c=x; });
        if(!c) return false;
        if(cnt===1) return eq(c.n,u); if(cnt===0) return eq(c.n,l); return eq(c.n,f);
      };
      var setup=uTurns(st,u,rule)||[];
      res.label='노란 면 공식 (노란 면이 위로 '+cnt+'개)'; res.moves=setup.concat(alg(SUNE,u,f)); return res;
    }
    if(stage===3){
      var best3=null;
      [T_PERM,Y_PERM].forEach(function(a,ai){ for(var k=0;k<4;k++){
        var ms=(k===0?[]:[faceMove(u,k===3?-1:k)]).concat(alg(a,u,f));
        if(headlights(applyAll(clone(st),ms),u).length===4&&(!best3||ms.length<best3.moves.length)) best3={moves:ms,label:ai===0?'옆 코너 두 개 바꾸기':'대각선 코너 두 개 바꾸기'};
      } });
      if(!best3) best3={moves:alg(T_PERM,u,f),label:'코너 바꾸기 공식'};
      res.label=best3.label; res.moves=best3.moves; return res;
    }
    var ms4=uTurns(st,u,function(s2){ return stageOf(s2)===5; })||[];
    res.label='노란 면을 돌려 마무리'; res.moves=ms4; return res;
  }
  function progress(st){
    var fr=frameOf(st), s=stageOf(st), ps=pieces(st);
    var done=s===1?ps.filter(function(p){return has(p,W)&&solvedIn(p,fr.C);}).length:0;
    return {stage:s,done:done,total:4};
  }
  var STAGE_NAME={1:'1단계 흰 면',2:'2단계 노란 면',3:'3단계 코너 위치',4:'4단계 마무리',5:'완성'};
  return {plan:plan,stageOf:stageOf,progress:progress,apply:apply,applyAll:applyAll,clone:clone,STAGE_NAME:STAGE_NAME};
})();
if(typeof module!=='undefined') module.exports=HintEngine2;
