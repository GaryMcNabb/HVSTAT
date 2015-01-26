var hvStat = {};
hvStat.injection = {
	onkeydown: null,
	execute: function () {
		document.addEventListener("hvstatcomplete", this.hvStatComplete);
		if (document.readyState !== "loading") {
			this.disableDocumentKeydown();
		} else {
			document.addEventListener("readystatechange", this.documentComplete);
		}
	},
	documentComplete: function (event) {
		this.removeEventListener(event.type, arguments.callee);
		hvStat.injection.disableDocumentKeydown();
	},
	hvStatComplete: function (event) {
		this.removeEventListener(event.type, arguments.callee);
		hvStat.injection.enableDocumentKeydown();
	},
	disableDocumentKeydown: function () {
		hvStat.injection.onkeydown = document.onkeydown;
		document.onkeydown = null;
	},
	enableDocumentKeydown: function () {
		if (hvStat.injection.onkeydown) {
			document.onkeydown = hvStat.injection.onkeydown;
		}
	}
};
hvStat.injection.execute();
