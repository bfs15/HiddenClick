// ==UserScript==
// @name        Load on Hover
// @namespace   *
// @version     1
// @grant       none
// ==/UserScript==

if (HiddenClick != null) {
	throw new Error('Not an error, Hidden Click already ran on this page');
}
// assert that you ran on this page
var HiddenClick = true;
console.log('Hidden Click initialized');

/* define */

// amount of time(in ms) after mouseover before page load
var loadDelay = 0;
// if you want to open links from other domains
var crossOrigin = true;

// true -> links will not be opened on a new tab
var background = false;
	// true -> will make XMLHttpRequests instead of appending to the current doc
var XMLHttpMode = false;

var HCdiv;

createEventsToChildElems(document.body);

createHCdiv();

// div to insert content to load
function createHCdiv () {
	HCdiv = document.createElement('div');
	HCdiv.id = 'Hidden Click';
	HCdiv.style = 'display: none;';

	document.body.appendChild(HCdiv);

	console.log('createHCdiv()', HCdiv);
}

/* background mode */
var hoverReq = new XMLHttpRequest();
hoverReq.onreadystatechange = function requestLinksFromDoc () {
	if (hoverReq.readyState === 4 &&
	hoverReq.status === 200) {
		// make responseText into a document
		var container = document.implementation.createHTMLDocument().documentElement;
		container.innerHTML = hoverReq.responseText;

		if (document.getElementById('Hidden Click') == null) {
			createHCdiv();
		} else {
			console.log('');
		}

		if (document.getElementById('Hidden Click') == null) {
			console.log('what the f');
		}

		// number of requests made
		var nReq = 0;
		var selectors = ['[src]', '[href*=".css"]'];
		var type = ['src', 'href'];

		// Get different link types
		for (var s = 0; s < selectors.length; s++) {
			// Query links with that selector
			var links = container.querySelectorAll(selectors[s]);
			console.log(' \n links gotten for selector', selectors[s], ' \n ', links); // TODO test background mode more
			var xhrList = [];

			// For all links...
			for (var i = 0; i < links.length; i++) {
				if ((links[i].getAttribute(type[s]) != null) &&
				(links[i].getAttribute(type[s]) !== '')) {
					if (XMLHttpMode) {
						xhrList[nReq] = new XMLHttpRequest();
						xhrList[nReq].withCredentials = true;
						xhrList[nReq].open('GET', links[i][type[s]]);
						xhrList[nReq].send();
						nReq++;
					} else {
						var div = document.getElementById('Hidden Click');
						console.log('actual div', div);
						if (div == null) {
							createHCdiv();
						}
						console.log('HCdiv', HCdiv, links[i].getAttribute(type[s]));
						var elem = document.createElement(links[i].tagName);
						elem[type[s]] = links[i].getAttribute(type[s]);
						HCdiv.appendChild(elem);
					}
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
		return;	// TODO this test is prob unnecessary if you dont call this on certain mutations (attributes?)
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
		console.log('"next page" request');
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
		hoverReq.open('GET', elem.href);
		hoverReq.send();
	} else {
		// send message to background.js
		chrome.runtime.sendMessage({request: elem.href});
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

function requestDelay (elem) {
	elem.removeAttribute('HC-requestDelay');

	// element HC-hovered at the moment
	var currentElems = document.querySelectorAll('[HC-hovered]');

	for (var i = 0; i < currentElems.length; i++) {
		if (elem.href === currentElems[i].href) {
		// if mouse is still hovering the same link
			request(elem);
		}
	}
}

// observe changes to document to add events as needed
var observer = new MutationObserver(function (mutations) {
	for (var i = 0; i < mutations.length; i++) {
		if (mutations[i].type === 'attributes') {
			// console.log(' \n mutation of type attributes \n ', mutations[i]);
		}
		for (var j = 0; j < mutations[i].addedNodes.length; j++) {
			createEventsToChildElems(mutations[i].addedNodes[j]);
		}
	}
});
observer.observe(document.body,
	{
		childList: true,
		attributes: true,
		attributeFilter: ['href'],
		subtree: true
	});
