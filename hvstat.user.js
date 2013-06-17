// ==UserScript==
// @name            HV Statistics, Tracking, and Analysis Tool
// @namespace       HV STAT
// @description     Collects data, analyzes statistics, and enhances the interface of the HentaiVerse
// @include         http://hentaiverse.org/*
// @exclude         http://hentaiverse.org/pages/showequip*
// @exclude         http://hentaiverse.org/?login*
// @author          Various (http://forums.e-hentai.org/index.php?showtopic=79552)
// @version         5.6.2
// @resource        battle-log-type0.css                        css/battle-log-type0.css
// @resource        battle-log-type1.css                        css/battle-log-type1.css
// @resource        hvstat.css                                  css/hvstat.css
// @resource        hvstat-ui.css                               css/hvstat-ui.css
// @resource        jquery-ui-1.9.2.custom.min.css              css/jquery-ui-1.9.2.custom.min.css
// @resource        channeling.png                              css/images/channeling.png
// @resource        healthpot.png                               css/images/healthpot.png
// @resource        manapot.png                                 css/images/manapot.png
// @resource        spiritpot.png                               css/images/spiritpot.png
// @resource        ui-bg_flat_0_aaaaaa_40x100.png              css/images/ui-bg_flat_0_aaaaaa_40x100.png
// @resource        ui-bg_flat_55_fbf9ee_40x100.png             css/images/ui-bg_flat_55_fbf9ee_40x100.png
// @resource        ui-bg_flat_65_edebdf_40x100.png             css/images/ui-bg_flat_65_edebdf_40x100.png
// @resource        ui-bg_flat_75_e3e0d1_40x100.png             css/images/ui-bg_flat_75_e3e0d1_40x100.png
// @resource        ui-bg_flat_75_edebdf_40x100.png             css/images/ui-bg_flat_75_edebdf_40x100.png
// @resource        ui-bg_flat_95_fef1ec_40x100.png             css/images/ui-bg_flat_95_fef1ec_40x100.png
// @resource        ui-icons_2e83ff_256x240.png                 css/images/ui-icons_2e83ff_256x240.png
// @resource        ui-icons_5c0d11_256x240.png                 css/images/ui-icons_5c0d11_256x240.png
// @resource        ui-icons_cd0a0a_256x240.png                 css/images/ui-icons_cd0a0a_256x240.png
// @resource        battle-stats-pane.html                      html/battle-stats-pane.html
// @resource        database-pane.html                          html/database-pane.html
// @resource        drops-pane.html                             html/drops-pane.html
// @resource        main.html                                   html/main.html
// @resource        overview-pane.html                          html/overview-pane.html
// @resource        proficiency-table.html                      html/proficiency-table.html
// @resource        settings-pane.html                          html/settings-pane.html
// @resource        shrine-pane.html                            html/shrine-pane.html
// @resource        drops-display-table.json                    json/drops-display-table.json
// @resource        jquery-1.8.3.min.js                         scripts/jquery-1.8.3.min.js
// @resource        jquery-ui-1.9.2.custom.min.js               scripts/jquery-ui-1.9.2.custom.min.js
// @run-at          document-start
// ==/UserScript==

//------------------------------------
// Remove vendor prefix
//------------------------------------
window.indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange|| window.webkitIDBKeyRange;
window.IDBCursor = window.IDBCursor || window.webkitIDBCursor;

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

//------------------------------------
// HV utility object
//------------------------------------
var hv = {
	util: {
		getGaugeRate: function (gaugeElement, gaugeMaxWidth) {
			if (!gaugeElement) {
				return 0;
			}
			var result = /width\s*?:\s*?(\d+?)px/i.exec(gaugeElement.style.cssText);
			var rate = 0;
			if (result) {
				rate = Number(result[1]) / gaugeMaxWidth;
			} else {
				rate = gaugeElement.width / gaugeMaxWidth;
			}
			return rate;
		},
		getCharacterGaugeRate: function (gauge) {
			return hv.util.getGaugeRate(gauge, 120);
		},
		percent: function (value) {
			return Math.floor(value * 100);
		},
		isUsingHVFontEngine: null,
		hvFontMap: "0123456789.,!?%+-=/\\'\":;()[]_           ABCDEFGHIJKLMNOPQRSTUVWXYZ ",
		hvFontTextBlockSelector: 'div.fd2, div.fd4',
		hvFontCharsLtoRSelector: 'div.f2lb, div.f2lg, div.f2lr, div.f2ly, div.f2la, div.f4lb, div.f4lg, div.f4lr, div.f4ly, div.f4la',
		hvFontCharsRtoLSelector: 'div.f2rb, div.f2rg, div.f2rr, div.f2ry, div.f2ra, div.f4rb, div.f4rg, div.f4rr, div.f4ry, div.f4ra',
		innerText: function (element) {
			if (!this.isUsingHVFontEngine) {
				return util.innerText(element);
			}
			// Parse HV Font text
			var innerText = "";
			var textBlock, textBlocks;
			var selfClassNames = element.className.split(' ');
			//console.debug(selfClassNames);
			if (selfClassNames.indexOf('fd2') >= 0 || selfClassNames.indexOf('fd4') >= 0) {
				textBlocks = [element];
			} else {
				textBlocks = element.querySelectorAll(this.hvFontTextBlockSelector);
			}
			//console.debug(textBlocks);
			var charDivsLtoR, charDivsRtoL, charDivs, charDiv, regexResult, index;
			var i, j, len;
			for (i = 0; i < textBlocks.length; i++) {
				textBlock = textBlocks[i];
				charDivsLtoR = textBlock.querySelectorAll(this.hvFontCharsLtoRSelector);
				charDivsRtoL = textBlock.querySelectorAll(this.hvFontCharsRtoLSelector);
				charDivs = [];
				if (charDivsLtoR) {
					len = charDivsLtoR.length;
					for (j = 0; j < len; j++) {
						charDivs[j] = charDivsLtoR[j];
					}
				}
				if (charDivsRtoL) {
					len = charDivsRtoL.length;
					for (j = 0; j < len; j++) {
						charDivs.unshift(charDivsRtoL[j]);
					}
				}
				//console.debug(charDivs);
				len = charDivs.length;
				for (j = 0; j < len; j++) {
					charDiv = charDivs[j];
					regexResult = charDiv.className.match(/f(?:2|4)(\d+)/i);
					//console.debug(regexResult);
					if (regexResult) {
						index = Number(regexResult[1]);
						innerText += this.hvFontMap[index];
					}
				}
				innerText += " ";	//	Separator between text blocks
			}
			return innerText;
		}
	},
	initialize: function () {
		var location = {
			isBattleItems: document.location.search === "?s=Character&ss=it",
			isInventory: document.location.search === "?s=Character&ss=in",
			isEquipment: document.location.search.indexOf("?s=Character&ss=eq") > -1,
			isItemWorld: document.location.search.indexOf("?s=Battle&ss=iw") > -1,
			isMoogleWrite: document.location.search.indexOf("?s=Bazaar&ss=mm&filter=Write") > -1,
			isEquipmentShop: document.location.search.indexOf("?s=Bazaar&ss=es") > -1,
			isForge: document.location.search.indexOf("?s=Bazaar&ss=fr") > -1,
			isShrine: document.location.search === "?s=Bazaar&ss=ss",
			isMonsterLab: document.location.search.indexOf("?s=Bazaar&ss=ml") > -1,
			get isCharacter() { return !!document.getElementById("pattrform"); },
			get isRiddle() { return !!document.getElementById("riddleform"); },
		};

		var elementCache = {
			get popup() { return document.getElementById("popup_box"); },
		};

		this.util.isUsingHVFontEngine = document.getElementsByClassName('fd2')[0].textContent !== "Health points";
		var settings = {
			isUsingHVFontEngine: this.util.isUsingHVFontEngine,
			get difficulty() {
				var e = document.querySelectorAll('div.clb table.cit div.fd4');
				for (var i = 0; i < e.length; i++) {
					var r = /(Normal|Hard|Nightmare|Hell|Nintendo|Battletoads|IWBTH)/i.exec(hv.util.innerText(e[i]));
					if (r) {
						return r[1].toUpperCase();
					}
				}
				return "";
			},
		};

		var character = {
			get healthRate() {
				return hv.util.getCharacterGaugeRate(document.querySelector('img[alt="health"]'));
			},
			get magicRate() {
				return hv.util.getCharacterGaugeRate(document.querySelector('img[alt="magic"]'));
			},
			get spiritRate() {
				return hv.util.getCharacterGaugeRate(document.querySelector('img[alt="spirit"]'));
			},
			get overchargeRate() {
				return hv.util.getCharacterGaugeRate(document.querySelector('img[alt="overcharge"]'));
			},
			get healthPercent() {
				return hv.util.percent(character.healthRate);
			},
			get magicPercent() {
				return hv.util.percent(character.magicRate);
			},
			get spiritPercent() {
				return hv.util.percent(character.spiritRate);
			},
			get overchargePercent() {
				return hv.util.percent(character.overchargeRate);
			},
		};

		var battleLog = document.getElementById("togpane_log");
		var battle = {
			isActive: !!battleLog,
			elementCache: null,
			get isRoundFinished() {
				if (!this.isActive) {
					return false;
				}
				return !!this.elementCache.dialog;
			},
			get isFinished() {
				if (!this.isActive) {
					return false;
				}
				if (!this.isRoundFinished) {
					return false;
				} else {
					if (!this.elementCache.dialogButton) {
						// Hourly Encounter
						return true;
					} else {
						// The others
						var onclick = this.elementCache.dialogButton.getAttribute("onclick");
						return onclick.indexOf("battle.battle_continue") === -1;
					}
				}
			},
		};
		if (battle.isActive) {
			battle.elementCache = {
				battleLog: battleLog,
				_mainPane: null,
				_quickcastBar: null,
				_monsterPane: null,
				_dialog: null,
				_dialogButton: null,
				_characterEffectIcons: null,
				_monsters: null,
				get mainPane() {
					if (!this._mainPane) {
						this._mainPane = document.getElementById("mainpane");
					}
					return this._mainPane;
				},
				get quickcastBar() {
					if (!this._quickcastBar) {
						this._quickcastBar = document.getElementById("quickbar");
					}
					return this._quickcastBar;
				},
				get monsterPane() {
					if (!this._monsterPane) {
						this._monsterPane = document.getElementById("monsterpane");
					}
					return this._monsterPane;
				},
				get dialog() {
					if (!this._dialog) {
						this._dialog = document.querySelector('div.btcp');
					}
					return this._dialog;
				},
				get dialogButton() {
					if (!this._dialogButton) {
						this._dialogButton = document.getElementById("ckey_continue");
					}
					return this._dialogButton;
				},
				get characterEffectIcons() {
					if (!this._characterEffectIcons) {
						this._characterEffectIcons = this.mainPane.querySelectorAll('div.bte img[onmouseover^="battle.set_infopane_effect"]');
					}
					return this._characterEffectIcons;
				},
				get monsters() {
					if (!this._monsters) {
						this._monsters = this.monsterPane.querySelectorAll('div[id^="mkey_"]');
					}
					return this._monsters;
				},
			};
		}
		this.location = location;
		this.elementCache = elementCache;
		this.settings = settings;
		this.character = character;
		this.battle = battle;
	},
};

//------------------------------------
// HV STAT object
//------------------------------------
var hvStat = {
	version: "5.6.2",
	initialize: function () {
		this.addStyle();
	},
	imageResources: [
		new browser.I("images/", "channeling.png", "css/images/"),
		new browser.I("images/", "healthpot.png", "css/images/"),
		new browser.I("images/", "manapot.png", "css/images/"),
		new browser.I("images/", "spiritpot.png", "css/images/"),
	],
	addStyle: function () {
		browser.extension.style.addFromResource("css/", "hvstat.css", this.imageResources);
	},
	// Aliases
	get settings() {
		return hvStat.storage.settings.value;
	},
	get characterStatus() {
		return hvStat.storage.characterStatus.value;
	},
	get overview() {
		return hvStat.storage.overview.value;
	},
	get stats() {
		return hvStat.storage.stats.value;
	},
	get statsBackups() {
		return [
			null,
			hvStat.storage.statsBackups[1].value,
			hvStat.storage.statsBackups[2].value,
			hvStat.storage.statsBackups[3].value,
			hvStat.storage.statsBackups[4].value,
			hvStat.storage.statsBackups[5].value,
		];
	},
	get dropStats() {
		return hvStat.storage.dropStats.value;
	},
	get shrine() {
		return hvStat.storage.shrine.value;
	},
	get roundContext() {
		return hvStat.storage.roundContext.value;
	},
	get warningState() {
		return hvStat.storage.warningState.value;
	},
	get equipmentTags() {
		return hvStat.storage.equipmentTags.value;
	},
	get oldMonsterDatabase() {
		return hvStat.storage.oldMonsterDatabase.value;
	},
};

//------------------------------------
// Utilities
//------------------------------------
hvStat.util = {
	forEachProperty: function (target, base, callback) {
		var primitives = [ "boolean", "number", "string", "undefined" ];
		for (var key in base) {
			var property = base[key];
			if (property instanceof Function) {
				continue;
			}
			if (property === null) {
				callback(target, base, key);
				continue;
			}
			var treated = false;
			var i = primitives.length;
			while (i--) {
				if (typeof property === primitives[i]) {
					callback(target, base, key);
					treated = true;
					break;
				}
			}
			if (!treated) {
				if (Array.isArray(property)) {
					if (!Array.isArray(target[key])) {
						delete target[key];
						target[key] = [];
					}
					callback(target, base, key);
				} else {
					if (typeof target[key] !== "object") {
						delete target[key];
						target[key] = new property.constructor();
					}
					arguments.callee(target[key], base[key], callback);
				}
			}
		}
	},
	copyEachProperty: function (to, from) {
		this.forEachProperty(to, from, function (to, from, key) {
			if (from[key] instanceof Array) {
				for (var i = 0; i < from[key].length; i++) {
					to[key][i] = from[key][i];
				}
			} else {
				to[key] = from[key];
			}
		});
	},
	addEachPropertyValue: function (to, from, ignoreList) {
		this.forEachProperty(to, from, function (to, from, key) {
			if (Array.isArray(ignoreList) && ignoreList.indexOf(key) >= 0) {
				return;
			}
			if (from[key] instanceof Array) {
				for (var i = 0; i < from[key].length; i++) {
					if (to[key][i] === undefined) {
						to[key][i] = 0;
					}
					to[key][i] += from[key][i];
				}
			} else {
				if (to[key] === undefined) {
					to[key] = 0;
				}
				to[key] += from[key];
			}
		});
	},
	getDateTimeString: function (date) {
		if (browser.isChrome) {
			// See http://code.google.com/p/chromium/issues/detail?id=3607
			return date.toLocaleDateString() + " " + date.toLocaleTimeString();
		} else {
			return date.toDateString() + " " + date.toTimeString();
		}
	},
	getElapseFrom: function (date) {
		if (!date) return "";
		var mins = 0, hours = 0, days = 0;
		var str;
		mins = Math.floor(((new Date()).getTime() - date.getTime()) / (60 * 1000));
		if (mins >= 60) {
			hours = Math.floor(mins / 60);
			mins = mins % 60;
		}
		if (hours >= 24) {
			days = Math.floor(hours / 24);
			hours = hours % 24;
		}
		str = String(mins) + ((mins > 1) ? " mins" : " min");
		if (hours > 0) {
			str = String(hours) + ((hours > 1) ? " hours, " : " hour, ") + str;
		}
		if (days > 0) {
			str = String(days) + ((days > 1) ? " days, " : " day, ") + str;
		}
		return str;
	},
	getRelativeTime: function (b) {
		var a = (arguments.length > 1) ? arguments[1] : new Date();
		var c = parseInt((a.getTime() - b) / 1000, 10);
		if (c < 60) return "less than a minute ago";
		if (c < 120) return "about a minute ago";
		if (c < (60 * 60)) return (parseInt(c / 60, 10)).toString() + " minutes ago";
		if (c < (120 * 60)) return "about an hour ago";
		if (c < (24 * 60 * 60)) return "about " + (parseInt(c / 3600, 10)).toString() + " hours ago";
		if (c < (48 * 60 * 60)) return "1 day ago";
		return (parseInt(c / 86400, 10)).toString() + " days ago";
	},
	capitalizeEquipmentName: function (name) {
		return name.toLowerCase().replace(/(?:^|\s)(?!of )(?!the )\S/g, function (c) { return c.toUpperCase(); });
	},
	percent: function (value, digits) {
		var v = value * 100;
		if (digits) {
			v = v.toFixed(digits);
		}
		return v;
	},
	ratio: function (numerator, denominator) {
		if (denominator === 0) {
			return 0;
		} else {
			return numerator / denominator;
		}
	},
	percentRatio: function (numerator, denominator, digits) {
		return this.percent(this.ratio(numerator, denominator), digits);
	},
	numberWithCommas: function (n) {
		var parts = n.toString().split(".");
		return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (parts[1] ? "." + parts[1] : "");
	},
	elementalSpells: [
		"Fireball", "Inferno", "Flare", "Meteor", "Nova", "Flames of Loki",
		"Icestrike", "Snowstorm", "Freeze", "Blizzard", "Cryostasis", "Fimbulvetr",
		"Lighting", "Thunderstorm", "Ball Lighting", "Chain Lighting", "Shockblast", "Wrath of Thor",
		"Windblast", "Cyclone", "Gale", "Hurricane", "Downburst", "Storms of Njord",
	],
	divineSpells: [
		"Condemn", "Purge", "Smite", "Banish",
	],
	forbiddenSpells: [
		"Corruption", "Pestilence", "Disintegrate", "Ragnarok",
	],
	spiritualSpells: [
		"Soul Reaper", "Soul Harvest", "Soul Fire", "Soul Burst",
	],
	deprecatingSpells: [
		"Poison", "Slow", "Weaken", "Sleep",
		"Confuse", "Imperil", "Blind", "Silence",
		"Nerf", "X-Nerf", "MagNet", "Lifestream",
	],
	supportiveSpells: [
		"Protection", "Haste", "Shadow Veil", "Regen", "Absorb",
		"Spark of Life", "Arcane Focus", "Heartseeker", "Spirit Shield",
		"Frame Spikes", "Frost Spikes", "Lightning Spikes", "Storm Spikes",
	],
	curativeSpells: [
		"Cure", "Cure II", "Cure III", "Regen", "Regen II",
	],
	isElementalSpell: function (spell) {
		return this.elementalSpells.indexOf(spell) >= 0;
	},
	isDivineSpell: function (spell) {
		return this.divineSpells.indexOf(spell) >= 0;
	},
	isForbiddenSpell: function (spell) {
		return this.forbiddenSpells.indexOf(spell) >= 0;
	},
	isSpiritualSpell: function (spell) {
		return this.spiritualSpells.indexOf(spell) >= 0;
	},
	isDeprecatingSpell: function (spell) {
		return this.deprecatingSpells.indexOf(spell) >= 0;
	},
	isSupportiveSpell: function (spell) {
		return this.supportiveSpells.indexOf(spell) >= 0;
	},
	isCurativeSpell: function (spell) {
		return this.curativeSpells.indexOf(spell) >= 0;
	},
	isOffensiveSpell: function (spell) {
		return this.isElementalSpell(spell) ||
			this.isDivineSpell(spell) ||
			this.isForbiddenSpell(spell) ||
			this.isSpiritualSpell(spell) ||
			spell === "Magic Missile";
	},
};

//------------------------------------
// Constants
//------------------------------------
hvStat.constant = {
	factory: function (keywords) {
		var singleton = {};
		var i, keyword, len = keywords.length;
		for (i = 0; i < len; i++) {
			keyword = keywords[i];
			singleton[keyword.id] = keyword;
		}
		return singleton;
	},
};
hvStat.constant.Keyword = function (id, name, abbrNames) {
	this._id = String(id);
	this._name = String(name);
	this._abbrNames = [];
	var i;
	if (!Array.isArray(abbrNames)) {
		this._abbrNames[0] = String(abbrNames);
	} else {
		for (i = 0; i < abbrNames.length; i++) {
			this._abbrNames[i] = String(abbrNames[i]);
		}
	}
};
hvStat.constant.Keyword.prototype = {
	get id() { return this._id; },
	get name() { return this._name; },
	toString: function (abbrLevel) {
		// If abbrLevel is not set or 0 then return name else return abbreviated name
		abbrLevel = Number(abbrLevel);
		if (isNaN(abbrLevel) || abbrLevel < 0) {
			abbrLevel = 0;
		} else if (abbrLevel >= this._abbrNames.length) {
			abbrLevel = this._abbrNames.length;
		}
		return (abbrLevel === 0) ? this._name : this._abbrNames[abbrLevel - 1];
	},
};

hvStat.C = hvStat.constant.Keyword;	// Alias

hvStat.constant.difficulty = hvStat.constant.factory([
	new hvStat.C("NORMAL", "Normal"),
	new hvStat.C("HARD", "Hard"),
	new hvStat.C("NIGHTMARE", "Nightmare"),
	new hvStat.C("HELL", "Hell"),
	new hvStat.C("NINTENDO", "Nintendo"),
	new hvStat.C("BATTLETOADS", "Battletoads"),
	new hvStat.C("IWBTH", "IWBTH"),
]);

hvStat.constant.battleType = hvStat.constant.factory([
	new hvStat.C("HOURLY_ENCOUNTER", "Hourly Encounter"),
	new hvStat.C("ARENA", "Arena"),
	new hvStat.C("GRINDFEST", "GrindFest"),
	new hvStat.C("ITEM_WORLD", "Item World"),
]);

hvStat.constant.dropType = hvStat.constant.factory([
	new hvStat.C("MONSTER_DROP", "Monster Drop"),
	new hvStat.C("ARENA_CLEAR_BONUS", "Arena Clear Bonus"),
	new hvStat.C("ARENA_TOKEN_BONUS", "Arena Token Bonus"),
]);

hvStat.constant.monsterClass = hvStat.constant.factory([
	new hvStat.C("ARTHROPOD", "Arthropod", ["Arth", "Art"]),
	new hvStat.C("AVION", "Avion", ["Avio", "Avi"]),
	new hvStat.C("BEAST", "Beast", ["Beas", "Bea"]),
	new hvStat.C("CELESTIAL", "Celestial", ["Cele", "Cel"]),
	new hvStat.C("DAIMON", "Daimon", ["Daim", "Dai"]),
	new hvStat.C("DRAGONKIN", "Dragonkin", ["Drag", "Dra"]),
	new hvStat.C("ELEMENTAL", "Elemental", ["Elem", "Ele"]),
	new hvStat.C("GIANT", "Giant", ["Gian", "Gia"]),
	new hvStat.C("HUMANOID", "Humanoid", ["Huma", "Hum"]),
	new hvStat.C("MECHANOID", "Mechanoid", ["Mech", "Mec"]),
	new hvStat.C("REPTILIAN", "Reptilian", ["Rept", "Rep"]),
	new hvStat.C("SPRITE", "Sprite", ["Spri", "Spr"]),
	new hvStat.C("UNDEAD", "Undead", ["Unde", "Und"]),
	new hvStat.C("COMMON", "Common", ["Comm", "Com"]),
	new hvStat.C("UNCOMMON", "Uncommon", ["Unco", "Unc"]),
	new hvStat.C("RARE", "Rare", ["Rare", "Rar"]),
	new hvStat.C("LEGENDARY", "Legendary", ["Lege", "Leg"]),
	new hvStat.C("ULTIMATE", "Ultimate", ["Ulti", "Ult"]),
]);

hvStat.constant.skillType = hvStat.constant.factory([
	new hvStat.C("MANA", "Mana", [""]),
	new hvStat.C("SPIRIT", "Spirit", ["Spirit", "S"]),
]);

hvStat.constant.attackType = hvStat.constant.factory([
	new hvStat.C("PHYSICAL", "Physical", ["Phys", "Ph", "P"]),
	new hvStat.C("MAGICAL", "Magical", ["Mag", "Ma", "M"]),
]);

hvStat.constant.damageType = hvStat.constant.factory([
	new hvStat.C("CRUSHING", "Crushing", ["Crush", "Cr"]),
	new hvStat.C("SLASHING", "Slashing", ["Slash", "Sl"]),
	new hvStat.C("PIERCING", "Piercing", ["Pierc", "Pi"]),
	new hvStat.C("FIRE", "Fire", ["Fire", "Fir", "Fi", "F"]),
	new hvStat.C("COLD", "Cold", ["Cold", "Col", "Co", "C"]),
	new hvStat.C("ELEC", "Elec", ["Elec", "Elc", "El", "E"]),
	new hvStat.C("WIND", "Wind", ["Wind", "Win", "Wi", "W"]),
	new hvStat.C("HOLY", "Holy", ["Holy", "Hol", "Ho", "H"]),
	new hvStat.C("DARK", "Dark", ["Dark", "Dar", "Da", "D"]),
	new hvStat.C("SOUL", "Soul", ["Soul", "Sou", "So", "S"]),
	new hvStat.C("VOID", "Void", ["Void", "Voi", "Vo", "V"]),
]);

hvStat.constant.genericDamageType = hvStat.constant.factory([
	new hvStat.C("PHYSICAL", "Physical", ["Phys", "Ph"]),
	new hvStat.C("ELEMENTAL", "Elemental", ["Elem", "El"]),
]);

hvStat.constant.defenseLevel = hvStat.constant.factory([
	new hvStat.C("WEAK", "Weak"),
	new hvStat.C("AVERAGE", "Average"),
	new hvStat.C("RESISTANT", "Resistant"),
	new hvStat.C("IMPERVIOUS", "Impervious"),
]);

hvStat.constant.debuff = hvStat.constant.factory([
	new hvStat.C("IMPERILED", "Imperiled"),
	new hvStat.C("DEEP_BURNS", "Deep Burns"),
	new hvStat.C("TURBULENT_AIR", "Turbulent Air"),
	new hvStat.C("FREEZING_LIMBS", "Freezing Limbs"),
	new hvStat.C("SEARING_SKIN", "Searing Skin"),
	new hvStat.C("BREACHED_DEFENSE", "Breached Defense"),
	new hvStat.C("BLUNTED_ATTACK", "Blunted Attack"),
]);

hvStat.constant.delimiter = new hvStat.C("DELIMITER", ", ", [","]);

//------------------------------------
// Storage objects
//------------------------------------
hvStat.storage = {
	// Static functions
	getItem: function (key) {
		var item = localStorage.getItem(key);
		if (item) {
			return JSON.parse(item);
		} else {
			return null;
		}
	},
	setItem: function (key, value) {
		localStorage.setItem(key, JSON.stringify(value));
	},
	removeItem: function (key) {
		localStorage.removeItem(key);
	},
};

// Initial values
hvStat.storage.initialValue = {
	// Settings object
	settings: {
		// General
		isChangePageTitle: false,
		customPageTitle: "HV",
		isShowEquippedSet: false,
		isShowSidebarProfs: false,
		isStartAlert: false,
		StartAlertHP: 95,
		StartAlertMP: 95,
		StartAlertSP: 95,
		StartAlertDifficulty: 2,
		isShowTags: [false, false, false, false, false, false],	// 0-equipment page, 1-shop, 2-itemworld, 3-moogle, 4-forge, 5-inventory

		// Keyboard
		adjustKeyEventHandling: false,
		isEnableScanHotkey: false,
		isEnableSkillHotkey: false,
		reverseSkillHotkeyTraversalOrder: false,
		enableOFCHotkey: false,
		enableScrollHotkey: false,
		isDisableForgeHotKeys: false,
		enableShrineKeyPatch: false,

		// Tracking
		isTrackStats: true,
		isTrackShrine: false,
		isTrackItems: false,

		// Battle Enhancement
		isShowRoundCounter: false,
		isShowRoundReminder: false,
		reminderMinRounds: 3,
		reminderBeforeEnd: 1,
		isShowSelfDuration: true,
		isSelfEffectsWarnColor: false,
		SelfWarnOrangeRounds: 5,
		SelfWarnRedRounds: 1,
		showSelfEffectStackLevel: false,
		isShowPowerupBox: false,
		isShowHighlight: true,
		isAltHighlight: false,
		isShowDivider: true,
		isShowScanButton: false,
		highlightScanButtonWhenScanResultExpired: false,
		nDaysUntilScanResultExpiration: 30,
		isShowSkillButton: false,
		isShowMonsterNumber: false,
		isShowMonsterDuration: true,
		isMonstersEffectsWarnColor: false,
		MonstersWarnOrangeRounds: 5,
		MonstersWarnRedRounds: 1,
		showMonsterEffectStackLevel: false,
		isShowEndStats: true,
		isShowEndProfs: true,
		isShowEndProfsMagic: true,
		isShowEndProfsArmor: true,
		isShowEndProfsWeapon: true,
		autoAdvanceBattleRound: false,
		autoAdvanceBattleRoundDelay: 500,

		// Warning System
		// - Display Method
		isCondenseAlerts: false,
		delayRoundEndAlerts:false,
		// - Self Status
		isHighlightQC: true,
		warnOrangeLevel: 40,
		warnRedLevel: 35,
		warnAlertLevel: 25,
		warnOrangeLevelMP: 15,
		warnRedLevelMP: 5,
		warnAlertLevelMP: -1,
		warnOrangeLevelSP: -1,
		warnRedLevelSP: -1,
		warnAlertLevelSP: -1,
		isShowPopup: true,
		isNagHP: false,
		isNagMP: false,
		isNagSP: false,
		warnMode: [true, true, false, false],
		// - Event Notifications
		isAlertGem: true,
		isAlertOverchargeFull: false,
		isWarnAbsorbTrigger: false,
		isWarnSparkTrigger: true,
		isWarnSparkExpire: true,
		alertWhenChannelingIsGained: false,
		// - Effects Expiring Warnings
		isMainEffectsAlertSelf: false,
		isEffectsAlertSelf: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
		EffectsAlertSelfRounds: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		isMainEffectsAlertMonsters: false,
		isEffectsAlertMonsters: [false, false, false, false, false, false, false, false, false, false, false, false],
		EffectsAlertMonstersRounds: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],

		// Monster Information
		// - Monster Database
		isRememberScan: false,
		isRememberSkillsTypes: false,
		// - Monster Display
		showMonsterHP: true,
		showMonsterHPPercent: false,
		showMonsterMP: true,
		showMonsterSP: true,
		showMonsterInfoFromDB: false,
		showMonsterClassFromDB: false,
		showMonsterPowerLevelFromDB: false,
		showMonsterAttackTypeFromDB: false,
		showMonsterWeaknessesFromDB: false,
		showMonsterResistancesFromDB: false,
		hideSpecificDamageType: [false, false, false, false, false, false, false, false, false, false, false],
		ResizeMonsterInfo: false,
		isShowStatsPopup: false,
		monsterPopupDelay: 0,
		isMonsterPopupPlacement: false,
	},
	// Character Status object
	characterStatus: {
		difficulty: {
			id: "",
			name: "",
			index: 0,
		},
		equippedSet: 0,
		areProficienciesCaptured: false,
		proficiencies: {
			oneHanded: 0,
			twoHanded: 0,
			dualWielding: 0,
			staff: 0,
			clothArmor: 0,
			lightArmor: 0,
			heavyArmor: 0,
			elemental: 0,
			divine: 0,
			forbidden: 0,
			deprecating: 0,
			supportive: 0,
		},
		overcharge: 100,
		didReachInventoryLimit: false,
	},
	// Overview object
	overview: {
		startTime: 0,
		lastHourlyTime: 0,
		exp: 0,
		credits: 0,
		lastEquipTime: 0,
		lastEquipName: "",
		equips: 0,
		lastArtTime: 0,
		lastArtName: "",
		artifacts: 0,
		roundArray: [0, 0, 0, 0],
		expbyBT: [0, 0, 0, 0],
		creditsbyBT: [0, 0, 0, 0],
	},
	// Statistics object
	stats: {
		rounds: 0,
		kills: 0,
		aAttempts: 0,
		aHits: [0, 0],
		aOffhands: [0, 0, 0, 0],
		sAttempts: 0,
		aDomino: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		aCounters: [0, 0, 0, 0],
		dDealt: [0, 0, 0],
		sHits: [0, 0],
		sResists: 0,
		dDealtSp: [0, 0],
		absArry: [0, 0, 0],
		mAttempts: 0,
		dTaken: [0, 0],
		mHits: [0, 0],
		pDodges: 0,
		pEvades: 0,
		pParries: 0,
		pBlocks: 0,
		pResists: 0,
		mSpells: 0,
		overStrikes: 0,
		coalesce: 0,
		eTheft: 0,
		channel: 0,
		cureTotals: [0, 0, 0],
		cureCounts: [0, 0, 0],
		elemEffects: [0, 0, 0],
		effectPoison: [0, 0],
		elemSpells: [0, 0, 0, 0],
		divineSpells: [0, 0, 0, 0],
		forbidSpells: [0, 0, 0, 0],
		spiritualSpells: [0, 0, 0, 0],
		depSpells: [0, 0],
		supportSpells: 0,
		curativeSpells: 0,
		elemGain: 0,
		divineGain: 0,
		forbidGain: 0,
		depGain: 0,
		supportGain: 0,
		weapProfGain: [0, 0, 0, 0],
		armorProfGain: [0, 0, 0],
		weaponprocs: [0, 0, 0, 0, 0, 0, 0, 0],
		pskills: [0, 0, 0, 0, 0, 0, 0],
		datestart: 0,
	},
	// Drop Statistics object
	dropStats: {
		// Array of { key:Object { type:String, difficulty:String, battleType:String }, count:Number }
		nChances: [],
		creditCount: [],
		itemCount: [],
		crystalCount: [],
		monsterFoodCount: [],
		tokenCount: [],
		artifactCount: [],
		equipmentCount: [],
	},
	// Shrine object
	shrine: {
		artifactsTraded: 0,
		artifactStat: 0,		// Primary Attributes
		artifactHath: 0,		// Hath
		artifactHathTotal: 0,
		artifactCrystal: 0,		// Crystals
		artifactItem: 0,		// Energy Drinks
		artifactElixer: 0,		// Elixers
		trophyArray: [],
	},
	// Statistics Backup object
	statsBackup: {
		rounds: 0,
		kills: 0,
		aAttempts: 0,
		aHits: [0, 0],
		aOffhands: [0, 0, 0, 0],
		sAttempts: 0,
		aDomino: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		aCounters: [0, 0, 0, 0],
		dDealt: [0, 0, 0],
		sHits: [0, 0],
		sResists: 0,
		dDealtSp: [0, 0],
		absArry: [0, 0, 0],
		mAttempts: 0,
		dTaken: [0, 0],
		mHits: [0, 0],
		pDodges: 0,
		pEvades: 0,
		pParries: 0,
		pBlocks: 0,
		pResists: 0,
		mSpells: 0,
		overStrikes: 0,
		coalesce: 0,
		eTheft: 0,
		channel: 0,
		cureTotals: [0, 0, 0],
		cureCounts: [0, 0, 0],
		elemEffects: [0, 0, 0],
		effectPoison: [0, 0],
		elemSpells: [0, 0, 0, 0],
		divineSpells: [0, 0, 0, 0],
		forbidSpells: [0, 0, 0, 0],
		spiritualSpells: [0, 0, 0, 0],
		depSpells: [0, 0],
		supportSpells: 0,
		curativeSpells: 0,
		elemGain: 0,
		divineGain: 0,
		forbidGain: 0,
		depGain: 0,
		supportGain: 0,
		weapProfGain: [0, 0, 0, 0],
		armorProfGain: [0, 0, 0],
		weaponprocs: [0, 0, 0, 0, 0, 0, 0, 0],
		pskills: [0, 0, 0, 0, 0, 0, 0],
		datestart: 0,
		datesave: 0,
	},
	// Round Context object
	roundContext: {
		monsters: [],
		currRound: 0,
		maxRound: 0,
		arenaNum: 0,
		dropChances: 0,
		battleType: 0,
		battleTypeName: "",
		lastTurn: -1,
		kills: 0,	// stats
		aAttempts: 0,	// stats
		aHits: [0, 0],	// stats
		aOffhands: [0, 0, 0, 0],	// stats
		aDomino: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],	// stats
		aCounters: [0, 0, 0, 0],	// stats
		dDealt: [0, 0, 0],	// stats
		sHits: [0, 0],	// stats
		sResists: 0,	// stats
		dDealtSp: [0, 0],	// stats
		sAttempts: 0,	// stats
		absArry: [0, 0, 0],	// stats
		mAttempts: 0,	// stats
		mHits: [0, 0],	// stats
		mSpells: 0,	// stats
		pDodges: 0,	// stats
		pEvades: 0,	// stats
		pParries: 0,	// stats
		pBlocks: 0,	// stats
		pResists: 0,	// stats
		dTaken: [0, 0],	// stats
		coalesce: 0,	// stats
		eTheft: 0,	// stats
		channel: 0,	// stats
		overStrikes: 0,	// stats
		cureTotals: [0, 0, 0],	// stats
		cureCounts: [0, 0, 0],	// stats
		elemEffects: [0, 0, 0],	// stats
		effectPoison: [0, 0],	// stats
		elemSpells: [0, 0, 0, 0],	// stats
		divineSpells: [0, 0, 0, 0],	// stats
		forbidSpells: [0, 0, 0, 0],	// stats
		spiritualSpells: [0, 0, 0, 0],	// stats
		depSpells: [0, 0],	// stats
		supportSpells: 0,	// stats
		curativeSpells: 0,	// stats
		elemGain: 0,	// stats
		divineGain: 0,	// stats
		forbidGain: 0,	// stats
		depGain: 0,	// stats
		supportGain: 0,	// stats
		weapProfGain: [0, 0, 0, 0],	// stats
		armorProfGain: [0, 0, 0],	// stats
		weaponprocs: [0, 0, 0, 0, 0, 0, 0, 0],	// stats
		pskills: [0, 0, 0, 0, 0, 0, 0],	// stats
		exp: 0,
		credits: 0,
		equips: 0,
		lastEquipName: "",
		artifacts: 0,
		lastArtName: "",
	},
	// Warning State object
	warningState: {
		healthAlertShown: false,
		magicAlertShown: false,
		spiritAlertShown: false,
		overchargeAlertShown: false,
		queuedAlerts: [],
	},
	// Equipment Tags object
	equipmentTags: {
		OneHandedIDs: [],
		OneHandedTAGs: [],
		TwoHandedIDs: [],
		TwoHandedTAGs: [],
		StaffsIDs: [],
		StaffsTAGs: [],
		ShieldIDs: [],
		ShieldTAGs: [],
		ClothIDs: [],
		ClothTAGs: [],
		LightIDs: [],
		LightTAGs: [],
		HeavyIDs: [],
		HeavyTAGs: [],
	},
	// Old Monster Database object
	oldMonsterDatabase: {
		mclass: [],
		mpl: [],
		mattack: [],
		mweak: [],
		mresist: [],
		mimperv: [],
		mskilltype: [],
		mskillspell: [],
		datescan: [],
	},
};

// Generic Item constructor
hvStat.storage.Item = function (key, defaultValue) {
	this._key = key;
	this._defaultValue = defaultValue;
	this._value = null;
};
hvStat.storage.Item.prototype = {
	get value() {
		return this.getValue();
	},
	getValue: function () {
		if (!this._value) {
			this._value = hvStat.storage.getItem(this._key);
			if (!this._value) {
				this._value = util.clone(this._defaultValue);
			} else {
				// Copy newly added properties from default
				hvStat.util.forEachProperty(this._value, this._defaultValue, function (storedValue, defaultValue, key) {
					if (storedValue[key] === undefined) {
						storedValue[key] = util.clone(defaultValue[key]);
					} else if (Array.isArray(storedValue[key])) {
						// Compensate for the lack of elements
						for (var i = 0; i < defaultValue[key].length; i++) {
							if (storedValue[key][i] === undefined) {
								storedValue[key][i] = defaultValue[key][i];
							}
						}
					}
				});
			}
		}
		return this._value;
	},
	save: function () {
		hvStat.storage.setItem(this._key, this.value);
	},
	reset: function () {
		this._value = util.clone(this._defaultValue);
		this.save();
	},
	remove: function () {
		hvStat.storage.removeItem(this._key);
	},
};

// Settings object
hvStat.storage.settings = new hvStat.storage.Item("HVSettings", hvStat.storage.initialValue.settings);

// Character Status object
hvStat.storage.characterStatus = new hvStat.storage.Item("hvStat.characterStatus", hvStat.storage.initialValue.characterStatus);

// Overview constructor inherits Item
hvStat.storage.Overview = function (key, defaultValue) {
	hvStat.storage.Item.apply(this, [key, defaultValue]);
};
hvStat.storage.Overview.prototype = Object.create(hvStat.storage.Item.prototype);
hvStat.storage.Overview.prototype.constructor = hvStat.storage.Overview;
hvStat.storage.Overview.prototype.getValue = function () {
	var obj = hvStat.storage.Item.prototype.getValue.apply(this);
	if (!Object.getOwnPropertyDescriptor(obj, "totalRounds")) {
		Object.defineProperty(obj, "totalRounds", {
			get: function () {
				return this.roundArray[0] + this.roundArray[1] + this.roundArray[2] + this.roundArray[3];
			},
			enumerable: false,
			configurable: false
		});
	}
	return obj;
};

// Overview object
hvStat.storage.overview = new hvStat.storage.Overview("HVOverview", hvStat.storage.initialValue.overview);

// Statistics object
hvStat.storage.stats = new hvStat.storage.Item("HVStats", hvStat.storage.initialValue.stats);

// Statistics Backup objects
hvStat.storage.statsBackups = [
	null,
	new hvStat.storage.Item("HVBackup1", hvStat.storage.initialValue.statsBackup),
	new hvStat.storage.Item("HVBackup2", hvStat.storage.initialValue.statsBackup),
	new hvStat.storage.Item("HVBackup3", hvStat.storage.initialValue.statsBackup),
	new hvStat.storage.Item("HVBackup4", hvStat.storage.initialValue.statsBackup),
	new hvStat.storage.Item("HVBackup5", hvStat.storage.initialValue.statsBackup),
];

// DropStats constructor inherits Item
hvStat.storage.DropStats = function (key, defaultValue) {
	hvStat.storage.Item.apply(this, [key, defaultValue]);
};
hvStat.storage.DropStats.prototype = Object.create(hvStat.storage.Item.prototype);
hvStat.storage.DropStats.prototype.constructor = hvStat.storage.DropStats;
hvStat.storage.DropStats.prototype.addCount = function (value, targetArray, dropType, difficulty, battleType) {
	var elem, found = false;
	for (var i = 0; i < targetArray.length; i++) {
		elem = targetArray[i];
		if (elem.key.dropType === dropType &&
				elem.key.difficulty === difficulty &&
				elem.key.battleType === battleType) {
			found = true;
			break;
		}
	}
	if (found) {
		elem.count += value;
	} else {
		targetArray[i] = {
			key: {
				dropType: dropType,
				difficulty: difficulty,
				battleType: battleType,
			},
			count: value,
		};
	}
};
hvStat.storage.DropStats.prototype.getCount = function (targetArray, dropType, difficulty, battleType) {
	var count = 0;
	for (var i = 0; i < targetArray.length; i++) {
		elem = targetArray[i];
		if ((dropType === null || elem.key.dropType === dropType) &&
				(difficulty === null || elem.key.difficulty === difficulty) &&
				(battleType === null || elem.key.battleType === battleType)) {
			count += elem.count;
		}
	}
	return count;
};
hvStat.storage.DropStats.prototype.increaseChance = function (value, dropType, difficulty, battleType) {
	this.addCount(value, this.value.nChances, dropType, difficulty, battleType);
};
hvStat.storage.DropStats.prototype.nChances = function (dropType, difficulty, battleType) {
	return this.getCount(this.value.nChances, dropType, difficulty, battleType);
};
hvStat.storage.DropStats.prototype.addCredit = function (name, dropType, difficulty, battleType) {
	this.addCount(1, this.value.creditCount, dropType, difficulty, battleType);
};
hvStat.storage.DropStats.prototype.creditCount = function (dropType, difficulty, battleType) {
	return this.getCount(this.value.creditCount, dropType, difficulty, battleType);
};
hvStat.storage.DropStats.prototype.addItem = function (name, dropType, difficulty, battleType) {
	this.addCount(1, this.value.itemCount, dropType, difficulty, battleType);
};
hvStat.storage.DropStats.prototype.itemCount = function (dropType, difficulty, battleType) {
	return this.getCount(this.value.itemCount, dropType, difficulty, battleType);
};
hvStat.storage.DropStats.prototype.addCrystal = function (name, dropType, difficulty, battleType) {
	this.addCount(1, this.value.crystalCount, dropType, difficulty, battleType);
};
hvStat.storage.DropStats.prototype.crystalCount = function (dropType, difficulty, battleType) {
	return this.getCount(this.value.crystalCount, dropType, difficulty, battleType);
};
hvStat.storage.DropStats.prototype.addMonsterFood = function (name, dropType, difficulty, battleType) {
	this.addCount(1, this.value.monsterFoodCount, dropType, difficulty, battleType);
};
hvStat.storage.DropStats.prototype.monsterFoodCount = function (dropType, difficulty, battleType) {
	return this.getCount(this.value.monsterFoodCount, dropType, difficulty, battleType);
};
hvStat.storage.DropStats.prototype.addToken = function (name, dropType, difficulty, battleType) {
	this.addCount(1, this.value.tokenCount, dropType, difficulty, battleType);
};
hvStat.storage.DropStats.prototype.tokenCount = function (dropType, difficulty, battleType) {
	return this.getCount(this.value.tokenCount, dropType, difficulty, battleType);
};
hvStat.storage.DropStats.prototype.addArtifact = function (name, dropType, difficulty, battleType) {
	this.addCount(1, this.value.artifactCount, dropType, difficulty, battleType);
};
hvStat.storage.DropStats.prototype.artifactCount = function (dropType, difficulty, battleType) {
	return this.getCount(this.value.artifactCount, dropType, difficulty, battleType);
};
hvStat.storage.DropStats.prototype.addEquipment = function (name, dropType, difficulty, battleType, arenaNumber, roundNumber) {
	this.addCount(1, this.value.equipmentCount, dropType, difficulty, battleType);
};
hvStat.storage.DropStats.prototype.equipmentCount = function (dropType, difficulty, battleType) {
	return this.getCount(this.value.equipmentCount, dropType, difficulty, battleType);
};
hvStat.storage.DropStats.prototype.totalCount = function (dropType, difficulty, battleType) {
	return this.creditCount(dropType, difficulty, battleType) +
		this.itemCount(dropType, difficulty, battleType) +
		this.crystalCount(dropType, difficulty, battleType) +
		this.monsterFoodCount(dropType, difficulty, battleType) +
		this.tokenCount(dropType, difficulty, battleType) +
		this.artifactCount(dropType, difficulty, battleType) +
		this.equipmentCount(dropType, difficulty, battleType);
};

// Drop Statistics object
hvStat.storage.dropStats = new hvStat.storage.DropStats("hvStat.dropStats", hvStat.storage.initialValue.dropStats);

// Shrine constructor inherits Item
hvStat.storage.Shrine = function (key, defaultValue) {
	hvStat.storage.Item.apply(this, [key, defaultValue]);
};
hvStat.storage.Shrine.prototype = Object.create(hvStat.storage.Item.prototype);
hvStat.storage.Shrine.prototype.constructor = hvStat.storage.Shrine;
hvStat.storage.Shrine.prototype.getValue = function () {
	var obj = hvStat.storage.Item.prototype.getValue.apply(this);
	if (!Object.getOwnPropertyDescriptor(obj, "totalRewards")) {
		Object.defineProperty(obj, "totalRewards", {
			get: function () {
				return this.trophyArray.length + this.artifactsTraded;
			},
			enumerable: false,
			configurable: false
		});
	}
	return obj;
};

// Shrine object
hvStat.storage.shrine = new hvStat.storage.Shrine("HVShrine", hvStat.storage.initialValue.shrine);

// Round Context inherits Item
hvStat.storage.RoundContext = function (key, defaultValue) {
	hvStat.storage.Item.apply(this, [key, defaultValue]);
};
hvStat.storage.RoundContext.prototype = Object.create(hvStat.storage.Item.prototype);
hvStat.storage.RoundContext.prototype.constructor = hvStat.storage.RoundContext;
hvStat.storage.RoundContext.prototype.save = function () {
	this.value.monsters = [];
	for (var i = 0; i < hvStat.battle.monster.monsters.length; i++) {
		this.value.monsters[i] = hvStat.battle.monster.monsters[i].valueObject;
	}
	hvStat.storage.Item.prototype.save.apply(this);
};

// Round Context object
hvStat.storage.roundContext = new hvStat.storage.RoundContext("hvStat.roundContext", hvStat.storage.initialValue.roundContext);

// Warning State object
hvStat.storage.warningState = new hvStat.storage.Item("hvStat.warningState", hvStat.storage.initialValue.warningState);

// Equipment Tags object
hvStat.storage.equipmentTags = new hvStat.storage.Item("HVTags", hvStat.storage.initialValue.equipmentTags);

// Old Monster Database object
hvStat.storage.oldMonsterDatabase = new hvStat.storage.Item("HVDatabase", hvStat.storage.initialValue.oldMonsterDatabase);

//------------------------------------
// Version Checking Functions
//------------------------------------
hvStat.versions = {
	checkVersion: function () {
		var storedVersion = hvStat.storage.getItem("hvStat.version");
		if (storedVersion === null) {
			//Oldest version since migration started
			storedVersion = "5.5.5.1";
		}
		if (storedVersion === hvStat.version) {
			return;
		}
		var functions=[];
		for (var name in hvStat.versions.functions) {
			if (name.indexOf("from_") === 0) {
				var funcVer = hvStat.versions.versionStringToArray(name.substring(5));
				if (hvStat.versions.versionCompare(storedVersion, funcVer) <= 0) {
					functions.push({ver: funcVer, func: hvStat.versions.functions[name]});
				}
			}
		}
		functions.sort(hvStat.versions.versionCompare);
		for (var i = 0; i < functions.length; ++i) {
			functions[i].func();
		}
		hvStat.storage.setItem("hvStat.version", hvStat.version);
	},
	versionStringToArray: function (ver) {
		return ver.split(/[._]/).map(function (str){return Number(str);});
	},
	versionCompare: function (v1, v2) {
		if (typeof(v1) === "string") {
			v1 = hvStat.versions.versionStringToArray(v1);
		}
		if (typeof(v2) === "string") {
			v2 = hvStat.versions.versionStringToArray(v2);
		}
		for (var i = 0; i < v2.length; ++i) {
			if (v1.length <= i) {
				//v1 is shorter than v2, and they have a matching initial sequence
				return -1;
			}
			if (v1[i] < v2[i]) {
				return -1;
			}
			if (v1[i] > v2[i]) {
				return 1;
			}
		}
		if (v1.length === v2.length) {
			return 0;
		}
		return 1;
	},
};

hvStat.versions.functions = {
	from_5_5_5_1 : function () {
		while (hvStat.overview.expbyBT.length < 4)
			hvStat.overview.expbyBT.push(0);
		while (hvStat.overview.creditsbyBT.length < 4)
			hvStat.overview.creditsbyBT.push(0);
		hvStat.storage.overview.save();

		delete hvStat.characterStatus.proficiencies.spiritual;
		hvStat.storage.characterStatus.save();

		delete hvStat.settings.isTrackRewards;
		hvStat.storage.settings.save();

		delete hvStat.shrine.artifactAP;
		hvStat.storage.shrine.save();

		// Remove obsolete items on local storage
		var keys = [
			"HVCharacterSettingsandStats",
			"HVCollectData",
			"HVDrops",
			"HVLoadTimeCounters",
			"HVProf",
			"HVRewards",
			"HVRound",
			"inventoryAlert",
		];
		var i = keys.length;
		while (i--) {
			localStorage.removeItem(keys[i]);
		}
	},
};

//------------------------------------
// Gadgets
//------------------------------------
hvStat.gadget = {
	imageResources: [
		new browser.I("images/", "ui-bg_flat_0_aaaaaa_40x100.png", "css/images/"),
		new browser.I("images/", "ui-bg_flat_55_fbf9ee_40x100.png", "css/images/"),
		new browser.I("images/", "ui-bg_flat_65_edebdf_40x100.png", "css/images/"),
		new browser.I("images/", "ui-bg_flat_75_e3e0d1_40x100.png", "css/images/"),
		new browser.I("images/", "ui-bg_flat_75_edebdf_40x100.png", "css/images/"),
		new browser.I("images/", "ui-bg_flat_95_fef1ec_40x100.png", "css/images/"),
		new browser.I("images/", "ui-icons_2e83ff_256x240.png", "css/images/"),
		new browser.I("images/", "ui-icons_5c0d11_256x240.png", "css/images/"),
		new browser.I("images/", "ui-icons_cd0a0a_256x240.png", "css/images/"),
	],
	addStyle: function () {
		browser.extension.style.addFromResource("css/", "jquery-ui-1.9.2.custom.min.css", this.imageResources);
	},
};

hvStat.gadget.wrenchIcon = {
	create: function () {
		var stuffBox = document.querySelector('div.stuffbox');
		var icon = document.createElement("div");
		icon.id = "hvstat-icon";
		icon.className = "ui-state-default ui-corner-all";
		icon.innerHTML = '<span class="ui-icon ui-icon-wrench" title="Launch HV STAT UI"/>';
		icon.addEventListener("click", this.onclick);
		icon.addEventListener("mouseover", this.onmouseover);
		icon.addEventListener("mouseout", this.onmouseout);
		stuffBox.insertBefore(icon, null);
	},
	onclick: function (event) {
		this.removeEventListener(event.type, arguments.callee);
		browser.extension.loadScript("scripts/", "hvstat-ui.js");
		hvStat.ui.createDialog();
	},
	onmouseover: function (event) {
		this.className = this.className.replace(" ui-state-hover", "");
		this.className += " ui-state-hover";
	},
	onmouseout: function (event) {
		this.className = this.className.replace(" ui-state-hover", "");
	},
};

hvStat.gadget.equippedSet = {
	create: function () {
		var leftBar = document.querySelector('div.clb');
		var cssText = leftBar.querySelector('table.cit td > div > div').style.cssText;
		var table = document.createElement("table");
		table.className = "cit";
		table.innerHTML = '<tbody><tr><td><div class="fd4"><div id="hvstat-equipped-set"></div></div></td></tr></tbody>';
		leftBar.insertBefore(table, null);
		var equippedSet = document.getElementById("hvstat-equipped-set");
		equippedSet.style.cssText = cssText;
		equippedSet.textContent = "Equipped set: " + hvStat.characterStatus.equippedSet;
	},
};

hvStat.gadget.proficiencyPopupIcon = {
	popup: null,
	create: function () {
		if (!hvStat.characterStatus.areProficienciesCaptured) {
			return;
		}
		this.popup = document.createElement("div");
		this.popup.id = "hvstat-proficiency-popup";
		this.popup.innerHTML = browser.extension.getResourceText("html/", "proficiency-table.html");
		var tableData = this.popup.querySelectorAll('td');
		var prof = hvStat.characterStatus.proficiencies;
		tableData[ 0].textContent = prof.oneHanded.toFixed(2);
		tableData[ 2].textContent = prof.twoHanded.toFixed(2);
		tableData[ 4].textContent = prof.dualWielding.toFixed(2);
		tableData[ 6].textContent = prof.staff.toFixed(2);
		tableData[ 8].textContent = prof.clothArmor.toFixed(2);
		tableData[10].textContent = prof.lightArmor.toFixed(2);
		tableData[12].textContent = prof.heavyArmor.toFixed(2);
		tableData[ 1].textContent = prof.elemental.toFixed(2);
		tableData[ 3].textContent = prof.divine.toFixed(2);
		tableData[ 5].textContent = prof.forbidden.toFixed(2);
		tableData[ 7].textContent = prof.deprecating.toFixed(2);
		tableData[ 9].textContent = prof.supportive.toFixed(2);
		var icon = document.createElement("div");
		icon.id = "hvstat-proficiency-popup-icon";
		icon.className = "ui-corner-all";
		icon.textContent = "Proficiency";
		icon.appendChild(this.popup);
		icon.addEventListener("mouseover", this.mouseover);
		icon.addEventListener("mouseout", this.mouseout);
		var leftBar = document.querySelector('div.clb');
		leftBar.parentNode.insertBefore(icon, leftBar.nextSibling);
	},
	mouseover: function (event) {
		hvStat.gadget.proficiencyPopupIcon.popup.style.visibility = "visible";
	},
	mouseout: function (event) {
		hvStat.gadget.proficiencyPopupIcon.popup.style.visibility = "hidden";
	},
};

hvStat.gadget.inventoryWarningIcon = {
	create: function () {
		var stuffBox = document.querySelector('div.stuffbox');
		var icon = document.createElement("div");
		icon.id = "hvstat-inventory-warning-icon";
		icon.className = "ui-state-error ui-corner-all";
		icon.innerHTML = '<span class="ui-icon ui-icon-alert" title="Reached equipment inventory limit."/>';
		icon.addEventListener("click", function (event) {
			if (confirm("Reached equipment inventory limit.\nClear warning?")) {
				this.removeEventListener(event.type, arguments.callee);
				hvStat.characterStatus.didReachInventoryLimit = false;
				hvStat.storage.characterStatus.save();
				this.parentNode.removeChild(this);
			}
		});
		stuffBox.insertBefore(icon, null);
	},
}

//------------------------------------
// Keyboard Management
//------------------------------------
hvStat.keyboard = {
	scrollable: {
		targets: [
			"stats_pane",				// Character
			"equip_pane",				// Equipment
			"inv_item", "inv_equip",	// Inventory
			"item_pane", "shop_pane",	// Battle Inventory, Shop, Forge, Item World
			"slot_pane",				// Monster Lab
			"item", "equip",			// Moogle write
			"arena_pane",				// Arena
		],
		currentTarget: null,
		mouseover: function (event) {
			hvStat.keyboard.scrollable.currentTarget = this;
		},
		mouseout: function (event) {
			hvStat.keyboard.scrollable.currentTarget = null;
		},
		initialize: function () {
			var i = this.targets.length,
				element;
			while (i--) {
				element = document.getElementById(this.targets[i]);
				if (element) {
					element.addEventListener("mouseover", this.mouseover);
					element.addEventListener("mouseout", this.mouseout);
				}
			}
		},
	},
	selectedSkillIndex: -1,	// -1: not selected, 0-2: selected
	documentKeydown: function (event) {
		var scrollTarget;
		if (hvStat.settings.enableScrollHotkey &&
				hvStat.keyboard.scrollable.currentTarget &&
				!event.altKey && !event.ctrlKey && !event.shiftKey) {
			scrollTarget = hvStat.keyboard.scrollable.currentTarget;
			switch (event.keyCode) {
			case 33:	// PAGE UP
				scrollTarget.scrollTop -= scrollTarget.clientHeight - 20;
				event.preventDefault();
				break;
			case 34:	// PAGE DOWN
				scrollTarget.scrollTop += scrollTarget.clientHeight - 20;
				event.preventDefault();
				break;
			}
		}
		var boundKeys, i, j;
		if (hv.battle.isActive) {
			var attackCommand = hvStat.battle.command.commandMap["Attack"];	// Used to close Skillbook menu
			var miScan = hvStat.battle.command.menuItemMap["Scan"];
			var miSkill1 = hvStat.battle.command.menuItemMap["Skill1"];
			var miSkill2 = hvStat.battle.command.menuItemMap["Skill2"];
			var miSkill3 = hvStat.battle.command.menuItemMap["Skill3"];
			var miOFC = hvStat.battle.command.menuItemMap["OFC"];
			var miSkills = [miSkill1, miSkill2, miSkill3];
			if (hvStat.settings.isEnableScanHotkey && miScan) {
				boundKeys = miScan.boundKeys;
				for (i = 0; i < boundKeys.length; i++) {
					if (boundKeys[i].matches(event)) {
						if (hvStat.battle.command.commandMap["Skillbook"].menuOpened) {
							// Close Skillbook menu
							attackCommand.select();
							attackCommand.select();
						} else {
							miScan.select();
						}
					}
				}
			}
			if (hvStat.settings.isEnableSkillHotkey && miSkill1) {
				var availableSkillMinIndex = -1;
				var availableSkillMaxIndex = -1;
				for (i = 0; i < miSkills.length; i++) {
					if (miSkills[i] && miSkills[i].available) {
						if (availableSkillMinIndex === -1) {
							availableSkillMinIndex = i;
						}
						availableSkillMaxIndex = i;
					}
				}
				var startIndex = hvStat.keyboard.selectedSkillIndex;
				var increment;
				if (!hvStat.settings.reverseSkillHotkeyTraversalOrder) {
					increment = 1;
				} else {
					if (startIndex === -1) {
						startIndex = 3;
					}
					increment = -1;
				}
				var traversalFinished = !hvStat.settings.reverseSkillHotkeyTraversalOrder && startIndex >= availableSkillMaxIndex ||
						hvStat.settings.reverseSkillHotkeyTraversalOrder && startIndex <= availableSkillMinIndex;
				boundKeys = miSkill1.boundKeys;
				for (i = 0; i < boundKeys.length; i++) {
					if (boundKeys[i].matches(event)) {
						if (traversalFinished) {
							// Close Skillbook menu
							attackCommand.select();
							attackCommand.select();
							hvStat.keyboard.selectedSkillIndex = -1;
						} else {
							for (j = startIndex + increment;
									hvStat.settings.reverseSkillHotkeyTraversalOrder && 0 <= j ||
									!hvStat.settings.reverseSkillHotkeyTraversalOrder && j <= availableSkillMaxIndex;
									j += increment) {
								if (miSkills[j] && miSkills[j].available) {
									miSkills[j].select();
									hvStat.keyboard.selectedSkillIndex = j;
									break;
								}
							}
						}
					}
				}
			}
			if (hvStat.settings.enableOFCHotkey && miOFC) {
				boundKeys = miOFC.boundKeys;
				for (i = 0; i < boundKeys.length; i++) {
					if (boundKeys[i].matches(event)) {
						if (hvStat.battle.command.commandMap["Skillbook"].menuOpened) {
							// Close Skillbook menu
							attackCommand.select();
							attackCommand.select();
						} else {
							miOFC.select();
						}
					}
				}
			}
		}
	},
};

hvStat.keyboard.KeyCombination = function (spec) {
	this.altKey = spec && spec.altKey || false;
	this.ctrlKey = spec && spec.ctrlKey || false;
	this.shiftKey = spec && spec.shiftKey || false;
	this.keyCode = spec && spec.keyCode || 0;
};
hvStat.keyboard.KeyCombination.prototype = {
	matches: function (obj) {
		if (!obj) {
			return false;
		}
		return this.altKey === obj.altKey &&
			this.ctrlKey === obj.ctrlKey &&
			this.shiftKey === obj.shiftKey &&
			this.keyCode === obj.keyCode;
	},
	toString: function () {
		var s = "";
		if (this.altKey) {
			s += "Alt+";
		}
		if (this.ctrlKey) {
			s += "Ctrl+";
		}
		if (this.shiftKey) {
			s += "Shift+";
		}
		s += String(this.keyCode);
		return s;
	},
};

//------------------------------------
// Value Object
//------------------------------------
hvStat.vo = {};

hvStat.vo.DefenseLevelVO = function () {
	var v = "AVERAGE";
	this.CRUSHING = v;
	this.SLASHING = v;
	this.PIERCING = v;
	this.FIRE = v;
	this.ELEC = v;
	this.COLD = v;
	this.WIND = v;
	this.HOLY = v;
	this.DARK = v;
	this.SOUL = v;
	this.VOID = v;
};

hvStat.vo.MonsterScanResultsVO = function (spec) {
	this.id = null;
	this.lastScanDate = null;
	this.name = null;
	this.monsterClass = null;
	this.powerLevel = null;
	this.trainer = null;
	this.meleeAttack = null;
	this.defenseLevel = new hvStat.vo.DefenseLevelVO();
	this.debuffsAffected = [];

	var dl;
	var debuffs, i, debuff;

	if (spec) {
		if (Number(spec.id)) {
			this.id = Number(spec.id);
		}
		if (spec.lastScanDate) {
			this.lastScanDate = spec.lastScanDate;
		}
		if (spec.name) {
			this.name = spec.name;
		}
		if (spec.monsterClass) {
			this.monsterClass = spec.monsterClass.toUpperCase();
		}
		if (Number(spec.powerLevel)) {
			this.powerLevel = Number(spec.powerLevel);
		}
		if (spec.trainer) {
			this.trainer = spec.trainer;
		}
		if (spec.meleeAttack) {
			this.meleeAttack = spec.meleeAttack.toUpperCase();
		}
		dl = hvStat.constant.defenseLevel[spec.defCrushing.toUpperCase()];
		if (dl) {
			this.defenseLevel.CRUSHING = dl.id;
		}
		dl = hvStat.constant.defenseLevel[spec.defSlashing.toUpperCase()];
		if (dl) {
			this.defenseLevel.SLASHING = dl.id;
		}
		dl = hvStat.constant.defenseLevel[spec.defPiercing.toUpperCase()];
		if (dl) {
			this.defenseLevel.PIERCING = dl.id;
		}
		dl = hvStat.constant.defenseLevel[spec.defFire.toUpperCase()];
		if (dl) {
			this.defenseLevel.FIRE = dl.id;
		}
		dl = hvStat.constant.defenseLevel[spec.defCold.toUpperCase()];
		if (dl) {
			this.defenseLevel.COLD = dl.id;
		}
		dl = hvStat.constant.defenseLevel[spec.defElec.toUpperCase()];
		if (dl) {
			this.defenseLevel.ELEC = dl.id;
		}
		dl = hvStat.constant.defenseLevel[spec.defWind.toUpperCase()];
		if (dl) {
			this.defenseLevel.WIND = dl.id;
		}
		dl = hvStat.constant.defenseLevel[spec.defHoly.toUpperCase()];
		if (dl) {
			this.defenseLevel.HOLY = dl.id;
		}
		dl = hvStat.constant.defenseLevel[spec.defDark.toUpperCase()];
		if (dl) {
			this.defenseLevel.DARK = dl.id;
		}
		dl = hvStat.constant.defenseLevel[spec.defSoul.toUpperCase()];
		if (dl) {
			this.defenseLevel.SOUL = dl.id;
		}
		dl = hvStat.constant.defenseLevel[spec.defVoid.toUpperCase()];
		if (dl) {
			this.defenseLevel.VOID = dl.id;
		}
		if (spec.debuffsAffected) {
			debuffs = spec.debuffsAffected.replace(" ", "").split(", ");
			for (i = 0; i < debuffs.length; i++) {
				debuff = hvStat.constant.debuff[debuffs[i].toUpperCase()];
				if (debuff) {
					this.debuffsAffected.push(debuff.id);
				}
			}
		}
	}
};

hvStat.vo.MonsterSkillVO = function (spec) {
	this.id = null;
	this.name = null;
	this.skillType = null;
	this.attackType = null;
	this.damageType = null;
	this.lastUsedDate = null;

	if (spec) {
		if (Number(spec.id)) {
			this.id = Number(spec.id);
		}
		if (spec.name) {
			this.name = spec.name;
		}
		if (spec.skillType) {
			this.skillType = spec.skillType.toUpperCase();
		}
		if (spec.attackType) {
			this.attackType = spec.attackType.toUpperCase();
		}
		if (spec.damageType) {
			this.damageType = spec.damageType.toUpperCase();
		}
		if (spec.lastUsedDate) {
			this.lastUsedDate = spec.lastUsedDate;
		}
	}
	this.createKey();
};
hvStat.vo.MonsterSkillVO.prototype.createKey = function () {
	this.key = [
		this.id,
		(this.name !== null) ? this.name : "",	// Must not be null
		this.skillType,
		this.attackType,
		this.damageType
	];
};

hvStat.vo.MonsterVO = function () {
	this.id = null;
	this.name = null;
	this.maxHp = null;
	this.actualHealthPoint = null;
	this.prevMpRate = null;
	this.prevSpRate = null;
	this.scanResult = null;
	this.skills = [];
};

//------------------------------------
// IndexedDB Management
//------------------------------------
hvStat.database = {
	// indexedDB
	idb: null,
	idbAccessQueue: null,

	// Temporary work
	loadingMonsterInfoFromDB: false,
};

hvStat.database.deleteIndexedDB = function () {
	// Close connection
	hvStat.database.idb = null;

	// Delete database
	var reqDelete = indexedDB.deleteDatabase("HVStat");
	reqDelete.onsuccess = function (event) {
		alert("Your database has been deleted.");
		//console.log("deleteIndexedDB: success");
	};
	reqDelete.onerror = function (event) {
		alert("Error: Failed to delete your database");
		//console.log("deleteIndexedDB: error");
	};
	reqDelete.onblocked = function (event) {
		alert("Blocked: Please wait for a while or close the browser.");
		//console.log("deleteIndexedDB: blocked");
	};
};

hvStat.database.maintainObjectStores = function (oldVersion, versionChangeTransaction) {
	var alertMessage = "IndexDB database operation has failed; see console log";
	var idb = versionChangeTransaction.db;
	var store;

	if (oldVersion < 1) {
		// MonsterScanResults
		try {
			store = idb.createObjectStore("MonsterScanResults", { keyPath: "id", autoIncrement: false });
		} catch (e) {
			alert(alertMessage);
			console.log(e.message + "\n" + e.stack);
		}
		try {
			store.createIndex("ix_id", "id", { unique: true });
		} catch (e) {
			alert(alertMessage);
			console.log(e.message + "\n" + e.stack);
		}
		try {
			store.createIndex("ix_name", "name", { unique: true });
		} catch (e) {
			alert(alertMessage);
			console.log(e.message + "\n" + e.stack);
		}

		// MonsterSkills
		try {
			store = idb.createObjectStore("MonsterSkills", { keyPath: "key", autoIncrement: false });
		} catch (e) {
			alert(alertMessage);
			console.log(e.message + "\n" + e.stack);
		}
		try {
			store.createIndex("ix_key", "key", { unique: true });
		} catch (e) {
			alert(alertMessage);
			console.log(e.message + "\n" + e.stack);
		}
		try {
			store.createIndex("ix_id", "id", { unique: false });
		} catch (e) {
			alert(alertMessage);
			console.log(e.message + "\n" + e.stack);
		}
	}
	if (oldVersion < 2) {
		// ItemDrops
		try {
			store = idb.createObjectStore("ItemDrops", { keyPath: "key", autoIncrement: false });
		} catch (e) {
			alert(alertMessage);
			console.log(e.message + "\n" + e.stack);
		}
		try {
			store.createIndex("ix_key", "key", { unique: true });
		} catch (e) {
			alert(alertMessage);
			console.log(e.message + "\n" + e.stack);
		}
		try {
			store.createIndex("ix_name", "name", { unique: false });
		} catch (e) {
			alert(alertMessage);
			console.log(e.message + "\n" + e.stack);
		}

		// EquipmentDrops
		try {
			store = idb.createObjectStore("EquipmentDrops", { keyPath: "id", autoIncrement: true });
		} catch (e) {
			alert(alertMessage);
			console.log(e.message + "\n" + e.stack);
		}
		try {
			store.createIndex("ix_id", "id", { unique: true });
		} catch (e) {
			alert(alertMessage);
			console.log(e.message + "\n" + e.stack);
		}
		try {
			store.createIndex("ix_name", "name", { unique: false });
		} catch (e) {
			alert(alertMessage);
			console.log(e.message + "\n" + e.stack);
		}
	}
};

hvStat.database.openIndexedDB = function (callback) {
	var errorMessage;

	var idbVersion = 2; // Must be an integer
	var idbOpenDBRequest = indexedDB.open("HVStat", idbVersion);
	idbOpenDBRequest.onerror = function (event) {
		errorMessage = "Database open error: " + event.target.errorCode;
		alert(errorMessage);
		console.log(event);
	};
	// Latest W3C draft (Firefox and Chrome 23 or later)
	idbOpenDBRequest.onupgradeneeded = function (event) {
		console.log("onupgradeneeded: old version = " + event.oldVersion);
		hvStat.database.idb = event.target.result;
		var versionChangeTransaction = event.target.transaction;
		hvStat.database.maintainObjectStores(event.oldVersion, versionChangeTransaction);
		// Subsequently onsuccess event handler is called automatically
	};
	idbOpenDBRequest.onsuccess = function (event) {
		var idb = hvStat.database.idb = event.target.result;
		if (Number(idb.version) === idbVersion) {
			// Always come here if Firefox and Chrome 23 or later
			if (callback instanceof Function) {
				callback(event);
			}
		} else {
			// Obsolete Chrome style (Chrome 22 or earlier)
			var oldVersion = idb.version;
			if (oldVersion === "") {
				oldVersion = 0;
			}
			console.debug("setVersion: old version = " + oldVersion);
			var versionChangeRequest = idb.setVersion(String(idbVersion));
			versionChangeRequest.onerror = function (event) {
				errorMessage = "Database setVersion error: " + event.target.errorCode;
				alert(errorMessage);
				console.log(errorMessage);
			};
			versionChangeRequest.onsuccess = function (event) {
				var versionChangeTransaction = versionChangeRequest.result;
				hvStat.database.maintainObjectStores(oldVersion, versionChangeTransaction);
				if (callback instanceof Function) {
					versionChangeTransaction.oncomplete = function (event) {
						callback(event);
					};
				}
			};
		}
	};
};

hvStat.database.ObjectStoreDelegate = function (spec) {
	this.objectStoreName = spec.objectStoreName;
	this.columnSeparator = spec.columnSeparator || "%09";
	this.lineSeparator = spec.lineSeparator || "%0A";
	this.regex = spec.regex;
	this.headerLabels = spec.headerLabels;
	this.keyPropertyName = spec.keyPropertyName || "key";
	this.timeStampPropertyName = spec.timeStampPropertyName || "timeStamp";
	this.objectToTextArrayFn = spec.objectToTextArrayFn;
	this.regexResultToObjectFn = spec.regexResultToObjectFn;
};
hvStat.database.ObjectStoreDelegate.prototype = {
	get textHeader() {
		return this.headerLabels.join(this.columnSeparator);
	},
	get: function (tx, key, callback) {
		try {
			this._get(tx, key, callback);
		} catch (e) {
			console.log(e);
			alert(e);
		}
	},
	_get: function (tx, key, callback) {
		var store = tx.objectStore(this.objectStoreName);
		var getRequest = store.get(key);
		getRequest.onerror = function (event) {
			console.log(event);
			alert(event);
		};
		getRequest.onsuccess = function (event) {
			if (callback instanceof Function) {
				callback(event.target.result);
			}
		};
	},
	put: function (tx, obj, callback) {
		try {
			this._put(tx, obj, callback);
		} catch (e) {
			console.log(e);
			alert(e);
		}
	},
	_put: function (tx, obj, callback) {
		var that = this;
		var store = tx.objectStore(this.objectStoreName);
		var putRequest = store.put(obj);
		putRequest.onerror = function (event) {
			console.log(event);
			alert(event);
		};
		putRequest.onsuccess = function (event) {
			if (callback instanceof Function) {
				callback(obj);
			}
		}
	},
	export: function (callback) {
		try {
			this._export(callback);
		} catch (e) {
			console.log(e);
			alert(e);
		}
	},
	_export: function (callback) {
		var that = this;
		var tx = hvStat.database.idb.transaction([this.objectStoreName], "readonly");
		var store = tx.objectStore(this.objectStoreName);
		var count = 0;
		var texts = [];
		texts[count++] = this.textHeader;
		var cursorOpenRequest = store.openCursor(null, "next");
		cursorOpenRequest.onerror = function (event) {
			console.log(event);
			alert(event);
		};
		cursorOpenRequest.onsuccess = function (event) {
			var cursor = this.result;
			var obj, text, result;
			if (cursor) {
				obj = cursor.value;
				texts[count++] = that.objectToTextArrayFn(obj).join(that.columnSeparator);
				cursor.continue();
			} else {
				if (callback instanceof Function) {
					result = {
						dataURI: "data:text/tsv;charset=utf-8," + texts.join(that.lineSeparator),
						rowCount: count,
					}
					callback(result);
				}
			}
		};
	},
	import: function (callback) {
		try {
			this._import(callback);
		} catch (e) {
			console.log(e);
			alert(e);
		}
	},
	_import: function (file, callback) {
		var that = this;
		var reader = new FileReader();
		reader.onerror = function (event) {
			console.log(event);
			alert(event);
		};
		reader.onload = function (event) {
			var contents = event.target.result;
			var rowCount, procCount;
			var regexResult;
			var tx = hvStat.database.idb.transaction([that.objectStoreName], "readwrite");
			var store = tx.objectStore(that.objectStoreName);
			var skipCount = 0;
			var successCount = 0;
			var errorCount = 0;
			var obj;

			var report = function () {
				if (procCount >= rowCount) {
					alert(rowCount + " row(s) found,\n" + successCount + " row(s) imported,\n" + skipCount + " row(s) skipped,\n" + errorCount + " error(s)");
				}
			};

			// Prescan
			that.regex.lastIndex = 0;
			rowCount = 0;
			while ((regexResult = that.regex.exec(contents)) !== null) {
				rowCount++;
			}

			// Import
			procCount = 0;
			that.regex.lastIndex = 0;
			while ((regexResult = that.regex.exec(contents)) !== null) {
				obj = that.regexResultToObjectFn(regexResult);
				(function (obj) {
					var getRequest = store.get(obj[that.keyPropertyName]);
					getRequest.onerror = function (event) {
						console.debug(event);
						alert(event);
						errorCount++;
						procCount++;
						report();
					};
					getRequest.onsuccess = function (event) {
						var existingObj = event.target.result;
						var doPut = (existingObj === undefined ||
							obj[that.timeStampPropertyName] === null ||
							obj[that.timeStampPropertyName] >= existingObj[that.timeStampPropertyName]);
						if (!doPut) {
							skipCount++;
							procCount++;
						} else {
							var putRequest = store.put(obj);
							putRequest.onerror = function (event) {
								console.debug(event);
								alert(event);
								errorCount++;
								procCount++;
								report();
							};
							putRequest.onsuccess = function (event) {
								successCount++;
								procCount++;
								report();
							};
						}
					};
				})(obj);
			}
		};
		reader.readAsText(file, 'UTF-8');
	},
	delete: function (callback) {
		var that = this;
		var tx = hvStat.database.idb.transaction([that.objectStoreName], "readwrite");
		var store = tx.objectStore(that.objectStoreName);
		var count = 0;
		var cursorOpenRequest = store.openCursor(null, "next");
		cursorOpenRequest.onerror = function (event) {
			console.log(event);
			alert(event);
		};
		cursorOpenRequest.onsuccess = function (event) {
			var cursor = this.result;
			if (cursor) {
				cursor.delete();
				count++;
				cursor.continue();
			} else {
				if (callback instanceof Function) {
					var result = {
						count: count,
					}
					callback(result);
				}
			}
		};
	},
};


hvStat.database.monsterScanResults = new hvStat.database.ObjectStoreDelegate({
	objectStoreName: "MonsterScanResults",
	regex: /^(\d+?)\t(.*?)\t(.*?)\t(.*?)\t(\d*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)$/gm,
	headerLabels:[
		"ID", "LAST_SCAN_DATE", "NAME", "MONSTER_CLASS", "POWER_LEVEL", "TRAINER", "MELEE_ATTACK",
		"DEF_CRUSHING", "DEF_SLASHING", "DEF_PIERCING", "DEF_FIRE", "DEF_COLD", "DEF_ELEC", "DEF_WIND",
		"DEF_HOLY", "DEF_DARK", "DEF_SOUL", "DEF_VOID", "DEBUFFS_AFFECTED",
	],
	keyPropertyName: "id",
	timeStampPropertyName: "lastScanDate",
	objectToTextArrayFn: function (obj) {
		obj.defenseLevel = obj.defenseLevel || obj.defenceLevel;	// Patch
		return [
			obj.id,
			obj.lastScanDate !== null ? obj.lastScanDate : "",
			obj.name !== null ? obj.name : "",
			obj.monsterClass !== null ? obj.monsterClass : "",
			obj.powerLevel !== null ? obj.powerLevel : "",
			obj.trainer !== null ? obj.trainer : "",
			obj.meleeAttack !== null ? obj.meleeAttack : "",
			obj.defenseLevel && obj.defenseLevel.CRUSHING ? obj.defenseLevel.CRUSHING : "",
			obj.defenseLevel && obj.defenseLevel.SLASHING ? obj.defenseLevel.SLASHING : "",
			obj.defenseLevel && obj.defenseLevel.PIERCING ? obj.defenseLevel.PIERCING : "",
			obj.defenseLevel && obj.defenseLevel.FIRE ? obj.defenseLevel.FIRE : "",
			obj.defenseLevel && obj.defenseLevel.COLD ? obj.defenseLevel.COLD : "",
			obj.defenseLevel && obj.defenseLevel.ELEC ? obj.defenseLevel.ELEC : "",
			obj.defenseLevel && obj.defenseLevel.WIND ? obj.defenseLevel.WIND : "",
			obj.defenseLevel && obj.defenseLevel.HOLY ? obj.defenseLevel.HOLY : "",
			obj.defenseLevel && obj.defenseLevel.DARK ? obj.defenseLevel.DARK : "",
			obj.defenseLevel && obj.defenseLevel.SOUL ? obj.defenseLevel.SOUL : "",
			obj.defenseLevel && obj.defenseLevel.VOID ? obj.defenseLevel.VOID : "",
			obj.debuffsAffected ? obj.debuffsAffected.join(", ") : "",
		];
	},
	regexResultToObjectFn: function (regexResult) {
		return new hvStat.vo.MonsterScanResultsVO({
			id: regexResult[1],
			lastScanDate: regexResult[2],
			name: regexResult[3],
			monsterClass: regexResult[4],
			powerLevel: regexResult[5],
			trainer: regexResult[6],
			meleeAttack: regexResult[7],
			defCrushing: regexResult[8],
			defSlashing: regexResult[9],
			defPiercing: regexResult[10],
			defFire: regexResult[11],
			defCold: regexResult[12],
			defElec: regexResult[13],
			defWind: regexResult[14],
			defHoly: regexResult[15],
			defDark: regexResult[16],
			defSoul: regexResult[17],
			defVoid: regexResult[18],
			debuffsAffected: regexResult[19],
		});
	},
});

hvStat.database.monsterSkills = new hvStat.database.ObjectStoreDelegate({
	objectStoreName: "MonsterSkills",
	regex: /^(\d+?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)$/gm,
	headerLabels: ["ID", "NAME", "SKILL_TYPE", "ATTACK_TYPE", "DAMAGE_TYPE", "LAST_USED_DATE"],
	timeStampPropertyName: "lastScanDate",
	objectToTextArrayFn: function (obj) {
		return [
			obj.id,
			obj.name !== null ? obj.name : "",
			obj.skillType !== null ? obj.skillType : "",
			obj.attackType !== null ? obj.attackType : "",
			obj.damageType !== null ? obj.damageType : "",
			obj.lastUsedDate !== null ? obj.lastUsedDate : "",
		];
	},
	regexResultToObjectFn: function (regexResult) {
		return new hvStat.vo.MonsterSkillVO({
			id: regexResult[1],
			name: regexResult[2],
			skillType: regexResult[3],
			attackType: regexResult[4],
			damageType: regexResult[5],
			lastUsedDate: regexResult[6]
		});
	},
});

hvStat.database.itemDrops = new hvStat.database.ObjectStoreDelegate({
	objectStoreName: "ItemDrops",
	regex: /^(.+?)\t(.+?)\t(.+?)\t(.+?)\t(\d+)\t(\d+)\t([-0-9TZ\:\.]+?)$/gm,
	headerLabels: ["NAME", "DROP_TYPE", "DIFFICULTY", "BATTLE_TYPE", "DROP_COUNT", "QTY", "TIME_STAMP"],
	objectToTextArrayFn: function (obj) {
		return [
			obj.name,
			obj.dropType,
			obj.difficulty,
			obj.battleType,
			obj.dropCount,
			obj.qty,
			obj.timeStamp,
		];
	},
	regexResultToObjectFn: function (regexResult) {
		return {
			key: [
				regexResult[1],
				regexResult[2],
				regexResult[3],
				regexResult[4],
			],
			name: regexResult[1],
			dropType: regexResult[2],
			difficulty: regexResult[3],
			battleType: regexResult[4],
			dropCount: Number(regexResult[5]),
			qty: Number(regexResult[6]),
			timeStamp: regexResult[7],
		};
	},
});

hvStat.database.equipmentDrops = new hvStat.database.ObjectStoreDelegate({
	objectStoreName: "EquipmentDrops",
	regex: /^(\d+)\t(.+?)\t(.+?)\t(.+?)\t(.+?)\t(\d*)\t(\d*)\t([-0-9TZ\:\.]+?)$/gm,
	headerLabels: ["ID", "NAME", "DROP_TYPE", "DIFFICULTY", "BATTLE_TYPE", "ARENA_NUMBER", "ROUND_NUMBER", "TIME_STAMP"],
	keyPropertyName: "id",
	objectToTextArrayFn: function (obj) {
		return [
			obj.id,
			obj.name,
			obj.dropType,
			obj.difficulty,
			obj.battleType,
			(obj.arenaNumber === null ? "" : obj.arenaNumber),
			(obj.roundNumber === null ? "" : obj.roundNumber),
			obj.timeStamp,
		];
	},
	regexResultToObjectFn: function (regexResult) {
		return {
			id: Number(regexResult[1]),
			name: regexResult[2],
			dropType: regexResult[3],
			difficulty: regexResult[4],
			battleType: regexResult[5],
			arenaNumber: regexResult[6] === "" ? null : Number(regexResult[6]),
			roundNumber: regexResult[7] === "" ? null : Number(regexResult[7]),
			timeStamp: regexResult[8],
		};
	},
});

//------------------------------------
// Statistics
//------------------------------------
hvStat.statistics = {};
hvStat.statistics.drops = {
	increaseChance: function (value, dropType, difficulty, battleType) {
		hvStat.storage.dropStats.increaseChance(value, dropType, difficulty, battleType);
	},
	nChances: function (dropType, difficulty, battleType) {
		return hvStat.storage.dropStats.nChances(dropType, difficulty, battleType);
	},
	addCredit: function (name, amt, dropType, difficulty, battleType) {
		hvStat.storage.dropStats.addCredit(name, dropType, difficulty, battleType);
		this.storeItem(name, amt, dropType, difficulty, battleType);
	},
	creditCount: function (dropType, difficulty, battleType) {
		return hvStat.storage.dropStats.creditCount(dropType, difficulty, battleType);
	},
	addItem: function (name, dropType, difficulty, battleType) {
		hvStat.storage.dropStats.addItem(name, dropType, difficulty, battleType);
		this.storeItem(name, 1, dropType, difficulty, battleType);
	},
	itemCount: function (dropType, difficulty, battleType) {
		return hvStat.storage.dropStats.itemCount(dropType, difficulty, battleType);
	},
	addCrystal: function (name, qty, dropType, difficulty, battleType) {
		hvStat.storage.dropStats.addCrystal(name, dropType, difficulty, battleType);
		this.storeItem(name, qty, dropType, difficulty, battleType);
	},
	crystalCount: function (dropType, difficulty, battleType) {
		return hvStat.storage.dropStats.crystalCount(dropType, difficulty, battleType);
	},
	addMonsterFood: function (name, dropType, difficulty, battleType) {
		hvStat.storage.dropStats.addMonsterFood(name, dropType, difficulty, battleType);
		this.storeItem(name, 1, dropType, difficulty, battleType);
	},
	monsterFoodCount: function (dropType, difficulty, battleType) {
		return hvStat.storage.dropStats.monsterFoodCount(dropType, difficulty, battleType);
	},
	addToken: function (name, dropType, difficulty, battleType) {
		hvStat.storage.dropStats.addToken(name, dropType, difficulty, battleType);
		this.storeItem(name, 1, dropType, difficulty, battleType);
	},
	tokenCount: function (dropType, difficulty, battleType) {
		return hvStat.storage.dropStats.tokenCount(dropType, difficulty, battleType);
	},
	addArtifact: function (name, dropType, difficulty, battleType) {
		hvStat.storage.dropStats.addArtifact(name, dropType, difficulty, battleType);
		this.storeItem(name, 1, dropType, difficulty, battleType);
	},
	artifactCount: function (dropType, difficulty, battleType) {
		return hvStat.storage.dropStats.artifactCount(dropType, difficulty, battleType);
	},
	storeItem: function (name, qty, dropType, difficulty, battleType) {
		hvStat.database.idbAccessQueue.add(function () {
			// Use an individual transaction to avoid unintended overwriting when concurrent access occurs
			var tx = hvStat.database.idb.transaction(["ItemDrops"], "readwrite");
			var key = [
				name,
				dropType,
				difficulty,
				battleType,
			];
			hvStat.database.itemDrops.get(tx, key, function (obj) {
				var timeStamp = (new Date()).toISOString();
				var itemDrop;
				if (obj) {
					// Update
					itemDrop = obj;
					itemDrop.dropCount++;
					itemDrop.qty += qty;
					itemDrop.timeStamp = timeStamp;
				} else {
					// Create new
					itemDrop = {
						key: key,
						name: name,
						dropType: dropType,
						difficulty: difficulty,
						battleType: battleType,
						dropCount: 1,
						qty: qty,
						timeStamp: timeStamp,
					};
				}
				hvStat.database.itemDrops.put(tx, itemDrop);
			});
		});
	},
	addEquipment: function (name, dropType, difficulty, battleType, arenaNumber, roundNumber) {
		hvStat.storage.dropStats.addEquipment(name, dropType, difficulty, battleType, arenaNumber, roundNumber);
		this.storeEquipment(name, dropType, difficulty, battleType, arenaNumber, roundNumber);
	},
	equipmentCount: function (dropType, difficulty, battleType) {
		return hvStat.storage.dropStats.equipmentCount(dropType, difficulty, battleType);
	},
	storeEquipment: function (name, dropType, difficulty, battleType, arenaNumber, roundNumber) {
		hvStat.database.idbAccessQueue.add(function () {
			if (battleType !== hvStat.constant.battleType.ARENA.id) {
				arenaNumber = null;
			}
			if (battleType === hvStat.constant.battleType.HOURLY_ENCOUNTER.id) {
				roundNumber = null;
			}
			var equipmentDrop = {
				name: name,
				dropType: dropType,
				difficulty: difficulty,
				battleType: battleType,
				arenaNumber: arenaNumber,
				roundNumber: roundNumber,
				timeStamp: (new Date()).toISOString(),
			};
			var tx = hvStat.database.idb.transaction(["EquipmentDrops"], "readwrite");
			hvStat.database.equipmentDrops.put(tx, equipmentDrop);
		});
	},
};

//------------------------------------
// Battle
//------------------------------------
hvStat.battle = {
	constant: {
		rInfoPaneParameters: /battle\.set_infopane_(?:spell|skill|item|effect)\('((?:[^'\\]|\\.)*)'\s*,\s*'(?:[^'\\]|\\.)*'\s*,\s*(.+)\)/,
	},
	initialize: function () {
		hvStat.battle.enhancement.initialize();
		hvStat.battle.monster.initialize();
		hvStat.battle.eventLog.initialize();
	},
	advanceRound: function () {
		if (!hv.battle.isFinished && hv.battle.isRoundFinished) {
			(function (dialogButton) {
				setTimeout(function () {
					dialogButton.click();
					return 0;
				}, hvStat.settings.autoAdvanceBattleRoundDelay);
			})(hv.battle.elementCache.dialogButton);
		}
	},
};

//------------------------------------
// Battle - Character
//------------------------------------
hvStat.battle.character = {
	get isSpiritStanceEnabled() {
		var spiritCommand = document.getElementById("ckey_spirit");
		if (spiritCommand) {
			var src = spiritCommand.getAttribute("src");
			if (src.indexOf("spirit_a") >= 0) {
				return true;
			}
		}
		return false;
	},
};

//------------------------------------
// Battle - Event log management
//------------------------------------
hvStat.battle.eventLog = {
	messageTypes: {},
	buildMessageTypes: function () {
		for (var key in hvStat.battle.eventLog.messageTypeParams) {
			var param = hvStat.battle.eventLog.messageTypeParams[key];
			hvStat.battle.eventLog.messageTypes[key] = new hvStat.battle.eventLog.MessageType(param);
		}
	},
	initialize: function () {
		this.buildMessageTypes();
	},
	processEvents: function () {
		var currentTurnEvents = new hvStat.battle.eventLog.TurnEvents();
		var turnMin;
		if (currentTurnEvents.turnNumber === hvStat.roundContext.lastTurn) {
			//We have no unprocessed events, so we do nothing
			return;
		} else if (currentTurnEvents.turnNumber < hvStat.roundContext.lastTurn) {
			//We're in a new round, so start from the beginning
			turnMin = 0;
		} else {
			//Start from where we left off
			turnMin = hvStat.roundContext.lastTurn + 1;
		}
		var turnMax = currentTurnEvents.turnNumber;

		for (var i = turnMin; i <= turnMax; i++) {
			var turnEvents;
			if (i < currentTurnEvents.turnNumber) {
				turnEvents = new hvStat.battle.eventLog.TurnEvents(i);
			} else {
				turnEvents = currentTurnEvents;
			}
			console.debug(turnEvents);
			turnEvents.process();
			if (i === 0) {
				if (hvStat.settings.isShowRoundReminder &&
						hvStat.roundContext.maxRound >= hvStat.settings.reminderMinRounds &&
						hvStat.roundContext.currRound === hvStat.roundContext.maxRound - hvStat.settings.reminderBeforeEnd) {
					if (hvStat.settings.reminderBeforeEnd === 0) {
						hvStat.battle.warningSystem.enqueueAlert("This is final round");
					} else {
						hvStat.battle.warningSystem.enqueueAlert("The final round is approaching.");
					}
				}
			}
			var meleeHitCount = turnEvents.countOf("MELEE_HIT");
			if (meleeHitCount >= 2) {
				hvStat.roundContext.aDomino[0]++;
				hvStat.roundContext.aDomino[1] += meleeHitCount;
				hvStat.roundContext.aDomino[meleeHitCount]++
			}
			var counterCount = turnEvents.countOf("COUNTER");
			if (counterCount >= 1) {
				hvStat.roundContext.aCounters[counterCount]++;
			}
		}

		hvStat.roundContext.lastTurn = currentTurnEvents.lastTurnNumber;
		hvStat.storage.roundContext.save();
	},
};

hvStat.battle.eventLog.MessageType = function (param) {
	this.regex = param.regex || null;
	this.relatedMessageTypeNames = param.relatedMessageTypeNames || null;
	this.contentType = param.contentType || null;
	this.evaluationFn = param.evaluationFn || null;
};
hvStat.battle.eventLog.MessageType.prototype = {
	match: function (text, innerHTML) {
		var target;
		if (this.contentType === "text") {
			target = text;
		} else if (this.contentType === "html") {
			target = innerHTML;
		}
		var result = target && target.match(this.regex);
		return result;
	},
	evaluate: function (message) {
		if (this.evaluationFn instanceof Function) {
			this.evaluationFn(message);
		}
	},
};

hvStat.battle.eventLog.Message = function (text, innerHTML) {
	this.text = text;
	this.innerHTML = innerHTML;
	this.messageType = null;
	this.regexResult = null;
	this.relatedMessage = null;	// Estimate
	this.initialize();
};
hvStat.battle.eventLog.Message.prototype = {
	initialize: function () {
		for (var key in hvStat.battle.eventLog.messageTypes) {
			var messageType = hvStat.battle.eventLog.messageTypes[key];
			var regexResult = messageType.match(this.text, this.innerHTML);
			if (regexResult) {
				this.messageType = messageType;
				this.regexResult = regexResult;
//				console.debug(key);
				break;
			}
		}
	},
	evaluate: function () {
		if (this.messageType) {
			this.messageType.evaluate(this);
		}
	},
};

hvStat.battle.eventLog.messageTypeParams = {
	// Arrange in order from the event frequently occurring
	DEFENSE: {
		regex: /^You (evade|block|parry|resist) the attack from (.+?)\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			hvStat.roundContext.mAttempts++;
			switch (message.regexResult[1]) {
			case "evade":
				hvStat.roundContext.pEvades++;
				break;
			case "block":
				hvStat.roundContext.pBlocks++;
				break;
			case "parry":
				hvStat.roundContext.pParries++;
				break;
			case "resist":
				hvStat.roundContext.pResists++;
				break;
			}
		},
	},
	SKILL_DEFENSE: {
		regex: /^(.+?) (uses|casts) (.+?)\. You (evade|block|parry|resist) the attack\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			var verb = message.regexResult[2];
			if (verb === "uses") {
				//TODO: pskills doesn't appear to be used anywhere; should it be removed?
				hvStat.roundContext.pskills[0]++;
			} else if (verb === "casts") {
				hvStat.roundContext.mSpells++;
			}

			hvStat.roundContext.mAttempts++;
			switch (message.regexResult[4]) {
			case "evade":
				hvStat.roundContext.pEvades++;
				break;
			case "block":
				hvStat.roundContext.pBlocks++;
				break;
			case "parry":
				hvStat.roundContext.pParries++;
				break;
			case "resist":
				hvStat.roundContext.pResists++;
				break;
			}
		},
	},
	MONSTER_MISS: {
		regex: /^(.+?) misses the attack against you\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			hvStat.roundContext.mAttempts++;
			hvStat.roundContext.pDodges++;	// correct?
		},
	},
	MONSTER_SKILL_MISS: {
		regex: /^(.+?) (uses|casts) (.+?), but misses the attack\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			hvStat.roundContext.mAttempts++;
			hvStat.roundContext.pDodges++;	// correct?

			var verb = message.regexResult[2];
			if (verb === "uses") {
				hvStat.roundContext.pskills[0]++;
			} else if (verb === "casts") {
				hvStat.roundContext.mSpells++;
			}
		},
	},
	MONSTER_HIT: {
		regex: /^((?:.(?!\, and))+?.) (hits|crits) you for (\d+(?:\.\d+)?) (.+?) damage\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			var damageAmount = Number(message.regexResult[3]);
			var critical = message.regexResult[2] === "crits";
			hvStat.roundContext.mAttempts++;
			hvStat.roundContext.mHits[critical ? 1 : 0]++;
			hvStat.roundContext.dTaken[critical ? 1 : 0] += damageAmount;
		},
	},
	MONSTER_SKILL_HIT: {
		regex: /^(.+?) (uses|casts) (.+?)\, and (hits|crits) you for (\d+(?:\.\d+)?) (.+?) damage\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			var monsterName = message.regexResult[1];
			var skillVerb = message.regexResult[2];
			var skillName = message.regexResult[3];
			var critical = message.regexResult[4] === "crits";
			var damageAmount = Number(message.regexResult[5]);
			var damageType = message.regexResult[6];

			hvStat.roundContext.mAttempts++;
			hvStat.roundContext.mHits[critical ? 1 : 0]++;
			hvStat.roundContext.dTaken[critical ? 1 : 0] += damageAmount;

			hvStat.roundContext.pskills[1]++;
			hvStat.roundContext.pskills[2] += damageAmount;
			if (skillVerb === "uses") {
				hvStat.roundContext.pskills[3]++;
				hvStat.roundContext.pskills[4] += damageAmount;
			} else if (skillVerb === "casts") {
				hvStat.roundContext.pskills[5]++;
				hvStat.roundContext.pskills[6] += damageAmount;
			}
			if (hvStat.settings.isRememberSkillsTypes && monsterName.indexOf("Unnamed ") !== 0) {
				var monster = hvStat.battle.monster.findByName(monsterName);
				if (monster) {
//					alert(monster + ":" + skillName  + ":" + skillVerb  + ":" + damageType);
					monster.storeSkill(skillName, skillVerb, damageType);
				}
			}
		},
	},
	MONSTER_DEFENSE: {
		regex: /^(.+?) (evades|parries|resists) your (attack|spell)\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			var method = message.regexResult[3];
			if (method === "attack") {
				// TODO
			} else if (method === "spell") {
				// TODO
			}
		},
	},
	MONSTER_GAINING_EFFECT: {
		regex: /^(.+?) gains the effect (.+?)\.$/,
		relatedMessageTypeNames: ["CAST", "COUNTER"],
		contentType: "text",
		evaluationFn: function (message) {
			var effectName = message.regexResult[2];
			switch (effectName) {
			case "Coalesced Mana":
				hvStat.roundContext.coalesce++;
				break;
			case "Searing Skin": case "Freezing Limbs": case "Deep Burns": case "Turbulent Air":
			case "Breached Defense": case "Blunted Attack": case "Rippened Soul": case "Burning Soul":
				hvStat.roundContext.elemEffects[0]++;
				break;
			case "Spreading Poison": case "Slowed": case "Weakened": case "Sleep":
			case "Confused": case "Imperiled": case "Blinded": case "Silenced":
			case "Nerfed": case "Magically Snared": case "Lifestream":
				hvStat.roundContext.depSpells[1]++;
				break;
			case "Stunned":
				if (message.relatedMessage &&
						message.relatedMessage.messageType === hvStat.battle.eventLog.messageTypes.COUNTER) {
					hvStat.roundContext.weaponprocs[7]++;
				} else {
					hvStat.roundContext.weaponprocs[0]++;
				}
				break;
			case "Penetrated Armor":
				hvStat.roundContext.weaponprocs[1]++;
				break;
			case "Bleeding Wound":
				hvStat.roundContext.weaponprocs[2]++;
				break;
			}
		},
	},
	MONSTER_EFFECT_EXPLOSION: {
		regex: /^(.+?) explodes for (\d+(?:\.\d+)?) (.+?) damage$/,
		relatedMessageTypeNames: ["HIT"],
		contentType: "text",
		evaluationFn: function (message) {
			var damageAmount = Number(message.regexResult[2]);
			hvStat.roundContext.elemEffects[1]++;
			hvStat.roundContext.elemEffects[2] += damageAmount;
			var targetMonsterName = message.relatedMessage && message.relatedMessage.regexResult[3];
			if (targetMonsterName) {
				var monster = hvStat.battle.monster.findByName(targetMonsterName);
				if (monster) {
					monster.takeDamage(damageAmount);
				}
			}
		},
	},
	MELEE_HIT: {
		regex: /^You (hit|crit) (.+?) for (\d+(?:\.\d+)?) (.+?) damage\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			var targetMonsterName = message.regexResult[2];
			var damageAmount = parseFloat(message.regexResult[3]);
			var critical = message.regexResult[1] === "crit";
			hvStat.roundContext.aAttempts++;
			hvStat.roundContext.aHits[critical ? 1 : 0]++;
			hvStat.roundContext.dDealt[critical ? 1 : 0] += damageAmount;
			var monster = hvStat.battle.monster.findByName(targetMonsterName);
			if (monster) {
				monster.takeDamage(damageAmount);
			}
		},
	},
	HIT: {
		regex: /^(.+?) (hits|crits|blasts) (?!you)(.+?) for (\d+(?:\.\d+)?)(?: (.+?))? damage\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			var damageSource = message.regexResult[1];
			var targetMonsterName = message.regexResult[3];
			var damageAmount = Number(message.regexResult[4]);
			var critical = message.regexResult[2] === "crits" || message.regexResult[2] === "blasts";
			switch (damageSource) {
			case "Bleeding Wound":
				hvStat.roundContext.dDealt[2] += damageAmount;
				break;
			case "Spreading Poison":
				hvStat.roundContext.effectPoison[1] += damageAmount;
				hvStat.roundContext.effectPoison[0]++;
				break;
			case "Your offhand":
				hvStat.roundContext.aOffhands[critical ? 2 : 0]++;
				hvStat.roundContext.aOffhands[critical ? 3 : 1] += damageAmount;
				break;
			default:
				if (hvStat.util.isOffensiveSpell(damageSource)) {
					hvStat.roundContext.dDealtSp[critical ? 1 : 0] += damageAmount;
					hvStat.roundContext.sHits[critical ? 1 : 0]++;
				}
				if (hvStat.util.isElementalSpell(damageSource)) {
					hvStat.roundContext.elemSpells[1]++;
					hvStat.roundContext.elemSpells[2] += damageAmount;
				} else if (hvStat.util.isDivineSpell(damageSource)) {
					hvStat.roundContext.divineSpells[1]++;
					hvStat.roundContext.divineSpells[2] += damageAmount;
				} else if (hvStat.util.isForbiddenSpell(damageSource)) {
					hvStat.roundContext.forbidSpells[1]++;
					hvStat.roundContext.forbidSpells[2] += damageAmount;
				} else if (hvStat.util.isSpiritualSpell(damageSource)) {
					hvStat.roundContext.spiritualSpells[1]++;
					hvStat.roundContext.spiritualSpells[2] += damageAmount;
				}
			}
			var monster = hvStat.battle.monster.findByName(targetMonsterName);
			if (monster) {
				monster.takeDamage(damageAmount);
			}
		},
	},
	RESTORATION: {
		regex: /^(.+?) restores (\d+(?:\.\d+)?) points of (.+?)\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
		},
	},
	MELEE_MISS: {
		regex: /^Your attack misses its mark/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			hvStat.roundContext.aAttempts++;
		},
	},
	COUNTER: {
		regex: /^You counter (.+?) for (\d+(?:\.\d+)?) points of (.+?) damage\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			var targetMonsterName = message.regexResult[1];
			var damageAmount = parseFloat(message.regexResult[2]);
			if (hvStat.settings.isTrackStats || hvStat.settings.isShowEndStats) {
				hvStat.roundContext.aCounters[0]++;
				hvStat.roundContext.aCounters[1] += damageAmount;
				hvStat.roundContext.dDealt[0] += damageAmount;
			}
			var monster = hvStat.battle.monster.findByName(targetMonsterName);
			if (monster) {
				monster.takeDamage(damageAmount);
			}
		},
	},
	SPIRIT_SHIELD_SUCCESS: {
		regex: /^Your spirit shield absorbs (\d+(?:\.\d+)?) points of damage from the attack into (\d+(?:\.\d+)?) points of spirit damage\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
		},
	},
	PROFICIENCY_GAIN: {
		regex: /^You gain 0\.0(\d) points of (.+?) proficiency\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			if (hvStat.settings.isShowSidebarProfs || hvStat.settings.isTrackStats) {
				var p = message.regexResult[1] / 100;
				switch (message.regexResult[2]) {
				case "one-handed weapon":
					hvStat.characterStatus.proficiencies.oneHanded += p;
					hvStat.roundContext.weapProfGain[0] += p;
					break;
				case "two-handed weapon":
					hvStat.characterStatus.proficiencies.twoHanded += p;
					hvStat.roundContext.weapProfGain[1] += p;
					break;
				case "dual wielding":
					hvStat.characterStatus.proficiencies.dualWielding += p;
					hvStat.roundContext.weapProfGain[2] += p;
					break;
				case "staff":
					hvStat.characterStatus.proficiencies.staff += p;
					hvStat.roundContext.weapProfGain[3] += p;
					break;
				case "cloth armor":
					hvStat.characterStatus.proficiencies.clothArmor += p;
					hvStat.roundContext.armorProfGain[0] += p;
					break;
				case "light armor":
					hvStat.characterStatus.proficiencies.lightArmor += p;
					hvStat.roundContext.armorProfGain[1] += p;
					break;
				case "heavy armor":
					hvStat.characterStatus.proficiencies.heavyArmor += p;
					hvStat.roundContext.armorProfGain[2] += p;
					break;
				case "elemental magic":
					hvStat.characterStatus.proficiencies.elemental += p;
					hvStat.roundContext.elemGain += p;
					break;
				case "divine magic":
					hvStat.characterStatus.proficiencies.divine += p;
					hvStat.characterStatus.proficiencies.spiritual = (hvStat.characterStatus.proficiencies.divine + hvStat.characterStatus.proficiencies.forbidden) / 2;
					hvStat.roundContext.divineGain += p;
					break;
				case "forbidden magic":
					hvStat.characterStatus.proficiencies.forbidden += p;
					hvStat.characterStatus.proficiencies.spiritual = (hvStat.characterStatus.proficiencies.divine + hvStat.characterStatus.proficiencies.forbidden) / 2;
					hvStat.roundContext.forbidGain += p;
					break;
				case "deprecating magic":
					hvStat.characterStatus.proficiencies.deprecating += p;
					hvStat.roundContext.depGain += p;
					break;
				case "supportive magic":
					hvStat.characterStatus.proficiencies.supportive += p;
					hvStat.roundContext.supportGain += p;
					break;
				}
				hvStat.storage.characterStatus.save();
			}
		},
	},
	MONSTER_EFFECT_EXPIRATION: {
		regex: /^The effect (.+?) on (.+?) has expired\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
		},
	},
	CAST: {
		regex: /^You cast (.+?)\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			var spell = message.regexResult[1];
			if (hvStat.util.isElementalSpell(spell)) {
				hvStat.roundContext.elemSpells[0]++;
				hvStat.roundContext.sAttempts++;
			} else if (hvStat.util.isDivineSpell(spell)) {
				hvStat.roundContext.divineSpells[0]++;
				hvStat.roundContext.sAttempts++;
			} else if (hvStat.util.isForbiddenSpell(spell)) {
				hvStat.roundContext.forbidSpells[0]++;
				hvStat.roundContext.sAttempts++;
			} else if (hvStat.util.isSpiritualSpell(spell)) {
				hvStat.roundContext.spiritualSpells[0]++;
				hvStat.roundContext.sAttempts++;
			} else if (hvStat.util.isDeprecatingSpell(spell)) {
				hvStat.roundContext.sAttempts++;
				hvStat.roundContext.depSpells[0]++;
			} else if (hvStat.util.isSupportiveSpell(spell)) {
				hvStat.roundContext.supportSpells++;
				if (spell === "Absorb") {
					hvStat.roundContext.absArry[0]++;
				}
			} else if (hvStat.util.isCurativeSpell(spell)) {
				hvStat.roundContext.curativeSpells++;
			}
		},
	},
	MAGIC_MISS: {
		regex: /^Your spell fails to connect\.$/,
		relatedMessageTypeNames: ["CAST"],
		contentType: "text",
		evaluationFn: function (message) {
			var spell = message.relatedMessage.regexResult[1];
			if (hvStat.util.isElementalSpell(spell)) {
				hvStat.roundContext.elemSpells[3]++;
			} else if (hvStat.util.isDivineSpell(spell)) {
				hvStat.roundContext.divineSpells[3]++;
			} else if (hvStat.util.isForbiddenSpell(spell)) {
				hvStat.roundContext.forbidSpells[3]++;
			} else if (hvStat.util.isSpiritualSpell(spell)) {
				hvStat.roundContext.spiritualSpells[3]++;
			} else if (hvStat.util.isDeprecatingSpell(spell)) {
				// TODO ?
			}
			hvStat.roundContext.sResists++;	// correct?
		},
	},
	DRAIN: {
		regex: /^You drain (\d+(?:\.\d+)?) (HP|MP|SP) from (.+)$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			var drainObject = message.regexResult[2];
			switch (drainObject) {
			case "HP":
				hvStat.roundContext.weaponprocs[4]++;
				break;
			case "MP":
				hvStat.roundContext.weaponprocs[5]++;
				break;
			case "SP":
				hvStat.roundContext.weaponprocs[6]++;
				break;
			}
		},
	},
	ITEM_OR_SKILL: {
		regex: /^You use (.+)\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			var usedObject = message.regexResult[1];
			if (usedObject === "Mystic Gem") {
				hvStat.roundContext.channel--;
			}
		},
	},
	MONSTER_HEALTH_DRAIN: {
		regex: /^(.+?) drains (\d+(?:\.\d+)?) points of health from (.+?)\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			var drainAmount = Number(message.regexResult[2]);
			var targetMonsterName = message.regexResult[3];
			var monster = hvStat.battle.monster.findByName(targetMonsterName);
			if (monster) {
				monster.takeDamage(drainAmount);
			}
		},
	},
	MONSTER_DEFEAT: {
		regex: /^(.+?) has been defeated\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			hvStat.roundContext.kills++;
		},
	},
	SKILL_COOLDOWN_EXPIRATION: {
		regex: /^Cooldown expired for (.+)$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
		},
	},
	GAINING_EFFECT: {
		regex: /^You gain the effect (.+)\.$/,
		relatedMessageTypeNames: ["ITEM_OR_SKILL"],
		contentType: "text",
		evaluationFn: function (message) {
			var effectName = message.regexResult[1];
			if (hvStat.settings.alertWhenChannelingIsGained && effectName === "Channeling") {
				var relatedMessage = message.relatedMessage;
				if (!relatedMessage || relatedMessage.regexResult[1] !== "Mystic Gem") {
					hvStat.battle.warningSystem.enqueueAlert("You gained the effect Channeling.");
				}
			}
			switch (effectName) {
			case "Channeling":
				hvStat.roundContext.channel++;
				break;
			case "Overwhelming Strikes":
				hvStat.roundContext.overStrikes++;
				break;
			case "Ether Tap":
				// TODO
				break;
			}
		},
	},
	EFFECT_EXPIRATION: {
		regex: /^The effect (.+?)\s+has expired\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			var effectName = message.regexResult[1];
			if (hvStat.settings.isWarnSparkExpire && effectName === "Spark of Life") {
				hvStat.battle.warningSystem.enqueueAlert("Spark of Life has expired!!");
			}
			var i = hvStat.battle.warningSystem.selfEffectNames.indexOf(effectName === "Regen II" ? "Regen" : effectName);
			if (i !== -1 && hvStat.settings.isEffectsAlertSelf[i] && hvStat.settings.EffectsAlertSelfRounds[i] === "-1") {
				hvStat.battle.warningSystem.enqueueAlert(effectName + " has expired");
			}
		},
	},
	RECOVERY: {
		regex: /^Recovered (\d+(?:\.\d+)?) points of (.+)\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
		},
	},
	CURE: {
		regex: /^You are healed for (\d+(?:\.\d+)?) Health Points\.$/,
		relatedMessageTypeNames: ["CAST"],
		contentType: "text",
		evaluationFn: function (message, relatedLog) {
			var spell = message.relatedMessage && message.relatedMessage.regexResult[1];
			var healingAmount = Number(message.regexResult[1]);
			var index = -1;
			switch (spell) {
			case "Cure":
				index = 0;
				break;
			case "Cure II":
				index = 1;
				break;
			case "Cure III":
				index = 2;
				break;
			}
			if (index >= 0) {
				hvStat.roundContext.cureTotals[index] += healingAmount;
				hvStat.roundContext.cureCounts[index]++;
			}
		},
	},
	ABSORPTION: {
		regex: /^(.+?) casts (.+?)\, but is absorbed\. You gain (\d+(?:\.\d+)?) Magic Points\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			if (hvStat.settings.isWarnAbsorbTrigger) {
				hvStat.battle.warningSystem.enqueueAlert("Absorbing Ward has triggered.");
			}
			hvStat.roundContext.mSpells++;
			hvStat.roundContext.absArry[1]++;
			hvStat.roundContext.absArry[2] += Number(message.regexResult[3]);
		},
	},
	SPARK_OF_LIFE_SUCCESS: {
		regex: /^Your Spark of Life restores you from the brink of defeat\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			if (hvStat.settings.isWarnSparkTrigger) {
				hvStat.battle.warningSystem.enqueueAlert("Spark of Life has triggered!!");
			}
		},
	},
	SPARK_OF_LIFE_FAILURE: {
		regex: /^Your Spark of Life fails due to insufficient Spirit\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
		},
	},
	POWERUP_DROP: {
		regex: /^(.+?) drops a (.+?) powerup\!$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			if (hvStat.settings.isAlertGem) {
				hvStat.battle.warningSystem.enqueueAlert("You picked up a " + message.regexResult[2] + ".");
			}
			// TODO: Collect statistics
		},
	},
	SCAN: {
		regex: /^Scanning (.*)\.\.\.\s+HP: [^\s]+\/([^\s]+)\s+MP: [^\s]+\/[^\s]+(?:\s+SP: [^\s]+\/[^\s]+)? Monster Class: (.+?)(?:, Power Level (\d+))? Monster Trainer:(?: (.+))? Melee Attack: (.+) Weak against: (.+) Resistant to: (.+) Impervious to: (.+)/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			if (hvStat.settings.isRememberScan) {
				var scanningMonsterName = message.regexResult[1];
				var monster = hvStat.battle.monster.findByName(scanningMonsterName);
				if (monster) {
					 monster.storeScanResult(message.regexResult);
				}
			}
		},
	},
	MONSTER_HEAL: {
		regex: /^(.+?) casts (.+?)\, healing (.+?) for (\d+(?:\.\d+)?) points of health\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			var targetMonsterName = message.regexResult[3];
			var healingAmount = Number(message.regexResult[4]);
			var monster = hvStat.battle.monster.findByName(targetMonsterName);
			if (monster) {
				monster.restoreHealthPoint(healingAmount);
			}
		},
	},
	INVENTORY_LIMIT_WARNING: {
		regex: /^Warning: Reached equipment inventory limit \(\d+\)\. Generated item instead\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			hvStat.characterStatus.didReachInventoryLimit = true;
			hvStat.storage.characterStatus.save();
		},
	},
	SPAWNING_MONSTER: {
		regex: /^Spawned Monster ([A-J]): MID=(\d+) \((.+?)\) LV=(\d+) HP=(\d+(?:\.\d+)?)$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			var letter = message.regexResult[1];
			var index = "ABCDEFGHIJ".indexOf(letter);
			if (index >= 0) {
				var monster = hvStat.battle.monster.monsters[index];
				var mid = Number(message.regexResult[2]);
				var name = message.regexResult[3];
				var hp = Number(message.regexResult[5]);
				monster.initialize(mid, name, hp);
				if (hvStat.settings.showMonsterInfoFromDB) {
					hvStat.database.loadingMonsterInfoFromDB = true;
					(function (monster) {
						hvStat.database.idbAccessQueue.add(function () {
							monster.getFromDB(function () {
								monster.renderStats();
								if (hvStat.battle.monster.areAllMonstersFinishedGettingFromDb) {
									hvStat.storage.roundContext.save();
								}
							});
						});
					})(monster);
				}
			}
			if (hvStat.settings.isTrackItems) {
				hvStat.roundContext.dropChances++;
			}
		},
	},
	DROP: {
		regex: /(.+?) dropped <span style="\s*color\s*:\s*(.+?)\s*;?\s*">\[(.+?)\]<\/span>$/,
		relatedMessageTypeNames: null,
		contentType: "html",
		evaluationFn: function (message) {
			var styleColor = message.regexResult[2];
			var stuffName = message.regexResult[3];
			var regexResult, qty = 0;
			switch (styleColor.toLowerCase()) {
			case "#a89000":	// Credit
				if (hvStat.settings.isTrackItems) {
					regexResult = stuffName.match(/(\d+) (Credits)/);
					if (regexResult[1]) {
						qty = Number(regexResult[1]);
						stuffName = regexResult[2];
						hvStat.statistics.drops.addCredit(stuffName, qty, hvStat.constant.dropType.MONSTER_DROP.id,
							hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
					}
				}
				hvStat.roundContext.credits += qty;
				break;
			case "#00b000":	// Item
				if (hvStat.settings.isTrackItems) {
					hvStat.statistics.drops.addItem(stuffName, hvStat.constant.dropType.MONSTER_DROP.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			case "#ba05b4":	// Crystal
				if (hvStat.settings.isTrackItems) {
					regexResult = stuffName.match(/(?:(\d+)x\s*)?(Crystal of .+)/);
					qty = 1;
					if (regexResult) {
						// Crystal
						if (regexResult[1]) {
							qty = Number(regexResult[1]);
						}
						stuffName = regexResult[2];
					}
					hvStat.statistics.drops.addCrystal(stuffName, qty, hvStat.constant.dropType.MONSTER_DROP.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			case "#489eff":	// Monster Food
				if (hvStat.settings.isTrackItems) {
					hvStat.statistics.drops.addMonsterFood(stuffName, hvStat.constant.dropType.MONSTER_DROP.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			case "#254117":	// Token
				if (hvStat.settings.isTrackItems) {
					hvStat.statistics.drops.addToken(stuffName, hvStat.constant.dropType.MONSTER_DROP.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			case "#0000ff":	// Artifact or Collectable
				hvStat.roundContext.artifacts++;
				hvStat.roundContext.lastArtName = stuffName;
				if (hvStat.settings.isTrackItems) {
					hvStat.statistics.drops.addArtifact(stuffName, hvStat.constant.dropType.MONSTER_DROP.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			case "#ff0000":	// Equipment
				hvStat.roundContext.equips++;
				hvStat.roundContext.lastEquipName = stuffName;
				if (hvStat.settings.isTrackItems) {
					hvStat.statistics.drops.addEquipment(stuffName, hvStat.constant.dropType.MONSTER_DROP.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName,
						hvStat.roundContext.arenaNum, hvStat.roundContext.currRound);
				}
				break;
			case "#461b7e":	// Trophy
				if (hvStat.settings.isTrackItems) {
					// Decrease number of chances
					hvStat.statistics.drops.increaseChance(-1, hvStat.constant.dropType.MONSTER_DROP.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			}
		},
	},
	START: {
		regex: /^Battle Start\!$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
		},
	},
	HOURLY_ENCOUNTER_INITIALIZATION: {
		regex: /^Initializing random encounter \.\.\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			hvStat.roundContext.battleType = HOURLY;
			hvStat.roundContext.battleTypeName = hvStat.constant.battleType.HOURLY_ENCOUNTER.id;
		},
	},
	ARENA_INITIALIZATION: {
		regex: /^Initializing arena challenge #(\d+) \(Round (\d+) \/ (\d+)\) \.\.\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			hvStat.roundContext.battleType = ARENA;
			hvStat.roundContext.battleTypeName = hvStat.constant.battleType.ARENA.id;
			hvStat.roundContext.arenaNum = Number(message.regexResult[1]);
			hvStat.roundContext.currRound = Number(message.regexResult[2]);
			hvStat.roundContext.maxRound = Number(message.regexResult[3]);
		},
	},
	ITEM_WORLD_INITIALIZATION: {
		regex: /^Initializing Item World \(Round (\d+) \/ (\d+)\) \.\.\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			hvStat.roundContext.battleType = ITEM_WORLD;
			hvStat.roundContext.battleTypeName = hvStat.constant.battleType.ITEM_WORLD.id;
			hvStat.roundContext.currRound = Number(message.regexResult[1]);
			hvStat.roundContext.maxRound = Number(message.regexResult[2]);
		},
	},
	GRINDFEST_INITIALIZATION: {
		regex: /^Initializing Grindfest \(Round (\d+)\s*\/\s*(\d+)\) \.\.\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			hvStat.roundContext.battleType = GRINDFEST;
			hvStat.roundContext.battleTypeName = hvStat.constant.battleType.GRINDFEST.id;
			hvStat.roundContext.currRound = Number(message.regexResult[1]);
			hvStat.roundContext.maxRound = Number(message.regexResult[2]);
		},
	},
	ESCAPE: {
		regex: /^You have escaped from the battle\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
		},
	},
	DEFEAT: {
		regex: /^You have been defeated\.$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
		},
	},
	VICTORY: {
		regex: /^You are Victorious\!$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			hvStat.statistics.drops.increaseChance(hv.battle.elementCache.monsters.length,
				hvStat.constant.dropType.MONSTER_DROP.id,
				hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
			if (hvStat.roundContext.battleTypeName === hvStat.constant.battleType.ARENA.id &&
					hvStat.roundContext.currRound === hvStat.roundContext.maxRound) {
				/* Final round of arenas */
				hvStat.statistics.drops.increaseChance(1, hvStat.constant.dropType.ARENA_CLEAR_BONUS.id,
					hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				hvStat.statistics.drops.increaseChance(1, hvStat.constant.dropType.ARENA_TOKEN_BONUS.id,
					hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
			}
		},
	},
	ARENA_CLEAR_BONUS: {
		regex: /Arena Clear Bonus\! <span style="\s*color\s*:\s*(.+?)\s*;?\s*">\[(.+?)\]<\/span>$/,
		relatedMessageTypeNames: null,
		contentType: "html",
		evaluationFn: function (message) {
			var styleColor = message.regexResult[1];
			var stuffName = message.regexResult[2];
			var regexResult, qty = 0;
			switch (styleColor.toLowerCase()) {
			case "#00b000":	// Item
				if (hvStat.settings.isTrackItems) {
					hvStat.statistics.drops.addItem(stuffName, hvStat.constant.dropType.ARENA_CLEAR_BONUS.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			case "#ba05b4":	// Crystal
				if (hvStat.settings.isTrackItems) {
					regexResult = stuffName.match(/(?:(\d+)x\s*)?(Crystal of .+)/);
					qty = 1;
					if (regexResult) {
						// Crystal
						if (regexResult[1]) {
							qty = Number(regexResult[1]);
						}
						stuffName = regexResult[2];
					}
					hvStat.statistics.drops.addItem(stuffName, qty, hvStat.constant.dropType.ARENA_CLEAR_BONUS.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			case "#489eff":	// Monster Food
				if (hvStat.settings.isTrackItems) {
					hvStat.statistics.drops.addItem(stuffName, hvStat.constant.dropType.ARENA_CLEAR_BONUS.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			case "#254117":	// Token
				if (hvStat.settings.isTrackItems) {
					hvStat.statistics.drops.addToken(stuffName, hvStat.constant.dropType.ARENA_CLEAR_BONUS.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			case "#0000ff":	// Artifact or Collectable
				hvStat.roundContext.artifacts++;
				hvStat.roundContext.lastArtName = stuffName;
				if (hvStat.settings.isTrackItems) {
					hvStat.statistics.drops.addArtifact(stuffName, hvStat.constant.dropType.ARENA_CLEAR_BONUS.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			case "#ff0000":	// Equipment
				hvStat.roundContext.equips++;
				hvStat.roundContext.lastEquipName = stuffName;
				if (hvStat.settings.isTrackItems) {
					hvStat.statistics.drops.addEquipment(stuffName, hvStat.constant.dropType.ARENA_CLEAR_BONUS.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName,
						hvStat.roundContext.arenaNum, hvStat.roundContext.currRound);
				}
				break;
			}
		},
	},
	ARENA_TOKEN_BONUS: {
		regex: /Arena Token Bonus\! <span style="\s*color\s*:\s*(.+?)\s*;?\s*">\[(.+?)\]<\/span>$/,
		relatedMessageTypeNames: null,
		contentType: "html",
		evaluationFn: function (message) {
			var styleColor = message.regexResult[1];
			var stuffName = message.regexResult[2];
			switch (styleColor.toLowerCase()) {
			case "#254117":	// Token
				if (hvStat.settings.isTrackItems) {
					hvStat.statistics.drops.addToken(stuffName, hvStat.constant.dropType.ARENA_TOKEN_BONUS.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			}
		},
	},
	CREDIT: {
		regex: /^You gain (\d+) Credits\!$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			var credits = Number(message.regexResult[1]);
			hvStat.roundContext.credits += credits;
		},
	},
	EXP: {
		regex: /^You gain (\d+) EXP\!$/,
		relatedMessageTypeNames: null,
		contentType: "text",
		evaluationFn: function (message) {
			var exp = Number(message.regexResult[1]);
			hvStat.roundContext.exp = exp;
		},
	},
};

hvStat.battle.eventLog.TurnEvents = function (targetTurnNumber) {
	this.turnNumber = -1;
	this.lastTurnNumber = -1;
	this.messages = [];

	var turnNumberElements = hv.battle.elementCache.battleLog.querySelectorAll('td:first-child');
	this.lastTurnNumber = Number(util.innerText(turnNumberElements[0]));
	if (isNaN(parseFloat(targetTurnNumber))) {
		targetTurnNumber = this.lastTurnNumber;
	} else {
		targetTurnNumber = Number(targetTurnNumber);
	}
	this.turnNumber = targetTurnNumber;

	for (var i = 0; i < turnNumberElements.length; i++) {
		var turnNumberElement = turnNumberElements[i];
		var turnNumber = Number(util.innerText(turnNumberElement));
		if (turnNumber === targetTurnNumber) {
			var messageElement = turnNumberElement.nextSibling.nextSibling;
			var text = util.innerText(messageElement);
			var innerHTML = messageElement.innerHTML;
			var message = new hvStat.battle.eventLog.Message(text, innerHTML);
			this.messages.push(message);
		}
	}
	this.messages.reverse();
	this.initialize();
};
hvStat.battle.eventLog.TurnEvents.prototype = {
	initialize: function () {
		// Set a related message for each
		for (var i = 0; i < this.messages.length; i++) {
			var message = this.messages[i];
			var messageType = message.messageType;
			if (messageType && Array.isArray(messageType.relatedMessageTypeNames)) {
				var relatedMessageTypes = [];
				for (var j = 0; j < messageType.relatedMessageTypeNames.length; j++) {
					var messageTypeName = messageType.relatedMessageTypeNames[j];
					relatedMessageTypes[j] = hvStat.battle.eventLog.messageTypes[messageTypeName];
				}
				for (j = i - 1; j >= 0; j--) {
					var prevMessage = this.messages[j];
					var prevMessageType = prevMessage.messageType;
					if (relatedMessageTypes.indexOf(prevMessageType) >= 0) {
						message.relatedMessage = prevMessage;
						break;
					}
				}
			}
		}
	},
	process: function () {
		for (var i = 0; i < this.messages.length; i++) {
			var message = this.messages[i];
			message.evaluate();
		}
	},
	countOf: function (messageTypeName) {
		var count = 0;
		var messageType = hvStat.battle.eventLog.messageTypes[messageTypeName];
		if (!messageType) {
			return 0;
		}
		for (var i = 0; i < this.messages.length; i++) {
			var message = this.messages[i];
			if (message.messageType === messageType) {
				count++;
			}
		}
		return count;
	},
};

//------------------------------------
// Battle - Command Management
//------------------------------------
hvStat.battle.command = {
	_commandMap: null,
	get commandMap() {
		if (!this._commandMap) {
			this._commandMap = {
				"Attack":    new hvStat.battle.command.Command({ elementId: "ckey_attack", name: "Attack" }),
				"Skillbook": new hvStat.battle.command.Command({ elementId: "ckey_magic",  name: "Skillbook", menuElementIds: ["togpane_magico", "togpane_magict"] }),
				"Spirit":    new hvStat.battle.command.Command({ elementId: "ckey_spirit", name: "Spirit" }),
				"Items":     new hvStat.battle.command.Command({ elementId: "ckey_items",  name: "Items",     menuElementIds: ["togpane_item"] }),
				"Defend":    new hvStat.battle.command.Command({ elementId: "ckey_defend", name: "Defend" }),
				"Focus":     new hvStat.battle.command.Command({ elementId: "ckey_focus",  name: "Focus" })
			};
		}
		return this._commandMap;
	},
	_menuItemMap: null,
	get menuItemMap() {
		if (!this._menuItemMap) {
			this._menuItemMap = {
				"PowerupGem": hvStat.battle.command.getMenuItemById("ikey_p"),
				"Scan": hvStat.battle.command.getMenuItemByName("Scan"),
				"Skill1": hvStat.battle.command.getMenuItemById("2101") ||
					hvStat.battle.command.getMenuItemById("2201") ||
					hvStat.battle.command.getMenuItemById("2301") ||
					hvStat.battle.command.getMenuItemById("2401") ||
					hvStat.battle.command.getMenuItemById("2501"),
				"Skill2": hvStat.battle.command.getMenuItemById("2102") ||
					hvStat.battle.command.getMenuItemById("2202") ||
					hvStat.battle.command.getMenuItemById("2302") ||
					hvStat.battle.command.getMenuItemById("2402") ||
					hvStat.battle.command.getMenuItemById("2502"),
				"Skill3": hvStat.battle.command.getMenuItemById("2103") ||
					hvStat.battle.command.getMenuItemById("2203") ||
					hvStat.battle.command.getMenuItemById("2303") ||
					hvStat.battle.command.getMenuItemById("2403") ||
					hvStat.battle.command.getMenuItemById("2503"),
				"OFC": hvStat.battle.command.getMenuItemByName("Orbital Friendship Cannon"),
			};
			if (this._menuItemMap["Scan"]) {
				this._menuItemMap["Scan"].bindKeys([
					new hvStat.keyboard.KeyCombination({ keyCode: 46 }),	// Delete
					new hvStat.keyboard.KeyCombination({ keyCode: 110 })	// Numpad . Del
				]);
			}
			if (this._menuItemMap["Skill1"]) {
				this._menuItemMap["Skill1"].bindKeys([
					new hvStat.keyboard.KeyCombination({ keyCode: 107 }),	// Numpad +
					new hvStat.keyboard.KeyCombination({ keyCode: 187 })	// = +
				]);
			}
			if (this._menuItemMap["OFC"]) {
				this._menuItemMap["OFC"].bindKeys([
					new hvStat.keyboard.KeyCombination({ keyCode: 109 }),	// Numpad -
					new hvStat.keyboard.KeyCombination({ keyCode: 189 })	// - _
				]);
			}
		}
		return this._menuItemMap;
	},
	getMenuItemById: function (menuItemId) {
		var commandMap = hvStat.battle.command.commandMap;
		for (var key in commandMap) {
			var menus = commandMap[key].menus;
			for (var i = 0; i < menus.length; i++) {
				var item = menus[i].getItemById(menuItemId);
				if (item) {
					return item;
				}
			}
		}
		return null;
	},
	getMenuItemByName: function (menuItemName) {
		var commandMap = hvStat.battle.command.commandMap;
		for (var key in commandMap) {
			var menus = commandMap[key].menus;
			for (var i = 0; i < menus.length; i++) {
				var item = menus[i].getItemByName(menuItemName);
				if (item) {
					return item;
				}
			}
		}
		return null;
	},
	getMenuItemsByBoundKey: function (keyCombination) {
		var itemMap = this.menuItemMap;
		var foundItems = [];
		for (var key in itemMap) {
			var item = itemMap[key];
			if (item && item.isBoundKey(keyCombination)) {
				foundItems.push(itemMap[key]);
			}
		}
		return foundItems;
	},
};

hvStat.battle.command.MenuItem = function (spec) {
	this.parent = spec && spec.parent || null;
	this.element = spec && spec.element || null;
	var onmouseover = String(this.element.getAttribute("onmouseover"));
	var result = hvStat.battle.constant.rInfoPaneParameters.exec(onmouseover);
	if (!result) {
		return null;
	}
	this.name = result[1];
	this.id = this.element && this.element.id || "";
	this.boundKeys = [];
	this.commandTarget = null;

	var onclick = String(this.element.getAttribute("onclick"));
	if (onclick.indexOf("friendly") >= 0) {
		this.commandTarget = "self";
	} else if (onclick.indexOf("hostile") >= 0) {
		this.commandTarget = "enemy";
	}
};
hvStat.battle.command.MenuItem.prototype = {
	get available() {
		return !this.element.style.cssText.match(/opacity\s*:\s*0/i);
	},
	get selected() {
		return !!this.element.children[0].style.cssText.match(/color\s*:\s*rgb\(0\s*\,\s*48\s*,\s*203\s*\)/i);
	},
	select: function () {
		if (this.available) {
			if (!this.parent.opened) {
				this.parent.open();
			}
			if (!this.selected) {
				this.element.onclick();	// select
			}
		}
	},
	bindKeys: function (keyConbinations) {
		this.boundKeys = keyConbinations;
	},
	unbindKeys: function () {
		this.boundKeys = [];
	},
	isBoundKey: function (keyConbination) {
		for (var i = 0; i < this.boundKeys.length; i++) {
			if (this.boundKeys[i].matches(keyConbination)) {
				return true;
			}
		}
		return false;
	},
};

hvStat.battle.command.Menu = function (spec) {
	this.parent = spec && spec.parent || null;
	this.elementId = spec && spec.elementId || null;
	this.element = this.elementId && document.getElementById(this.elementId) || null;

	this.items = [];
	var itemElements = this.element.querySelectorAll('div.btsd, #ikey_p, img.btii');
	for (var i = 0; i < itemElements.length; i++) {
		this.items[i] = new hvStat.battle.command.MenuItem({ parent: this, element: itemElements[i] });
	}
};
hvStat.battle.command.Menu.prototype = {
	get opened() {
		return !this.element.style.cssText.match(/display\s*:\s*none/);
	},
	open: function () {
		while (!this.opened) {
			this.parent.element.onclick();
		}
	},
	close: function () {
		if (this.opened) {
			this.parent.element.onclick();
		}
	},
	getItemById: function (id) {
		for (var i = 0; i < this.items.length; i++) {
			if (this.items[i].id === id) {
				return this.items[i];
			}
		}
		return null;
	},
	getItemByName: function (name) {
		for (var i = 0; i < this.items.length; i++) {
			if (this.items[i].name === name) {
				return this.items[i];
			}
		}
		return null;
	},
	getItemsByBoundkey: function (keyCombination) {
		var foundItems = [];
		for (var i = 0; i < this.items.length; i++) {
			if (this.items[i].isBoundKey(keyCombination)) {
				foundItems.push(this.items[i]);
			}
		}
		return foundItems;
	},
};

hvStat.battle.command.Command = function (spec) {
	this.elementId = spec && spec.elementId || null;
	this.name = spec && spec.name || "";
	this.menuElementIds = spec && spec.menuElementIds || [];
	this.element = this.elementId && document.getElementById(this.elementId) || null;
	this.menus = [];

	// Build menus
	for (var i = 0; i < this.menuElementIds.length; i++) {
		this.menus[i] = new hvStat.battle.command.Menu({ parent: this, elementId: this.menuElementIds[i] });
	}
};
hvStat.battle.command.Command.prototype = {
	get hasMenu() {
		return this.menus.length > 0;
	},
	get menuOpened() {
		for (var i = 0; i < this.menus.length; i++) {
			if (this.menus[i].opened) {
				return true;
			}
		}
		return false;
	},
	get selectedMenu() {
		for (var i = 0; i < this.menus.length; i++) {
			if (this.menus[i].opened) {
				return this.menus[i];
			}
		}
		return null;
	},
	select: function (menuElementId) {
		this.element.onclick();
	},
	close: function () {
		if (this.menuOpened) {
			this.select();
		}
	},
	toString: function () { return this.name; }
};

//------------------------------------
// Battle - Enhancements
//------------------------------------
hvStat.battle.enhancement = {
	initialize: function () {
		if (hvStat.settings.isShowSelfDuration) {
			this.effectDurationBadge.showForCharacter();
		}
		if (hvStat.settings.showSelfEffectStackLevel) {
			this.effectStackLevelBadge.showForCharacter();
		}
		if (hvStat.settings.isShowPowerupBox) {
			this.powerupBox.create();
		}
		if (hvStat.settings.isHighlightQC) {
			this.quickcast.highlight();
		}
		if (hvStat.settings.isShowHighlight) {
			this.log.setHighlightStyle();
			this.log.highlight();
		}
		if (hvStat.settings.isShowDivider) {
			this.log.showDivider();
		}
		if (hvStat.settings.isShowScanButton) {
			this.scanButton.createAll();
		}
		if (hvStat.settings.isShowSkillButton) {
			this.skillButton.createAll();
		}
		if (hvStat.settings.isShowMonsterNumber) {
			this.monsterLabel.replaceWithNumber();
		}
		if (hvStat.settings.isShowMonsterDuration) {
			this.effectDurationBadge.showForMonsters();
		}
		if (hvStat.settings.showMonsterEffectStackLevel) {
			this.effectStackLevelBadge.showForMonsters();
		}
	},
};

hvStat.battle.enhancement.roundCounter = {
	// Adds a Round counter to the Battle screen.
	create: function () {
		var curRound = hvStat.roundContext.currRound,
			maxRound = hvStat.roundContext.maxRound,
			dispRound = maxRound > 0 ? curRound + "/" + maxRound : "#" + curRound,
			div = document.createElement('div');

		div.className = "hvstat-round-counter";
		div.textContent = dispRound;
		if (curRound === maxRound - 1) {
			div.className += " hvstat-round-counter-second-last";
		} else if (curRound === maxRound) {
			div.className += " hvstat-round-counter-last";
		}
		hv.battle.elementCache.mainPane.children[1].appendChild(div);
	},
};

hvStat.battle.enhancement.effectDurationBadge = {
	create: function (effectIcon) {
		var result = hvStat.battle.constant.rInfoPaneParameters.exec(effectIcon.getAttribute("onmouseover"));
		if (!result) {
			return;
		}
		var duration = parseFloat(result[2]);
		if (isNaN(duration)) {
			return;
		}
		var badgeBase = document.createElement("div");
		badgeBase.className = "hvstat-duration-badge";
		badgeBase.onmouseover = effectIcon.onmouseover;
		badgeBase.onmouseout = effectIcon.onmouseout;
		if (hvStat.settings.isSelfEffectsWarnColor) {
			if (duration <= Number(hvStat.settings.SelfWarnRedRounds)) {
				badgeBase.className += " hvstat-duration-badge-red-alert";
			} else if (duration <= Number(hvStat.settings.SelfWarnOrangeRounds)) {
				badgeBase.className += " hvstat-duration-badge-yellow-alert";
			}
		}
		var badge = badgeBase.appendChild(document.createElement("div"));
		badge.textContent = String(duration);
		effectIcon.parentNode.insertBefore(badgeBase, effectIcon.nextSibling);
		return badgeBase;
	},
	showForCharacter: function () {
		var effectIcons = hv.battle.elementCache.characterEffectIcons;
		for (var i = 0; i < effectIcons.length; i++) {
			var badge = this.create(effectIcons[i]);
			if (badge) {
				badge.className += " hvstat-duration-badge-character";
			}
		}
	},
	showForMonsters: function () {
		for (var i = 0; i < hv.battle.elementCache.monsters.length; i++) {
			var monster = hv.battle.elementCache.monsters[i];
			var effectIcons = monster.querySelectorAll('img[onmouseover^="battle.set_infopane_effect"]');
			for (var j = 0; j < effectIcons.length; j++) {
				var badge = this.create(effectIcons[j]);
				if (badge) {
					badge.className += " hvstat-duration-badge-monster";
				}
			}
		}
	}
};

hvStat.battle.enhancement.effectStackLevelBadge = {
	create: function (effectIcon) {
		var rEffect = hvStat.battle.constant.rInfoPaneParameters.exec(effectIcon.getAttribute("onmouseover"));
		if (!rEffect) {
			return null;
		}
		var rEffectStackLevel = rEffect[1].match(/\(x(\d+)\)/);
		if (!rEffectStackLevel) {
			return null;
		}
		var badgeBase = document.createElement("div");
		badgeBase.onmouseover = effectIcon.onmouseover;
		badgeBase.onmouseout = effectIcon.onmouseout;
		badgeBase.className = "hvstat-effect-stack-level-badge";
		var badge = badgeBase.appendChild(document.createElement("div"));
		badge.textContent = String(rEffectStackLevel[1]);
		effectIcon.parentNode.insertBefore(badgeBase, effectIcon.nextSibling);
		return badgeBase;
	},
	showForCharacter: function () {
		var effectIcons = hv.battle.elementCache.characterEffectIcons;
		for (var i = 0; i < effectIcons.length; i++) {
			var badge = this.create(effectIcons[i]);
		}
	},
	showForMonsters: function () {
		for (var i = 0; i < hv.battle.elementCache.monsters.length; i++) {
			var monster = hv.battle.elementCache.monsters[i];
			var effectIcons = monster.querySelectorAll('img[onmouseover^="battle.set_infopane_effect"]');
			for (var j = 0; j < effectIcons.length; j++) {
				this.create(effectIcons[j]);
			}
		}
	}
};

hvStat.battle.enhancement.powerupBox = {
	// Adds a Powerup box to the Battle screen.
	// Creates a shortcut to the powerup if one is available.
	create: function () {
		var battleMenu = document.getElementsByClassName("btp"),
			powerBox = document.createElement("div"),
			powerup = document.getElementById("ikey_p");

		powerBox.className = "hvstat-powerup-box";
		if (!powerup) {
			powerBox.className += " hvstat-powerup-box-none";
			powerBox.textContent = "P";
		} else {
			var powerInfo = powerup.getAttribute("onmouseover");
			powerBox.setAttribute("onmouseover", powerInfo);
			powerBox.setAttribute("onmouseout", powerup.getAttribute("onmouseout"));
			powerBox.addEventListener("click", function (event) {
				hvStat.battle.command.menuItemMap["PowerupGem"].select();
			});
			if (powerInfo.indexOf('Health') > -1) {
				powerBox.className += " hvstat-powerup-box-health";
			} else if (powerInfo.indexOf('Mana') > -1) {
				powerBox.className += " hvstat-powerup-box-mana";
			} else if (powerInfo.indexOf('Spirit') > -1) {
				powerBox.className += " hvstat-powerup-box-spirit";
			} else if (powerInfo.indexOf('Mystic') > -1) {
				powerBox.className += " hvstat-powerup-box-channeling";
			}
		}
		battleMenu[0].appendChild(powerBox);
	},
};

hvStat.battle.enhancement.quickcast = {
	highlight: function () {
		var healthYellowLevel = Number(hvStat.settings.warnOrangeLevel);
		var healthRedLevel = Number(hvStat.settings.warnRedLevel);
		var magicYellowLevel = Number(hvStat.settings.warnOrangeLevelMP);
		var magicRedLevel = Number(hvStat.settings.warnRedLevelMP);
		var spiritYellowLevel = Number(hvStat.settings.warnOrangeLevelSP);
		var spiritRedLevel = Number(hvStat.settings.warnRedLevelSP);
		var quickcastBar = hv.battle.elementCache.quickcastBar;
		if (hv.character.healthPercent <= healthRedLevel) {
			quickcastBar.className += " hvstat-health-red-alert";
		} else if (hv.character.healthPercent <= healthYellowLevel) {
			quickcastBar.className += " hvstat-health-yellow-alert";
		} else if (hv.character.magicPercent <= magicRedLevel) {
			quickcastBar.className += " hvstat-magic-red-alert";
		} else if (hv.character.magicPercent <= magicYellowLevel) {
			quickcastBar.className += " hvstat-magic-yellow-alert";
		} else if (hv.character.spiritPercent <= spiritRedLevel) {
			quickcastBar.className += " hvstat-spirit-red-alert";
		} else if (hv.character.spiritPercent <= spiritYellowLevel) {
			quickcastBar.className += " hvstat-spirit-yellow-alert";
		}
	},
};

hvStat.battle.enhancement.log = {
	setHighlightStyle: function () {
		var styleName;
		if (hvStat.settings.isAltHighlight) {
			styleName = "battle-log-type1.css";
		} else {
			styleName = "battle-log-type0.css";
		}
		browser.extension.style.addFromResource("css/", styleName);
	},
	highlight: function () {
		// Copies the text of each Battle Log entry into a title element.
		// This is because CSS cannot currently select text nodes.
		var targets = hv.battle.elementCache.battleLog.querySelectorAll('td:last-of-type');
		var i = targets.length;
		while (i--) {
			targets[i].title = targets[i].textContent;
		}
	},
	showDivider: function () {
		// Adds a divider between Battle Log rounds.
		var logRows = hv.battle.elementCache.battleLog.getElementsByTagName('tr'),
			i = logRows.length,
			prevTurn = null,
			currTurn = null;
		while (i--) {
			currTurn = logRows[i].firstChild.textContent;
			if (!isNaN(parseFloat(currTurn))) {
				if (prevTurn && prevTurn !== currTurn) {
					logRows[i].lastChild.className += " hvstat-turn-divider";
				}
				prevTurn = currTurn;
			}
		}
	},
};

hvStat.battle.enhancement.scanButton = {
	elements: [],
	createAll: function () {
		hv.battle.elementCache.mainPane.style.overflow = "visible";
		hv.battle.elementCache.monsterPane.style.overflow = "visible";
		var monsters = hv.battle.elementCache.monsters;
		for (var i = 0; i < monsters.length; i++) {
			if (monsters[i].innerHTML.indexOf("bardead") >= 0) {
				continue;
			}
			var button = this.create(monsters[i]);
			if (button) {
				monsters[i].insertBefore(button, null);
			}
			this.elements[i] = button;
		}
	},
	create: function (monster) {
		var button = document.createElement("div");
		button.className = "hvstat-scan-button";
		button.textContent = "Scan";
		button.addEventListener("click", function (event) {
			hvStat.battle.command.menuItemMap["Scan"].select();
			monster.onclick();
		});
		return button;
	},
};

hvStat.battle.enhancement.skillButton = {
	labelTable: [
		{ id: "2101", label: "SkyS" },
		{ id: "2201", label: "ShiB" },
		{ id: "2202", label: "VitS" },
		{ id: "2203", label: "MerB" },
		{ id: "2301", label: "GreC" },
		{ id: "2302", label: "RenB" },
		{ id: "2303", label: "ShaS" },
		{ id: "2401", label: "IrisS" },
		{ id: "2402", label: "Stab" },
		{ id: "2403", label: "FreB" },
		{ id: "2501", label: "ConS" },
	],
	getLabelById: function (id) {
		for (var i = 0; i < this.labelTable.length; i++) {
			if (this.labelTable[i].id === id) {
				return this.labelTable[i].label;
			}
		}
		return "";
	},
	createAll: function () {
		var skill1 = hvStat.battle.command.menuItemMap["Skill1"];
		var skill2 = hvStat.battle.command.menuItemMap["Skill2"];
		var skill3 = hvStat.battle.command.menuItemMap["Skill3"];
		var skills = [];
		if (skill1) {
			skills.push(skill1);
		}
		if (skill2) {
			skills.push(skill2);
		}
		if (skill3) {
			skills.push(skill3);
		}
		hv.battle.elementCache.mainPane.style.overflow = "visible";
		hv.battle.elementCache.monsterPane.style.overflow = "visible";
		var monsters = hv.battle.elementCache.monsters;
		for (var i = 0; i < monsters.length; i++) {
			if (monsters[i].innerHTML.indexOf("bardead") >= 0) {
				continue;
			}
			for (var j = 0; j < skills.length; j++) {
				var button = this.create(monsters[i], skills[j], j + 1);
				if (button) {
					monsters[i].insertBefore(button, null);
				}
			}
		}
	},
	create: function (monster, skill, skillNumber) {
		var button = document.createElement("div");
		button.className = "hvstat-skill-button hvstat-skill" + skillNumber + "-button";
		button.textContent = hvStat.battle.enhancement.skillButton.getLabelById(skill.id);
		if (!skill.available) {
			button.style.cssText += "opacity: 0.3;";
		}
		button.addEventListener("click", function (event) {
			hvStat.battle.command.menuItemMap["Skill" + skillNumber].select();
			monster.onclick();
		});
		return button;
	},
};

hvStat.battle.enhancement.monsterLabel = {
	replaceWithNumber: function () {
		var targets = document.querySelectorAll('div.btm2 > div > img');
		for (var i = 0; i < targets.length; i++) {
			var target = targets[i];
			target.className += " hvstat-monster-number";
			var parentNode = target.parentNode;
			var div = document.createElement("div");
			div.textContent = "MON";
			parentNode.appendChild(div);
			div = document.createElement("div");
			div.textContent = String((i + 1) % 10);
			parentNode.appendChild(div);
		}
	},
};

//------------------------------------
// Battle - Monster Management
//------------------------------------
hvStat.battle.monster = {
	monsters: [],	// Instances of hvStat.battle.Monster
	initialize: function () {
		for (var i = 0; i < hv.battle.elementCache.monsters.length; i++) {
			hvStat.battle.monster.monsters[i] = new hvStat.battle.monster.Monster(i);
			if (hvStat.roundContext.monsters[i]) {
				hvStat.battle.monster.monsters[i].setFromValueObject(hvStat.roundContext.monsters[i]);
			}
		}
	},
	get areAllMonstersFinishedGettingFromDb() {
		for (var i = 0; i < this.monsters.length; i++) {
			if (this.monsters[i].isWaitingForGetResponse) {
				return false;
			}
		}
		return true;
	},
	showHealthAll: function () {
		for (var i = 0; i < this.monsters.length; i++) {
			this.monsters[i].renderHealth();
		}
	},
	showStatusAll: function () {
		for (var i = 0; i < this.monsters.length; i++) {
			this.monsters[i].renderStats();
		}
	},
	findByName: function (monsterName) {
		for (var i = 0; i < this.monsters.length; i++) {
			var monster = this.monsters[i];
			if (monster.name === monsterName) {
				return monster;
			}
		}
		return null;
	},
};

hvStat.battle.monster.popup = {
	timerId: null,
	initialize: function () {
		for (var i = 0; i < hvStat.battle.monster.monsters.length; i++) {
			var monsterElement = hvStat.battle.monster.monsters[i].baseElement;
			monsterElement.addEventListener("mouseover", this.onmouseover);
			monsterElement.addEventListener("mouseout", this.onmouseout);
		}
	},
	show: function (event) {
		var i, index = -1;
		for (i = 0; i < hvStat.battle.monster.monsters.length; i++) {
			if (hvStat.battle.monster.monsters[i].baseElement.id === this.id) {
				index = i;
				break;
			}
		}
		if (index < 0) return;
		var html = hvStat.battle.monster.monsters[index].renderPopup();
		hv.elementCache.popup.style.width = "270px";
		hv.elementCache.popup.style.height = "auto";
		hv.elementCache.popup.innerHTML = html;
		var popupTopOffset = hv.battle.elementCache.monsterPane.offsetTop +
			index * ((hv.battle.elementCache.monsterPane.scrollHeight - hv.elementCache.popup.scrollHeight) / 9);
		var popupLeftOffset = hvStat.settings.isMonsterPopupPlacement ? 1245 : 555;
		hv.elementCache.popup.style.top = popupTopOffset + "px";
		hv.elementCache.popup.style.left = popupLeftOffset + "px";
		hv.elementCache.popup.style.visibility = "visible";
	},
	hide: function () {
		hv.elementCache.popup.style.visibility = "hidden";
	},
	onmouseover: function (event) {
		(function (event, that) {
			var popup = hvStat.battle.monster.popup;
			var delay = Number(hvStat.settings.monsterPopupDelay);
			popup.timerId = setTimeout(function () {
				popup.show.call(that, event);
			}, delay);
		})(event, this);
	},
	onmouseout: function (event) {
		var popup = hvStat.battle.monster.popup;
		popup.hide();
		clearTimeout(popup.timerId);
	},
};

hvStat.battle.monster.MonsterSkill = function (vo) {
	this._id = vo.id || null;
	this._name = vo.name || null;
	this._lastUsedDate = vo.lastUsedDate ? new Date(vo.lastUsedDate) : null;
	this._skillType = hvStat.constant.skillType[vo.skillType] || null;
	this._attackType = hvStat.constant.attackType[vo.attackType] || null;
	this._damageType = hvStat.constant.damageType[vo.damageType] || null;
};
hvStat.battle.monster.MonsterSkill.prototype = {
	get name() { return this._name; },
	get lastUsedDate() { return this._lastUsedDate; },
	set lastUsedDate(date) { this._lastUsedDate = date; },
	get skillType() { return this._skillType; },
	get attackType() { return this._attackType; },
	get damageType() { return this._damageType; },
	get valueObject() {
		var vo = new hvStat.vo.MonsterSkillVO();
		vo.id = this._id;
		vo.name = this._name;
		vo.lastUsedDate = this._lastUsedDate ? this._lastUsedDate.toISOString() : null;
		vo.skillType = this._skillType ? this._skillType.id : null;
		vo.attackType = this._attackType ? this._attackType.id : null;
		vo.damageType = this._damageType ? this._damageType.id : null;
		vo.createKey();
		return vo;
	},
	toString: function (abbrLevel) {
		return this._attackType.toString(abbrLevel) + "-" + (this._damageType ? this._damageType.toString(abbrLevel) : "?");
	},
};

hvStat.battle.monster.MonsterScanResults = function (vo) {
	this._damageTypesToBeHidden = [];
	var i, len = this.damageTypes.length;
	for (i = 0; i < len; i++) {
		if (hvStat.settings.hideSpecificDamageType[i]) {
			this._damageTypesToBeHidden.push(this.damageTypes[i]);
		}
	}

	this._id = vo.id || null;
	this._lastScanDate = vo.lastScanDate ? new Date(vo.lastScanDate) : null;
	this._name = vo.name || null;
	this._monsterClass = hvStat.constant.monsterClass[vo.monsterClass] || null;
	this._powerLevel = vo.powerLevel || null;
	this._trainer = vo.trainer || null;
	this._meleeAttack = hvStat.constant.damageType[vo.meleeAttack] || null;
	this._defenseLevel = {};
	this._debuffsAffected = [];
	this._defWeak = [];
	this._defResistant = [];
	this._defImpervious = [];

	var damageTypeId, debuffId;
	for (damageTypeId in hvStat.constant.damageType) {
		this._defenseLevel[damageTypeId] = hvStat.constant.defenseLevel[(vo.defenseLevel || vo.defenceLevel)[damageTypeId]] || null;
	}
	for (damageTypeId in this._defenseLevel) {
		switch (this._defenseLevel[damageTypeId]) {
		case hvStat.constant.defenseLevel.WEAK:
			this._defWeak.push(hvStat.constant.damageType[damageTypeId]);
			break;
		case hvStat.constant.defenseLevel.RESISTANT:
			this._defResistant.push(hvStat.constant.damageType[damageTypeId]);
			break;
		case hvStat.constant.defenseLevel.IMPERVIOUS:
			this._defImpervious.push(hvStat.constant.damageType[damageTypeId]);
			break;
		}
	}
	for (i in vo.debuffsAffected) {
		this._debuffsAffected.push(hvStat.constant.debuff[vo.debuffsAffected[i]]);
	}
};
hvStat.battle.monster.MonsterScanResults.prototype = {
	damageTypes: [
		hvStat.constant.damageType.CRUSHING,
		hvStat.constant.damageType.SLASHING,
		hvStat.constant.damageType.PIERCING,
		hvStat.constant.damageType.FIRE,
		hvStat.constant.damageType.COLD,
		hvStat.constant.damageType.ELEC,
		hvStat.constant.damageType.WIND,
		hvStat.constant.damageType.HOLY,
		hvStat.constant.damageType.DARK,
		hvStat.constant.damageType.SOUL,
		hvStat.constant.damageType.VOID
	],
	damageTypeGeneralizingTable: [
		{
			generic: hvStat.constant.genericDamageType.PHYSICAL,
			elements: [
				hvStat.constant.damageType.CRUSHING,
				hvStat.constant.damageType.SLASHING,
				hvStat.constant.damageType.PIERCING,
			]
		},
		{
			generic: hvStat.constant.genericDamageType.ELEMENTAL,
			elements: [
				hvStat.constant.damageType.FIRE,
				hvStat.constant.damageType.COLD,
				hvStat.constant.damageType.ELEC,
				hvStat.constant.damageType.WIND,
			]
		},
	],
	_hideDamageTypes: function (source) {
		var i, j;
		var damageTypes = source.concat();
		for (i = 0; i < this._damageTypesToBeHidden.length; i++) {
			for (j = damageTypes.length - 1; j >= 0; j--) {
				if (damageTypes[j] === this._damageTypesToBeHidden[i]) {
					damageTypes.splice(j, 1);
				}
			}
		}
		return damageTypes;
	},
	_generalizeDamageTypes: function (source, damageTypes) {
		damageTypes = source.concat();
		var i, lenTable, indices;
		var j, lenTableElem, index;

		lenTable = this.damageTypeGeneralizingTable.length;
		for (i = 0; i < this.damageTypeGeneralizingTable.length; i++) {
			indices = [];
			lenTableElem = this.damageTypeGeneralizingTable[i].elements.length;
			for (j = 0; j < lenTableElem; j++) {
				index = damageTypes.indexOf(this.damageTypeGeneralizingTable[i].elements[j]);
				if (index >= 0) {
					indices.push(index);
				}
			}
			if (indices.length === lenTableElem) {
				for (j = lenTableElem - 1; j >= 0; j--) {
					if (j > 0) {
						damageTypes.splice(indices[j], 1);
					} else {
						damageTypes[indices[j]] = this.damageTypeGeneralizingTable[i].generic;
					}
				}
			}
		}
		return damageTypes;
	},
	_filterDamageTypes: function (damageTypes, hiding, generalizing) {
		if (hiding) {
			damageTypes = this._hideDamageTypes(damageTypes);
		}
		if (generalizing) {
			damageTypes = this._generalizeDamageTypes(damageTypes);
		}
		return damageTypes;
	},
	_stringifyDamageTypes: function (damageTypes, abbrLevel) {
		var damageTypeStrings = [];
		var delimiter = hvStat.constant.delimiter.toString(abbrLevel);
		for (var i = 0; i < damageTypes.length; i++) {
			damageTypeStrings[i] = damageTypes[i].toString(abbrLevel);
		}
		return damageTypeStrings.join(delimiter);
	},

	get lastScanDate() { return this._lastScanDate; },
	get monsterClass() { return this._monsterClass; },
	get powerLevel() { return this._powerLevel; },
	get trainer() { return this._trainer; },
	get meleeAttack() { return this._meleeAttack; },
	get defenseLevel() {
		var i, dl = {};
		for (i in this._defenseLevel) {
			dl[i] = this._defenseLevel[i];
		}
		return dl;
	},
	get debuffsAffected() { return this._debuffsAffected.concat(); },
	get defWeak() { return this._defWeak.concat(); },
	get defResistant() { return this._defResistant.concat(); },
	get defImpervious() { return this._defImpervious.concat(); },
	get valueObject() {
		var i, len;
		var vo = new hvStat.vo.MonsterScanResultsVO();
		vo.id = this._id;
		vo.lastScanDate = this._lastScanDate ? this._lastScanDate.toISOString() : null;
		vo.name = this._name;
		vo.monsterClass = this._monsterClass ? this._monsterClass.id : null;
		vo.powerLevel = this._powerLevel;
		vo.trainer = this._trainer;
		vo.meleeAttack = this._meleeAttack ? this._meleeAttack.id : null;
		for (i in this._defenseLevel) {
			vo.defenseLevel[i] = this._defenseLevel[i].id;
		}
		len = this._debuffsAffected.length;
		for (i = 0; i < len; i++) {
			vo.debuffsAffected[i] = this._debuffsAffected[i].id;
		}
		return vo;
	},
	getDefWeakString: function (hiding, generalizing, abbrLevel) {
		var damageTypes = this._filterDamageTypes(this._defWeak, hiding, generalizing);
		return this._stringifyDamageTypes(damageTypes, abbrLevel);
	},
	getDefResistantString: function (hiding, generalizing, abbrLevel) {
		var damageTypes = this._filterDamageTypes(this._defResistant, hiding, generalizing);
		return this._stringifyDamageTypes(damageTypes, abbrLevel);
	},
	getDefImperviousString: function (hiding, generalizing, abbrLevel) {
		var damageTypes = this._filterDamageTypes(this._defImpervious, hiding, generalizing);
		return this._stringifyDamageTypes(damageTypes, abbrLevel);
	},
	fromRegexResult: function (index, regexResult) {
		var vo = new hvStat.vo.MonsterScanResultsVO();
		vo.lastScanDate = (new Date()).toISOString();
		vo.monsterClass = regexResult[3].toUpperCase() || null;
		vo.powerLevel = Number(regexResult[4]) || null;
		vo.trainer = regexResult[5] || null;
		vo.meleeAttack = regexResult[6].toUpperCase() || null;
		var array;
		var defWeak = regexResult[7] || null;
		if (defWeak) {
			array = defWeak.toUpperCase().split(", ");
			array.forEach(function (element, index, array) {
				if (element !== "NOTHING") {
					vo.defenseLevel[element] = hvStat.constant.defenseLevel.WEAK.id;
				}
			});
		}
		var defResistant = regexResult[8] || null;
		if (defResistant) {
			array = defResistant.toUpperCase().split(", ");
			array.forEach(function (element, index, array) {
				if (element !== "NOTHING") {
					vo.defenseLevel[element] = hvStat.constant.defenseLevel.RESISTANT.id;
				}
			});
		}
		var defImpervious = regexResult[9] || null;
		if (defImpervious) {
			array = defImpervious.toUpperCase().split(", ");
			array.forEach(function (element, index, array) {
				if (element !== "NOTHING") {
					vo.defenseLevel[element] = hvStat.constant.defenseLevel.IMPERVIOUS.id;
				}
			});
		}
		vo.debuffsAffected = [];
		var i, debuffElements, debuffInfo, debuffId;
		debuffElements = hv.battle.elementCache.monsters[index].querySelectorAll('div.btm6 > img');
		for (i = 0; i < debuffElements.length; i++) {
			debuffInfo = debuffElements[i].getAttribute("onmouseover");
			for (debuffId in hvStat.constant.debuff) {
				if (debuffInfo.indexOf(hvStat.constant.debuff[debuffId].name) >= 0) {
					vo.debuffsAffected.push(debuffId);
				}
			}
		}
		return new hvStat.battle.monster.MonsterScanResults(vo);
	},
};

hvStat.battle.monster.Monster = function (index) {
	this.maxGaugeWidth = 120;
	this._index = index;
	this._baseElement = hv.battle.elementCache.monsters[this._index];
	this._gauges = null;
	this._waitingForGetResponseOfMonsterScanResults = false;
	this._waitingForGetResponseOfMonsterSkills = false;
	this._id = null;
	this._name = null;
	this._maxHp = null;
	this.actualHealthPoint = 0;
	this._prevMpRate = null;
	this._prevSpRate = null;
	this._scanResult = null;
	this._skills = [];
};
hvStat.battle.monster.Monster.prototype = {
	gaugeRate: function (gaugeIndex) {
		return hv.util.getGaugeRate(this.gauges[gaugeIndex], this.maxGaugeWidth);
	},
	get healthPoints() {
		var v = this.healthPointRate * this._maxHp;
		if (!this.isDead && v === 0) {
			v = 1;
		}
		var acceptableRange = this._maxHp / this.maxGaugeWidth;
		if (v - acceptableRange < this.actualHealthPoint && this.actualHealthPoint < v + acceptableRange) {
			// actualHealthPoint is probably correct
			v = this.actualHealthPoint;
		}
		return v;
	},
	get isWaitingForGetResponse() {
		return this._waitingForGetResponseOfMonsterScanResults || this._waitingForGetResponseOfMonsterSkills;
	},
	get magicSkills() {
		var that = this;
		var magicSkills = [];
		var i, skill;
		var len = that._skills.length;
		for (i = 0; i < len; i++) {
			skill = that._skills[i];
			if (skill.skillType === hvStat.constant.skillType.MANA) {
				magicSkills.push(skill);
			}
		}
		return magicSkills;
	},
	get doesMagicSkillExist() {
		return this.magicSkills.length > 0;
	},
	get magicSkillTable() {
		var that = this;
		var magicSkills = that.magicSkills;
		var damageTable = {
			CRUSHING: false,
			SLASHING: false,
			PIERCING: false,
			FIRE: false,
			COLD: false,
			ELEC: false,
			WIND: false,
			HOLY: false,
			DARK: false,
			SOUL: false,
			VOID: false
		};
		var skillTable = {
			PHYSICAL: { exists: false, damageTable: {} },
			MAGICAL: { exists: false, damageTable: {} }
		};
		skillTable.PHYSICAL.damageTable = Object.create(damageTable);
		skillTable.MAGICAL.damageTable = Object.create(damageTable);
		var skillType, damageType;
		for (var i = 0; i < magicSkills.length; i++) {
			attackType = magicSkills[i].attackType.id;
			damageType = magicSkills[i].damageType.id;
			skillTable[attackType].exists = true;
			skillTable[attackType].damageTable[damageType] = true;
		}
		return skillTable;
	},
	get spiritSkill() {
		var that = this;
		var i, skill;
		var len = that._skills.length;
		for (i = 0; i < len; i++) {
			skill = that._skills[i];
			if (skill.skillType === hvStat.constant.skillType.SPIRIT) {
				return skill;
			}
		}
		return null;
	},
	_renderStats: function () {
		var that = this;
		if (that.isDead) {
			return;
		}
		if (!(hvStat.settings.showMonsterHP ||
				hvStat.settings.showMonsterMP ||
				hvStat.settings.showMonsterSP ||
				hvStat.settings.showMonsterInfoFromDB)) {
			return;
		}

		var nameOuterFrameElement = that._baseElement.children[1];
		var nameInnerFrameElement = that._baseElement.children[1].children[0];
		var maxAbbrLevel = hvStat.settings.ResizeMonsterInfo ? 5 : 1;
		var maxStatsWidth = 315;

		var html, statsHtml;
		var div;
		var abbrLevel;

		if (hvStat.settings.showMonsterInfoFromDB) {
			for (abbrLevel = 0; abbrLevel < maxAbbrLevel; abbrLevel++) {
				statsHtml = '';
				if (!that._scanResult || !that._scanResult.monsterClass) {
//					if (hvStat.settings.showNewLabelForUnknownMonster) {
						statsHtml = '[<span class="hvstat-monster-status-unknown">NEW</span>]';
//					}
				} else {
					// Class and power level
					if (hvStat.settings.showMonsterClassFromDB || hvStat.settings.showMonsterPowerLevelFromDB) {
						statsHtml += '{';
					}
					if (hvStat.settings.showMonsterClassFromDB) {
						statsHtml += '<span class="hvstat-monster-status-class">';
						statsHtml += that._scanResult.monsterClass.toString(abbrLevel);
						statsHtml += '</span>';
					}
					if (hvStat.settings.showMonsterPowerLevelFromDB && that._scanResult.powerLevel) {
						if (hvStat.settings.showMonsterClassFromDB) {
							statsHtml += hvStat.constant.delimiter.toString(abbrLevel);
						}
						statsHtml += '<span class="hvstat-monster-status-power-level">';
						statsHtml += that._scanResult.powerLevel + '+';
						statsHtml += '</span>';
					}
					if (hvStat.settings.showMonsterClassFromDB || hvStat.settings.showMonsterPowerLevelFromDB) {
						statsHtml += '}';
					}
					// Weaknesses and resistances
					if (hvStat.settings.showMonsterWeaknessesFromDB || hvStat.settings.showMonsterResistancesFromDB) {
						statsHtml += '[';
					}
					if (hvStat.settings.showMonsterWeaknessesFromDB) {
						statsHtml += '<span class="hvstat-monster-status-weakness">';
						statsHtml += (that._scanResult.defWeak.length > 0) ? that._scanResult.getDefWeakString(true, true, abbrLevel) : "-";
						statsHtml += '</span>';
					}
					if (hvStat.settings.showMonsterResistancesFromDB) {
						if (hvStat.settings.showMonsterWeaknessesFromDB) {
							statsHtml += '|';
						}
						statsHtml += '<span class="hvstat-monster-status-resistance">';
						statsHtml += (that._scanResult.defResistant.length > 0) ? that._scanResult.getDefResistantString(true, true, abbrLevel) : '-';
						statsHtml += '</span>';
						if (that._scanResult.defImpervious.length > 0) {
							statsHtml += '|<span class="hvstat-monster-status-imperviableness">';
							statsHtml += that._scanResult.getDefImperviousString(true, true, abbrLevel);
							statsHtml += '</span>';
						}
					}
					if (hvStat.settings.showMonsterWeaknessesFromDB || hvStat.settings.showMonsterResistancesFromDB) {
						statsHtml += "]";
					}
				}
				// Melee attack and skills
				if (hvStat.settings.showMonsterAttackTypeFromDB) {
					var isMeleeAttackKnown = that._scanResult && that._scanResult.meleeAttack;
					var magicSkills = that.magicSkills;
					var doesMagicSkillExist = that.doesMagicSkillExist;
					var spiritSkill = that.spiritSkill;
					if (isMeleeAttackKnown || doesMagicSkillExist || spiritSkill) {
						statsHtml += '(';
					}
					// Melee attack
					if (isMeleeAttackKnown) {
						statsHtml += '<span class="hvstat-monster-status-melee-attack-type">';
						statsHtml += that._scanResult.meleeAttack.toString(abbrLevel > 0 ? abbrLevel : 1);
						statsHtml += '</span>';
					}
					// Magic skills
					if (doesMagicSkillExist) {
						if (isMeleeAttackKnown) {
							statsHtml += ';';
						}
						statsHtml += '<span class="hvstat-monster-status-magic-skill-attack-type">';
						var skillTable = that.magicSkillTable;
						var attackTypeCount, damageTypeCount;
						attackTypeCount = 0;
						for (var attackType in skillTable) {
							if (skillTable[attackType].exists) {
								if (attackTypeCount > 0) {
									statsHtml += '|';
								}
								damageTypeCount = 0;
								for (var damageType in skillTable[attackType].damageTable) {
									if (skillTable[attackType].damageTable[damageType]) {
										if (damageTypeCount === 0) {
											statsHtml += hvStat.constant.attackType[attackType].toString(abbrLevel > 0 ? abbrLevel : 1) + '-';
										} else {
											statsHtml += hvStat.constant.delimiter.toString(abbrLevel);
										}
										statsHtml += hvStat.constant.damageType[damageType].toString(abbrLevel > 0 ? abbrLevel : 1);
										damageTypeCount++;
									}
								}
								attackTypeCount++;
							}
						}
						statsHtml += '</span>';
					}
					// Spirit skill
					if (spiritSkill) {
						if (!doesMagicSkillExist) {
							statsHtml += ';';
						} else {
							statsHtml += '|';
						}
						statsHtml += '<span class="hvstat-monster-status-spirit-skill-attack-type">';
						statsHtml += spiritSkill.toString(abbrLevel > 0 ? abbrLevel : 1);
						statsHtml += '</span>';
					}
					if (isMeleeAttackKnown || doesMagicSkillExist || spiritSkill) {
						statsHtml += ')';
					}
				}
				if (hv.settings.isUsingHVFontEngine) {
					nameOuterFrameElement.style.width = "auto"; // Tweak for Firefox
					nameInnerFrameElement.style.width = "auto"; // Tweak for Firefox
					nameInnerFrameElement.lastChild.style.clear = "none";
					div = document.createElement("div");
					div.className ="hvstat-monster-status-on-hv-font";
					div.innerHTML = statsHtml;
					nameInnerFrameElement.parentNode.insertBefore(div, nameInnerFrameElement.nextSibling);
					//console.log("scrollWidth = " + div.prop("scrollWidth"));
					if (Number(nameOuterFrameElement.scrollWidth) <= maxStatsWidth) {	// Does not work with Firefox without tweak
						break;
					} else if (abbrLevel < maxAbbrLevel - 1) {
						// Revert
						nameInnerFrameElement.parentNode.removeChild(div);
					}
				} else {
					html = '<div class="hvstat-monster-status-on-custom-font">' + statsHtml + "</div>";
					var nameElement = nameInnerFrameElement.children[0];
					var name = nameElement.innerHTML;
					nameOuterFrameElement.style.width = "auto"; // Tweak for Firefox
					nameInnerFrameElement.style.width = "auto"; // Tweak for Firefox
					nameElement.innerHTML = name + html;
					nameElement.style.whiteSpace = "nowrap";
					//console.log("scrollWidth = " + nameElement.prop("scrollWidth"));
					if (Number(nameElement.scrollWidth) <= maxStatsWidth) {	// Does not work with Firefox without tweak
						break;
					} else if (hvStat.settings.ResizeMonsterInfo) {
						// Revert
						nameElement.innerHTML = name;
						if (abbrLevel >= maxAbbrLevel - 1) {
							// Reduce name length
							for (var len = name.length - 2; len >= 6; len--) {
								var reducedName = name.substring(0, len) + "...";
								nameElement.innerHTML = reducedName + html;
								//console.log("scrollWidth = " + nameElement.prop("scrollWidth"));
								if (Number(nameElement.scrollWidth) <= maxStatsWidth) {	// does not work with Firefox without tweak
									break;
								}
							}
						}
					}
				}
			}
			nameOuterFrameElement.style.width = String(maxStatsWidth) + "px";

			if (hvStat.settings.highlightScanButtonWhenScanResultExpired) {
				var doesScanResultExist = that.doesScanResultExist;
				var getElapsedDaysFrom = function (date) {
					var mins = 0, hours = 0, days = 0;
					mins = Math.floor(((new Date()).getTime() - date.getTime()) / (60 * 1000));
					if (mins >= 60) {
						hours = Math.floor(mins / 60);
						mins = mins % 60;
					}
					if (hours >= 24) {
						days = Math.floor(hours / 24);
						hours = hours % 24;
					}
					return days;
				};
				if (!doesScanResultExist || getElapsedDaysFrom(that._scanResult.lastScanDate) >= Number(hvStat.settings.nDaysUntilScanResultExpiration)) {
					var scanButton = hvStat.battle.enhancement.scanButton.elements[that._index];
					if (scanButton) {
						scanButton.className += " hvstat-scan-button-highlight";
					}
				}
			}
		}
	},
	_renderPopup: function () {
		var that = this;
		var i, len, skill, lastScanString;
		var doesScanResultExist = that.doesScanResultExist;
		var html = '<table cellspacing="0" cellpadding="0" style="width:100%">' +
			'<tr class="monname"><td colspan="2"><b>' + that._name + '</b></td></tr>' +
			'<tr><td width="33%">ID: </td><td>' + that._id + '</td></tr>' +
			'<tr><td>Health: </td><td>' + that.healthPoints.toFixed(1) + ' / ' + that._maxHp.toFixed(1) + '</td></tr>' +
			'<tr><td>Mana: </td><td>' + (that.magicPointRate * 100).toFixed(2) + '%</td></tr>';
		if (that.hasSpiritPoint) {
			html += '<tr><td>Spirit: </td><td>' + (that.spiritPointRate * 100).toFixed(2) + '%</td></tr>';
		}
		if (doesScanResultExist) {
			html += '<tr><td>Class:</td><td>' + (that._scanResult.monsterClass ? that._scanResult.monsterClass : "") + '</td></tr>' +
				'<tr><td>Trainer:</td><td>' + (that._scanResult.trainer ? that._scanResult.trainer : "") + '</td></tr>';
			if (that._scanResult.powerLevel) {
				html += '<tr><td>Power Level:</td><td>' + that._scanResult.powerLevel + '</td></tr>';
			}
			html += '<tr><td>Melee Attack:</td><td>' + (that._scanResult.meleeAttack ? that._scanResult.meleeAttack : "") + '</td></tr>';
		}
		var magicSkills = that.magicSkills;
		if (magicSkills && magicSkills.length > 0) {
			html += '<tr><td valign="top">Skills:</td><td>';
			len = magicSkills.length;
			var skillTable = that.magicSkillTable;
			var skillCount = 0;
			for (var attackType in skillTable) {
				if (skillTable[attackType].exists) {
					for (var damageType in skillTable[attackType].damageTable) {
						if (skillTable[attackType].damageTable[damageType]) {
							if (skillCount > 0) {
								html += '<br/>';
							}
							html += hvStat.constant.attackType[attackType].name + '-' + hvStat.constant.damageType[damageType].name;
							skillCount++;
						}
					}
				}
			}
			html += '</td></tr>';
		}
		var spiritSkill = that.spiritSkill;
		if (spiritSkill) {
			html += '<tr><td>Spirit Skill:</td><td>';
			html += spiritSkill.toString();
			html += '</td></tr>';
		}
		lastScanString = "Never";
		if (doesScanResultExist) {
			html += '<tr><td>Weak against:</td><td>' + (that._scanResult.defWeak.length > 0 ? that._scanResult.getDefWeakString(false, true, 0) : "-") + '</td></tr>' +
				'<tr><td>Resistant to:</td><td>' + (that._scanResult.defResistant.length > 0 ? that._scanResult.getDefResistantString(false, true, 0) : "-") + '</td></tr>' +
				'<tr><td>Impervious to:</td><td>' + (that._scanResult.defImpervious.length > 0 ? that._scanResult.getDefImperviousString(false, true, 0) : "-") + '</td></tr>' +
				'<tr><td>Debuffs affected:</td><td>' + (that._scanResult.debuffsAffected.length > 0 ? that._scanResult.debuffsAffected.join(", ") : "-") + '</td></tr>';
			if (that._scanResult.lastScanDate) {
				lastScanString = hvStat.util.getDateTimeString(that._scanResult.lastScanDate);
			}
		}
		html += '<tr><td valign="top">Last Scan:</td><td>' + lastScanString + '</td></tr>';
		if (doesScanResultExist && that._scanResult.lastScanDate) {
			html += '<tr><td></td><td>' + hvStat.util.getElapseFrom(that._scanResult.lastScanDate) + ' ago</td></tr>';
		}
		html += '</table>';
		return html;
	},
	get gauges() {
		if (!this._gauges) {
			this._gauges = this._baseElement.querySelectorAll('div.btm5 img.chb2');
		}
		return this._gauges;
	},
	get id() { return this._id; },
	get name() { return this._name; },
	get maxHp() { return this._maxHp; },
	get healthPointRate() {
		return this.gaugeRate(0);
	},
	get magicPointRate() {
		return this.gaugeRate(1);
	},
	get spiritPointRate() {
		return this.gaugeRate(2);
	},
	get hasSpiritPoint() {
		return this.gauges.length > 2;
	},
	get isDead() {
		return !!this._baseElement.style.cssText.match(/opacity\s*\:\s*0/i);
	},
	get scanResult() { return this._scanResult; },
	get doesScanResultExist() {
		return !!(this._scanResult && this._scanResult.monsterClass);
	},
	get skills() { return this._skills; },
	get valueObject() {
		var vo = new hvStat.vo.MonsterVO();
		vo.id = this._id;
		vo.name = this._name;
		vo.maxHp = this._maxHp;
		vo.actualHealthPoint = this.actualHealthPoint;
		vo.prevMpRate = this.magicPointRate;
		vo.prevSpRate = this.spiritPointRate;
		vo.scanResult = this._scanResult ? this._scanResult.valueObject : null;
		for (var i = 0; i < this._skills.length; i++) {
			vo.skills[i] = this._skills[i].valueObject;
		}
		return vo;
	},
	get baseElement() { return this._baseElement; },

	set id(id) { this._id = id; },
	set name(name) { this._name = name; },
	set maxHp(maxHp) { this._maxHp = maxHp; },

	initialize: function (mid, name, hp) {
		this._id = Number(mid);
		this._name = name;
		this._maxHp = Number(hp);
		this.actualHealthPoint = this._maxHp;
	},
	storeScanResult: function (regexResult) {
		var that = this;
		that._scanResult = hvStat.battle.monster.MonsterScanResults.prototype.fromRegexResult(that._index, regexResult);
		(function (that) {
			hvStat.database.idbAccessQueue.add(function () {
				that.putScanResultToDB();
			});
		})(that);
	},
	storeSkill: function (skillName, skillVerb, damageType) {
		var that = this;
		var i;
		var skillType = (that._prevSpRate <= that.spiritPointRate) ? hvStat.constant.skillType.MANA : hvStat.constant.skillType.SPIRIT;
		var vo = new hvStat.vo.MonsterSkillVO();
		vo.name = skillName;
		vo.skillType = skillType.id;
		switch (skillVerb) {
		case "uses":
			vo.attackType = hvStat.constant.attackType.PHYSICAL.id;
			break;
		case "casts":
			vo.attackType = hvStat.constant.attackType.MAGICAL.id;
			break;
		default:
			vo.attackType = null;
		}
		var dt = hvStat.constant.damageType[damageType.toUpperCase()];
		vo.damageType = dt ? dt.id : null;
		vo.lastUsedDate = new Date();
		var skill = new hvStat.battle.monster.MonsterSkill(vo);
		if (skillType === hvStat.constant.skillType.SPIRIT) {
			// Spirit skill
			// Overwrite if exists
			for (i = 0; i < that._skills.length; i++) {
				if (that._skills[i].skillType ===  hvStat.constant.skillType.SPIRIT) {
					break;
				}
			}
			that._skills[i] = skill;
		} else {
			// Magic skill
			// Overwrite if same name or name is null
			for (i = 0; i < that._skills.length; i++) {
				if (that._skills[i].skillType ===  hvStat.constant.skillType.MANA &&
						(that._skills[i].name === skill.name ||
							(that._skills[i].name === null && that._skills[i].attackType === skill.attackType && that._skills[i].damageType === skill.damageType))) {
					break;
				}
			}
			that._skills[i] = skill;
		}
		(function (that) {
			hvStat.database.idbAccessQueue.add(function () {
				that.putSkillsToDB();
			});
		})(that);
	},
	setFromValueObject: function (valueObject) {
		var that = this;
		var vo = valueObject;
		that._id = vo.id;
		that._name = vo.name;
		that._maxHp = vo.maxHp;
		that.actualHealthPoint = vo.actualHealthPoint;
		that._prevMpRate = vo.prevMpRate;
		that._prevSpRate = vo.prevSpRate;
		that._scanResult = vo.scanResult ? new hvStat.battle.monster.MonsterScanResults(vo.scanResult) : null;
		vo.skills.forEach(function (element, index, array) {
			that._skills.push(new hvStat.battle.monster.MonsterSkill(element));
		});
	},
	getFromDB: function (callback) {
		var that = this;
		if (!that._id) {
			return;
		}
		var tx = hvStat.database.idb.transaction(["MonsterScanResults", "MonsterSkills"], "readonly");
		var scanResultsStore = tx.objectStore("MonsterScanResults");
		var skillsStore = tx.objectStore("MonsterSkills");
		// MonsterScanResults
		var reqGet = scanResultsStore.get(that._id);
		that._waitingForGetResponseOfMonsterScanResults = true;
		reqGet.onsuccess = function (event) {
			that._waitingForGetResponseOfMonsterScanResults = false;
			//console.debug(event.target.result);
			if (event.target.result === undefined) {
				//console.log("get from MonsterScanResults: not found: id = " + that._id);
			} else {
				//console.log("get from MonsterScanResults: success: id = " + that._id);
				that._scanResult = new hvStat.battle.monster.MonsterScanResults(event.target.result);
				//console.debug(that._scanResult.valueObject);
			}
			if (!that.isWaitingForGetResponse) {
				callback();
			}
		};
		reqGet.onerror = function (event) {
			that._waitingForGetResponseOfMonsterScanResults = false;
			console.log("get from MonsterScanResults: error");
		};
		// MonsterSkills
		reqGet = skillsStore.get(that._id);
		var idx = skillsStore.index("ix_id");
		var range = IDBKeyRange.bound(that._id, that._id);
		var reqOpen = idx.openCursor(range, "next");
		that._waitingForGetResponseOfMonsterSkills = true;
		reqOpen.onsuccess = function () {
			var cursor = this.result;
			if (cursor) {
				//console.debug(cursor.value);
				var skill = new hvStat.battle.monster.MonsterSkill(cursor.value);
				//console.debug(skill.valueObject);
				that._skills.push(skill);
				//console.log("get from MonsterSkills: id = " + that._id);
				cursor.continue();
			} else {
				that._waitingForGetResponseOfMonsterSkills = false;
				//console.log("get from MonsterSkills: finished: id = " + that._id);
			}
			if (!that.isWaitingForGetResponse) {
				callback();
			}
		};
		reqOpen.onerror = function () {
			that._waitingForGetResponseOfMonsterSkills = false;
			console.log('request error.');
		};
	},
	putScanResultToDB: function () {
		var that = this;
		if (!that._id || !that._scanResult) {
			return;
		}
		var tx = hvStat.database.idb.transaction(["MonsterScanResults"], "readwrite");
		var scanResultsStore = tx.objectStore("MonsterScanResults");
		var vo = that._scanResult.valueObject;
		vo.id = that._id;
		vo.name = that._name;
		var reqPut = scanResultsStore.put(vo);
		reqPut.onsuccess = function (event) {
			//console.log("putScanResultToDB: success: id = " + that._id);
		};
		reqPut.onerror = function (event) {
			console.log("putScanResultToDB: error: id = " + that._id);
		};
	},
	putSkillsToDB: function () {
		var that = this;
		if (!that._id) {
			return;
		}
		// Put after delete
		var tx = hvStat.database.idb.transaction(["MonsterSkills"], "readwrite");
		var skillsStore = tx.objectStore("MonsterSkills");
		var range = IDBKeyRange.bound(that._id, that._id);
		var reqOpen = skillsStore.openCursor(range, "next");
		reqOpen.onsuccess = function () {
			var i;
			var vo;
			var reqPut;
			var cursor = this.result;
			if (cursor) {
				// Delete
				cursor.delete();
				cursor.continue();
			} else {
				// Put
				for (i = 0; i < that._skills.length; i++) {
					vo = that._skills[i].valueObject;
					vo.id = that._id;
					vo.createKey();
					reqPut = skillsStore.put(vo);
					reqPut.onsuccess = function (event) {
						//console.log("putSkillsToDB: success: id = " + that._id);
					};
					reqPut.onerror = function (event) {
						console.log("putSkillsToDB: error: id = " + that._id);
					};
				}
			}
		};
		reqOpen.onerror = function () {
			console.log('request error.');
			alert('request error.');
		};
	},
	renderHealth: function () {
		var that = this;
		if (that.isDead || !hvStat.settings.showMonsterHP && !hvStat.settings.showMonsterMP && !hvStat.settings.showMonsterSP) {
			return;
		}
		var div;
		if (hvStat.settings.showMonsterHP || hvStat.settings.showMonsterHPPercent) {
			div = document.createElement("div");
			div.className = "hvstat-monster-health";
			if (hvStat.settings.showMonsterHPPercent) {
				div.textContent = (that.healthPointRate * 100).toFixed(2) + "%";
			} else if (this.healthPoints && that.maxHp) {
				div.textContent = that.healthPoints.toFixed(0) + " / " + that.maxHp.toFixed(0);
			}
			this.gauges[0].parentNode.insertBefore(div, null);
		}
		if (hvStat.settings.showMonsterMP) {
			div = document.createElement("div");
			div.className = "hvstat-monster-magic";
			div.textContent = (that.magicPointRate * 100).toFixed(1) + "%";
			this.gauges[1].parentNode.insertBefore(div, null);
		}
		if (hvStat.settings.showMonsterSP && this.hasSpiritPoint) {
			div = document.createElement("div");
			div.className = "hvstat-monster-spirit";
			div.textContent = (that.spiritPointRate * 100).toFixed(1) + "%";
			this.gauges[2].parentNode.insertBefore(div, null);
		}
	},
	renderStats: function () {
		this._renderStats();
	},
	renderPopup: function () {
		return this._renderPopup();
	},
	takeDamage: function (damageAmount) {
		this.actualHealthPoint -= damageAmount;
		if (this.actualHealthPoint < 0) {
			this.actualHealthPoint = 0;
		}
	},
	restoreHealthPoint: function (healingAmount) {
		this.actualHealthPoint += healingAmount;
		if (this.actualHealthPoint > this.maxHp) {
			this.actualHealthPoint = this.maxHp;
		}
	},
};

//------------------------------------
// Battle - Warning System
//------------------------------------
hvStat.battle.warningSystem = {
	alertQueue: [],
	enqueueAlert: function (message) {
		this.alertQueue.push(message);
	},
	alertAllFromQueue: function () {
		if (hvStat.settings.isCondenseAlerts) {
			if (this.alertQueue.length !== 0) {
				alert(this.alertQueue.join("\n\n"));
				this.alertQueue.length = 0;
			}
		} else {
			var i, len = this.alertQueue.length;
			for (i = 0; i < len; i++) {
				alert(this.alertQueue.shift());
			}
		}
	},
	stashAlerts: function () {
		hvStat.warningState.queuedAlerts = this.alertQueue;
		this.alertQueue = [];
		hvStat.storage.warningState.save();
	},
	restoreAlerts: function () {
		this.alertQueue = hvStat.warningState.queuedAlerts;
		hvStat.warningState.queuedAlerts = [];
		hvStat.storage.warningState.save();
	},
	warnHealthStatus: function () {
		var healthWarningLevel = Number(hvStat.settings.warnAlertLevel);
		var magicWarningLevel = Number(hvStat.settings.warnAlertLevelMP);
		var spiritWarningLevel = Number(hvStat.settings.warnAlertLevelSP);
		var healthWarningResumeLevel = Math.min(healthWarningLevel + 10, 100);
		var magicWarningResumeLevel = Math.min(magicWarningLevel + 10, 100);
		var spiritWarningResumeLevel = Math.min(spiritWarningLevel + 10, 100);
		if (!hv.battle.isRoundFinished) {
			if (hvStat.settings.isShowPopup) {
				if (hv.character.healthPercent <= healthWarningLevel && (!hvStat.warningState.healthAlertShown || hvStat.settings.isNagHP)) {
					this.enqueueAlert("Your health is dangerously low!");
					hvStat.warningState.healthAlertShown = true;
				}
				if (hv.character.magicPercent <= magicWarningLevel && (!hvStat.warningState.magicAlertShown || hvStat.settings.isNagMP)) {
					this.enqueueAlert("Your mana is dangerously low!");
					hvStat.warningState.magicAlertShown = true;
				}
				if (hv.character.spiritPercent <= spiritWarningLevel && (!hvStat.warningState.spiritAlertShown || hvStat.settings.isNagSP)) {
					this.enqueueAlert("Your spirit is dangerously low!");
					hvStat.warningState.spiritAlertShown = true;
				}
			}
			if (hvStat.settings.isAlertOverchargeFull && hv.character.overchargeRate >= 1.0 && !hvStat.warningState.overchargeAlertShown && !hvStat.battle.character.isSpiritStanceEnabled) {
				this.enqueueAlert("Your overcharge is full.");
				hvStat.warningState.overchargeAlertShown = true;
			}
		}
		if (hv.character.healthPercent >= healthWarningResumeLevel) {
			hvStat.warningState.healthAlertShown = false;
		}
		if (hv.character.magicPercent >= magicWarningResumeLevel) {
			hvStat.warningState.magicAlertShown = false;
		}
		if (hv.character.spiritPercent >= spiritWarningResumeLevel) {
			hvStat.warningState.spiritAlertShown = false;
		}
		if (hv.character.overchargeRate < 1.0) {
			hvStat.warningState.overchargeAlertShown = false;
		}
		hvStat.storage.warningState.save();
	},
	selfEffectNames: [
		"Protection", "Hastened", "Shadow Veil", "Regen", "Absorbing Ward",
		"Spark of Life", "Channeling", "Arcane Focus", "Heartseeker", "Spirit Shield",
		"_", "_", "_", "_",
		"Chain 1", "Chain 2",
	],
	monsterEffectNames: [
		"Vital Theft", "Slowed", "Weakened", "Asleep", "Confused",
		"Imperiled", "Blinded", "Silenced", "_", "Magically Snared",
		"_", "Coalesced Mana",
	],
	warnSelfEffectExpiring: function () {
		var elements = hv.battle.elementCache.characterEffectIcons;
		for (var i = 0; i < elements.length; i++) {
			var element = elements[i];
			var onmouseover = element.getAttribute("onmouseover");
			var result = hvStat.battle.constant.rInfoPaneParameters.exec(onmouseover);
			if (!result) continue;
			var effectName = result[1];
			var duration = result[2];
			for (var j = 0; j < this.selfEffectNames.length; j++) {
				if (hvStat.settings.isEffectsAlertSelf[j] &&
						(effectName + " ").indexOf(this.selfEffectNames[j] + " ") >= 0 &&	// To match "Regen" and "Regen II", not "Regeneration"
						String(hvStat.settings.EffectsAlertSelfRounds[j]) === duration) {
					// Suppress useless warnings
					if (effectName === "Chain 1" && !hvStat.battle.command.menuItemMap["Skill2"].available ||
							effectName === "Chain 2" && !hvStat.battle.command.menuItemMap["Skill3"].available) {
						continue;
					}
					this.enqueueAlert(effectName + " is expiring");
				}
			}
		}
	},
	warnMonsterEffectExpiring: function () {
		var elements = document.querySelectorAll('#monsterpane div.btm6 > img');
		for (var i = 0; i < elements.length; i++) {
			var element = elements[i];
			var onmouseover = element.getAttribute("onmouseover");
			var result = hvStat.battle.constant.rInfoPaneParameters.exec(onmouseover);
			if (!result) continue;
			var effectName = result[1];
			var duration = result[2];
			var base, monsterNumber;
			for (var j = 0; j < this.monsterEffectNames.length; j++) {
				if (hvStat.settings.isEffectsAlertMonsters[j] &&
						this.monsterEffectNames[j] === effectName &&
						String(hvStat.settings.EffectsAlertMonstersRounds[j]) === duration) {
					for (base = element; base; base = base.parentElement) {
						if (base.id && base.id.indexOf("mkey_") >= 0) {
							break;
						}
					}
					if (!base) continue;
					monsterNumber = base.id.replace("mkey_", "");
					this.enqueueAlert(effectName + '\n on monster number "' + monsterNumber + '" is expiring');
				}
			}
		}
	},
};

/* ========== GLOBAL VARIABLES ========== */
HOURLY = 0;
ARENA = 1;
GRINDFEST = 2;
ITEM_WORLD = 3;

function showBattleEndStats() {
	var battleLog = hv.battle.elementCache.battleLog;
	battleLog.innerHTML = "<div class='ui-state-default ui-corner-bottom' style='padding:10px;margin-bottom:10px;text-align:left'>" + getBattleEndStatsHtml() + "</div>" + battleLog.innerHTML;
}

function saveStats() {
	var a = (new Date()).getTime();
	if (hvStat.overview.startTime === 0) {
		hvStat.overview.startTime = a;
	}
	if (hvStat.roundContext.battleType === HOURLY) {
		hvStat.overview.lastHourlyTime = a;
	}
	hvStat.overview.exp += hvStat.roundContext.exp;
	hvStat.overview.credits += hvStat.roundContext.credits;
	hvStat.overview.expbyBT[hvStat.roundContext.battleType] += hvStat.roundContext.exp;
	hvStat.overview.creditsbyBT[hvStat.roundContext.battleType] += hvStat.roundContext.credits;
	if (hvStat.roundContext.equips > 0) {
		hvStat.overview.lastEquipTime = a;
		hvStat.overview.lastEquipName = hvStat.roundContext.lastEquipName;
		hvStat.overview.equips += hvStat.roundContext.equips;
	}
	if (hvStat.roundContext.artifacts > 0) {
		hvStat.overview.lastArtTime = a;
		hvStat.overview.lastArtName = hvStat.roundContext.lastArtName;
		hvStat.overview.artifacts += hvStat.roundContext.artifacts;
	}
	if (hvStat.roundContext.exp > 0) {
		hvStat.overview.roundArray[hvStat.roundContext.battleType]++;
	}
	if (hvStat.settings.isTrackStats) {
		hvStat.stats.kills += hvStat.roundContext.kills;
		hvStat.stats.aAttempts += hvStat.roundContext.aAttempts;
		hvStat.stats.aHits[0] += hvStat.roundContext.aHits[0];
		hvStat.stats.aHits[1] += hvStat.roundContext.aHits[1];
		hvStat.stats.aOffhands[0] += hvStat.roundContext.aOffhands[0];
		hvStat.stats.aOffhands[1] += hvStat.roundContext.aOffhands[1];
		hvStat.stats.aOffhands[2] += hvStat.roundContext.aOffhands[2];
		hvStat.stats.aOffhands[3] += hvStat.roundContext.aOffhands[3];
		hvStat.stats.sAttempts += hvStat.roundContext.sAttempts;
		hvStat.stats.sHits[0] += hvStat.roundContext.sHits[0];
		hvStat.stats.sHits[1] += hvStat.roundContext.sHits[1];
		hvStat.stats.mAttempts += hvStat.roundContext.mAttempts;
		hvStat.stats.mHits[0] += hvStat.roundContext.mHits[0];
		hvStat.stats.mHits[1] += hvStat.roundContext.mHits[1];
		hvStat.stats.pDodges += hvStat.roundContext.pDodges;
		hvStat.stats.pEvades += hvStat.roundContext.pEvades;
		hvStat.stats.pParries += hvStat.roundContext.pParries;
		hvStat.stats.pBlocks += hvStat.roundContext.pBlocks;
		hvStat.stats.dDealt[0] += hvStat.roundContext.dDealt[0];
		hvStat.stats.dDealt[1] += hvStat.roundContext.dDealt[1];
		hvStat.stats.dDealt[2] += hvStat.roundContext.dDealt[2];
		hvStat.stats.dTaken[0] += hvStat.roundContext.dTaken[0];
		hvStat.stats.dTaken[1] += hvStat.roundContext.dTaken[1];
		hvStat.stats.dDealtSp[0] += hvStat.roundContext.dDealtSp[0];
		hvStat.stats.dDealtSp[1] += hvStat.roundContext.dDealtSp[1];
		hvStat.stats.rounds += 1;
		hvStat.stats.absArry[0] += hvStat.roundContext.absArry[0];
		hvStat.stats.absArry[1] += hvStat.roundContext.absArry[1];
		hvStat.stats.absArry[2] += hvStat.roundContext.absArry[2];
		hvStat.stats.coalesce += hvStat.roundContext.coalesce;
		hvStat.stats.eTheft += hvStat.roundContext.eTheft;
		hvStat.stats.channel += hvStat.roundContext.channel;
		hvStat.stats.aDomino[0] += hvStat.roundContext.aDomino[0];
		hvStat.stats.aDomino[1] += hvStat.roundContext.aDomino[1];
		hvStat.stats.aDomino[2] += hvStat.roundContext.aDomino[2];
		hvStat.stats.aDomino[3] += hvStat.roundContext.aDomino[3];
		hvStat.stats.aDomino[4] += hvStat.roundContext.aDomino[4];
		hvStat.stats.aDomino[5] += hvStat.roundContext.aDomino[5];
		hvStat.stats.aDomino[6] += hvStat.roundContext.aDomino[6];
		hvStat.stats.aDomino[7] += hvStat.roundContext.aDomino[7];
		hvStat.stats.aDomino[8] += hvStat.roundContext.aDomino[8];
		hvStat.stats.aDomino[9] += hvStat.roundContext.aDomino[9];
		hvStat.stats.overStrikes += hvStat.roundContext.overStrikes;
		hvStat.stats.aCounters[0] += hvStat.roundContext.aCounters[0];
		hvStat.stats.aCounters[1] += hvStat.roundContext.aCounters[1];
		hvStat.stats.aCounters[2] += hvStat.roundContext.aCounters[2];
		hvStat.stats.aCounters[3] += hvStat.roundContext.aCounters[3];
		hvStat.stats.pResists += hvStat.roundContext.pResists;
		hvStat.stats.mSpells += hvStat.roundContext.mSpells;
		hvStat.stats.sResists += hvStat.roundContext.sResists;
		hvStat.stats.cureTotals[0] += hvStat.roundContext.cureTotals[0];
		hvStat.stats.cureTotals[1] += hvStat.roundContext.cureTotals[1];
		hvStat.stats.cureTotals[2] += hvStat.roundContext.cureTotals[2];
		hvStat.stats.cureCounts[0] += hvStat.roundContext.cureCounts[0];
		hvStat.stats.cureCounts[1] += hvStat.roundContext.cureCounts[1];
		hvStat.stats.cureCounts[2] += hvStat.roundContext.cureCounts[2];
		hvStat.stats.elemEffects[0] += hvStat.roundContext.elemEffects[0];
		hvStat.stats.elemEffects[1] += hvStat.roundContext.elemEffects[1];
		hvStat.stats.elemEffects[2] += hvStat.roundContext.elemEffects[2];
		hvStat.stats.effectPoison[0] += hvStat.roundContext.effectPoison[0];
		hvStat.stats.effectPoison[1] += hvStat.roundContext.effectPoison[1];
		hvStat.stats.elemSpells[0] += hvStat.roundContext.elemSpells[0];
		hvStat.stats.elemSpells[1] += hvStat.roundContext.elemSpells[1];
		hvStat.stats.elemSpells[2] += hvStat.roundContext.elemSpells[2];
		hvStat.stats.elemSpells[3] += hvStat.roundContext.elemSpells[3];
		hvStat.stats.divineSpells[0] += hvStat.roundContext.divineSpells[0];
		hvStat.stats.divineSpells[1] += hvStat.roundContext.divineSpells[1];
		hvStat.stats.divineSpells[2] += hvStat.roundContext.divineSpells[2];
		hvStat.stats.divineSpells[3] += hvStat.roundContext.divineSpells[3];
		hvStat.stats.forbidSpells[0] += hvStat.roundContext.forbidSpells[0];
		hvStat.stats.forbidSpells[1] += hvStat.roundContext.forbidSpells[1];
		hvStat.stats.forbidSpells[2] += hvStat.roundContext.forbidSpells[2];
		hvStat.stats.forbidSpells[3] += hvStat.roundContext.forbidSpells[3];
		hvStat.stats.spiritualSpells[0] += hvStat.roundContext.spiritualSpells[0];
		hvStat.stats.spiritualSpells[1] += hvStat.roundContext.spiritualSpells[1];
		hvStat.stats.spiritualSpells[2] += hvStat.roundContext.spiritualSpells[2];
		hvStat.stats.spiritualSpells[3] += hvStat.roundContext.spiritualSpells[3];
		hvStat.stats.depSpells[0] += hvStat.roundContext.depSpells[0];
		hvStat.stats.depSpells[1] += hvStat.roundContext.depSpells[1];
		hvStat.stats.supportSpells += hvStat.roundContext.supportSpells;
		hvStat.stats.curativeSpells += hvStat.roundContext.curativeSpells;
		hvStat.stats.elemGain += hvStat.roundContext.elemGain;
		hvStat.stats.divineGain += hvStat.roundContext.divineGain;
		hvStat.stats.forbidGain += hvStat.roundContext.forbidGain;
		hvStat.stats.depGain += hvStat.roundContext.depGain;
		hvStat.stats.supportGain += hvStat.roundContext.supportGain;
		hvStat.stats.weapProfGain[0] += hvStat.roundContext.weapProfGain[0];
		hvStat.stats.weapProfGain[1] += hvStat.roundContext.weapProfGain[1];
		hvStat.stats.weapProfGain[2] += hvStat.roundContext.weapProfGain[2];
		hvStat.stats.weapProfGain[3] += hvStat.roundContext.weapProfGain[3];
		hvStat.stats.armorProfGain[0] += hvStat.roundContext.armorProfGain[0];
		hvStat.stats.armorProfGain[1] += hvStat.roundContext.armorProfGain[1];
		hvStat.stats.armorProfGain[2] += hvStat.roundContext.armorProfGain[2];
		hvStat.stats.weaponprocs[0] += hvStat.roundContext.weaponprocs[0];
		hvStat.stats.weaponprocs[1] += hvStat.roundContext.weaponprocs[1];
		hvStat.stats.weaponprocs[2] += hvStat.roundContext.weaponprocs[2];
		hvStat.stats.weaponprocs[3] += hvStat.roundContext.weaponprocs[3];
		hvStat.stats.weaponprocs[4] += hvStat.roundContext.weaponprocs[4];
		hvStat.stats.weaponprocs[5] += hvStat.roundContext.weaponprocs[5];
		hvStat.stats.weaponprocs[6] += hvStat.roundContext.weaponprocs[6];
		hvStat.stats.weaponprocs[7] += hvStat.roundContext.weaponprocs[7];
		hvStat.stats.pskills[0] += hvStat.roundContext.pskills[0];
		hvStat.stats.pskills[1] += hvStat.roundContext.pskills[1];
		hvStat.stats.pskills[2] += hvStat.roundContext.pskills[2];
		hvStat.stats.pskills[3] += hvStat.roundContext.pskills[3];
		hvStat.stats.pskills[4] += hvStat.roundContext.pskills[4];
		hvStat.stats.pskills[5] += hvStat.roundContext.pskills[5];
		hvStat.stats.pskills[6] += hvStat.roundContext.pskills[6];
		if (hvStat.stats.datestart === 0) hvStat.stats.datestart = (new Date()).getTime();
	}
	hvStat.storage.overview.save();
	if (hvStat.settings.isTrackStats) {
		hvStat.storage.stats.save();
	}
	if (hvStat.settings.isTrackItems) {
		hvStat.storage.dropStats.save();
	}
}
function getBattleEndStatsHtml() {
	function formatProbability(numerator, denominator, digits) {
		return String(numerator) + "/" + String(denominator)
			+ " (" + String(hvStat.util.percentRatio(numerator, denominator, digits)) + "%)";
	}

	var f = hvStat.roundContext.sHits[0] + hvStat.roundContext.sHits[1] + hvStat.roundContext.depSpells[1] + hvStat.roundContext.sResists;
	var e = hvStat.roundContext.sHits[0] + hvStat.roundContext.sHits[1] + hvStat.roundContext.depSpells[1];
	var d = hvStat.roundContext.aHits[0] + hvStat.roundContext.aHits[1];
	var c = hvStat.roundContext.sHits[0] + hvStat.roundContext.sHits[1];
	var b = hvStat.roundContext.mHits[0] + hvStat.roundContext.mHits[1];
	var ab = hvStat.roundContext.aOffhands[0] + hvStat.roundContext.aOffhands[2];
	var a = "<b>Accuracy</b>: " + formatProbability(d, hvStat.roundContext.aAttempts, 2) + ", "
		+ "<b>Crits</b>: " + formatProbability(hvStat.roundContext.aHits[1], d, 2) + ", "
		+ "<b>Offhand</b>: " + formatProbability(ab, d, 2) + ", "
		+ "<b>Domino</b>: " + formatProbability(hvStat.roundContext.aDomino[0], d, 2) + ", "
		+ "<b>OverStrikes</b>: " + formatProbability(hvStat.roundContext.overStrikes, d, 2) + ", "
		+ "<b>Coalesce</b>: " + formatProbability(hvStat.roundContext.coalesce, e, 2) + ", "
		+ "<b>M. Accuracy</b>: " + formatProbability(e, f, 2) + ", "
		+ "<b>Spell Crits</b>: " + formatProbability(hvStat.roundContext.sHits[1], c, 2) + ", "
		+ "<b>Avg hit dmg</b>: " + hvStat.util.ratio(hvStat.roundContext.dDealt[0], hvStat.roundContext.aHits[0]).toFixed(2) + "|" + hvStat.util.ratio(hvStat.roundContext.dDealtSp[0], hvStat.roundContext.sHits[0]).toFixed(2) + ", "
		+ "<b>Avg crit dmg</b>: " + hvStat.util.ratio(hvStat.roundContext.dDealt[1], hvStat.roundContext.aHits[1]).toFixed(2) + "|" + hvStat.util.ratio(hvStat.roundContext.dDealtSp[1], hvStat.roundContext.sHits[1]).toFixed(2) + ", "
		+ "<b>Avg dmg</b>: " + hvStat.util.ratio(hvStat.roundContext.dDealt[0] + hvStat.roundContext.dDealt[1], d).toFixed(2) + "|" + hvStat.util.ratio(hvStat.roundContext.dDealtSp[0] + hvStat.roundContext.dDealtSp[1], c).toFixed(2)
		+ "<hr style='height:1px;border:0;background-color:#333333;color:#333333' />"
		+ "<b>Hits taken</b>: " + formatProbability(b, hvStat.roundContext.mAttempts, 2) + ", "
		+ "<b>Missed</b>: " + formatProbability(hvStat.roundContext.pDodges, hvStat.roundContext.mAttempts, 2) + ", "
		+ "<b>Evaded</b>: " + formatProbability(hvStat.roundContext.pEvades, hvStat.roundContext.mAttempts, 2) + ", "
		+ "<b>Blocked</b>: " + formatProbability(hvStat.roundContext.pBlocks, hvStat.roundContext.mAttempts, 2) + ", "
		+ "<b>Parried</b>: " + formatProbability(hvStat.roundContext.pParries, hvStat.roundContext.mAttempts, 2) + ", "
		+ "<b>Resisted</b>: " + formatProbability(hvStat.roundContext.pResists, hvStat.roundContext.mAttempts, 2) + ", "
		+ "<b>Crits taken</b>: " + formatProbability(hvStat.roundContext.mHits[1], b, 2) + ", "
		+ "<b>Total dmg taken</b>: " + (hvStat.roundContext.dTaken[0] + hvStat.roundContext.dTaken[1]) + ", "
		+ "<b>Avg dmg taken</b>: " + hvStat.util.ratio(hvStat.roundContext.dTaken[0] + hvStat.roundContext.dTaken[1], b).toFixed(2);
	if (hvStat.settings.isShowEndProfs && (hvStat.settings.isShowEndProfsMagic || hvStat.settings.isShowEndProfsArmor || hvStat.settings.isShowEndProfsWeapon)) { //isShowEndProfs added by Ilirith
		if (hvStat.settings.isShowEndProfsMagic) {
			a += "<hr style='height:1px;border:0;background-color:#333333;color:#333333' />"
				+ "<b>Curative Spells</b>: " + hvStat.roundContext.curativeSpells
				+ ", <b>Support Spells</b>: " + hvStat.roundContext.supportSpells
				+ ", <b>Deprecating Spells</b>: " + hvStat.roundContext.depSpells[1]
				+ ", <b>Divine Spells</b>: " + hvStat.roundContext.divineSpells[1]
				+ ", <b>Forbidden Spells</b>: " + hvStat.roundContext.forbidSpells[1]
				+ ", <b>Elemental Spells</b>: " + hvStat.roundContext.elemSpells[1]
				+ "<hr style='height:1px;border:0;background-color:#333333;color:#333333' />"
				+ "<b>SupportGain</b>: " + hvStat.roundContext.supportGain.toFixed(2)
				+ ", <b>Deprecating Gain</b>: " + hvStat.roundContext.depGain.toFixed(2)
				+ ", <b>Divine Gain</b>: " + hvStat.roundContext.divineGain.toFixed(2)
				+ ", <b>Forbidden Gain</b>: " + hvStat.roundContext.forbidGain.toFixed(2)
				+ ", <b>Elemental Gain</b>: " + hvStat.roundContext.elemGain.toFixed(2);
		}
		if (hvStat.settings.isShowEndProfsArmor) {
			a += "<hr style='height:1px;border:0;background-color:#333333;color:#333333' />"
				+ "<b>Cloth Gain</b>: " + hvStat.roundContext.armorProfGain[0].toFixed(2)
				+ ", <b>Light Armor Gain</b>: " + hvStat.roundContext.armorProfGain[1].toFixed(2)
				+ ", <b>Heavy Armor Gain</b>: " + hvStat.roundContext.armorProfGain[2].toFixed(2);
		}
		if (hvStat.settings.isShowEndProfsWeapon) {
			a += "<hr style='height:1px;border:0;background-color:#333333;color:#333333' />"
				+ "<b>One-Handed Gain</b>: " + hvStat.roundContext.weapProfGain[0].toFixed(2)
				+ ", <b>Two-Handed Gain</b>: " + hvStat.roundContext.weapProfGain[1].toFixed(2)
				+ ", <b>Dual Wielding Gain</b>: " + hvStat.roundContext.weapProfGain[2].toFixed(2)
				+ ", <b>Staff Gain</b>: " + hvStat.roundContext.weapProfGain[3].toFixed(2);
		}
	}
	return a;
}

//------------------------------------
// Start-up
//------------------------------------
hvStat.startup = {
	phase1: function () {
		hvStat.database.idbAccessQueue = new util.CallbackQueue();
		hvStat.database.openIndexedDB(function (event) {
			hvStat.database.idbAccessQueue.execute();
		});
		//Version checking doesn't depend on the DOM, so do it early
		hvStat.versions.checkVersion();
		if (document.readyState !== "loading") {
			hvStat.startup.phase2();
		} else {
			document.addEventListener("readystatechange", function (event) {
				this.removeEventListener(event.type, arguments.callee);
				hvStat.startup.phase2();
			});
		}
	},
	phase2: function () {
		if (hvStat.settings.adjustKeyEventHandling) {
			hvStat.onkeydown = document.onkeydown;
			document.onkeydown = null;
		}
		hv.initialize();
		console.debug(hv);
		hvStat.initialize();
		console.debug(hvStat);
		if (hvStat.settings.isChangePageTitle) {
			document.title = hvStat.settings.customPageTitle;
		}
		hvStat.gadget.addStyle();
		if (hv.battle.isActive) {
			hvStat.battle.initialize();
			if (hvStat.settings.delayRoundEndAlerts) {
				hvStat.battle.warningSystem.restoreAlerts();
			}
			hvStat.battle.eventLog.processEvents();
			if (hvStat.roundContext.currRound > 0 && hvStat.settings.isShowRoundCounter) {
				hvStat.battle.enhancement.roundCounter.create();
			}
			hvStat.battle.monster.showHealthAll();
			if (!hvStat.database.loadingMonsterInfoFromDB) {
				hvStat.battle.monster.showStatusAll();
			}
			if (hvStat.settings.isShowStatsPopup) {
				hvStat.battle.monster.popup.initialize();
			}
			// Show warnings
			if (!hv.battle.isRoundFinished) {
				if (hvStat.settings.warnMode[hvStat.roundContext.battleType]) {
					hvStat.battle.warningSystem.warnHealthStatus();
				}
				if (hvStat.settings.isMainEffectsAlertSelf) {
					hvStat.battle.warningSystem.warnSelfEffectExpiring();
				}
				if (hvStat.settings.isMainEffectsAlertMonsters) {
					hvStat.battle.warningSystem.warnMonsterEffectExpiring();
				}
			}
			if (hv.battle.isRoundFinished) {
				if (hvStat.settings.isShowEndStats) {
					showBattleEndStats();
				}
				saveStats();
				hvStat.storage.roundContext.remove();
				if (hvStat.settings.autoAdvanceBattleRound) {
					hvStat.battle.advanceRound();
				}
				//Don't stash alerts if the battle's over
				if (hvStat.settings.delayRoundEndAlerts && !hv.battle.isFinished) {
					hvStat.battle.warningSystem.stashAlerts();
				}
			}
			if (!hv.battle.isFinished) {
				hvStat.battle.warningSystem.alertAllFromQueue();
			}
		} else {
			hvStat.storage.roundContext.remove();
			if (hvStat.settings.isStartAlert || hvStat.settings.isShowEquippedSet ||
					hvStat.settings.isTrackItems || hvStat.settings.isTrackShrine) {
				hvStat.support.captureStatuses();
			}
			if (!hv.location.isRiddle) {
				hvStat.storage.warningState.remove();
			}
			if (hvStat.settings.enableScrollHotkey) {
				hvStat.keyboard.scrollable.initialize();
			}
			// Equipment tag
			if (hv.location.isEquipment && hvStat.settings.isShowTags[0]) {
				hvStat.inventory.equipment.showTagInputFields(false);
			}
			if (hv.location.isInventory && hvStat.settings.isShowTags[5]) {
				hvStat.inventory.equipment.showTagInputFields(true);
			}
			if (hv.location.isEquipmentShop && hvStat.settings.isShowTags[1]) {
				hvStat.inventory.equipment.showTagInputFields(false);
			}
			if (hv.location.isItemWorld && hvStat.settings.isShowTags[2]) {
				hvStat.inventory.equipment.showTagInputFields(false);
			}
			if (hv.location.isMoogleWrite && hvStat.settings.isShowTags[3]) {
				hvStat.inventory.equipment.showTagInputFields(false);
			}
			if (hv.location.isForge && hvStat.settings.isShowTags[4]) {
				hvStat.inventory.equipment.showTagInputFields(false);
			}
			if (hv.location.isForge && hvStat.settings.isDisableForgeHotKeys) {
				document.onkeypress = null;
			}
			if (hv.location.isCharacter) {
				hvStat.support.captureProficiencies();
			}
			if (hv.location.isShrine) {
				if (hvStat.settings.isTrackShrine) {
					hvStat.support.captureShrine();
				}
				if (browser.isChrome && hvStat.settings.enableShrineKeyPatch) {
					document.onkeydown = null;	// Workaround to make enable SPACE key
					hvStat.onkeydown = null;
				}
			}
			if (hvStat.settings.isStartAlert) {
				hvStat.support.confirmBeforeBattle();
			}
		}
		if (hvStat.settings.isShowEquippedSet) {
			hvStat.gadget.equippedSet.create();
		}
		if (hvStat.settings.isShowSidebarProfs) {
			hvStat.gadget.proficiencyPopupIcon.create();
		}
		if (hvStat.characterStatus.didReachInventoryLimit) {
			hvStat.gadget.inventoryWarningIcon.create();
		}
		document.addEventListener("keydown", hvStat.keyboard.documentKeydown);
		hvStat.gadget.wrenchIcon.create();
		if (hvStat.settings.adjustKeyEventHandling) {
			document.onkeydown = hvStat.onkeydown;
		}
	},
};

hvStat.startup.phase1();

//------------------------------------
// Support Functions
//------------------------------------
hvStat.support = {
	captureStatuses: function () {
		var difficulties = ["", "NORMAL", "HARD", "NIGHTMARE", "HELL", "NINTENDO", "BATTLETOADS", "IWBTH"];
		var difficulty = hv.settings.difficulty;
		if (difficulty) {
			hvStat.characterStatus.difficulty.id = hv.settings.difficulty;
			hvStat.characterStatus.difficulty.name = hvStat.constant.difficulty[hv.settings.difficulty].name;
			hvStat.characterStatus.difficulty.index = difficulties.indexOf(difficulty);
		}
		elements = document.querySelectorAll('#setform img');
		var result;
		for (var i = 0; i < elements.length; i++) {
			result = /set(\d)_on/.exec(elements[i].getAttribute("src"));
			if (result) {
				hvStat.characterStatus.equippedSet = Number(result[1]);
				break;
			}
		}
		hvStat.storage.characterStatus.save();
	},
	captureProficiencies: function () {
		var proficiencyTable = document.getElementById("leftpane").children[1].querySelectorAll('div.fd4');
		var prof = hvStat.characterStatus.proficiencies;
		prof.oneHanded = Number(hv.util.innerText(proficiencyTable[2]));
		prof.twoHanded = Number(hv.util.innerText(proficiencyTable[4]));
		prof.dualWielding = Number(hv.util.innerText(proficiencyTable[6]));
		prof.staff = Number(hv.util.innerText(proficiencyTable[8]));
		prof.clothArmor = Number(hv.util.innerText(proficiencyTable[10]));
		prof.lightArmor = Number(hv.util.innerText(proficiencyTable[12]));
		prof.heavyArmor = Number(hv.util.innerText(proficiencyTable[14]));
		prof.elemental = Number(hv.util.innerText(proficiencyTable[17]));
		prof.divine = Number(hv.util.innerText(proficiencyTable[19]));
		prof.forbidden = Number(hv.util.innerText(proficiencyTable[21]));
		prof.deprecating = Number(hv.util.innerText(proficiencyTable[23]));
		prof.supportive = Number(hv.util.innerText(proficiencyTable[25]));
		hvStat.characterStatus.areProficienciesCaptured = true;
		hvStat.storage.characterStatus.save();
	},
	captureShrine: function () {
		var messageBoxElement = document.querySelector('#messagebox');
		if (!messageBoxElement) {
			return;
		}
		var messageElements = messageBoxElement.querySelectorAll('div.cmb6');
		var message0 = hv.util.innerText(messageElements[0]);
		if (message0.match(/power/i)) {
			hvStat.shrine.artifactsTraded++;
			var message2 = hv.util.innerText(messageElements[2]);
			if (message2.match(/Elixir/i)) {
				hvStat.shrine.artifactElixer++;
			} else if (message2.match(/crystal/i)) {
				hvStat.shrine.artifactCrystal++;
			} else if (message2.match(/increased/i)) {
				hvStat.shrine.artifactStat++;
			} else if (message2.match(/(\d) hath/i)) {
				hvStat.shrine.artifactHath++;
				hvStat.shrine.artifactHathTotal += Number(RegExp.$1);
			} else if (message2.match(/energy drink/i)) {
				hvStat.shrine.artifactItem++;
			}
		} else if (message0.match(/item/i)) {
			var message3 = hv.util.innerText(messageElements[3]);
			hvStat.shrine.trophyArray.push(hvStat.util.capitalizeEquipmentName(message3));
		}
		hvStat.storage.shrine.save();
	},
	confirmBeforeBattle: function () {
		var elements = document.querySelectorAll('#mainpane img[onclick*="arenaform"]');
		var i, element;
		for (i = 0; i < elements.length; i++) {
			element = elements[i];
			var oldOnClick = element.getAttribute("onclick");
			var newOnClick = 'if(confirm("Are you sure you want to start this challenge on ' +
				hvStat.characterStatus.difficulty.name +
				' difficulty, with set number: ' +
				hvStat.characterStatus.equippedSet + '?\\n';
			if (hvStat.settings.StartAlertHP > hv.character.healthPercent) {
				newOnClick += '\\n - HP is only '+ hv.character.healthPercent + '%';
			}
			if (hvStat.settings.StartAlertMP > hv.character.magicPercent) {
				newOnClick += '\\n - MP is only '+ hv.character.magicPercent + '%';
			}
			if (hvStat.settings.StartAlertSP > hv.character.spiritPercent) {
				newOnClick += '\\n - SP is only '+ hv.character.spiritPercent + '%';
			}
			if (hvStat.settings.StartAlertDifficulty < hvStat.characterStatus.difficulty.index) {
				newOnClick += '\\n - Difficulty is '+ hvStat.characterStatus.difficulty.name;
			}
			newOnClick += '")) {'+ oldOnClick+ '}';
			element.setAttribute("onclick", newOnClick);
		}
	},
};

//------------------------------------
// Inventory Management
//------------------------------------
hvStat.inventory = {};

hvStat.inventory.equipment = {
	showTagInputFields: function (doClean) {
		var equipTagArrayTable = [
			{id: hvStat.equipmentTags.OneHandedIDs,	value: hvStat.equipmentTags.OneHandedTAGs,	idClean: [], valueClean: []},
			{id: hvStat.equipmentTags.TwoHandedIDs,	value: hvStat.equipmentTags.TwoHandedTAGs,	idClean: [], valueClean: []},
			{id: hvStat.equipmentTags.StaffsIDs,	value: hvStat.equipmentTags.StaffsTAGs,		idClean: [], valueClean: []},
			{id: hvStat.equipmentTags.ShieldIDs,	value: hvStat.equipmentTags.ShieldTAGs,		idClean: [], valueClean: []},
			{id: hvStat.equipmentTags.ClothIDs,		value: hvStat.equipmentTags.ClothTAGs,		idClean: [], valueClean: []},
			{id: hvStat.equipmentTags.LightIDs,		value: hvStat.equipmentTags.LightTAGs,		idClean: [], valueClean: []},
			{id: hvStat.equipmentTags.HeavyIDs,		value: hvStat.equipmentTags.HeavyTAGs,		idClean: [], valueClean: []}
		];
		var elements = document.querySelectorAll('#inv_equip div.eqdp, #item_pane div.eqdp, #equip div.eqdp, #equip_pane div.eqdp');
		Array.prototype.forEach.call(elements, function (element) {
			var onmouseover = element.getAttribute("onmouseover");
			var regexResult = onmouseover.match(/(One-handed Weapon|Two-handed Weapon|Staff|Shield|Cloth Armor|Light Armor|Heavy Armor)(?:\s*&nbsp;)*\s*Level/);
			if (!regexResult) {
				return;
			}
			var equipType = regexResult[1];
			var id = parseInt(String(element.id), 10);
			var equipTypeIdx = -1;
			if (/One-Handed/i.test(equipType)) {
				equipTypeIdx = 0;
			} else if (/Two-Handed/i.test(equipType)) {
				equipTypeIdx = 1;
			} else if (/Staff/i.test(equipType)) {
				equipTypeIdx = 2;
			} else if (/Shield/i.test(equipType)) {
				equipTypeIdx = 3;
			} else if (/Cloth/i.test(equipType)) {
				equipTypeIdx = 4;
			} else if (/Light/i.test(equipType)) {
				equipTypeIdx = 5;
			} else if (/Heavy/i.test(equipType)) {
				equipTypeIdx = 6;
			}
			if (equipTypeIdx < 0) {
				alert("unexpected equipment type");
				return;
			}
			var idArray = equipTagArrayTable[equipTypeIdx].id;
			var valueArray = equipTagArrayTable[equipTypeIdx].value;
			var idCleanArray = equipTagArrayTable[equipTypeIdx].idClean;
			var valueCleanArray = equipTagArrayTable[equipTypeIdx].valueClean;
			var inputElement = document.createElement("input");
			inputElement.type = "text";
			inputElement.className = "hvstat-equipment-tag";
			inputElement.name = "tagid_" + String(id);
			inputElement.size = 5;
			inputElement.maxLength = 6;
			var index = idArray.indexOf(id);
			if (index < 0) {
				inputElement.className += " hvstat-equipment-tag-new";
				inputElement.value = "*NEW*";
			} else {
				inputElement.value = valueArray[index];
				if (doClean) {
					idCleanArray.push(id);
					valueCleanArray.push(valueArray[index]);
				}
			}
			element.parentNode.insertBefore(inputElement, null);
			inputElement.addEventListener("change", function (event) {
				var target = event.target;
				var tagId = Number(target.name.replace("tagid_", ""));
				var tagValue = target.value;
				var index = idArray.indexOf(tagId);
				if (index >= 0) {
					valueArray[index] = tagValue;
				} else {
					idArray.push(tagId);
					valueArray.push(tagValue);
				}
				target.className = target.className.replace(" hvstat-equipment-tag-new", "");
				hvStat.storage.equipmentTags.save();
			});
		});
		if (doClean) {
			var cleaned = false;
			var i = equipTagArrayTable.length;
			while (i--) {
				if (equipTagArrayTable[i].id.length > equipTagArrayTable[i].idClean.length) {
					idCleanArray = equipTagArrayTable[i].idClean;
					valueCleanArray = equipTagArrayTable[i].valueClean;
					switch (i) {
					case 0:
						hvStat.equipmentTags.OneHandedIDs = idCleanArray;
						hvStat.equipmentTags.OneHandedTAGs = valueCleanArray;
						break;
					case 1:
						hvStat.equipmentTags.TwoHandedIDs = idCleanArray;
						hvStat.equipmentTags.TwoHandedTAGs = valueCleanArray;
						break;
					case 2:
						hvStat.equipmentTags.StaffsIDs = idCleanArray;
						hvStat.equipmentTags.StaffsTAGs = valueCleanArray;
						break;
					case 3:
						hvStat.equipmentTags.ShieldIDs = idCleanArray;
						hvStat.equipmentTags.ShieldTAGs = valueCleanArray;
						break;
					case 4:
						hvStat.equipmentTags.ClothIDs = idCleanArray;
						hvStat.equipmentTags.ClothTAGs = valueCleanArray;
						break;
					case 5:
						hvStat.equipmentTags.LightIDs = idCleanArray;
						hvStat.equipmentTags.LightTAGs = valueCleanArray;
						break;
					case 6:
						hvStat.equipmentTags.HeavyIDs = idCleanArray;
						hvStat.equipmentTags.HeavyTAGs = valueCleanArray;
						break;
					}
					cleaned = true;
				}
			}
			if (cleaned) {
				hvStat.storage.equipmentTags.save();
			}
		}
	},
};

//------------------------------------
// Dialog User Interface
//------------------------------------
hvStat.ui = {
	// jQuery and jQuery UI must not be used except on the dialog panel for performance reason.
	createDialog: function () {
		// Load jQuery and jQuery UI
		browser.extension.loadScript("scripts/", "jquery-1.8.3.min.js");
		browser.extension.loadScript("scripts/", "jquery-ui-1.9.2.custom.min.js");
		// Load CSS for the dialog
		browser.extension.style.addFromResource("css/", "hvstat-ui.css");

		var panel = document.createElement("div");
		panel.id = "hvstat-panel";
		$(panel).html(browser.extension.getResourceText("html/", "main.html"));
		$('body').append(panel);
		$(panel).dialog({
			autoOpen: false,
			closeOnEscape: true,
			draggable: false,
			resizable: false,
			height: 620,
			width: 1080,
			modal: true,
			position: ["center", "center"],
			title: "[STAT] HentaiVerse Statistics, Tracking, and Analysis Tool v." + hvStat.version,
		});
		$('#hvstat-tabs').tabs();
		initOverviewPane();
		initBattleStatsPane();
		hvStat.ui.dropsPane.initialize();
		initShrinePane();
		hvStat.ui.databasePane.initialize();
		initSettingsPane();
		$('#hvstat-icon').click(function () {
			if ($(panel).dialog("isOpen")) {
				$(panel).dialog("close");
			} else {
				$(panel).dialog("open");
			}
		});
		$(panel).dialog("open");
	},
};

hvStat.ui.dropsPane = {
	dropsDisplayTable: null,
	initialize: function () {
		var nChances = hvStat.statistics.drops.nChances(null, null, null);
		var innerHTML;
		if (nChances === 0) {
			innerHTML = "No data found. Complete a round to begin tracking.";
		} else {
			innerHTML = browser.extension.getResourceText("html/", "drops-pane.html");
		}
		$('#hvstat-drops-pane').html(innerHTML);
		if (nChances === 0) {
			return;
		}

		if (!hvStat.settings.isTrackItems) {
			$('#hvstat-drops-pane .hvstat-tracking-paused').show();
		}
		this.dropsDisplayTable = JSON.parse(browser.extension.getResourceText("json/", "drops-display-table.json"));

		// Overall Stats
		$('#hvstat-drops-overall-stats-drop-type').change(this.onOverallStatsFilterChange);
		$('#hvstat-drops-overall-stats-difficulty').change(this.onOverallStatsFilterChange).change();
		// Items
		$('#hvstat-drops-items-drop-type').change(this.onItemFilterChange);
		$('#hvstat-drops-items-difficulty').change(this.onItemFilterChange);
		$('#hvstat-drops-items-battle-type').change(this.onItemFilterChange).change();
		// Equipments
		$('#hvstat-drops-equipments-drop-type').change(this.onEquipmentFilterChange);
		$('#hvstat-drops-equipments-difficulty').change(this.onEquipmentFilterChange);
		$('#hvstat-drops-equipments-battle-type').change(this.onEquipmentFilterChange).change();
		// Footer
		$('#hvstat-drops-reset').click(function () {
			if (confirm("Are you sure to reset Drops tab?\nThe data of Item Drops and Equipment Drops on the database will also be deleted.")) {
				hvStat.storage.dropStats.reset();
				hvStat.database.itemDrops.delete(hvStat.ui.dropsPane.initialize);
				hvStat.database.equipmentDrops.delete(hvStat.ui.dropsPane.initialize);
				hvStat.ui.dropsPane.initialize();
			}
		});
	},
	updateOverallStats: function (dropType, difficulty) {
		this.updateOverallStatsRow('#hvstat-drops-overall-stats-credits td', dropType, difficulty, hvStat.storage.dropStats.creditCount);
		this.updateOverallStatsRow('#hvstat-drops-overall-stats-item td', dropType, difficulty, hvStat.storage.dropStats.itemCount);
		this.updateOverallStatsRow('#hvstat-drops-overall-stats-crystal td', dropType, difficulty, hvStat.storage.dropStats.crystalCount);
		this.updateOverallStatsRow('#hvstat-drops-overall-stats-monster-food td', dropType, difficulty, hvStat.storage.dropStats.monsterFoodCount);
		this.updateOverallStatsRow('#hvstat-drops-overall-stats-token td', dropType, difficulty, hvStat.storage.dropStats.tokenCount);
		this.updateOverallStatsRow('#hvstat-drops-overall-stats-artifact td', dropType, difficulty, hvStat.storage.dropStats.artifactCount);
		this.updateOverallStatsRow('#hvstat-drops-overall-stats-equipment td', dropType, difficulty, hvStat.storage.dropStats.equipmentCount);

		// Total
		var dropsHourlyEncounter = hvStat.storage.dropStats.totalCount(dropType, difficulty, hvStat.constant.battleType.HOURLY_ENCOUNTER.id);
		var dropsArena = hvStat.storage.dropStats.totalCount(dropType, difficulty, hvStat.constant.battleType.ARENA.id);
		var dropsGrindfest = hvStat.storage.dropStats.totalCount(dropType, difficulty, hvStat.constant.battleType.GRINDFEST.id);
		var dropsItemWorld = hvStat.storage.dropStats.totalCount(dropType, difficulty, hvStat.constant.battleType.ITEM_WORLD.id);
		var dropsTotal = dropsHourlyEncounter + dropsArena + dropsGrindfest + dropsItemWorld;
		var chancesHourlyEncounter = hvStat.storage.dropStats.nChances(dropType, difficulty, hvStat.constant.battleType.HOURLY_ENCOUNTER.id);
		var chancesArena = hvStat.storage.dropStats.nChances(dropType, difficulty, hvStat.constant.battleType.ARENA.id);
		var chancesGrindfest = hvStat.storage.dropStats.nChances(dropType, difficulty, hvStat.constant.battleType.GRINDFEST.id);
		var chancesItemWorld = hvStat.storage.dropStats.nChances(dropType, difficulty, hvStat.constant.battleType.ITEM_WORLD.id);
		var chancesTotal = hvStat.storage.dropStats.nChances(dropType, difficulty, null);
		var columns = $('#hvstat-drops-overall-stats-chances td');
		$(columns[0]).text(dropsHourlyEncounter);
		$(columns[1]).text(chancesHourlyEncounter);
		$(columns[2]).text(hvStat.util.percentRatio(dropsHourlyEncounter, chancesHourlyEncounter, 2) + "%");
		$(columns[3]).text(dropsArena);
		$(columns[4]).text(chancesArena);
		$(columns[5]).text(hvStat.util.percentRatio(dropsArena, chancesArena, 2) + "%");
		$(columns[6]).text(dropsGrindfest);
		$(columns[7]).text(chancesGrindfest);
		$(columns[8]).text(hvStat.util.percentRatio(dropsGrindfest, chancesGrindfest, 2) + "%");
		$(columns[9]).text(dropsItemWorld);
		$(columns[10]).text(chancesItemWorld);
		$(columns[11]).text(hvStat.util.percentRatio(dropsItemWorld, chancesItemWorld, 2) + "%");
		$(columns[12]).text(dropsTotal);
		$(columns[13]).text(chancesTotal);
		$(columns[14]).text(hvStat.util.percentRatio(dropsTotal, chancesTotal, 2) + "%");
	},
	updateOverallStatsRow: function (cssSelecter, dropType, difficulty, countFn) {
		var o = hvStat.storage.dropStats;
		var dropsHourlyEncounter = countFn.call(o, dropType, difficulty, hvStat.constant.battleType.HOURLY_ENCOUNTER.id);
		var totalDropsHourlyEncounter = hvStat.storage.dropStats.totalCount(dropType, difficulty, hvStat.constant.battleType.HOURLY_ENCOUNTER.id);
		var dropsArena = countFn.call(o, dropType, difficulty, hvStat.constant.battleType.ARENA.id);
		var totalDropsArena = hvStat.storage.dropStats.totalCount(dropType, difficulty, hvStat.constant.battleType.ARENA.id);
		var dropsGrindfest = countFn.call(o, dropType, difficulty, hvStat.constant.battleType.GRINDFEST.id);
		var totalDropsGrindfest = hvStat.storage.dropStats.totalCount(dropType, difficulty, hvStat.constant.battleType.GRINDFEST.id);
		var dropsItemWorld = countFn.call(o, dropType, difficulty, hvStat.constant.battleType.ITEM_WORLD.id);
		var totalDropsItemWorld = hvStat.storage.dropStats.totalCount(dropType, difficulty, hvStat.constant.battleType.ITEM_WORLD.id);
		var rowTotalDrops = countFn.call(o, dropType, difficulty, null);
		var grandTotalDrops = hvStat.storage.dropStats.totalCount(dropType, difficulty, null);

		var chancesHourlyEncounter = hvStat.storage.dropStats.nChances(dropType, difficulty, hvStat.constant.battleType.HOURLY_ENCOUNTER.id);
		var chancesArena = hvStat.storage.dropStats.nChances(dropType, difficulty, hvStat.constant.battleType.ARENA.id);
		var chancesGrindfest = hvStat.storage.dropStats.nChances(dropType, difficulty, hvStat.constant.battleType.GRINDFEST.id);
		var chancesItemWorld = hvStat.storage.dropStats.nChances(dropType, difficulty, hvStat.constant.battleType.ITEM_WORLD.id);
		var chancesTotal = hvStat.storage.dropStats.nChances(dropType, difficulty, null);

		var columns = $(cssSelecter);
		$(columns[0]).text(dropsHourlyEncounter);
		$(columns[1]).text(hvStat.util.percentRatio(dropsHourlyEncounter, totalDropsHourlyEncounter, 2) + "%");
		$(columns[2]).text(hvStat.util.percentRatio(dropsHourlyEncounter, chancesHourlyEncounter, 2) + "%");
		$(columns[3]).text(dropsArena);
		$(columns[4]).text(hvStat.util.percentRatio(dropsArena, totalDropsArena, 2) + "%");
		$(columns[5]).text(hvStat.util.percentRatio(dropsArena, chancesArena, 2) + "%");
		$(columns[6]).text(dropsGrindfest);
		$(columns[7]).text(hvStat.util.percentRatio(dropsGrindfest, totalDropsGrindfest, 2) + "%");
		$(columns[8]).text(hvStat.util.percentRatio(dropsGrindfest, chancesGrindfest, 2) + "%");
		$(columns[9]).text(dropsItemWorld);
		$(columns[10]).text(hvStat.util.percentRatio(dropsItemWorld, totalDropsItemWorld, 2) + "%");
		$(columns[11]).text(hvStat.util.percentRatio(dropsItemWorld, chancesItemWorld, 2) + "%");
		$(columns[12]).text(rowTotalDrops);
		$(columns[13]).text(hvStat.util.percentRatio(rowTotalDrops, grandTotalDrops, 2) + "%");
		$(columns[14]).text(hvStat.util.percentRatio(rowTotalDrops, chancesTotal, 2) + "%");
	},
	updateItems: function (dropType, difficulty, battleType) {
		try {
			var total = hvStat.storage.dropStats.totalCount(dropType, difficulty, battleType);
			var chanceTotal = hvStat.storage.dropStats.nChances(dropType, difficulty, battleType);

			var tx = hvStat.database.idb.transaction(["ItemDrops"], "readonly");
			var store = tx.objectStore("ItemDrops");
			var range = null;	// Select all
			var cursorOpenRequest = store.openCursor(range, "next");
			cursorOpenRequest.onerror = function (event) {
				var errorMessage = "ItemDrops: openCursor: error";
				console.log(errorMessage);
				console.debug(event);
				alert(errorMessage);
			};
			var itemMap = {};
			cursorOpenRequest.onsuccess = function (event) {
				//console.debug(event);
				var cursor = this.result;
				if (cursor) {
					//console.debug(cursor);
					var item = cursor.value;
					if ((dropType === null || dropType === item.dropType) &&
							(difficulty === null || difficulty === item.difficulty) &&
							(battleType === null || battleType === item.battleType)) {
						var name = item.name;
						if (name in itemMap) {
							itemMap[name].dropCount += item.dropCount;
							itemMap[name].qty += item.qty;
						} else {
							itemMap[name] = {
								dropCount: item.dropCount,
								qty: item.qty
							};
						}
					}
					cursor.continue();
				} else {
					var i, item, itemClass, styleClassName = "", qty, dropCount, itemsHTML = ["", ""], itemsHTMLIndex = 0, prevClassName = "";
					var dropsDisplayTable = hvStat.ui.dropsPane.dropsDisplayTable;
					for (i = 0; i < dropsDisplayTable.items.length; i++) {
						item = dropsDisplayTable.items[i];
						itemClass = dropsDisplayTable.itemClass[item.className];
						if (itemClass && itemClass.styleClassName) {
							styleClassName = itemClass.styleClassName;
						}
						if (item.name in itemMap) {
							qty = itemMap[item.name].qty;
							dropCount = itemMap[item.name].dropCount;
						} else {
							qty = 0;
							dropCount = 0;
						}
						if (item.columnBreak === true) {
							itemsHTMLIndex++;
						}
						itemsHTML[itemsHTMLIndex] += '<tr' + ((prevClassName != item.className) ? ' class="hvstat-table-row-divider"' : '') + '>' +
							'<th class="' + styleClassName + '">' + item.name + '</th>' +
							'<td class="' + styleClassName + '">' + qty + '</td>' +
							'<td class="' + styleClassName + '">' + dropCount + '</td>' +
							'<td class="' + styleClassName + '">' + hvStat.util.percentRatio(dropCount, total, 2) + "%" + '</td>' +
							'<td class="' + styleClassName + '">' + hvStat.util.percentRatio(dropCount, chanceTotal, 2) + "%" + '</td>' +
							'</tr>\n';
						prevClassName = item.className;
					}
					$('#hvstat-drops-items-tbody-1').html(itemsHTML[0]);
					$('#hvstat-drops-items-tbody-2').html(itemsHTML[1]);
				}
			};
		} catch (e) {
			console.log(e);
			alert(e);
		}
	},
	updateEquipments: function (dropType, difficulty, battleType) {
		try {
			var tx = hvStat.database.idb.transaction(["EquipmentDrops"], "readonly");
			var store = tx.objectStore("EquipmentDrops");
			var range = null;	// Select all
			var cursorOpenRequest = store.openCursor(range, "next");
			cursorOpenRequest.onerror = function (event) {
				var errorMessage = "EquipmentDrops: openCursor: error";
				console.log(errorMessage);
				console.debug(event);
				alert(errorMessage);
			};
			var equipmentsHTML = "";
			cursorOpenRequest.onsuccess = function (event) {
				//console.debug(event);
				var cursor = this.result;
				if (cursor) {
					//console.debug(cursor);
					var equipment = cursor.value;
					if ((dropType === null || dropType === equipment.dropType) &&
							(difficulty === null || difficulty === equipment.difficulty) &&
							(battleType === null || battleType === equipment.battleType)) {
						var arenaNumber = (equipment.arenaNumber === null) ? "-" : String(equipment.arenaNumber);
						var roundNumber = (equipment.roundNumber === null) ? "-" : String(equipment.roundNumber);
						// Reverse order
						equipmentsHTML = '<tr>' +
							'<th class="hvstat-color-equipment">' + equipment.name + '</th>' +
							'<td>' + hvStat.constant.difficulty[equipment.difficulty].name + '</td>' +
							'<td>' + hvStat.constant.battleType[equipment.battleType].name + '</td>' +
							'<td>' + arenaNumber + '</td>' +
							'<td>' + roundNumber + '</td>' +
							'<td>' + hvStat.util.getDateTimeString(new Date(equipment.timeStamp)) + '</td>' +
							'</tr>\n' +
							equipmentsHTML;
					}
					cursor.continue();
				} else {
					if (equipmentsHTML === "") {
						equipmentsHTML = '<tr>' +
							'<th>' + 'None yet!' + '</th>' +
							'<td>' + '-' + '</td>' +
							'<td>' + '-' + '</td>' +
							'<td>' + '-' + '</td>' +
							'<td>' + '-' + '</td>' +
							'<td>' + '-' + '</td>' +
							'</tr>\n';
					}
					$('#hvstat-drops-equipments-tbody').html(equipmentsHTML);
				}
			};
		} catch (e) {
			console.log(e);
			alert(e);
		}
	},
	onOverallStatsFilterChange: function () {
		var dropType = $('#hvstat-drops-overall-stats-drop-type').val();
		if (dropType === "_ALL_") {
			dropType = null;
		}
		var difficulty = $('#hvstat-drops-overall-stats-difficulty').val();
		if (difficulty === "_ALL_") {
			difficulty = null;
		}
		hvStat.ui.dropsPane.updateOverallStats(dropType, difficulty);
	},
	onItemFilterChange: function () {
		var dropType = $('#hvstat-drops-items-drop-type').val();
		if (dropType === "_ALL_") {
			dropType = null;
		}
		var difficulty = $('#hvstat-drops-items-difficulty').val();
		if (difficulty === "_ALL_") {
			difficulty = null;
		}
		var battleType = $('#hvstat-drops-items-battle-type').val();
		if (battleType === "_ALL_") {
			battleType = null;
		}
		hvStat.ui.dropsPane.updateItems(dropType, difficulty, battleType);
	},
	onEquipmentFilterChange: function () {
		var dropType = $('#hvstat-drops-equipments-drop-type').val();
		if (dropType === "_ALL_") {
			dropType = null;
		}
		var difficulty = $('#hvstat-drops-equipments-difficulty').val();
		if (difficulty === "_ALL_") {
			difficulty = null;
		}
		var battleType = $('#hvstat-drops-equipments-battle-type').val();
		if (battleType === "_ALL_") {
			battleType = null;
		}
		hvStat.ui.dropsPane.updateEquipments(dropType, difficulty, battleType);
	},
};

hvStat.ui.databasePane = {
	initialize: function () {
		$('#hvstat-database-pane').html(browser.extension.getResourceText("html/", "database-pane.html"));
		this.showSizeOfOldMonsterDatabase();
		$('#hvstat-database-monster-scan-results-export').click(function () {
			hvStat.database.monsterScanResults.export(function (result) {
				if (result.rowCount === 0) {
					alert("There are no data.");
				} else {
					var downloadLink = $('#hvstat-database-monster-scan-results-download');
					downloadLink.attr("href", result.dataURI);
					downloadLink.attr("download", "hvstat_monster_scan.tsv");
					downloadLink.css("visibility", "visible");
					alert("Ready to export.\nClick the download link.");
				}
			});
		});
		$('#hvstat-database-monster-skills-export').click(function () {
			hvStat.database.monsterSkills.export(function (result) {
				var downloadLink = $('#hvstat-database-monster-skills-download');
				if (result.rowCount === 0) {
					alert("There are no data.");
				} else {
					downloadLink.attr("href", result.dataURI);
					downloadLink.attr("download", "hvstat_monster_skill.tsv");
					downloadLink.css("visibility", "visible");
					alert("Ready to export.\nClick the download link.");
				}
			});
		});
		$('#hvstat-database-item-drops-export').click(function () {
			hvStat.database.itemDrops.export(function (result) {
				var downloadLink = $('#hvstat-database-item-drops-download');
				if (result.rowCount === 0) {
					alert("There are no data.");
				} else {
					downloadLink.attr("href", result.dataURI);
					downloadLink.attr("download", "hvstat_item_drops.tsv");
					downloadLink.css("visibility", "visible");
					alert("Ready to export.\nClick the download link.");
				}
			});
		});
		$('#hvstat-database-equipment-drops-export').click(function () {
			hvStat.database.equipmentDrops.export(function (result) {
				var downloadLink = $('#hvstat-database-equipment-drops-download');
				if (result.rowCount === 0) {
					alert("There are no data.");
				} else {
					downloadLink.attr("href", result.dataURI);
					downloadLink.attr("download", "hvstat_equipment_drops.tsv");
					downloadLink.css("visibility", "visible");
					alert("Ready to export.\nClick the download link.");
				}
			});
		});
		$('#hvstat-database-monster-scan-results-import').change(function (event) {
			var file = event.target.files[0];
			if (!file) {
				alert("Failed to load file");
			} else {
				if (confirm("Are you sure to import the data of monster scan results?")) {
					hvStat.database.monsterScanResults.import(file);
				}
			}
		});
		$('#hvstat-database-monster-skills-import').change(function (event) {
			var file = event.target.files[0];
			if (!file) {
				alert("Failed to load file");
			} else {
				if (confirm("Are you sure to import the data of monster skills?")) {
					hvStat.database.monsterSkills.import(file);
				}
			}
		});
		$('#hvstat-database-item-drops-import').change(function (event) {
			var file = event.target.files[0];
			if (!file) {
				alert("Failed to load file");
			} else {
				if (confirm("Are you sure to import the data of item drops?")) {
					hvStat.database.itemDrops.import(file);
				}
			}
		});
		$('#hvstat-database-equipment-drops-import').change(function (event) {
			var file = event.target.files[0];
			if (!file) {
				alert("Failed to load file");
			} else {
				if (confirm("Are you sure to import the data of equipment drops?")) {
					hvStat.database.equipmentDrops.import(file);
				}
			}
		});
		$('#hvstat-database-monster-scan-results-delete').click(function () {
			if (confirm("Are you sure to delete the data of monster scan results?")) {
				hvStat.database.monsterScanResults.delete(function (result) {
					alert("Your data of monster scan results have been deleted.\nCount: " + result.count);
				});
			}
		});
		$('#hvstat-database-monster-skills-delete').click(function () {
			if (confirm("Are you sure to delete the data of monster skills?")) {
				hvStat.database.monsterSkills.delete(function (result) {
					alert("Your data of monster skills have been deleted.\nCount: " + result.count);
				});
			}
		});
		$('#hvstat-database-item-drops-delete').click(function () {
			if (confirm("Are you sure to delete the data of item drops?")) {
				hvStat.database.itemDrops.delete(function (result) {
					alert("Your data of item drops have been deleted.\nCount: " + result.count);
				});
			}
		});
		$('#hvstat-database-equipment-drops-delete').click(function () {
			if (confirm("Are you sure to delete the data of equipment drops?")) {
				hvStat.database.equipmentDrops.delete(function (result) {
					alert("Your data of equipment drops have been deleted.\nCount: " + result.count);
				});
			}
		});
		$('#hvstat-database-delete').click(function () {
			if (confirm("Are you really sure to delete your database?")) {
				hvStat.database.deleteIndexedDB();
			}
		});
		$('#hvstat-database-migrate-monster-database').click(function () {
			if (confirm("Are you sure to migrate your monster database?")) {
				hvStat.migration.monsterDatabase.migrateDatabase();
			}
		});
		$('#hvstat-database-delete-old-monster-database').click(function () {
			if (confirm("Are you really sure to delete your old monster database?")) {
				hvStat.migration.monsterDatabase.deleteOldDatabase();
				hvStat.ui.databasePane.showSizeOfOldMonsterDatabase();
			}
		});
	},
	showSizeOfOldMonsterDatabase: function () {
		var size = ((localStorage.HVMonsterDatabase ? localStorage.HVMonsterDatabase.length : 0) / 1024 / 1024 * (browser.isChrome ? 2 : 1)).toFixed(2);
		$('#hvstat-database-old-monster-database-size').text(size);
	},
};

function initOverviewPane() {
	var innerHTML;
	if (hvStat.overview.totalRounds > 0) {
		innerHTML = browser.extension.getResourceText("html/", "overview-pane.html");
	} else {
		innerHTML = "No data found. Complete a round to begin tracking.";
	}
 	$('#hvstat-overview-pane').html(innerHTML);
	if (hvStat.overview.totalRounds === 0) {
		return;
	}

	var start = new Date(hvStat.overview.startTime);
	var now = new Date();
	var elapsedMilliseconds = now.getTime() - hvStat.overview.startTime;
	var elapsedSeconds = elapsedMilliseconds / 1000;
	var elapsedMinutes = elapsedSeconds / 60;
	var elapsedHours = elapsedMinutes / 60;
	var elapsedDays = elapsedHours / 24;

	var tdReportingPeriod = $('#hvstat-overview-reporting-period td');
	$(tdReportingPeriod[0]).text(start.toLocaleString());
	$(tdReportingPeriod[1]).text(now.toLocaleString());
	$(tdReportingPeriod[2]).text(hvStat.util.getElapseFrom(start));

 	var tdRoundsHourlyEncounters = $('#hvstat-overview-rounds-hourly-encounters td');
 	var tdRoundsArena = $('#hvstat-overview-rounds-arenas td');
 	var tdRoundsGrindfests = $('#hvstat-overview-rounds-grindfests td');
 	var tdRoundsItemWorlds = $('#hvstat-overview-rounds-item-worlds td');
 	var tdRoundsTotal = $('#hvstat-overview-rounds-total td');

	$(tdRoundsHourlyEncounters[0]).text(hvStat.util.numberWithCommas(hvStat.overview.roundArray[0]));
	$(tdRoundsHourlyEncounters[1]).text(hvStat.util.percentRatio(hvStat.overview.roundArray[0], hvStat.overview.totalRounds, 2) + "%");
	$(tdRoundsHourlyEncounters[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.roundArray[0], elapsedHours).toFixed(2)));
	$(tdRoundsHourlyEncounters[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.roundArray[0], elapsedDays).toFixed(2)));

	var lastHourlyEncounter;
	if (hvStat.overview.lastHourlyTime === 0) {
		lastHourlyEncounter = "Never";
	} else {
		lastHourlyEncounter = (new Date(hvStat.overview.lastHourlyTime)).toLocaleTimeString();
	}
	$(tdRoundsHourlyEncounters[4]).children('span').text(lastHourlyEncounter);

	$(tdRoundsArena[0]).text(hvStat.util.numberWithCommas(hvStat.overview.roundArray[1]));
	$(tdRoundsArena[1]).text(hvStat.util.percentRatio(hvStat.overview.roundArray[1], hvStat.overview.totalRounds, 2) + "%");
	$(tdRoundsArena[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.roundArray[1], elapsedHours).toFixed(2)));
	$(tdRoundsArena[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.roundArray[1], elapsedDays).toFixed(2)));

	$(tdRoundsGrindfests[0]).text(hvStat.util.numberWithCommas(hvStat.overview.roundArray[2]));
	$(tdRoundsGrindfests[1]).text(hvStat.util.percentRatio(hvStat.overview.roundArray[2], hvStat.overview.totalRounds, 2) + "%");
	$(tdRoundsGrindfests[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.roundArray[2], elapsedHours).toFixed(2)));
	$(tdRoundsGrindfests[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.roundArray[2], elapsedDays).toFixed(2)));

	$(tdRoundsItemWorlds[0]).text(hvStat.util.numberWithCommas(hvStat.overview.roundArray[3]));
	$(tdRoundsItemWorlds[1]).text(hvStat.util.percentRatio(hvStat.overview.roundArray[3], hvStat.overview.totalRounds, 2) + "%");
	$(tdRoundsItemWorlds[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.roundArray[3], elapsedHours).toFixed(2)));
	$(tdRoundsItemWorlds[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.roundArray[3], elapsedDays).toFixed(2)));

	$(tdRoundsTotal[0]).text(hvStat.util.numberWithCommas(hvStat.overview.totalRounds));
	$(tdRoundsTotal[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.totalRounds, elapsedHours).toFixed(2)));
	$(tdRoundsTotal[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.totalRounds, elapsedDays).toFixed(2)));

 	var tdExpHourlyEncounters = $('#hvstat-overview-exp-hourly-encounters td');
 	var tdExpArena = $('#hvstat-overview-exp-arenas td');
 	var tdExpGrindfests = $('#hvstat-overview-exp-grindfests td');
 	var tdExpItemWorlds = $('#hvstat-overview-exp-item-worlds td');
 	var tdExpTotal = $('#hvstat-overview-exp-total td');

	$(tdExpHourlyEncounters[0]).text(hvStat.util.numberWithCommas(hvStat.overview.expbyBT[0]));
	$(tdExpHourlyEncounters[1]).text(hvStat.util.percentRatio(hvStat.overview.expbyBT[0], hvStat.overview.exp, 2) + "%");
	$(tdExpHourlyEncounters[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[0], hvStat.overview.roundArray[0]).toFixed()));
	$(tdExpHourlyEncounters[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[0], elapsedHours).toFixed()));
	$(tdExpHourlyEncounters[4]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[0], elapsedDays).toFixed()));

	$(tdExpArena[0]).text(hvStat.util.numberWithCommas(hvStat.overview.expbyBT[1]));
	$(tdExpArena[1]).text(hvStat.util.percentRatio(hvStat.overview.expbyBT[1], hvStat.overview.exp, 2) + "%");
	$(tdExpArena[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[1], hvStat.overview.roundArray[1]).toFixed()));
	$(tdExpArena[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[1], elapsedHours).toFixed()));
	$(tdExpArena[4]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[1], elapsedDays).toFixed()));

	$(tdExpGrindfests[0]).text(hvStat.util.numberWithCommas(hvStat.overview.expbyBT[2]));
	$(tdExpGrindfests[1]).text(hvStat.util.percentRatio(hvStat.overview.expbyBT[2], hvStat.overview.exp, 2) + "%");
	$(tdExpGrindfests[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[2], hvStat.overview.roundArray[2]).toFixed()));
	$(tdExpGrindfests[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[2], elapsedHours).toFixed()));
	$(tdExpGrindfests[4]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[2], elapsedDays).toFixed()));

	$(tdExpItemWorlds[0]).text(hvStat.util.numberWithCommas(hvStat.overview.expbyBT[3]));
	$(tdExpItemWorlds[1]).text(hvStat.util.percentRatio(hvStat.overview.expbyBT[3], hvStat.overview.exp, 2) + "%");
	$(tdExpItemWorlds[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[3], hvStat.overview.roundArray[3]).toFixed()));
	$(tdExpItemWorlds[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[3], elapsedHours).toFixed()));
	$(tdExpItemWorlds[4]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[3], elapsedDays).toFixed()));

	$(tdExpTotal[0]).text(hvStat.util.numberWithCommas(hvStat.overview.exp));
	$(tdExpTotal[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.exp, hvStat.overview.totalRounds).toFixed()));
	$(tdExpTotal[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.exp, elapsedHours).toFixed()));
	$(tdExpTotal[4]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.exp, elapsedDays).toFixed()));

	var tdCreditsHourlyEncounters = $('#hvstat-overview-credits-hourly-encounters td');
	var tdCreditsArena = $('#hvstat-overview-credits-arenas td');
 	var tdCreditsGrindfests = $('#hvstat-overview-credits-grindfests td');
 	var tdCreditsItemWorlds = $('#hvstat-overview-credits-item-worlds td');
	var tdCreditsTotal = $('#hvstat-overview-credits-total td');

	$(tdCreditsHourlyEncounters[0]).text(hvStat.util.numberWithCommas(hvStat.overview.creditsbyBT[0]));
	$(tdCreditsHourlyEncounters[1]).text(hvStat.util.percentRatio(hvStat.overview.creditsbyBT[0], hvStat.overview.credits, 2) + "%");
	$(tdCreditsHourlyEncounters[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.creditsbyBT[0], hvStat.overview.roundArray[0]).toFixed()));
	$(tdCreditsHourlyEncounters[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.creditsbyBT[0], elapsedHours).toFixed()));
	$(tdCreditsHourlyEncounters[4]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.creditsbyBT[0], elapsedDays).toFixed()));

	$(tdCreditsArena[0]).text(hvStat.util.numberWithCommas(hvStat.overview.creditsbyBT[1]));
	$(tdCreditsArena[1]).text(hvStat.util.percentRatio(hvStat.overview.creditsbyBT[1], hvStat.overview.credits, 2) + "%");
	$(tdCreditsArena[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.creditsbyBT[1], hvStat.overview.roundArray[1]).toFixed()));
	$(tdCreditsArena[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.creditsbyBT[1], elapsedHours).toFixed()));
	$(tdCreditsArena[4]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.creditsbyBT[1], elapsedDays).toFixed()));

	$(tdCreditsGrindfests[0]).text(hvStat.util.numberWithCommas(hvStat.overview.creditsbyBT[2]));
	$(tdCreditsGrindfests[1]).text(hvStat.util.percentRatio(hvStat.overview.creditsbyBT[2], hvStat.overview.credits, 2) + "%");
	$(tdCreditsGrindfests[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.creditsbyBT[2], hvStat.overview.roundArray[2]).toFixed()));
	$(tdCreditsGrindfests[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.creditsbyBT[2], elapsedHours).toFixed()));
	$(tdCreditsGrindfests[4]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.creditsbyBT[2], elapsedDays).toFixed()));

	$(tdCreditsItemWorlds[0]).text(hvStat.util.numberWithCommas(hvStat.overview.creditsbyBT[3]));
	$(tdCreditsItemWorlds[1]).text(hvStat.util.percentRatio(hvStat.overview.creditsbyBT[3], hvStat.overview.credits, 2) + "%");
	$(tdCreditsItemWorlds[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.creditsbyBT[3], hvStat.overview.roundArray[3]).toFixed()));
	$(tdCreditsItemWorlds[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.creditsbyBT[3], elapsedHours).toFixed()));
	$(tdCreditsItemWorlds[4]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.creditsbyBT[3], elapsedDays).toFixed()));

	$(tdCreditsTotal[0]).text(hvStat.util.numberWithCommas(hvStat.overview.credits));
	$(tdCreditsTotal[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.credits, hvStat.overview.totalRounds).toFixed()));
	$(tdCreditsTotal[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.credits, elapsedHours).toFixed()));
	$(tdCreditsTotal[4]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.credits, elapsedDays).toFixed()));

	var tdDropsEquipments = $('#hvstat-overview-drops-equipments td');
	var tdDropsArtifacts = $('#hvstat-overview-drops-artifacts td');

	$(tdDropsEquipments[0]).text(hvStat.util.numberWithCommas(hvStat.overview.equips));
	$(tdDropsEquipments[1]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.equips, elapsedHours).toFixed(2)));
	$(tdDropsEquipments[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.equips, elapsedDays).toFixed(2)));
	$(tdDropsEquipments[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.totalRounds, hvStat.overview.equips).toFixed(2)));

	$(tdDropsArtifacts[0]).text(hvStat.overview.artifacts);
	$(tdDropsArtifacts[1]).text(hvStat.util.ratio(hvStat.overview.artifacts, elapsedHours).toFixed(2));
	$(tdDropsArtifacts[2]).text(hvStat.util.ratio(hvStat.overview.artifacts, elapsedDays).toFixed(2));
	$(tdDropsArtifacts[3]).text(hvStat.util.ratio(hvStat.overview.totalRounds, hvStat.overview.artifacts).toFixed(2));

	var spanDropsEquipmentLastFound = $('#hvstat-overview-drops-equipments span');
	var spanDropsArtifactLastFound = $('#hvstat-overview-drops-artifacts span');

	var lastFoundName, lastFoundTime;
	if (hvStat.overview.equips === 0) {
		lastFoundName = "None yet!";
		lastFoundTime = "N/A";
	} else {
		lastFoundName = hvStat.overview.lastEquipName;
		lastFoundTime = hvStat.util.getRelativeTime(hvStat.overview.lastEquipTime);
	}
	$(spanDropsEquipmentLastFound[0]).text(lastFoundName);
	$(spanDropsEquipmentLastFound[1]).text(lastFoundTime);

	if (hvStat.overview.artifacts === 0) {
		lastFoundName = "None yet!";
		lastFoundTime = "N/A";
	} else {
		lastFoundName = hvStat.overview.lastArtName;
		lastFoundTime = hvStat.util.getRelativeTime(hvStat.overview.lastArtTime);
	}
	$(spanDropsArtifactLastFound[0]).text(lastFoundName);
	$(spanDropsArtifactLastFound[1]).text(lastFoundTime);

	$('#hvstat-overview-reset').click(function () {
		if (confirm("Reset Overview tab?")) {
			hvStat.storage.overview.reset();
		}
	});
}

function initBattleStatsPane() {
	var innerHTML;
	if (hvStat.stats.rounds > 0) {
		innerHTML = browser.extension.getResourceText("html/", "battle-stats-pane.html");
	} else {
		innerHTML = "No data found. Complete a round to begin tracking.";
	}
	$("#hvstat-battle-stats-pane").html(innerHTML);

	if (hvStat.stats.rounds > 0) {
		if (!hvStat.settings.isTrackStats) {
			$("#hvstat-battle-stats-pane .hvstat-tracking-paused").show();
		}
		var j = hvStat.stats.elemSpells[1] + hvStat.stats.divineSpells[1] + hvStat.stats.forbidSpells[1];	// unused
		var i = hvStat.stats.supportSpells + hvStat.stats.curativeSpells + hvStat.stats.depSpells[1] + hvStat.stats.sHits[0] + hvStat.stats.sHits[1];
		var h = hvStat.stats.sHits[0] + hvStat.stats.sHits[1] + hvStat.stats.depSpells[1] + hvStat.stats.sResists;
		var g = hvStat.stats.sHits[0] + hvStat.stats.sHits[1] + hvStat.stats.depSpells[1];
		var f = hvStat.stats.aHits[0] + hvStat.stats.aHits[1];
		var e = hvStat.stats.sHits[0] + hvStat.stats.sHits[1];
		var d = hvStat.stats.mHits[0] + hvStat.stats.mHits[1];
		var b = hvStat.stats.dDealt[0] + hvStat.stats.dDealt[1] + hvStat.stats.dDealt[2];
		var a = hvStat.stats.dDealt[0] + hvStat.stats.dDealt[1];
		var bp = hvStat.stats.pParries + hvStat.stats.pBlocks;
		var call = hvStat.stats.aCounters[0] - hvStat.stats.aCounters[2] - 2*hvStat.stats.aCounters[3];
		var c1 = hvStat.stats.aCounters[0] - 2*hvStat.stats.aCounters[2] - 3*hvStat.stats.aCounters[3];
		var dst = new Date();
		dst.setTime(hvStat.stats.datestart);
		var dst1 = dst.toLocaleString();
		var dom = hvStat.stats.aDomino[0];
		var elall = hvStat.stats.elemSpells[1] + hvStat.stats.elemSpells[3];	// unused
		var divall = hvStat.stats.divineSpells[1] + hvStat.stats.divineSpells[3];	// unused
		var forall = hvStat.stats.forbidSpells[1] + hvStat.stats.forbidSpells[3];	// unused
		var offhand = hvStat.stats.aOffhands[0] + hvStat.stats.aOffhands[2];
		var offhanddam = hvStat.stats.aOffhands[1] + hvStat.stats.aOffhands[3];
		if (browser.isChrome) dst1 = dst.toLocaleDateString() + " " + dst.toLocaleTimeString();
		$('#hvstat-battle-stats-rounds-tracked').text(hvStat.stats.rounds);
		$('#hvstat-battle-stats-since').text(dst1);
		$('#hvstat-battle-stats-monsters-killed').text(hvStat.stats.kills);

		$('#hvstat-battle-stats-p-accuracy').text(hvStat.stats.aAttempts === 0 ? 0 : (f / hvStat.stats.aAttempts * 100).toFixed(2));
		$('#hvstat-battle-stats-m-accuracy').text(h === 0 ? 0 : (g / h * 100).toFixed(2));
		$('#hvstat-battle-stats-p-crit-chance').text(f === 0 ? 0 : (hvStat.stats.aHits[1] / f * 100).toFixed(2));
		$('#hvstat-battle-stats-m-crit-chance').text(e === 0 ? 0 : (hvStat.stats.sHits[1] / e * 100).toFixed(2));

		$('#hvstat-battle-stats-overwhelming-strikes-chance').text(f === 0 ? 0 : (hvStat.stats.overStrikes / f * 100).toFixed(2));
		$('#hvstat-battle-stats-counter-chance').text(bp === 0 ? 0 : (hvStat.stats.aCounters[0]*100/bp).toFixed(2));
		$('#hvstat-battle-stats-1-counter').text(c1 === 0 ? 0 : (c1*100/call).toFixed(2));
		$('#hvstat-battle-stats-2-counter').text(hvStat.stats.aCounters[2] === 0 ? 0 : (hvStat.stats.aCounters[2]*100/call).toFixed(2));
		$('#hvstat-battle-stats-3-counter').text(hvStat.stats.aCounters[3] === 0 ? 0 :(hvStat.stats.aCounters[3]*100/call).toFixed(2));
		$('#hvstat-battle-stats-stun-chance-on-counter').text(call === 0 ? 0 : (hvStat.stats.weaponprocs[7]*100/call).toFixed(2));
		$('#hvstat-battle-stats-average-counter-damage').text(hvStat.stats.aCounters[0] === 0 ? 0 : (hvStat.stats.aCounters[1] / hvStat.stats.aCounters[0]).toFixed(2));

		$('#hvstat-battle-stats-offhand-strike-chance').text(f === 0 ? 0 : (offhand / f * 100).toFixed(2));
		$('#hvstat-battle-stats-chenneling-chance').text(i === 0 ? 0 : (hvStat.stats.channel / i * 100).toFixed(2));
		$('#hvstat-battle-stats-average-offhand-damage').text(offhand === 0 ? 0 : (offhanddam / offhand).toFixed(2));

		$('#hvstat-battle-stats-domino-strike-chance').text(f === 0 ? 0 : (dom / f * 100).toFixed(2));
		$('#hvstat-battle-stats-domino-2-hits').text(dom === 0 ? 0 : (hvStat.stats.aDomino[2]*100 / dom).toFixed(2));
		$('#hvstat-battle-stats-domino-3-hits').text(dom === 0 ? 0 : (hvStat.stats.aDomino[3]*100 / dom).toFixed(2));
		$('#hvstat-battle-stats-domino-4-hits').text(dom === 0 ? 0 : (hvStat.stats.aDomino[4]*100 / dom).toFixed(2));
		$('#hvstat-battle-stats-domino-5-hits').text(dom === 0 ? 0 : (hvStat.stats.aDomino[5]*100 / dom).toFixed(2));
		$('#hvstat-battle-stats-domino-6-hits').text(dom === 0 ? 0 : (hvStat.stats.aDomino[6]*100 / dom).toFixed(2));
		$('#hvstat-battle-stats-domino-7-hits').text(dom === 0 ? 0 : (hvStat.stats.aDomino[7]*100 / dom).toFixed(2));
		$('#hvstat-battle-stats-domino-8-hits').text(dom === 0 ? 0 : (hvStat.stats.aDomino[8]*100 / dom).toFixed(2));
		$('#hvstat-battle-stats-domino-9-hits').text(dom === 0 ? 0 : (hvStat.stats.aDomino[9]*100 / dom).toFixed(2));
		$('#hvstat-battle-stats-domino-average-number-of-hits').text(dom === 0 ? 0 : (hvStat.stats.aDomino[1] / dom).toFixed(2));

		$('#hvstat-battle-stats-stun-chance').text(f === 0 ? 0 : (hvStat.stats.weaponprocs[0]*100 / f).toFixed(2));
		$('#hvstat-battle-stats-penetrated-armor-chance').text(f === 0 ? 0 : (hvStat.stats.weaponprocs[1]*100 / f).toFixed(2));

		$('#hvstat-battle-stats-bleeding-wound-chance').text(f === 0 ? 0 : (hvStat.stats.weaponprocs[2]*100 / f).toFixed(2));
		$('#hvstat-battle-stats-average-damage-dealt-per-hit').text(hvStat.stats.aHits[0] === 0 ? 0 : (hvStat.stats.dDealt[0] / hvStat.stats.aHits[0]).toFixed(2));
		$('#hvstat-battle-stats-average-damage-dealt-per-spell').text(hvStat.stats.sHits[0] === 0 ? 0 : (hvStat.stats.dDealtSp[0] / hvStat.stats.sHits[0]).toFixed(2));
		$('#hvstat-battle-stats-average-damage-dealt-per-crit').text(hvStat.stats.aHits[1] === 0 ? 0 : (hvStat.stats.dDealt[1] / hvStat.stats.aHits[1]).toFixed(2));
		$('#hvstat-battle-stats-average-damage-dealt-per-spell-crit').text(hvStat.stats.sHits[1] === 0 ? 0 : (hvStat.stats.dDealtSp[1] / hvStat.stats.sHits[1]).toFixed(2));
		$('#hvstat-battle-stats-average-spell-damage-dealt').text(e === 0 ? 0 : ((hvStat.stats.dDealtSp[0] + hvStat.stats.dDealtSp[1]) / e).toFixed(2));
		$('#hvstat-battle-stats-average-damage-dealt-without-bleeding-wound').text(f === 0 ? 0 : (a / f).toFixed(2));
		$('#hvstat-battle-stats-average-damage-dealt-with-bleeding-wound').text(f === 0 ? 0 : (b / f).toFixed(2));
		$('#hvstat-battle-stats-percent-total-damage-from-bleeding-wound').text(b === 0 ? 0 : (hvStat.stats.dDealt[2] / b * 100).toFixed(2));
		$('#hvstat-battle-stats-percent-change-in-average-damage').text(a === 0 ? 0 : (Math.abs(((b / f) - (a / f))) / Math.abs(a / f) * 100).toFixed(2));

		$('#hvstat-battle-stats-drain-hp-chance').text(f === 0 ? 0 : (hvStat.stats.weaponprocs[4]*100 / f).toFixed(2));
		$('#hvstat-battle-stats-drain-mp-chance').text(f === 0 ? 0 : (hvStat.stats.weaponprocs[5]*100 / f).toFixed(2));
		$('#hvstat-battle-stats-drain-sp-chance').text(f === 0 ? 0 : (hvStat.stats.weaponprocs[6]*100 / f).toFixed(2));

		$('#hvstat-battle-stats-overall-chance-of-getting-hit').text(hvStat.stats.mAttempts === 0 ? 0 : (d / hvStat.stats.mAttempts * 100).toFixed(2));
		$('#hvstat-battle-stats-miss-chance').text(hvStat.stats.mAttempts === 0 ? 0 : (hvStat.stats.pDodges / hvStat.stats.mAttempts * 100).toFixed(2));
		$('#hvstat-battle-stats-average-hp-restored-by-cure').text(hvStat.stats.cureCounts[0] === 0 ? 0 : (hvStat.stats.cureTotals[0] / hvStat.stats.cureCounts[0]).toFixed(2));
		$('#hvstat-battle-stats-evade-chance').text(hvStat.stats.mAttempts === 0 ? 0 : (hvStat.stats.pEvades / hvStat.stats.mAttempts * 100).toFixed(2));
		$('#hvstat-battle-stats-average-hp-restored-by-cure2').text(hvStat.stats.cureCounts[1] === 0 ? 0 : (hvStat.stats.cureTotals[1] / hvStat.stats.cureCounts[1]).toFixed(2));
		$('#hvstat-battle-stats-block-chance').text(hvStat.stats.mAttempts === 0 ? 0 : (hvStat.stats.pBlocks / hvStat.stats.mAttempts * 100).toFixed(2));
		$('#hvstat-battle-stats-average-hp-restored-by-cure3').text(hvStat.stats.cureCounts[2] === 0 ? 0 : (hvStat.stats.cureTotals[2] / hvStat.stats.cureCounts[2]).toFixed(2));
		$('#hvstat-battle-stats-parry-chance').text(hvStat.stats.mAttempts === 0 ? 0 : (hvStat.stats.pParries / hvStat.stats.mAttempts * 100).toFixed(2));
		$('#hvstat-battle-stats-absorb-casting-efficiency').text(hvStat.stats.absArry[0] === 0 ? 0 : (hvStat.stats.absArry[1] / hvStat.stats.absArry[0] * 100).toFixed(2));
		$('#hvstat-battle-stats-resist-chance').text(hvStat.stats.mSpells === 0 ? 0 : (hvStat.stats.pResists / hvStat.stats.mSpells * 100).toFixed(2));
		$('#hvstat-battle-stats-average-mp-drained-by-absorb').text(hvStat.stats.absArry[1] === 0 ? 0 : (hvStat.stats.absArry[2] / hvStat.stats.absArry[1]).toFixed(2));
		$('#hvstat-battle-stats-monster-crit-chance').text(hvStat.stats.mAttempts === 0 ? 0 : (hvStat.stats.mHits[1] / hvStat.stats.mAttempts * 100).toFixed(2));
		$('#hvstat-battle-stats-average-mp-returns-of-absorb').text(hvStat.stats.absArry[0] === 0 ? 0 : (hvStat.stats.absArry[2] / hvStat.stats.absArry[0]).toFixed(2));
		$('#hvstat-battle-stats-percent-of-monster-hits-that-are-crits').text(d === 0 ? 0 : (hvStat.stats.mHits[1] / d * 100).toFixed(2));
		$('#hvstat-battle-stats-average-damage-taken-per-hit').text(hvStat.stats.mHits[0] === 0 ? 0 : (hvStat.stats.dTaken[0] / hvStat.stats.mHits[0]).toFixed(2));
		$('#hvstat-battle-stats-average-damage-taken-per-crit').text(hvStat.stats.mHits[1] === 0 ? 0 : (hvStat.stats.dTaken[1] / hvStat.stats.mHits[1]).toFixed(2));
		$('#hvstat-battle-stats-average-damage-taken').text(d === 0 ? 0 : ((hvStat.stats.dTaken[0] + hvStat.stats.dTaken[1]) / d).toFixed(2));
		$('#hvstat-battle-stats-average-total-damage-taken-per-round').text(hvStat.stats.rounds === 0 ? 0 : ((hvStat.stats.dTaken[0] + hvStat.stats.dTaken[1]) / hvStat.stats.rounds).toFixed(2));
	}

	$("._resetStats").click(function () {
		if (confirm("Reset Stats tab?")) hvStat.storage.stats.reset();
	});
	$("._checkBackups").click(function () {
		var ds = [];
		var d = [];
		ds[1] = ds[2] = ds[3] = ds[4] = ds[5] = "None yet";
		d[1] = d[2] = d[3] = d[4] = d[5] = "Never";
		var nd = new Date();
		for (var i = 1; i <= 5; i++) {
			if (hvStat.statsBackups[i].datesave !== 0) {
				nd.setTime( hvStat.statsBackups[i].datesave);
				ds[i] = nd.toLocaleString();
				if (browser.isChrome) ds[i] = nd.toLocaleDateString() + " " + nd.toLocaleTimeString();
			}
			if (hvStat.statsBackups[i].datestart !== 0) {
				nd.setTime( hvStat.statsBackups[i].datestart);
				d[i] = nd.toLocaleString();
				if (browser.isChrome) d[i] = nd.toLocaleDateString() + " " + nd.toLocaleTimeString();
			}
		}
		alert( "Backup 1:\nLast save date: " + ds[1] + "\nStats tracked since: " + d[1] + "\nNumber of rounds tracked: " + hvStat.statsBackups[1].rounds
			+ "\n\nBackup 2\nLast save date: " + ds[2] + "\nStats tracked since: " + d[2] + "\nNumber of rounds tracked: " + hvStat.statsBackups[2].rounds
			+ "\n\nBackup 3\nLast save date: " + ds[3] + "\nStats tracked since: " + d[3] + "\nNumber of rounds tracked: " + hvStat.statsBackups[3].rounds
			+ "\n\nBackup 4\nLast save date: " + ds[4] + "\nStats tracked since: " + d[4] + "\nNumber of rounds tracked: " + hvStat.statsBackups[4].rounds
			+ "\n\nBackup 5\nLast save date: " + ds[5] + "\nStats tracked since: " + d[5] + "\nNumber of rounds tracked: " + hvStat.statsBackups[5].rounds);
	});

	$("._backupFunc").click(function () {
		var backupID = Number(document.getElementById("BackupNumber").options[document.getElementById("BackupNumber").selectedIndex].value);
		if (backupID < 1 || backupID > 5) {
			alert ("'" + backupID + "'" + " is not correct number: " + "Choose beetwen 1-5");
			return;
		}
		var ba = hvStat.storage.statsBackups[backupID];

		switch ($(this).attr("value")) {
		case "Save Backup":
			if (confirm("Save stats to backup " + backupID + "?")) {
				saveStatsBackup(backupID);
				ba.value.datesave = (new Date()).getTime();
				ba.save();
			}
			break;
		case "Load Backup":
			if (confirm("Load stats from backup " + backupID + "?")) {
				loadStatsBackup(backupID);
				hvStat.storage.stats.save();
			}
			break;
		case "AddTo Backup":
			if (confirm("Add stats to backup " + backupID + "?")) {
				addtoStatsBackup(backupID);
				ba.value.datesave = (new Date()).getTime();
				ba.save();
			}
			break;
		case "AddFrom Backup":
			if (confirm("Add stats from backup " + backupID + "?")) {
				addfromStatsBackup(backupID);
				hvStat.storage.stats.save();
			}
			break;
		case "Remove Backup":
			if (confirm("Remove stats from backup " + backupID + "?")) {
				ba.reset();
			}
		}
	});
}

function initShrinePane() {
	var innerHTML;
	if (hvStat.shrine.totalRewards === 0) {
		innerHTML = "No data found. Make an offering at Snowflake's Shrine to begin tracking.";
	} else {
		innerHTML = browser.extension.getResourceText("html/", "shrine-pane.html");
	}
	$('#hvstat-shrine-pane').html(innerHTML);
	if (hvStat.shrine.totalRewards > 0) {
		if (!hvStat.settings.isTrackShrine) {
			$('#hvstat-shrine-pane .hvstat-tracking-paused').show();
		}
		var tdAttributes = $('#hvstat-shrine-artifact-attributes td');
		var tdHath = $('#hvstat-shrine-artifact-hath td');
		var tdCrystals = $('#hvstat-shrine-artifact-crystals td');
		var tdEnergyDrinks = $('#hvstat-shrine-artifact-energy-drinks td');
		var tdElixers = $('#hvstat-shrine-artifact-elixers td');
		var tdTotal = $('#hvstat-shrine-artifact-total td');
		$(tdAttributes[0]).text(hvStat.shrine.artifactStat);
		$(tdAttributes[1]).text(hvStat.util.percentRatio(hvStat.shrine.artifactStat, hvStat.shrine.artifactsTraded, 2) + "%");
		$(tdHath[0]).text(hvStat.shrine.artifactHath);
		$(tdHath[1]).text(hvStat.util.percentRatio(hvStat.shrine.artifactHath, hvStat.shrine.artifactsTraded, 2) + "%");
		$(tdHath[2]).text("(" + hvStat.util.ratio(hvStat.shrine.artifactHathTotal, hvStat.shrine.artifactsTraded).toFixed(2) + " Hath per Artifact)");
		$(tdCrystals[0]).text(hvStat.shrine.artifactCrystal);
		$(tdCrystals[1]).text(hvStat.util.percentRatio(hvStat.shrine.artifactCrystal, hvStat.shrine.artifactsTraded, 2) + "%");
		$(tdEnergyDrinks[0]).text(hvStat.shrine.artifactItem);
		$(tdEnergyDrinks[1]).text(hvStat.util.percentRatio(hvStat.shrine.artifactItem, hvStat.shrine.artifactsTraded, 2) + "%");
		$(tdElixers[0]).text(hvStat.shrine.artifactElixer);
		$(tdElixers[1]).text(hvStat.util.percentRatio(hvStat.shrine.artifactElixer, hvStat.shrine.artifactsTraded, 2) + "%");
		$(tdTotal[0]).text(hvStat.shrine.artifactsTraded);

		var i = hvStat.shrine.trophyArray.length;
		var trophiesHTML = "";
		while (i--) {
			trophiesHTML += '<li>' + hvStat.shrine.trophyArray[i] + '</li>';
		}
		$('#hvstat-shrine-trophies').html(trophiesHTML);
		$('#hvstat-shrine-clear-trophies').click(function () {
			if (confirm("Clear Trophy list?")) {
				hvStat.shrine.trophyArray = [];
				hvStat.storage.shrine.save();
			}
		});
		$('#hvstat-shrine-reset').click(function () {
			if (confirm("Reset Shrine tab?")) {
				hvStat.storage.shrine.reset();
			}
		});
	}
}

function initSettingsPane() {
	$("#hvstat-settings-pane").html(browser.extension.getResourceText("html/", "settings-pane.html"));

	//------------------------------------
	// Set initial values
	//------------------------------------

	// General
	if (hvStat.settings.isChangePageTitle) $("input[name=isChangePageTitle]").attr("checked", "checked");
	$("input[name=customPageTitle]").attr("value", hvStat.settings.customPageTitle);
	if (hvStat.settings.isShowEquippedSet) $("input[name=isShowEquippedSet]").attr("checked", "checked");
	if (hvStat.settings.isShowSidebarProfs) $("input[name=isShowSidebarProfs]").attr("checked", "checked");
	if (hvStat.settings.isStartAlert) $("input[name=isStartAlert]").attr("checked", "checked");
	$("input[name=StartAlertHP]").attr("value", hvStat.settings.StartAlertHP);
	$("input[name=StartAlertMP]").attr("value", hvStat.settings.StartAlertMP);
	$("input[name=StartAlertSP]").attr("value", hvStat.settings.StartAlertSP);
	var diffsel = "diff" + String(hvStat.settings.StartAlertDifficulty);
	$("#" + diffsel).attr("selected", true);
	if (hvStat.settings.isShowTags[0]) $("input[name=isShowTags0]").attr("checked", "checked");
	if (hvStat.settings.isShowTags[1]) $("input[name=isShowTags1]").attr("checked", "checked");
	if (hvStat.settings.isShowTags[2]) $("input[name=isShowTags2]").attr("checked", "checked");
	if (hvStat.settings.isShowTags[3]) $("input[name=isShowTags3]").attr("checked", "checked");
	if (hvStat.settings.isShowTags[4]) $("input[name=isShowTags4]").attr("checked", "checked");
	if (hvStat.settings.isShowTags[5]) $("input[name=isShowTags5]").attr("checked", "checked");

	// Keyboard
	if (hvStat.settings.adjustKeyEventHandling) $("input[name=adjustKeyEventHandling]").attr("checked", "checked");
	if (hvStat.settings.isEnableScanHotkey) $("input[name=isEnableScanHotkey]").attr("checked", "checked");
	if (hvStat.settings.isEnableSkillHotkey) $("input[name=isEnableSkillHotkey]").attr("checked", "checked");
	if (hvStat.settings.reverseSkillHotkeyTraversalOrder) $("input[name=reverseSkillHotkeyTraversalOrder]").attr("checked", "checked");
	if (hvStat.settings.enableOFCHotkey) $("input[name=enableOFCHotkey]").attr("checked", "checked");
	if (hvStat.settings.enableScrollHotkey) $("input[name=enableScrollHotkey]").attr("checked", "checked");
	if (hvStat.settings.isDisableForgeHotKeys) $("input[name=isDisableForgeHotKeys]").attr("checked", "checked");
	if (hvStat.settings.enableShrineKeyPatch) $("input[name=enableShrineKeyPatch]").attr("checked", "checked");

	// Tracking
	if (hvStat.settings.isTrackStats) $("input[name=isTrackStats]").attr("checked", "checked");
	if (hvStat.settings.isTrackShrine) $("input[name=isTrackShrine]").attr("checked", "checked");
	if (hvStat.settings.isTrackItems) $("input[name=isTrackItems]").attr("checked", "checked");

	// Battle Enhancement
	if (hvStat.settings.isShowRoundCounter) $("input[name=isShowRoundCounter]").attr("checked", "checked");
	if (hvStat.settings.isShowRoundReminder) $("input[name=isShowRoundReminder]").attr("checked", "checked");
	$("input[name=reminderMinRounds]").attr("value", hvStat.settings.reminderMinRounds);
	$("input[name=reminderBeforeEnd]").attr("value", hvStat.settings.reminderBeforeEnd);
	if (hvStat.settings.isShowSelfDuration) $("input[name=isShowSelfDuration]").attr("checked", "checked");
	if (hvStat.settings.isSelfEffectsWarnColor) $("input[name=isSelfEffectsWarnColor]").attr("checked", "checked");
	$("input[name=SelfWarnOrangeRounds]").attr("value", hvStat.settings.SelfWarnOrangeRounds);
	$("input[name=SelfWarnRedRounds]").attr("value", hvStat.settings.SelfWarnRedRounds);
	if (hvStat.settings.showSelfEffectStackLevel) $("input[name=showSelfEffectStackLevel]").attr("checked", "checked");
	if (hvStat.settings.isShowPowerupBox) $("input[name=isShowPowerupBox]").attr("checked", "checked");
	if (hvStat.settings.isShowHighlight) $("input[name=isShowHighlight]").attr("checked", "checked");
	if (hvStat.settings.isAltHighlight) $("input[name=isAltHighlight]").attr("checked", "checked");
	if (hvStat.settings.isShowDivider) $("input[name=isShowDivider]").attr("checked", "checked");
	if (hvStat.settings.isShowScanButton) $("input[name=isShowScanButton]").attr("checked", "checked");
	if (hvStat.settings.highlightScanButtonWhenScanResultExpired) $("input[name=highlightScanButtonWhenScanResultExpired]").attr("checked", "checked");
	$("input[name=nDaysUntilScanResultExpiration]").attr("value", hvStat.settings.nDaysUntilScanResultExpiration);
	if (hvStat.settings.isShowSkillButton) $("input[name=isShowSkillButton]").attr("checked", "checked");
	if (hvStat.settings.isShowMonsterNumber) $("input[name=isShowMonsterNumber]").attr("checked", "checked"); //isShowMonsterNumber stolen from HV Lite, and added by Ilirith
	if (hvStat.settings.isShowMonsterDuration) $("input[name=isShowMonsterDuration]").attr("checked", "checked");
	if (hvStat.settings.isMonstersEffectsWarnColor) $("input[name=isMonstersEffectsWarnColor]").attr("checked", "checked");
	$("input[name=MonstersWarnOrangeRounds]").attr("value", hvStat.settings.MonstersWarnOrangeRounds);
	$("input[name=MonstersWarnRedRounds]").attr("value", hvStat.settings.MonstersWarnRedRounds);
	if (hvStat.settings.showMonsterEffectStackLevel) $("input[name=showMonsterEffectStackLevel]").attr("checked", "checked");
	if (hvStat.settings.isShowEndStats) $("input[name=isShowEndStats]").attr("checked", "checked");
	if (hvStat.settings.isShowEndProfs) {	//isShowEndProfs added by Ilirith
		$("input[name=isShowEndProfs]").attr("checked", "checked");
		if (hvStat.settings.isShowEndProfsMagic) $("input[name=isShowEndProfsMagic]").attr("checked", "checked");
		if (hvStat.settings.isShowEndProfsArmor) $("input[name=isShowEndProfsArmor]").attr("checked", "checked");
		if (hvStat.settings.isShowEndProfsWeapon) $("input[name=isShowEndProfsWeapon]").attr("checked", "checked");
	} else {
		$("input[name=isShowEndProfsMagic]").removeAttr("checked");
		$("input[name=isShowEndProfsArmor]").removeAttr("checked");
		$("input[name=isShowEndProfsWeapon]").removeAttr("checked");
	}
	if (hvStat.settings.autoAdvanceBattleRound) $("input[name=autoAdvanceBattleRound]").attr("checked", "checked");
	$("input[name=autoAdvanceBattleRoundDelay]").attr("value", hvStat.settings.autoAdvanceBattleRoundDelay);

	// Warning System
	// - Display Method
	if (hvStat.settings.isCondenseAlerts) $("input[name=isCondenseAlerts]").attr("checked", "checked");
	if (hvStat.settings.delayRoundEndAlerts) $("input[name=delayRoundEndAlerts]").attr("checked", "checked");
	// - Self Status
	if (hvStat.settings.isHighlightQC) $("input[name=isHighlightQC]").attr("checked", "checked");
	$("input[name=warnOrangeLevel]").attr("value", hvStat.settings.warnOrangeLevel);
	$("input[name=warnRedLevel]").attr("value", hvStat.settings.warnRedLevel);
	$("input[name=warnAlertLevel]").attr("value", hvStat.settings.warnAlertLevel);
	$("input[name=warnOrangeLevelMP]").attr("value", hvStat.settings.warnOrangeLevelMP);
	$("input[name=warnRedLevelMP]").attr("value", hvStat.settings.warnRedLevelMP);
	$("input[name=warnAlertLevelMP]").attr("value", hvStat.settings.warnAlertLevelMP);
	$("input[name=warnOrangeLevelSP]").attr("value", hvStat.settings.warnOrangeLevelSP);
	$("input[name=warnRedLevelSP]").attr("value", hvStat.settings.warnRedLevelSP);
	$("input[name=warnAlertLevelSP]").attr("value", hvStat.settings.warnAlertLevelSP);
	if (hvStat.settings.isShowPopup) $("input[name=isShowPopup]").attr("checked", "checked");
	if (hvStat.settings.isNagHP) $("input[name=isNagHP]").attr("checked", "checked")
	if (hvStat.settings.isNagMP) $("input[name=isNagMP]").attr("checked", "checked")
	if (hvStat.settings.isNagSP) $("input[name=isNagSP]").attr("checked", "checked");
	if (hvStat.settings.warnMode[0]) $("input[name=isWarnH]").attr("checked", "checked");
	if (hvStat.settings.warnMode[1]) $("input[name=isWarnA]").attr("checked", "checked");
	if (hvStat.settings.warnMode[2]) $("input[name=isWarnGF]").attr("checked", "checked");
	if (hvStat.settings.warnMode[3]) $("input[name=isWarnIW]").attr("checked", "checked");
	// - Event Notifications
	if (hvStat.settings.isAlertGem) $("input[name=isAlertGem]").attr("checked", "checked");
	if (hvStat.settings.isAlertOverchargeFull) $("input[name=isAlertOverchargeFull]").attr("checked", "checked");
	if (hvStat.settings.isWarnAbsorbTrigger) $("input[name=isWarnAbsorbTrigger]").attr("checked", "checked");
	if (hvStat.settings.isWarnSparkTrigger) $("input[name=isWarnSparkTrigger]").attr("checked", "checked");
	if (hvStat.settings.isWarnSparkExpire) $("input[name=isWarnSparkExpire]").attr("checked", "checked");
	if (hvStat.settings.alertWhenChannelingIsGained) $("input[name=alertWhenChannelingIsGained]").attr("checked", "checked");
	// - Effects Expiring Warnings
	if (hvStat.settings.isMainEffectsAlertSelf) $("input[name=isMainEffectsAlertSelf]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertSelf[0]) $("input[name=isEffectsAlertSelf0]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertSelf[1]) $("input[name=isEffectsAlertSelf1]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertSelf[2]) $("input[name=isEffectsAlertSelf2]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertSelf[3]) $("input[name=isEffectsAlertSelf3]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertSelf[5]) $("input[name=isEffectsAlertSelf5]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertSelf[6]) $("input[name=isEffectsAlertSelf6]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertSelf[7]) $("input[name=isEffectsAlertSelf7]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertSelf[8]) $("input[name=isEffectsAlertSelf8]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertSelf[9]) $("input[name=isEffectsAlertSelf9]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertSelf[10]) $("input[name=isEffectsAlertSelf10]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertSelf[11]) $("input[name=isEffectsAlertSelf11]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertSelf[12]) $("input[name=isEffectsAlertSelf12]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertSelf[13]) $("input[name=isEffectsAlertSelf13]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertSelf[14]) $("input[name=isEffectsAlertSelf14]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertSelf[15]) $("input[name=isEffectsAlertSelf15]").attr("checked", "checked");
	$("input[name=EffectsAlertSelfRounds0]").attr("value", hvStat.settings.EffectsAlertSelfRounds[0]);
	$("input[name=EffectsAlertSelfRounds1]").attr("value", hvStat.settings.EffectsAlertSelfRounds[1]);
	$("input[name=EffectsAlertSelfRounds2]").attr("value", hvStat.settings.EffectsAlertSelfRounds[2]);
	$("input[name=EffectsAlertSelfRounds3]").attr("value", hvStat.settings.EffectsAlertSelfRounds[3]);
	$("input[name=EffectsAlertSelfRounds5]").attr("value", hvStat.settings.EffectsAlertSelfRounds[5]);
	$("input[name=EffectsAlertSelfRounds6]").attr("value", hvStat.settings.EffectsAlertSelfRounds[6]);
	$("input[name=EffectsAlertSelfRounds7]").attr("value", hvStat.settings.EffectsAlertSelfRounds[7]);
	$("input[name=EffectsAlertSelfRounds8]").attr("value", hvStat.settings.EffectsAlertSelfRounds[8]);
	$("input[name=EffectsAlertSelfRounds9]").attr("value", hvStat.settings.EffectsAlertSelfRounds[9]);
	$("input[name=EffectsAlertSelfRounds10]").attr("value", hvStat.settings.EffectsAlertSelfRounds[10]);
	$("input[name=EffectsAlertSelfRounds11]").attr("value", hvStat.settings.EffectsAlertSelfRounds[11]);
	$("input[name=EffectsAlertSelfRounds12]").attr("value", hvStat.settings.EffectsAlertSelfRounds[12]);
	$("input[name=EffectsAlertSelfRounds13]").attr("value", hvStat.settings.EffectsAlertSelfRounds[13]);
	$("input[name=EffectsAlertSelfRounds14]").attr("value", hvStat.settings.EffectsAlertSelfRounds[14]);
	$("input[name=EffectsAlertSelfRounds15]").attr("value", hvStat.settings.EffectsAlertSelfRounds[15]);
	if (hvStat.settings.isMainEffectsAlertMonsters) $("input[name=isMainEffectsAlertMonsters]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertMonsters[0]) $("input[name=isEffectsAlertMonsters0]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertMonsters[1]) $("input[name=isEffectsAlertMonsters1]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertMonsters[2]) $("input[name=isEffectsAlertMonsters2]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertMonsters[3]) $("input[name=isEffectsAlertMonsters3]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertMonsters[4]) $("input[name=isEffectsAlertMonsters4]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertMonsters[5]) $("input[name=isEffectsAlertMonsters5]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertMonsters[6]) $("input[name=isEffectsAlertMonsters6]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertMonsters[7]) $("input[name=isEffectsAlertMonsters7]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertMonsters[8]) $("input[name=isEffectsAlertMonsters8]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertMonsters[9]) $("input[name=isEffectsAlertMonsters9]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertMonsters[10]) $("input[name=isEffectsAlertMonsters10]").attr("checked", "checked");
	if (hvStat.settings.isEffectsAlertMonsters[11]) $("input[name=isEffectsAlertMonsters11]").attr("checked", "checked");
	$("input[name=EffectsAlertMonstersRounds0]").attr("value", hvStat.settings.EffectsAlertMonstersRounds[0]);
	$("input[name=EffectsAlertMonstersRounds1]").attr("value", hvStat.settings.EffectsAlertMonstersRounds[1]);
	$("input[name=EffectsAlertMonstersRounds2]").attr("value", hvStat.settings.EffectsAlertMonstersRounds[2]);
	$("input[name=EffectsAlertMonstersRounds3]").attr("value", hvStat.settings.EffectsAlertMonstersRounds[3]);
	$("input[name=EffectsAlertMonstersRounds4]").attr("value", hvStat.settings.EffectsAlertMonstersRounds[4]);
	$("input[name=EffectsAlertMonstersRounds5]").attr("value", hvStat.settings.EffectsAlertMonstersRounds[5]);
	$("input[name=EffectsAlertMonstersRounds6]").attr("value", hvStat.settings.EffectsAlertMonstersRounds[6]);
	$("input[name=EffectsAlertMonstersRounds7]").attr("value", hvStat.settings.EffectsAlertMonstersRounds[7]);
	$("input[name=EffectsAlertMonstersRounds8]").attr("value", hvStat.settings.EffectsAlertMonstersRounds[8]);
	$("input[name=EffectsAlertMonstersRounds9]").attr("value", hvStat.settings.EffectsAlertMonstersRounds[9]);
	$("input[name=EffectsAlertMonstersRounds10]").attr("value", hvStat.settings.EffectsAlertMonstersRounds[10]);
	$("input[name=EffectsAlertMonstersRounds11]").attr("value", hvStat.settings.EffectsAlertMonstersRounds[11]);

	// Monster Information
	// - Monster Database
	if (hvStat.settings.isRememberScan) $("input[name=isRememberScan]").attr("checked", "checked");
	if (hvStat.settings.isRememberSkillsTypes) $("input[name=isRememberSkillsTypes]").attr("checked", "checked");
	// - Monster Display
	if (hvStat.settings.showMonsterHP) $("input[name=showMonsterHP]").attr("checked", "checked");
	if (hvStat.settings.showMonsterHPPercent) $("input[name=showMonsterHPPercent]").attr("checked", "checked");
	if (hvStat.settings.showMonsterMP) $("input[name=showMonsterMP]").attr("checked", "checked");
	if (hvStat.settings.showMonsterSP) $("input[name=showMonsterSP]").attr("checked", "checked");
	if (hvStat.settings.showMonsterInfoFromDB) $("input[name=showMonsterInfoFromDB]").attr("checked", "checked");
	if (hvStat.settings.showMonsterClassFromDB) $("input[name=showMonsterClassFromDB]").attr("checked", "checked");
	if (hvStat.settings.showMonsterPowerLevelFromDB) $("input[name=showMonsterPowerLevelFromDB]").attr("checked", "checked");
	if (hvStat.settings.showMonsterAttackTypeFromDB) $("input[name=showMonsterAttackTypeFromDB]").attr("checked", "checked");
	if (hvStat.settings.showMonsterWeaknessesFromDB) $("input[name=showMonsterWeaknessesFromDB]").attr("checked", "checked");
	if (hvStat.settings.showMonsterResistancesFromDB) $("input[name=showMonsterResistancesFromDB]").attr("checked", "checked");
	if (hvStat.settings.hideSpecificDamageType[0]) $("input[name=hideSpecificDamageType0]").attr("checked", "checked");
	if (hvStat.settings.hideSpecificDamageType[1]) $("input[name=hideSpecificDamageType1]").attr("checked", "checked");
	if (hvStat.settings.hideSpecificDamageType[2]) $("input[name=hideSpecificDamageType2]").attr("checked", "checked");
	if (hvStat.settings.hideSpecificDamageType[3]) $("input[name=hideSpecificDamageType3]").attr("checked", "checked");
	if (hvStat.settings.hideSpecificDamageType[4]) $("input[name=hideSpecificDamageType4]").attr("checked", "checked");
	if (hvStat.settings.hideSpecificDamageType[5]) $("input[name=hideSpecificDamageType5]").attr("checked", "checked");
	if (hvStat.settings.hideSpecificDamageType[6]) $("input[name=hideSpecificDamageType6]").attr("checked", "checked");
	if (hvStat.settings.hideSpecificDamageType[7]) $("input[name=hideSpecificDamageType7]").attr("checked", "checked");
	if (hvStat.settings.hideSpecificDamageType[8]) $("input[name=hideSpecificDamageType8]").attr("checked", "checked");
	if (hvStat.settings.hideSpecificDamageType[9]) $("input[name=hideSpecificDamageType9]").attr("checked", "checked");
	if (hvStat.settings.hideSpecificDamageType[10]) $("input[name=hideSpecificDamageType10]").attr("checked", "checked");
	if (hvStat.settings.ResizeMonsterInfo) $("input[name=ResizeMonsterInfo]").attr("checked", "checked");
	if (hvStat.settings.isShowStatsPopup) $("input[name=isShowStatsPopup]").attr("checked", "checked");
	$("input[name=monsterPopupDelay]").attr("value", hvStat.settings.monsterPopupDelay);
	if (hvStat.settings.isMonsterPopupPlacement) $("input[name=isMonsterPopupPlacement]").attr("checked", "checked");

	//------------------------------------
	// Set event handlers
	//------------------------------------

	// General
	$("input[name=isChangePageTitle]").click(saveSettings);
	$("input[name=customPageTitle]").change(saveSettings);
	$("input[name=isShowEquippedSet]").click(saveSettings);
	$("input[name=isShowSidebarProfs]").click(reminderAndSaveSettings);
	$("input[name=isStartAlert]").click(saveSettings);
	$("input[name=StartAlertHP]").change(saveSettings);
	$("input[name=StartAlertMP]").change(saveSettings);
	$("input[name=StartAlertSP]").change(saveSettings);
	$("select[id=StartAlertDifficulty]").change(saveSettings);
	$("input[name^=isShowTags]").click(saveSettings);

	// Keyboard
	$("input[name=adjustKeyEventHandling]").click(saveSettings);
	$("input[name=isEnableScanHotkey]").click(saveSettings);
	$("input[name=isEnableSkillHotkey]").click(saveSettings);
	$("input[name=reverseSkillHotkeyTraversalOrder]").click(saveSettings);
	$("input[name=enableOFCHotkey]").click(saveSettings);
	$("input[name=enableScrollHotkey]").click(saveSettings);
	$("input[name=isDisableForgeHotKeys]").click(saveSettings);
	$("input[name=enableShrineKeyPatch]").click(saveSettings);

	// Tracking Functions
	$("input[name=isTrackStats]").click(saveSettings);
	$("input[name=isTrackShrine]").click(saveSettings);
	$("input[name=isTrackItems]").click(saveSettings);

	// Battle Enhancement
	$("input[name=isShowRoundCounter]").click(saveSettings);
	$("input[name=isShowRoundReminder]").click(saveSettings);
	$("input[name=reminderMinRounds]").change(saveSettings);
	$("input[name=reminderBeforeEnd]").change(saveSettings);
	$("input[name=isShowSelfDuration]").click(saveSettings);
	$("input[name=isSelfEffectsWarnColor]").click(saveSettings);
	$("input[name=SelfWarnOrangeRounds]").change(saveSettings);
	$("input[name=SelfWarnRedRounds]").change(saveSettings);
	$("input[name=showSelfEffectStackLevel]").click(saveSettings);
	$("input[name=isShowPowerupBox]").click(saveSettings);
	$("input[name=isShowHighlight]").click(saveSettings);
	$("input[name=isAltHighlight]").click(saveSettings);
	$("input[name=isShowDivider]").click(saveSettings);
	$("input[name=isShowScanButton]").click(saveSettings);
	$("input[name=highlightScanButtonWhenScanResultExpired]").click(saveSettings);
	$("input[name=nDaysUntilScanResultExpiration]").change(saveSettings);
	$("input[name=isShowSkillButton]").click(saveSettings);
	$("input[name=isShowMonsterNumber]").click(saveSettings);
	$("input[name=isShowMonsterDuration]").click(saveSettings);
	$("input[name=isMonstersEffectsWarnColor]").click(saveSettings);
	$("input[name=MonstersWarnOrangeRounds]").change(saveSettings);
	$("input[name=MonstersWarnRedRounds]").change(saveSettings);
	$("input[name=showMonsterEffectStackLevel]").click(saveSettings);
	$("input[name=isShowEndStats]").click(saveSettings);
	$("input[name=isShowEndProfs]").click(saveSettings); //isShowEndProfs added by Ilirith
	$("input[name=isShowEndProfsMagic]").click(saveSettings); //isShowEndProfs added by Ilirith
	$("input[name=isShowEndProfsArmor]").click(saveSettings); //isShowEndProfs added by Ilirith
	$("input[name=isShowEndProfsWeapon]").click(saveSettings); //isShowEndProfs added by Ilirith
	$("input[name=autoAdvanceBattleRound]").click(saveSettings);
	$("input[name=autoAdvanceBattleRoundDelay]").change(saveSettings);

	// Warning System
	// - Display Method
	$("input[name=isCondenseAlerts]").click(saveSettings);
	$("input[name=delayRoundEndAlerts]").click(saveSettings);
	// - Self Status
	$("input[name=isHighlightQC]").click(saveSettings);
	$("input[name=warnOrangeLevel]").change(saveSettings);
	$("input[name=warnRedLevel]").change(saveSettings);
	$("input[name=warnAlertLevel]").change(saveSettings);
	$("input[name=warnOrangeLevelMP]").change(saveSettings);
	$("input[name=warnRedLevelMP]").change(saveSettings);
	$("input[name=warnAlertLevelMP]").change(saveSettings);
	$("input[name=warnOrangeLevelSP]").change(saveSettings);
	$("input[name=warnRedLevelSP]").change(saveSettings);
	$("input[name=warnAlertLevelSP]").change(saveSettings);
	$("input[name=isShowPopup]").click(saveSettings);
	$("input[name=isNagHP]").click(saveSettings);
	$("input[name=isNagMP]").click(saveSettings);
	$("input[name=isNagSP]").click(saveSettings);
	$("input[name=isWarnH]").click(saveSettings);
	$("input[name=isWarnA]").click(saveSettings);
	$("input[name=isWarnGF]").click(saveSettings);
	$("input[name=isWarnIW]").click(saveSettings);
	$("input[name=isWarnCF]").click(saveSettings);
	// - Event Notifications
	$("input[name=isAlertGem]").click(saveSettings);
	$("input[name=isAlertOverchargeFull]").click(saveSettings);
	$("input[name=isWarnAbsorbTrigger]").click(saveSettings);
	$("input[name=isWarnSparkTrigger]").click(saveSettings);
	$("input[name=isWarnSparkExpire]").click(saveSettings);
	$("input[name=alertWhenChannelingIsGained]").click(saveSettings);
	// - Effects Expiring Warnings
	$("input[name=isMainEffectsAlertSelf]").click(saveSettings);
	$("input[name^=isEffectsAlertSelf]").click(saveSettings);
	$("input[name^=EffectsAlertSelfRounds]").change(saveSettings);
	$("input[name=isMainEffectsAlertMonsters]").click(saveSettings);
	$("input[name^=isEffectsAlertMonsters]").click(saveSettings);
	$("input[name^=EffectsAlertMonstersRounds]").change(saveSettings);

	// Monster Information
	// - Monster Database
	$("input[name=isRememberScan]").click(reminderAndSaveSettings);
	$("input[name=isRememberSkillsTypes]").click(reminderAndSaveSettings);
	// - Monster Display
	$("input[name=showMonsterHP]").click(saveSettings);
	$("input[name=showMonsterHPPercent]").click(saveSettings);
	$("input[name=showMonsterMP]").click(saveSettings);
	$("input[name=showMonsterSP]").click(saveSettings);
	$("input[name=showMonsterInfoFromDB]").click(saveSettings);
	$("input[name=showMonsterClassFromDB]").click(saveSettings);
	$("input[name=showMonsterPowerLevelFromDB]").click(saveSettings);
	$("input[name=showMonsterAttackTypeFromDB]").click(saveSettings);
	$("input[name=showMonsterWeaknessesFromDB]").click(saveSettings);
	$("input[name=showMonsterResistancesFromDB]").click(saveSettings);
	$("input[name=hideSpecificDamageType0]").click(saveSettings);
	$("input[name=hideSpecificDamageType1]").click(saveSettings);
	$("input[name=hideSpecificDamageType2]").click(saveSettings);
	$("input[name=hideSpecificDamageType3]").click(saveSettings);
	$("input[name=hideSpecificDamageType4]").click(saveSettings);
	$("input[name=hideSpecificDamageType5]").click(saveSettings);
	$("input[name=hideSpecificDamageType6]").click(saveSettings);
	$("input[name=hideSpecificDamageType7]").click(saveSettings);
	$("input[name=hideSpecificDamageType8]").click(saveSettings);
	$("input[name=hideSpecificDamageType9]").click(saveSettings);
	$("input[name=hideSpecificDamageType10]").click(saveSettings);
	$("input[name=ResizeMonsterInfo]").click(saveSettings);
	$("input[name=isShowStatsPopup]").click(saveSettings);
	$("input[name=monsterPopupDelay]").change(saveSettings);
	$("input[name=isMonsterPopupPlacement]").click(saveSettings);

	$("._resetSettings").click(function () {
		if (confirm("Reset Settings to default?"))
			hvStat.settings.reset();
	});
	$("._resetAll").click(function () {
		if (confirm("Reset All Tracking data?"))
			HVResetTracking();
	});
	$("._masterReset").click(function () {
		if (confirm("This will delete ALL HV data saved in localStorage.\nAre you sure you want to do this?"))
			HVMasterReset();
	});
}

function saveSettings() {
	// General
	hvStat.settings.isChangePageTitle = $("input[name=isChangePageTitle]").get(0).checked;
	hvStat.settings.customPageTitle = $("input[name=customPageTitle]").get(0).value;
	hvStat.settings.isShowEquippedSet = $("input[name=isShowEquippedSet]").get(0).checked;
	hvStat.settings.isShowSidebarProfs = $("input[name=isShowSidebarProfs]").get(0).checked;
	hvStat.settings.isStartAlert = $("input[name=isStartAlert]").get(0).checked;
	hvStat.settings.StartAlertHP = $("input[name=StartAlertHP]").get(0).value;
	hvStat.settings.StartAlertMP = $("input[name=StartAlertMP]").get(0).value;
	hvStat.settings.StartAlertSP = $("input[name=StartAlertSP]").get(0).value;
	hvStat.settings.StartAlertDifficulty = $("select[id=StartAlertDifficulty]").get(0).value;
	hvStat.settings.isShowTags[0] = $("input[name=isShowTags0]").get(0).checked;
	hvStat.settings.isShowTags[1] = $("input[name=isShowTags1]").get(0).checked;
	hvStat.settings.isShowTags[2] = $("input[name=isShowTags2]").get(0).checked;
	hvStat.settings.isShowTags[3] = $("input[name=isShowTags3]").get(0).checked;
	hvStat.settings.isShowTags[4] = $("input[name=isShowTags4]").get(0).checked;
	hvStat.settings.isShowTags[5] = $("input[name=isShowTags5]").get(0).checked;

	// Keyboard
	hvStat.settings.adjustKeyEventHandling = $("input[name=adjustKeyEventHandling]").get(0).checked;
	hvStat.settings.isEnableScanHotkey = $("input[name=isEnableScanHotkey]").get(0).checked;
	hvStat.settings.isEnableSkillHotkey = $("input[name=isEnableSkillHotkey]").get(0).checked;
	hvStat.settings.reverseSkillHotkeyTraversalOrder = $("input[name=reverseSkillHotkeyTraversalOrder]").get(0).checked;
	hvStat.settings.enableOFCHotkey = $("input[name=enableOFCHotkey]").get(0).checked;
	hvStat.settings.enableScrollHotkey = $("input[name=enableScrollHotkey]").get(0).checked;
	hvStat.settings.isDisableForgeHotKeys = $("input[name=isDisableForgeHotKeys]").get(0).checked;
	hvStat.settings.enableShrineKeyPatch = $("input[name=enableShrineKeyPatch]").get(0).checked;

	// Tracking
	hvStat.settings.isTrackStats = $("input[name=isTrackStats]").get(0).checked;
	hvStat.settings.isTrackShrine = $("input[name=isTrackShrine]").get(0).checked;
	hvStat.settings.isTrackItems = $("input[name=isTrackItems]").get(0).checked;

	// Battle Enhancement
	hvStat.settings.isShowRoundCounter = $("input[name=isShowRoundCounter]").get(0).checked;
	hvStat.settings.isShowRoundReminder = $("input[name=isShowRoundReminder]").get(0).checked;
	hvStat.settings.reminderMinRounds = $("input[name=reminderMinRounds]").get(0).value;
	hvStat.settings.reminderBeforeEnd = $("input[name=reminderBeforeEnd]").get(0).value;
	hvStat.settings.isShowSelfDuration = $("input[name=isShowSelfDuration]").get(0).checked;
	hvStat.settings.isSelfEffectsWarnColor = $("input[name=isSelfEffectsWarnColor]").get(0).checked;
	hvStat.settings.SelfWarnOrangeRounds = $("input[name=SelfWarnOrangeRounds]").get(0).value;
	hvStat.settings.SelfWarnRedRounds = $("input[name=SelfWarnRedRounds]").get(0).value;
	hvStat.settings.showSelfEffectStackLevel = $("input[name=showSelfEffectStackLevel]").get(0).checked;
	hvStat.settings.isShowPowerupBox = $("input[name=isShowPowerupBox]").get(0).checked;
	hvStat.settings.isShowHighlight = $("input[name=isShowHighlight]").get(0).checked;
	hvStat.settings.isAltHighlight = $("input[name=isAltHighlight]").get(0).checked;
	hvStat.settings.isShowDivider = $("input[name=isShowDivider]").get(0).checked;
	hvStat.settings.isShowScanButton = $("input[name=isShowScanButton]").get(0).checked;
	hvStat.settings.highlightScanButtonWhenScanResultExpired = $("input[name=highlightScanButtonWhenScanResultExpired]").get(0).checked;
	hvStat.settings.nDaysUntilScanResultExpiration = $("input[name=nDaysUntilScanResultExpiration]").get(0).value;
	hvStat.settings.isShowSkillButton = $("input[name=isShowSkillButton]").get(0).checked;
	hvStat.settings.isShowMonsterNumber = $("input[name=isShowMonsterNumber]").get(0).checked;
	hvStat.settings.isShowMonsterDuration = $("input[name=isShowMonsterDuration]").get(0).checked;
	hvStat.settings.isMonstersEffectsWarnColor = $("input[name=isMonstersEffectsWarnColor]").get(0).checked;
	hvStat.settings.MonstersWarnOrangeRounds = $("input[name=MonstersWarnOrangeRounds]").get(0).value;
	hvStat.settings.MonstersWarnRedRounds = $("input[name=MonstersWarnRedRounds]").get(0).value;
	hvStat.settings.showMonsterEffectStackLevel = $("input[name=showMonsterEffectStackLevel]").get(0).checked;
	hvStat.settings.isShowEndStats = $("input[name=isShowEndStats]").get(0).checked;
	hvStat.settings.isShowEndProfs = $("input[name=isShowEndProfs]").get(0).checked; //isShowEndProfs added by Ilirith
	hvStat.settings.isShowEndProfsMagic = $("input[name=isShowEndProfsMagic]").get(0).checked; //isShowEndProfs added by Ilirith
	hvStat.settings.isShowEndProfsArmor = $("input[name=isShowEndProfsArmor]").get(0).checked; //isShowEndProfs added by Ilirith
	hvStat.settings.isShowEndProfsWeapon = $("input[name=isShowEndProfsWeapon]").get(0).checked; //isShowEndProfs added by Ilirith
	hvStat.settings.autoAdvanceBattleRound = $("input[name=autoAdvanceBattleRound]").get(0).checked;
	hvStat.settings.autoAdvanceBattleRoundDelay = $("input[name=autoAdvanceBattleRoundDelay]").get(0).value;

	// Warning System
	// - Display Method
	hvStat.settings.isCondenseAlerts = $("input[name=isCondenseAlerts]").get(0).checked;
	hvStat.settings.delayRoundEndAlerts = $("input[name=delayRoundEndAlerts]").get(0).checked;
	// - Self Status
	hvStat.settings.isHighlightQC = $("input[name=isHighlightQC]").get(0).checked;
	hvStat.settings.warnOrangeLevel = $("input[name=warnOrangeLevel]").get(0).value;
	hvStat.settings.warnRedLevel = $("input[name=warnRedLevel]").get(0).value;
	hvStat.settings.warnAlertLevel = $("input[name=warnAlertLevel]").get(0).value;
	hvStat.settings.warnOrangeLevelMP = $("input[name=warnOrangeLevelMP]").get(0).value;
	hvStat.settings.warnRedLevelMP = $("input[name=warnRedLevelMP]").get(0).value;
	hvStat.settings.warnAlertLevelMP = $("input[name=warnAlertLevelMP]").get(0).value;
	hvStat.settings.warnOrangeLevelSP = $("input[name=warnOrangeLevelSP]").get(0).value;
	hvStat.settings.warnRedLevelSP = $("input[name=warnRedLevelSP]").get(0).value;
	hvStat.settings.warnAlertLevelSP = $("input[name=warnAlertLevelSP]").get(0).value;
	hvStat.settings.isShowPopup = $("input[name=isShowPopup]").get(0).checked;
	hvStat.settings.isNagHP = $("input[name=isNagHP]").get(0).checked;
	hvStat.settings.isNagMP = $("input[name=isNagMP]").get(0).checked;
	hvStat.settings.isNagSP = $("input[name=isNagSP]").get(0).checked;
	hvStat.settings.warnMode[0] = $("input[name=isWarnH]").get(0).checked;
	hvStat.settings.warnMode[1] = $("input[name=isWarnA]").get(0).checked;
	hvStat.settings.warnMode[2] = $("input[name=isWarnGF]").get(0).checked;
	hvStat.settings.warnMode[3] = $("input[name=isWarnIW]").get(0).checked;
	// - Event Notifications
	hvStat.settings.isAlertGem = $("input[name=isAlertGem]").get(0).checked;
	hvStat.settings.isAlertOverchargeFull = $("input[name=isAlertOverchargeFull]").get(0).checked;
	hvStat.settings.isWarnAbsorbTrigger = $("input[name=isWarnAbsorbTrigger]").get(0).checked;
	hvStat.settings.isWarnSparkTrigger = $("input[name=isWarnSparkTrigger]").get(0).checked;
	hvStat.settings.isWarnSparkExpire = $("input[name=isWarnSparkExpire]").get(0).checked;
	hvStat.settings.alertWhenChannelingIsGained = $("input[name=alertWhenChannelingIsGained]").get(0).checked;
	// - Effects Expiring Warnings
	hvStat.settings.isMainEffectsAlertSelf = $("input[name=isMainEffectsAlertSelf]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[0] = $("input[name=isEffectsAlertSelf0]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[1] = $("input[name=isEffectsAlertSelf1]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[2] = $("input[name=isEffectsAlertSelf2]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[3] = $("input[name=isEffectsAlertSelf3]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[4] = false; // Absorbing Ward no longer has duration
	hvStat.settings.isEffectsAlertSelf[5] = $("input[name=isEffectsAlertSelf5]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[6] = $("input[name=isEffectsAlertSelf6]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[7] = $("input[name=isEffectsAlertSelf7]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[8] = $("input[name=isEffectsAlertSelf8]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[9] = $("input[name=isEffectsAlertSelf9]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[10] = false;	// Flame Spikes is obsolete
	hvStat.settings.isEffectsAlertSelf[11] = false;	// Frost Spikes is obsolete
	hvStat.settings.isEffectsAlertSelf[12] = false;	// Lightning Spikes is obsolete
	hvStat.settings.isEffectsAlertSelf[13] = false;	// Storm Spikes is obsolete
	hvStat.settings.isEffectsAlertSelf[14] = $("input[name=isEffectsAlertSelf14]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[15] = $("input[name=isEffectsAlertSelf15]").get(0).checked;
	hvStat.settings.EffectsAlertSelfRounds[0] = $("input[name=EffectsAlertSelfRounds0]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[1] = $("input[name=EffectsAlertSelfRounds1]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[2] = $("input[name=EffectsAlertSelfRounds2]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[3] = $("input[name=EffectsAlertSelfRounds3]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[4] = 0; // Absorbing Ward no longer has duration
	hvStat.settings.EffectsAlertSelfRounds[5] = $("input[name=EffectsAlertSelfRounds5]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[6] = $("input[name=EffectsAlertSelfRounds6]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[7] = $("input[name=EffectsAlertSelfRounds7]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[8] = $("input[name=EffectsAlertSelfRounds8]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[9] = $("input[name=EffectsAlertSelfRounds9]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[10] = 0;	// Flame Spikes is obsolete
	hvStat.settings.EffectsAlertSelfRounds[11] = 0;	// Frost Spikes is obsolete
	hvStat.settings.EffectsAlertSelfRounds[12] = 0;	// Lightning Spikes is obsolete
	hvStat.settings.EffectsAlertSelfRounds[13] = 0;	// Storm Spikes is obsolete
	hvStat.settings.EffectsAlertSelfRounds[14] = $("input[name=EffectsAlertSelfRounds14]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[15] = $("input[name=EffectsAlertSelfRounds15]").get(0).value;
	hvStat.settings.isMainEffectsAlertMonsters = $("input[name=isMainEffectsAlertMonsters]").get(0).checked;
	hvStat.settings.isEffectsAlertMonsters[0] = $("input[name=isEffectsAlertMonsters0]").get(0).checked;
	hvStat.settings.isEffectsAlertMonsters[1] = $("input[name=isEffectsAlertMonsters1]").get(0).checked;
	hvStat.settings.isEffectsAlertMonsters[2] = $("input[name=isEffectsAlertMonsters2]").get(0).checked;
	hvStat.settings.isEffectsAlertMonsters[3] = $("input[name=isEffectsAlertMonsters3]").get(0).checked;
	hvStat.settings.isEffectsAlertMonsters[4] = $("input[name=isEffectsAlertMonsters4]").get(0).checked;
	hvStat.settings.isEffectsAlertMonsters[5] = $("input[name=isEffectsAlertMonsters5]").get(0).checked;
	hvStat.settings.isEffectsAlertMonsters[6] = $("input[name=isEffectsAlertMonsters6]").get(0).checked;
	hvStat.settings.isEffectsAlertMonsters[7] = $("input[name=isEffectsAlertMonsters7]").get(0).checked;
	hvStat.settings.isEffectsAlertMonsters[8] = false; // Nerf is obsolete
	hvStat.settings.isEffectsAlertMonsters[9] = $("input[name=isEffectsAlertMonsters9]").get(0).checked;
	hvStat.settings.isEffectsAlertMonsters[10] = false; // Lifestream is obsolete
	hvStat.settings.isEffectsAlertMonsters[11] = $("input[name=isEffectsAlertMonsters11]").get(0).checked;
	hvStat.settings.EffectsAlertMonstersRounds[0] = $("input[name=EffectsAlertMonstersRounds0]").get(0).value;
	hvStat.settings.EffectsAlertMonstersRounds[1] = $("input[name=EffectsAlertMonstersRounds1]").get(0).value;
	hvStat.settings.EffectsAlertMonstersRounds[2] = $("input[name=EffectsAlertMonstersRounds2]").get(0).value;
	hvStat.settings.EffectsAlertMonstersRounds[3] = $("input[name=EffectsAlertMonstersRounds3]").get(0).value;
	hvStat.settings.EffectsAlertMonstersRounds[4] = $("input[name=EffectsAlertMonstersRounds4]").get(0).value;
	hvStat.settings.EffectsAlertMonstersRounds[5] = $("input[name=EffectsAlertMonstersRounds5]").get(0).value;
	hvStat.settings.EffectsAlertMonstersRounds[6] = $("input[name=EffectsAlertMonstersRounds6]").get(0).value;
	hvStat.settings.EffectsAlertMonstersRounds[7] = $("input[name=EffectsAlertMonstersRounds7]").get(0).value;
	hvStat.settings.EffectsAlertMonstersRounds[8] = 0; // Nerf is obsolete
	hvStat.settings.EffectsAlertMonstersRounds[9] = $("input[name=EffectsAlertMonstersRounds9]").get(0).value;
	hvStat.settings.EffectsAlertMonstersRounds[10] = 0; // Lifestream is obsolete
	hvStat.settings.EffectsAlertMonstersRounds[11] = $("input[name=EffectsAlertMonstersRounds11]").get(0).value;

	// Monster Information
	// - Monster Database
	hvStat.settings.isRememberScan = $("input[name=isRememberScan]").get(0).checked;
	hvStat.settings.isRememberSkillsTypes = $("input[name=isRememberSkillsTypes]").get(0).checked;
	hvStat.settings.showMonsterHP = $("input[name=showMonsterHP]").get(0).checked;
	hvStat.settings.showMonsterHPPercent = $("input[name=showMonsterHPPercent]").get(0).checked;
	hvStat.settings.showMonsterMP = $("input[name=showMonsterMP]").get(0).checked;
	hvStat.settings.showMonsterSP = $("input[name=showMonsterSP]").get(0).checked;
	hvStat.settings.showMonsterInfoFromDB = $("input[name=showMonsterInfoFromDB]").get(0).checked;
	hvStat.settings.showMonsterClassFromDB = $("input[name=showMonsterClassFromDB]").get(0).checked;
	hvStat.settings.showMonsterPowerLevelFromDB = $("input[name=showMonsterPowerLevelFromDB]").get(0).checked;
	hvStat.settings.showMonsterAttackTypeFromDB = $("input[name=showMonsterAttackTypeFromDB]").get(0).checked;
	hvStat.settings.showMonsterWeaknessesFromDB = $("input[name=showMonsterWeaknessesFromDB]").get(0).checked;
	hvStat.settings.showMonsterResistancesFromDB = $("input[name=showMonsterResistancesFromDB]").get(0).checked;
	hvStat.settings.hideSpecificDamageType[0] = $("input[name=hideSpecificDamageType0]").get(0).checked;
	hvStat.settings.hideSpecificDamageType[1] = $("input[name=hideSpecificDamageType1]").get(0).checked;
	hvStat.settings.hideSpecificDamageType[2] = $("input[name=hideSpecificDamageType2]").get(0).checked;
	hvStat.settings.hideSpecificDamageType[3] = $("input[name=hideSpecificDamageType3]").get(0).checked;
	hvStat.settings.hideSpecificDamageType[4] = $("input[name=hideSpecificDamageType4]").get(0).checked;
	hvStat.settings.hideSpecificDamageType[5] = $("input[name=hideSpecificDamageType5]").get(0).checked;
	hvStat.settings.hideSpecificDamageType[6] = $("input[name=hideSpecificDamageType6]").get(0).checked;
	hvStat.settings.hideSpecificDamageType[7] = $("input[name=hideSpecificDamageType7]").get(0).checked;
	hvStat.settings.hideSpecificDamageType[8] = $("input[name=hideSpecificDamageType8]").get(0).checked;
	hvStat.settings.hideSpecificDamageType[9] = $("input[name=hideSpecificDamageType9]").get(0).checked;
	hvStat.settings.hideSpecificDamageType[10] = $("input[name=hideSpecificDamageType10]").get(0).checked;
	hvStat.settings.ResizeMonsterInfo = $("input[name=ResizeMonsterInfo]").get(0).checked;
	hvStat.settings.isShowStatsPopup = $("input[name=isShowStatsPopup]").get(0).checked;
	hvStat.settings.monsterPopupDelay = $("input[name=monsterPopupDelay]").get(0).value;
	hvStat.settings.isMonsterPopupPlacement = $("input[name=isMonsterPopupPlacement]").get(0).checked;

	hvStat.storage.settings.save();
}
function reminderAndSaveSettings() {
	if (!hvStat.characterStatus.areProficienciesCaptured && $("input[name=isShowSidebarProfs]").get(0).checked) {
		alert('Please visit the Character Stats page at least once\nwith either the "Use Downloable Fonts" or "Custom\nLocal Font" setting enabled, to allow STAT to record\nyour current proficiencies. STAT cannot record this\ndata while HentaiVerse Font Engine is enabled.');
	}
	saveSettings();
}
function HVResetTracking() {
	hvStat.storage.overview.reset();
	hvStat.storage.stats.reset();
	hvStat.storage.shrine.reset();
	hvStat.storage.dropStats.reset();
}
function HVMasterReset() {
	// Local storage keys starting with "HV" should not be used to avoid conflicts with other scripts.
	// They will be phased out. Use the prefix "hvStat." instead.
	var keys = [
		"HVBackup1",
		"HVBackup2",
		"HVBackup3",
		"HVBackup4",
		"HVBackup5",
		"HVMonsterDatabase",	// Old monster data
		"HVOverview",
		"HVSettings",
		"HVShrine",
		"HVStats",
		"HVTags",
	];
	var i = keys.length;
	while (i--) {
		localStorage.removeItem(keys[i]);
	}
	for (var key in localStorage) {
		if (key.indexOf("hvStat.") === 0) {
			console.debug("Remove from localStorage: " + key);
			localStorage.removeItem(key);
		}
	}
}
function saveStatsBackup(back) {
	var ba = hvStat.statsBackups[back];
	hvStat.util.copyEachProperty(ba, hvStat.stats);
	hvStat.storage.statsBackups[back].save();
}
function addtoStatsBackup(back) {
	var ba = hvStat.statsBackups[back];
	hvStat.util.addEachPropertyValue(ba, hvStat.stats, ["datestart", "datesave"]);
	hvStat.storage.statsBackups[back].save();
}
function loadStatsBackup(back) {
	var ba = hvStat.statsBackups[back];
	hvStat.util.copyEachProperty(hvStat.stats, ba);
	hvStat.storage.stats.save();
}
function addfromStatsBackup(back) {
	var ba = hvStat.statsBackups[back];
	hvStat.util.addEachPropertyValue(hvStat.stats, ba, ["datestart", "datesave"]);
	hvStat.storage.stats.save();
}

//------------------------------------
// Migration Functions
//------------------------------------
hvStat.migration = {};

hvStat.migration.monsterDatabase = {};
hvStat.migration.monsterDatabase.monsterClassFromCode = function (code) {
	code = String(code);
	var monsterClassTable = {
		ARTHROPOD:	"1",
		AVION:		"2",
		BEAST:		"3",
		CELESTIAL:	"4",
		DAIMON:		"5",
		DRAGONKIN:	"6",
		ELEMENTAL:	"7",
		GIANT:		"8",
		HUMANOID:	"9",
		MECHANOID:	"10",
		REPTILIAN:	"11",
		SPRITE:		"12",
		UNDEAD:		"13",
		COMMON:		"31",
		UNCOMMON:	"32",
		RARE:		"33",
		LEGENDARY:	"34",
		ULTIMATE:	"35"
	};
	var key, found = false;
	for (key in monsterClassTable) {
		if (monsterClassTable[key] === code) {
			found = true;
			break;
		}
	}
	if (found) {
		return hvStat.constant.monsterClass[key];
	} else {
		return null;
	}
};

hvStat.migration.monsterDatabase.skillTypeFromCode = function (code) {
	code = String(code);
	var st = hvStat.constant.skillType;
	switch (code) {
	case "1":
	case "2":
		return st.MANA;
	case "3":
	case "4":
		return st.SPIRIT;
	default:
		return null;
	}
};

hvStat.migration.monsterDatabase.attackTypeFromCode = function (code) {
	code = String(code);
	var at = hvStat.constant.attackType;
	switch (code) {
	case "1":
	case "3":
		return at.MAGICAL;
	case "2":
	case "4":
		return at.PHYSICAL;
	default:
		return null;
	}
};

hvStat.migration.monsterDatabase.damageTypeFromCode = function (code) {
	code = String(code);
	var damageTypeTable = {
		CRUSHING:	"52",
		SLASHING:	"51",
		PIERCING:	"53",
		FIRE:		"61",
		COLD:		"62",
		ELEC:		"63",
		WIND:		"64",
		HOLY:		"71",
		DARK:		"72",
		SOUL:		"73",
		VOID:		"74"
	};
	var array = [];
	for (var i = 0; i < code.length; i += 2) {
		var partialCode = code.substring(i, i + 2);
		var key, found = false;
		for (key in damageTypeTable) {
			if (damageTypeTable[key] === partialCode) {
				found = true;
				break;
			}
		}
		if (found) {
			array.push(hvStat.constant.damageType[key]);
		}
	}
	return array;
};

hvStat.migration.monsterDatabase.createMonsterScanResultsVOFromOldDB = function (oldDB, index) {
	if (!oldDB.mclass[index]) {
		return null;
	}
	var i, len, v, vo = new hvStat.vo.MonsterScanResultsVO();
	// id
	vo.id = Number(index);
	// lastScanDate
	v = oldDB.datescan[index];
	v = v ? new Date(v) : null;
	vo.lastScanDate = v ? v.toISOString() : null;
	// name
	vo.name = null;
	// monsterClass
	v = hvStat.migration.monsterDatabase.monsterClassFromCode(oldDB.mclass[index]);
	vo.monsterClass = v ? v.id : null;
	// powerLevel
	v = oldDB.mpl[index];
	vo.powerLevel = (!isNaN(v) && v !== 0) ? Number(v) : null;
	// trainer
	vo.trainer = null;
	// meleeAttack
	v = hvStat.migration.monsterDatabase.damageTypeFromCode(oldDB.mattack[index]);
	vo.meleeAttack = v[0] ? v[0].id : null;
	// defenseLevel
	vo.defenseLevel = new hvStat.vo.DefenseLevelVO();
	v = hvStat.migration.monsterDatabase.damageTypeFromCode(oldDB.mweak[index]);
	len = v.length;
	for (i = 0; i < len; i++) {
		vo.defenseLevel[v[i].id] = hvStat.constant.defenseLevel.WEAK.id;
	}
	v = hvStat.migration.monsterDatabase.damageTypeFromCode(oldDB.mresist[index]);
	len = v.length;
	for (i = 0; i < len; i++) {
		vo.defenseLevel[v[i].id] = hvStat.constant.defenseLevel.RESISTANT.id;
	}
	v = hvStat.migration.monsterDatabase.damageTypeFromCode(oldDB.mimperv[index]);
	len = v.length;
	for (i = 0; i < len; i++) {
		vo.defenseLevel[v[i].id] = hvStat.constant.defenseLevel.IMPERVIOUS.id;
	}
	// debuffsAffected
	vo.debuffsAffected = [];
	return vo;
};

hvStat.migration.monsterDatabase.migrateMonsterScanResults = function () {
	var tx = hvStat.database.idb.transaction(["MonsterScanResults"], "readwrite");
	var store = tx.objectStore("MonsterScanResults");
	var i, len = hvStat.oldMonsterDatabase.mclass.length;
	var successCount = 0;
	var errorCount = 0;
	var lastIndex, vo, reqPut;
	var report = function () {
		alert("Migration of the monster scan results has completed.\n" + successCount + " success(es), " + errorCount + " error(s)");
	}
	// prescan
	for (i = 0; i < len; i++) {
		if (hvStat.oldMonsterDatabase.mclass[i]) {
			lastIndex = i;
		}
	}
	// migrate
	for (i = 0; i < len; i++) {
		if (hvStat.oldMonsterDatabase.mclass[i]) {
			vo = hvStat.migration.monsterDatabase.createMonsterScanResultsVOFromOldDB(hvStat.oldMonsterDatabase, i);
			if (vo) {
				reqPut = store.put(vo);
				if (i < lastIndex) {
					reqPut.onsuccess = function (event) {
						successCount++;
					};
					reqPut.onerror = function (event) {
						errorCount++;
					};
				} else {
					reqPut.onsuccess = function (event) {
						successCount++;
						report();
					};
					reqPut.onerror = function (event) {
						errorCount++;
						report();
					};
				}
			}
		}
	}
};

hvStat.migration.monsterDatabase.createMonsterSkillVOsFromOldDB = function (oldDB, index) {
	if (!oldDB.mskillspell[index]) {
		return [];
	}
	var v, vo, voArray = [];
	var code, codes = String(oldDB.mskillspell[index]);
	var damageTypes, damageTypeCodes = String(oldDB.mskilltype[index]);
	var damageTypeIndex = 0;

	for (i = 0; i < codes.length; i++) {
		code = codes.substring(i, i + 1);
		damageTypes = hvStat.migration.monsterDatabase.damageTypeFromCode(damageTypeCodes);
		if (code !== "0") {
			vo = new hvStat.vo.MonsterSkillVO({ id: index });
			v = hvStat.migration.monsterDatabase.skillTypeFromCode(code);
			vo.skillType = v ? v.id : null;
			v = hvStat.migration.monsterDatabase.attackTypeFromCode(code);
			vo.attackType = v ? v.id : null;
			v = damageTypes[damageTypeIndex];
			vo.damageType = v ? v.id : null;
			vo.createKey();

			voArray.push(vo);
			damageTypeIndex++;
		}
	}
	return voArray;
};

hvStat.migration.monsterDatabase.migrateMonsterSkills = function () {
	var tx = hvStat.database.idb.transaction(["MonsterSkills"], "readwrite");
	var store = tx.objectStore("MonsterSkills");
	var i, j;
	var len = hvStat.oldMonsterDatabase.mskilltype.length;
	var successCount = 0;
	var errorCount = 0;
	var lastIndex, voArray, reqPut;
	var report = function () {
		alert("Migration of the monster skill data has completed.\n" + successCount + " success(es), " + errorCount + " error(s)");
	};
	// prescan
	for (i = 0; i < len; i++) {
		if (hvStat.oldMonsterDatabase.mskilltype[i]) {
			lastIndex = i;
		}
	}
	// migrate
	for (i = 0; i < len; i++) {
		if (hvStat.oldMonsterDatabase.mskilltype[i]) {
			voArray = hvStat.migration.monsterDatabase.createMonsterSkillVOsFromOldDB(hvStat.oldMonsterDatabase, i);
			for (j = 0; j < voArray.length; j++) {
				reqPut = store.put(voArray[j]);
				if (i < lastIndex || j < voArray.length - 1) {
					reqPut.onsuccess = function (event) {
						successCount++;
					};
					reqPut.onerror = function (event) {
						errorCount++;
					};
				} else {
					reqPut.onsuccess = function (event) {
						successCount++;
						report();
					};
					reqPut.onerror = function (event) {
						errorCount++;
						report();
					};
				}
			}
		}
	}
};

hvStat.migration.monsterDatabase.migrateDatabase = function () {
	hvStat.migration.monsterDatabase.migrateMonsterScanResults();
	hvStat.migration.monsterDatabase.migrateMonsterSkills();
};

hvStat.migration.monsterDatabase.deleteOldDatabase = function () {
	hvStat.storage.oldMonsterDatabase.remove();
	alert("Your old monster database has been deleted.");
};
