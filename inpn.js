/* Common file, loading, main functions */
import * as Utils from "./utils.js";
import { showDetails } from "./observationDetails.js";
import { buildStats } from "./contributorStats.js";

/* eslint no-console: 0 */

export const inpnUrlBase = "https://inpn.mnhn.fr/inpn-web-services/inpnespece/";
export let USER_ID;

// latest obs
export let latestObs;
// global list of observations to gather
export let listObservations;
// contributor info
export let currentContributor;
// index current loading page
let index;
// is loading on?
let isMoreLoadingOn = false;
let isLoopLoadingOn = false;
// observer bottom page
let observer;
// filtres affiché
let areFiltersDisplayed = false;
// tris affichés
let areSortersDisplayed = false;
// Timout constant for API calls
export const TIMEOUT = 30000;
const isTouchDevice = Utils.isMobileDevice ();
// Are all obs downloaded?
let allDownloaded = false;

const LOAD_OBS = "⇩ Charger";
const UPDATE_OBS = "↺ Mettre à jour";

/***
**
**  Page Loading!
**
****/

// loading the observations at startup
window.onload = function () {
    // will not display the text, but warn the user before closing the tab
    window.onbeforeunload = function () {
        return "Êtes-vous certain de vouloir quitter cette page? Il faudra potentiellement tout recharger.";
    };
    loadAll();
};

async function loadAll () {
    initListeners();
    Utils.initInputKeyPress();

    loadUserId();

    toggleAllNoneButtonsByFamily("go");
    toggleAllNoneButtonsByFamily("status");
    deactivateBtn("loadAll");
    document.getElementById("upwards").style.opacity = "0";

    const helpClosed = await Utils.checkHelpCookie();
    if (helpClosed != null && helpClosed !== "true") {
        showHelp();
    }
    await loadContributor();
    if (currentContributor != null) {
        // console.log("contrib ok");
        Utils.addNotification("success","Succès","Utilisateur&middot;trice "+currentContributor.pseudo+" chargé&middot;e");
    } else {
        Utils.addNotification("","Echec","Erreur lors du chargement de l'utilisateur&middot;trice "+USER_ID);
    }

    await loadLatestObs();
    if (latestObs!=null) {
        // console.log("latestObs ok");
        if (latestObs.totLines>0 && latestObs.totLines>listObservations.observations.length) {
            Utils.addNotification("success","Succès","Première observation chargée. Nombre total d'observations restant : "+(latestObs.totLines-1));
        } else {
            Utils.addNotification("success","Succès","Toutes les "+(latestObs.totLines-1)+" observations ont été chargées.");
            allDownloaded=true;
            activateUpdateAllButton();
        }
    } else {
        Utils.addNotification("","Echec","Erreur lors du chargement de la dernière observation");
    }

    // WIP
    const userData = Utils.getFromLocalStorage(currentContributor.idUtilisateur);
    let pastIds;
    if (userData!=null) {
        pastIds = userData.ids;
    }
    // let pastIds = getFromLocalStorage('ids');
    if (pastIds!=null) {
        Utils.addNotification("info","Information",pastIds.length+" observations déjà connues sur ce navigateur sont en cours de téléchargement");
        startProgressAnimation();
        await updateObsFromStorageIds(pastIds);
        stopProgressAnimation();
        Utils.addNotification("success","Succès",listObservations.observations.length+" observations rechargées");
    } else {
        await loadSomeMore();
        // console.log("more ok");
        activateBtn("loadAll");
        document.getElementById("loadAll").title=`Cliquer ici pour charger toutes les observations de ${currentContributor.pseudo}`;
        document.getElementById("loadAll").innerHTML = LOAD_OBS;
    }

    createObserver();
    // console.log("observer ok");
}

async function loadUserId () {
    const queryString = window.location.search;
    console.log(queryString);
    // ?userId=xxx
    const urlParams = new URLSearchParams(queryString);
    if (urlParams.has("userId")) {
        USER_ID = urlParams.get("userId");
    } else {
        const contributorIdFromCookie = await Utils.checkContributorCookie();
        if (contributorIdFromCookie!=="") {
            USER_ID = contributorIdFromCookie;
        } else {
            // defaulting to l0new4nder3r profile for example
            USER_ID = 20784;
        }
    }
}

