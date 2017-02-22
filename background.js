
// last url received from document script (by message)
var lastUrl;
// last defined window object
var w;
// last defined window id
var wId = -1;

var click = false;

var enabled = true;

enable();

function enable () {
	createWindow();
	chrome.tabs.onActivated.addListener(tabsOnActivated);
	chrome.tabs.onUpdated.addListener(tabsOnUpdated);
	enabled = true;
}

function disable () {
	chrome.windows.remove(wId);
	chrome.tabs.onActivated.removeListener(tabsOnActivated);
	chrome.tabs.onUpdated.removeListener(tabsOnUpdated);
	enabled = false;
}

function tabsOnActivated (activeInfo) {
	executeScript(activeInfo.id);
}

var historyDelay = 100;
var historyRange = 400;
// TODO: reapply evnts on content script, remove this funct
function tabsOnUpdated (tabId, changeInfo, tabInfo) {
	if (tabInfo.windowId !== wId) {
	// on normal window
		if (changeInfo.status === 'loading') {
			executeScript(tabId);
		}
	} else {
	// on Hidden Click window
		if (changeInfo.status === 'complete' && tabInfo.index !== 0) {
			chrome.tabs.remove(tabId);
			// console.log('completed on HC window', Date.now());
			setTimeout(function () {
				// console.log('deleted in range: ', Date.now() - historyRange, Date.now());
				// chrome.history.deleteRange({
				// 	startTime: Date.now() - 10,
				// 	endTime: Date.now()
				// });
			}, historyDelay);
		}
	}
}

function executeScript (tabId) {
	chrome.tabs.executeScript(tabId, {file: 'Hidden Click.js', runAt: 'document_end'});
}

function createWindow () {
	chrome.windows.create({ url: chrome.extension.getURL('options.html'),
		state: 'minimized' }, onWindowOpen);
}

function onWindowOpen (win) {
	w = win;
	wId = win.id;
}

// TODO
// chrome.history.onVisited.addListener(onVisited);
// function onVisited (historyItem) {
// 	console.log('onVisited', historyItem);
// }

function tabsOnCreated (tabInfo) {
	chrome.tabs.update(tabInfo.id, {muted: true});
	chrome.tabs.insertCSS(tabInfo.id, {code: '* { display: none }', runAt: 'document_start', allFrames: true});
}

chrome.runtime.onMessage.addListener(
	function receiveMessage (message, sender, sendResponse) {
		if (enabled) {
			main(message, sender, sendResponse);
		}

		if (typeof message.enableClick !== 'undefined') {
			if (enabled) {
				disable();
			} else {
				enable();
			}
			return;
		}

		if (typeof message.isEnabled !== 'undefined') {
			sendResponse({enabled: enabled});
			return;
		}
	}
);

function main (message, sender, sendResponse) {
	if (typeof message.href !== 'undefined') {
		if (lastUrl === message.href) {	// TODO: make this obsolete, make it so you don't receive repeated messages
			return;
		}

		lastUrl = message.href;

		// try {	// TODO
		// 	chrome.tabs.create({windowId: w.id, url: lastUrl, active: false}, tabsOnCreated);
		// } catch (e) {
		// 	// Hidden Click window closed, opening another
		// 	createWindow();
		// }

		chrome.windows.get(wId, function (win) {
			w = win;
		});

		if (typeof w !== 'undefined') {
			// if window is open
			chrome.tabs.create({windowId: w.id, url: lastUrl, active: false}, tabsOnCreated);
		} else {
			createWindow();
		}

		return;
	}

	if (typeof message.clickedLink !== 'undefined') {
		console.log('CLICKED A LINK');
		click = true;
		return;
	}
}
