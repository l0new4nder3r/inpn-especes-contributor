/* Everything about displaying the stats of a selected contributor */

const monthsBtwnDates = (startDate, endDate) => {
  return Math.max(
    (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth(),0)
};

const noLegendOptions= {
	plugins: {
      legend: {
          display: false
      }
  }
};

var contributorsTotal;

async function buildStats(){
	await showStats();
	await makeGraphs();
}

async function showStats(){

	if(USER_ID!=null && latestObs!=null && listObservations != null && currentContributor!=null){
		// make some content for "stats" placeholder
    let stats = document.querySelector('.stats');

		// make this visible
    stats.style.visibility='visible';
		stats.style.cursor="progress";
		stats.id='popup';
		blurBackground();

		// bouton de fermeture, titre
    stats.innerHTML = `<div class="popinTop">
													<div class="popinTitle">Statistiques de ${currentContributor.pseudo}</div>
													<div onclick="hideStats()" class="tinyButton">X</div>
												</div>
											<div class="statsContents">
											</div>`;



		let statsContents = document.querySelector('.statsContents');
		statsContents.innerHTML += `<div class="statsLeft"></div>
																<div class="statsRight"></div>`;
		let statsleft = document.querySelector('.statsLeft');
		statsleft.innerHTML =`<div class="statsIntro"></div>`;

		// tout est chargé? si non : avertissement
		var isAllLoaded = listObservations.observations.length==latestObs.totLines;
		if(!isAllLoaded){
			document.querySelector('.statsIntro').innerHTML += `<p>Attention, toutes les observations de cette personne n'ont pas été chargées.</p>
							<p>Certaines statistiques pourraient perdre de leur pertinence!</p>`;
		}

		// score moyen, min ,max
		let averageGlobal=0;
		if(latestObs.totLines!=0){
			averageGlobal = (currentContributor.ScoreTotal/latestObs.totLines).toFixed(0);
		}
		let min = listObservations.observations[0].scoreTotal;
		let max = 0;
		let sum = 0;
		listObservations.observations.forEach(obs=>{
			if(obs.scoreTotal<min){
				min=obs.scoreTotal;
			}
			if (obs.scoreTotal>max){
				max=obs.scoreTotal;
			}
			sum +=obs.scoreTotal;
		});

		let averageLoaded = (sum/listObservations.observations.length).toFixed(0);;

		statsleft.innerHTML+=`<div class="statsLeftContents"></div>`;
		var leftStatsContents = document.querySelector('.statsLeftContents');

		let asterisk = '';
		let globalAverageScore = '';
		if(!isAllLoaded){
			asterisk='<sup>*</sup>';
			globalAverageScore=`<p>Score moyen (global) : ${averageGlobal} points</p>`;
		}
		leftStatsContents.innerHTML += `<p>Observations soumises : ${listObservations.totLines}</p>
												<p>Score minimum${asterisk} : ${min} points</p>
												<p>Score moyen${asterisk} : ${averageLoaded} points</p>
												<p>Score maximum${asterisk} : ${max} points</p>
												${globalAverageScore}`;

		/* rang contributeur  */
		if(contributorsTotal==null){
			const urlRank=inpnUrlBase+"rank?paginStart=1&paginEnd=1";
			console.log('loading rank info from: '+urlRank);

			async function getRankInfo() {
					let rankInfo = await callAndWaitForJsonAnswer(urlRank);
					if(rankInfo==null){
						alert('Erreur lors du chargement du nombre de personnes. Veuillez réessayer ultérieurement');
					}
					contributorsTotal = rankInfo.totLines;
			}
			await getRankInfo();
		}

		leftStatsContents.innerHTML+=`<p>Rang : ${currentContributor.rang}<sup>e</sup> sur ${contributorsTotal} contributeurs&middot;trices</p>`;

		/* nombre validés mais corrigés */
		let corrected = 0;
		let correctlyIdentified = 0;
		listObservations.observations.forEach(obs=>{
			if(obs.isCorrected=='true'){
				corrected++;
			} else if(obs.isValidated=='true'){
				if(obs.taxonOrigin!=null && obs.taxonOrigin.cdNomOrigin!=null && obs.taxonOrigin.cdNomOrigin!=''){
					correctlyIdentified++;
				}
			}
		});
		let speciesSubmittedAndValidated = corrected+correctlyIdentified;
		let correctedRatio=0;
		if(speciesSubmittedAndValidated>0){
			correctedRatio=(corrected/speciesSubmittedAndValidated*100).toFixed(0);
		}
		leftStatsContents.innerHTML+=`<p class="correctedCount">
							Observations${asterisk} corrigées : ${corrected} <span style="font-style:italic">sur ${speciesSubmittedAndValidated} espèce(s) proposée(s) et validées.</span>
						Soit un taux d'erreur de ${correctedRatio}%
						</p>`;

		/* quests */
		let quests = 0;
		listObservations.observations.forEach(obs=>{
			if(obs.questData!=null){
				quests++;
			}
		});
		leftStatsContents.innerHTML+=`<p class="quests">Observations${asterisk} soumises dans le cadre de quêtes : ${quests}</p>`;
		if(!isAllLoaded){
			leftStatsContents.innerHTML+=`<p class="statsLegend">${asterisk} Sur les ${listObservations.observations.length} observations chargées</p>`;
		}

		/* scores graphique! */
		statsleft.innerHTML+=buildCanvas('scoresCanvas',`Répartition des observations${asterisk} validées par score`);
		statsleft.innerHTML+='<br/>';

		/* graphique histo avec répartition par statut de validation */
		statsleft.innerHTML+=buildCanvas('validationStatusCanvas',`Répartition des observations${asterisk} par statut de validation`);
		statsleft.innerHTML+='<br/>';

		var rightStatsContents = document.querySelector('.statsRight');

		/* familles d'espèces - groupes simplifiés  */
		rightStatsContents.innerHTML+=buildCanvas('groupeSimpleCanvas',`Répartition des observations${asterisk} par groupe grand public`);
		rightStatsContents.innerHTML+='<br/>';

		/* nombre par région */
		rightStatsContents.innerHTML+=buildCanvas('regionsCanvas',`Répartition des observations${asterisk} par régions`);
		rightStatsContents.innerHTML+='<br/>';

		/* graphique avec obs dans le temps */
		rightStatsContents.innerHTML+=buildCanvas('timelineCanvas',`Répartition des observations${asterisk} dans le temps`);

		stats.style.cursor="unset";
	} else {
		console.log("Nothing loaded, no stats to show");
	}
}

function buildCanvas(id,title){
	return `<div class="canvas">
						<canvas id="${id}"></canvas>
						<h4>${title}</h4>
					</div>`;
}

function hideStats(){

	// hiding the "focus" part
  let stats = document.querySelector('.stats');
  stats.style.visibility='collapse';
	stats.id='';
	stats.innerHTML='';
  // hiding the filter too
	unblurBackground();
}

async function makeGraphs(){
	// status
	await buildStatusGraph();
	// scores
	await buildScoresGraph();
	// régions
	await buildRegionsGraph();
	// timeline
	await buildTimelineGraph();
	// groupe simple
	await buildGroupsGraph();
}

async function buildStatusGraph(){
	let countStatus0=0;
	let countStatus1=0;
	let countStatus2=0;
	let countStatus3=0;
	let countStatus4=0;
	let countStatus5=0;
	let countStatus6=0;
	let countStatus99=0;

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
		} else if(obs.validation.idStatus==6){
			countStatus6++;
		} else if(obs.validation==null||obs.validation.idStatus==null) {
			countStatus99++;
		}
	});

	// todo get status from api?! Mais fautes...
	const statusLabels = [
		'Erreur',
		'Initialisation',
		'Photographie traitée',
		'Groupe grand public traité',
		'Groupe opérationnel traité',
		'Espèce validée',
		'Observation invalidée'
	];
	if(countStatus99>0){
		statusLabels.push('Erreur de données, validation vide');
	}

	const graphData = [countStatus0, countStatus1, countStatus2, countStatus3, countStatus4, countStatus5, countStatus6];
	if(countStatus99>0){
		graphData.push(countStatus99);
	}

	const statusData = {
		labels: statusLabels,
		datasets: [{
//			label: 'Répartition des observations par statut de validation',
			backgroundColor: 'rgb(255, 99, 132)',
			borderColor: 'rgb(255, 99, 132)',
			data: graphData,
		}]
	};
	const statusConfig = {
		type: 'bar',
		data: statusData,
		options: noLegendOptions
	};

	const validationStatusCanvas = document.getElementById('validationStatusCanvas');
	const validationStatusChart = new Chart(validationStatusCanvas.getContext('2d'), statusConfig);
}

