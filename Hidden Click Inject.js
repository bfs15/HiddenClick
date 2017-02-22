// ==UserScript==
// @name        Load on Hover
// @namespace   *
// @version     1
// @grant       none
// ==/UserScript==

if (document.getElementsById('Hidden Click')) {
	throw new Error('This is not an error, Hidden Click already ran in this page');
}

var head = document.getElementsByTagName('head')[0];

var script = document.createElement('script');
script.id = 'Hidden Click';
script.src = chrome.extension.getURL('Hidden Click.js');
console.log('injected scripteroni', script);
console.log(document.getElementById('Hidden Click'));

head.appendChild(script);
