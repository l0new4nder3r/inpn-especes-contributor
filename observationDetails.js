/* Everything about displaying the details of a selected observation */
import { listObservations, TIMEOUT, buildProgress, blurBackground, unblurBackground, inpnUrlBase } from "./inpn.js";
import { callAndWaitForJsonAnswer } from "./utils.js";

/* eslint no-console: 0 */

// from https://fr.wikipedia.org/wiki/Statut_de_conservation
const conservationsStatuses = new Map();
conservationsStatuses.set("EX","Éteint");
conservationsStatuses.set("EW","Éteint à l'état sauvage");
conservationsStatuses.set("CR","En danger critique");
conservationsStatuses.set("EN","En danger");
conservationsStatuses.set("VU","Vulnérable");
conservationsStatuses.set("NT","Quasi menacé");
conservationsStatuses.set("LC","Préoccupation mineure");
conservationsStatuses.set("DD","Données insuffisantes");
conservationsStatuses.set("NE","Non évalué");

export let slideIndex = 1;

function findChosenObs (idData) {
    let chosenObs;
    listObservations.observations.forEach(obs=> {
        if (obs.idData === +idData) {
            chosenObs = obs;
        }
    });
    return chosenObs;
}

export function showDetails (idData) {
    // get current observation
    const chosenObs = findChosenObs(idData);

    // get validation details
    // useless for now, we have the latest info in the observation...
    //let validationHistoryUrl = `https://inpn.mnhn.fr/inpn-web-services/inpnespece/validation/data/${idData}/historique`;
    // let validationHistory = await callAndWaitForJsonAnswer(validationHistoryUrl);
    // if(validationHistory!=null){
    // 	//console.log(validationHistory[0].commentaire);
    // }

    // make some content for "focus" placeholder
    const focus = document.querySelector(".focus");

    initObservationContent(chosenObs, focus);

    blurBackground();

    showSlides(slideIndex);

    // erreur, c'est inversé?! wtf
    displayMap(chosenObs.Y,chosenObs.X);

    // get score details
    addScoreDetails(idData);

    // protected and red list statuses?
    addProtectionStatus(chosenObs.cdRef);

    // rare species
    addRareSpeciesInfo(chosenObs);

    addQuestData(chosenObs);

    focus.style.cursor="unset";
}

export function initObservationContent (chosenObs, focus) {
    let validStatus="99";
    if (chosenObs.validation!=null&&chosenObs.validation.idStatus!=null) {
        validStatus=chosenObs.validation.idStatus;
    }
    const newClassAttributes = `focus status${validStatus}`;
    focus.setAttribute("class", newClassAttributes);

    const htmlBegin = `<div class="popinTop">
              <div class="popinTitle">Détails de l'observation n°${chosenObs.idData}</div>
              <div id="closeDetails" class="tinyButton">X</div>
            </div>
            <div class="detailsContents">`;

    const htmlPhotos = buildPhotos(chosenObs);
    const htmlInfos = buildInfos(chosenObs);
    const htmlEnd="</div>";

    focus.innerHTML = (htmlBegin+htmlPhotos+htmlInfos+htmlEnd);
    // make this visible
    focus.style.visibility="visible";
    focus.id="popup";
    focus.style.cursor="progress";

    // adding listeners to photos components
    document.getElementById("closeDetails").addEventListener("click",hideDetails);
    document.querySelectorAll(".toggleMagnify").forEach(toggle=>{
        toggle.addEventListener("click",toggleMagnify);
    });
    document.querySelector(".next").addEventListener("click",plusOneSlide);
    document.querySelector(".prev").addEventListener("click",minusOneSlide);
    document.getElementById("magnify").addEventListener("click",toggleCoverContain);
    document.getElementById("share").addEventListener("click",copyLink);
    document.getElementById("share").addEventListener("mouseout",outTooltipButton);
}


