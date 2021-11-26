/* Common file, loading, main functions */

const inpnUrlBase='https://inpn.mnhn.fr/inpn-web-services/inpnespece/';
var USER_ID=20784;
// latest obs
var latestObs;
// global list of observations to gather
var listObservations;
// contributor info
var currentContributor;
// index current loading page
let index;
// is loading on?
var isMoreLoadingOn=false;
var isLoopLoadingOn=false;
// observer bottom page
var observer;
// filtres affiché
var areFiltersDisplayed=false;
// tris affichés
var areSortersDisplayed=false;
// Timout constant for API calls
const TIMEOUT=15000;


/***
**
**	Page Loading!
**
****/

// loading the observations at startup
window.onload = function() {
	loadAll()
};

async function loadAll(){
	initInputKeyPress();
	await checkContributorCookie();
	// inactivateBtn('allGo');
	// inactivateBtn('allStat');
	toggleAllNoneButtonsByFamily('go');
	toggleAllNoneButtonsByFamily('status');
	inactivateBtn('updateObs');
	inactivateBtn('loadAll');
	document.getElementById('upwards').style.opacity = "0";

	var helpClosed = await checkHelpCookie();
	if(helpClosed!=null && helpClosed!='true'){
		showHelp();
	}
	await loadContributor();
	if(currentContributor!=null){
		console.log("contrib ok");
		addNotification("success","Succès","Utilisateur&middot;trice "+currentContributor.pseudo+" chargé&middot;e");
	} else {
		addNotification("","Echec","Erreur lors du chargement de l'utilisateur&middot;trice "+USER_ID);
	}

	await loadLatestObs();
	if(latestObs!=null){
		console.log("latestObs ok");
		addNotification("success","Succès","Première observation chargée. Nombre total d'observations : "+latestObs.totLines);
	} else {
		addNotification("","Echec","Erreur lors du chargement de la dernière observation");
	}

	// WIP
	const userData = getFromLocalStorage(currentContributor.idUtilisateur);
	var pastIds;
	if(userData!=null){
		pastIds = userData.ids;
	}
	// var pastIds = getFromLocalStorage('ids');
	if(pastIds!=null){
		addNotification("info","Information",pastIds.length+" observations déjà connues sur ce navigateur sont en cours de téléchargement");
		startProgressAnimation();
		await updateObsFromStorageIds(pastIds);
		stopProgressAnimation();
		addNotification("success","Succès",listObservations.observations.length+" observations rechargées");
	} else {
		await loadSomeMore();
		console.log("more ok");
		activateBtn('loadAll');
		document.getElementById('loadAll').title=`Cliquer ici pour charger toutes les observations de ${currentContributor.pseudo}`;
		document.getElementById('loadAll').innerHTML = 'Charger les observations';
	}

	createObserver();
	console.log("observer ok");
}

/***
**
**	Observer to control bottom (of page) obs loading behavior
**
****/

function createObserver() {
		let bottom= document.querySelector("#bottom");

	  let options = {
	    root: null,
	    rootMargin: "0px",
	    threshold: 0.5
	  };

		if(observer==null){
			observer = new IntersectionObserver(handleIntersect, options);
			observer.observe(bottom);
		}
}

function handleIntersect(entries, observer) {
	entries.forEach((entry) => {
	    if (entry.isIntersecting===true) {
	    	console.log('intersecting!');
				let bottomDiv= document.getElementById("bottom");
				bottomDiv.style.animationName='bottomColorChange';

	    	async function loadMoreWaitAndRender(){
	    	    await loadSomeMore();
		    		console.log('loadmorewaitrender done');
						bottomDiv.style.animationName='';
	    	}
		    // call more loading!
		    loadMoreWaitAndRender();
			}
	});
}

/***
**
**	INPN data loading and rendering
**
****/

