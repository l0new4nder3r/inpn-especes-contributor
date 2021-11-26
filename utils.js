// Utils


/***
**
**	Event listeners
**
****/
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

// arrow shortcut page top
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

window.onbeforeunload = function(){
  return 'Êtes-vous certain de vouloir quitter cette page? Il faudra potentiellement tout recharger.';
};

/***
**
**	Cookie utils
**
****/

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

/***
**
**	Local storage
**
****/

function putInLocalStorage(key, value){
	localStorage.setItem(key, JSON.stringify(value));
}

function getFromLocalStorage(key){
	const value = JSON.parse(localStorage.getItem(key));
	if(value!=null){
		console.log("Found values in localStorage for key "+key+" : "+value.ids.length+" ids, by example");
	}
	return value;
}

function removeFromLocalStorage(key){
	localStorage.removeItem(key);
}

function clearAllLocalStorage(){
	localStorage.clear();
}

/***
**
**	Notifications utils
**
****/

// "inspired" from https://www.w3schools.com/howto/howto_js_alert.asp
// level = <empty> (danger) / success / info / warning
function addNotification(level,title,content){
	const alertLevel =`alert ${level}`;
	const notifTemplate=`<div class="${alertLevel}">
											  <strong>${title}</strong>
												<span onclick="closeMe(this);" class="closebtn">&times;</span>
												<br/>
											  <p>${content}</p>
											</div>`;
	document.getElementById('notifications').innerHTML+=notifTemplate;
}

function closeMe(closingSpan){
	// console.log(closingSpan);
	var div = closingSpan.parentElement;
	div.style.opacity = "0";
	setTimeout(function(){ div.style.display = "none";div.remove(); }, 600);
}

/***
**
**	Fetch utils
**
****/

async function callAndWaitForJsonAnswer(url) {
		try {
			let res = await fetchWithTimeout(url);
			return await res.json();
		} catch (error) {
			if(error.name === 'AbortError'){
				console.log('Call to '+url+' timed out after '+(TIMEOUT/1000)+'s');
			} else {
				console.log('Got error: '+error + ' ...for url: '+url);
			}
		}
}

/* taken here https://dmitripavlutin.com/timeout-fetch-request/ */
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = TIMEOUT } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, {
    ...options,
    signal: controller.signal
  });
  clearTimeout(id);
  return response;
}
