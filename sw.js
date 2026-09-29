// Service worker : garde toute l'app en mémoire pour qu'elle marche sans réseau.
// Le numéro de version vient de js/version.js : augmenter APP_VERSION (ou APP_BUILD pour une retouche) à chaque mise à jour.
importScripts("js/version.js");
var VERSION = "apnee-v" + APP_VERSION + "-" + APP_BUILD;
var FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/fonts.css",
  "css/style.css",
  "js/version.js",
  "js/audio.js",
  "js/app.js",
  "js/chrono.js",
  "js/voices.js",
  "fonts/baloo-2.woff2",
  "fonts/jetbrains-mono.woff2",
  "fonts/onest.woff2",
  "img/piscine.jpg",
  "img/plongeur-carre.png",
  "img/plongeur-co2.png",
  "img/plongeur-hiit.png",
  "img/plongeur-o2.png",
  "icons/favicon.png",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png"
];

self.addEventListener("install", function(e){
  // cache:"reload" : toujours télécharger les fichiers frais, jamais une copie gardée par le navigateur
  var reqs = FILES.map(function(f){ return new Request(f, {cache:"reload"}); });
  e.waitUntil(caches.open(VERSION).then(function(c){ return c.addAll(reqs); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== VERSION; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

// Fichiers de l'app : d'abord la copie en mémoire, sinon le réseau.
self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, {ignoreSearch:true}).then(function(hit){
    return hit || fetch(e.request);
  }));
});
