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

  // ---------- Fin d'apnée : son bois (marimba) ----------
  // Bip à 10 s puis 5, 4, 3, 2, 1 s avant la fin : 600 Hz.
  // À 0 s : le même son à 480 Hz, suivi de 7 rebonds de plus en plus faibles et sourds (sonar).
  var BOIS_VOL = 0.3, noiseBuf = null, sonarBus = null, sonarSrc = [];

  // Bruit très court pour la frappe de la mailloche.
  function noise(ctx){
    if(!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate){
      noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.04), ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for(var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
    }
    return noiseBuf;
  }

  // Une note de bois : note de base (0,35 s), harmonique 4× très brève, frappe boisée.
  function bois(ctx, out, freq, t, vol, cutoff, list){
    var f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = Math.min(cutoff, 5000); f.Q.value = 0.5;
    f.connect(out);
    [[1, 1, 0.35], [4, 0.08, 0.04]].forEach(function(p){
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq * p[0];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol * p[1], t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + p[2]);
      o.connect(g); g.connect(f);
      o.start(t); o.stop(t + p[2] + 0.05);
      if(list) list.push(o);
    });
    var n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
    n.buffer = noise(ctx);
    bp.type = "bandpass"; bp.frequency.value = freq * 1.6; bp.Q.value = 3;
    ng.gain.setValueAtTime(vol * 0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    n.connect(bp); bp.connect(ng); ng.connect(f);
    n.start(t);
    if(list) list.push(n);
  }

  function bipApnee(ctx){
    if(!ctx) return;
    try{ bois(ctx, ctx.destination, 600, ctx.currentTime + 0.01, BOIS_VOL, 20000); }catch(e){}
  }

  function finApnee(ctx){
    if(!ctx) return;
    try{
      stopFinApnee();
      sonarBus = ctx.createGain();
      sonarBus.connect(ctx.destination);
      var t = ctx.currentTime + 0.01;
      bois(ctx, sonarBus, 480, t, BOIS_VOL, 20000, sonarSrc);
      for(var k = 1; k <= 7; k++){
        bois(ctx, sonarBus, 480, t + k * 0.55, BOIS_VOL * Math.pow(0.75, k), 1200 - k * 120, sonarSrc);
      }
    }catch(e){}
  }

  // Coupe les rebonds encore à venir (Stop, Réinitialiser).
  function stopFinApnee(){
    try{ if(sonarBus) sonarBus.gain.setTargetAtTime(0, sonarBus.context.currentTime, 0.01); }catch(e){}
    sonarSrc.forEach(function(s){ try{ s.stop(); }catch(e){} });
    sonarSrc = []; sonarBus = null;
  }

  window.ApneeAudio = { unlock: unlock, resume: resume, bip: bip, finBulles: finBulles,
    bipApnee: bipApnee, finApnee: finApnee, stopFinApnee: stopFinApnee };
})();
