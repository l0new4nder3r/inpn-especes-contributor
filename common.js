
async function showDetails(idData){
	// get current observation
	let chosenObs;
	listObservations.observations.forEach(obs=> {
		if(obs.idData == idData){
			chosenObs = obs;
		}
	});

	// get score details
	var scoreDetails;
	
	async function getScoreDetails(id) {
	    try {
	        let res = await fetch(`https://inpn.mnhn.fr/inpn-web-services/inpnespece/score/iddata/${id}`);
			scoreDetails = await res.json();
	    } catch (error) {
	        console.log('No score details found for observation id '+id);
	    }
	}
	
	await getScoreDetails(idData);

	// get validation details
	var validationHistory;
	async function getValidationHistory(id) {
		try {
	        let res = await fetch(`https://inpn.mnhn.fr/inpn-web-services/inpnespece/validation/data/${id}/historique`);
			validationHistory = await res.json();
	    } catch (error) {
	        console.log('No validation history found for observation id '+id);
	    }
	}
	// TODO useless for now ?

	//await getValidationHistory(idData);
	if(validationHistory!=null){
		//console.log(validationHistory[0].commentaire);
	}

	// make some content for "focus" placeholder
    let focus = document.querySelector('.focus');
	let newClassAttributes = `focus status${chosenObs.validation.idStatus}`;
	focus.setAttribute("class", newClassAttributes);
	let validated = '';
	if(chosenObs.isValidated=='true'){
		validated=`<div title="Observation validée!" class="validated">
						<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Icons8_flat_approval.svg/32px-Icons8_flat_approval.svg.png">
					</div>`;
	}
	
	let correctedName = '';
	if(chosenObs.isCorrected=='true' && chosenObs.taxonOrigin.nomCompletOrigin!=''){
		correctedName=`<a class="corrected" href="https://inpn.mnhn.fr/espece/cd_nom/${chosenObs.taxonOrigin.cdNomOrigin}" target="_blank">
							${chosenObs.taxonOrigin.nomCompletOrigin}
						</a>`;
	}
	
	let statusComment='';
	if(chosenObs.validation!=null && chosenObs.validation.StatusComment!=null){
		statusComment=`<div class="statusComment">${chosenObs.validation.StatusComment}</div>`;
	}
	let titleLink = '';
	let nomComplet = chosenObs.nomComplet;
	if(nomComplet==''){
		nomComplet="???";
		titleLink=`<h3>${nomComplet}</h3>`;
	} else {
		if(chosenObs.cdNom!=0){
			titleLink= `<a class="linkMore status${chosenObs.validation.idStatus}" href="https://inpn.mnhn.fr/espece/cd_nom/${chosenObs.cdNom}" target="_blank">
							${nomComplet}
						</a>`;
		} else {
			titleLink=`<h3>${nomComplet}</h3>`;
		}
	}

	let creationDate = new Date(chosenObs.dateCrea).toLocaleString();

	let commentaire = '';
	if(chosenObs.commentaire!=''){
		commentaire=`<div class="obsComment">"${chosenObs.commentaire}"</div>`;
	}

    let html = `<div onclick="hideDetails()" class="tinyButton">X</div>
    			<div class="infos">
  					${validated}
					${titleLink}
					${correctedName}
					${statusComment}
    				<p>${chosenObs.lbGroupSimple}</p>
    				<p style="position: relative;width: 300px;">${chosenObs.nomCommuns}</p>
    				<div id="map"></div>
    				<p style="font-style:italic;">${chosenObs.commune} (${chosenObs.numDepartement}), le ${creationDate}</p>
					${commentaire}
					<p>${chosenObs.scoreTotal} points</p>`;
					
	
	// preparing score details
	let scoresHtml=`<div class="scoreDetails">`;
	if(scoreDetails!=null){
		scoreDetails.scoresHistorique.reverse();
		scoreDetails.scoresHistorique.forEach(score=>{
			let dateCrea=new Date(score.dateCrea).toLocaleString();
	        let htmlSegment = `<div title="${dateCrea}"><div style="font-style:italic;">${score.causes} : ${score.score} points</div></div>`;
			scoresHtml+=htmlSegment;
		});
	}
	scoresHtml+=`</div>`;
	html +=scoresHtml;
	// adding the progress part again
	html+=`<div title="${chosenObs.validation.lbStatus}" class="progressDetails">`;
	html+=buildProgress(chosenObs.validation.idStatus);
	html+=`</div>`;
	// and end the infos div
	html +=`</div>`;
	//let's deal with the pictures now...
    html += `<div class="photos">`;
    let cpt = 1;
    // make the photos and their wrappers
    chosenObs.photos.forEach(photo=>{
    	let magnifierId='';
    	if (cpt==1) {
    		// init, magnifier on first image
    		magnifierId=`id="magnify"`;
    	}
    	html +=`<div class="mySlides fade">
    				<div class="numbertext">${cpt} / ${chosenObs.photos.length}</div>
    				<div onclick="toggleMagnify();" class="toggleMagnify">&#x1F50D;</div>   
				   	<img ${magnifierId} src="${photo.inpnFileUri}" >
				</div>`;
    	cpt++;
    });
    // add the links for the slideshow
    html += `<a class="prev" onclick="plusSlides(-1)">&#10094;</a>
    					<a class="next" onclick="plusSlides(1)">&#10095;</a>
    					</div>`;
	
    focus.innerHTML = html;
    // make this visible
    focus.style.visibility='visible';
    // and make the filter visible too
    let filter = document.querySelector('.filter');
    filter.style.filter='blur(5px) grayscale(60%)';
    showSlides(slideIndex);    

    // erreur, c'est inversé?! wtf
    displayMap(chosenObs.Y,chosenObs.X);

	// prevent scrolling ?
   	document.documentElement.style.overflow = 'hidden';
   	document.body.scroll = "no";

}