function initListeners () {
    // TODO constants arrays, functions...
    document.querySelector("#loadAll").addEventListener("click", loadOrUpdate);
    document.querySelector("#toggleLeftFilters").addEventListener("click", toggleLeftFilters);
    document.querySelector("#toggleRightSorters").addEventListener("click", toggleRightSorters);
    document.querySelector("#help").addEventListener("click", showHelp);
    document.querySelector("#closeHelp").addEventListener("click", closeHelp);
    document.getElementById("111").addEventListener("change", filterObsGo);
    document.getElementById("148").addEventListener("change", filterObsGo);
    document.getElementById("154").addEventListener("change", filterObsGo);
    document.getElementById("158").addEventListener("change", filterObsGo);
    document.getElementById("501").addEventListener("change", filterObsGo);
    document.getElementById("502").addEventListener("change", filterObsGo);
    document.getElementById("504").addEventListener("change", filterObsGo);
    document.getElementById("505").addEventListener("change", filterObsGo);
    document.getElementById("506").addEventListener("change", filterObsGo);
    document.getElementById("24222202").addEventListener("change", filterObsGo);
    document.querySelector("#allGo").addEventListener("click", allGo);
    document.querySelector("#noneGo").addEventListener("click", noneGo);
    document.getElementById("0").addEventListener("change", filterObsStatus);
    document.getElementById("1").addEventListener("change", filterObsStatus);
    document.getElementById("2").addEventListener("change", filterObsStatus);
    document.getElementById("3").addEventListener("change", filterObsStatus);
    document.getElementById("4").addEventListener("change", filterObsStatus);
    document.getElementById("5").addEventListener("change", filterObsStatus);
    document.getElementById("6").addEventListener("change", filterObsStatus);
    document.getElementById("No").addEventListener("change", filterObsQuest);
    document.getElementById("Yes").addEventListener("change", filterObsQuest);
    document.querySelector("#allStat").addEventListener("click", allStat);
    document.querySelector("#noneStat").addEventListener("click", noneStat);
    document.getElementById("dateModif").addEventListener("change", sortObs);
    document.getElementById("dateCrea").addEventListener("change", sortObs);
    document.getElementById("points").addEventListener("change", sortObs);
    document.getElementById("contributorId").addEventListener("blur", changeContributor);
    if (isTouchDevice) {
        document.querySelector(".choice").addEventListener("click", openChoice);
    }
}

function openChoice (event) {
    const choiceDiv = event.target;
    if (choiceDiv.style.right==="-6em") {
        choiceDiv.style.right="0em";
    } else {
        choiceDiv.style.right="-6em";
    }
    //box-shadow: -10px 10px 0px -3px black;
}

function loadOrUpdate () {
    if (!allDownloaded) {
        loopLoading();
    } else {
        updateObservations();
    }
}

/***
**
**  Observer to control bottom (of page) obs loading behavior
**
****/

function createObserver () {
    const bottom= document.querySelector("#bottom");

    const options = {
        root: null,
        rootMargin: "0px",
        threshold: 0.5
    };

    if (observer==null) {
        observer = new IntersectionObserver(handleIntersect, options);
        observer.observe(bottom);
    }
}

async function loadMoreWaitAndRender (bottomDiv) {
    await loadSomeMore();
    // console.log("loadmorewaitrender done");
    bottomDiv.style.animationName="";
}

function handleIntersect (entries, observer) {
    entries.forEach((entry) => {
        if (entry.isIntersecting===true) {
            // console.log("intersecting!");
            const bottomDiv= document.getElementById("bottom");
            bottomDiv.style.animationName="bottomColorChange";

            // call more loading!
            loadMoreWaitAndRender(bottomDiv);
        }
    });
}

/***
**
**  INPN data loading and rendering
**
****/

async function loadContributor () {
    // url to load contributo info
    const urlContributor=inpnUrlBase+"contributor/"+USER_ID;
    console.log("loading contributor info from: "+urlContributor);
    //const urlValidatedObservations=inpnUrlBase+"data?paginStart=1&paginEnd=1&idUtilisateur="+USER_ID+"&filtreStatutValidation=5";
    const urlValidatedObservations="https://inpn.mnhn.fr/inpn-especes/data?page=0&size=1&filtreStatutValidation=5&userIds="+USER_ID+"&sort=-datePublished";

    async function renderContributor () {
        currentContributor = await Utils.callAndWaitForJsonAnswer(urlContributor, TIMEOUT);

        if (currentContributor==null) {
            alert("Erreur lors du chargement pour l'ID "+USER_ID);
        } else {
            let html = "";
            const htmlSegment = `<img id="profilePic" alt="contributor profile picture" src="${currentContributor.avatar}">
               <div title="${currentContributor.prenom} ${currentContributor.nom}" class="pseudo">${currentContributor.pseudo}</div>
               <div class="totalScore">${currentContributor.ScoreTotal} points</div>`;
            html += htmlSegment;
            html += "</div>";
            const container = document.querySelector(".contributorDetails");
            container.innerHTML = html;
            document.getElementById("profilePic").addEventListener("click",buildStats);

            const input = document.getElementById("contributorId");
            input.value=USER_ID;

            // adding number of validated obs as a tooltip for score
            // validated obs API call
            const response = await Utils.callAndWaitForJsonAnswer(urlValidatedObservations, TIMEOUT);
            let obsValidatedCount;
            if (response!=null && response.page!=null && response.page.totalElements!=null) {
                obsValidatedCount=response.page.totalElements + " observations validées";
            } else {
                obsValidatedCount="Erreur au chargement du nombre d'observations validées :(";
            }
            document.querySelector(".totalScore").title=`${obsValidatedCount}`;

            // user is now loaded, display buttons and tooltips
            document.getElementById("profilePic").title=`Cliquer ici pour afficher les statistiques de ${currentContributor.pseudo}`;
        }
    }
    await renderContributor();
}

async function loadLatestObs () {
    //url to load latest observation
    const urlLatestObservation=inpnUrlBase+"data?paginStart=1&paginEnd=1&idUtilisateur="+USER_ID;
    console.log("loading latest obs from: "+urlLatestObservation);

    async function renderLatestObs () {
        const observation = await Utils.callAndWaitForJsonAnswer(urlLatestObservation, TIMEOUT);
        if (observation!=null) {
            index = 1;
            latestObs = observation;
            // console.log("latestObs is set!");
            listObservations = observation;
            renderProgress();
        } else {
            alert("Erreur lors du chargement de la première observation. Veuillez réessayer ultérieurement");
        }
        await renderObs();
    }
    await renderLatestObs();
}

