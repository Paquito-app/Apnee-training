(function(){
  "use strict";

  // ---------- storage helpers ----------
  // Données enregistrées dans le navigateur (localStorage), toutes préfixées « apnee.v1. ».
  var KEY_CONFIGS = "apnee.v1.configs";
  var KEY_PRESETS = "apnee.v1.presets";
  function loadJSON(key, fallback){
    try{ var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch(e){ return fallback; }
  }
  function saveJSON(key, val){
    try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){}
  }

  // ---------- protocol definitions ----------
  var PROTOCOLS = {
    co2: {
      name: "Table CO2",
      holdLabel: "APNÉE",
      kind: "apnea",
      fields: [
        {key:"breathSec", label:"Préparation", hint:"Avant le premier round", step:5, min:15, max:300, default:60},
        {key:"holdSec", label:"Temps d'apnée", hint:"Durée fixe à chaque round", step:5, min:15, max:600, default:60},
        {key:"restStart", label:"Temps de repos initial", hint:"Premier repos, diminue à chaque round", step:5, min:15, max:600, default:45},
        {key:"restStep", label:"Diminution du temps de repos", hint:"Retirée à chaque round", step:5, min:5, max:60, default:10},
        {key:"recSec", label:"Temps de récupération", hint:"Après la dernière apnée", step:5, min:5, max:300, default:60},
        {key:"rounds", label:"Rounds", hint:"Nombre de répétitions", step:1, min:1, max:20, default:5, isRounds:true}
      ],
      // réglages impossibles : le dernier repos (entre les deux dernières apnées) tomberait à 0 ou moins
      check: function(cfg){
        if(cfg.rounds < 2) return null;
        var n = cfg.rounds - 1;
        var last = cfg.restStart - (n-1)*cfg.restStep;
        if(last > 0) return null;
        return "Le "+n+"ᵉ repos tomberait à "+(last < 0 ? "−" : "")+fmt(-last)+" : réduisez la diminution ou les rounds.";
      },
      build: function(cfg){
        var seq = [{type:"breathPrep", dur:cfg.breathSec, round:0}];
        for(var i=0;i<cfg.rounds;i++){
          seq.push({type:"hold", dur:cfg.holdSec, round:i+1});
          var rest = cfg.restStart - i*cfg.restStep;
          if(i < cfg.rounds-1) seq.push({type:"rest", dur:rest, round:i+1});
        }
        seq.push({type:"recovery", dur:cfg.recSec, round:cfg.rounds});
        return seq;
      }
    },
    o2: {
      name: "Table O2",
      holdLabel: "APNÉE",
      kind: "apnea",
      fields: [
        {key:"breathSec", label:"Préparation", hint:"Avant le premier round", step:5, min:15, max:300, default:60},
        {key:"holdStart", label:"Durée apnée initiale", hint:"Première apnée", step:5, min:15, max:600, default:60},
        {key:"holdStep", label:"Augmentation temps d'apnée", hint:"Ajout à chaque round", step:5, min:5, max:60, default:15},
        {key:"restSec", label:"Temps de repos", hint:"Entre chaque apnée", step:5, min:15, max:600, default:60},
        {key:"recSec", label:"Temps de récupération", hint:"Après la dernière apnée", step:5, min:5, max:300, default:60},
        {key:"rounds", label:"Rounds", hint:"Nombre de répétitions", step:1, min:1, max:20, default:5, isRounds:true}
      ],
      // réglages impossibles : la dernière apnée dépasserait O2_MAX_HOLD
      check: function(cfg){
        var last = cfg.holdStart + (cfg.rounds-1)*cfg.holdStep;
        if(last <= O2_MAX_HOLD) return null;
        return "Dernière apnée à "+fmt(last)+", au-delà du maximum de "+fmt(O2_MAX_HOLD)+" : réduisez les réglages.";
      },
      build: function(cfg){
        var seq = [{type:"breathPrep", dur:cfg.breathSec, round:0}];
        for(var i=0;i<cfg.rounds;i++){
          var hold = cfg.holdStart + i*cfg.holdStep;
          seq.push({type:"hold", dur:hold, round:i+1});
          if(i < cfg.rounds-1) seq.push({type:"rest", dur:cfg.restSec, round:i+1});
        }
        seq.push({type:"recovery", dur:cfg.recSec, round:cfg.rounds});
        return seq;
      }
    },
    carre: {
      name: "Respiration carrée",
      kind: "breath",
      fields: [
        {key:"inspi", label:"Inspiration", hint:"Durée de l'inspiration", step:1, min:1, max:60, default:5},
        {key:"hold1", label:"Rétention (poumons pleins)", hint:"0 = étape désactivée", step:1, min:0, max:60, default:5},
        {key:"expi", label:"Expiration", hint:"Durée de l'expiration", step:1, min:1, max:60, default:5},
        {key:"hold2", label:"Rétention (poumons vides)", hint:"0 = étape désactivée", step:1, min:0, max:60, default:5},
        {key:"rounds", label:"Cycles", hint:"Nombre de répétitions", step:1, min:1, max:50, default:5, isRounds:true}
      ],
      build: function(cfg){
        var seq = [];
        for(var i=0;i<cfg.rounds;i++){
          seq.push({type:"in", dur:cfg.inspi, round:i+1});
          if(cfg.hold1 > 0) seq.push({type:"holdFull", dur:cfg.hold1, round:i+1});
          seq.push({type:"out", dur:cfg.expi, round:i+1});
          if(cfg.hold2 > 0) seq.push({type:"holdEmpty", dur:cfg.hold2, round:i+1});
        }
        return seq;
      }
    },
    hiit: {
      name: "HIIT classique",
      holdLabel: "EFFORT",
      kind: "cardio",
      fields: [
        {key:"holdSec", label:"Effort", hint:"Durée d'intensité par round", step:5, min:5, max:300, default:30},
        {key:"restSec", label:"Repos", hint:"Récupération entre les rounds", step:5, min:5, max:300, default:30},
        {key:"rounds", label:"Rounds", hint:"Nombre de répétitions", step:1, min:2, max:30, default:8, isRounds:true}
      ],
      build: function(cfg){
        var seq = [];
        for(var i=0;i<cfg.rounds;i++){
          seq.push({type:"hold", dur:cfg.holdSec, round:i+1});
          if(i < cfg.rounds-1) seq.push({type:"rest", dur:cfg.restSec, round:i+1});
        }
        return seq;
      }
    }
  };

  var PREPARE_SEC = 5;
  var O2_MAX_HOLD = 600; // durée maximale d'une apnée en table O2 (10:00)

  function problemFor(protoKey, cfg){
    var check = PROTOCOLS[protoKey].check;
    return check ? check(cfg) : null;
  }

  var state = {
    protocol: "carre", // l'app s'ouvre toujours sur la respiration carrée
    configs: loadJSON(KEY_CONFIGS, {}),
    presets: loadJSON(KEY_PRESETS, {}),
    view: "list",
    cur: -1,
    sequence: [],
    idx: -1,
    phaseStart: 0,
    remaining: 0,
    running: false,
    totalRounds: 0,
    raf: null,
    wakeLock: null
  };

  // fill missing config defaults
  Object.keys(PROTOCOLS).forEach(function(key){
    var cfg = state.configs[key] || {};
    PROTOCOLS[key].fields.forEach(function(f){
      if(typeof cfg[f.key] !== "number") cfg[f.key] = f.default;
    });
    state.configs[key] = cfg;
  });

  // ---------- format helpers ----------
  function fmt(sec){
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec/60), s = sec%60;
    return m + ":" + (s<10?"0":"") + s;
  }

  // ---------- audio ----------
  var actx = null;
  function getCtx(){
    if(!actx){
      try{ actx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){}
    }
    window.ApneeAudio.resume(actx);
    return actx;
  }
  // Un seul son de bip dans toute l'app (voir js/audio.js).
  function beep(delay){ window.ApneeAudio.bip(getCtx(), delay); }
  function buzz(p){ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }
  function tickBeep(){ beep(); buzz(40); }
  function transitionBeep(){ beep(); buzz(100); }
  function minuteBeep(){ beep(); buzz(150); }

  var voices = [];
  function loadVoices(){ try{ voices = speechSynthesis.getVoices(); }catch(e){} }
  if("speechSynthesis" in window){
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }
  function speak(text){
    if(!("speechSynthesis" in window)) return;
    try{
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "fr-FR";
      u.rate = 1;
      u.volume = VOICE_VOLUME;
      var frVoice = voices.find(function(v){ return v.lang && v.lang.toLowerCase().indexOf("fr") === 0; });
      if(frVoice) u.voice = frVoice;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    }catch(e){}
  }

  // ---------- voix enregistrées ----------
  var VOICE_LEAD = 0.04; // s : chaque mot démarre 40 ms après le début de son fichier
  // Volume des voix (1 = volume d'origine). 0.5 = −6 dB : équilibré avec les bips et la bulle de fin.
  var VOICE_VOLUME = 0.5;
  var voiceGain = null;
  var VOICE_FALLBACK = {top:"Top", respirez:"Respirez"};
  var voiceBuf = {}, voiceLoading = false, voiceSrc = [];
  function b64ToBuf(b64){
    var bin = atob(b64), n = bin.length, u = new Uint8Array(n);
    for(var i=0;i<n;i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }
  function loadVoiceBuffers(){
    var ctx = getCtx();
    if(!ctx || voiceLoading || typeof VOICE_DATA === "undefined") return;
    voiceLoading = true;
    try{ if(ctx.state === "suspended") ctx.resume(); }catch(e){}
    Object.keys(VOICE_DATA).forEach(function(k){
      try{
        var p = ctx.decodeAudioData(b64ToBuf(VOICE_DATA[k]), function(b){ voiceBuf[k] = b; }, function(){});
        if(p && p.catch) p.catch(function(){});
      }catch(e){}
    });
  }
  function playVoice(key){
    var ctx = getCtx(), b = voiceBuf[key];
    if(!ctx || !b){ speak(VOICE_FALLBACK[key] || key); return; }
    try{
      var src = ctx.createBufferSource();
      src.buffer = b;
      if(!voiceGain){ voiceGain = ctx.createGain(); voiceGain.gain.value = VOICE_VOLUME; voiceGain.connect(ctx.destination); }
      src.connect(voiceGain);
      src.onended = function(){ voiceSrc = voiceSrc.filter(function(x){ return x !== src; }); };
      voiceSrc.push(src);
      src.start();
    }catch(e){}
  }
  function stopVoices(){
    voiceSrc.forEach(function(x){ try{ x.stop(); }catch(e){} });
    voiceSrc = [];
  }

  // ---------- wake lock ----------
  function requestWake(){
    if("wakeLock" in navigator){
      navigator.wakeLock.request("screen").then(function(wl){ state.wakeLock = wl; }).catch(function(){});
    }
  }
  function releaseWake(){
    if(state.wakeLock){ try{ state.wakeLock.release(); }catch(e){} state.wakeLock = null; }
  }

  // ---------- DOM refs ----------
  var tabsEl = document.getElementById("tabs");
  var setupEl = document.getElementById("setup");
  var runEl = document.getElementById("run");
  var doneEl = document.getElementById("done");
  var roundBadge = document.getElementById("roundBadge");
  var breathPhaseLabel = document.getElementById("breathPhaseLabel");
  var pauseBtn = document.getElementById("pauseBtn");
  var doneSummary = document.getElementById("doneSummary");
  var doneBackBtn = document.getElementById("doneBackBtn");

  var PHASE_COLORS = {
    prepare: "var(--ready)",
    hold: "var(--rest)",
    rest: "var(--ready)",
    breathPrep: "var(--effort)",
    recovery: "var(--effort)",
    "in": "var(--rest)",
    holdFull: "var(--rest)",
    out: "var(--ready)",
    holdEmpty: "var(--ready)"
  };

  var BREATH_LABELS = {
    "in": "INSPIRATION",
    holdFull: "RÉTENTION",
    out: "EXPIRATION",
    holdEmpty: "RÉTENTION",
    breathPrep: "PRÉPARATION"
  };

  var MAX_R = 88;
  var waterFill = document.getElementById("waterFill");
  var waterY = document.getElementById("waterY");
  var aboveRect = document.getElementById("aboveRect");
  var belowRect = document.getElementById("belowRect");
  var digitAbove = document.getElementById("digitAbove");
  var digitBelow = document.getElementById("digitBelow");
  var phaseUnit = document.getElementById("phaseUnit");
  var breathSvg = document.getElementById("breathSvg");
  var clockSvg = document.getElementById("clockSvg");
  var pieSector = document.getElementById("pieSector");
  var sessionArc = document.getElementById("sessionArc");
  var sessionDot = document.getElementById("sessionDot");
  var minorTicksG = document.getElementById("minorTicks");
  var posMarksG = document.getElementById("posMarks");
  var digitUnsweptEl = document.getElementById("digitUnswept");
  var digitSweptEl = document.getElementById("digitSwept");
  var clockDigitFadeEl = document.getElementById("clockDigitFade");
  var clockSecGroupEl = document.getElementById("clockSecGroup");
  var secLabelUnsweptEl = document.getElementById("secLabelUnswept");
  var secLabelAboveEl = document.getElementById("secLabelAbove");
  var secLabelBelowEl = document.getElementById("secLabelBelow");
  var clockSweptClipPathEl = document.getElementById("clockSweptClipPath");
  var clockUnsweptClipPathEl = document.getElementById("clockUnsweptClipPath");

  var FACE_R = 68;
  var MINOR_R_IN = 74;
  var MINOR_R_OUT = 79;
  var POS_R = 88;
  var SESSION_R = 98;

  function polarXY(angleDeg, radius){
    var rad = angleDeg * Math.PI / 180;
    return { x: 100 + radius * Math.sin(rad), y: 100 - radius * Math.cos(rad) };
  }

  // Full-circle path helper (two half-arcs, via proper antipodal top/bottom points) for radius r —
  // used when a sweep would be ~360deg.
  function fullCirclePath(r){
    return "M100," + (100 - r) +
           " A" + r + "," + r + " 0 1 1 100," + (100 + r) +
           " A" + r + "," + r + " 0 1 1 100," + (100 - r) + " Z";
  }

  // Filled pie sector: the ELAPSED portion of the current 60s lap, growing clockwise from the top.
  // frac=0 -> empty (start of a new minute). frac=1 -> full circle (a lap just completed).
  function pieWedgeD(frac, r){
    frac = Math.max(0, Math.min(1, frac));
    var deg = frac * 360;
    if(deg <= 0.5) return "";
    if(deg >= 359.5) return fullCirclePath(r);
    var p0 = polarXY(0, r);
    var p1 = polarXY(deg, r);
    var largeArc = deg > 180 ? 1 : 0;
    return "M100,100 L" + p0.x.toFixed(2) + "," + p0.y.toFixed(2) +
      " A" + r + "," + r + " 0 " + largeArc + " 1 " +
      p1.x.toFixed(2) + "," + p1.y.toFixed(2) + " Z";
  }
  function setPieSector(frac, color){
    pieSector.setAttribute("fill", color);
    pieSector.setAttribute("d", pieWedgeD(frac, FACE_R));
  }

  // The seconds digit is drawn twice, clipped like a clock hand: the swept portion (already
  // passed by the colored wedge) shows in the background color, the unswept portion shows in
  // the phase color — same two-tone technique as the breathing water digit, but with a radial
  // wedge clip instead of a rising waterline.
  function setDigitClip(frac){
    var wedge = pieWedgeD(frac, FACE_R);
    clockSweptClipPathEl.setAttribute("d", wedge);
    clockUnsweptClipPathEl.setAttribute("d", fullCirclePath(FACE_R) + " " + wedge);
  }

  // Thin stroked arc: the ELAPSED portion of the outer session ring, growing clockwise from top.
  function setSessionArc(frac){
    frac = Math.max(0, Math.min(1, frac));
    var endDeg = frac * 360;
    if(endDeg <= 0.5){
      sessionArc.setAttribute("d", "");
    } else if(endDeg >= 359.5){
      sessionArc.setAttribute("d", fullCirclePath(SESSION_R));
    } else {
      var p0 = polarXY(0, SESSION_R);
      var p1 = polarXY(endDeg, SESSION_R);
      var largeArc = endDeg > 180 ? 1 : 0;
      sessionArc.setAttribute("d",
        "M" + p0.x.toFixed(2) + "," + p0.y.toFixed(2) +
        " A" + SESSION_R + "," + SESSION_R + " 0 " + largeArc + " 1 " +
        p1.x.toFixed(2) + "," + p1.y.toFixed(2));
    }
    var dot = polarXY(endDeg, SESSION_R);
    sessionDot.setAttribute("cx", dot.x.toFixed(2));
    sessionDot.setAttribute("cy", dot.y.toFixed(2));
  }

  // Static bezel: 60 small dots every 6°, purely decorative (dive-watch style).
  function buildMinorTicks(){
    minorTicksG.innerHTML = "";
    var frag = document.createDocumentFragment();
    var r = (MINOR_R_IN + MINOR_R_OUT) / 2;
    for(var i = 0; i < 60; i++){
      var p = polarXY(i * 6, r);
      var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", p.x.toFixed(2));
      dot.setAttribute("cy", p.y.toFixed(2));
      dot.setAttribute("r", "1.1");
      dot.setAttribute("class", "minor-dot");
      frag.appendChild(dot);
    }
    minorTicksG.appendChild(frag);
  }
  buildMinorTicks();

  // 12 minute markers around the dial, clock-style. Each is a plain white dot, except the
  // position for the most recently completed minute, which shows that minute's number instead.
  function renderPosMarks(minuteCount, color){
    posMarksG.innerHTML = "";
    var frag = document.createDocumentFragment();
    var activePos = minuteCount > 0 ? (minuteCount - 1) % 12 : -1;
    for(var i = 0; i < 12; i++){
      var p = polarXY(i * 30, POS_R);
      if(i === activePos){
        var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", p.x.toFixed(2));
        text.setAttribute("y", (p.y + 4).toFixed(2));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-size", "15");
        text.setAttribute("class", "pos-num");
        text.setAttribute("fill", color);
        text.textContent = String(minuteCount);
        frag.appendChild(text);
      } else {
        var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", p.x.toFixed(2));
        dot.setAttribute("cy", p.y.toFixed(2));
        dot.setAttribute("r", "2.6");
        dot.setAttribute("class", "pos-dot");
        frag.appendChild(dot);
      }
    }
    posMarksG.appendChild(frag);
  }

  function setWaterLevel(level){
    // level: 0 = empty, 1 = full. Surface sits at y = (100+MAX_R) - level*(2*MAX_R)
    var y = (100 + MAX_R) - level * (2 * MAX_R);
    waterY.setAttribute("transform", "translate(0," + y.toFixed(1) + ")");
    aboveRect.setAttribute("height", y.toFixed(1));
    belowRect.setAttribute("y", y.toFixed(1));
    belowRect.setAttribute("height", (200 - y).toFixed(1));
  }

  function setBreathDigit(text){
    digitAbove.textContent = text;
    digitBelow.textContent = text;
  }

  // ---------- render setup screen ----------
  var chronoOn = false;
  var chronoEl = document.getElementById("chrono");
  function showChrono(on){
    chronoOn = on;
    chronoEl.classList.toggle("active", on);
    if(on){
      setupEl.classList.add("hidden");
      runEl.classList.remove("active");
      doneEl.classList.remove("active");
    } else {
      setupEl.classList.remove("hidden");
    }
  }

  // fond photo : uniquement sur les écrans d'accueil (liste + réglages) de respiration / O2 / CO2 ;
  // bleu nuit pendant la séance (dès « Démarrer »), à la fin, et sur HIIT / Chrono
  function applyBg(){
    var inSession = runEl.classList.contains("active") || doneEl.classList.contains("active");
    var poolTab = !chronoOn && (state.protocol === "carre" || state.protocol === "o2" || state.protocol === "co2");
    document.body.setAttribute("data-bg", (poolTab && !inSession) ? "pool" : "navy");
  }

  function renderTabs(){
    Array.prototype.forEach.call(tabsEl.children, function(btn){
      btn.classList.toggle("active", btn.dataset.protocol === (chronoOn ? "chrono" : state.protocol));
    });
    applyBg();
  }

  function totalDuration(protoKey, cfg){
    var seq = PROTOCOLS[protoKey].build(cfg);
    var total = PROTOCOLS[protoKey].kind === "apnea" ? 0 : PREPARE_SEC;
    seq.forEach(function(p){ total += p.dur; });
    return total;
  }

  function defaultsFor(key){
    var c = {};
    PROTOCOLS[key].fields.forEach(function(f){ c[f.key] = f.default; });
    return c;
  }
  function persistPresets(){ saveJSON(KEY_PRESETS, state.presets); }

  function renderSetup(){
    var key = state.protocol;
    var proto = PROTOCOLS[key];
    var list = state.presets[key] || (state.presets[key] = []);
    setupEl.innerHTML = "";

    // ----- liste : séances enregistrées + bouton + -----
    if(state.view === "list"){
      var col = document.createElement("div");
      col.className = "presets";
      list.forEach(function(pr, i){
        var row = document.createElement("div");
        row.className = "preset-row";
        var open = document.createElement("button");
        open.type = "button"; open.className = "preset-open"; open.textContent = pr.name;
        open.addEventListener("click", function(){
          state.cur = i;
          var cfg = JSON.parse(JSON.stringify(pr.cfg || {}));
          proto.fields.forEach(function(f){ if(typeof cfg[f.key] !== "number") cfg[f.key] = f.default; });
          state.configs[key] = cfg;
          saveJSON(KEY_CONFIGS, state.configs);
          state.view = "edit"; renderSetup();
        });
        var del = document.createElement("button");
        del.type = "button"; del.className = "preset-del"; del.textContent = "✕";
        del.setAttribute("aria-label","Supprimer "+pr.name);
        del.addEventListener("click", function(){
          list.splice(i,1); persistPresets(); renderSetup();
        });
        row.appendChild(open); row.appendChild(del);
        col.appendChild(row);
      });
      var add = document.createElement("button");
      add.type = "button"; add.className = "plus-btn"; add.textContent = "+";
      add.setAttribute("aria-label","Nouvelle séance");
      add.addEventListener("click", function(){
        state.configs[key] = defaultsFor(key);
        state.cur = -1; state.view = "new"; renderSetup();
      });
      col.appendChild(add);
      setupEl.appendChild(col);
      return;
    }

    // ----- barre du haut : retour (+ nom) -----
    var top = document.createElement("div");
    top.className = "setup-top";
    var back = document.createElement("button");
    back.type = "button"; back.className = "back-link"; back.textContent = "‹ Séances";
    back.addEventListener("click", function(){ state.view = "list"; renderSetup(); });
    top.appendChild(back);
    var nameInp = null;
    if(state.view === "new"){
      nameInp = document.createElement("input");
      nameInp.type = "text"; nameInp.maxLength = 24; nameInp.placeholder = "Nom de la séance";
      nameInp.className = "name-inp"; nameInp.setAttribute("aria-label","Nom de la séance");
      top.appendChild(nameInp); // sur la même ligne que « ‹ Séances » : gain de hauteur
    } else {
      var ttl = document.createElement("div");
      ttl.className = "setup-name"; ttl.textContent = list[state.cur] ? list[state.cur].name : "";
      top.appendChild(ttl);
    }
    setupEl.appendChild(top);

    var group = document.createElement("div");
    group.className = "field-group";
    proto.fields.forEach(function(f){
      var row = document.createElement("div");
      row.className = "field";
      row.innerHTML =
        '<div><div class="field-label">'+f.label+'</div><div class="field-hint">'+f.hint+'</div></div>' +
        '<div class="stepper">' +
          '<button type="button" data-act="dec" data-key="'+f.key+'">–</button>' +
          '<div class="val mono" data-val="'+f.key+'"></div>' +
          '<button type="button" data-act="inc" data-key="'+f.key+'">+</button>' +
        '</div>';
      group.appendChild(row);
    });
    setupEl.appendChild(group);

    var preview = document.createElement("div");
    preview.className = "preview";
    preview.id = "previewLine";
    setupEl.appendChild(preview);

    var startBtn = document.createElement("button");
    startBtn.className = "start-btn";
    startBtn.id = "startBtn";
    if(state.view === "new"){
      startBtn.textContent = "Enregistrer";
      startBtn.addEventListener("click", function(){
        var name = nameInp.value.trim();
        if(!name){ nameInp.focus(); return; }
        list.push({name:name, cfg:JSON.parse(JSON.stringify(state.configs[key]))});
        persistPresets();
        state.cur = list.length-1; state.view = "edit"; renderSetup();
      });
    } else {
      startBtn.textContent = "Démarrer";
      startBtn.addEventListener("click", startSession);
    }
    setupEl.appendChild(startBtn);

    updateValues();
  }

  setupEl.addEventListener("click", function(e){
    var btn = e.target.closest("button[data-act]");
    if(!btn) return;
    var key = btn.dataset.key;
    var proto = PROTOCOLS[state.protocol];
    var f = proto.fields.find(function(ff){ return ff.key===key; });
    var cfgNow = state.configs[state.protocol];
    var delta = btn.dataset.act === "inc" ? f.step : -f.step;
    cfgNow[key] = Math.min(f.max, Math.max(f.min, cfgNow[key] + delta));
    saveJSON(KEY_CONFIGS, state.configs);
    if(state.view === "edit" && state.presets[state.protocol] && state.presets[state.protocol][state.cur]){
      state.presets[state.protocol][state.cur].cfg = JSON.parse(JSON.stringify(cfgNow));
      persistPresets();
    }
    updateValues();
  });


  function updateValues(){
    var proto = PROTOCOLS[state.protocol];
    var cfg = state.configs[state.protocol];
    proto.fields.forEach(function(f){
      var el = setupEl.querySelector('[data-val="'+f.key+'"]');
      if(!el) return;
      el.textContent = f.isRounds ? cfg[f.key] : fmt(cfg[f.key]);
    });
    var total = totalDuration(state.protocol, cfg);
    var problem = problemFor(state.protocol, cfg);
    var line = document.getElementById("previewLine");
    if(line){
      line.classList.toggle("error", !!problem);
      if(problem) line.textContent = problem;
      else line.innerHTML = 'Durée totale estimée <b>'+fmt(total)+'</b>';
    }
    var startBtn = document.getElementById("startBtn");
    if(startBtn && state.view === "edit") startBtn.classList.toggle("blocked", !!problem);
  }

  // ---------- session control ----------
  function startSession(){
    var proto = PROTOCOLS[state.protocol];
    var cfg = state.configs[state.protocol];
    if(problemFor(state.protocol, cfg)) return; // démarrage bloqué, le message est affiché au-dessus du bouton
    var built = proto.build(cfg);
    state.sequence = (proto.kind === "apnea") ? built : [{type:"prepare", dur:PREPARE_SEC, round:0}].concat(built);
    state.totalRounds = cfg.rounds;
    state.idx = -1;
    state.sessionStart = performance.now();
    state.sessionTotal = 0;
    state.sequence.forEach(function(p){ state.sessionTotal += p.dur; });
    setupEl.classList.add("hidden");
    runEl.classList.add("active");
    doneEl.classList.remove("active");
    requestWake();
    window.ApneeAudio.unlock(getCtx()); // débloque le son (iPhone) pendant l'appui sur Démarrer
    loadVoiceBuffers();
    advancePhase();
    state.running = true;
    pauseBtn.textContent = "Stop";
    loop();
  }

  function advancePhase(){
    var prevPh = state.sequence[state.idx];
    if(prevPh && prevPh.type === "hold" && PROTOCOLS[state.protocol].kind === "apnea") playVoice("respirez");
    state.idx++;
    if(state.idx >= state.sequence.length){
      finishSession();
      return;
    }
    var ph = state.sequence[state.idx];
    var proto = PROTOCOLS[state.protocol];
    state.phaseStart = performance.now();
    state.remaining = ph.dur;
    state.beepedAt = {};
    if(proto.kind === "apnea" && ph.type === "hold"){
      playVoice("top");
    }
    transitionBeep();
    renderPhase();
  }

  function renderPhase(){
    var ph = state.sequence[state.idx];
    var proto = PROTOCOLS[state.protocol];
    var isBreath = proto.kind === "breath";

    var isWater = isBreath;
    var label;
    if(ph.type === "prepare") label = "PRÊT";
    else if(isBreath) label = BREATH_LABELS[ph.type];
    else if(ph.type === "breathPrep") label = BREATH_LABELS.breathPrep;
    else if(ph.type === "recovery") label = "RÉCUPÉRATION";
    else if(ph.type === "hold") label = proto.holdLabel;
    else label = "REPOS";
    var timerColor = isBreath ? ((ph.type === "in") ? "var(--rest)" : (ph.type === "out") ? "var(--ready)" : "#FFFFFF") : PHASE_COLORS[ph.type];

    breathPhaseLabel.hidden = false;
    breathPhaseLabel.textContent = label;
    breathPhaseLabel.style.color = timerColor;

    clockSvg.style.display = isWater ? "none" : "";
    breathSvg.style.display = isWater ? "" : "none";
    if(isWater) waterFill.setAttribute("fill", PHASE_COLORS[ph.type]);
    var useTwoToneLabel = proto.kind !== "cardio";
    phaseUnit.hidden = useTwoToneLabel;
    phaseUnit.textContent = "secondes";
    if(!isWater){
      setPieSector(0, PHASE_COLORS[ph.type]);
      pieSector.style.opacity = "1";
      clockDigitFadeEl.style.opacity = "1";
      posMarksG.style.opacity = "1";
      clockSecGroupEl.style.display = useTwoToneLabel ? "" : "none";
      renderPosMarks(0, PHASE_COLORS[ph.type]);
      digitUnsweptEl.setAttribute("fill", PHASE_COLORS[ph.type]);
      secLabelUnsweptEl.setAttribute("fill", PHASE_COLORS[ph.type]);
      var isCountUp = proto.kind === "apnea" && ph.type === "hold";
      var initialSec = String(isCountUp ? 0 : Math.ceil(Math.min(ph.dur, 60)));
      digitUnsweptEl.textContent = initialSec;
      digitSweptEl.textContent = initialSec;
      setDigitClip(0);
      state.lastMinuteCount = 0;
    } else {
      var startLevel = (ph.type === "holdFull") ? 1 : (ph.type === "in" || ph.type === "holdEmpty") ? 0 : 1;
      setWaterLevel(startLevel);
      setBreathDigit(String(Math.ceil(ph.dur)));
    }

    phaseUnit.style.color = timerColor;
    phaseUnit.style.opacity = "0.85";
    if(isWater){
      digitAbove.style.fill = timerColor;
      secLabelAboveEl.style.fill = timerColor;
      // Retention phases (full or empty lungs) show a solid white digit rather than the
      // two-tone waterline split used for inspiration/expiration.
      var isRetention = (ph.type === "holdFull" || ph.type === "holdEmpty");
      digitBelow.style.fill = isRetention ? timerColor : "#0A0D12";
      secLabelBelowEl.style.fill = isRetention ? timerColor : "#0A0D12";
    }

    if(ph.type === "prepare"){
      roundBadge.textContent = "PRÉPARATION";
    } else if(ph.type === "breathPrep" || ph.type === "recovery"){
      roundBadge.textContent = "\u00a0";
    } else {
      roundBadge.textContent = (isBreath ? "CYCLE " : "ROUND ") + ph.round + " / " + state.totalRounds;
    }
  }

  function loop(){
    if(!state.running) return;
    var ph = state.sequence[state.idx];
    var proto = PROTOCOLS[state.protocol];
    var next = state.sequence[state.idx+1];
    var elapsed = (performance.now() - state.phaseStart) / 1000;
    var remaining = Math.max(0, ph.dur - elapsed);
    state.remaining = remaining;

    var frac = ph.dur > 0 ? (ph.dur - remaining) / ph.dur : 1;
    var isWater = proto.kind === "breath";

    if(isWater){
      setBreathDigit(String(Math.ceil(remaining)));

      var level; // 0 = empty, 1 = full
      if(ph.type === "in") level = frac;
      else if(ph.type === "holdFull") level = 1;
      else if(ph.type === "out") level = 1 - frac;
      else if(ph.type === "breathPrep") level = frac;
      else level = 0; // holdEmpty

      setWaterLevel(level);
    } else {
      // Dial logic: a phase of 60s or less fills over its own full duration; a longer phase
      // loops every 60s and advances the minute markers each time a lap completes.
      var isCountUp = proto.kind === "apnea" && ph.type === "hold";
      var lapFrac, digitSec, minuteCount, lapElapsedMs, lapTotalMs;
      if(ph.dur <= 60){
        lapFrac = ph.dur > 0 ? elapsed / ph.dur : 1;
        digitSec = isCountUp ? Math.floor(elapsed) : Math.ceil(remaining);
        minuteCount = 0;
        lapElapsedMs = elapsed * 1000;
        lapTotalMs = ph.dur * 1000;
      } else {
        var mod = elapsed % 60;
        lapFrac = mod / 60;
        digitSec = isCountUp ? Math.floor(mod) : Math.ceil(Math.min(remaining, 60 - mod));
        minuteCount = Math.floor(elapsed / 60);
        lapElapsedMs = mod * 1000;
        lapTotalMs = 60000;
      }
      lapFrac = Math.max(0, Math.min(1, lapFrac));

      setPieSector(lapFrac, PHASE_COLORS[ph.type]);

      // Cross-fade opacity across a lap boundary instead of letting the wedge/digit
      // pop back to their start state in one frame.
      var FADE_MS = 160;
      var fadeOpacity = 1;
      if(lapElapsedMs < FADE_MS) fadeOpacity = lapElapsedMs / FADE_MS;
      else if((lapTotalMs - lapElapsedMs) < FADE_MS) fadeOpacity = (lapTotalMs - lapElapsedMs) / FADE_MS;
      fadeOpacity = Math.max(0, Math.min(1, fadeOpacity)).toFixed(2);
      pieSector.style.opacity = fadeOpacity;
      clockDigitFadeEl.style.opacity = fadeOpacity;
      posMarksG.style.opacity = fadeOpacity;

      var digitStr = String(digitSec);
      digitUnsweptEl.textContent = digitStr;
      digitSweptEl.textContent = digitStr;
      setDigitClip(lapFrac);

      if(minuteCount !== state.lastMinuteCount){
        renderPosMarks(minuteCount, PHASE_COLORS[ph.type]);
        if(minuteCount > 0 && proto.kind === "apnea" && ph.type === "hold") minuteBeep();
        state.lastMinuteCount = minuteCount;
      }

      if(state.sessionTotal > 0){
        var sessionElapsed = (performance.now() - state.sessionStart) / 1000;
        setSessionArc(sessionElapsed / state.sessionTotal);
      }
    }

    var rem = Math.ceil(remaining);
    var isApnea = proto.kind === "apnea";
    var leadsIntoHold = next && next.type === "hold";

    if(proto.kind === "breath"){
      // no per-second tick in breath mode — only the phase-change beep (advancePhase) plays
    } else if(isApnea && ph.type !== "hold" && leadsIntoHold){
      // décompte vocal avant une apnée : 30, 10, puis 5-1
      var vAt = [30, 10, 5, 4, 3, 2, 1];
      for(var vi = 0; vi < vAt.length; vi++){
        var vv = vAt[vi], vk = "v" + vv;
        // le mot démarre exactement quand le chiffre affiché passe à vv
        if(!state.beepedAt[vk] && remaining <= vv + VOICE_LEAD && remaining > vv - 1){
          state.beepedAt[vk] = true;
          playVoice(String(vv));
        }
      }
    } else if(!(isApnea && ph.type === "hold")){   // pendant l'apnée : seulement le bip de chaque minute (plus haut)
      if(rem <= 3 && rem >= 1 && !state.beepedAt[rem]){
        state.beepedAt[rem] = true;
        tickBeep();
      }
    }

    if(remaining <= 0){
      advancePhase();
      if(state.running) state.raf = requestAnimationFrame(loop);
    } else {
      state.raf = requestAnimationFrame(loop);
    }
  }

  function finishSession(){
    state.running = false;
    releaseWake();
    runEl.classList.remove("active");
    doneEl.classList.add("active");
    var proto = PROTOCOLS[state.protocol];
    var unit = proto.kind === "breath" ? "cycle" : "round";
    doneSummary.textContent = proto.name + " · " + state.totalRounds + " " + unit + (state.totalRounds > 1 ? "s complétés" : " complété");
    var isCarre = state.protocol === "carre";
    document.getElementById("doneLogo").style.display = isCarre ? "block" : "none";
    var isO2 = state.protocol === "o2";
    document.getElementById("doneO2").style.display = isO2 ? "block" : "none";
    var isCO2 = state.protocol === "co2";
    document.getElementById("doneCO2").style.display = isCO2 ? "block" : "none";
    document.getElementById("doneDiver").style.display = (isCarre || isO2 || isCO2) ? "none" : "block";
    window.ApneeAudio.finBulles(getCtx());
    buzz([120, 80, 120, 80, 250]);
  }

  function stopSession(){
    state.running = false;
    if(state.raf) cancelAnimationFrame(state.raf);
    releaseWake();
    stopVoices(); if("speechSynthesis" in window){ try{ speechSynthesis.cancel(); }catch(e){} }
    runEl.classList.remove("active");
    setupEl.classList.remove("hidden");
  }

  // Stop : fige la séance à l'écran ; le bouton devient « Réinitialiser ».
  function freezeSession(){
    state.running = false;
    if(state.raf) cancelAnimationFrame(state.raf);
    pauseBtn.textContent = "Réinitialiser";
    releaseWake();
    stopVoices(); if("speechSynthesis" in window){ try{ speechSynthesis.cancel(); }catch(e){} }
  }

  // ---------- events ----------
  tabsEl.addEventListener("click", function(e){
    var btn = e.target.closest(".tab");
    if(!btn) return;
    if(btn.dataset.protocol === "chrono"){
      if(runEl.classList.contains("active")) stopSession();
      showChrono(true);
      renderTabs();
      return;
    }
    if(chronoOn) showChrono(false);
    if(runEl.classList.contains("active")) stopSession();   // exercice en cours : on réinitialise
    if(doneEl.classList.contains("active")){ doneEl.classList.remove("active"); setupEl.classList.remove("hidden"); }
    state.protocol = btn.dataset.protocol;
    state.view = "list"; state.cur = -1;
    renderTabs();
    renderSetup();
  });

  pauseBtn.addEventListener("click", function(){
    if(state.running) freezeSession(); // Stop : fige la séance
    else stopSession();                // Réinitialiser : retour au réglage
  });
  doneBackBtn.addEventListener("click", function(){
    doneEl.classList.remove("active");
    setupEl.classList.remove("hidden");
  });

  // ---------- init ----------
  // retour dans l'app (iPhone) : relance le son mis en veille et garde l'écran allumé pendant la séance
  document.addEventListener("visibilitychange", function(){
    if(document.hidden) return;
    if(actx) window.ApneeAudio.resume(actx);
    if(state.running) requestWake();
  });
  try{
    var bgObs = new MutationObserver(applyBg);
    bgObs.observe(runEl, {attributes:true, attributeFilter:["class"]});
    bgObs.observe(doneEl, {attributes:true, attributeFilter:["class"]});
  }catch(e){}
  renderTabs();
  renderSetup();
})();
