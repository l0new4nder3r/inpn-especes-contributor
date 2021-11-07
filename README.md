# inpn-especes-contributor

## Introduction

_This web app is meant to be a presentation overlay for the "INPN Espèces" service (an official french application to help determine species from photographs, and aggragate data about their presence in France). For this reason, the contents of this readme file are in french_

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

Les observations sont affichées au fur et à mesure qu'elle sont récupérées, triées par défaut sur la dernière date de modification (descendante, utile pour savoir quelles observations ont été éventuellement validées récemment), mais il est possible de les trier par nombre de points (descendant), ou par date de création (descendante).

Lors d'un clic sur une observation, une vue détaillée apparait et permet d'avoir plus de détail.

Des statistiques sur la personne contributrice et les observations chargées sont aussi accessibles par un bouton.

## TODO

- revoir et améliorer l'interface:
  - responsive page principale tablette ou smartphone (@media css?)
  - responsive page détails
  - page de stats à rendre plus sexy
    - graphiques à revoir, libellé, couleurs?
    - deux colonnes ou une seule si pas la place?
    - ordre des items à revoir
  - responsive page de stats
  - stats accessibles par clic icone contributeur?
  - fenetre d'accueil avec infos en arrivant! possible de la retrouver avec bouton aide?
    - bienvenue, intro
    - ...
    - app pur web, rien de stocké côté serveur, etc etc.
    - lien vers github dedans?
    - infos lib utilisées, leaflet, char.js ...
    - mail de contact

- ajout info groupe général / opérationnel, icones page principale, page détails
- filtre (tiroir caché à gauche?) sur groupes opérationnels

- tris des observations : possibilité de jouer montant/descendant?

- stats : ajouter obs par groupe opérationnel ou général?

- code : refactoring!
- code : optimisations (une seule itération stats?)
- code : un seul fichier js!

- FIX : souci de chargement KO si loadAll changement de contributeur?

- décompiler appli android pour chercher traces autres API/filtres/tri?
  - une API existe-t-elle avec un tri par modification possible?

- sélection d'un contributeur autrement? Nom, liste/rang?

- mode connecté? intérêt, données en plus?

- possibilité de garder des observations en "fav" pour un user donné, stockage local ou cookie?
