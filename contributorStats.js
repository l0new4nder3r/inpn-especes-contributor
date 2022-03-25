/* Everything about displaying the stats of a selected contributor */

import { USER_ID, TIMEOUT, latestObs, listObservations, currentContributor, blurBackground, unblurBackground, inpnUrlBase} from "./inpn.js";
import { callAndWaitForJsonAnswer } from "./utils.js";

/* taken from https://www.chartjs.org/docs/master/samples/utils.html */
export const CHART_COLORS = {
    red: "rgb(255, 99, 132)",
    orange: "rgb(255, 159, 64)",
    yellow: "rgb(255, 205, 86)",
    green: "rgb(75, 192, 192)",
    blue: "rgb(54, 162, 235)",
    purple: "rgb(153, 102, 255)",
    grey: "rgb(201, 203, 207)"
};

export const LIGHT_CHART_COLORS = {
    red: "rgba(255, 99, 132, 0.2)",
    orange: "rgba(255, 159, 64, 0.2)",
    yellow: "rgba(255, 205, 86, 0.2)",
    green: "rgba(75, 192, 192, 0.2)",
    blue: "rgba(54, 162, 235, 0.2)",
    purple: "rgba(153, 102, 255, 0.2)",
    grey: "rgba(201, 203, 207, 0.2)",
};

/* eslint no-console: 0 */