export async function addQuestData (chosenObs) {
    if (chosenObs.questData!=null && chosenObs.questData.idCa!=null) {
        // ??? quest = `<div class="quest" title="Soumise dans le cadre d'une quête">🎯</div>`;
        const questUrl = `https://inpn.mnhn.fr/inpn-especes/quetes/forms/${chosenObs.questData.idCa}`;
        const questDetails = await callAndWaitForJsonAnswer(questUrl, TIMEOUT);
        if (questDetails==null || questDetails.libelle==null) {
            console.error("Erreur lors de l'appel des détails de quête");
        } else {
            document.getElementById("quest").title="Observation soumise dans le cadre d'une quête";
            document.getElementById("quest").innerHTML=`<a class="questLink" href="https://determinobs.fr/#/quetes/${chosenObs.questData.idCa}" target="_blank">🎯 ${questDetails.libelle}</a>`;
        }
    }
}

export async function addRareSpeciesInfo (chosenObs) {
    // espèce ayant moins de 5000 données sur l'INPN https://openobs.mnhn.fr/api/occurrences/stats/taxon/98651
    if (chosenObs.cdRef!=null&&chosenObs.cdRef!=="") {
        const occurrencesUrl = `https://openobs.mnhn.fr/api/occurrences/stats/taxon/${chosenObs.cdRef}`;
        const occurrences = await callAndWaitForJsonAnswer(occurrencesUrl, TIMEOUT);
        if (occurrences==null || occurrences.occurrenceCount==null) {
            console.error("Erreur lors de l'appel du comptage des observations");
        } else {
            if (occurrences.occurrenceCount<5000) {
                document.getElementById("rare").title=occurrences.occurrenceCount+" observations recensées";
                document.getElementById("rare").innerHTML="Espèce ayant moins de 5000 observations sur l'INPN";
            }
        }
    }
}

export async function addScoreDetails (idData) {
    const scoreDetailsUrl = `${inpnUrlBase}score/iddata/${idData}`;
    const scoreDetails = await callAndWaitForJsonAnswer(scoreDetailsUrl, TIMEOUT);
    if (scoreDetails==null) {
        console.warn("L'observation id "+idData+" n'a pas (encore?) de détail de score");
    }

    // inserting score details
    let scoresHtmlContents="";
    if (scoreDetails!=null) {
        scoreDetails.scoresHistorique.reverse();
        scoreDetails.scoresHistorique.forEach(score=>{
            const dateCrea=new Date(score.dateCrea).toLocaleString();
            scoresHtmlContents+=`<div title="${dateCrea}"><div style="font-style:italic;">${score.causes} : ${score.score} points</div></div>`;
        });
    }
    document.querySelector(".scoreDetails").innerHTML=scoresHtmlContents;
}

export async function addProtectionStatus (referenceCode) {
    if (referenceCode!=null) {
        const protectionStatusesUrl = `https://odata-inpn.mnhn.fr/taxa/${referenceCode}`;
        const protectionStatuses = await callAndWaitForJsonAnswer(protectionStatusesUrl, TIMEOUT);
        if (protectionStatuses==null) {
            console.error("Erreur lors de l'appel aux statuts de protection");
        } else {
            if (protectionStatuses.statuses!=null) {
                if (protectionStatuses.statuses.includes("RED_LIST")) {
                    let redListToolTip="";
                    const redListDetailsUrl = `https://odata-inpn.mnhn.fr/taxa/redLists/entries?taxrefId=${referenceCode}&scopes=NATIONAL&embed=RED_LIST`;
                    const redListDetails = await callAndWaitForJsonAnswer(redListDetailsUrl, TIMEOUT);
                    if (redListDetails==null) {
                        console.error("Erreur lors de l'appel aux détails de liste rouge");
                    } else {
                        if (redListDetails._embedded!=null&&redListDetails._embedded.redListEntries!=null&&redListDetails._embedded.redListEntries[0]!=null&&redListDetails._embedded.redListEntries[0].category!=null) {
                            if (conservationsStatuses.get(redListDetails._embedded.redListEntries[0].category)!=null) {
                                redListToolTip="Echelle nationale: "+conservationsStatuses.get(redListDetails._embedded.redListEntries[0].category);
                            } else {
                                redListToolTip=redListDetails._embedded.redListEntries[0].category;
                            }
                            document.querySelector(".protectionStatus").title=`${redListToolTip}`;
                        }
                    }
                    document.querySelector(".protectionStatus").innerHTML+="<div>Espèce sur liste rouge</div>";
                }
                if (protectionStatuses.statuses.includes("PROTECTED")) {
                    document.querySelector(".protectionStatus").innerHTML+="<div style=\"font-weight:bold;\">Espèce protégée</div>";
                }
            }
        }
    }
}

