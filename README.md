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

Des statistiques sur la personne contributrice et les observations chargées sont aussi accessibles par un bouton.

## TODO

- revoir et améliorer l'interface:
  - responsive page principale tablette ou smartphone (@media css?)
    - ipad Air : menu KO, obs hauteur ko (largeur x3 bof) filters ko
    - obs : si écran large, découpage en 4 sinon en 2 ?
  - responsive popin détails
    - ipad air : ko
  - responsive popin de stats
    - ipad air : ko graphs cassés
  - page de stats à rendre plus sexy
    - graphiques à revoir, libellé, couleurs?

- Static map ids/values des groupes opérationnels?

- infos pour les espèces protégées, en danger? Savoir si une est en danger ou pas par exemple, infos dans le détail d'une obs. API clic détail obs.
  => ajouter détail en dur https://fr.wikipedia.org/wiki/Statut_de_conservation

- espèce "rare"? Moins de x sur determinobs? (possible?)

- animation de chargement : quelque chose de plus heureux dans la barre de progression

- Interface!
  - bouton mettre à jour pour updater les observations (1 par 1)
    - gérer l'update
  - Aussi : griser boutons si user pas chargé, arranger détails contributeur si pas chargé...
  - try and catch pour load some more et load all ?
  - remontée : remplacer par JS, prévenir le "précédent"

- tris des observations : possibilité de jouer montant/descendant? Interface? Flèches haut/bas?

- loupe : correction si image clippée?!

- stats :
  - pourcentage d'erreur dans le temps? "amélioration" ou pas?
  - propositions de noms d'espèces (si augmente ou pas) dans le temps
  - propositions et erreurs par go ?

- tester si erreur timeout, gestion des soucis de connexion. messages, etc?
  - alert "Les APIs de l'INPN semblent mettre du temps à répondre. Réessayez ultérieurement"
  - test fetch avec timeout de 15s!

- code : optimisations (une seule itération dans les stats?). utile?!

- FIX : prévenir les doublons au chargement si soucis de connexion ou quoi... if avant de push
  => map globale? id en clef, obj en valeur. push dedans si pas id seulement...?
  => ok pour itérations? index à revoir au passage?

- sélection d'un contributeur autrement? Nom, liste/rang? Pas trouvé comment?

- gestion param/url/précédent?

- possibilité de garder des infos, stockage local ou cookie?
  - observations en "fav" pour un user donné
  - date de dernière modif, une fois tout chargé, possibilité de pastilles si mises à jour?

- PWA ?
