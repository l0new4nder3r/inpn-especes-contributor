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

function initInputKeyPress(){
	// Get the input field
	var contributorInput = document.getElementById("contributorId");

	// Execute a function when the user releases a key on the keyboard
	contributorInput.addEventListener("keyup", function(event) {
	  // Number 13 is the "Enter" key on the keyboard
	  if (event.keyCode === 13) {
	    // Trigger the action
	    changeContributor();
	  }
	});
}

function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  let expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/" + ";secure;samesite=strict";
}

function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

async function checkContributorCookie() {
  let contributorId = getCookie("contributorId");
  if (contributorId != "") {
   console.log("Will use cookie value of contributorId: " + contributorId);
	 USER_ID = contributorId;
  }
}

async function checkHelpCookie() {
  let hasHelpAlreadyBeenClosed = getCookie("helpClosed");
  if (hasHelpAlreadyBeenClosed != "") {
   console.log("Will use cookie value of helpClosed: " + hasHelpAlreadyBeenClosed);
  }
	return hasHelpAlreadyBeenClosed;
}

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

	document.getElementById('upwards').style.opacity = "0";

	var helpClosed = await checkHelpCookie();
	if(helpClosed!=null && helpClosed!='true'){
		showHelp();
	}
	await loadContributor();
	console.log("contrib ok");
	await loadLatestObs();
	console.log("latestObs ok");
	await loadSomeMore();
	console.log("more ok");

	createObserver();
	console.log("observer ok");
}

async function callAndWaitForJsonAnswer(url) {
		try {
			let res = await fetchWithTimeout(url);
			return await res.json();
		} catch (error) {
			if(error.name === 'AbortError'){
				console.log('Call to '+url+' timed out');
			} else {
				console.log('Got error: '+error + ' ...for url: '+url);
			}
		}
}

async function loadContributor(){
	// url to load contributo info
	const urlContributor=inpnUrlBase+"contributor/"+USER_ID;
	console.log('loading contributor info from: '+urlContributor);

	async function renderContributor() {
		currentContributor = await callAndWaitForJsonAnswer(urlContributor);

		if(currentContributor==null){
			alert('Erreur lors du chargement pour l\'ID '+USER_ID);
		}

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
		document.getElementById('profilePic').title=`Cliquer ici pour afficher les statistiques de ${currentContributor.pseudo}`;
		document.getElementById('loadAll').title=`Cliquer ici pour charger toutes les observations de ${currentContributor.pseudo}`;
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
		}
		listObservations.observations.push(...observation.observations);
		renderProgress();
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

				let meter = document.querySelector('.progressMeter');
				meter.style.animationName='backgroundChange';
				meter.style.animationDuration='4s';
				meter.style.animationIterationCount='infinite';
				meter.style.animationDirection='alternate';

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

						await getAndAddAllObservations(obsUrl);

						// rendering
						await renderObs();
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
				}
				buttonLoadAll.style.fontStyle='unset';
				meter.style.animation='unset';
			}
		}
	}
}

async function loadSomeMore(){
	// loop load for current userId
	console.log('Attempt at more loading for: '+USER_ID);

	if(latestObs!=null && !isMoreLoadingOn && !isLoopLoadingOn){

		if(index<latestObs.totLines){
			isMoreLoadingOn=true;
			let meter = document.querySelector('.progressMeter');
			meter.style.animationName='backgroundChange';
			meter.style.animationDuration='4s';
			meter.style.animationIterationCount='infinite';
			meter.style.animationDirection='alternate';

			let paginStart = index+1;
			let paginEnd=index+16;
			if(paginEnd>latestObs.totLines){
				paginEnd=latestObs.totLines;
			}
			let obsUrl=inpnUrlBase+"data?paginStart="+paginStart+"&paginEnd="+paginEnd+"&idUtilisateur="+USER_ID;
			console.log('loadMore : loading obs from '+obsUrl);

			await getAndAddAllObservations(obsUrl);

			// incrementing for next call
			index = index+16;
			isMoreLoadingOn=false;
			meter.style.animation='unset';

			// have we reached the end?
			if(index< latestObs.totLines){
					// do nothing
			} else {
				deactivateLoadAllButton();
				activateUpdateAllButton();
			}

			// rendering
			await renderObs();
		} else {
			console.log("not loading any more, we reached the end!");
		}
	} else {
		console.log("loading still in progress");
	}
}

function deactivateLoadAllButton(){
	let buttonLoadAll = document.getElementById('loadAll');
	buttonLoadAll.innerHTML = 'Observations chargées';
	buttonLoadAll.title=`Toutes les observations de ${currentContributor.pseudo} ont été chargées.`;
	buttonLoadAll.style.pointerEvents='none';
	buttonLoadAll.style.backgroundColor='lightgray';
}

function activateUpdateAllButton(){
	activateBtn('updateObs');
	document.getElementById('updateObs').title=`PAS ENCORE IMPLEMENTE! - Lancer une mise à jour de toutes les observations non encore validées (peut prendre du temps!)`;
}

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

function sortByModificationLatest(observations){
	console.log("Ordering observations...");
	if(observations!=null){
		observations.sort(function(a,b){
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
		});
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
	document.getElementById(id).style.backgroundColor='#4CAF50';
	document.getElementById(id).style.pointerEvents='unset';
	document.getElementById(id).style.fontStyle='unset';
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

function toggleLeftFilters(){
	if(areFiltersDisplayed){
		areFiltersDisplayed=false;
		document.querySelector('.leftFilters').style='';
		document.getElementById('toggleLeftFilters').innerHTML='Afficher les filtres';
		document.getElementById('toggleLeftFilters').title="Cliquer ici pour afficher les filtres par catégories"
	} else {
		areFiltersDisplayed=true;
		document.querySelector('.leftFilters').style.left='0';
		document.querySelector('.leftFilters').style.boxShadow='12px 12px 15px -5px black';
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
		document.querySelector('.rightSorters').style.boxShadow='-12px 12px 15px -5px black';
		document.getElementById('toggleRightSorters').innerHTML='Masquer les tris';
		document.getElementById('toggleRightSorters').title="Cliquer ici pour masquer les tris"
	}
}


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

/* taken here https://dmitripavlutin.com/timeout-fetch-request/ */
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 15000 } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal
  });
  clearTimeout(id);
  return response;
}

function updateObservations(){
	var cpt=0;
	listObservations.observations.forEach(obs=>{
		if(obs.validation==null || (obs.validation.idStatus!=0 && obs.validation.idStatus!=5 && obs.validation.idStatus!=6)){
			cpt++;
		}
	});
	console.log('Will attempt to update '+cpt+' non validated observations');
}

document.addEventListener("DOMContentLoaded", function() {
	window.onscroll = function() {myFunction()};

	function myFunction() {
	  if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
	    document.getElementById('upwards').style.opacity = '';
	  } else {
	    document.getElementById('upwards').style.opacity = "0";
	  }
	}
});
