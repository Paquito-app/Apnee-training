# Journal

## 29/09/2026
- Récupération de l'app depuis claude.ai (version du 29/09).
- Découpage en fichiers : `index.html`, `css/`, `js/`, `img/`.
- Nettoyage du code inutilisé, image en double supprimée.
- Compteurs remis à zéro (données locales `apnee.v1.*`).
- Écran de fin : « cycles » pour la respiration carrée, singulier/pluriel.
- L'app s'ouvre toujours sur la respiration carrée.
- Projet rangé dans le coffre Obsidian et relié au dépôt GitHub.
- Mise en ligne sur GitHub Pages : https://paquito-app.github.io/Apnee-training/
- Icône de l'app (logo plongeuse) pour l'écran d'accueil et l'onglet.
- Mode hors-ligne complet : polices intégrées, service worker `apnee-v1`, manifeste d'installation.
- Son sur iPhone : session audio en mode « lecture » (sons même avec le bouton silencieux) et relance du son au retour dans l'app (`js/audio.js`).
- Chrono libre : le cadran s'adapte à la hauteur de l'écran, tout tient sans défiler.
- Service worker `apnee-v2`.
- Un seul son de bip partout (880 Hz court, celui des 3 dernières secondes) : changements d'étape, minutes d'apnée, fin de séance (3 bips), bips du chrono libre.
- Toutes les pages tiennent à l'écran sans défiler (espacements proportionnels à la hauteur, nom de la séance sur la ligne du haut). Vérifié de 375×600 à 430×932.
- Service worker `apnee-v3`.
- Correction mise à jour : le service worker téléchargeait parfois d'anciens fichiers gardés en cache par le navigateur (le nouveau bip n'arrivait pas sur l'iPhone). Téléchargement forcé des fichiers frais.
- Numéro de version affiché dans l'en-tête (`js/version.js`, v4), vérification des mises à jour à chaque retour dans l'app, rechargement automatique hors séance.
- v5 · Son de fin d'exercice : bulle qui remonte (grosse bulle grave étouffée + deux petites bulles), choisi parmi 3 propositions.
- v5 · Chrono libre plus grand : espaces resserrés entre cadran, bouton et temps, plus de taille maximale (cadran 285 → 343 px sur iPhone standard, 398 px sur grand iPhone).
- v6 · Volume des voix baissé de moitié (−6 dB, réglage `VOICE_VOLUME` dans `js/app.js`) pour être équilibré avec les bips et la bulle de fin. Mesure avant : voix ~2,5× plus fortes que le bip.
- v7 · Écrans avec la photo de piscine : cadres transparents (opacité 78 % → 40 %, flou 14 → 3 px) pour voir l'eau, textes gris éclaircis et soulignés d'une ombre douce pour rester lisibles.
- v8 · Écrans photo : cadres à 10 %, sans flou, sans bordure, sans ligne ni ombre ; textes secondaires en blanc (82 %) au lieu du gris (choix « E + textes blancs » parmi 5 propositions).
- v8 · Correction : des appuis rapides sur + / − sélectionnaient du texte (surbrillance, menu « Copier ») et pouvaient zoomer. Sélection de texte et zoom au double-tap désactivés hors champs de saisie.

## 29/09/2026 — Version 1.0

Première version partagée avec les apnéistes du club (numérotation remise à 1.0 ; les v2 à v8 ci-dessus étaient des versions de mise au point).

Scan de nettoyage et de stabilité :
- Supprimé : voix « 20 » jamais jouée (−26 Ko), variables et valeurs mémorisées jamais relues, branche de code vide, style de bouton inutilisé, identifiant inutile.
- Correction : après une séance terminée, toucher un autre onglet laissait l'écran de fin affiché par-dessus la liste.
- Stabilité : l'écran reste allumé quand on revient dans l'app pendant une séance ou un chrono ; une séance enregistrée avec un réglage manquant reprend la valeur par défaut.
- Tests : séance complète dans chaque mode (respiration carrée, HIIT, tables O2 et CO2) jusqu'à l'écran de fin, chrono et record, sans erreur ; toutes les pages tiennent à l'écran de 375×600 à 430×932.