function buildInfos (chosenObs) {

    let validated = "";
    if (chosenObs.isCorrected==="true") {
        validated=`<div title="Proposition d'espèce corrigée" class="validated">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Cross_red_circle.svg/32px-Cross_red_circle.svg.png">
        </div>`;
    } else if (chosenObs.isValidated==="true") {
        validated=`<div title="Observation validée!" class="validated">
				<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Icons8_flat_approval.svg/32px-Icons8_flat_approval.svg.png">
				</div>`;
    } else {
        validated=`<div title="Observation non encore validée!" class="validated">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Icon-round-Question_mark.jpg/256px-Icon-round-Question_mark.jpg" style="width: 32px;">
        </div>`;
    }

    let titleLink = "";
    let nomComplet = chosenObs.nomComplet;
    if (nomComplet==="") {
        nomComplet="-";
        titleLink=`<h3>${nomComplet}</h3>`;
    } else {
        if (chosenObs.cdNom!==0) {
            let validationStatus="99";
            if (chosenObs.validation.idStatus!=null) {
                validationStatus=chosenObs.validation.idStatus;
            }
            titleLink= `<a class="linkMore status${validationStatus}" href="https://inpn.mnhn.fr/espece/cd_nom/${chosenObs.cdNom}" target="_blank">
						${nomComplet}
					</a>`;
        } else {
            titleLink=`<h3>${nomComplet}</h3>`;
        }
    }

    let correctedName = "";
    if (chosenObs.isCorrected==="true" && chosenObs.taxonOrigin.nomCompletOrigin!=="") {
        correctedName=`<a class="corrected" href="https://inpn.mnhn.fr/espece/cd_nom/${chosenObs.taxonOrigin.cdNomOrigin}" target="_blank">
					${chosenObs.taxonOrigin.nomCompletOrigin}</a>`;
    }

    let statusComment="";
    if (chosenObs.validation!=null && chosenObs.validation.StatusComment!=null) {
        statusComment=`<div class="statusComment">${chosenObs.validation.StatusComment}</div>`;
    }

    const creationDate = new Date(chosenObs.dateCrea).toLocaleString();

    let commentaire = "";
    if (chosenObs.commentaire!=="") {
        commentaire=`<div class="obsComment">"${chosenObs.commentaire}"</div>`;
    }

    let htmlInfos = `<div class="infos">
							${validated}
							${titleLink}
							${correctedName}
              <div class="tooltip" id="share" style="cursor: copy;display: block;width: 1em;height: 1em;">🔗<input type="text" id="shareLink" value="https://www.nbuchon.me/inpn/singleObs.html?id=${chosenObs.idData}" style="visibility: collapse;"><span class="tooltiptext" id="myTooltip">Partager cette observation</span></div>
							<div class="protectionStatus"></div>
							${statusComment}
							<p>${chosenObs.lbGroupSimple}</p>
							<p style="position: relative;width: 90%;;">${chosenObs.nomCommuns}</p>
							<p id="rare"></p>
							<div id="map"></div>
							<p style="font-style:italic;">${chosenObs.commune} (${chosenObs.numDepartement}), le ${creationDate}</p>
							${commentaire}
							<p id="quest"></p>
							<p>${chosenObs.scoreTotal} points</p>
							<div class="scoreDetails"></div>`;

    // adding the progress part again
    let validLabel="Erreur de données, validation vide";
    if (chosenObs.validation.lbStatus!=null) {
        validLabel=chosenObs.validation.lbStatus;
    }

    htmlInfos+=`<div title="${validLabel}" class="progressDetails">`;
    htmlInfos+=buildProgress(chosenObs.validation.idStatus);
    htmlInfos+="</div>";
    // and end the infos div
    htmlInfos+="</div>";
    return htmlInfos;
}


