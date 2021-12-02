# inpn-especes-contributor

## Introduction

_This web app is meant to be a presentation overlay for the "INPN Espèces" service (an official french application to help determine species from photographs, and aggregate data about their presence in France). For this reason, the contents of this readme file are in french_

La consultation de l'application smartphone INPN espèces / détermin'Obs, ou du site web correspondant étant souvent très lente et peu pratique pour s'y retrouver dans les observations soumises et leurs statuts de validation, voici une tentative d'interface permettant de retrouver toutes les observations d'un user donné (par son ID) et surtout de pouvoir naviguer aisément dans les résultats et statistiques des observations, sans attente autre que celle d'un chargement initial.

## Fonctionnement

Cette application utilise les APIs (non documentées) du service existant (inpn.mnhn.fr) pour le chargement des observations.

Il s'agit d'une page web HTML/CSS/JS(Vanilla).

Elle démarre par défaut en chargeant les données de mon compte contributeur (_l0new4nder3r_, numéro d'identification 20784). Il est possible d'en changer par la suite.

En deux appels d'APIs, l'application est en mesure d'avoir quelques détails sur la personne contributrice, et sur le nombre d'observations totales envoyées (à potentiellement devoir charger).

Le chargement des observations se fait :
- soit progressivement (en arrivant en bas de page, plus de nouvelles observations sont chargées),
- soit par la récupération intégrale de toutes les observations (via clic sur un bouton).
Dans tous les cas, les résultats sont chargés 16 par 16, jusqu'à arriver au nombre total d'observations demandées.

Les observations sont affichées au fur et à mesure qu'elle sont récupérées, triées par défaut sur la date de création (descendante, celle de la réponse de l'API). Il est possible de changer ce tri, notamment par date de modification descendante, utile pour savoir quelles observations ont été éventuellement validées récemment. Il est aussi possible de les trier par nombre de points (descendant).

Lors d'un clic sur une observation, une vue détaillée apparait et permet d'avoir plus de détail.

Des statistiques sur la personne contributrice et les observations chargées sont aussi accessibles par un clic sur l'image de profil.

## TODO

### Revoir et améliorer l'interface

#### Responsiveness

page principale tablette ou smartphone (@media css?)
- ipad Air : menu KO, obs hauteur ko (largeur x3 bof) filters ko
- obs : si écran large, découpage en 4 sinon en 2 ?

Responsive popin détails
- ipad air : ko

Responsive popin de stats
- ipad air : ko graphs cassés

Détection "touch" js qui inhibe les hover? comportement bizarre sinon... Et loupe aussi?

#### stats

Page de stats à rendre plus sexy
- graphiques à revoir, libellé, couleurs?

#### page principale
- arranger détails contributeur si pas chargé...
- animation de chargement : quelque chose de plus heureux dans la barre de progression
- remontée : remplacer par JS, prévenir le "précédent" ? Rendre plus joli?
- comptes sur chaque filtre du nombre d'obs courantes concernées (potentiellement lourd?!)
- tris des observations : possibilité de jouer montant/descendant? Interface? Flèches haut/bas?
- ne garder qu'un seul bouton? charger qui devient mise à jour si total ok?
- gestion notifs si différences lors d'un update! score? date modif? pastilles si mises à jour
- améliorer/ajouter popin notif messages en bas à droite!

- FIX : si chargement en cours, changement user casse tout!

- fix : pointer-events none pour désac boutons : bof bof, ko sélection user / charger tout

### Coté code...
- refacto ? méthodes plus courtes, code redondant...
- gestion de la complexité!
- poser le html un max à part...
- try and catch pour load some more et load all ?
- Static map ids/values des groupes opérationnels?
- optimisations (une seule itération dans les stats?). utile?!
- prévenir les doublons au chargement si soucis de connexion - map globale? id en clef, obj en valeur. push dedans si pas id seulement ?

### New feature ideas ?
- Espèces "rares" (obs validées) dans les stats? (multiples appels à attendre, bof...)
- stats :
  - pourcentage d'erreur dans le temps? ("amélioration" ou pas?)
  - propositions de noms d'espèces (si augmente ou pas) dans le temps?
  - propositions et erreurs par go ?
- bouton "observation au hasard"? nombre random entre 1 et le max id data.

- gérer url... /inpn/obs_id si détail? à part, ou permet de charger 1 obs pour partage? Lien vers obs chez INPN partage?

- fav! coeur vide/plein 1 clic pour retrouver facilement obs. Retrouver ou/comment? Indépendant users?

- sélection d'un contributeur autrement? Nom, liste/rang? Pas trouvé comment?
- garder pseudos des contributeurs consultés pour listbox?

- API récupération de tous les id de data pour un user donné?
- API récupération data triées par date de dernière modif?
  	https://inpn.mnhn.fr/inpn-web-services/inpnespece/data?paginStart=1&paginEnd=16&filtreOrder=DESC&orderField=DATE_VALIDATION&idUtilisateur=20784
    DATE_MODIFICATION marche mais résultats KO... marche pas quoi.
    Totlines 1088 10 de trop, si "validation"?! (qui ne ramène que des validées, bof bof...)

- date de dernière modif, une fois tout chargé, possibilité de pastilles si mises à jour?
  -> reload : signe sur les obs mises à jour récemment... auto avec render? date > ? Ou autre?
  -> display message notif obs mise à jour ; clic dessus = load details? + disparait

- PWA ?