function magnify(imgID, zoom) {
	  var img, glass, w, h, bw;
	  img = document.getElementById(imgID);

	  /* Create magnifier glass: */
	  glass = document.createElement("DIV");
	  glass.setAttribute("class", "img-magnifier-glass");
	  glass.setAttribute("onclick", "toggleMagnify()");

	  /* Insert magnifier glass: */
	  img.parentElement.insertBefore(glass, img);

	  /* Set background properties for the magnifier glass: */
	  glass.style.backgroundImage = "url('" + img.src + "')";
	  glass.style.backgroundRepeat = "no-repeat";
	  glass.style.backgroundSize = (img.width * zoom) + "px " + (img.height * zoom) + "px";
	  bw = 3;
	  w = glass.offsetWidth / 2;
	  h = glass.offsetHeight / 2;

	  /* Execute a function when someone moves the magnifier glass over the image: */
	  glass.addEventListener("mousemove", moveMagnifier);
	  img.addEventListener("mousemove", moveMagnifier);

	  /*and also for touch screens:*/
	  glass.addEventListener("touchmove", moveMagnifier);
	  img.addEventListener("touchmove", moveMagnifier);
	  function moveMagnifier(e) {
	    var pos, x, y;
	    /* Prevent any other actions that may occur when moving over the image */
	    e.preventDefault();
	    /* Get the cursor's x and y positions: */
	    pos = getCursorPos(e);
	    x = pos.x;
	    y = pos.y;
	    /* Prevent the magnifier glass from being positioned outside the image: */
	    if (x > img.width - (w / zoom)) {x = img.width - (w / zoom);}
	    if (x < w / zoom) {x = w / zoom;}
	    if (y > img.height - (h / zoom)) {y = img.height - (h / zoom);}
	    if (y < h / zoom) {y = h / zoom;}
	    /* Set the position of the magnifier glass: */
	    glass.style.left = (x - w) + "px";
	    glass.style.top = (y - h) + "px";
	    /* Display what the magnifier glass "sees": */
	    glass.style.backgroundPosition = "-" + ((x * zoom) - w + bw) + "px -" + ((y * zoom) - h + bw) + "px";
	  }

	  function getCursorPos(e) {
	    var a, x = 0, y = 0;
	    e = e || window.event;
	    /* Get the x and y positions of the image: */
	    a = img.getBoundingClientRect();
	    /* Calculate the cursor's x and y coordinates, relative to the image: */
	    x = e.pageX - a.left;
	    y = e.pageY - a.top;
	    /* Consider any page scrolling: */
	    x = x - window.pageXOffset;
	    y = y - window.pageYOffset;
	    return {x : x, y : y};
	  }
      glass.style.left = "594px";
      glass.style.top = "21.5px";
	}