function buildPhotos (chosenObs) {
    //let's deal with the pictures now...
    let htmlPhotos = "<div class=\"photos\">";
    let cpt = 1;
    // make the photos and their wrappers
    chosenObs.photos.forEach(photo=>{
        let magnifierId="";
        if (cpt===1) {
            // init, magnifier on first image
            magnifierId="id=\"magnify\"";
        }
        htmlPhotos +=`<div class="mySlides fade">
										<div class="numbertext">${cpt} / ${chosenObs.photos.length}</div>
										<div class="toggleMagnify">&#x1F50D;</div>
										<img ${magnifierId} title="Cliquer dans l'image pour changer de format" src="${photo.inpnFileUri}" style="object-fit: cover;">
								</div>`;
        cpt++;
    });
    // add the links for the slideshow
    htmlPhotos += `<a class="prev" >&#10094;</a>
								 <a class="next" >&#10095;</a>
							</div>`;
    return htmlPhotos;
}


/* code taken from w3school examples */
function magnify (imgID, zoom) {
    const img = document.getElementById(imgID);

    /* Create magnifier glass: */
    const glass = document.createElement("DIV");
    glass.setAttribute("class", "img-magnifier-glass");
    //glass.setAttribute("onclick", "toggleMagnify()");
    glass.addEventListener("click", toggleMagnify);

    /* Insert magnifier glass: */
    img.parentElement.insertBefore(glass, img);

    /* Set background properties for the magnifier glass: */
    glass.style.backgroundImage = "url('" + img.src + "')";
    glass.style.backgroundRepeat = "no-repeat";

    const objSize = getObjectFitSize((img.style.objectFit==="contain"), img.width, img.height, img.naturalWidth, img.naturalHeight);
    // using real dimensions of altered images (by object fit css)
    glass.style.backgroundSize = (objSize.width * zoom) + "px " + (objSize.height * zoom) + "px";
    // before :	glass.style.backgroundSize = (img.width * zoom) + "px " + (img.height * zoom) + "px";

    const bw = 3;
    const w = glass.offsetWidth / 2;
    const h = glass.offsetHeight / 2;

    //let naturalRatio = img.naturalWidth / img.naturalHeight;
    //let visibleRatio = img.width / img.height;

    /* Execute a function when someone moves the magnifier glass over the image: */
    glass.addEventListener("mousemove", moveMagnifier);
    img.addEventListener("mousemove", moveMagnifier);

    /*and also for touch screens:*/
    glass.addEventListener("touchmove", moveMagnifier);
    img.addEventListener("touchmove", moveMagnifier);
    function moveMagnifier (e) {
        let x, y;
        /* Prevent any other actions that may occur when moving over the image */
        e.preventDefault();
        /* Get the cursor's x and y positions: */
        const pos = getCursorPos(e);
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

        // https://stackoverflow.com/questions/37256745/object-fit-get-resulting-dimensions
        const naturalRatio = img.naturalWidth / img.naturalHeight;
        const visibleRatio = img.width / img.height;

        if (img.style!=null&&img.style.objectFit!=null) {
            if (img.style.objectFit==="cover") {
                // img might be clipped, vert or hor (sides not displayed)
                if (naturalRatio > visibleRatio) {
                    // height displayed not cropped, just different ratio
                    // let's get the width, partially hidden, of the displayed image
                    const croppedImgWidth = img.height * naturalRatio;
                    // what's the length of the cropped part? Top by example
                    const croppedImgWidthLength = (croppedImgWidth-img.width)/2;
                    // xRatio yRatio ?
                    const xPosition = 0 -(((x * zoom) - w + bw + (croppedImgWidthLength*zoom)));
                    // console.log("there croppedImgWidth "+croppedImgWidth+" croppedImgWidthLength "+croppedImgWidthLength+" res= "+xPosition+" px")
                    glass.style.backgroundPosition = "" + xPosition + "px -" + ((y * zoom) - h + bw) + "px";
                } else {
                    // width displayed not cropped, just different ratio
                    // let's get the height, partially hidden, of the displayed image
                    const croppedImgHeight = img.width / naturalRatio;
                    // what's the length of the cropped part? Top by example
                    const croppedImgHeightLength = (croppedImgHeight-img.height)/2;
                    // xRatio yRatio ?
                    const yPosition = 0 -(((y * zoom) - h + bw + (croppedImgHeightLength*zoom)));
                    // console.log("here croppedImgHeight "+croppedImgHeight+" croppedImgHeightLength "+croppedImgHeightLength+" res= "+yPosition+" px")
                    glass.style.backgroundPosition = "-" + ((x * zoom) - w + bw) + "px " +yPosition + "px";
                }
            } else if (img.style.objectFit==="contain") {
                // img might be letterboxed (white on the sides h or v)

                const imageComputedStyle = window.getComputedStyle(img);
                const imagePositions = imageComputedStyle.getPropertyValue("object-position").split(" ");

                if (naturalRatio > visibleRatio) {
                    // horizontal white bars on top/bottom, y start and height ratio changed
                    const verticalPercentage = parseInt(imagePositions[1]) / 100;
                    const destinationHeightPercentage = (img.naturalHeight / img.height) / (img.naturalWidth / img.width);
                    const destinationYPercentage = (1 - destinationHeightPercentage) * verticalPercentage;

                    glass.style.backgroundPosition = "-" + ((x * zoom) - w + bw) + "px -" + ((y * zoom * destinationHeightPercentage) - h + bw + (destinationYPercentage*zoom)) + "px";
                } else {
                    // vertical white bars on the sides, x start and width ratio changed
                    const horizontalPercentage = parseInt(imagePositions[0]) / 100;
                    const destinationWidthPercentage = (img.naturalWidth / img.width) / (img.naturalHeight / img.height);
                    const destinationXPercentage = (1 - destinationWidthPercentage) * horizontalPercentage;

                    glass.style.backgroundPosition = "-" + ((x * zoom * destinationWidthPercentage) - w + bw + (destinationXPercentage*zoom)) + "px -" + ((y * zoom) - h + bw) + "px";
                }
            } else {
                // should not happen ; as before
                glass.style.backgroundPosition = "-" + ((x * zoom) - w + bw) + "px -" + ((y * zoom) - h + bw) + "px";
            }
        }
    }

    function getCursorPos (e) {
        let x = 0, y = 0;
        e = e || window.event;
        /* Get the x and y positions of the image: */
        const a = img.getBoundingClientRect();
        /* Calculate the cursor's x and y coordinates, relative to the image: */
        x = e.pageX - a.left;
        y = e.pageY - a.top;
        /* Consider any page scrolling: */
        x = x - window.pageXOffset;
        y = y - window.pageYOffset;
        return {x: x, y: y};
    }

    glass.style.left = "594px";
    glass.style.top = "21.5px";
}

