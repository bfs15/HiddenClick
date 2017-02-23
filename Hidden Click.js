// ==UserScript==
// @name        Load on Hover
// @namespace   *
// @version     1
// @grant       none
// ==/UserScript==

if (HiddenClick != null) {
	throw new Error('This is not an error, Hidden Click already ran in this page');
}
// assert that you ran on this page
var HiddenClick = true;

/* define */

// amount of time(in ms) after mouseover before page load
var loadDelay = 0;
// if you want to open links from other domains
var crossOrigin = true;
// true -> Links will not be opened on a new tab, only requests by XMLHttpRequest
var background = false;

/* background mode */
var hoverXMLHttpRequest = new XMLHttpRequest();
hoverXMLHttpRequest.onreadystatechange = function () {
	if (hoverXMLHttpRequest.readyState === 4 &&
	hoverXMLHttpRequest.status === 200) {
		// make responseText into a document
		var container = document.implementation.createHTMLDocument().documentElement;
		container.innerHTML = hoverXMLHttpRequest.responseText;

		/* GET files from document */

		// number of requests made
		var nReq = 0;
		var selectors = ['[src]', '[href*=".css"]'];

		for (var s = 0; s < selectors.length; s++) {
			var links = container.querySelectorAll(selectors[s]);
			console.log(' \n links gotten for selector', selectors[s], ': \n ', links); // TODO: test background mode more
			var xhrList = [];
			for (var i = 0; i < links.length; i++) {
				var url;

				if (links[i].src != null) {
					url = links[i].src;
				} else if (links[i].href != null) {
					url = links[i].href;
				} else {
					continue;
				}

				console.log('GET', url);
				if (url != null) {
					xhrList[nReq] = new XMLHttpRequest();
					xhrList[nReq].withCredentials = true;
					xhrList[nReq].open('GET', url);
					xhrList[nReq].send();
					nReq++;
				}
			}
		}
	}
};

/**
 * adds events to elem & elem childs, if they have valid links
 * @param {Object} elem
 */
function createEventsToChildElems (elem) {
	if (elem.querySelectorAll == null) {
		return;	// TODO: this test is prob unnecessary if you dont call this on certain mutations (attributes?)
	}
	// add events to elements with links
	var linkElems = elem.querySelectorAll('[href]');

	if (elem.href != null) {
		handleHrefElem(elem);
	}

	for (var i = 0; i < linkElems.length; i++) {
		handleHrefElem(linkElems[i]);
	}
}

/**
 * adds events elem, if they have valid links
 * @param {Object} elem
 */
function handleHrefElem (elem) {
	var sameHost = elem.hostname === location.hostname;

	if ((elem.getAttribute('HC-evnt')) ||
	(elem.getAttribute('HC-requested')) ||
	// (elem.download) || // TODO
	(elem.href === '') ||
	((elem.pathname + elem.hash + elem.search === '/') && sameHost)) {
		return;
	}

	if (sameHost &&	isNextPage(elem.pathname)) {
		// if the link is to the next page of the current content
		request(elem);
	} else if (sameHost || crossOrigin) {
		// add events only to links to sameHost, or if crossOrigin enabled
		createEvents(elem);
	}
}

/**
 * requests elem link and setRequestedAll(elem)
 * @param {Object} elem
 */
function request (elem) {
	console.log(' \n requested', elem.href, elem);
	if (background) {
		hoverXMLHttpRequest.open('GET', elem.href);
		hoverXMLHttpRequest.send();
	} else {
		// send message to background.js
		chrome.runtime.sendMessage({href: elem.href});
	}
	setRequestedAll(elem);
}

/**
 * sets all elements with the same link as elem as requested
 * @param {Object} elem
 */
function setRequestedAll (elem) {
	var href;

	if (elem.hostname === location.hostname) {
		// for cases of relative href="/pathname?pageNumber"
		href = elem.pathname + elem.search;
		if (href.length === 1) {
			return;	// dont set all href*="/" as requested
		}
	} else {
		href = elem.href;
	}

	var linkElems = document.querySelectorAll('[href*="' + href + '"]');
	console.log(' \n setting:', linkElems, 'as requested \n ');

	for (var i = 0; i < linkElems.length; i++) {
		linkElems[i].setAttribute('HC-requested', ' ');
		removeEvents(linkElems[i]);
	}
}