function renderProgress () {
    let size = 0;
    if (listObservations!=null&&listObservations.observations!=null) {
        size = listObservations.observations.length;
    }

    let percentage ="N/A";
    let total = "N/A";
    if (latestObs!=null&&latestObs.totLines!==0) {
        total = latestObs.totLines;
        percentage = (size/latestObs.totLines*100).toFixed(0);
    }

    if (currentContributor!=null) {
        const percentBar = document.getElementById("percentage");
        percentBar.style.width=(percentage+"%");
        const meter = document.querySelector(".meter");
        meter.title=`${percentage}% des observations chargées (${size} sur ${total})`;
    }
}

async function getAndAddAllObservations (url) {
    const observation = await Utils.callAndWaitForJsonAnswer(url, TIMEOUT);
    // add all
    if (observation==null) {
        alert("Erreur lors du chargement des observations. Veuillez réessayer ultérieurement");
    } else {
        // preventing duplicates in observations by idData
        observation.observations.forEach(newObs=>{
            if (!listObservations.observations.some(o => o.idData === newObs.idData)) {
                listObservations.observations.push(newObs);
            } else {
                console.log("No need to add obs id "+newObs.idData+" as it was already present in list");
            }
        });

        // listObservations.observations.push(...observation.observations);
        renderProgress();
    }
    return (observation!=null);
}

export async function loopLoading () {
    // loop load for current userId
    // console.log("Attempt at loop loading for: "+USER_ID);

    if (latestObs!=null) {

        if (isMoreLoadingOn) {
            console.error("Can't start loop loading : more loading in progress");
            alert("Veuillez attendre quelques instants que le chargement en cours se termine, avant de réessayer.");
        } else {
            const buttonLoadAll = document.getElementById("loadAll");
            if (isLoopLoadingOn) {
                // stop it!
                isLoopLoadingOn = false;
                // turn "load all" button to "pause"
                buttonLoadAll.innerHTML = LOAD_OBS;
                buttonLoadAll.title=`Cliquer ici pour charger toutes les observations de ${currentContributor.pseudo}`;
            } else {
                isLoopLoadingOn=true;
                // turn "load all" button to "pause"
                buttonLoadAll.innerHTML = "(mettre en pause)";
                buttonLoadAll.title=`Cliquer ici pour arrêter le chargement des observations de ${currentContributor.pseudo}. La progression ne sera pas perdue.`;
                buttonLoadAll.style.fontStyle="italic";

                startProgressAnimation();

                // looping
                for (index; index< latestObs.totLines; index=index+16) {
                    // could be stopped from elsewhere...
                    if (isLoopLoadingOn) {
                        let paginEnd=index+16;
                        if (paginEnd>latestObs.totLines) {
                            paginEnd=latestObs.totLines;
                        }
                        const paginStart = index+1;
                        const obsUrl=inpnUrlBase+"data?paginStart="+paginStart+"&paginEnd="+paginEnd+"&idUtilisateur="+USER_ID;
                        // console.log("loop : loading obs from "+obsUrl);

                        if (await getAndAddAllObservations(obsUrl)) {
                            // rendering
                            await renderObs();
                        } else {
                            // Error while loading : break
                            break;
                        }

                    } else {
                        break;
                    }
                }
                isLoopLoadingOn=false;
                // turn "load all" button back to normal

                // if not finished
                if (index< latestObs.totLines) {
                    buttonLoadAll.innerHTML = LOAD_OBS;
                    buttonLoadAll.title=`Cliquer ici pour charger toutes les observations de ${currentContributor.pseudo}`;
                } else {
                    allDownloaded = true;
                    activateUpdateAllButton();
                    Utils.addNotification("success","Succès","Toutes les "+latestObs.totLines+" observations ont bien été chargées.");
                }
                // trying to keep list ids storage
                saveCurrentUserDataInStorage();
                buttonLoadAll.style.fontStyle="unset";
                stopProgressAnimation();
            }
        }
    }
}

async function loadSomeMore () {
    // loop load for current userId
    // console.log("Attempt at more loading for: "+USER_ID);

    if (latestObs!=null && !isMoreLoadingOn && !isLoopLoadingOn) {

        if (listObservations.observations.length<latestObs.totLines && index<latestObs.totLines) {
            isMoreLoadingOn=true;
            startProgressAnimation();

            const paginStart = index+1;
            let paginEnd=index+16;
            if (paginEnd>latestObs.totLines) {
                paginEnd=latestObs.totLines;
            }
            const obsUrl=inpnUrlBase+"data?paginStart="+paginStart+"&paginEnd="+paginEnd+"&idUtilisateur="+USER_ID;
            // console.log("loadMore : loading obs from "+obsUrl);

            if (await getAndAddAllObservations(obsUrl)) {
                // rendering
                await renderObs();
                // incrementing for next call
                index = index+16;

            } else {
                // Error while loading
            }
            isMoreLoadingOn=false;
            stopProgressAnimation();

            // have we reached the end?
            if (index< latestObs.totLines) {
                // do nothing
            } else {
                allDownloaded=true;
                activateUpdateAllButton();
            }
            // list ids in localStorage
            saveCurrentUserDataInStorage();
        } else {
            // console.log("not loading any more, we reached the end!");
            allDownloaded = true;
        }
    } else {
        console.log("loading still in progress");
    }
}

