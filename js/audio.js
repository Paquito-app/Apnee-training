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

  window.ApneeAudio = { unlock: unlock, resume: resume };
})();
