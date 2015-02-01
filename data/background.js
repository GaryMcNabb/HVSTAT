chrome.runtime.onInstalled.addListener(function() {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		chrome.declarativeContent.onPageChanged.addRules([{
			conditions: [
				new chrome.declarativeContent.PageStateMatcher({
					pageUrl: { hostEquals: 'hentaiverse.org' },
				}),
				new chrome.declarativeContent.PageStateMatcher({
					pageUrl: { hostEquals: 'alt.hentaiverse.org' },
				})
			],
			actions: [ new chrome.declarativeContent.ShowPageAction() ]
		}]);
	});
});