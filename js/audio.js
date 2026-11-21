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

  // Le bip de l'app (changements d'étape, 3 dernières secondes, chrono libre,
  // décompte de fin d'apnée) : bloc de bois aigu, voir blocBois() plus bas.
  function bip(ctx, delay){
    if(!ctx) return;
    try{ blocBois(ctx, ctx.destination, BLOC_HAUT, ctx.currentTime + 0.01 + (delay||0), BLOC_VOL, 20000, null, null); }catch(e){}
  }

  // Bip des minutes pendant l'apnée : plus grave et discret que le bip, timbre rond (triangle).
  var BIP_MINUTE_HZ = 440, BIP_MINUTE_VOL = 0.11;
  function bipMinute(ctx){
    if(!ctx) return;
    try{
      var t = ctx.currentTime + 0.01, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = BIP_MINUTE_HZ;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(BIP_MINUTE_VOL, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.4);
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

  // ---------- Blocs de bois (bips et fin d'apnée) ----------
  // Bloc aigu 720 Hz pour tous les bips. À la fin d'apnée : bloc grave 560 Hz,
  // 5 rebonds (tous les 0,16 s, de plus en plus faibles et sourds) et réverbération légère à queue longue (1,9 s).
  var BLOC_HAUT = 720, BLOC_BAS = 560, BLOC_VOL = 0.3;
  var BLOC_DEC = 0.13, BLOC_MODE = 2.9, BLOC_CLICK = 0.35, BLOC_Q = 7;
  var REBONDS = 5, REBOND_PAS = 0.16;
  var noiseBuf = null, irCache = {}, sonarBus = null, sonarSrc = [];

  // Bruit très court : la frappe sur le bloc.
  function noise(ctx){
    if(!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate){
      noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for(var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
    }
    return noiseBuf;
  }

  // Réverbération synthétique (bruit qui décroît), mise en cache par durée.
  function salle(ctx, out, dur, wet, lp){
    var key = dur + "@" + ctx.sampleRate, ir = irCache[key];
    if(!ir){
      var n = Math.floor(ctx.sampleRate * dur), att = Math.floor(ctx.sampleRate * 0.012);
      ir = ctx.createBuffer(2, n, ctx.sampleRate);
      for(var c = 0; c < 2; c++){
        var d = ir.getChannelData(c);
        for(var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-6.9 * i / n) * (i < att ? i / att : 1);
      }
      irCache[key] = ir;
    }
    var cv = ctx.createConvolver(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    cv.buffer = ir;
    f.type = "lowpass"; f.frequency.value = lp;
    g.gain.value = wet;
    cv.connect(f); f.connect(g); g.connect(out);
    return cv;
  }

  // Une frappe : note de base qui retombe légèrement, 2e mode à ×2,9, bruit de frappe,
  // petite pièce (0,35 s) ; « envoi » = réverbération en plus (fin d'apnée).
  function blocBois(ctx, out, freq, t, vol, cutoff, envoi, list){
    var f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = Math.min(cutoff, 9000); f.Q.value = 0.5;
    f.connect(out);
    f.connect(salle(ctx, out, 0.35, 0.12, 6000));
    if(envoi) f.connect(envoi);
    [[1, 1, BLOC_DEC], [BLOC_MODE, 0.32, BLOC_DEC * 0.45]].forEach(function(p){
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq * p[0] * 1.04, t);
      o.frequency.exponentialRampToValueAtTime(freq * p[0], t + 0.012);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol * p[1], t + 0.0015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + p[2]);
      o.connect(g); g.connect(f);
      o.start(t); o.stop(t + p[2] + 0.03);
      if(list) list.push(o);
    });
    var n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
    n.buffer = noise(ctx);
    bp.type = "bandpass"; bp.frequency.value = freq * 1.3; bp.Q.value = BLOC_Q;
    ng.gain.setValueAtTime(vol * BLOC_CLICK * 3, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
    n.connect(bp); bp.connect(ng); ng.connect(f);
    n.start(t);
    if(list) list.push(n);
  }

  // Décompte de fin d'apnée (10, 5, 4, 3, 2, 1 s) : le même bip que partout.
  function bipApnee(ctx){ bip(ctx, 0); }

  function finApnee(ctx){
    if(!ctx) return;
    try{
      stopFinApnee();
      sonarBus = ctx.createGain();
      sonarBus.connect(ctx.destination);
      var t = ctx.currentTime + 0.01;
      var reverb = salle(ctx, sonarBus, 1.9, 0.22, 3400);
      blocBois(ctx, sonarBus, BLOC_BAS, t, BLOC_VOL, 20000, reverb, sonarSrc);
      var att = Math.pow(0.04, 1 / REBONDS);   // le dernier rebond tombe à 4 % du volume
      for(var k = 1; k <= REBONDS; k++){
        blocBois(ctx, sonarBus, BLOC_BAS, t + k * REBOND_PAS, BLOC_VOL * Math.pow(att, k),
                 Math.max(900, 4500 - k * (3400 / REBONDS)), reverb, sonarSrc);
      }
    }catch(e){}
  }

  // Coupe les rebonds et la réverbération encore en cours (Stop, ‹ Réglages).
  function stopFinApnee(){
    try{ if(sonarBus) sonarBus.gain.setTargetAtTime(0, sonarBus.context.currentTime, 0.01); }catch(e){}
    sonarSrc.forEach(function(s){ try{ s.stop(); }catch(e){} });
    sonarSrc = []; sonarBus = null;
  }

  window.ApneeAudio = { unlock: unlock, resume: resume, bip: bip, bipMinute: bipMinute, finBulles: finBulles,
    bipApnee: bipApnee, finApnee: finApnee, stopFinApnee: stopFinApnee };
})();