function displayMap(x,y){
	var mymap = L.map('map').setView([x, y], 13);
	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	    maxZoom: 18,
	    tileSize: 256,
	    zoomOffset: 0,
	    accessToken: 'your.mapbox.access.token'
	}).addTo(mymap);
	L.marker([x, y]).addTo(mymap);
}

function toggleMagnify(){
	// turning off / magnifier / toggleMagnifier
	
    let magnifier = document.querySelector('.img-magnifier-glass');
    
    if(magnifier!=null){
    	//turn off
    	magnifier.remove();
        let toggleMagnifier = document.querySelector('.toggleMagnify');
        toggleMagnifier.style.visibility='visible';
    } else {
    	//turn on
        magnify("magnify", 3);
        magnifier = document.querySelector('.img-magnifier-glass');
        magnifier.style.visibility='visible';
        let toggleMagnifier = document.querySelector('.toggleMagnify');
        toggleMagnifier.style.visibility='collapse';
    }
}


function hideDetails(){

	//console.log('Hiding details');
	if(document.querySelector('.photos')!=null){
		document.querySelector('.photos').remove();
	}
	// hiding the "focus" part
    let focus = document.querySelector('.focus');
    focus.style.visibility='collapse';
    // hiding the filter too
    let filter = document.querySelector('.filter');
    filter.style.filter='none';
    slideIndex=1;
	// removing magnifiers
	if(document.querySelector('.toggleMagnify')!=null){
		document.querySelector('.toggleMagnify').remove();
	}
	if(document.querySelector('.img-magnifier-glass')!=null){
		document.querySelector('.img-magnifier-glass').remove();
	}
    
	// re allow scrolling
 	document.documentElement.style.overflow = 'scroll';
 	document.body.scroll = "yes";

}

var slideIndex = 1;

// Next/previous controls, images slideshow
function plusSlides(n) {
	// clean magnifying glass
	if(document.querySelector('.img-magnifier-glass')!=null){
		document.querySelector('.img-magnifier-glass').remove();
	}
	// remove id to previous image
	document.getElementById('magnify').removeAttribute('id');
	// display the slides
  	showSlides(slideIndex += n);
	// add magnify id to current img : get divs with class mySlides
	var slides = document.getElementsByClassName("mySlides");
	// find the one with display:block;
  	let currentSlide;
	for (const slide of slides) {
	  if(slide.style.display=='block'){
	    currentSlide=slide;
	  }
	}
	// get the img child element inside
	let image = currentSlide.getElementsByTagName('img');
	// put the id "magnify" on it
	image[0].id='magnify';
}

function showSlides(n) {
  var i;
  var slides = document.getElementsByClassName("mySlides");
  if (n > slides.length) {slideIndex = 1}
  if (n < 1) {slideIndex = slides.length}
  for (i = 0; i < slides.length; i++) {
      slides[i].style.display = "none";
  }
  slides[slideIndex-1].style.display = "block";
  if(slides.length==1){
	  // deactivate left/right arrows
	  document.querySelector('.prev').style.visibility='collapse';
	  document.querySelector('.next').style.visibility='collapse';
  } 
}