function saveCurrentUserDataInStorage () {
    if (listObservations!=null && currentContributor!=null) {
        const ids = [];
        let lastModifDate;
        listObservations.observations.forEach(obs => {
            if (!ids.includes(obs.idData)) {
                ids.push(obs.idData);
            }
            if (lastModifDate==null && obs.dateModif != null) {
                lastModifDate = obs.dateModif;
            } else if (obs.dateModif != null && lastModifDate!=null && new Date(obs.dateModif)> new Date(lastModifDate)) {
                lastModifDate = obs.dateModif;
            }
        });
        const userData = {
            "ids": ids,
            "lastModifDate": lastModifDate,
            "score": currentContributor.ScoreTotal
        };
        console.log("Will attempt to save "+ids.length+" ids to localStorage");
        Utils.putInLocalStorage(currentContributor.idUtilisateur,userData);
    }
}

async function updateObsFromStorageIds (pastIds) {
    console.log("Found ids of obs previously loaded! Will try to update them");
    let pastIdsCount=0;
    let firstObsInPastIds=false;
    const idFirst = listObservations.observations[0].idData;
    for (const id of pastIds) {
    // do not want to duplicate the first previously loaded
        if (idFirst!==id) {
            const currObs = await getOneObservation(id);
            if (currObs!=null) {
                listObservations.observations.push(currObs);
                pastIdsCount++;
                if (pastIdsCount%10===0) {
                    await renderObs();
                    renderProgress();
                }
            } else {
                // error!
                Utils.addNotification("","Echec","Erreur lors du chargement de l'observation "+id);
                // TODO exception management...
                // + deal with stopping the following code
                break;
            }

        } else {
            console.log("Found idFirst in ids "+idFirst);
            firstObsInPastIds=true;
        }
    }

    // render progress, obs...
    await renderObs();
    renderProgress();
    // compare totLines, dateCreation max?
    console.log("On "+listObservations.totLines+" obs to load, "+listObservations.observations.length+" are currently displayed");
    // get the remaining obs (totLines helps? not? Load all modified to not add if id already present)
    if (listObservations.totLines>listObservations.observations.length) {
        let numberMissingObs = listObservations.totLines-listObservations.observations.length;
        if (firstObsInPastIds) {
            numberMissingObs++;
        }
        // we might have, in time :
        // latest (first) obs - missing obs? - obs already loaded by id - missing obs, never loaded?
        console.log("missing "+numberMissingObs+" obs");
        // starting at 2 because we already have the first obs
        let cpt = 2;
        let fastForward=false;
        for (cpt; cpt<= numberMissingObs+1; cpt=cpt+1) {

            const paginEnd=cpt;
            const paginStart = cpt;
            const obsUrl=inpnUrlBase+"data?paginStart="+paginStart+"&paginEnd="+paginEnd+"&idUtilisateur="+USER_ID;
            console.log("complete after storage ids : loading obs from "+obsUrl);

            const observation = await Utils.callAndWaitForJsonAnswer(obsUrl, TIMEOUT);
            // add all
            if (observation==null) {
                alert("Erreur lors du chargement des observations. Veuillez réessayer ultérieurement");
                break;
            } else {
                // preventing duplicates in observations by idData
                observation.observations.forEach(newObs=>{
                    if (!listObservations.observations.some(o => o.idData === newObs.idData)) {
                        listObservations.observations.push(newObs);
                    } else {
                        console.log("No need to add obs id "+newObs.idData+" as it was already present in list");
                        fastForward=true;
                    }
                });
                if (fastForward) {
                    break;
                }
                renderProgress();
            }
        }
        await renderObs();

        if (fastForward) {
            // means we can fast forward if still needed!
            if (listObservations.totLines>listObservations.observations.length) {
                // keep going. But let's bypass all the obs already loaded...
                let cptEnd = listObservations.observations.length+1;
                // 1 2 12 4.
                // 19>15 On veut charger de 19-4 à 19
                // (1) - (2 3) - 4 5 6 7 8 9 10 11 12 13 14 15 - 16 17 18 19

                for (cptEnd; cptEnd<= listObservations.totLines; cptEnd=cptEnd+1) {

                    const paginEnd=cptEnd;
                    const paginStart = cptEnd;
                    const obsUrlEnd=inpnUrlBase+"data?paginStart="+paginStart+"&paginEnd="+paginEnd+"&idUtilisateur="+USER_ID;
                    console.log("complete END after storage ids : loading obs from "+obsUrlEnd);

                    const observation = await Utils.callAndWaitForJsonAnswer(obsUrlEnd, TIMEOUT);
                    // add all
                    if (observation==null) {
                        alert("Erreur lors du chargement des observations. Veuillez réessayer ultérieurement");
                        break;
                    } else {
                        // preventing duplicates in observations by idData
                        observation.observations.forEach(newObs=>{
                            if (!listObservations.observations.some(o => o.idData === newObs.idData)) {
                                listObservations.observations.push(newObs);
                            } else {
                                console.log("Should not happen : no need to add obs id "+newObs.idData+" as it was already present in list");
                            }
                        });
                        renderProgress();
                    }
                }
                await renderObs();
            }
        }
        if (listObservations.totLines>listObservations.observations.length) {
            console.log("Something wrong happened, expected "+listObservations.observations.length+" but got "+listObservations.totLines+" observations?");
            // error?
            // activate load all button ?
            activateBtn("loadAll");
        } else {
            saveCurrentUserDataInStorage();
            allDownloaded = true;
            activateUpdateAllButton();
        }

    } else {
        allDownloaded = true;
        activateUpdateAllButton();
        // all loaded
    }
}

