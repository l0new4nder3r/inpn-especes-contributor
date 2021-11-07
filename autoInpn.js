const inpnUrlBase='https://inpn.mnhn.fr/inpn-web-services/inpnespece/';
var USER_ID=20784;
// latest obs
var latestObs;
// global list of observations to gather
var listObservations;
// contributor info
var contrib;
// index current loading page
let index;
// is all loading loop on?
var isLoopOn=false;


async function loadAll(userId){
	await loadContributor(userId);
	console.log("contrib ok");
	await loadLatestObs(userId);
	console.log("latestObs ok");
	await loadSomeMore(userId);
	console.log("more ok");
	
	let bottom= document.querySelector("#bottom");
	createObserver();
	console.log("observer ok");
}

async function loadContributor(userId){
	// url to load contributo info
	const urlContributor=inpnUrlBase+"contributor/"+userId;
	console.log('loading contributor info from: '+urlContributor);

	async function getContributor() {
	    try {
	        let res = await fetch(urlContributor);
	        return await res.json();
	    } catch (error) {
	        console.log(error);
	    }
	}
	
	async function renderContributor() {
	    let contributor = await getContributor();
	    contrib = contributor;
	    let html = '';
	    let htmlSegment = `<img style="width: 5em;float: left;" src="${contrib.avatar}">
						   <span>${contrib.pseudo} - ${contrib.prenom} ${contrib.nom}</span>
						   <p>${contrib.ScoreTotal} points</p>`;
		html += htmlSegment; 
	
	    html += '</div>';
	    let container = document.querySelector('.contributorDetails');
	    container.innerHTML = html;
	    let input = document.getElementById('contributorId');
		input.value=userId;

	}
	
	renderContributor();
	
}

