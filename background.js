
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
	executeScript(activeInfo.tabId);
}

var historyDelete = false; // see onVisited

function tabsOnUpdated (tabId, changeInfo, tabInfo) {
	if (tabInfo.windowId !== wId) {
	// on normal window
		if (changeInfo.status === 'loading') {
			historyDelete = false;
			discardOtherTabs(tabId);
			executeScript(tabId);
		}
	} else {
	// on Hidden Click window
		historyDelete = true;
		if (changeInfo.status === 'complete' && tabInfo.index !== 0) {
			chrome.tabs.discard(tabId);
		}
	}
}

function discardOtherTabs (tabId) {
	chrome.tabs.get(tabId, function (tab) {
		chrome.tabs.getAllInWindow(wId, function (tabs) {
			for (var i = 1; i < tabs.length; i++) {
				if (tabs[i].url === tab.url) {
				// when you find the same tab that is loading on the HC window
					// let it load and discard all remaining tabs
					for (var j = i + 1; j < tabs.length; j++) {
						chrome.tabs.discard(tabs[j].id);
					}
					return;
				}
				chrome.tabs.discard(tabs[i].id);
			}
		});
	});
}

function executeScript (tabId) {
	chrome.tabs.executeScript(tabId,
		{file: 'Hidden Click.js',
		runAt: 'document_end'});
}

function createWindow () {
	chrome.windows.create({ url: chrome.extension.getURL('options.html'),
		state: 'minimized' }, onWindowOpen);
}

function onWindowOpen (win) {
	w = win;
	wId = win.id;
}

var historyRange = 100;
// chrome.history.deleteRange doesn't remove entries if history Sync in enabled
// remove from history tabs opened by Hidden Click
chrome.history.onVisited.addListener(onVisited);
function onVisited (historyItem) {	// TODO: search for bugs here (historyDelete variable)
	if (historyDelete) {
		chrome.history.deleteRange({
			startTime: (Date.now() - historyRange),
			endTime: (Date.now())
		}, function () {});
	}
}

function tabsOnCreated (tabInfo) {
	chrome.tabs.update(tabInfo.id, {muted: true, autoDiscardable: true});
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
