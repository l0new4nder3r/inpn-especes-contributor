/* Single observation display, from shared link */

import * as Utils from "./utils.js";
import { getOneObservation, inpnUrlBase, TIMEOUT } from "./inpn.js";
import * as Details from "./observationDetails.js";

/* eslint no-console: 0 */
const isTouchDevice = Utils.isMobileDevice ();

window.onload = function () {
    loadAll();
};

async function loadAll () {

    const queryString = window.location.search;
    // ?id=xxx
    const urlParams = new URLSearchParams(queryString);

    let observationId;
    if (urlParams.has("random") && urlParams.get("random")==="true") {
        observationId = await getValidRandomObservationId ();
    }

    if (urlParams.has("id")) {
        observationId = urlParams.get("id");
        // console.log("obs id is "+obsId);
    }

    if (observationId!=null) {
        // load obs
        const obs = await getOneObservation(observationId);
        if (obs!=null) {
            // console.log(obs);
            // display obs in "main" part
            displayObservation(obs);

            // get associated user
            const userId = obs.idUtilisateur;
            const urlContributor=inpnUrlBase+"users/"+userId;
            const contributor = await Utils.callAndWaitForJsonAnswer(urlContributor, TIMEOUT);
            addUserDetails(contributor);
        } else {
            alert("Erreur lors du chargement de l'observation pour l'ID "+observationId);
        }
    } else {
        alert("Aucun identifiant d'observation n'a été passé en paramètre :()");
    }
}

function displayObservation (obs) {
    const main = document.getElementById("main");
    Details.initObservationContent(obs,main);
    Details.showSlides(Details.slideIndex);
    if (isTouchDevice) {
        document.querySelector(".toggleMagnify").style.visibility="collapse";
    }
    Details.displayMap(obs.location.y,obs.location.x);
    Details.addScoreDetails(obs.idData);
    Details.addProtectionStatus(obs.cdRef);
    Details.addRareSpeciesInfo(obs);
    Details.addQuestData(obs);
    main.style.cursor="unset";
    document.getElementById("closeDetails").remove();
}

async function addUserDetails (contributor) {

    // just after popintop at the end add a div with user infos
    const popinTop = document.querySelector(".popinTop");

    const randomNext = await getValidRandomObservationId();
    const randomDivContent = `<a href="singleObs.html?id=${randomNext}" class="random" title="Consulter une observation au hasard!">🎲</a>`;
    popinTop.insertAdjacentHTML("beforeend", randomDivContent);

    const userDivContent = "<div class=\"user\"></div>";
    popinTop.insertAdjacentHTML("beforeend", userDivContent);

    const userDiv = document.querySelector(".user");

    if (contributor!=null) {
        const userInTop = `<div title="${contributor.prenom} ${contributor.nom}" class="pseudo singlePseudo">${contributor.pseudo}</div>`;
        userDiv.insertAdjacentHTML("beforeend", userInTop);

        const userScore = `<div class="totalScore singleScore">${contributor.ScoreTotal} points</div>`;
        userDiv.insertAdjacentHTML("beforeend", userScore);

        // link to inpn page, on user picture
        const userPicture = `<img id="profilePicSingle" alt="contributor profile picture" src="${contributor.avatar}">`;
        const userLink = `<a href="/${Utils.getUrlPath()}/index.html?userId=${contributor.idUtilisateur}" target="_blank" title="Consulter toutes les observations de ${contributor.pseudo} (nouvelle page)">${userPicture}</a>`;
        userDiv.insertAdjacentHTML("beforeend", userLink);
        const profPic = document.getElementById("profilePicSingle");
        profPic.style.width=profPic.clientHeight+"px";

        // adding number of validated obs as a tooltip for score
        // validated obs API call
        const urlValidatedObservations="https://inpn.mnhn.fr/inpn-especes/data/validation?page=0&size=1&filtreStatutValidation=5&userIds="+contributor.idUtilisateur+"&sort=-datePublished";
        const response = await Utils.callAndWaitForJsonAnswer(urlValidatedObservations, TIMEOUT);
        let obsValidatedCount;
        if (response!=null && response.page!=null && response.page.totalElements!=null) {
            obsValidatedCount=response.page.totalElements + " observations validées";
        } else {
            obsValidatedCount="Erreur au chargement du nombre d'observations validées :(";
        }
        document.querySelector(".totalScore").title=`${obsValidatedCount}`;
    } else {
        userDiv.insertAdjacentHTML("beforeend", "<div class=\"pseudo singlePseudo\">Erreur lors du chargement de l'utilisateur&middot;trice</div>");
    }
}

async function getValidRandomObservationId () {
    let observationId;
    while (observationId==null) {
        // get a random number between one and a million
        // TODO : quickly get the max id from current apis?
        const randomId = getRandomInt(1,1000000);

        // test if it matches an existing observation
        if (await exists(randomId)) {
            observationId = randomId;
        }
    }
    return observationId;
}

async function exists (observationId) {
    const getOneUrl=inpnUrlBase+"data/"+observationId;
    const randomObservation = await Utils.callAndWaitForJsonAnswer(getOneUrl, TIMEOUT);
    // console.log(randomObservation);
    let exists=false;
    if (randomObservation!==undefined) {
        if (randomObservation.status!=null && randomObservation.status===404) {
            exists=false;
        } else if (randomObservation.status==null) {
            exists=true;
        }
    }
    return exists;
}

// stolen from here https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomInt (min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
    //The maximum is exclusive and the minimum is inclusive
}