// adapted from: https://www.npmjs.com/package/intrinsic-scale
function getObjectFitSize (contains /* true = contain, false = cover */, containerWidth, containerHeight, width, height) {
    const doRatio = width / height;
    const cRatio = containerWidth / containerHeight;
    let targetWidth = 0;
    let targetHeight = 0;
    const test = contains ? (doRatio > cRatio) : (doRatio < cRatio);

    if (test) {
        targetWidth = containerWidth;
        targetHeight = targetWidth / doRatio;
    } else {
        targetHeight = containerHeight;
        targetWidth = targetHeight * doRatio;
    }

    return {
        width: targetWidth,
        height: targetHeight,
        x: (containerWidth - targetWidth) / 2,
        y: (containerHeight - targetHeight) / 2
    };
}

export function displayMap (x,y) {
    /* eslint-disable no-undef */
    const mymap = L.map("map").setView([x, y], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors",
        maxZoom: 18,
        tileSize: 256,
        zoomOffset: 0
    }).addTo(mymap);
    L.marker([x, y]).addTo(mymap);
    /* eslint-enable no-undef */
}

function toggleMagnify () {
    // turning off / magnifier / toggleMagnifier
    let magnifier = document.querySelector(".img-magnifier-glass");

    if (magnifier!=null) {
        //turn off
        magnifier.remove();
        const toggleMagnifier = document.querySelector(".toggleMagnify");
        toggleMagnifier.style.visibility="visible";
    } else {
        //turn on
        magnify("magnify", 3);
        magnifier = document.querySelector(".img-magnifier-glass");
        magnifier.style.visibility="visible";
        const toggleMagnifier = document.querySelector(".toggleMagnify");
        toggleMagnifier.style.visibility="collapse";
    }
}

