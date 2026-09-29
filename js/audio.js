// Déblocage du son sur iPhone, partagé par les séances (app.js) et le chrono libre (chrono.js).
// iOS coupe l'audio des web apps quand le bouton silencieux est activé, et le met en veille
// quand l'app passe en arrière-plan : on passe la session audio en mode « lecture »
// et on relance le contexte audio à chaque appui sur Démarrer / GO.
(function(){
  "use strict";

  // Court fichier WAV silencieux, joué une fois pendant l'appui (anciens iOS sans audioSession).
  var silentUrl = null;
  function makeSilentWav(){
    var n = 2000, buf = new ArrayBuffer(44 + n), v = new DataView(buf), i;
    function str(o, s){ for(i=0;i<s.length;i++) v.setUint8(o+i, s.charCodeAt(i)); }
    str(0, "RIFF"); v.setUint32(4, 36 + n, true); str(8, "WAVE");
    str(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    str(36, "data"); v.setUint32(40, n, true);
    for(i=0;i<n;i++) v.setUint8(44+i, 128);
    return URL.createObjectURL(new Blob([buf], {type:"audio/wav"}));
  }

  var silentPlayed = false;
  function unlock(ctx){
    try{
      if(navigator.audioSession && navigator.audioSession.type !== "playback"){
        navigator.audioSession.type = "playback";
      } else if(!navigator.audioSession && !silentPlayed){
        if(!silentUrl) silentUrl = makeSilentWav();
        var a = new Audio(silentUrl);
        a.setAttribute("playsinline", "");
        var p = a.play();
        if(p && p.catch) p.catch(function(){});
        silentPlayed = true;
      }
    }catch(e){}
    resume(ctx);
  }

  function resume(ctx){
    try{ if(ctx && ctx.state !== "running") ctx.resume(); }catch(e){}
  }

  // Le bip unique de l'app : sinus 880 Hz, 90 ms (celui des 3 dernières secondes).
  function bip(ctx, delay){
    if(!ctx) return;
    try{
      var t0 = ctx.currentTime + (delay||0);
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.15, t0+0.02);
      gain.gain.linearRampToValueAtTime(0, t0+0.09);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0+0.11);
    }catch(e){}
  }

  // Une bulle : sinus dont la fréquence monte vite (la bulle rétrécit en remontant).
  function bubble(ctx, t0, f0, f1, dur, vol, lowpass){
    var osc = ctx.createOscillator(), gain = ctx.createGain(), out = gain;
    osc.type = "sine";
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    if(lowpass){
      var f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = lowpass; f.Q.value = 0.7;
      gain.connect(f); out = f;
    }
    out.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // Son de fin d'exercice : grosse bulle grave, étouffée comme sous l'eau, puis deux petites bulles.
  function finBulles(ctx){
    if(!ctx) return;
    try{
      var t = ctx.currentTime + 0.03;
      bubble(ctx, t, 150, 520, 0.45, 0.42, 1400);
      bubble(ctx, t + 0.38, 480, 1200, 0.13, 0.18);
      bubble(ctx, t + 0.52, 640, 1500, 0.11, 0.14);
    }catch(e){}
  }

  window.ApneeAudio = { unlock: unlock, resume: resume, bip: bip, finBulles: finBulles };
})();