async function loadContributor(){
	// url to load contributo info
	const urlContributor=inpnUrlBase+"contributor/"+USER_ID;
	console.log('loading contributor info from: '+urlContributor);
	const urlValidatedObservations=inpnUrlBase+"data?paginStart=1&paginEnd=1&idUtilisateur="+USER_ID+"&filtreStatutValidation=5";

	async function renderContributor() {
		currentContributor = await callAndWaitForJsonAnswer(urlContributor);

		if(currentContributor==null){
			alert('Erreur lors du chargement pour l\'ID '+USER_ID);
		} else {
	    let html = '';
	    let htmlSegment = `<img onclick="buildStats()" id="profilePic" alt="contributor profile picture" src="${currentContributor.avatar}">
						   <div title="${currentContributor.prenom} ${currentContributor.nom}" class="pseudo">${currentContributor.pseudo}</div>
						   <div class="totalScore">${currentContributor.ScoreTotal} points</div>`;
			html += htmlSegment;

	    html += '</div>';
	    let container = document.querySelector('.contributorDetails');
	    container.innerHTML = html;
	    let input = document.getElementById('contributorId');
			input.value=USER_ID;

			// validated obs new API call
			var response = await callAndWaitForJsonAnswer(urlValidatedObservations);
			var obsValidatedCount;
			if(response!=null&&response.totLines!=null){
				obsValidatedCount=response.totLines + " observations validées";
			} else {
				obsValidatedCount="Erreur au chargement du nombre d'observations validées :(";
			}
			document.querySelector('.totalScore').title=`${obsValidatedCount}`;

			// user is now loaded, display buttons and tooltips
			document.getElementById('profilePic').title=`Cliquer ici pour afficher les statistiques de ${currentContributor.pseudo}`;
		}
	}
	await renderContributor();
}

async function loadLatestObs(){
	//url to load latest observation
	const urlLatestObservation=inpnUrlBase+"data?paginStart=1&paginEnd=1&idUtilisateur="+USER_ID;
	console.log('loading latest obs from: '+urlLatestObservation);

	async function renderLatestObs() {
			let observation = await callAndWaitForJsonAnswer(urlLatestObservation);
	    if(observation!=null){
	    	index = 1;
		    latestObs = observation;
		    console.log("latestObs is set!");
		    listObservations = observation;
				renderProgress();
	    } else {
				alert('Erreur lors du chargement de la première observation. Veuillez réessayer ultérieurement');
			}
		await renderObs();
	}
	await renderLatestObs();
}

function renderProgress(){
	let size = 0;
  if(listObservations!=null&&listObservations.observations!=null) {
		size = listObservations.observations.length;
	}

	let percentage ='N/A';
	let total = 'N/A';
	if(latestObs!=null&&latestObs.totLines!=0){
		total = latestObs.totLines;
		percentage = (size/latestObs.totLines*100).toFixed(0);
	}

	if(currentContributor!=null){
		let percentBar = document.getElementById('percentage');
		percentBar.style.width=(percentage+'%');
		let meter = document.querySelector('.meter');
		meter.title=`${percentage}% des observations chargées (${size} sur ${total})`;
	}
}

async function getAndAddAllObservations(url) {
		let observation = await callAndWaitForJsonAnswer(url);
		// add all
		if(observation==null){
			alert('Erreur lors du chargement des observations. Veuillez réessayer ultérieurement');
		} else {
			// preventing duplicates in observations by idData
			observation.observations.forEach(newObs=>{
				if (!listObservations.observations.some(o => o.idData === newObs.idData)) {
					listObservations.observations.push(newObs);
				} else{
					console.log("No need to add obs id "+newObs.idData+" as it was already present in list");
				}
			});

			// listObservations.observations.push(...observation.observations);
			renderProgress();
		}
		return (observation!=null);
}