// todo limiter à celles validées seulement?
async function buildScoresGraph(){
	let count0to50=0;
	let count50to100=0;
	let count100to200=0;
	let count200to500=0;
	let count500to1000=0;
	let count1000to2000=0;
	let count2000AndMore=0;

	listObservations.observations.forEach(obs=>{
		if(obs.validation.idStatus==5){
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
			// label: 'Répartition des observations validées par score',
			backgroundColor: 'rgb(255, 99, 132)',
			borderColor: 'rgb(255, 99, 132)',
			data: [count0to50, count50to100, count100to200, count200to500, count500to1000, count1000to2000, count2000AndMore],
		}]
	};
	const scoresConfig = {
		type: 'bar',
		data: scoresData,
		options: noLegendOptions
	};
	const scoresCanvas = document.getElementById('scoresCanvas');
	const scoresChart = new Chart(scoresCanvas.getContext('2d'), scoresConfig);
}

async function buildRegionsGraph(){
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
			// label: 'Répartition des observations par régions',
			backgroundColor: 'rgb(255, 99, 132)',
			borderColor: 'rgb(255, 99, 132)',
			data:countRegionsData,
		}]
	};
	const regionsConfig = {
		type: 'bar',
		data: regionsData,
		options: noLegendOptions
	};

	const regionsCanvas = document.getElementById('regionsCanvas');
	const regionsChart = new Chart(regionsCanvas.getContext('2d'), regionsConfig);
}

