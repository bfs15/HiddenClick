// ==UserScript==
// @name        Load on Hover
// @namespace   *
// @version     1
// @grant       none
// ==/UserScript==

if (typeof HiddenClick !== 'undefined') {
	throw new Error('This is not an error, Hidden Click already ran in this page');
}
// assert that you ran on this page
var HiddenClick = true;

// define //

// amount of time(in ms) after mouseover before page load
var loadDelay = 800;
// if you want to open links from other domains
var crossOrigin = true;

// main //

var body = document.querySelector('body');
createEventsToChildElems(body);

// observe changes to document to add events as needed
var observer = new MutationObserver(function (mutations) {
	// attribute mutation not only added nodes
	console.log(' \n mutations \n ', mutations, '\n');
	for (var i = 0; i < mutations.length; i++) {
		for (var j = 0; j < mutations[i].addedNodes.length; j++) {
			createEventsToChildElems(mutations[i].addedNodes[j]);
		}
	}
});

observer.observe(body,
	{ childList: true,
	attributes: true,
	attributeFilter: ['href'], // test this
	characterData: true, // prob should be false
	subtree: true });

// adds events to child elems of argument that have href
function createEventsToChildElems (elem) {
	// add events to elements with links
	var linkElems = elem.querySelectorAll('[href]');

	linkElems.forEach(function (linkElem) {
		if ((linkElem.getAttribute('HC-evnt')) ||
		(linkElem.getAttribute('HC-requested')) ||
		(typeof linkElem.href === 'undefined')) {
		// [href=#] has .href undefined
			return;
		}

		var sameDomain = linkElem.hostname === location.hostname;

		if (sameDomain &&	nextPage(linkElem.href)) {
		// if the link is to the next page of the current content
			request(linkElem);
		} else if (sameDomain || crossOrigin) {
		// add events only to links to sameDomain, or if crossOrigin enabled
			createEvents(linkElem);
		}
	});
}

function request (elem) {
	// send message to background.js
	console.log('requested', elem.href);
	chrome.runtime.sendMessage({href: elem.href});
	setRequestedAll(elem);
}

// sets all elements with the same link as elem as requested
function setRequestedAll (elem) {
	var href;

	if (elem.hostname === location.hostname) {
		href = elem.pathname + elem.search;	// for cases of relative href="/pathname?search"
	} else {
		href = elem.href;
	}

	console.log(' \n setting all:', href, 'as requested \n ');
	var linkElems = document.querySelectorAll('[href*="' + href + '"]');

	linkElems.forEach(function (linkElem) {
		linkElem.setAttribute('HC-requested', ' ');
		removeEvents(linkElem);
	});
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
	console.log('will create events for', elem);
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

function nextPage (pathname) {
	var pathnameSplit = pathname.split('/');

	if ((pathnameSplit.length > 2) &&
	// if it it isn't /3.html
	!(pathnameSplit[1] === location.pathname.split('/')[1])) {
	// and if not same pathname beggining
		return;
	}

	// link page number
	var nextNumber = pageNumber(pathname);
	// current location page number
	var currNumber = pageNumber(location.pathname);

	if (isNaN(currNumber) || isNaN(nextNumber)) {
		return false;
	}

	if (nextNumber === ((currNumber + 1) % 10)) {
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

	if (currentElem !== null) {
		if (elem.href === currentElem.href) {
		// if mouse is still hovering the same link
			request(elem);
		}
	}
}