export function buildProgress (idStatus) {
    let html = "";
    if (idStatus==null) {
        html+="<span class=\"status99 done\">Erreur dans les données, validation vide</span>";
    } else if (idStatus===0 || idStatus===6) {
        html+=`<span class="status${idStatus} done">Erreur ou invalidée : ${idStatus}</span>`;
    } else {
        for (let i = 1; i < 6; i++) {
            let current = "";
            if (i<=idStatus) {
                current=" done";
            }
            html+=`<span class="status${i}${current}">${i}</span>`;
            if (i!==5) {
                html+="<span>&nbsp;&gt;&nbsp;</span>";
            }
        }
    }
    return html;
}

function detailsHandler (event) {
    // finding the parent div level
    let div;
    if (event.target.tagName!=="DIV" || event.target.id==="") {
    // one up
        const parent = event.target.parentElement;
        if (parent.tagName!=="DIV" || parent.id==="") {
            const grandParent = parent.parentElement;
            // cannot be upper
            div = grandParent;
        } else {
            div = parent;
        }
    } else {
        div = event.target;
    }
    // console.log(div);
    showDetails(div.id, isTouchDevice);
}

function renderObs () {

    if (listObservations!=null) {

        let sorted;
        if (document.getElementById("dateModif").checked) {
            //ordering by modif latest
            sorted = sortByModificationLatest(listObservations.observations);
        } else if (document.getElementById("dateCrea").checked) {
            //ordering by creation latest
            sorted = sortByCreationLatest(listObservations.observations);
        } else {
            // points
            sorted = sortByPoints(listObservations.observations);
        }

        let html = "";
        // no column, all in blocks
        sorted.forEach(obs => {
            let title = obs.nomComplet;
            if (title==="") {
                title="-";
            }
            const progress = buildProgress(obs.validation.idStatus);
            const creationDate = new Date(obs.dateCrea).toLocaleDateString("fr-FR");
            const creationTime = new Date(obs.dateCrea).toLocaleTimeString("fr-FR");

            let modificationDateTime="N/A";
            if (obs.dateModif!=="") {
                modificationDateTime = new Date(obs.dateModif).toLocaleDateString("fr-FR") +" à "+ new Date(obs.dateModif).toLocaleTimeString("fr-FR");
            }

            // let groupeSimpleSvgName='';
            // let groupeSimpleLabel='';
            // TODO load et const Array groupes simple/GP ?
            const groupesSimplesUnicode = new Map();
            groupesSimplesUnicode.set("111","&#128012;");
            groupesSimplesUnicode.set("148","&#128038;");
            groupesSimplesUnicode.set("154","&#129418;");
            groupesSimplesUnicode.set("158","&#128031;");
            groupesSimplesUnicode.set("501","&#127812;");
            groupesSimplesUnicode.set("502","&#129408;");
            groupesSimplesUnicode.set("504","&#129419;");
            groupesSimplesUnicode.set("505","&#127807;");
            groupesSimplesUnicode.set("506","&#128013;");
            groupesSimplesUnicode.set("24222202","&#8230;");

            let quest = "";
            let questStatus = "No";
            if (obs.questData!=null && obs.questData.idCa!=null) {
                quest = "<div class=\"quest\" title=\"Soumise dans le cadre d'une quête\">🎯</div>";
                questStatus = "Yes";
            }

            let filtered = "";
            const isValidEmpty=isValidationEmpty(obs);
            // only displaying if all 3 filter checkboxes are checked!
            let display = false;

            if (document.getElementById(obs.groupSimple).checked
              && (isValidEmpty || document.getElementById(obs.validation.idStatus).checked)
              && document.getElementById(questStatus).checked) {
                display = true;
            }

            if (display) {
                filtered="style=\"display:initial;\"";
            } else {
                filtered="style=\"display:none;\"";
            }

            // if (document.getElementById(obs.groupSimple).checked) {
            //     // displaying even if data error
            //     if (isValidEmpty || document.getElementById(obs.validation.idStatus).checked) {
            //         filtered="style=\"display:initial;\"";
            //     } else {
            //         filtered="style=\"display:none;\"";
            //     }
            // } else {
            //     filtered="style=\"display:none;\"";
            // }

            let validStatus="";
            let validLabel="";
            if (isValidEmpty) {
                validStatus="99";
                validLabel="Erreur de données, validation vide";
            } else {
                validStatus=obs.validation.idStatus;
                validLabel=obs.validation.lbStatus;
            }

            const htmlSegment = `<div id="${obs.idData}" class="obs status${validStatus} go${obs.groupSimple} quests${questStatus}" ${filtered}>
                              <img src="${obs.photos[0].thumbnailFileUri}" >
                              <div class="score">${obs.scoreTotal} pts</div>
                              <div title="${obs.nomCommuns}" class="details">
                                <h2>${title} </h2>
                                <p>Observation datée du ${creationDate} à ${creationTime}</p>
                                <p>Dernière modification : ${modificationDateTime}</p>
                                <p>${obs.region}</p>
                              </div>
                              <div title="${validLabel}" class="progress">
                                ${progress}
                              </div>

                              <div class="taxon" title="${obs.lbGroupSimple}">
                                <span style="font-size: 30px;">${groupesSimplesUnicode.get(obs.groupSimple)}</span>
                              </div>
                              ${quest}
                          </div>`;
            html += htmlSegment;
        });
        html += "</div>";
        const container = document.querySelector(".container");
        container.innerHTML = html;
        // event listeners to display the details of any obs on click
        sorted.forEach(obs => {
            document.getElementById(`${obs.idData}`).addEventListener("click", detailsHandler);
        });

    } else {
        console.error("listObs was undefined, could not render any obs");
    }
}