async function loadLatestObs(userId){
	//url to load latest observation
	const urlLatestObservation=inpnUrlBase+"data?paginStart=1&paginEnd=1&idUtilisateur="+userId;
	console.log('loading latest obs from: '+urlLatestObservation);

	async function getLatestObs() {
	    try {
	        let res = await fetch(urlLatestObservation);
	        return await res.json();
	    } catch (error) {
	        console.log(error);
	    }
	}
	
	async function renderLatestObs() {
	    let observation = await getLatestObs();
	    if(observation!=null){
	    	index = 1;
		    latestObs = observation;
		    console.log("latestObs is set!");
		    //console.log(latestObs);
		    listObservations = observation;

		    let total = document.querySelector('.total');
		    total.innerHTML = `${latestObs.totLines}`;
			renderProgress();
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
	
	let percentage =0;
	if(latestObs.totLines!=0){
		percentage = (size/latestObs.totLines*100).toFixed(0);;
	}

    let numberValues = document.querySelector('.numberValues');
    numberValues.innerHTML = `${size}`;

    let percent = document.querySelector('.percent');
    percent.innerHTML = `&nbsp; ${percentage}%`;
}

// loading the observations at startup
window.onload = function() {
	loadAll(USER_ID)
};

async function loopLoading(){
	let userId = USER_ID;
	// loop load for current userId
	console.log('Attempt at loop loading for: '+userId);
	
	if(latestObs!=null){
		
		if(isLoopOn){
			// stop it!
			isLoopOn = false;
			// turn "load all" button to "pause"
			let buttonLoadAll = document.getElementById('loadAll');
	    	buttonLoadAll.innerHTML = 'load all';
		} else {
			isLoopOn=true;
			
			// turn "load all" button to "pause"
			let buttonLoadAll = document.getElementById('loadAll');
	    	buttonLoadAll.innerHTML = 'pause';

			// looping
			for(index; index< latestObs.totLines; index=index+16){
				// could be stopped from elsewhere...
				if(isLoopOn){
					let paginEnd=index+16;
					if(paginEnd>latestObs.totLines){
						paginEnd=latestObs.totLines;
					}
					let paginStart = index+1;
					let obsUrl=inpnUrlBase+"data?paginStart="+paginStart+"&paginEnd="+paginEnd+"&idUtilisateur="+userId;
					console.log('loop : loading obs from '+obsUrl);
		
					async function getLoopObs() {
					    try {
					        let res = await fetch(obsUrl);
					        return await res.json();
					    } catch (error) {
					        console.log(error);
					    }
					}
					
					async function renderLoopObs() {
					    let observation = await getLoopObs();
					    // add all?
					    listObservations.observations.push(...observation.observations);
					    
						renderProgress();
					    
					}
					await renderLoopObs();
					
					// rendering
					renderObs();
				} else {
					break;
				}
			}
			isLoopOn=false;
			// turn "load all" button to "pause"
	    	buttonLoadAll.innerHTML = 'load all';
		}
	}
}

async function loadSomeMore(){
	let userId = USER_ID;
	// loop load for current userId
	console.log('Attempt at more loading for: '+userId);
	
	if(latestObs!=null && !isLoopOn){

		if(index<latestObs.totLines){

			let paginStart = index+1;
			let paginEnd=index+16;
			if(paginEnd>latestObs.totLines){
				paginEnd=latestObs.totLines;
			}
			let obsUrl=inpnUrlBase+"data?paginStart="+paginStart+"&paginEnd="+paginEnd+"&idUtilisateur="+userId;
			console.log('loadMore : loading obs from '+obsUrl);
			
			async function getMoreObs() {
			    try {
			        let res = await fetch(obsUrl);
			        return await res.json();
			    } catch (error) {
			        console.log(error);
			    }
			}
			
			async function renderMoreObs() {
			    let observation = await getMoreObs();
			    // add all
			    listObservations.observations.push(...observation.observations);
				renderProgress();
			}
			await renderMoreObs();
			
			// incrementing for next call	
			index = index+16;
			
			// rendering
			renderObs();
		} else {
			console.log("not loading any more, we reached the end!");
		}
	} else {
		console.log("first obs not init yet");
	}
}

function createObserver() {
	  let observer;

	  let options = {
	    root: null,
	    rootMargin: "0px",
	    threshold: 0.5
	  };

	  observer = new IntersectionObserver(handleIntersect, options);
	  observer.observe(bottom);
}

function handleIntersect(entries, observer) {
	entries.forEach((entry) => {
	    if (entry.isIntersecting) {
	    	console.log('intersecting!');
			let bottomDiv= document.getElementById("bottom");
			bottomDiv.style.animationName='bottomColorChange';

	    	async function loadMoreWaitAndRender(){
	    	    await loadSomeMore();
		    	console.log('loadmorewaitrender done');
				bottomDiv.style.animationName=''
	    	}
		    // call more loading!
		    loadMoreWaitAndRender();
		}
	});
}



/****  taken from other page, TODO refactor!  ****/
function buildProgress(idStatus){
    let html = '';
    if(idStatus==0 || idStatus==6){
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

// COPIED FROM OTHER JS TODO REFACTOR
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
	    		title='???';
	    	}
	    	let progress = buildProgress(obs.validation.idStatus);
	    	let creationDate = new Date(obs.dateCrea).toLocaleDateString('fr-FR');
	    	let creationTime = new Date(obs.dateCrea).toLocaleTimeString('fr-FR');

	    	let modificationDateTime='N/A';
	    	if(obs.dateModif!=''){
				modificationDateTime = new Date(obs.dateModif).toLocaleDateString('fr-FR') +" à "+ new Date(obs.dateModif).toLocaleTimeString('fr-FR');
	    	}
	        let htmlSegment = `<div title="${obs.idData}" id="${obs.idData}" class="obs status${obs.validation.idStatus}" onclick="showDetails(${obs.idData})">
	                            <img src="${obs.photos[0].thumbnailFileUri}" >
	                            <div class="score">${obs.scoreTotal} pts</div>
	                            <div title="${obs.nomCommuns}" class="details">
	                            	<h2>${title} </h2>
		                            <p>Observation envoyée le ${creationDate} à ${creationTime}</p>
		                            <p>Dernière modification : ${modificationDateTime}</p>
									<p>${obs.region}</p>
		                        </div>
	                            <div title="${obs.validation.lbStatus}" class="progress">
	                            	${progress}
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
			index=0;
			latestObs=null;
			listObservations=null;
			contrib=null;
			
			loadAll(userId);

		// TODO fix loadmorewaitrender multiple times!!!
		} else if (USER_ID!=null){
			// same userId!
			console.log("same userId as before! Doing nothing");

		}

	} else {
		console.log("Invalid contributorId: "+userId);
	}
}

function cleanAll(){
	listObservations=null;
	latestObs=null;
	index=0;
	let container = document.querySelector('.container');
	container.innerHTML = '';
	loadLatestObs(USER_ID);
	isLoopOn=false;
}

function sortObs(){
	renderObs();
}

async function makeGraphs(){
	// status
	let countStatus0=0;
	let countStatus1=0;
	let countStatus2=0;
	let countStatus3=0;
	let countStatus4=0;
	let countStatus5=0;
	let countStatus6=0;
	
	listObservations.observations.forEach(obs=>{
		if(obs.validation.idStatus==0){
			countStatus0++;
		} else if(obs.validation.idStatus==1){
			countStatus1++;
		} else if(obs.validation.idStatus==2){
			countStatus2++;
		} else if(obs.validation.idStatus==3){
			countStatus3++;
		} else if(obs.validation.idStatus==4){
			countStatus4++;
		} else if(obs.validation.idStatus==5){
			countStatus5++;
		} else {
			countStatus6++;
		}
	});
	
	// todo get status from api!
	const statusLabels = [
	  'error',
	  'Initialisation',
	  'Photographie traitée',
	  'Groupe grand public traité',
	  'Groupe opérationel traité',
	  'Espèce validée',
	  'Observation invalidée'
	];
	const statusData = {
	  labels: statusLabels,
	  datasets: [{
	    label: 'Répartition des observations par statut de validation',
	    backgroundColor: 'rgb(255, 99, 132)',
	    borderColor: 'rgb(255, 99, 132)',
	    data: [countStatus0, countStatus1, countStatus2, countStatus3, countStatus4, countStatus5, countStatus6],
	  }]
	};
	const statusConfig = {
	  type: 'bar',
	  data: statusData,
	  options: {}
	};
	const validationStatusCanvas = document.getElementById('validationStatusCanvas');
	const validationStatusChart = new Chart(validationStatusCanvas.getContext('2d'), statusConfig);

	// scores
	let count0to50=0;
	let count50to100=0;
	let count100to200=0;
	let count200to500=0;
	let count500to1000=0;
	let count1000to2000=0;
	let count2000AndMore=0;

	listObservations.observations.forEach(obs=>{
		if(obs.scoreTotal>2000){
			count2000AndMore++;
		} else if(obs.scoreTotal>1000){
			count1000to2000++;
		} else if(obs.scoreTotal>500){
			count500to1000++;
		} else if(obs.scoreTotal>200){
			count200to500++;
		} else if(obs.scoreTotal>100){
			count100to200++;
		} else if(obs.scoreTotal>50){
			count50to100++;
		} else {
			count0to50++;
		}
	});
	
	const scoresLabels = [
	  '0 à 50 pts',
	  '50 à 100 pts',
	  '100 à 200 pts',
	  '200 à 500 pts',
	  '500 à 1000 pts',
	  '1000 à 2000 pts',
	  '2000 pts et plus'
	];
	const scoresData = {
	  labels: scoresLabels,
	  datasets: [{
	    label: 'Répartition des observations par score',
	    backgroundColor: 'rgb(255, 99, 132)',
	    borderColor: 'rgb(255, 99, 132)',
	    data: [count0to50, count50to100, count100to200, count200to500, count500to1000, count1000to2000, count2000AndMore],
	  }]
	};
	const scoresConfig = {
	  type: 'bar',
	  data: scoresData,
	  options: {}
	};
	const scoresCanvas = document.getElementById('scoresCanvas');
	const scoresChart = new Chart(scoresCanvas.getContext('2d'), scoresConfig);

	// régions
	
	// numRegion, compteur
	const regionsCount = new Map();
	// num numRegion, region() libellé)
	const regionLabels = new Map();

	listObservations.observations.forEach(obs=>{
		if(regionsCount.get(obs.numRegion)==null){
			regionsCount.set(obs.numRegion,1);
			regionLabels.set(obs.numRegion,obs.region);
		} else{
			regionsCount.set(obs.numRegion,regionsCount.get(obs.numRegion)+1);
		}
	});
		
	const regionsLabels = [];
	const countRegionsData = [];
	// tri descendant score
	const sortedRegions = new Map([...regionsCount.entries()].sort((a, b) => b[1] - a[1]));
	sortedRegions.forEach(function(value, key) {
		regionsLabels.push(regionLabels.get(key));
		countRegionsData.push(value);
	})
	
	const regionsData = {
	  labels: regionsLabels,
	  datasets: [{
	    label: 'Répartition des observations par régions',
	    backgroundColor: 'rgb(255, 99, 132)',
	    borderColor: 'rgb(255, 99, 132)',
	    data:countRegionsData,
	  }]
	};
	const regionsConfig = {
	  type: 'bar',
	  data: regionsData,
	  options: {}
	};

	const regionsCanvas = document.getElementById('regionsCanvas');
	const regionsChart = new Chart(regionsCanvas.getContext('2d'), regionsConfig);
	
	// timeline
	// min datecrea found
	let dateCreaMin=new Date(listObservations.observations[0].dateCrea);
	// max datecrea found
	let dateCreaMax=new Date(listObservations.observations[0].dateCrea);
	
	listObservations.observations.forEach(obs=>{
		if(new Date(obs.dateCrea)<dateCreaMin){
			dateCreaMin=new Date(obs.dateCrea);
		}
		if(new Date(obs.dateCrea)>dateCreaMax){
			dateCreaMax=new Date(obs.dateCrea);
		}
	});
	console.log('minDate= '+dateCreaMin+' maxDate= '+dateCreaMax);
	let months = monthsBtwnDates(dateCreaMin,dateCreaMax);
	console.log('months between= '+months);

	// build an array with months between start and end
	//var date="December 2018";
	const monthList=new Map();
	
	//set both start and end date to first date of the month
	const end_date = new Date(dateCreaMax.getFullYear(), dateCreaMax.getMonth(), 1);
	const start_date = new Date(dateCreaMin.getFullYear(), dateCreaMin.getMonth(), 1);
	
	while(start_date<=end_date){
		monthList.set(start_date.toLocaleString('default', { month: 'long' , year: 'numeric'}),0);
		//monthList.push(start_date.toLocaleString('default', { month: 'long' , year: 'numeric'}));
		start_date.setMonth(start_date.getMonth() + 1);
	}
	console.log(monthList);

	listObservations.observations.forEach(obs=>{
		let date = (new Date(obs.dateCrea)).toLocaleString('default', { month: 'long' , year: 'numeric'});
		monthList.set(date,monthList.get(date)+1);
	});
	
	const timelineData = {
	  labels: Array.from(monthList.keys()),
	  datasets: [{
	    label: 'Répartition des observations par date',
	    backgroundColor: 'rgb(255, 99, 132)',
	    borderColor: 'rgb(255, 99, 132)',
	    data: Array.from(monthList.values()),
	  }]
	};
	const timelineConfig = {
	  type: 'bar',
	  data: timelineData,
	  options: {}
	};

	const timelineCanvas = document.getElementById('timelineCanvas');
	const timelineChart = new Chart(timelineCanvas.getContext('2d'), timelineConfig);
	
}

const monthsBtwnDates = (startDate, endDate) => {
  return Math.max(
    (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth(),0)
};

async function buildStats(){
	await showStats();
	await makeGraphs();
}

async function showStats(){
	
	if(USER_ID!=null && latestObs!=null && listObservations != null && contrib!=null){
		// make some content for "stats" placeholder
    	let stats = document.querySelector('.stats');

		// make this visible
	    stats.style.visibility='visible';
	    // and make the filter visible too
	    let filter = document.querySelector('.filter');
	    filter.style.filter='blur(5px) grayscale(60%)';
		
		// bouton de fermeture, titre
	    stats.innerHTML = `<div onclick="hideStats()" class="tinyButton">X</div>
							<h3>Statistiques personnelles</h3>`;
		
		// tout est chargé? avertissement
		if(listObservations.observations.length!=latestObs.totLines){
			stats.innerHTML += `<p style="font-style:italic;color:red;">Attention, toutes les observations de cette personne n'ont pas été chargées.</p>
							<p style="font-style:italic;color:red;">Certaines statistiques pourraient perdre de leur pertinence!</p>`;
		}
		
		// score moyen, min ,max
		let average=0;
		if(latestObs.totLines!=0){
			average = (contrib.ScoreTotal/latestObs.totLines).toFixed(0);
		}
		let min = listObservations.observations[0].scoreTotal;
		let max = 0;
		listObservations.observations.forEach(obs=>{
			if(obs.scoreTotal<min){
				min=obs.scoreTotal;
			}
			if (obs.scoreTotal>max){
				max=obs.scoreTotal;
			}
		});

		stats.innerHTML += `<p>Score moyen : ${average} points</p>
							<p>Score minimum : ${min} points</p>
							<p>Score maximum : ${max} points</p>`;
							
		/* graphique histo avec répartition par statut de validation */
		stats.innerHTML+=`<div class="canvas">
							<canvas id="validationStatusCanvas"></canvas>
						</div>`;

		/* familles d'espèces - groupes op, groupes simplifiés  */
		// todo load groupes, et count / répartition
		// graphique?
		stats.innerHTML+=`<div></div>`;

		/* rang contributeur  */
		let contributorsNumber = '';
		const urlRank=inpnUrlBase+"rank?paginStart=1&paginEnd=1";
		console.log('loading rank info from: '+urlRank);
	
		async function getRankFirst() {
		    try {
		        let res = await fetch(urlRank);
		        return await res.json();
		    } catch (error) {
		        console.log(error);
		    }
		}
		
		async function getRankInfo() {
		    let rankInfo = await getRankFirst();
		    contributorsNumber = rankInfo.totLines;
		}
		await getRankInfo();
		
		stats.innerHTML+=`<div>Rang : ${contrib.rang}<sup>e</sup> sur ${contributorsNumber} contributeurs</div>`;

		
		/* scores graphique! */
		stats.innerHTML+=`<div class="canvas">
							<canvas id="scoresCanvas"></canvas>
						</div>`;

		/* nombre par région */
		// numRegion, compteur
//		const regionsCount = new Map();
//		// num numRegion, region() libellé)
//		const regionLabels = new Map();
//		let regionsHtml=`<div class="regions">
//						<h3>Nombre d'observations par région</h3>`;
//		listObservations.observations.forEach(obs=>{
//			if(regionsCount.get(obs.numRegion)==null){
//				regionsCount.set(obs.numRegion,1);
//				regionLabels.set(obs.numRegion,obs.region);
//			} else{
//				regionsCount.set(obs.numRegion,regionsCount.get(obs.numRegion)+1);
//			}
//		});
//		// tri descendant score
//		const sortedRegions = new Map([...regionsCount.entries()].sort((a, b) => b[1] - a[1]));
//		sortedRegions.forEach(function(value, key) {
//			let regionLabel = regionLabels.get(key);
//			regionsHtml+=`<p>${regionLabel} : ${value} observations</p>`;
//		})
//		regionsHtml+=`</div>`;
//		stats.innerHTML+=regionsHtml;

		stats.innerHTML+=`<div class="canvas">
							<canvas id="regionsCanvas"></canvas>
						</div>`;

		/* nombre validés mais corrigés */
		// TODO : sur le nombre où propositions faites + observations validées? trouvable?
		let corrected = 0;
		listObservations.observations.forEach(obs=>{
			if(obs.isCorrected=='true'){
				corrected++;
			}
		});
		stats.innerHTML+=`<div class="correctedCount">
							Observations corrigées 
							<span style="font-style:italic">
								(proposition d'espèce erronée)
							</span> 
							: ${corrected}
						</div>`;
		
		/* quests */
		let quests = 0;
		listObservations.observations.forEach(obs=>{
			if(obs.questData!=null){
				quests++;
			}
		});
		stats.innerHTML+=`<div class="quests">Observations réalisées dans le cadre de quêtes : ${quests}</div>`;

		
		/* graphique avec obs dans le temps */ 
		stats.innerHTML+=`<div class="canvas">
							<canvas id="timelineCanvas"></canvas>
						</div>`;
	
		// prevent scrolling ?
	   	document.documentElement.style.overflow = 'hidden';
	   	document.body.scroll = "no";
	} else {
		console.log("Nothing loaded, no stats to show");
	}
}

function hideStats(){
	
	// hiding the "focus" part
    let stats = document.querySelector('.stats');
    stats.style.visibility='collapse';
	stats.innerHTML='';
    // hiding the filter too
    let filter = document.querySelector('.filter');
    filter.style.filter='none';
    
	// re allow scrolling
 	document.documentElement.style.overflow = 'scroll';
 	document.body.scroll = "yes";
}

