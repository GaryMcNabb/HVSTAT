//------------------------------------
// Generic utilities
//------------------------------------
var util = {
	clone: function (item) {
		//console.debug(item);
		if (item === null) return null;
		var primitives = [ "boolean", "number", "string", "undefined" ];
		var i = primitives.length;
		while (i--) {
			if (typeof item === primitives[i]) {
				return item;
			}
		}
		var clone;
		if (Array.isArray(item)) {
			clone = [];
			i = item.length;
			for (i = 0; i < item.length; i++) {
				//console.debug(i);
				clone[i] = arguments.callee(item[i]);
			}
		} else {
			clone = {};
			for (i in item) {
				if (Object.prototype.hasOwnProperty.call(item, i)) {
					//console.debug(i);
					clone[i] = arguments.callee(item[i]);
				}
			}
		}
		return clone;
	},
	escapeRegex: function (value) {
		return value.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
	},
	innerText: function (node) {
		var s = "", t, i;
		if (node.nodeType === document.TEXT_NODE) {
			if (node.nodeValue) {
				s = node.nodeValue;
			}
		} else if (node.nodeType === document.ELEMENT_NODE) {
			for (i = 0; i < node.childNodes.length; i++) {
				t = arguments.callee(node.childNodes[i]);
				if (t) {
					if (s !== "") {
						s += " ";
					}
					s += t;
				}
			}
		}
		return s;
	},
	siteScriptElement: null,
	addSiteScript: function (fn) {
		if (!this.siteScriptElement) {
			this.scriptElement = document.createElement("script");
			this.scriptElement.type = "text/javascript";
			document.body.appendChild(this.scriptElement);
		}
		this.scriptElement.textContent += '\n' + String(fn) + '\n';
	},
};
util.CallbackQueue = function () {
	this.closures = [];
	this.executed = false;
	this.context = null;
};
util.CallbackQueue.prototype = {
	add: function (fn) {
		if (!(fn instanceof Function)) {
			return;
		}
		if (this.executed) {
			fn(this.context);
		} else {
			this.closures.push(fn);
		}
	},
	execute: function (context) {
		if (this.executed) {
			return;
		}
		this.executed = true;
		this.context = context;
		while (this.closures[0]) {
			this.closures.shift()(this.context);
		}
	},
};

util.event = {
	mouseOverEvent: null,
	mouseOver: function (element) {
		if (!this.mouseOverEvent) {
			this.mouseOverEvent = document.createEvent("MouseEvents");
			this.mouseOverEvent.initMouseEvent("mouseover", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
		}
		element.dispatchEvent(this.mouseOverEvent);
	},
	mouseOutEvent: null,
	mouseOut: function (element) {
		if (!this.mouseOutEvent) {
			this.mouseOutEvent = document.createEvent("MouseEvents");
			this.mouseOutEvent.initMouseEvent("mouseout", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
		}
		element.dispatchEvent(this.mouseOutEvent);
	},
};

util.document = {
	bodyRange: null,
	_body: null,
	get body() {
		return this._body || document.body;
	},
	extractBody: function () {
		if (document.body) {
			this.bodyRange = document.createRange();
			this.bodyRange.selectNode(document.body);
			this._body = this.bodyRange.extractContents();
		}
	},
	restoreBody: function () {
		if (this._body) {
			this.bodyRange.insertNode(this._body);
			this._body = null;
		}
	},
};