const monthsBtwnDates = (startDate, endDate) => {
    return Math.max((endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth(),0);
};

const noLegendOptions= {
    plugins: {
        legend: {
            display: false
        }
    }
};

let contributorsTotal;

export async function buildStats () {
    await showStats();
    await makeGraphs();
}

async function getRankInfo (urlRank) {
    const rankInfo = await callAndWaitForJsonAnswer(urlRank, TIMEOUT);
    if (rankInfo==null) {
        alert("Erreur lors du chargement du nombre de personnes. Veuillez réessayer ultérieurement");
    }
    contributorsTotal = rankInfo.totLines;
}

async function showStats () {

    if (USER_ID!=null && latestObs!=null && listObservations != null && currentContributor!=null) {
        // make some content for "stats" placeholder
        const stats = document.querySelector(".stats");

        // make this visible
        stats.style.visibility="visible";
        stats.style.cursor="progress";
        stats.id="popup";
        blurBackground();

        // bouton de fermeture, titre
        stats.innerHTML = `<div class="popinTop">
													<div class="popinTitle">Statistiques de ${currentContributor.pseudo}</div>
													<div id="closeStats" class="tinyButton">X</div>
												</div>
											<div class="statsContents">
											</div>`;
        document.getElementById("closeStats").addEventListener("click",hideStats);

        const statsContents = document.querySelector(".statsContents");
        statsContents.innerHTML += `<div class="statsLeft"></div>
																<div class="statsRight"></div>`;
        const statsleft = document.querySelector(".statsLeft");
        statsleft.innerHTML ="<div class=\"statsIntro\"></div>";

        // tout est chargé? si non : avertissement
        const isAllLoaded = listObservations.observations.length===latestObs.totLines;
        if (!isAllLoaded) {
            document.querySelector(".statsIntro").innerHTML += `<p>Attention, toutes les observations de cette personne n'ont pas été chargées.</p>
							<p>Certaines statistiques pourraient perdre de leur pertinence!</p>`;
        }

        // score moyen, min ,max
        let averageGlobal=0;
        if (latestObs.totLines!==0) {
            averageGlobal = (currentContributor.ScoreTotal/latestObs.totLines).toFixed(0);
        }
        let min = listObservations.observations[0].scoreTotal;
        let max = 0;
        let sum = 0;
        let validated = 0;
        listObservations.observations.forEach(obs=>{
            if (obs.scoreTotal<min) {
                min=obs.scoreTotal;
            }
            if (obs.scoreTotal>max) {
                max=obs.scoreTotal;
            }
            sum +=obs.scoreTotal;
            if (obs.isValidated==="true") {
                validated++;
            }
        });

        let averageLoaded = "N/A";
        if (listObservations.observations!=null && listObservations.observations.length>0) {
            averageLoaded = (sum/listObservations.observations.length).toFixed(0);
        }

        statsleft.innerHTML+="<div class=\"statsLeftContents\"></div>";
        const leftStatsContents = document.querySelector(".statsLeftContents");

        let asterisk = "";
        let globalAverageScore = "";
        if (!isAllLoaded) {
            asterisk="<sup>*</sup>";
            globalAverageScore=`<p>Score moyen (global) : ${averageGlobal} points</p>`;
        }
        leftStatsContents.innerHTML += `<p>Observations soumises : ${listObservations.totLines}</p>
                        <p>Observations validées : ${validated}</p>
												<p>Score minimum${asterisk} : ${min} points</p>
												<p>Score moyen${asterisk} : ${averageLoaded} points</p>
												<p>Score maximum${asterisk} : ${max} points</p>
												${globalAverageScore}`;

        /* rang contributeur  */
        if (contributorsTotal==null) {
            const urlRank=inpnUrlBase+"rank?paginStart=1&paginEnd=1";
            console.log("loading rank info from: "+urlRank);
            await getRankInfo(urlRank);
        }

        leftStatsContents.innerHTML+=`<p>Rang : ${currentContributor.rang}<sup>e</sup> sur ${contributorsTotal} contributeurs&middot;trices</p>`;

        /* nombre validés mais corrigés */
        let corrected = 0;
        let correctlyIdentified = 0;
        listObservations.observations.forEach(obs=>{
            if (obs.isCorrected==="true") {
                corrected++;
            } else if (obs.isValidated==="true") {
                if (obs.taxonOrigin!=null && obs.taxonOrigin.cdNomOrigin!=null && obs.taxonOrigin.cdNomOrigin!=="") {
                    correctlyIdentified++;
                }
            }
        });
        const speciesSubmittedAndValidated = corrected+correctlyIdentified;
        let correctedRatio=0;
        if (speciesSubmittedAndValidated>0) {
            correctedRatio=(corrected/speciesSubmittedAndValidated*100).toFixed(0);
        }
        leftStatsContents.innerHTML+=`<p class="correctedCount">
							Observations${asterisk} corrigées : ${corrected} <span style="font-style:italic">sur ${speciesSubmittedAndValidated} espèce(s) proposée(s) et validées.</span>
						Soit un taux d'erreur de ${correctedRatio}%
						</p>`;

        /* quests */
        let quests = 0;
        listObservations.observations.forEach(obs=>{
            if (obs.questData!=null) {
                quests++;
            }
        });
        leftStatsContents.innerHTML+=`<p class="quests">Observations${asterisk} soumises dans le cadre de quêtes : ${quests}</p>`;
        if (!isAllLoaded) {
            leftStatsContents.innerHTML+=`<p class="statsLegend">${asterisk} Sur les ${listObservations.observations.length} observations chargées</p>`;
        }

        // link to official profile
        leftStatsContents.innerHTML+=`<div class="linkOfficial">
                                        <a href="https://determinobs.fr/#/observateurs/${currentContributor.idUtilisateur}" target="_blank">
                                          <img title="déterminobs" src="https://determinobs.fr/favicon.ico" style="width: 1em;">
                                          <span style="margin-left: 5px;">Consulter le profil de ${currentContributor.pseudo} sur Déterminobs</span>
                                        </a>
                                      </div>`;

        /* scores graphique! */
        statsleft.innerHTML+=buildCanvas("scoresCanvas",`Répartition des observations${asterisk} validées par score`);
        statsleft.innerHTML+="<br/>";

        /* graphique histo avec répartition par statut de validation */
        statsleft.innerHTML+=buildCanvas("validationStatusCanvas",`Répartition${asterisk} par statut de validation`);
        statsleft.innerHTML+="<br/>";

        const rightStatsContents = document.querySelector(".statsRight");

        /* familles d'espèces - groupes simplifiés  */
        rightStatsContents.innerHTML+=buildCanvas("groupeSimpleCanvas",`Répartition${asterisk} par groupe grand public`);
        rightStatsContents.innerHTML+="<br/>";

        /* nombre par région */
        rightStatsContents.innerHTML+=buildCanvas("regionsCanvas",`Répartition${asterisk} par régions`);
        rightStatsContents.innerHTML+="<br/>";

        /* graphique avec obs dans le temps */
        rightStatsContents.innerHTML+=buildCanvas("timelineCanvas",`Soumissions${asterisk} par mois`);

        statsContents.insertAdjacentHTML("beforeend", "<div class=\"statsDown\"></div>");
        const downStatsContents = document.querySelector(".statsDown");
        /* graphique propositions espèces dans le temps */
        downStatsContents.innerHTML+=buildCanvas("speciesPropositionInTimeCanvas",`Propositions et corrections d'espèces${asterisk} dans le temps`);
        downStatsContents.innerHTML+="<br/>";

        stats.style.cursor="unset";
    } else {
        console.warn("Nothing loaded, no stats to show");
    }
}

function buildCanvas (id,title) {
    return `<div class="canvas">
						<canvas id="${id}"></canvas>
						<h4>${title}</h4>
					</div>`;
}

function hideStats () {

    // hiding the "focus" part
    const stats = document.querySelector(".stats");
    stats.style.visibility="collapse";
    stats.id="";
    stats.innerHTML="";
    // hiding the filter too
    unblurBackground();
}

async function makeGraphs () {
    // status
    await buildStatusGraph();
    // scores
    await buildScoresGraph();
    // identification
    await buildPropositionsGraph();
    // régions
    await buildRegionsGraph();
    // timeline
    await buildTimelineGraph();
    // groupe simple
    await buildGroupsGraph();
}

function buildStatusGraph () {
    let countStatus0=0;
    let countStatus1=0;
    let countStatus2=0;
    let countStatus3=0;
    let countStatus4=0;
    let countStatus5=0;
    let countStatus6=0;
    let countStatus99=0;

    listObservations.observations.forEach(obs=>{
        if (obs.validation.idStatus===0) {
            countStatus0++;
        } else if (obs.validation.idStatus===1) {
            countStatus1++;
        } else if (obs.validation.idStatus===2) {
            countStatus2++;
        } else if (obs.validation.idStatus===3) {
            countStatus3++;
        } else if (obs.validation.idStatus===4) {
            countStatus4++;
        } else if (obs.validation.idStatus===5) {
            countStatus5++;
        } else if (obs.validation.idStatus===6) {
            countStatus6++;
        } else if (obs.validation==null||obs.validation.idStatus==null) {
            countStatus99++;
        }
    });

    // todo get status from api?! Mais fautes...
    const statusLabels = [
        "Erreur",
        "Initialisation",
        "Photographie traitée",
        "Groupe grand public traité",
        "Groupe opérationnel traité",
        "Espèce validée",
        "Observation invalidée"
    ];
    if (countStatus99>0) {
        statusLabels.push("Erreur de données, validation vide");
    }

    const graphData = [countStatus0, countStatus1, countStatus2, countStatus3, countStatus4, countStatus5, countStatus6];
    if (countStatus99>0) {
        graphData.push(countStatus99);
    }

    const statusData = {
        labels: statusLabels,
        datasets: [{
            backgroundColor: [LIGHT_CHART_COLORS.red,LIGHT_CHART_COLORS.orange,LIGHT_CHART_COLORS.yellow,LIGHT_CHART_COLORS.green,LIGHT_CHART_COLORS.blue,LIGHT_CHART_COLORS.purple,LIGHT_CHART_COLORS.grey],
            borderColor: [CHART_COLORS.red,CHART_COLORS.orange,CHART_COLORS.yellow,CHART_COLORS.green,CHART_COLORS.blue,CHART_COLORS.purple,CHART_COLORS.grey],
            borderWidth: 1,
            data: graphData,
        }]
    };
    const statusConfig = {
        type: "bar",
        data: statusData,
        options: noLegendOptions
    };
    /* eslint-disable no-unused-vars,no-undef */
    const validationStatusCanvas = document.getElementById("validationStatusCanvas");
    const validationStatusChart = new Chart(validationStatusCanvas.getContext("2d"), statusConfig);
    /* eslint-enable no-unused-vars,no-undef */
}

function buildScoresGraph () {
    let count0to100=0;
    let count100to1000=0;
    let count1000to2000=0;
    let count2000to5000=0;
    let count5000AndMore=0;

    listObservations.observations.forEach(obs=>{
        if (obs.validation.idStatus===5) {
            if (obs.scoreTotal>5000) {
                count5000AndMore++;
            } else if (obs.scoreTotal>2000) {
                count2000to5000++;
            } else if (obs.scoreTotal>1000) {
                count1000to2000++;
            } else if (obs.scoreTotal>100) {
                count100to1000++;
            } else {
                count0to100++;
            }
        }
    });

    const scoresLabels = [
        "0 à 100 pts",
        "100 à 1000 pts",
        "1000 à 2000 pts",
        "2000 à 5000 pts",
        "5000 et plus"
    ];
    const scoresData = {
        labels: scoresLabels,
        datasets: [{
            // label: 'Répartition des observations validées par score',
            backgroundColor: [LIGHT_CHART_COLORS.red,LIGHT_CHART_COLORS.orange,LIGHT_CHART_COLORS.yellow,LIGHT_CHART_COLORS.green,LIGHT_CHART_COLORS.blue],
            borderColor: [CHART_COLORS.red,CHART_COLORS.orange,CHART_COLORS.yellow,CHART_COLORS.green,CHART_COLORS.blue],
            data: [count0to100, count100to1000, count1000to2000, count2000to5000, count5000AndMore],
            borderWidth: 1
        }]
    };
    const scoresConfig = {
        type: "bar",
        data: scoresData,
        options: noLegendOptions
    };
    /* eslint-disable no-unused-vars,no-undef */
    const scoresCanvas = document.getElementById("scoresCanvas");
    const scoresChart = new Chart(scoresCanvas.getContext("2d"), scoresConfig);
    /* eslint-enable no-unused-vars,no-undef */
}

// plutôt faire par date de soumission?
// -> pas possible, on a pas...
// regrouper par trimestre? Ou moins?
// calculer estimation place écran ? Dynamique?
// 550px de large. 2009->2021 = 12*12=144 mois
// granularité


// taux de réussite, nombre de proposés? Par trimestre? Double échelle droite/gauche?
// T1 T2 T3 T4

function getGranularity (monthNumber) {
    let granularity=1;
    // 100+ : année, 75+ semestre, 50+ trimestre, moins: mois ?
    if (monthNumber>=100) {
        granularity=12;
    } else if (monthNumber>=75) {
        granularity=6;
    } else if (monthNumber>=50) {
        granularity=3;
    }
    return granularity;
}

const skipped = (ctx, value) => ctx.p0.skip || ctx.p1.skip ? value : undefined;

function buildPropositionsGraph () {
    // min datecrea found
    let dateCreaMin=new Date(listObservations.observations[0].dateCrea);
    // max datecrea found
    let dateCreaMax=new Date(listObservations.observations[0].dateCrea);

    listObservations.observations.forEach(obs=>{
        if (new Date(obs.dateCrea)<dateCreaMin) {
            dateCreaMin=new Date(obs.dateCrea);
        }
        if (new Date(obs.dateCrea)>dateCreaMax) {
            dateCreaMax=new Date(obs.dateCrea);
        }
    });
    //console.log('minDate= '+dateCreaMin+' maxDate= '+dateCreaMax);
    const months = monthsBtwnDates(dateCreaMin,dateCreaMax);
    //console.log('months between= '+months);
    const granularity = getGranularity(months);

    // build a Map with months between start and end as keys
    // and number of wanted facts per month as values
    const propositionsPerMonthMap=new Map();
    const correctionsPerMonthMap=new Map();
    const validationsPerMonthMap=new Map();
    const monthList = new Array();
    const propositionsList = new Array();
    const successRateList = new Array();
    const observationsPerMonthMap=new Map();

    // TODO 2 échelles
    // propositions espèces : échelle à gauche (mettre en proportion des obs envoyées?!) en bleu
    // proportion d'erreurs, plutôt que de réussite ! en rouge courbe discontinue, échelle à droite

    //set both start and end date to first date of the month
    const endDate = new Date(dateCreaMax.getFullYear(), dateCreaMax.getMonth(), 1);
    const startDate = new Date(dateCreaMin.getFullYear(), dateCreaMin.getMonth(), 1);

    // init timeline (keys) in Maps
    let cpt = 0;
    while (startDate<=endDate) {
        cpt++;
        if (cpt%granularity===0) {
            // ne vas pas DU TOUT!!! Tout garder le compte par mois. Si granuliarité !=1, changmeent à la fin!
            // par contre reste la liste labels (trimestre etc) à gérer... pas simple.
            if (granularity===1) {
                monthList.push(startDate.toLocaleString("default", { month: "long" , year: "numeric"}),0);
            } else if (granularity===3) {
                monthList.push("Trimestre "+startDate.toLocaleString("default", { month: "long" , year: "numeric"}),0);
            } else if (granularity===6) {
                monthList.push("Semestre "+startDate.toLocaleString("default", { month: "long" , year: "numeric"}),0);
            } else {
                monthList.push("Année "+startDate.toLocaleString("default", { month: "long" , year: "numeric"}),0);
            }
        }
        propositionsPerMonthMap.set(startDate.toLocaleString("default", { month: "long" , year: "numeric"}),0);
        correctionsPerMonthMap.set(startDate.toLocaleString("default", { month: "long" , year: "numeric"}),0);
        validationsPerMonthMap.set(startDate.toLocaleString("default", { month: "long" , year: "numeric"}),0);
        observationsPerMonthMap.set(startDate.toLocaleString("default", { month: "long" , year: "numeric"}),0);
        startDate.setMonth(startDate.getMonth() + 1);
    }

    // count all props for each month
    listObservations.observations.forEach(obs=>{
        const date = (new Date(obs.dateCrea)).toLocaleString("default", { month: "long" , year: "numeric"});
        observationsPerMonthMap.set(date,observationsPerMonthMap.get(date)+1);
        if (obs.isCorrected==="true") {
            propositionsPerMonthMap.set(date,propositionsPerMonthMap.get(date)+1);
            correctionsPerMonthMap.set(date,correctionsPerMonthMap.get(date)+1);
        } else if (obs.isValidated==="true") {
            if (obs.taxonOrigin!=null && obs.taxonOrigin.cdNomOrigin!=null && obs.taxonOrigin.cdNomOrigin!=="") {
                propositionsPerMonthMap.set(date,propositionsPerMonthMap.get(date)+1);
                validationsPerMonthMap.set(date,validationsPerMonthMap.get(date)+1);
            }
        }
    });

    // calculating success ratio for each month
    //  const successRateMapPerMonth = new Map();
    const failureRateMapPerMonth = new Map();
    const propositionRatePerMonth = new Map();


    propositionsPerMonthMap.forEach((propositions,month)=>{
    // let validated = validationsPerMonthMap.get(month);
    // let validRatio;
    // if(propositions>0){
    //   validRatio = (validated/propositions*100).toFixed(0);
    // }
    // // else {
    // //   ratio = 0;
    // // }
    // console.log("For "+month+" validated "+validated+" on "+propositions+" proposed - ratio is "+validRatio);
    // successRateMapPerMonth.set(month,validRatio);
        const observations = observationsPerMonthMap.get(month);
        let propRatio;
        if (observations>0) {
            propRatio = (propositions/observations*100).toFixed(0);
            // console.log("For "+month+" proposed "+propositions+" on "+observations+" sent - ratio is "+propRatio);
        }
        propositionRatePerMonth.set(month,propRatio);

        const corrected = correctionsPerMonthMap.get(month);
        let corrRatio;
        if (propositions>0) {
            corrRatio = (corrected/propositions*100).toFixed(0);
            // console.log("For "+month+" corrected "+corrected+" on "+propositions+" proposed - ratio is "+corrRatio);
        }
        failureRateMapPerMonth.set(month,corrRatio);
    });

    // intéressant à montrer? Nombre de propositions faites par intervalle (mois?) + taux de réussite sur même période
    // l'un en baton, le nombre, l'autre en courbe (le taux - autre échelle à avoir à droite)
    // TODO stack prop en bar sur nb obs, couleur + marquée
    const propositionsData = {
        labels: Array.from(propositionsPerMonthMap.keys()),
        datasets: [{
            label: "Taux de proposition d'espèces",
            backgroundColor: LIGHT_CHART_COLORS.blue,
            borderColor: CHART_COLORS.blue,
            data: Array.from(propositionRatePerMonth.values()),
            type: "line",
            order: 1,
            segment: {
                borderColor: ctx => skipped(ctx, LIGHT_CHART_COLORS.blue),
                borderDash: ctx => skipped(ctx, [6, 6]),
            },
            spanGaps: true,
            yAxisID: "yAxisleft" // matching scale/axis?
        },{
            label: "Proportion de propositions corrigées",
            backgroundColor: LIGHT_CHART_COLORS.red,
            borderColor: CHART_COLORS.red,
            data: Array.from(failureRateMapPerMonth.values()),
            type: "line",
            order: 0,
            segment: {
                borderColor: ctx => skipped(ctx, LIGHT_CHART_COLORS.red),
                borderDash: ctx => skipped(ctx, [6, 6]),
            },
            spanGaps: true,
            yAxisID: "yAxisleft" // matching scale/axis?
        },{
            label: "Nombre d'observations",
            backgroundColor: LIGHT_CHART_COLORS.green,
            borderColor: CHART_COLORS.green,
            data: Array.from(observationsPerMonthMap.values()),
            type: "bar",
            borderWidth: 1,
            order: 2,
            spanGaps: true,
            yAxisID: "yAxisRight" // matching scale/axis?
        }]
    };

    const propositionsConfig = {
        type: "bar",
        data: propositionsData,
        options: {
            responsive: true,
            scales: {
                yAxisRight: {
                    position: "right", // `axis` is determined by the position as `'y'`
                },
                yAxisleft: {
                    position: "left", // `axis` is determined by the position as `'y'`
                }
            }
        }
    };
    /* eslint-disable no-unused-vars,no-undef */
    const propositionsCanvas = document.getElementById("speciesPropositionInTimeCanvas");
    const propositionsChart = new Chart(propositionsCanvas.getContext("2d"), propositionsConfig);
    /* eslint-enable no-unused-vars,no-undef */
}


function buildRegionsGraph () {
    // numRegion, compteur
    const regionsCount = new Map();
    // num numRegion, region() libellé)
    const regionLabels = new Map();

    listObservations.observations.forEach(obs=>{
        if (regionsCount.get(obs.numRegion)==null) {
            regionsCount.set(obs.numRegion,1);
            regionLabels.set(obs.numRegion,obs.region);
        } else {
            regionsCount.set(obs.numRegion,regionsCount.get(obs.numRegion)+1);
        }
    });

    const regionsLabels = [];
    const countRegionsData = [];
    // tri descendant score
    const sortedRegions = new Map([...regionsCount.entries()].sort((a, b) => b[1] - a[1]));
    sortedRegions.forEach(function (value, key) {
        regionsLabels.push(regionLabels.get(key));
        countRegionsData.push(value);
    });

    const regionsData = {
        labels: regionsLabels,
        datasets: [{
            // label: 'Répartition des observations par région',
            backgroundColor: LIGHT_CHART_COLORS.red,
            borderColor: CHART_COLORS.red,
            borderWidth: 1,
            data: countRegionsData,
        }]
    };
    const regionsConfig = {
        type: "bar",
        data: regionsData,
        options: noLegendOptions
    };
    /* eslint-disable no-unused-vars,no-undef */
    const regionsCanvas = document.getElementById("regionsCanvas");
    const regionsChart = new Chart(regionsCanvas.getContext("2d"), regionsConfig);
    /* eslint-enable no-unused-vars,no-undef */
}

function buildTimelineGraph () {
    // min datecrea found
    let dateCreaMin=new Date(listObservations.observations[0].dateCrea);
    // max datecrea found
    let dateCreaMax=new Date(listObservations.observations[0].dateCrea);

    listObservations.observations.forEach(obs=>{
        if (new Date(obs.dateCrea)<dateCreaMin) {
            dateCreaMin=new Date(obs.dateCrea);
        }
        if (new Date(obs.dateCrea)>dateCreaMax) {
            dateCreaMax=new Date(obs.dateCrea);
        }
    });
    //console.log('minDate= '+dateCreaMin+' maxDate= '+dateCreaMax);
    // const months = monthsBtwnDates(dateCreaMin,dateCreaMax);
    //console.log('months between= '+months);

    // build an array with months between start and end
    const monthList=new Map();

    //set both start and end date to first date of the month
    const endDate = new Date(dateCreaMax.getFullYear(), dateCreaMax.getMonth(), 1);
    const startDate = new Date(dateCreaMin.getFullYear(), dateCreaMin.getMonth(), 1);

    while (startDate<=endDate) {
        monthList.set(startDate.toLocaleString("default", { month: "long" , year: "numeric"}),0);
        startDate.setMonth(startDate.getMonth() + 1);
    }

    listObservations.observations.forEach(obs=>{
        const date = (new Date(obs.dateCrea)).toLocaleString("default", { month: "long" , year: "numeric"});
        monthList.set(date,monthList.get(date)+1);
    });

    const timelineData = {
        labels: Array.from(monthList.keys()),
        datasets: [{
            // label: 'Répartition des observations dans le temps',
            backgroundColor: LIGHT_CHART_COLORS.purple,
            borderColor: CHART_COLORS.purple,
            borderWidth: 1,
            data: Array.from(monthList.values()),
        }]
    };
    const timelineConfig = {
        type: "bar",
        data: timelineData,
        options: noLegendOptions
    };
    /* eslint-disable no-unused-vars,no-undef */
    const timelineCanvas = document.getElementById("timelineCanvas");
    const timelineChart = new Chart(timelineCanvas.getContext("2d"), timelineConfig);
    /* eslint-enable no-unused-vars,no-undef */
}

function	buildGroupsGraph () {
    const groupSimpleCount = new Map();
    const groupSimpleLabels = new Map();

    listObservations.observations.forEach(obs=>{
        if (groupSimpleCount.get(obs.groupSimple)==null) {
            groupSimpleCount.set(obs.groupSimple,1);
            groupSimpleLabels.set(obs.groupSimple,obs.lbGroupSimple);
        } else {
            groupSimpleCount.set(obs.groupSimple,groupSimpleCount.get(obs.groupSimple)+1);
        }
    });

    const groupsSimpleLabels = [];
    const countGroupSimpleData = [];
    // tri descendant score
    const sortedGroupSimple = new Map([...groupSimpleCount.entries()].sort((a, b) => b[1] - a[1]));
    sortedGroupSimple.forEach(function (value, key) {
        groupsSimpleLabels.push(groupSimpleLabels.get(key));
        countGroupSimpleData.push(value);
    });

    const groupSimpleData = {
        labels: groupsSimpleLabels,
        datasets: [{
            // label: 'Répartition des observations par groupe grand public',
            backgroundColor: LIGHT_CHART_COLORS.green,
            borderColor: CHART_COLORS.green,
            borderWidth: 1,
            data: countGroupSimpleData,
        }]
    };
    const groupSimpleConfig = {
        type: "bar",
        data: groupSimpleData,
        options: noLegendOptions
    };
    /* eslint-disable no-unused-vars,no-undef */
    const groupSimpleCanvas = document.getElementById("groupeSimpleCanvas");
    const groupSimpleChart = new Chart(groupSimpleCanvas.getContext("2d"), groupSimpleConfig);
    /* eslint-enable no-unused-vars,no-undef */
}