function removeEvents (elem) {
	if (elem.getAttribute('HC-onmousemove')) {
		elem.onmousemove = null;
		elem.removeAttribute('HC-onmousemove');
	}
	if (elem.getAttribute('HC-onwheel')) {
		elem.onwheel = null;
		elem.removeAttribute('HC-onwheel');
	}
	elem.removeEventListener('mouseover', linkHover);
	elem.removeEventListener('mouseout', linkHout);
	elem.removeEventListener('onclick', onClick);
}

function createEvents (elem) {
	if (elem.onmousemove == null) {
		elem.setAttribute('HC-onmousemove', ' ');
		elem.onmousemove = linkHover;
	}
	if (elem.onwheel == null) {
		elem.setAttribute('HC-onwheel', ' ');
		elem.onwheel = linkHover;
	}
	elem.addEventListener('mouseover', linkHover);
	elem.addEventListener('mouseout', linkHout);
	elem.addEventListener('onclick', onClick);

	elem.setAttribute('HC-evnt', ' ');
}

/**
 * returns if given pathname is the next page of the current location content.
 * doesn't test if its on the same hostname witch you should.
 * @param {String} pathname
 * @return {Boolean} isNextPage
 */
function isNextPage (pathname) {
	var pathnameSplit = pathname.split('/');

	if ((pathnameSplit.length > 2) &&
	// if it it isn't /3.html
	!(pathnameSplit[1] === location.pathname.split('/')[1])) {
	// and if not same pathname beggining
		return false;
	}

	// link page number
	var nextNumber = pageNumber(pathname);
	// current location page number
	var currNumber = pageNumber(location.pathname);

	if ((nextNumber === ((currNumber + 1) % 10)) &&
	!(isNaN(currNumber) || isNaN(nextNumber))) {
		return true;
	}

	return false;
}

function pageNumber (pathname) {
	// treats /manga/manga-title/03&o=1.048596, makes pageNumber = 3
	pathname = pathname.split('&')[0];
	var len = pathname.length;

	// treats /manga/manga-title/3.html
	if (pathname[len - 1] === 'l' && len >= 6) {
		return parseInt(pathname[len - 6]);
	}

	return parseInt(pathname[len - 1]);
}

function linkHout () {
	this.removeAttribute('HC-hovered');
}

function linkHover ()	{
	var elem = this;

	// TODO HC-requested test here should be obsolete since events are removed, test this
	if (elem.getAttribute('HC-hovered') || elem.getAttribute('HC-requested')) {
		return;
	}
	elem.setAttribute('HC-hovered', ' ');

	if (elem.getAttribute('HC-requestDelay')) {
		return;
	}
	elem.setAttribute('HC-requestDelay', ' ');

	setTimeout(function () {
		requestDelay(elem);
	}, loadDelay);
}

function onClick () {
	// send message to background.js
	chrome.runtime.sendMessage({clickedLink: true});
}

function requestDelay (elem) {
	elem.removeAttribute('HC-requestDelay');

	// element HC-hovered at the moment
	var currentElem = document.querySelector('[HC-hovered]');

	if (currentElem != null) {
		if (elem.href === currentElem.href) {
		// if mouse is still hovering the same link
			request(elem);
		}
	}
}

/* main */
var body = document.querySelector('body');
createEventsToChildElems(body);

// observe changes to document to add events as needed
var observer = new MutationObserver(function (mutations) {
	for (var i = 0; i < mutations.length; i++) {
		if (mutations[i].type === 'attributes') {
			// console.log(' \n mutation of type attributes: \n ', mutations[i]);
		}
		for (var j = 0; j < mutations[i].addedNodes.length; j++) {
			createEventsToChildElems(mutations[i].addedNodes[j]);
		}
	}
});
observer.observe(body,
	{ childList: true,
	attributes: true,
	attributeFilter: ['href'],
	subtree: true });