async function buildTimelineGraph(){
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
	//console.log('minDate= '+dateCreaMin+' maxDate= '+dateCreaMax);
	let months = monthsBtwnDates(dateCreaMin,dateCreaMax);
	//console.log('months between= '+months);

	// build an array with months between start and end
	const monthList=new Map();

	//set both start and end date to first date of the month
	const end_date = new Date(dateCreaMax.getFullYear(), dateCreaMax.getMonth(), 1);
	const start_date = new Date(dateCreaMin.getFullYear(), dateCreaMin.getMonth(), 1);

	while(start_date<=end_date){
		monthList.set(start_date.toLocaleString('default', { month: 'long' , year: 'numeric'}),0);
		start_date.setMonth(start_date.getMonth() + 1);
	}

	listObservations.observations.forEach(obs=>{
		let date = (new Date(obs.dateCrea)).toLocaleString('default', { month: 'long' , year: 'numeric'});
		monthList.set(date,monthList.get(date)+1);
	});

	const timelineData = {
		labels: Array.from(monthList.keys()),
		datasets: [{
			// label: 'Répartition des observations dans le temps',
			backgroundColor: 'rgb(255, 99, 132)',
			borderColor: 'rgb(255, 99, 132)',
			data: Array.from(monthList.values()),
		}]
	};
	const timelineConfig = {
		type: 'bar',
		data: timelineData,
		options: noLegendOptions
	};

	const timelineCanvas = document.getElementById('timelineCanvas');
	const timelineChart = new Chart(timelineCanvas.getContext('2d'), timelineConfig);
}

async function	buildGroupsGraph(){
	const groupSimpleCount = new Map();
	const groupSimpleLabels = new Map();

	listObservations.observations.forEach(obs=>{
		if(groupSimpleCount.get(obs.groupSimple)==null){
			groupSimpleCount.set(obs.groupSimple,1);
			groupSimpleLabels.set(obs.groupSimple,obs.lbGroupSimple);
		} else{
			groupSimpleCount.set(obs.groupSimple,groupSimpleCount.get(obs.groupSimple)+1);
		}
	});

	const groupsSimpleLabels = [];
	const countGroupSimpleData = [];
	// tri descendant score
	const sortedGroupSimple = new Map([...groupSimpleCount.entries()].sort((a, b) => b[1] - a[1]));
	sortedGroupSimple.forEach(function(value, key) {
		groupsSimpleLabels.push(groupSimpleLabels.get(key));
		countGroupSimpleData.push(value);
	})

	const groupSimpleData = {
	  labels: groupsSimpleLabels,
	  datasets: [{
	    // label: 'Répartition des observations par groupe grand public',
	    backgroundColor: 'rgb(255, 99, 132)',
	    borderColor: 'rgb(255, 99, 132)',
	    data:countGroupSimpleData,
	  }]
	};
	const groupSimpleConfig = {
	  type: 'bar',
	  data: groupSimpleData,
		options: noLegendOptions
	};

	const groupSimpleCanvas = document.getElementById('groupeSimpleCanvas');
	const groupSimpleChart = new Chart(groupSimpleCanvas.getContext('2d'), groupSimpleConfig);
}
