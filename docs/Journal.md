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
- 1.0 (fabrication 2) · Croix jaune de suppression d'une séance en gras, zone de toucher 48 × 48 px ; cadre du nom de séance à 30 % avec texte d'aide en blanc.

## 29/09/2026 — 1.0 (fabrication 3)

- Nouvelles valeurs par défaut (pour les nouvelles séances ; les séances déjà enregistrées ne changent pas) :
  - Respiration carrée : inspiration, rétentions et expiration à 0:05, 5 cycles.
  - Table CO2 : préparation 1:00, apnée 1:00, repos initial 0:45, diminution 0:10 (repos 0:45 → 0:35 → 0:25 → 0:15), 5 rounds.
  - Table O2 : préparation 1:00, apnée initiale 1:00, augmentation +0:15, repos 1:00, 5 rounds.
- Contrôle des réglages impossibles : si un repos CO2 tombe à 0:00 ou moins, ou si la dernière apnée O2 dépasse 10:00, un message jaune remplace la durée totale et « Démarrer » est grisé et bloqué. (Avant, le repos CO2 était discrètement ramené à 0:05.)
- Vérifié à 375×600 : le message tient sur 2 lignes et le bouton reste à l'écran.

## 15/11/2026 — 1.0 (fabrication 4)

- Fin d'apnée (tables O2 et CO2) : son bois à 10 s, puis à 5, 4, 3, 2, 1 s avant la fin (600 Hz) ; à la fin, le même son plus grave (480 Hz) suivi de 7 rebonds de plus en plus faibles et sourds (sonar). Il remplace le bip de transition et la voix « respirez ».
- Décompte vocal avant l'apnée : ajout du « 20 » (30, 20, 10, 5…1) ; toutes les voix réenregistrées, nettoyées et mises au même volume.
- Nouveau logo (cachalots).

## 16/11/2026 — 1.0 (fabrication 5)

- Page d'accueil : logo, titre et liste numérotée des entraînements (Respiration carrée, Table O2, Table CO2, HIIT Cardio, Chrono libre) à la place des onglets en haut d'écran. Reflets de l'eau (haut de la photo de piscine) en bas de l'accueil, avec un fondu progressif ; fond bleu nuit sur toutes les autres pages.
- Page « Mes séances » pour chaque entraînement (‹ Accueil) : les lignes rétrécissent quand les séances sont trop nombreuses pour tenir à l'écran.
- Réglages : retour « ‹ Séances » en haut, nom et réglages centrés, bouton Enregistrer / Démarrer en pastille blanche.
- Séance : bouton « ‹ Réglages » (arrête la séance), cadran agrandi ; toutes les étapes sont en décompte, y compris l'apnée (avant, le chiffre de l'apnée montait).
- Chrono libre : retour « ‹ Accueil ».
- Tests : séance complète dans chaque mode, sons de fin d'apnée au bon moment, toutes les pages à 375×667 et 390×844.

## 16/11/2026 — 1.0 (fabrication 6)

- Bips : tous les bips de l'app (changements d'étape, 3 dernières secondes, minutes, chrono libre, décompte de fin d'apnée) deviennent un bloc de bois aigu (720 Hz), recréé en synthèse d'après les blocs de GarageBand.
- Fin d'apnée : bloc de bois grave (560 Hz) suivi de 5 rebonds rapprochés (tous les 0,16 s) et d'une réverbération légère à queue longue (1,9 s), au lieu des 7 rebonds espacés.
- Accueil : les reflets de l'eau remontent en biais vers la droite jusqu'au niveau de « HIIT Cardio » et s'effacent à gauche sous « Chrono libre » (calculé selon la taille de l'écran) ; mention « ©Paquito Couet » en bas à droite.
- Tests : accueil à 375×667, 390×844 et 430×932 ; sons rendus sans erreur et au bon moment pendant une table CO2.
