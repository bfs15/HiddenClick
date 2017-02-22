
var enabled;

chrome.runtime.sendMessage(
	{isEnabled: true},
	function (r) {
		enabled = r.enabled;
	}
);

var enableButton = document.getElementById('enable');

if (enabled) {
	// normal icon
} else {
	// make icon grey
}

enableButton.addEventListener('click', function () {
	chrome.runtime.sendMessage({enableClick: true});
});
