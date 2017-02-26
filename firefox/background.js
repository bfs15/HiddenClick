
// last url that was on a active, loading tab
var lastActiveTabUrl = '';
// last defined window object
var w;
// last defined window id
var wId = -1;
// state of the script
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

/**
 * Creates HiddenClick window
 */
function createWindow () {
	// TODO settings.html instead
	chrome.windows.create(
		{
			url: chrome.extension.getURL('browser_action/browser_action.html'),
			state: 'minimized'
		}, onWindowOpen);
}

/**
 * When a tab is activated, executeScript and
 * if it's loading, 'discardOtherTabs'
 * @param  {[Tab]} tabInfo
 */
function tabsOnActivated (tabInfo) {
	executeScript(tabInfo.tabId);

	if (tabInfo.status === 'loading' && tabInfo.url !== lastActiveTabUrl) {
		discardOtherTabs(tabInfo);
	}

	lastActiveTabUrl = tabInfo.url;
}

function tabsOnUpdated (tabId, changeInfo, tabInfo) {
	if (tabInfo.windowId !== wId) {
	// on normal window
		if (changeInfo.status === 'loading') {
			historyDelete = false;
		}
		if (tabInfo.active) {
			if (tabInfo.url !== lastActiveTabUrl) {
				executeScript(tabInfo.tabId);

				if (changeInfo.status === 'loading') {
					discardOtherTabs(tabInfo);

					lastActiveTabUrl = (' ' + tabInfo.url).slice(1);
				}
			}
		}
	} else {
	// on Hidden Click window
		historyDelete = true;

		if (changeInfo.status === 'complete' && tabInfo.index !== 0) {
			chrome.tabs.remove(tabInfo.id);
		}
	}
}

function discardOtherTabs (tab) {
	console.log(tab.url, ' \n other urls will be discarded');

	chrome.tabs.query(
		{
			windowId: wId
		}, clean);

	function clean (tabs) {
		for (var i = 1; i < tabs.length; i++) {
			// go through the tabs discarting them
			// until you find the one that is loading
			if (tabs[i].url === tab.url) {
				// let it load and discard all remaining tabs
				for (var j = i + 1; j < tabs.length; j++) {
					if (tabs[j].discarded) {
						// on the first already discarded tab
						console.log('discard return', tabs[j], ' \n ', tabs[j].url);
						return;// so you don't go through old tabs
					}
					console.log('discard', tabs[j], ' \n ', tabs[j].url);
					chrome.tabs.remove(tabs[j].id);
				}
				return;
			}
			if (!tabs[i].discarded) {
				console.log('discard', tabs[i], ' \n ', tabs[i].url);
				chrome.tabs.remove(tabs[i].id);
			}
		}
	}
}

function executeScript (tabId) {
	chrome.tabs.executeScript(tabId,
		{
			file: 'Hidden Click.js',
			runAt: 'document_idle'
		});
}

function onWindowOpen (win) {
	w = win;
	wId = win.id;
}

chrome.history.onVisited.addListener(onVisited);

// constant
var historyRange = 100;

// static
var historyDelete = false;

/**
 * Removes automatically from history tabs opened by Hidden Click.
 * Warning chrome.history.deleteRange doesn't remove entries if
 * history Sync is enabled
 * @param  {[historyItem]} historyItem
 */
function onVisited (historyItem) {	// TODO search for bugs here (historyDelete variable)
	if (historyDelete) {
		chrome.history.deleteRange(
			{
				startTime: (Date.now() - historyRange),
				endTime: (Date.now())
			}, function () {});
	}
}

chrome.runtime.onMessage.addListener(
	function receiveMessage (message, sender, sendResponse) {
		if (enabled) {
			main(message, sender, sendResponse);
		}

		if (message.enableClick != null) {
			if (enabled) {
				disable();
			} else {
				enable();
			}
			return;
		}

		if (message.isEnabled != null) {
			sendResponse({enabled: enabled});
			return;
		}
	}
);

function main (message, sender, sendResponse) {
	if (message.request != null) {
		// try {	// TODO instead of chrome.windows.get(wId, function (win) {to see if win != null
		// 	chrome.tabs.create({windowId: w.id, url: message.request, active: false}, tabsOnCreated);
		// } catch (e) {
		// 	// Hidden Click window closed, opening another
		// 	createWindow();
		// }

		chrome.windows.get(wId, function (win) {
			w = win;
		});

		if (w != null) {
			// if window is open
			chrome.tabs.create(
				{
					windowId: w.id,
					index: 1,
					url: message.request,
					active: false
				}, tabsOnCreated);
		} else {
			createWindow();
		}

		return;
	}
}

/**
 * When tab is created, mute is and set autoDiscardable
 * @param  {[Tab]} tabInfo
 */
function tabsOnCreated (tabInfo) {
	chrome.tabs.update(tabInfo.id,
		{
			muted: true
		});
}