function isValidationEmpty (observation) {
    const isValEmpty = (observation.validation==null||observation.validation.idStatus==null);
    if (isValEmpty) {
        console.warn("observation "+observation.idData+" has no validation content?!");
    }
    return isValEmpty;
}

export async function changeContributor () {
    // getting input from field
    const userId = document.getElementById("contributorId").value;
    if (userId!=null && userId>0) {
        console.log("Will attempt to load data for contributor "+userId);
        if (USER_ID!=null &&USER_ID!==userId) {
            // testing if exists...
            const contributor = await Utils.callAndWaitForJsonAnswer(inpnUrlBase+"contributor/"+userId, TIMEOUT);
            if (contributor==null) {
                console.log("This profile doesn't seem to exist... "+userId);
                Utils.addNotification("","Echec","Erreur lors du chargement de l'utilisateur&middot;trice "+userId+" !");
                if (currentContributor!=null) {
                    document.getElementById("contributorId").value=currentContributor.idUtilisateur;
                }
            } else {
                // ok to change...
                // change user, reinit all
                USER_ID = userId;
                reinit();
                currentContributor=null;
                // keeping this value for 10 days max
                Utils.setCookie("contributorId", userId, 10);
                loadAll();
            }
        } else if (USER_ID!=null) {
            // same userId!
            console.warn("same userId as before! Doing nothing");
        }
    } else {
        console.error("Invalid contributorId: "+userId);
    }
}

function cleanAll () {
    /* eslint no-unused-vars: 0 */
    reinit();
    loadAll();
}

function reinit () {
    listObservations=null;
    latestObs=null;
    // stop current loading if running
    isLoopLoadingOn=false;
    isMoreLoadingOn=false;
    allDownloaded=false;
    if (observer!=null) {
        observer.unobserve(document.querySelector("#bottom"));
        observer=null;
    }
    index=0;
    document.querySelector(".container").innerHTML = "";
    renderProgress();
}

export function sortObs () {
    renderObs();
}

function replaceObjectInArray (array, oldItem, newItem) {
    const existingObj = array.find(item => item.idData === oldItem.idData);
    if (existingObj) {
        Object.assign(existingObj, newItem);
    }
}

export async function getOneObservation (id) {
    const getOneUrl=inpnUrlBase+"data/"+id;
    return await Utils.callAndWaitForJsonAnswer(getOneUrl, TIMEOUT);
}

// Compares two observations by their dateModif property
function compareStringDatesModif (a,b) {
    if (a.dateModif==="" && b.dateModif==="") {
        return 0;
    } else if (a.dateModif==null && b.dateModif==null) {
        return 0;
    } else if (a.dateModif==="" || a.dateModif==null) {
        return -1;
    } else if (b.dateModif==="" || b.dateModif==null) {
        return 1;
    } else {
        const dateA = new Date(a.dateModif);
        const dateB = new Date(b.dateModif);

        if (dateA>dateB) {
            return -1;
        } else if (dateA<dateB) {
            return 1;
        } else {
            return 0;
        }
    }
}

async function updateOneObservation (obs) {
    const updatedObs = await getOneObservation(obs.idData);
    let changed = false;
    if (updatedObs!=null) {
    //console.log(updatedObs);
        if (compareStringDatesModif(updatedObs,obs)<0) {
            // we want to keep the new one
            replaceObjectInArray(listObservations.observations,obs,updatedObs);
            changed = true;
            console.log("Updated obs id "+updatedObs.idData+" - dateModif "+updatedObs.dateModif+" > "+obs.dateModif);
        } else {
            console.log("No need to update obs id "+updatedObs.idData+" - no change in dateModif");
        }
    } else {
        console.error("Erreur lors du chargement d'une observation. Veuillez réessayer ultérieurement");
    }
    return changed;
}

async function loadRightAmountMissingObs (diff) {
    // load the right amount needed!
    const paginStart=1;

    const obsUrlDiff=inpnUrlBase+"data?paginStart="+paginStart+"&paginEnd="+diff+"&idUtilisateur="+USER_ID;
    console.log("Diff : loading obs from "+obsUrlDiff);

    if (await getAndAddAllObservations(obsUrlDiff)) {
    // rendering
        await renderObs();
        // newLoadedObsCpt = diff;
        listObservations.totLines=latestObs.totLines;
    } else {
    // Error while loading : break
        console.error("Diff : error while loading new obs");
    }
    return diff;
}

