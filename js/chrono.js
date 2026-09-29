(function(){
  "use strict";
  var CX=200, CY=200;
  var BLUE=[53,167,255], WHITE=[242,244,247], GRAY=[92,100,112];

  function polar(cx,cy,r,deg){
    var a=deg*Math.PI/180;
    return [cx+r*Math.sin(a), cy-r*Math.cos(a)];
  }
  function tick(r1,r2,deg,cls){
    var p1=polar(CX,CY,r1,deg), p2=polar(CX,CY,r2,deg);
    return '<line class="'+cls+'" x1="'+p1[0].toFixed(2)+'" y1="'+p1[1].toFixed(2)+'" x2="'+p2[0].toFixed(2)+'" y2="'+p2[1].toFixed(2)+'"/>';
  }
  function mix(a,b,f){
    return "rgb("+Math.round(a[0]+(b[0]-a[0])*f)+","+Math.round(a[1]+(b[1]-a[1])*f)+","+Math.round(a[2]+(b[2]-a[2])*f)+")";
  }

  // 240 graduations (quart de seconde), une par seconde plus longue, une blanche toutes les 5 s.
  var t="", i, tickAngles=[], tickBases=[];
  for(i=0;i<240;i++){
    var deg=i*1.5;
    tickAngles.push(deg);
    if(i%20===0){ t+=tick(192,172,deg,"chr-t-major"); tickBases.push(WHITE); }
    else if(i%4===0){ t+=tick(192,178,deg,"chr-t-sec"); tickBases.push(GRAY); }
    else{ t+=tick(192,184,deg,"chr-t-fine"); tickBases.push(GRAY); }
  }
  document.getElementById("chrTicks").innerHTML=t;

  // Chiffres rangés par angle : 60 en haut, puis 5, 10 ... 55. Un second jeu, bleu, est découpé par l'aiguille.
  var n="";
  for(i=0;i<12;i++){
    var ang=i*30, p=polar(CX,CY,146,ang);
    n+='<text class="chr-n-main" x="'+p[0].toFixed(2)+'" y="'+p[1].toFixed(2)+'" dy=".35em">'+(i===0?60:i*5)+'</text>';
  }
  document.getElementById("chrNums").innerHTML=n;
  document.getElementById("chrNumsBlue").innerHTML=n;

  var tickEls=[].slice.call(document.querySelectorAll("#chrTicks line"));
  function makeSweep(els,angles,bases,prop,lead,span){
    var doneIdx=0, startedIdx=0;
    function f(k,angle){ return Math.max(0,Math.min(1,(angle-(angles[k]-lead))/span)); }
    return {
      reset:function(){
        for(var k=0;k<startedIdx;k++){ els[k].style[prop]=""; }
        doneIdx=0; startedIdx=0;
      },
      update:function(angle){
        while(startedIdx<els.length && f(startedIdx,angle)>0){ startedIdx++; }
        for(var k=doneIdx;k<startedIdx;k++){
          els[k].style[prop]=mix(bases[k],BLUE,f(k,angle));
        }
        while(doneIdx<startedIdx && f(doneIdx,angle)>=1){ doneIdx++; }
      }
    };
  }
  var tickSweep=makeSweep(tickEls,tickAngles,tickBases,"stroke",4.5,9);

  // Repères de minutes : 12 points blancs, la minute écoulée la plus récente devient un chiffre jaune gras.
  var minEl=document.getElementById("chrMinMarks");
  var lastMin=-1;
  function renderMinMarks(m){
    if(m===lastMin) return;
    lastMin=m;
    var s="", idx, q;
    var active=m>0 ? (m-1)%12 : -1;
    for(idx=0;idx<12;idx++){
      q=polar(CX,CY,100,idx*30);
      if(idx===active){
        s+='<text class="chr-min-num" x="'+q[0].toFixed(2)+'" y="'+q[1].toFixed(2)+'" dy=".35em">'+m+'</text>';
      }else{
        s+='<circle class="chr-min-dot" cx="'+q[0].toFixed(2)+'" cy="'+q[1].toFixed(2)+'" r="2.8"/>';
      }
    }
    minEl.innerHTML=s;
  }

  // ---------- état ----------
  var running=false, stopped=false, startTs=0, elapsedMs=0, lastAngle=0, raf=null, wake=null;
  function nowElapsed(){ return running ? performance.now()-startTs : elapsedMs; }

  var sweepPath=document.getElementById("chrSweepPath");
  function wedge(angle){
    if(angle<=0.3) return "";
    if(angle>=359.5) return "M200,0 A200,200 0 1 1 200,400 A200,200 0 1 1 200,0 Z";
    var p0=polar(CX,CY,200,0), p1=polar(CX,CY,200,angle);
    return "M"+CX+","+CY+" L"+p0[0].toFixed(2)+","+p0[1].toFixed(2)+" A200,200 0 "+(angle>180?1:0)+" 1 "+p1[0].toFixed(2)+","+p1[1].toFixed(2)+" Z";
  }

  var handEl=document.getElementById("chrHand");
  var goBtn=document.getElementById("chrGoBtn");
  var resultEl=document.getElementById("chrResult");
  var bestEl=document.getElementById("chrBest");

  function fmtSeconds(ms){
    var total=Math.floor(ms/1000);
    var h=Math.floor(total/3600), m=Math.floor(total/60)%60, sec=total%60;
    function two(x){ return x<10 ? "0"+x : String(x); }
    return (h>0 ? h+":" : "")+two(m)+":"+two(sec);
  }

  // Record : le temps le plus long, mémorisé avec sa date.
  var BEST_KEY="apnee.v1.chrono-record";
  var best=null;
  try{ var raw=localStorage.getItem(BEST_KEY); if(raw){ best=JSON.parse(raw); } }catch(e){ best=null; }
  function fmtDate(iso){
    try{ return new Date(iso).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}); }
    catch(e){ return iso; }
  }
  var editBtn=document.getElementById("chrEditBtn");
  function renderBest(){
    bestEl.innerHTML=best ? 'Record <strong class="chr-rec">'+fmtSeconds(best.ms)+"</strong> · "+fmtDate(best.date) : "Aucun record enregistré";
    editBtn.textContent=best ? "Modifier" : "Définir";
  }
  function persistBest(){
    try{ localStorage.setItem(BEST_KEY,JSON.stringify(best)); }catch(e){}
  }
  function saveBest(ms){
    if(Math.floor(ms/1000)<1) return;
    if(!best || Math.floor(ms/1000)>Math.floor(best.ms/1000)){
      best={ms:ms,date:new Date().toISOString()};
      persistBest();
      renderBest();
    }
  }

  function paint(){
    var e=nowElapsed();
    var angle=(e%60000)/60000*360;
    handEl.setAttribute("transform","rotate("+angle.toFixed(2)+" "+CX+" "+CY+")");
    if(e<=0){
      tickSweep.reset(); lastAngle=0;
      sweepPath.setAttribute("d","");
    }else{
      if(angle<lastAngle-180){ tickSweep.reset(); }
      tickSweep.update(angle);
      lastAngle=angle;
      sweepPath.setAttribute("d",wedge(angle));
    }
    renderMinMarks(Math.floor(e/60000));
  }
  function loop(){
    paint();
    if(running){ raf=requestAnimationFrame(loop); }
  }

  function requestWake(){
    try{
      if("wakeLock" in navigator){
        navigator.wakeLock.request("screen").then(function(w){ wake=w; }).catch(function(){});
      }
    }catch(e){}
  }
  function releaseWake(){
    try{ if(wake){ wake.release(); wake=null; } }catch(e){}
  }

  // ---------- bips sonores : intervalle régulier et/ou temps précis ----------
  var BIPS_KEY="apnee.v1.chrono-bips";
  var bips={times:[]};
  try{
    var rb=localStorage.getItem(BIPS_KEY);
    if(rb){
      var ob=JSON.parse(rb);
      if(ob){
        bips.times=(ob.times||[]).map(Number).filter(function(x){ return x>=1; });
      }
    }
  }catch(e){}
  function saveBips(){ try{ localStorage.setItem(BIPS_KEY,JSON.stringify(bips)); }catch(e){} }

  var actx=null;
  function getCtx(){
    if(!actx){
      try{ actx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){}
    }
    window.ApneeAudio.resume(actx);
    return actx;
  }
  // Même bip que dans le reste de l'appli (voir js/audio.js).
  function beep(){
    window.ApneeAudio.bip(getCtx());
    try{ if(navigator.vibrate) navigator.vibrate(150); }catch(e){}
  }

  var lastBeepMs=0, beepTimer=null;
  function checkBeeps(){
    if(!running) return;
    var e=nowElapsed(), prev=lastBeepMs, fire=false, k;
    lastBeepMs=e;
    for(k=0;k<bips.times.length;k++){
      var T=bips.times[k]*1000;
      if(prev<T && e>=T) fire=true;
    }
    if(fire) beep();
  }
  function startBeeps(){
    window.ApneeAudio.unlock(getCtx()); // débloque le son (iPhone) pendant l'appui sur GO
    lastBeepMs=0;
    if(beepTimer) clearInterval(beepTimer);
    beepTimer=setInterval(checkBeeps,50);
  }
  function stopBeeps(){
    if(beepTimer){ clearInterval(beepTimer); beepTimer=null; }
  }

  var chipsEl=document.getElementById("chrChips");
  var addMin=document.getElementById("chrAddMin");
  var addSec=document.getElementById("chrAddSec");

  function renderBips(){
    chipsEl.innerHTML="";
    bips.times.forEach(function(x){
      var b=document.createElement("button");
      b.type="button";
      b.className="chr-chip";
      b.setAttribute("aria-label","Supprimer le bip à "+fmtSeconds(x*1000));
      b.textContent=fmtSeconds(x*1000)+" ✕";
      b.addEventListener("click",function(){
        bips.times=bips.times.filter(function(y){ return y!==x; });
        saveBips(); renderBips();
      });
      chipsEl.appendChild(b);
    });
  }
  document.getElementById("chrAddBtn").addEventListener("click",function(){
    var m=parseInt(addMin.value,10)||0, sc=parseInt(addSec.value,10)||0;
    var total=m*60+sc;
    if(sc<0 || sc>59 || total<1){ (total<1 ? addMin : addSec).focus(); return; }
    if(bips.times.indexOf(total)===-1 && bips.times.length<30){
      bips.times.push(total);
      bips.times.sort(function(a,b){ return a-b; });
      saveBips();
    }
    addMin.value=""; addSec.value="";
    renderBips();
  });
  renderBips();

  // GO démarre, STOP fige et enregistre, RÉINITIALISER remet tout à zéro.
  goBtn.addEventListener("click",function(){
    if(running){
      elapsedMs=performance.now()-startTs;
      running=false;
      if(raf){ cancelAnimationFrame(raf); raf=null; }
      releaseWake();
      stopBeeps();
      stopped=true;
      goBtn.textContent="RÉINITIALISER"; goBtn.className="chr-btn chr-reset";
      resultEl.textContent=fmtSeconds(elapsedMs);
      saveBest(elapsedMs);
      paint();
    }else if(stopped){
      stopped=false;
      elapsedMs=0;
      resultEl.textContent="";
      goBtn.textContent="GO"; goBtn.className="chr-btn chr-go";
      paint();
    }else{
      elapsedMs=0;
      startTs=performance.now();
      running=true;
      requestWake();
      startBeeps();
      goBtn.textContent="STOP"; goBtn.className="chr-btn chr-stop";
      resultEl.textContent="";
      raf=requestAnimationFrame(loop);
    }
  });

  // Saisie manuelle du record : il est ensuite dépassé automatiquement par tout meilleur résultat.
  var editEl=document.getElementById("chrEdit");
  var minIn=document.getElementById("chrMin");
  var secIn=document.getElementById("chrSec");
  var dateIn=document.getElementById("chrDate");
  function p2(x){ return x<10 ? "0"+x : String(x); }
  function dateStr(d){ return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate()); }
  editBtn.addEventListener("click",function(){
    if(!editEl.hidden){ editEl.hidden=true; return; }
    if(best){
      var total=Math.floor(best.ms/1000);
      minIn.value=Math.floor(total/60);
      secIn.value=total%60;
      dateIn.value=dateStr(new Date(best.date));
    }else{
      minIn.value=""; secIn.value=""; dateIn.value=dateStr(new Date());
    }
    editEl.hidden=false;
  });
  document.getElementById("chrCancel").addEventListener("click",function(){ editEl.hidden=true; });
  document.getElementById("chrSave").addEventListener("click",function(){
    var m=parseInt(minIn.value,10)||0, sc=parseInt(secIn.value,10)||0;
    if(m<0 || sc<0 || sc>59){ secIn.focus(); return; }
    var total=m*60+sc;
    if(total<1){ minIn.focus(); return; }
    var d=dateIn.value ? new Date(dateIn.value+"T12:00:00") : new Date();
    if(isNaN(d.getTime())){ d=new Date(); }
    best={ms:total*1000,date:d.toISOString()};
    persistBest();
    renderBest();
    editEl.hidden=true;
  });

  document.addEventListener("visibilitychange",function(){
    if(!document.hidden && actx) window.ApneeAudio.resume(actx);
  });

  renderBest();
  paint();
})();
