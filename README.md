# inpn-especes-contributor

## Introduction

_This web app is meant to be a presentation overlay for the "INPN Espèces" service (an official french application to help determine species from photographs, and aggregate data about their presence in France). For this reason, the contents of this readme file are in french_

La consultation de l'application smartphone INPN espèces / détermin'Obs, ou du site web correspondant étant souvent très lente et peu pratique pour s'y retrouver dans les observations soumises et leurs statuts de validation, voici une tentative d'interface permettant de retrouver toutes les observations d'un user donné (par son ID) et surtout de pouvoir naviguer aisément dans les résultats et statistiques des observations, sans attente autre que celle d'un chargement initial.

## Fonctionnement

Cette application utilise les APIs (à ma connaissance non documentées) du service existant (inpn.mnhn.fr) pour le chargement des observations.

Elle est principalement constituée d'une page web HTML/CSS/JS(Vanilla), en index.

### Page principale

[Consultation des observations d'une personne](https://www.nbuchon.me/inpn/)

Elle démarre par défaut en chargeant les données de mon compte contributeur (_l0new4nder3r_, numéro d'identification 20784). Il est possible d'en changer par la suite.

En deux appels d'APIs, l'application est en mesure d'avoir quelques détails sur la personne contributrice, et sur le nombre d'observations totales envoyées (à potentiellement devoir charger).

Le chargement des observations se fait :
- soit progressivement (en arrivant en bas de page, plus de nouvelles observations sont chargées),
- soit par la récupération intégrale de toutes les observations (via clic sur un bouton),
- soit, s'il reste une trace des ids d'observations dans le cache du navigateur, par rechargement de ces observations connues.

Dans les deux premiers cas, les résultats sont chargés 16 par 16, jusqu'à arriver au nombre total d'observations pour l'utilisateur choisi.

Les observations sont affichées au fur et à mesure qu'elle sont récupérées, triées par défaut sur la date de création (descendante, celle de la réponse de l'API). Il est possible de changer ce tri, notamment par date de modification descendante, utile pour savoir quelles observations ont été éventuellement validées récemment. Il est aussi possible de les trier par nombre de points (descendant).

Lors d'un clic sur une observation, une vue détaillée apparait et permet d'avoir plus de détails.

Des statistiques sur la personne contributrice et les observations chargées sont aussi accessibles par un clic sur l'image de profil.

Il est possible de partager un lien (copie dans le "presse-papier") en un clic à partir de la vue "détails" d'une observation.

### Affichage d'une observation

A partir du lien copié précédemment, il est possible d'accéder à une page de consultation d'une observation unique, renseignée à partir de son identifiant unique.

[Consultation d'une observation](https://www.nbuchon.me/inpn/singleObs.html?random=true)

Cette page affiche une observation précise, ainsi que des informations sur la personne qu'il l'a soumise, et un lien vers la page de consultation principale de toutes ses observations.

Il est aussi possible d'afficher une autre observation "au hasard" par une icône dédiée.


## Travail en cours, choses à faire

* Mettre à jour ce fichier périmé
* corriger les bugs:
  * obs en statut init = date en 1970
  * mise à jour impossible ou non affichée une fois l'obs en init validée

### Revoir et améliorer l'interface

#### Responsiveness

Tout se comporte plutôt bien sur un écran large d'un navigateur récent d'un ordinateur, fixe ou portable.

Les choses se compliquent grandement sur smartphone ou tablette... Rien n'est adapté.

En plus de devoir gérer autrement les tooltips/messages d'information et une alternative aux clics ("touch"), il faudrait revoir le menu, la disposition, les colonnes de la liste d'observations ; en travaillant peut-être avec les annotations "@media" en CSS ?

WIP - A tester mieux pour définir ce qui ne va pas, pourrait mieux aller :

* page principale
  * ipad Air : menu KO, obs hauteur ko (largeur x3 bof) filters ko
  * obs : si écran large, découpage en 4 sinon en 2 ?

* Responsive popin détails
  * ipad air : ko

* Responsive popin de stats
  * ipad air : ko graphs cassés

Attention, la détection "touch" en JS inhibe les "hover"? Comment gérer cela? Plusieurs choses ne fonctionnent pas en tactile, comme la loupe - les enlever si mode tactile détecté, dans l'attente d'une alternative?

#### Accessibilité

Beaucoup à étudier là encore, probablement... :(
Couleurs de statut à repenser (intuitif, mieux pour malvoyants ou daltoniens-nes?).
Alt text pour les images.


#### Statistiques

A rendre plus sympa visuellement. Couleurs des graphiques à revoir/harmoniser, dernier graphique à rendre plus lisible (simplifier, élargir, grouper par périodes dynamiquement, rendre défilable en largeur?).

Corriger les multiples incohérences nombre d'observations validées !

#### Page principale

Problèmes à travailler, corrections à effectuer :
* Premier appel pour le score et les détails, API changée, à corriger/revoir ?
* Informations de quêtes / points à part / lien vers les quêtes ?
* Liens vers page officielles pour user, observation, etc ?
  * [Exemple de lien vers une observation](https://determinobs.fr/#/observations/421087)
  * [Exemple de lien vers un observateur](https://determinobs.fr/#/observateurs/5931)
* Arranger les détails d'un contributeur au souci d'un chargement (cassé pas beau)
* Animation de chargement : quelque chose de plus heureux dans la barre de progression ?
* Remontée : remplacer par du JS, pour prévenir le comportement "précédent" ? Et/ou rendre plus joli ?
* Compter pour chaque filtre le nombre d'obs courantes concernées (potentiellement lourd?!) - en tooltip ?
* Tris des observations : possibilité de jouer montant/descendant? Avec quelle interface? Flèches haut/bas ?
* Ne garder qu'un seul bouton? "Charger" qui devient "Mise à jour" si le total est ok ?
* Gestion de nouvelles notifications, si différences trouvées lors d'un update
  * Le gérer à partir d'une modification du dernier score enregistré, ou de la dernière date de modification mémorisée?
  * Permettrait de mettre des pastilles de "changement" sur les observations dont les détails ont changé depuis la dernière fois.
  * Au rechargement, "render" ajoute pastille sur les obs mises à jour récemment (date modification > précédente enregistrée)
  * Clic sur détail = supprime notif (mais gestion d'une liste des ids d'obs avec modif récente - juste mémoire, ou stockage local aussi?)
  * Quelle possibilité pour enlever toutes les pastilles sans tout cliquer?
  * Attention au premier chargement à ne pas avoir ces pastilles partout.
* Améliorer les notifications de messages en bas à droite - disparition auto au bout de 30 sec, sauf pour la dernière, sauf si erreur ?
* Lors d'un chargement en cours, le changement de user casse tout!? A reproduire, et si confirmer, empêcher - stopper les chargements avant ? Devrait être le cas en théorie...
* "Pointer-events: none;" pour désactiver les boutons : bof bof, ko sélection user / charger tout à reprendre. Juste faire bouton qui ne réagit plus ? Signifierait pas de changement de couleur "onclick"? Ou du rouge pour montrer que ne fait rien ou ne marche pas ?
* Si "timeout" appel pendant chargement, tout casse, l'animation continue, etc. try/catch et gestion de la situation !
* Si "timeout" à un moment du chargement, lancer une pop-up rouge d'erreur "l'INPN met trop de temps à répondre" ou quelque chose du genre.

### Coté code...

Ca avance, mais à poursuivre :
* Unit tests ? Possibles, souhaitables ?
* Refacto - méthodes plus courtes, code redondant
* Continuer à séparer le html un max
* Try/catch pour "load some more" et "load all" ?
* Static map avec les "ids/values" des groupes opérationnels ? Ou meilleure source sans faute ?
* Possibilités de chargements en // encore plus ? Plusieurs threads pour les chargements groupés ?
* Lint pour css, html?

### New features  - idées à creuser, ou pas

A réfléchir :
* Stats :
  * WIP - Pourcentage d'erreur dans le temps ? ("amélioration" ou pas ?)
  * WIP - Propositions de noms d'espèces (si augmente ou pas) dans le temps ?
  * Propositions et erreurs par groupe opérationnel ?
* Observations favorites !
  * Coeur vide/plein 1 clic pour retrouver facilement certaines observations.
  * Retrouver où/comment?
  * Indépendant du(des) user(s) chargés ?
* Sélection d'un contributeur autrement? Par nom, pseudo, liste/rang ? Bof...
* Garder pseudos des contributeurs consultés pour proposition dans une liste de sélection multiple ?

A surveiller, chercher si jamais... Reverse-engineering :
* API récupération de tous les id de data pour un user donné ?
* API récupération data triées par date de dernière modif ?
  * [Ceci?](https://inpn.mnhn.fr/inpn-especes/data?page=0&size=24&filtreStatutValidation=5&userIds=20784&sort=-datePublished)
  * A tester !

A envisager un jour, mais nécessite de savoir mieux ce que c'est, ce que ça représente : transformer en "Progressive Web App" ?
