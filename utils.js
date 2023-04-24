// Utils
import { changeContributor } from "./inpn.js";

/* eslint no-console: 0 */

let notificationId = 0;

/***
**
**  Simple utility functions
**
***/

export function valueOrZero (numericValue) {
    if (numericValue==null) {
        return 0;
    } else {
        return numericValue;
    }
}

export function valueOrNA (stringValue) {
    if (stringValue==null) {
        return "N/A";
    } else {
        return stringValue;
    }
}

/***
**
**	Event listeners
**
****/
export function initInputKeyPress () {
    // Get the input field
    const contributorInput = document.getElementById("contributorId");

    // Execute a function when the user releases a key on the keyboard
    contributorInput.addEventListener("keyup", function (event) {
    // Number 13 is the "Enter" key on the keyboard
        if (event.keyCode === 13) {
            // Trigger the action
            changeContributor();
        }
    });
}

// arrow shortcut page top
document.addEventListener("DOMContentLoaded", function () {
    window.onscroll = function () {myFunction();};

    function myFunction () {
        if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
            document.getElementById("upwards").style.opacity = "";
        } else {
            document.getElementById("upwards").style.opacity = "0";
        }
    }
});

/***
**
**	Cookie utils
**
****/

export function setCookie (cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    const expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/;secure;samesite=strict";
}

function getCookie (cname) {
    const name = cname + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(";");
    for (let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === " ") {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

export function checkContributorCookie () {
    const contributorId = getCookie("contributorId");
    if (contributorId !== "") {
        console.log("Will use cookie value of contributorId: " + contributorId);
    } else {
        console.log("Could not get any contributorId from cookie ");
    }
    return contributorId;
}

export function checkHelpCookie () {
    const hasHelpAlreadyBeenClosed = getCookie("helpClosed");
    if (hasHelpAlreadyBeenClosed !== "") {
        console.log("Will use cookie value of helpClosed: " + hasHelpAlreadyBeenClosed);
    }
    return hasHelpAlreadyBeenClosed;
}

/***
**
**	Local storage
**
****/

export function putInLocalStorage (key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function getFromLocalStorage (key) {
    const value = JSON.parse(localStorage.getItem(key));
    if (value!=null) {
        console.log("Found values in localStorage for key "+key+" ; by example, "+value.ids.length+" ids");
    }
    return value;
}

export function removeFromLocalStorage (key) {
    localStorage.removeItem(key);
}

export function clearAllLocalStorage () {
    localStorage.clear();
}

/***
**
**	Notifications utils
**
****/

// "inspired" from https://www.w3schools.com/howto/howto_js_alert.asp
// level = <empty> (danger) / success / info / warning
export function addNotification (level,title,content) {
    notificationId++;
    const alertLevel =`alert ${level}`;
    const notifTemplate=`<div class="${alertLevel}">
											  <strong>${title}</strong>
												<span id="notif${notificationId}" class="closebtn">&times;</span>
												<br/>
											  <p>${content}</p>
											</div>`;
    document.getElementById("notifications").insertAdjacentHTML("beforeend", notifTemplate);
    document.getElementById(`notif${notificationId}`).addEventListener("click", closeHandler);
}

export function closeHandler (event) {
    closeMe(event.target);
}

export function closeMe (closingSpan) {
    const div = closingSpan.parentElement;
    div.style.opacity = "0";
    setTimeout(function () { div.style.display = "none"; div.remove(); }, 600);
}

/***
**
**	Fetch utils
**
****/

export async function callAndWaitForJsonAnswer (url, timeout) {
    try {
        const res = await fetchWithTimeout(url, timeout);
        return await res.json();
    } catch (error) {
        if (error.name === "AbortError") {
            console.error("Call to "+url+" timed out after "+(timeout/1000)+"s");
        } else {
            console.error("Got error: "+error + " ...for url: "+url);
        }
    }
}

/* taken here https://dmitripavlutin.com/timeout-fetch-request/ */
async function fetchWithTimeout (resource, timeOut, options = {}) {
    const { timeout = timeOut } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);
    return response;
}

export function getUrlPath () {
    // if local testing : inpn-especes-contributor, otherwise inpn
    let urlPath = "inpn";
    if (window.location.hostname==="localhost") {
        urlPath="inpn-especes-contributor";
    }
    return urlPath;
}

export async function urlExists (url, callback) {
    // using head method will give us 403 error
    await fetch(url, { method: "get" })
        .then(function (status) {
            // console.log(status);
            callback(status.ok);
        });
}

export function isMobileDevice () {
    const isMobile = window.matchMedia("only screen and (max-width: 820px)").matches;
    if (isMobile) {
        console.log("Detected smart device, hopefully correctly!");
    }
    return isMobile;
}