function hideDetails () {

    //console.log('Hiding details');
    if (document.querySelector(".photos")!=null) {
        document.querySelector(".photos").remove();
    }
    // hiding the "focus" part
    const focus = document.querySelector(".focus");
    focus.style.visibility="collapse";
    focus.id="";
    focus.innerHTML="";
    unblurBackground();

    slideIndex=1;
    // removing magnifiers
    if (document.querySelector(".toggleMagnify")!=null) {
        document.querySelector(".toggleMagnify").remove();
    }
    if (document.querySelector(".img-magnifier-glass")!=null) {
        document.querySelector(".img-magnifier-glass").remove();
    }
}

function plusOneSlide () {
    plusSlides(1);
}

function minusOneSlide () {
    plusSlides(-1);
}

/* code taken from w3school examples */
function plusSlides (n) {
    // clean magnifying glass
    if (document.querySelector(".img-magnifier-glass")!=null) {
        document.querySelector(".img-magnifier-glass").remove();
    }
    // remove id to previous image
    document.getElementById("magnify").removeEventListener("click", toggleCoverContain);
    document.getElementById("magnify").removeAttribute("id");
    // display the slides
    showSlides(slideIndex += n);
    // add magnify id to current img : get divs with class mySlides
    const slides = document.getElementsByClassName("mySlides");
    // find the one with display:block;
    let currentSlide;
    for (const slide of slides) {
        if (slide.style.display==="block") {
            currentSlide=slide;
        }
    }
    // get the img child element inside
    const image = currentSlide.getElementsByTagName("img");
    // put the id "magnify" on it
    image[0].id="magnify";
    image[0].addEventListener("click",toggleCoverContain);
}

export function showSlides (n) {
    let i;
    const slides = document.getElementsByClassName("mySlides");
    if (n > slides.length) {slideIndex = 1;}
    if (n < 1) {slideIndex = slides.length;}
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
    slides[slideIndex-1].style.display = "block";
    if (slides.length===1) {
        // deactivate left/right arrows
        document.querySelector(".prev").style.visibility="collapse";
        document.querySelector(".next").style.visibility="collapse";
    }
}

function toggleCoverContain (event) {
    const image = event.target;
    if (image.style.objectFit==="cover") {
        image.style.objectFit="contain";
        document.querySelectorAll(".numbertext").forEach(number=>{
            number.style.color="black";
        });
        document.querySelector(".prev").style.color="black";
        document.querySelector(".next").style.color="black";
        cssVarSet("--arrowsBackColour", "rgba(255,255,255,0.8)");
    } else {
        image.style.objectFit="cover";
        document.querySelectorAll(".numbertext").forEach(number=>{
            number.style.color="#f2f2f2";
        });
        document.querySelector(".prev").style.color="white";
        document.querySelector(".next").style.color="white";
        cssVarSet("--arrowsBackColour", "rgba(0,0,0,0.8)");
    }
}

// function cssVarGet (name) {
//     return getComputedStyle(document.documentElement).getPropertyValue(name);
// }

function cssVarSet (name, val) {
    document.documentElement.style.setProperty(name, val);
}

function copyLink () {
    const linkInput = document.getElementById("shareLink");
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(linkInput.value);
    const tooltip = document.getElementById("myTooltip");
    tooltip.innerHTML = "Lien copié dans le presse-papier!";
}

function outTooltipButton () {
    const tooltip = document.getElementById("myTooltip");
    tooltip.innerHTML = "Partager cette observation";
}