export async function updateObservations () {
    deactivateBtn("loadAll");
    Utils.addNotification("info","Information","Démarrage de la mise à jour des observations non encore validées");
    let callCpt=0;
    let updatedCpt=0;
    let newLoadedObsCpt=0;
    startProgressAnimation();

    await Promise.all(listObservations.observations.map(async (obs) => {
        if (obs.validation==null || (obs.validation.idStatus!==0 && obs.validation.idStatus!==5 && obs.validation.idStatus!==6)) {
            callCpt++;
            const changed = await updateOneObservation(obs);
            if (changed) {
                updatedCpt++;
            }
        }
    }));

    if (updatedCpt>0) {
    // refresh view
        renderObs();
    }
    console.log("Called "+callCpt+" times the update for non validated observations, made "+updatedCpt+" changes to current list");

    // One call to get a refreshed totLines - if matching, we have all. If not, need to loadLoop until done...
    const urlLatestObservation=inpnUrlBase+"data?paginStart=1&paginEnd=1&idUtilisateur="+USER_ID;
    const observation = await Utils.callAndWaitForJsonAnswer(urlLatestObservation, TIMEOUT);
    if (observation!=null) {
        latestObs = observation;
        const diff = latestObs.totLines-listObservations.totLines;
        console.log("latestObs up to date. "+diff+" new obs to load");
        if (diff>0) {
            newLoadedObsCpt = await loadRightAmountMissingObs(diff);
        }
        renderProgress();
        renderObs();
    } else {
        alert("Erreur lors du chargement de la plus récente observation. Veuillez réessayer ultérieurement");
    }
    if (updatedCpt>0||newLoadedObsCpt>0) {
    // we had changes!
        Utils.addNotification("success","Succès",updatedCpt+" observations mises à jour et "+newLoadedObsCpt+" nouvelles observations chargées");
        // refresh score as well
        loadContributor();
        // trying to keep list ids storage
        saveCurrentUserDataInStorage();
    } else {
        Utils.addNotification("success","Succès","Toutes les observations étaient bien à jour");
    }
    console.log(updatedCpt+" updated validated observations and "+newLoadedObsCpt+" new loaded one(s)");
    stopProgressAnimation();
    activateBtn("loadAll");
}

/***
**
**  Inputs and animations toggling (on/off)
**
****/

function activateUpdateAllButton () {
    // turn "loadAll button" into "updateAll button"
    const loadAllButton = document.getElementById("loadAll");
    loadAllButton.innerHTML=UPDATE_OBS;
    activateBtn("loadAll");
    loadAllButton.title="Lancer une mise à jour de toutes les observations non encore validées (peut prendre du temps!)";
}

function startProgressAnimation () {
    const meter = document.querySelector(".progressMeter");
    meter.style.animationName="backgroundChange";
    meter.style.animationDuration="4s";
    meter.style.animationIterationCount="infinite";
    meter.style.animationDirection="alternate";
}

function stopProgressAnimation () {
    document.querySelector(".progressMeter").style.animation="unset";
}

function toggleAllNoneButtonsByFamily (prefix) {
    if (prefix!=="quests") {
    // check if we need to desactivate buttons
        const checkboxes= document.querySelectorAll("."+prefix);
        let areAllOn = true;
        let areAllOff = true;
        checkboxes.forEach(checkbox=>{
            if (areAllOn) {
                if (!checkbox.checked) {
                    areAllOn=false;
                }
            }
            if (areAllOff) {
                if (checkbox.checked) {
                    areAllOff=false;
                }
            }
        });

        let allBtnId="";
        let noneBtnId="";
        if (prefix==="status") {
            allBtnId="allStat";
            noneBtnId="noneStat";
        } else {
            allBtnId="allGo";
            noneBtnId="noneGo";
        }

        if (areAllOn) {
            deactivateBtn(allBtnId);
            activateBtn(noneBtnId);
        } else if (areAllOff) {
            deactivateBtn(noneBtnId);
            activateBtn(allBtnId);
        } else {
            // some on some off
            activateBtn(allBtnId);
            activateBtn(noneBtnId);
        }
    }
}

export function allGo () {
    toggleAllFilters(true,"go");
    deactivateBtn("allGo");
    activateBtn("noneGo");
}

export function noneGo () {
    toggleAllFilters(false,"go");
    deactivateBtn("noneGo");
    activateBtn("allGo");
}

export function allStat () {
    toggleAllFilters(true,"status");
    deactivateBtn("allStat");
    activateBtn("noneStat");
}

export function noneStat () {
    toggleAllFilters(false,"status");
    deactivateBtn("noneStat");
    activateBtn("allStat");
}

function deactivateBtn (id) {
    document.getElementById(id).style.backgroundColor="gray";
    document.getElementById(id).style.pointerEvents="none";
    document.getElementById(id).style.fontStyle="italic";
}

function activateBtn (id) {
    document.getElementById(id).style.backgroundColor="";
    document.getElementById(id).style.pointerEvents="unset";
    document.getElementById(id).style.fontStyle="unset";
}

export function toggleLeftFilters () {
    if (areFiltersDisplayed) {
        areFiltersDisplayed=false;
        document.querySelector(".leftFilters").style="";
        document.getElementById("toggleLeftFilters").innerHTML="Afficher les filtres";
        document.getElementById("toggleLeftFilters").title="Cliquer ici pour afficher les filtres par catégories";
    } else {
        areFiltersDisplayed=true;
        document.querySelector(".leftFilters").style.left="0";
        document.querySelector(".leftFilters").style.boxShadow="-12px -12px 15px -5px black";
        document.getElementById("toggleLeftFilters").innerHTML="Masquer les filtres";
        document.getElementById("toggleLeftFilters").title="Cliquer ici pour masquer les filtres par catégories";
    }
}

