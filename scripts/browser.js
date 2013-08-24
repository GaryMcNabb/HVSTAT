//------------------------------------
// Browser utilities
//------------------------------------
var browser = {
	get isChrome() {
		return navigator.userAgent.indexOf("Chrome") >= 0;
	},
};

browser.extension = {
	getResourceURL: function (resourcePath, resourceName) {
		var resourceURL;
		if (browser.isChrome) {
			resourceURL = chrome.extension.getURL(resourcePath + resourceName);
		} else {
			resourceURL = GM_getResourceURL(resourceName);
		}
		return resourceURL;
	},
	getResourceText: function (resoucePath, resourceName) {
		var resourceText;
		if (browser.isChrome) {
			var request = new XMLHttpRequest();
			var resourceURL = browser.extension.getResourceURL(resoucePath, resourceName);
			request.open("GET", resourceURL, false);
			request.send(null);
			resourceText = request.responseText;
		} else {
			resourceText = GM_getResourceText(resourceName);
		}
		return resourceText;
	},
	loadScript: function (scriptPath, scriptName) {
		eval.call(window, browser.extension.getResourceText(scriptPath, scriptName));
	}
};

browser.extension.style = {
	element: null,
	add: function (styleText) {
		if (!browser.isChrome) {
			GM_addStyle(styleText);
		} else {
			if (!this.element) {
				this.element = document.createElement("style");
				this.element.type = "text/css";
				(document.head || document.documentElement).insertBefore(this.element, null);
			}
			this.element.textContent += "\n" + styleText;
		}
	},
	addFromResource: function (styleResourcePath, styleResouceName, imageResouceInfoArray) {
		var styleText = browser.extension.getResourceText(styleResourcePath, styleResouceName);
		if (Array.isArray(imageResouceInfoArray)) {
			// Replace image URLs
			for (var i = 0; i < imageResouceInfoArray.length; i++) {
				var imageResourceName = imageResouceInfoArray[i].name;
				var imageOriginalPath = imageResouceInfoArray[i].originalPath;
				var imageResourcePath = imageResouceInfoArray[i].resourcePath;
				var imageResourceURL = browser.extension.getResourceURL(imageResourcePath, imageResourceName);
				var regex = new RegExp(util.escapeRegex(imageOriginalPath + imageResourceName), "g");
				styleText = styleText.replace(regex, imageResourceURL);
			}
		}
		this.add(styleText);
	},
	ImageResourceInfo: function (originalPath, name, resourcePath) {
		this.originalPath = originalPath;
		this.name = name;
		this.resourcePath = resourcePath;
	},
};

browser.I = browser.extension.style.ImageResourceInfo;	// Alias