async function loopLoading(){
	// loop load for current userId
	console.log('Attempt at loop loading for: '+USER_ID);

	if(latestObs!=null){

		if(isMoreLoadingOn){
			console.log('Can\'t start loop loading : more loading in progress');
			alert('Veuillez attendre quelques instants que le chargement en cours se termine, avant de réessayer.');
		} else {
			let buttonLoadAll = document.getElementById('loadAll');
			if(isLoopLoadingOn){
				// stop it!
				isLoopLoadingOn = false;
				// turn "load all" button to "pause"
				buttonLoadAll.innerHTML = 'Charger les observations';
				buttonLoadAll.title=`Cliquer ici pour charger toutes les observations de ${currentContributor.pseudo}`;
			} else {
				isLoopLoadingOn=true;
				// turn "load all" button to "pause"
				buttonLoadAll.innerHTML = '(mettre en pause)';
				buttonLoadAll.title=`Cliquer ici pour arrêter le chargement des observations de ${currentContributor.pseudo}. La progression ne sera pas perdue.`;
				buttonLoadAll.style.fontStyle='italic';

				startProgressAnimation();

				// looping
				for(index; index< latestObs.totLines; index=index+16){
					// could be stopped from elsewhere...
					if(isLoopLoadingOn){
						let paginEnd=index+16;
						if(paginEnd>latestObs.totLines){
							paginEnd=latestObs.totLines;
						}
						let paginStart = index+1;
						let obsUrl=inpnUrlBase+"data?paginStart="+paginStart+"&paginEnd="+paginEnd+"&idUtilisateur="+USER_ID;
						console.log('loop : loading obs from '+obsUrl);

						if(await getAndAddAllObservations(obsUrl)){
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
				if(index< latestObs.totLines){
					buttonLoadAll.innerHTML = 'Charger les observations';
					buttonLoadAll.title=`Cliquer ici pour charger toutes les observations de ${currentContributor.pseudo}`;
				} else{
					deactivateLoadAllButton();
					activateUpdateAllButton();
					addNotification("success","Succès","Toutes les "+latestObs.totLines+" observations ont bien été chargées.");
				}
				// trying to keep list ids storage
				saveCurrentUserDataInStorage();
				buttonLoadAll.style.fontStyle='unset';
				stopProgressAnimation();
			}
		}
	}
}

async function loadSomeMore(){
	// loop load for current userId
	console.log('Attempt at more loading for: '+USER_ID);

	if(latestObs!=null && !isMoreLoadingOn && !isLoopLoadingOn){

		if(listObservations.observations.length<latestObs.totLines && index<latestObs.totLines){
			isMoreLoadingOn=true;
			startProgressAnimation();

			let paginStart = index+1;
			let paginEnd=index+16;
			if(paginEnd>latestObs.totLines){
				paginEnd=latestObs.totLines;
			}
			let obsUrl=inpnUrlBase+"data?paginStart="+paginStart+"&paginEnd="+paginEnd+"&idUtilisateur="+USER_ID;
			console.log('loadMore : loading obs from '+obsUrl);

			if(await getAndAddAllObservations(obsUrl)){
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
			if(index< latestObs.totLines){
					// do nothing
			} else {
				deactivateLoadAllButton();
				activateUpdateAllButton();
			}
			// list ids in localStorage
			saveCurrentUserDataInStorage();
		} else {
			console.log("not loading any more, we reached the end!");
		}
	} else {
		console.log("loading still in progress");
	}
}

function saveCurrentUserDataInStorage(){
	if(listObservations!=null && currentContributor!=null){
		var ids = [];
		var lastModifDate;
		listObservations.observations.forEach(obs => {
			if(!ids.includes(obs.idData)){
				ids.push(obs.idData);
			}
			if(lastModifDate==null && obs.dateModif != null){
				lastModifDate = obs.dateModif;
			} else if(obs.dateModif != null && lastModifDate!=null && new Date(obs.dateModif)>new Date(lastModifDate)){
				lastModifDate = obs.dateModif;
			}
		});
		const userData = {
			"ids": ids,
			"lastModifDate": lastModifDate,
			"score": currentContributor.ScoreTotal
		};
		console.log("Will attempt to save "+ids.length+" ids to localStorage");
		putInLocalStorage(currentContributor.idUtilisateur,userData);
	}
}

async function updateObsFromStorageIds(pastIds){
	console.log("Found ids of obs previously loaded! Will try to update them");
	var cpt=0;
	var firstObsInPastIds=false;
	var idFirst = listObservations.observations[0].idData;
	for (const id of pastIds){
		// do not want to duplicate the first previously loaded
		if(idFirst!=id){
			var currObs = await getOneObservation(id);
			listObservations.observations.push(currObs);
			cpt++;
			if(cpt%10===0){
				await renderObs();
				renderProgress();
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
	if(listObservations.totLines>listObservations.observations.length){
		var numberMissingObs = listObservations.totLines-listObservations.observations.length;
		if(firstObsInPastIds){
			numberMissingObs++;
		}
		// we might have, in time :
		// latest (first) obs - missing obs? - obs already loaded by id - missing obs, never loaded?
		console.log("missing "+numberMissingObs+" obs");
		// starting at 2 because we already have the first obs
		var cpt = 2;
		var fastForward=false;
		for(cpt; cpt< numberMissingObs; cpt=cpt+1){

			let paginEnd=cpt;
			let paginStart = cpt;
			let obsUrl=inpnUrlBase+"data?paginStart="+paginStart+"&paginEnd="+paginEnd+"&idUtilisateur="+USER_ID;
			console.log('complete after storage ids : loading obs from '+obsUrl);

			let observation = await callAndWaitForJsonAnswer(obsUrl);
			// add all
			if(observation==null){
				alert('Erreur lors du chargement des observations. Veuillez réessayer ultérieurement');
				break;
			} else {
				// preventing duplicates in observations by idData
				observation.observations.forEach(newObs=>{
					if (!listObservations.observations.some(o => o.idData === newObs.idData)) {
						listObservations.observations.push(newObs);
					} else{
						console.log("No need to add obs id "+newObs.idData+" as it was already present in list");
						fastForward=true;
					}
				});
				if(fastForward){
					break;
				}
				renderProgress();
			}
		}
		await renderObs();

		if(fastForward){
			// means we can fast forward if still needed!
			if(listObservations.totLines>listObservations.observations.length){
				// keep going. But let's bypass all the obs already loaded...
				var cptEnd = listObservations.observations.length+1;
				// 1 2 12 4.
				// 19>15 On veut charger de 19-4 à 19
				// (1) - (2 3) - 4 5 6 7 8 9 10 11 12 13 14 15 - 16 17 18 19

				for(cptEnd; cptEnd<= listObservations.totLines; cptEnd=cptEnd+1){

					let paginEnd=cptEnd;
					let paginStart = cptEnd;
					let obsUrlEnd=inpnUrlBase+"data?paginStart="+paginStart+"&paginEnd="+paginEnd+"&idUtilisateur="+USER_ID;
					console.log('complete END after storage ids : loading obs from '+obsUrlEnd);

					let observation = await callAndWaitForJsonAnswer(obsUrlEnd);
					// add all
					if(observation==null){
						alert('Erreur lors du chargement des observations. Veuillez réessayer ultérieurement');
						break;
					} else {
						// preventing duplicates in observations by idData
						observation.observations.forEach(newObs=>{
							if (!listObservations.observations.some(o => o.idData === newObs.idData)) {
								listObservations.observations.push(newObs);
							} else{
								console.log("Should not happen : no need to add obs id "+newObs.idData+" as it was already present in list");
							}
						});
						renderProgress();
					}
				}
				await renderObs();
			}
		}
		if(listObservations.totLines>listObservations.observations.length){
			console.log("Something wrong happened");
			// error?
			// activate load all button ?
			activateBtn('loadAll');
			// useless? already the case?
			inactivateBtn('updateObs');
		} else {
			saveCurrentUserDataInStorage();
			// all loaded, inactivate load all (useless, already?)
			inactivateBtn('loadAll');
			// update button activated
			activateBtn('updateObs');
		}

	} else {
		// all loaded, inactivate load all (useless, already?)
		inactivateBtn('loadAll');
		// update button activated
		activateBtn('updateObs');
	}
}

function buildProgress(idStatus){
    let html = '';
		if(idStatus==null){
			html+=`<span class="status99 done">Erreur dans les données, validation vide</span>`;
		} else if(idStatus==0 || idStatus==6){
    	html+=`<span class="status${idStatus} done">Erreur ou invalidée : ${idStatus}</span>`;
    } else {
    	for (let i = 1; i < 6; i++) {
    		let current = '';
    		if(i<=idStatus){
    			current=' done';
    		}
				html+=`<span class="status${i}${current}">${i}</span>`;
	    	if (i!=5){
	    		html+=`<span>&nbsp;&gt;&nbsp;</span>`;
	    	}
    	}
    }
	return html;
}

async function renderObs() {

	if(listObservations!=null){

		var sorted;
		if(document.getElementById('dateModif').checked){
			//ordering by modif latest
			sorted = sortByModificationLatest(listObservations.observations);
		} else if(document.getElementById('dateCrea').checked) {
			//ordering by creation latest
			sorted = sortByCreationLatest(listObservations.observations);
		} else {
			// points
			sorted = sortByPoints(listObservations.observations);
		}

	    let html = '';
			// no column, all in blocks
	    sorted.forEach(obs => {
	    	let title = obs.nomComplet;
	    	if(title==''){
	    		title='-';
	    	}
	    	let progress = buildProgress(obs.validation.idStatus);
	    	let creationDate = new Date(obs.dateCrea).toLocaleDateString('fr-FR');
	    	let creationTime = new Date(obs.dateCrea).toLocaleTimeString('fr-FR');

	    	let modificationDateTime='N/A';
	    	if(obs.dateModif!=''){
					modificationDateTime = new Date(obs.dateModif).toLocaleDateString('fr-FR') +" à "+ new Date(obs.dateModif).toLocaleTimeString('fr-FR');
	    	}

				let groupeSimpleSvgName='';
				let groupeSimpleLabel='';
				// TODO load et const Array groupes simple/GP ?
				const groupesSimplesUnicode = new Map();
				groupesSimplesUnicode.set('111','&#128012;');
				groupesSimplesUnicode.set('148','&#128038;');
				groupesSimplesUnicode.set('154','&#129418;');
				groupesSimplesUnicode.set('158','&#128031;');
				groupesSimplesUnicode.set('501','&#127812;');
				groupesSimplesUnicode.set('502','&#129408;');
				groupesSimplesUnicode.set('504','&#129419;');
				groupesSimplesUnicode.set('505','&#127807;');
				groupesSimplesUnicode.set('506','&#128013;');
				groupesSimplesUnicode.set('24222202','&#8230;');

				var filtered = '';
				var isValidEmpty=isValidationEmpty(obs);
				// only displaying if both checkbox are checked!
				if(document.getElementById(obs.groupSimple).checked){
					// displaying even if data error
					if(isValidEmpty || document.getElementById(obs.validation.idStatus).checked){
						filtered=`style="display:initial;"`;
					} else {
						filtered=`style="display:none;"`;
					}
				} else {
					filtered=`style="display:none;"`;
				}
				var validStatus='';
				var validLabel='';
				if(isValidEmpty){
					validStatus='99';
					validLabel='Erreur de données, validation vide';
				} else {
					validStatus=obs.validation.idStatus;
					validLabel=obs.validation.lbStatus;
				}
	      let htmlSegment = `<div id="${obs.idData}" class="obs status${validStatus} go${obs.groupSimple}"
														onclick="showDetails(${obs.idData})" ${filtered}>
	                            <img src="${obs.photos[0].thumbnailFileUri}" >
	                            <div class="score">${obs.scoreTotal} pts</div>
	                            <div title="${obs.nomCommuns}" class="details">
	                            	<h2>${title} </h2>
		                            <p>Observation envoyée le ${creationDate} à ${creationTime}</p>
		                            <p>Dernière modification : ${modificationDateTime}</p>
																<p>${obs.region}</p>
		                        	</div>
	                          	<div title="${validLabel}" class="progress">
	                            	${progress}
	                        		</div>
															<div class="taxon" title="${obs.lbGroupSimple}">
																<span style="font-size: 30px;">${groupesSimplesUnicode.get(obs.groupSimple)}</span>
															</div>
	                        </div>`;
				html += htmlSegment;
	    });
	    html += '</div>';
	    let container = document.querySelector('.container');
	    container.innerHTML = html;

	} else {
		console.log("listObs was undefined, could not render any obs");
	}
}

function isValidationEmpty(observation){
	var isValEmpty = (observation.validation==null||observation.validation.idStatus==null);
	if(isValEmpty){
		console.log('observation '+observation.idData+' has no validation content?!');
	}
	return isValEmpty;
}

function changeContributor(){
	// getting input from field
	let userId = document.getElementById('contributorId').value;
	if(userId!=null && userId>0){
		console.log("Will attempt to load data for contributor "+userId);
		if(USER_ID!=null &&USER_ID!=userId){
			USER_ID = userId;
			reinit();
			currentContributor=null;
			// keeping this value for 10 days max
			setCookie("contributorId", userId, 10);
			loadAll();
		} else if (USER_ID!=null){
			// same userId!
			console.log("same userId as before! Doing nothing");
		}
	} else {
		console.log("Invalid contributorId: "+userId);
	}
}

function cleanAll(){
	reinit();
	loadAll();
}

function reinit(){
	listObservations=null;
	latestObs=null;
	isLoopLoadingOn=false;
	isMoreLoadingOn=false;
	observer.unobserve(document.querySelector("#bottom"));
	observer=null;
	index=0;
	document.querySelector('.container').innerHTML = '';
	renderProgress();
}

function sortObs(){
	renderObs();
}

const itemReplacer = (array, oldItem, newItem) =>
  array.map(item => item === oldItem ? newItem : item);

async function getOneObservation(id){
	const getOneUrl=inpnUrlBase+"data/"+id;
	return await callAndWaitForJsonAnswer(getOneUrl);
}

function compareStringDatesModif(a,b){
	if(a.dateModif=='' && b.dateModif==''){
		return 0;
	} else if(a.dateModif=='') {
		return -1;
	} else  if(b.dateModif==''){
		return 1;
	} else {
		var dateA = new Date(a.dateModif);
		var dateB = new Date(b.dateModif);

		if(dateA>dateB){
			return -1;
		} else if(dateA<dateB) {
			return 1;
		} else {
			return 0;
		}
	}
}

async function updateOneObservation(obs){
	var updatedObs = await getOneObservation(obs.idData);
	var changed = false;
	if(updatedObs!=null){
		//console.log(updatedObs);
		if(compareStringDatesModif(updatedObs,obs)<0){
			// we want to keep the new one
			itemReplacer(listObservations.observations,obs,updatedObs);
			changed = true;
			console.log('Updated obs id '+updatedObs.idData+' - dateModif '+updatedObs.dateModif+' > '+obs.dateModif);
		} else {
			console.log('No need to update obs id '+updatedObs.idData+' - no change in dateModif');
		}
	} else {
		console.log('Erreur lors du chargement d\'une observation. Veuillez réessayer ultérieurement');
	}
	return changed;
}

async function loadRightAmountMissingObs(diff){
	// load the right amount needed!
	var paginStart=1;

	let obsUrlDiff=inpnUrlBase+"data?paginStart="+paginStart+"&paginEnd="+diff+"&idUtilisateur="+USER_ID;
	console.log('Diff : loading obs from '+obsUrlDiff);

	if(await getAndAddAllObservations(obsUrlDiff)){
		// rendering
		await renderObs();
		// newLoadedObsCpt = diff;
		listObservations.totLines=latestObs.totLines;
	} else {
		// Error while loading : break
		console.log('Diff : error while loading new obs');
	}
	return newLoadedObsCpt;
}

async function updateObservations(){
	var callCpt=0;
	var updatedCpt=0;
	var newLoadedObsCpt=0;
	startProgressAnimation();

	await Promise.all(listObservations.observations.map(async (obs) => {
		if(obs.validation==null || (obs.validation.idStatus!=0 && obs.validation.idStatus!=5 && obs.validation.idStatus!=6)){
			callCpt++;
			var changed = await updateOneObservation(obs);
			if(changed){
				updatedCpt++;
			}
		}
	}));

	if(updatedCpt>0){
		// refresh view
		renderObs();
	}
	console.log('Called '+callCpt+' times the update for non validated observations, made '+updatedCpt+' changes to current list');

	// One call to get a refreshed totLines - if matching, we have all. If not, need to loadLoop until done...
	const urlLatestObservation=inpnUrlBase+"data?paginStart=1&paginEnd=1&idUtilisateur="+USER_ID;
	let observation = await callAndWaitForJsonAnswer(urlLatestObservation);
	if(observation!=null){
		latestObs = observation;
		var diff = latestObs.totLines-listObservations.totLines;
		console.log("latestObs up to date. "+diff+" new obs to load");
		if (diff>0){
			// // load the right amount needed!
			// var paginStart=1;
			//
			// let obsUrlDiff=inpnUrlBase+"data?paginStart="+paginStart+"&paginEnd="+diff+"&idUtilisateur="+USER_ID;
			// console.log('Diff : loading obs from '+obsUrl);
			//
			// if(await getAndAddAllObservations(obsUrlDiff)){
			// 	// rendering
			// 	await renderObs();
			// 	newLoadedObsCpt = diff;
			// 	listObservations.totLines=latestObs.totLines;
			// } else {
			// 	// Error while loading : break
			// 	console.log('Diff : error while loading new obs');
			// }
			newLoadedObsCpt = await loadRightAmountMissingObs(diff);
		}
		listObservations = observation;
		renderProgress();
	} else {
		alert('Erreur lors du chargement de la première observation. Veuillez réessayer ultérieurement');
	}
	if(updatedCpt>0&&newLoadedObsCpt>0){
		// we had changes!
		// refresh score as well
		loadContributor();
		// trying to keep list ids storage
		saveCurrentUserDataInStorage();
	}
	console.log(updatedCpt+'updated validated observations and '+newLoadedObsCpt+' new loaded one(s)');
	stopProgressAnimation();
}

/***
**
**	Inputs and animations toggling (on/off)
**
****/

function deactivateLoadAllButton(){
	let buttonLoadAll = document.getElementById('loadAll');
	buttonLoadAll.innerHTML = 'Observations chargées';
	buttonLoadAll.title=`Toutes les observations de ${currentContributor.pseudo} ont été chargées.`;
	buttonLoadAll.style.pointerEvents='none';
	buttonLoadAll.style.backgroundColor='lightgray';
}

function activateUpdateAllButton(){
	activateBtn('updateObs');
	document.getElementById('updateObs').title=`Lancer une mise à jour de toutes les observations non encore validées (peut prendre du temps!)`;
}

function startProgressAnimation(){
	let meter = document.querySelector('.progressMeter');
	meter.style.animationName='backgroundChange';
	meter.style.animationDuration='4s';
	meter.style.animationIterationCount='infinite';
	meter.style.animationDirection='alternate';
}

function stopProgressAnimation(){
	document.querySelector('.progressMeter').style.animation='unset';
}

function toggleAllNoneButtonsByFamily(prefix){
	// check if we need to desactivate buttons
	var checkboxes= document.querySelectorAll('.'+prefix);
	var areAllOn = true;
	var areAllOff = true;
	checkboxes.forEach(checkbox=>{
		if(areAllOn){
			if(!checkbox.checked){
				areAllOn=false;
			}
		}
		if(areAllOff){
			if(checkbox.checked){
				areAllOff=false;
			}
		}
	});

	var allBtnId='';
	var noneBtnId='';
	if(prefix=='status'){
		allBtnId='allStat';
		noneBtnId='noneStat';
	} else {
		allBtnId='allGo';
		noneBtnId='noneGo';
	}

	if(areAllOn){
		inactivateBtn(allBtnId);
		activateBtn(noneBtnId);
	} else if(areAllOff){
		inactivateBtn(noneBtnId);
		activateBtn(allBtnId);
	} else {
		// some on some off
		activateBtn(allBtnId);
		activateBtn(noneBtnId);
	}
}

function allGo(){
	toggleAllFilters(true,'go');
	inactivateBtn('allGo');
	activateBtn('noneGo');
}

function noneGo(){
	toggleAllFilters(false,'go');
	inactivateBtn('noneGo');
	activateBtn('allGo');
}

function allStat(){
	toggleAllFilters(true,'status');
	inactivateBtn('allStat');
	activateBtn('noneStat');
}

function noneStat(){
	toggleAllFilters(false,'status');
	inactivateBtn('noneStat');
	activateBtn('allStat');
}

function inactivateBtn(id){
	document.getElementById(id).style.backgroundColor='gray';
	document.getElementById(id).style.pointerEvents='none';
	document.getElementById(id).style.fontStyle='italic';
}

function activateBtn(id){
	document.getElementById(id).style.backgroundColor='';
	document.getElementById(id).style.pointerEvents='unset';
	document.getElementById(id).style.fontStyle='unset';
}

function toggleLeftFilters(){
	if(areFiltersDisplayed){
		areFiltersDisplayed=false;
		document.querySelector('.leftFilters').style='';
		document.getElementById('toggleLeftFilters').innerHTML='Afficher les filtres';
		document.getElementById('toggleLeftFilters').title="Cliquer ici pour afficher les filtres par catégories"
	} else {
		areFiltersDisplayed=true;
		document.querySelector('.leftFilters').style.left='0';
		document.querySelector('.leftFilters').style.boxShadow='-12px -12px 15px -5px black';
		document.getElementById('toggleLeftFilters').innerHTML='Masquer les filtres';
		document.getElementById('toggleLeftFilters').title="Cliquer ici pour masquer les filtres par catégories"
	}
}

function toggleRightSorters(){
	if(areSortersDisplayed){
		areSortersDisplayed=false;
		document.querySelector('.rightSorters').style='';
		document.getElementById('toggleRightSorters').innerHTML='Afficher les tris';
		document.getElementById('toggleRightSorters').title="Cliquer ici pour afficher les tris"
	} else {
		areSortersDisplayed=true;
		document.querySelector('.rightSorters').style.right='0';
		document.querySelector('.rightSorters').style.boxShadow='12px -12px 15px -5px black';
		document.getElementById('toggleRightSorters').innerHTML='Masquer les tris';
		document.getElementById('toggleRightSorters').title="Cliquer ici pour masquer les tris"
	}
}

/***
**
**	Data sorting
**
****/

function sortByModificationLatest(observations){
	console.log("Ordering observations...");
	if(observations!=null){
		observations.sort(compareStringDatesModif);
	}
	return observations;
}

function sortByCreationLatest(observations){
	console.log("Ordering observations...");
	if(observations!=null){
		observations.sort(function(a,b){
			var dateA = new Date(a.dateCrea);
			var dateB = new Date(b.dateCrea);
			if(dateA>dateB){
				return -1;
			} else if(dateA<dateB) {
				return 1;
			} else {
				return 0;
			}
		});
	}
	return observations;
}

function sortByPoints(observations){
	console.log("Ordering observations...");
	if(observations!=null){
		observations.sort(function(a,b){
			var pointsA = a.scoreTotal;
			var pointsB = b.scoreTotal;
			if(pointsA>pointsB){
				return -1;
			} else if(pointsA<pointsB) {
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
**	Filtering
**
****/

function filterObsStatus(checkbox){
	filterObs('status',checkbox);
}
function filterObsGo(checkbox){
	filterObs('go',checkbox);
}

function filterObs(prefix,checkbox){

	// elements by class with matching code
	var allWithClassName = document.querySelectorAll(`.${prefix}${checkbox.id}.obs`);

	if(checkbox.checked){
		allWithClassName.forEach(div=>{

			// get other class values and verify not unchecked!
			const statusRegex = new RegExp('status*');
			const goRegex = new RegExp('go*');

			var checkId;
			div.classList.forEach(val=>{
				if(prefix=='status'){
					if(goRegex.test(val)){
			      checkId = val.match(/\d+/)[0];
			    }
				} else {
					// prefix = go
					if(statusRegex.test(val)){
						checkId = val.match('[1-9]')[0];
					}
				}
			});
			// we now know which one we need to verify...
			// if checked too:
			if(document.getElementById(checkId).checked){
				div.style.display='initial';
			}

		});
	} else {
		allWithClassName.forEach(div=>{
			div.style.display='none';
		});
	}
	toggleAllNoneButtonsByFamily(prefix);
}

function toggleAllFilters(turnOn,prefix){
	var checkboxes= document.querySelectorAll('.'+prefix);
	var change = false;
	checkboxes.forEach(checkbox=>{
		if(turnOn){
			if(!checkbox.checked){
				checkbox.checked=true;
				if(!change){
					change=true;
				}
			}
		} else {
			if(checkbox.checked){
				checkbox.checked=false;
				if(!change){
					change=true;
				}
			}
		}
	});
	if(change) {
		// refresh
		renderObs();
	}
}

/***
**
**	Showing/hiding background, help
**
****/

function blurBackground() {
	document.querySelector('.filter').style.filter='blur(5px) grayscale(60%)';
	document.querySelector('.menu').style.filter='blur(5px) grayscale(60%)';
	document.querySelector('.leftFilters').style.filter='blur(5px) grayscale(60%)';
	document.querySelector('.rightSorters').style.filter='blur(5px) grayscale(60%)';
	document.body.className = "noclick";
	// prevent scrolling
	document.documentElement.style.overflow = 'hidden';
	document.body.scroll = "no";
}

function unblurBackground() {
	document.querySelector('.filter').style.filter='none';
	document.querySelector('.menu').style.filter='none';
	document.querySelector('.leftFilters').style.filter='none';
	document.querySelector('.rightSorters').style.filter='none';
	document.body.classList.remove('noclick');
	// re allow scrolling
	document.documentElement.style.overflow = 'scroll';
	document.body.scroll = "yes";
}

function showHelp(){
	let helpDiv = document.querySelector('.help');
	//helpDiv.innerHTML=``;
	helpDiv.style.visibility="visible";
	helpDiv.id='popup';
	helpDiv.scrollTop = 0;
	blurBackground();
}

function closeHelp(){
	setCookie('helpClosed','true',30);
	unblurBackground();
	document.querySelector('.help').style.visibility="collapse";
	document.querySelector('.help').id='';
}