export function toggleRightSorters () {
    if (areSortersDisplayed) {
        areSortersDisplayed=false;
        document.querySelector(".rightSorters").style="";
        document.getElementById("toggleRightSorters").innerHTML="Afficher les tris";
        document.getElementById("toggleRightSorters").title="Cliquer ici pour afficher les tris";
    } else {
        areSortersDisplayed=true;
        document.querySelector(".rightSorters").style.right="0";
        document.querySelector(".rightSorters").style.boxShadow="12px -12px 15px -5px black";
        document.getElementById("toggleRightSorters").innerHTML="Masquer les tris";
        document.getElementById("toggleRightSorters").title="Cliquer ici pour masquer les tris";
    }
}

/***
**
**  Data sorting
**
****/

function sortByModificationLatest (observations) {
    // console.log("Ordering observations...");
    if (observations!=null) {
        observations.sort(compareStringDatesModif);
    }
    return observations;
}

function sortByCreationLatest (observations) {
    // console.log("Ordering observations...");
    if (observations!=null) {
        observations.sort(function (a,b) {
            const dateA = new Date(a.dateCrea);
            const dateB = new Date(b.dateCrea);
            if (dateA>dateB) {
                return -1;
            } else if (dateA<dateB) {
                return 1;
            } else {
                return 0;
            }
        });
    }
    return observations;
}

function sortByPoints (observations) {
    // console.log("Ordering observations...");
    if (observations!=null) {
        observations.sort(function (a,b) {
            const pointsA = a.scoreTotal;
            const pointsB = b.scoreTotal;
            if (pointsA>pointsB) {
                return -1;
            } else if (pointsA<pointsB) {
                return 1;
            } else {
                return 0;
            }
        });
    }
    return observations;
}

/***
**
**  Filtering
**
****/

function filterObsStatus (event) {
    filterObs("status",event.target);
}

function filterObsGo (event) {
    filterObs("go",event.target);
}

function filterObsQuest (event) {
    filterObs("quests",event.target);
}

function filterObs (prefix,checkbox) {

    // elements by class with matching code
    const allWithClassName = document.querySelectorAll(`.${prefix}${checkbox.id}.obs`);

    if (checkbox.checked) {
        // for each observation (div) in the page matching the criteria
        allWithClassName.forEach(div=>{
            // get other class values and verify not unchecked!

            // we need 3 matches to display!
            let goCheck;
            let statusCheck;
            let questCheck;

            // for each class in this observation div...
            div.classList.forEach(val=>{
                // we need to know the checked status of the 3 matching checkboxes for current obs
                // let's get the 2 missing checkboxes' ids
                if (val!=="obs") {

                    if (val.includes("status")) {
                        if (prefix!=="status") {
                            const checkStatusId = val.match("[1-9]")[0];
                            statusCheck = document.getElementById(checkStatusId).checked;
                        } else {
                            statusCheck = true;
                        }
                    } else if (val.includes("go")) {
                        if (prefix!=="go") {
                            const checkGoId = val.match(/\d+/)[0];
                            goCheck = document.getElementById(checkGoId).checked;
                        } else {
                            goCheck = true;
                        }
                    } else if (val.includes("quests")) {
                        if (prefix!=="quests") {
                            const checkQuestId = val.match("quests([A-Za-z]{2,3})")[1];
                            questCheck = document.getElementById(checkQuestId).checked;
                        } else {
                            questCheck = true;
                        }
                    }
                }
            });
            // only display if the 3 checkboxes are checked
            if (goCheck && statusCheck && questCheck) {
                div.style.display="initial";
            }
        });
    } else {
        allWithClassName.forEach(div=>{
            div.style.display="none";
        });
    }
    toggleAllNoneButtonsByFamily(prefix);
}

function toggleAllFilters (turnOn,prefix) {
    const checkboxes= document.querySelectorAll("."+prefix);
    let change = false;
    checkboxes.forEach(checkbox=>{
        if (turnOn) {
            if (!checkbox.checked) {
                checkbox.checked=true;
                if (!change) {
                    change=true;
                }
            }
        } else {
            if (checkbox.checked) {
                checkbox.checked=false;
                if (!change) {
                    change=true;
                }
            }
        }
    });
    if (change) {
    // refresh
        renderObs();
    }
}

/***
**
**  Showing/hiding background, help
**
****/

export function blurBackground () {
    document.querySelector(".filter").style.filter="blur(5px) grayscale(60%)";
    document.querySelector(".menu").style.filter="blur(5px) grayscale(60%)";
    document.querySelector(".leftFilters").style.filter="blur(5px) grayscale(60%)";
    document.querySelector(".rightSorters").style.filter="blur(5px) grayscale(60%)";
    document.body.className = "noclick";
    // prevent scrolling
    document.documentElement.style.overflow = "hidden";
    document.body.scroll = "no";
}

export function unblurBackground () {
    document.querySelector(".filter").style.filter="none";
    document.querySelector(".menu").style.filter="none";
    document.querySelector(".leftFilters").style.filter="none";
    document.querySelector(".rightSorters").style.filter="none";
    document.body.classList.remove("noclick");
    // re allow scrolling
    document.documentElement.style.overflow = "scroll";
    document.body.scroll = "yes";
}

export function showHelp () {
    const helpDiv = document.querySelector(".help");
    //helpDiv.innerHTML=``;
    helpDiv.style.visibility="visible";
    helpDiv.id="popup";
    helpDiv.scrollTop = 0;
    blurBackground();
}

export function closeHelp () {
    Utils.setCookie("helpClosed","true",30);
    unblurBackground();
    document.querySelector(".help").style.visibility="collapse";
    document.querySelector(".help").id="";
}
