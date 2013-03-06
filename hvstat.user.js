// ==UserScript==
// @name            HV Statistics, Tracking, and Analysis Tool
// @namespace       HV STAT
// @description     Collects data, analyzes statistics, and enhances the interface of the HentaiVerse
// @include         http://hentaiverse.org/*
// @exclude         http://hentaiverse.org/pages/showequip*
// @author          Various (http://forums.e-hentai.org/index.php?showtopic=79552)
// @version         5.5.2.1
// @resource        battle-log-type0.css                        css/battle-log-type0.css
// @resource        battle-log-type1.css                        css/battle-log-type1.css
// @resource        hvstat.css                                  css/hvstat.css
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
// @resource        arena-rewards-pane.html                     html/arena-rewards-pane.html
// @resource        battle-stats-pane.html                      html/battle-stats-pane.html
// @resource        main.html                                   html/main.html
// @resource        monster-database-pane.html                  html/monster-database-pane.html
// @resource        overview-pane.html                          html/overview-pane.html
// @resource        proficiency-table.html                      html/proficiency-table.html
// @resource        settings-pane.html                          html/settings-pane.html
// @resource        shrine-pane.html                            html/shrine-pane.html
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
}
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
}

browser.extension.style = {
	element: null,
	add: function (styleText) {
		if (!browser.isChrome) {
			GM_addStyle(styleText);
		} else {
			if (!this.element) {
				this.element = document.createElement("style");
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
			if (result && result.length >= 2) {
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
	},
	setup: function () {
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
			isCharacter: !!document.getElementById("pattrform"),
			isRiddle: !!document.getElementById("riddleform"),
		};

		var elementCache = {
			popup: document.getElementById("popup_box"),
		};

		var settings = {
			useHVFontEngine: document.getElementsByClassName('fd10')[0].textContent !== "Health points",
			difficulty: null,
		};
		var e = document.querySelectorAll('div.clb table.cit div.fd12 > div');
		var i, r;
		for (i = 0; i < e.length; i++) {
			r = /(Easy|Normal|Hard|Heroic|Nightmare|Hell|Nintendo|Battletoads|IWBTH)/.exec(util.innerText(e[i]));
			if (r && r.length >= 2) {
				settings.difficulty = r[1];
				break;
			}
		}

		var character = {
			healthRate: hv.util.getCharacterGaugeRate(document.querySelector('img[alt="health"]')),
			magicRate: hv.util.getCharacterGaugeRate(document.querySelector('img[alt="magic"]')),
			spiritRate: hv.util.getCharacterGaugeRate(document.querySelector('img[alt="spirit"]')),
			overchargeRate: hv.util.getCharacterGaugeRate(document.querySelector('img[alt="overcharge"]')),
			healthPercent: 0,
			magicPercent: 0,
			spiritPercent: 0,
			overchargePercent: 0,
		};
		character.healthPercent = hv.util.percent(character.healthRate);
		character.magicPercent = hv.util.percent(character.magicRate);
		character.spiritPercent = hv.util.percent(character.spiritRate);
		character.overchargePercent = hv.util.percent(character.overchargeRate);

		var battleLog = document.getElementById("togpane_log");
		var battle = {};
		battle.active = !!battleLog;
		if (battle.active) {
			battle.elementCache = {
				battleForm: document.getElementById("battleform"),
				quickcastBar: document.getElementById("quickbar"),
				battleLog: battleLog,
				monsterPane: document.getElementById("monsterpane"),
				dialog: document.querySelector('div.btcp'),
				dialogButton: document.getElementById("ckey_continue"),
			};
			battle.elementCache.characterEffectIcons = battle.elementCache.battleForm.querySelectorAll('div.btps img[onmouseover^="battle.set_infopane_effect"]');
			battle.elementCache.monsters = battle.elementCache.monsterPane.querySelectorAll('div[id^="mkey_"]');

			battle.round = {
				finished: !!battle.elementCache.dialog,
			};
			battle.finished = false;
			if (battle.round.finished) {
				if (!battle.elementCache.dialogButton) {
					// Hourly Encounter
					battle.finished = true;
				} else {
					// The others
					var dialogButton_onclick = battle.elementCache.dialogButton.getAttribute("onclick");
					if (dialogButton_onclick.indexOf("battle.battle_continue") === -1) {
						battle.finished = true;
					}
				}
			}
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
	version: "5.5.2.1",
	setup: function () {
		this.addStyle();
	},
	addStyle: function () {
		var C = browser.extension.style.ImageResourceInfo;
		var imageResouces = [
			new C("images/", "channeling.png", "css/images/"),
			new C("images/", "healthpot.png", "css/images/"),
			new C("images/", "manapot.png", "css/images/"),
			new C("images/", "spiritpot.png", "css/images/"),
		];
		browser.extension.style.addFromResource("css/", "hvstat.css", imageResouces);
	},
	// Shortcuts
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
	get drops() {
		return hvStat.storage.drops.value;
	},
	get arenaRewards() {
		return hvStat.storage.arenaRewards.value;
	},
	get shrine() {
		return hvStat.storage.shrine.value;
	},
	get roundInfo() {
		return hvStat.storage.roundInfo.value;
	},
	get equipmentTags() {
		return hvStat.storage.equipmentTags.value;
	},
};

//------------------------------------
// Utilities
//------------------------------------
hvStat.util = {
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
				if (typeof item === primitives[i]) {
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
}

hvStat.C = hvStat.constant.Keyword;	// Shortcut

hvStat.constant.difficulty = hvStat.constant.factory([
	new hvStat.C("EASY", "Easy"),
	new hvStat.C("NORMAL", "Normal"),
	new hvStat.C("HARD", "Hard"),
	new hvStat.C("HEROIC", "Heroic"),
	new hvStat.C("NIGHTMARE", "Nightmare"),
	new hvStat.C("HELL", "Hell"),
	new hvStat.C("NINTENDO", "Nintendo"),
	new hvStat.C("BATTLETOADS", "Battletoads"),
	new hvStat.C("IWBTH", "IWBTH"),
]);

hvStat.constant.battleMode = hvStat.constant.factory([
	new hvStat.C("HOURLY_ENCOUNTER", "Hourly Encounter"),
	new hvStat.C("ARENA", "Arena"),
	new hvStat.C("RING_OF_BLOOD", "Ring of Blood"),
	new hvStat.C("GRINDFEST", "GrindFest"),
	new hvStat.C("ITEM_WORLD", "Item World"),
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
		isTrackRewards: false,
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
			spiritual: 0,
			deprecating: 0,
			supportive: 0,
		},
		overcharge: 100,
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
	// Drops object
	drops: {
		dropChances: 0,
		itemArry: [
			"[Lesser Health Potion]", "[Scroll of Swiftness]",
			"[Average Health Potion]", "[Scroll of Shielding]",
			"[Greater Health Potion]", "[Scroll of Warding]",
			"[Superior Health Potion]", "[Scroll of the Avatar]",
			"[Godly Health Potion]", "[Scroll of Absorption]",
			"[Health Elixir]", "[Scroll of Shadows]",
			"[Lesser Mana Potion]", "[Scroll of Life]",
			"[Average Mana Potion]", "[Scroll of the Gods]",
			"[Greater Mana Potion]", "[Infusion of Flames]",
			"[Superior Mana Potion]", "[Infusion of Frost]",
			"[Godly Mana Potion]", "[Infusion of Lightning]",
			"[Mana Elixir]", "[Infusion of Storms]",
			"[Lesser Spirit Potion]", "[Infusion of Divinity]",
			"[Average Spirit Potion]", "[Infusion of Darkness]",
			"[Greater Spirit Potion]", "[Infusion of Gaia]",
			"[Superior Spirit Potion]", "[Soul Stone]",
			"[Godly Spirit Potion]", "[Flower Vase]",
			"[Spirit Elixir]", "[Last Elixir]",
			"[Token of Blood]", "[Bubble-Gum]",
			"[Token of Healing]", "[Crystal of Flames]",
			"[Chaos Token]", "[Crystal of Frost]",
			"[Crystal of Vigor]", "[Crystal of Lightning]",
			"[Crystal of Finesse]", "[Crystal of Tempest]",
			"[Crystal of Swiftness]", "[Crystal of Devotion]",
			"[Crystal of Fortitude]", "[Crystal of Corruption]",
			"[Crystal of Cunning]", "[Crystal of Quintessence]",
			"[Crystal of Knowledge]", " ",
			"[Voidseeker Shard]", " ",
			"[Aether Shard]", " ",
			"[Featherweight Shard]", " ",
			"[Amnesia Shard]", " "
		],
		itemQtyArry: [],
		itemDrop: 0,
		eqArray: [],
		eqDrop: 0,
		artArry: [],
		artQtyArry: [],
		artDrop: 0,
		eqDropbyBT: [0, 0, 0, 0, 0],
		artDropbyBT: [0, 0, 0, 0, 0],
		itemDropbyBT: [0, 0, 0, 0, 0],
		crysDropbyBT: [0, 0, 0, 0, 0],
		dropChancesbyBT: [0, 0, 0, 0, 0],
	},
	// Arena Rewards object
	arenaRewards: {
		eqRwrd: 0,
		eqRwrdArry: [],
		itemsRwrd: 0,
		itemRwrdArry: [],
		itemRwrdQtyArry: [],
		artRwrd: 0,
		artRwrdArry: [],
		artRwrdQtyArry: [],
		tokenDrops: [0, 0, 0],
	},
	// Shrine object
	shrine: {
		artifactsTraded: 0,
		artifactStat: 0,
		artifactAP: 0,
		artifactHath: 0,
		artifactHathTotal: 0,
		artifactCrystal: 0,
		artifactItem: 0,
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
	// Round Information object
	roundInfo: {
		monsters: [],
		currRound: 0,
		maxRound: 0,
		arenaNum: 0,
		dropChances: 0,
		battleType: 0,
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
					}
				});
				// Remove disused properties
				hvStat.util.forEachProperty(this._defaultValue, this._value, function (defaultValue, storedValue, key) {
					if (defaultValue[key] === undefined) {
						delete storedValue[key];
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
		this._value = this._defaultValue;
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

// Drops constructor inherits Item
hvStat.storage.Drops = function (key, defaultValue) {
	hvStat.storage.Item.apply(this, [key, defaultValue]);
};
hvStat.storage.Drops.prototype = Object.create(hvStat.storage.Item.prototype);
hvStat.storage.Drops.prototype.constructor = hvStat.storage.Drops;
hvStat.storage.Drops.prototype.getValue = function () {
	var obj = hvStat.storage.Item.prototype.getValue.apply(this);
	for (var i = 0; i < obj.itemArry.length; i++) {
		if (isNaN(parseFloat(obj.itemQtyArry[i]))) {
			obj.itemQtyArry[i] = 0;
		}
	}
	return obj;
};

// Drops object
hvStat.storage.drops = new hvStat.storage.Drops("HVDrops", hvStat.storage.initialValue.drops);

// Arena Rewards constructor inherits Item
hvStat.storage.ArenaRewards = function (key, defaultValue) {
	hvStat.storage.Item.apply(this, [key, defaultValue]);
};
hvStat.storage.ArenaRewards.prototype = Object.create(hvStat.storage.Item.prototype);
hvStat.storage.ArenaRewards.prototype.constructor = hvStat.storage.ArenaRewards;
hvStat.storage.ArenaRewards.prototype.getValue = function () {
	var obj = hvStat.storage.Item.prototype.getValue.apply(this);
	if (!Object.getOwnPropertyDescriptor(obj, "totalRwrds")) {
		Object.defineProperty(obj, "totalRwrds", {
			get: function () {
				return this.artRwrd + this.eqRwrd + this.itemsRwrd;
			},
			enumerable: false,
			configurable: false
		});
	}
	return obj;
};

// Arena Rewards object
hvStat.storage.arenaRewards = new hvStat.storage.ArenaRewards("HVRewards", hvStat.storage.initialValue.arenaRewards);

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

// Round Information object
hvStat.storage.roundInfo = new hvStat.storage.Item("hvStat.roundInfo", hvStat.storage.initialValue.roundInfo);

// Equipment Tags object
hvStat.storage.equipmentTags = new hvStat.storage.Item("HVTags", hvStat.storage.initialValue.equipmentTags);

// Old Monster Database object
hvStat.storage.oldMonsterDatabase = new hvStat.storage.Item("HVDatabase", hvStat.storage.initialValue.oldMonsterDatabase);

//------------------------------------
// Gadgets
//------------------------------------
hvStat.gadget = {};

hvStat.gadget.equippedSet = {
	create: function () {
		var leftBar = document.querySelector('div.clb');
		var cssText = leftBar.querySelector('table.cit td > div > div').style.cssText;
		var table = document.createElement("table");
		table.className = "cit";
		table.innerHTML ='<tbody><tr><td><div class="fd12"><div id="hvstat-equipped-set"></div></div></td></tr></tbody>';
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
		tableData[ 7].textContent = prof.spiritual.toFixed(2);
		tableData[ 9].textContent = prof.deprecating.toFixed(2);
		tableData[11].textContent = prof.supportive.toFixed(2);
		var icon = document.createElement("div");
		icon.id = "hvstat-proficiency-popup-icon";
		icon.className = "ui-corner-all";
		icon.textContent = "Proficiency";
		icon.appendChild(this.popup);
		icon.addEventListener("mouseover", this.mouseover);
		icon.addEventListener("mouseout", this.mouseout);
		var leftBar = document.querySelector("div.clb");
		leftBar.parentNode.insertBefore(icon, leftBar.nextSibling);
	},
	mouseover: function (event) {
		hvStat.gadget.proficiencyPopupIcon.popup.style.visibility = "visible";
	},
	mouseout: function (event) {
		hvStat.gadget.proficiencyPopupIcon.popup.style.visibility = "hidden";
	},
};

//------------------------------------
// Keyboard
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
		setup: function () {
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
			scrollTarget = hvStat.keyboard.scrollable.currentTarget
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
		if (hv.battle.active) {
			var miScan = hvStat.battle.command.subMenuItemMap["Scan"];
			var miSkill1 = hvStat.battle.command.subMenuItemMap["Skill1"];
			var miSkill2 = hvStat.battle.command.subMenuItemMap["Skill2"];
			var miSkill3 = hvStat.battle.command.subMenuItemMap["Skill3"];
			var miOFC = hvStat.battle.command.subMenuItemMap["OFC"];
			var miSkills = [miSkill1, miSkill2, miSkill3];
			if (hvStat.settings.isEnableScanHotkey && miScan) {
				boundKeys = miScan.boundKeys;
				for (i = 0; i < boundKeys.length; i++) {
					if (boundKeys[i].matches(event)) {
						if (hvStat.battle.command.commandMap["Skills"].menuOpened) {
							hvStat.battle.command.commandMap["Skills"].close();
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
							hvStat.battle.command.commandMap["Skills"].close();
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
						if (hvStat.battle.command.commandMap["Skills"].menuOpened) {
							hvStat.battle.command.commandMap["Skills"].close();
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
}
hvStat.keyboard.KeyCombination.prototype = {
	matches: function (obj) {
		if (!obj) {
			return false;
		}
		return this.altKey === obj.altKey
			&& this.ctrlKey === obj.ctrlKey
			&& this.shiftKey === obj.shiftKey
			&& this.keyCode === obj.keyCode;
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
	},
};

//------------------------------------
// Battle
//------------------------------------
hvStat.battle = {
	constant: {
		rInfoPaneParameters: /battle\.set_infopane_(?:spell|skill|item|effect)\('((?:[^'\\]|\\.)*)'\s*,\s*'(?:[^'\\]|\\.)*'\s*,\s*(.+)\)/,
	},
	setup: function () {
		if (hvStat.settings.isShowSelfDuration) {
			hvStat.battle.enhancement.effectDurationBadge.showForCharacter();
		}
		if (hvStat.settings.showSelfEffectStackLevel) {
			hvStat.battle.enhancement.effectStackLevelBadge.showForCharacter();
		}
		if (hvStat.settings.isShowPowerupBox) {
			hvStat.battle.enhancement.powerupBox.create();
		}
		if (hvStat.settings.isHighlightQC) {
			hvStat.battle.enhancement.quickcast.highlight();
		}
		if (hvStat.settings.isShowHighlight) {
			hvStat.battle.enhancement.log.setHighlightStyle();
			hvStat.battle.enhancement.log.highlight();
		}
		if (hvStat.settings.isShowDivider) {
			hvStat.battle.enhancement.log.showDivider();
		}
		if (hvStat.settings.isShowScanButton) {
			hvStat.battle.enhancement.scanButton.createAll();
		}
		if (hvStat.settings.isShowSkillButton) {
			hvStat.battle.enhancement.skillButton.createAll();
		}
 		if (hvStat.settings.isShowMonsterNumber) {
 			hvStat.battle.enhancement.monsterLabel.replaceWithNumber();
 		}
		if (hvStat.settings.isShowMonsterDuration) {
			hvStat.battle.enhancement.effectDurationBadge.showForMonsters();
		}
		if (hvStat.settings.showMonsterEffectStackLevel) {
			hvStat.battle.enhancement.effectStackLevelBadge.showForMonsters();
		}
	},
	advanceRound: function () {
		if (!hv.battle.finished && hv.battle.round.finished) {
			(function (dialogButton) {
				setTimeout(function () {
					dialogButton.click();
					return 0;
				}, hvStat.settings.autoAdvanceBattleRoundDelay);
			})(hv.battle.elementCache.dialogButton);
		}
	},
};

hvStat.battle.command = {
	_commandMap: null,
	get commandMap() {
		if (!this._commandMap) {
			this._commandMap = {
				"Attack": new hvStat.battle.command.Command({ elementId: "ckey_attack", name: "Attack" }),
				"Magic":  new hvStat.battle.command.Command({ elementId: "ckey_magic",  name: "Magic",  menuElementIds: ["togpane_magico", "togpane_magict"] }),
				"Spirit": new hvStat.battle.command.Command({ elementId: "ckey_spirit", name: "Spirit" }),
				"Skills": new hvStat.battle.command.Command({ elementId: "ckey_skills", name: "Skills", menuElementIds: ["togpane_skill"] }),
				"Items":  new hvStat.battle.command.Command({ elementId: "ckey_items",  name: "Items",  menuElementIds: ["togpane_item"] }),
				"Defend": new hvStat.battle.command.Command({ elementId: "ckey_defend", name: "Defend" }),
				"Focus":  new hvStat.battle.command.Command({ elementId: "ckey_focus",  name: "Focus" })
			};
		}
		return this._commandMap;
	},
	_subMenuItemMap: null,
	get subMenuItemMap() {
		if (!this._subMenuItemMap) {
			this._subMenuItemMap = {
				"PowerupGem": hvStat.battle.command.getSubMenuItemById("ikey_p"),
				"Scan": hvStat.battle.command.getSubMenuItemByName("Scan"),
				"Skill1": hvStat.battle.command.getSubMenuItemById("110001")
					|| hvStat.battle.command.getSubMenuItemById("120001")
					|| hvStat.battle.command.getSubMenuItemById("130001")
					|| hvStat.battle.command.getSubMenuItemById("140001")
					|| hvStat.battle.command.getSubMenuItemById("150001"),
				"Skill2": hvStat.battle.command.getSubMenuItemById("110002")
					|| hvStat.battle.command.getSubMenuItemById("120002")
					|| hvStat.battle.command.getSubMenuItemById("130002")
					|| hvStat.battle.command.getSubMenuItemById("140002")
					|| hvStat.battle.command.getSubMenuItemById("150002"),
				"Skill3": hvStat.battle.command.getSubMenuItemById("110003")
					|| hvStat.battle.command.getSubMenuItemById("120003")
					|| hvStat.battle.command.getSubMenuItemById("130003")
					|| hvStat.battle.command.getSubMenuItemById("140003")
					|| hvStat.battle.command.getSubMenuItemById("150003"),
				"OFC": hvStat.battle.command.getSubMenuItemByName("Orbital Friendship Cannon"),
			};
			if (this._subMenuItemMap["Scan"]) {
				this._subMenuItemMap["Scan"].bindKeys([
					new hvStat.keyboard.KeyCombination({ keyCode: 46 }),	// Delete
					new hvStat.keyboard.KeyCombination({ keyCode: 110 })	// Numpad . Del
				]);
			}
			if (this._subMenuItemMap["Skill1"]) {
				this._subMenuItemMap["Skill1"].bindKeys([
					new hvStat.keyboard.KeyCombination({ keyCode: 107 }),	// Numpad +
					new hvStat.keyboard.KeyCombination({ keyCode: 187 })	// = +
				]);
			}
			if (this._subMenuItemMap["OFC"]) {
				this._subMenuItemMap["OFC"].bindKeys([
					new hvStat.keyboard.KeyCombination({ keyCode: 109 }),	// Numpad -
					new hvStat.keyboard.KeyCombination({ keyCode: 189 })	// - _
				]);
			}
		}
		return this._subMenuItemMap;
	},
	getSubMenuItemById: function (subMenuItemId) {
		var key, menus, i, items, j;
		var commandMap = hvStat.battle.command.commandMap;
		for (key in commandMap) {
			menus = commandMap[key].menus;
			for (i = 0; i < menus.length; i++) {
				items = menus[i].items;
				for (j = 0; j < items.length; j++) {
					if (items[j].id === subMenuItemId) {
						return items[j];
					}
				}
			}
		}
		return null;
	},
	getSubMenuItemByName: function (subMenuItemName) {
		var key, menus, i, items, j;
		var commandMap = hvStat.battle.command.commandMap;
		for (key in commandMap) {
			menus = commandMap[key].menus;
			for (i = 0; i < menus.length; i++) {
				items = menus[i].items;
				for (j = 0; j < items.length; j++) {
					if (items[j].name === subMenuItemName) {
						return items[j];
					}
				}
			}
		}
		return null;
	},
	getSubMenuItemsByBoundKey: function (keyCombination) {
		var foundItems = [];
		var key, menus, i, items, j, boundKeys, k;
		var commandMap = hvStat.battle.command.commandMap;
		for (key in commandMap) {
			menus = commandMap[key].menus;
			for (i = 0; i < menus.length; i++) {
				items = menus[i].items;
				for (j = 0; j < items.length; j++) {
					boundKeys = items[j].boundKeys;
					for (k = 0; k < boundKeys.length; k++) {
						if (boundKeys[k].matches(keyCombination)) {
							foundItems.push(items[j]);
						}
					}
				}
			}
		}
		return foundItems;
	},
};

hvStat.battle.command.SubMenuItem = function (spec) {
	this.parent = spec && spec.parent || null;
	this.element = spec && spec.element || null;
	var onmouseover = String(this.element.getAttribute("onmouseover"));
	var result = hvStat.battle.constant.rInfoPaneParameters.exec(onmouseover);
	if (!result || result.length < 3) {
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
hvStat.battle.command.SubMenuItem.prototype = {
	get available() {
		return !this.element.style.cssText.match(/opacity\s*:\s*0/);
	},
	select: function () {
		if (this.available) {
			if (!this.parent.opened) {
				this.parent.open();
			}
			this.element.onclick();	// select
			if (this.commandTarget === "self") {
				this.element.onclick();	// commit
			}
		}
	},
	bindKeys: function (keyConbinations) {
		this.boundKeys = keyConbinations;
	},
	unbindKeys: function () {
		this.boundKeys = [];
	}
}

hvStat.battle.command.SubMenu = function (spec) {
	this.parent = spec && spec.parent || null;
	this.elementId = spec && spec.elementId || null;
	this.element = this.elementId && document.getElementById(this.elementId) || null;

	this.items = [];
	var itemElements = this.element.querySelectorAll("div.btsd, #ikey_p, img.btii");
	for (var i = 0; i < itemElements.length; i++) {
		this.items[i] = new hvStat.battle.command.SubMenuItem({ parent: this, element: itemElements[i] });
	}
};
hvStat.battle.command.SubMenu.prototype = {
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
	}
};

hvStat.battle.command.Command = function (spec) {
	this.elementId = spec && spec.elementId || null;
	this.name = spec && spec.name || "";
	this.menuElementIds = spec && spec.menuElementIds || [];
	this.element = this.elementId && document.getElementById(this.elementId) || null;
	this.menus = [];

	// Build menus
	for (var i = 0; i < this.menuElementIds.length; i++) {
		this.menus[i] = new hvStat.battle.command.SubMenu({ parent: this, elementId: this.menuElementIds[i] });
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

hvStat.battle.enhancement = {};

hvStat.battle.enhancement.roundCounter = {
	// Adds a Round counter to the Battle screen.
	create: function () {
		var doc = document,
			curRound = hvStat.roundInfo.currRound,
			maxRound = hvStat.roundInfo.maxRound,
			dispRound = maxRound > 0 ? curRound + "/" + maxRound : "#" + curRound,
			div = doc.createElement('div');

		div.className = "hvstat-round-counter";
		div.textContent = dispRound;
		if (curRound === maxRound - 1) {
			div.className += " hvstat-round-counter-second-last";
		} else if (curRound === maxRound) {
			div.className += " hvstat-round-counter-last";
		}
		doc.getElementById('battleform').children[0].appendChild(div);
	},
};

hvStat.battle.enhancement.effectDurationBadge = {
	create: function (effectIcon) {
		var result = hvStat.battle.constant.rInfoPaneParameters.exec(effectIcon.getAttribute("onmouseover"));
		if (!result || result.length < 3) {
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
			powerBox = document.createElement("div");
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
				hvStat.battle.command.subMenuItemMap["PowerupGem"].select();
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
		var logRows = hv.battle.elementCache.battleLog.getElementsByTagName('tr');
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
	createAll: function () {
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
		}
	},
	create: function (monster) {
		var button = document.createElement("div");
		button.className = "hvstat-scan-button";
		button.textContent = "Scan";
		button.addEventListener("click", function (event) {
			hvStat.battle.command.subMenuItemMap["Scan"].select();
			monster.onclick();
		});
		return button;
	},
};

hvStat.battle.enhancement.skillButton = {
	getLabelById: function (id) {
		var labelTable = [
			{ id: "110001", label: "SkyS" },
			{ id: "120001", label: "ShiB" },
			{ id: "120002", label: "VitS" },
			{ id: "120003", label: "MerB" },
			{ id: "130001", label: "GreC" },
			{ id: "130002", label: "RenB" },
			{ id: "130003", label: "ShaS" },
			{ id: "140001", label: "IrisS" },
			{ id: "140002", label: "Stab" },
			{ id: "140003", label: "FreB" },
			{ id: "150001", label: "ConS" },
		];
		for (var i = 0; i < labelTable.length; i++) {
			if (labelTable[i].id === id) {
				return labelTable[i].label;
			}
		}
		return "";
	},
	createAll: function () {
		var skill1 = hvStat.battle.command.subMenuItemMap["Skill1"];
		var skill2 = hvStat.battle.command.subMenuItemMap["Skill2"];
		var skill3 = hvStat.battle.command.subMenuItemMap["Skill3"];
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
		hv.battle.elementCache.monsterPane.style.overflow = "visible";
		var monsters = hv.battle.elementCache.monsters;
		for (var i = 0; i < monsters.length; i++) {
			if (monsters[i].innerHTML.indexOf("bardead") >= 0) {
				continue;
			}
			for (j = 0; j < skills.length; j++) {
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
			hvStat.battle.command.subMenuItemMap["Skill" + skillNumber].select();
			monster.onclick();
		});
		return button;
	},
};

hvStat.battle.enhancement.monsterLabel = {
	replaceWithNumber: function () {
		var targets = document.querySelectorAll("img.btmi");
		for (var i = 0; i < targets.length; i++) {
			var target = targets[i];
			target.className += " hvstat-monster-number";
			var parentNode = target.parentNode;
			var div = document.createElement("div");
			div.textContent = "MON";
			parentNode.appendChild(div);
			var div = document.createElement("div");
			div.textContent = String((i + 1) % 10);
			parentNode.appendChild(div);
		}
	},
};

hvStat.battle.monster = {};

hvStat.battle.warningSystem = {};

//------------------------------------
// UI
//------------------------------------
hvStat.ui = {
	setup: function () {
		this.addStyle();
		this.createIcon();
	},
	addStyle: function () {
		var C = browser.extension.style.ImageResourceInfo;
		var imageResouces = [
			new C("images/", "ui-bg_flat_0_aaaaaa_40x100.png", "css/images/"),
			new C("images/", "ui-bg_flat_55_fbf9ee_40x100.png", "css/images/"),
			new C("images/", "ui-bg_flat_65_edebdf_40x100.png", "css/images/"),
			new C("images/", "ui-bg_flat_75_e3e0d1_40x100.png", "css/images/"),
			new C("images/", "ui-bg_flat_75_edebdf_40x100.png", "css/images/"),
			new C("images/", "ui-bg_flat_95_fef1ec_40x100.png", "css/images/"),
			new C("images/", "ui-icons_2e83ff_256x240.png", "css/images/"),
			new C("images/", "ui-icons_5c0d11_256x240.png", "css/images/"),
			new C("images/", "ui-icons_cd0a0a_256x240.png", "css/images/"),
		];
		browser.extension.style.addFromResource("css/", "jquery-ui-1.9.2.custom.min.css", imageResouces);
	},
	createIcon: function () {
		var stuffBox = document.querySelector("div.stuffbox");
		var icon = document.createElement("div");
		icon.id = "hvstat-icon";
		icon.className = "ui-state-default ui-corner-all";
		icon.innerHTML = '<span class="ui-icon ui-icon-wrench" title="Launch HV STAT UI"/>';
		icon.addEventListener("click", function (event) {
			this.removeEventListener(event.type, arguments.callee);
			hvStat.ui.createDialog();
		});
		icon.addEventListener("mouseover", function (event) {
			this.className = this.className.replace(" ui-state-hover", "");
			this.className += " ui-state-hover";
		});
		icon.addEventListener("mouseout", function (event) {
			this.className = this.className.replace(" ui-state-hover", "");
		});
		stuffBox.insertBefore(icon, null);
	},
	// jQuery and jQuery UI must not be used except on the dialog panel for performance reason.
	createDialog: function () {
		// Load jQuery and jQuery UI
		browser.extension.loadScript("scripts/", "jquery-1.8.3.min.js");
		browser.extension.loadScript("scripts/", "jquery-ui-1.9.2.custom.min.js");

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
			width: 850,
			modal: true,
			position: ["center", "center"],
			title: "[STAT] HentaiVerse Statistics, Tracking, and Analysis Tool v." + hvStat.version,
		});
		$('#hvstat-tabs').tabs();
		initOverviewPane();
		initBattleStatsPane();
		initItemPane();
		initRewardsPane();
		initShrinePane();
		initSettingsPane();
		initMonsterDatabasePane();
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

var HVStat = {	// TODO: To be refactored
	reMonsterScanResultsTSV: /^(\d+?)\t(.*?)\t(.*?)\t(.*?)\t(\d*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)$/gm,
	reMonsterSkillsTSV: /^(\d+?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)$/gm,
	monsterGaugeMaxWidth: 120,

	// Temporary localStorage keys (attach the prefix "hvStat" to avoid conflicts with other scripts)
	key_hpAlertAlreadyShown: "hvStat.healthAlertShown",
	key_mpAlertAlreadyShown: "hvStat.magicAlertShown",
	key_spAlertAlreadyShown: "hvStat.spiritAlertShown",
	key_ocAlertAlreadyShown: "hvStat.overchargeAlertShown",

	// indexedDB
	idb: null,
	transaction: null,
	idbAccessQueue: null,

	// Monster database import/export
	dataURIMonsterScanResults: null,
	dataURIMonsterSkills: null,
	nRowsMonsterScanResultsTSV: 0,
	nRowsMonsterSkillsTSV: 0,

	// Battle states
	monsters: [],	// Instances of HVStat.Monster
	alertQueue: [],
};

//------------------------------------
// Value objects
//------------------------------------

HVStat.DefenseLevelVO = function () {
	var v = "AVERAGE";
	return {
		CRUSHING: v,
		SLASHING: v,
		PIERCING: v,
		FIRE: v,
		ELEC: v,
		COLD: v,
		WIND: v,
		HOLY: v,
		DARK: v,
		SOUL: v,
		VOID: v
	};
};

HVStat.MonsterScanResultsVO = function (spec) {
	this.id = null;
	this.lastScanDate = null;
	this.name = null;
	this.monsterClass = null;
	this.powerLevel = null;
	this.trainer = null;
	this.meleeAttack = null;
	this.defenseLevel = new HVStat.DefenseLevelVO();
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

HVStat.MonsterSkillVO = function (spec) {
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
HVStat.MonsterSkillVO.prototype.createKey = function () {
	this.key = [
		this.id,
		(this.name !== null) ? this.name : "",	// Must not be null
		this.skillType,
		this.attackType,
		this.damageType
	];
};

HVStat.MonsterVO = function () {
	return {
		id: null,
		name: null,
		maxHp: null,
		prevMpRate: null,
		prevSpRate: null,
		scanResult: null,
		skills: [],
	};
};

//------------------------------------
// Utility functions
//------------------------------------

HVStat.getDateTimeString = function (date) {
	if (browser.isChrome) {
		// See http://code.google.com/p/chromium/issues/detail?id=3607
		return date.toLocaleDateString() + " " + date.toLocaleTimeString();
	} else {
		return date.toDateString() + " " + date.toTimeString();
	}
};

HVStat.getElapsedFrom = function (date) {
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
};

HVStat.getGaugeRate = function (gaugeElement, gaugeMaxWidth) {
	if (!gaugeElement) {
		return 0;
	}
	var result = /width\s*?:\s*?(\d+?)px/i.exec(gaugeElement.style.cssText);
	var rate;
	if (result && result.length >= 2) {
		rate = Number(result[1]) / gaugeMaxWidth;
	} else {
		rate = gaugeElement.width / gaugeMaxWidth;
	}
	return rate;
};

HVStat.enqueueAlert = function (message) {
	HVStat.alertQueue.push(message);
}

HVStat.AlertAllFromQueue = function () {
	var i, len = HVStat.alertQueue.length;
	for (i = 0; i < len; i++) {
		alert(HVStat.alertQueue.shift());
	}
}

//------------------------------------
// Classes
//------------------------------------
HVStat.TurnLog = function (specifiedTurn) {
	this.turn = -1;
	this.lastTurn = -1;
	this.texts = [];
	this.innerHTMLs = [];

	var turnElements = document.querySelectorAll("#togpane_log td:first-child");
	this.lastTurn = Number(util.innerText(turnElements[0]));
	if (isNaN(parseFloat(specifiedTurn))) {
		specifiedTurn = this.lastTurn;
	} else {
		specifiedTurn = Number(specifiedTurn);
	}
	this.turn = specifiedTurn;

	for (var i = 0; i < turnElements.length; i++) {
		var turnElement = turnElements[i];
		var turn = Number(util.innerText(turnElement));
		if (turn === specifiedTurn) {
			var logTextElement = turnElement.nextSibling.nextSibling;
			this.texts.push(util.innerText(logTextElement));
			this.innerHTMLs.push(logTextElement.innerHTML);
		}
	}
	this.texts.reverse();
	this.innerHTMLs.reverse();
};

HVStat.MonsterSkill = (function () {
	// Constructor
	function MonsterSkill(vo) {
		var _id = vo.id || null;
		var _name = vo.name || null;
		var _lastUsedDate = vo.lastUsedDate ? new Date(vo.lastUsedDate) : null;
		var _skillType = hvStat.constant.skillType[vo.skillType] || null;
		var _attackType = hvStat.constant.attackType[vo.attackType] || null;
		var _damageType = hvStat.constant.damageType[vo.damageType] || null;

		return {
			get name() { return _name; },
			get lastUsedDate() { return _lastUsedDate; },
			set lastUsedDate(date) { _lastUsedDate = date; },
			get skillType() { return _skillType; },
			get attackType() { return _attackType; },
			get damageType() { return _damageType; },
			get valueObject() {
				var vo = new HVStat.MonsterSkillVO();
				vo.id = _id;
				vo.name = _name;
				vo.lastUsedDate = _lastUsedDate ? _lastUsedDate.toISOString() : null;
				vo.skillType = _skillType ? _skillType.id : null;
				vo.attackType = _attackType ? _attackType.id : null;
				vo.damageType = _damageType ? _damageType.id : null;
				vo.createKey();
				return vo;
			},
			toString: function (abbrLevel) {
				return _attackType.toString(abbrLevel) + "-" + (_damageType ? _damageType.toString(abbrLevel) : "?");
			}
		};
	};

	// Public static method
	MonsterSkill.fetchSkillLog = function (logUsed, logDamaged, skillType) {
		var vo = new HVStat.MonsterSkillVO();
		var r = / (uses|casts) ([^\.]+)/.exec(logUsed);
		if (!r || r.length < 3) {
			return null;
		}
		vo.name = r[2];
		vo.skillType = skillType.id;
		switch (r[1]) {
		case "uses":
			vo.attackType = hvStat.constant.attackType.PHYSICAL.id;
			break;
		case "casts":
			vo.attackType = hvStat.constant.attackType.MAGICAL.id;
			break;
		default:
			vo.attackType = null;
		}
		r = / ([A-Za-z]+) damage/.exec(logDamaged);
		if (!r || r.length < 2) {
			return null;
		}
		var dt = hvStat.constant.damageType[r[1].toUpperCase()];
		vo.damageType = dt ? dt.id : null;
		vo.lastUsedDate = new Date();
		return new MonsterSkill(vo);
	};

	return MonsterSkill;
}());

HVStat.MonsterScanResults = (function () {
	// Private static variable
	var _mappingToSettingsHideSpecificDamageType = [
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
	];
	var _damageTypeGeneralizingTable = [
		{
			generic: hvStat.constant.genericDamageType.PHYSICAL,
			elements: [
				hvStat.constant.damageType.CRUSHING,
				hvStat.constant.damageType.SLASHING,
				hvStat.constant.damageType.PIERCING
			]
		},
		{
			generic: hvStat.constant.genericDamageType.ELEMENTAL,
			elements: [
				hvStat.constant.damageType.FIRE,
				hvStat.constant.damageType.COLD,
				hvStat.constant.damageType.ELEC,
				hvStat.constant.damageType.WIND
			]
		}
	];

	var _damageTypesToBeHidden = [];
	(function () {
		var i, len = _mappingToSettingsHideSpecificDamageType.length;
		for (i = 0; i < len; i++) {
			if (hvStat.settings.hideSpecificDamageType[i]) {
				_damageTypesToBeHidden.push(_mappingToSettingsHideSpecificDamageType[i]);
			}
		}
	})();

	// Constructor
	function MonsterScanResults(vo) {
		var _id;
		var _lastScanDate;
		var _name;
		var _monsterClass;
		var _powerLevel;
		var _trainer;
		var _meleeAttack;
		var _defenseLevel = {};
		var _debuffsAffected = [];
		var _defWeak = [];
		var _defResistant = [];
		var _defImpervious = [];
		var damageTypeId, debuffId;

		_id = vo.id || null;
		_lastScanDate = vo.lastScanDate ? new Date(vo.lastScanDate) : null;
		_name = vo.name || null;
		_monsterClass = hvStat.constant.monsterClass[vo.monsterClass] || null;
		_powerLevel = vo.powerLevel || null;
		_trainer = vo.trainer || null;
		_meleeAttack = hvStat.constant.damageType[vo.meleeAttack] || null;

		for (damageTypeId in hvStat.constant.damageType) {
			_defenseLevel[damageTypeId] = hvStat.constant.defenseLevel[(vo.defenseLevel || vo.defenceLevel)[damageTypeId]] || null;
		}
		for (damageTypeId in _defenseLevel) {
			switch (_defenseLevel[damageTypeId]) {
			case hvStat.constant.defenseLevel.WEAK:
				_defWeak.push(hvStat.constant.damageType[damageTypeId]);
				break;
			case hvStat.constant.defenseLevel.RESISTANT:
				_defResistant.push(hvStat.constant.damageType[damageTypeId]);
				break;
			case hvStat.constant.defenseLevel.IMPERVIOUS:
				_defImpervious.push(hvStat.constant.damageType[damageTypeId]);
				break;
			}
		}
		for (var i in vo.debuffsAffected) {
			_debuffsAffected.push(hvStat.constant.debuff[vo.debuffsAffected[i]]);
		}

		// Private instance method
		var _hideDamageTypes = function (source) {
			var i, j;
			var damageTypes = source.concat();
			for (i = 0; i < _damageTypesToBeHidden.length; i++) {
				for (j = damageTypes.length - 1; j >= 0; j--) {
					if (damageTypes[j] === _damageTypesToBeHidden[i]) {
						damageTypes.splice(j, 1);
					}
				}
			}
			return damageTypes;
		}

		var _generalizeDamageTypes = function (source, damageTypes) {
			damageTypes = source.concat();
			var i, lenTable, indices;
			var j, lenTableElem, index;

			lenTable = _damageTypeGeneralizingTable.length;
			for (i = 0; i < _damageTypeGeneralizingTable.length; i++) {
				indices = [];
				lenTableElem = _damageTypeGeneralizingTable[i].elements.length
				for (j = 0; j < lenTableElem; j++) {
					index = damageTypes.indexOf(_damageTypeGeneralizingTable[i].elements[j]);
					if (index >= 0) {
						indices.push(index);
					}
				}
				if (indices.length === lenTableElem) {
					for (j = lenTableElem - 1; j >= 0; j--) {
						if (j > 0) {
							damageTypes.splice(indices[j], 1);
						} else {
							damageTypes[indices[j]] = _damageTypeGeneralizingTable[i].generic;
						}
					}
				}
			}
			return damageTypes;
		};

		var _filterDamageTypes = function (damageTypes, hiding, generalizing) {
			if (hiding) {
				damageTypes = _hideDamageTypes(damageTypes);
			}
			if (generalizing) {
				damageTypes = _generalizeDamageTypes(damageTypes);
			}
			return damageTypes;
		};

		var _StringifyDamageTypes = function (damageTypes, abbrLevel) {
			var damageTypeStrings = [];
			var delimiter = hvStat.constant.delimiter.toString(abbrLevel);
			for (i = 0; i < damageTypes.length; i++) {
				damageTypeStrings[i] = damageTypes[i].toString(abbrLevel);
			}
			return damageTypeStrings.join(delimiter);
		};

		return {
			get lastScanDate() { return _lastScanDate; },
			get monsterClass() { return _monsterClass; },
			get powerLevel() { return _powerLevel; },
			get trainer() { return _trainer; },
			get meleeAttack() { return _meleeAttack; },
			get defenseLevel() {
				var i, dl = {};
				for (i in _defenseLevel) {
					dl[i] = _defenseLevel[i];
				}
				return dl;
			},
			get debuffsAffected() { return _debuffsAffected.concat(); },
			get defWeak() { return _defWeak.concat(); },
			get defResistant() { return _defResistant.concat(); },
			get defImpervious() { return _defImpervious.concat(); },
			get valueObject() {
				var i, len;
				var vo = new HVStat.MonsterScanResultsVO();
				vo.id = _id;
				vo.lastScanDate = _lastScanDate ? _lastScanDate.toISOString() : null;
				vo.name = _name;
				vo.monsterClass = _monsterClass ? _monsterClass.id : null;
				vo.powerLevel = _powerLevel;
				vo.trainer = _trainer;
				vo.meleeAttack = _meleeAttack ? _meleeAttack.id : null;
				for (i in _defenseLevel) {
					vo.defenseLevel[i] = _defenseLevel[i].id;
				}
				len = _debuffsAffected.length;
				for (i = 0; i < len; i++) {
					vo.debuffsAffected[i] = _debuffsAffected[i].id;
				}
				return vo;
			},
			getDefWeakString: function (hiding, generalizing, abbrLevel) {
				var damageTypes = _filterDamageTypes(_defWeak, hiding, generalizing);
				return _StringifyDamageTypes(damageTypes, abbrLevel);
			},
			getDefResistantString: function (hiding, generalizing, abbrLevel) {
				var damageTypes = _filterDamageTypes(_defResistant, hiding, generalizing);
				return _StringifyDamageTypes(damageTypes, abbrLevel);
			},
			getDefImperviousString: function (hiding, generalizing, abbrLevel) {
				var damageTypes = _filterDamageTypes(_defImpervious, hiding, generalizing);
				return _StringifyDamageTypes(damageTypes, abbrLevel);
			}
		};
	};

	// Public static method
	MonsterScanResults.fetchScanningLog = function (index, text) {
		var reScan = /Scanning (.*)\.\.\.\s+HP: [^\s]+\/([^\s]+)\s+MP: [^\s]+\/[^\s]+(?:\s+SP: [^\s]+\/[^\s]+)? Monster Class: (.+?)(?:, Power Level (\d+))? Monster Trainer:(?: (.+))? Melee Attack: (.+) Weak against: (.+) Resistant to: (.+) Impervious to: (.+)/;
		var vo = new HVStat.MonsterScanResultsVO();
		var result = reScan.exec(text);
		if (!result || result.length < 10) {
			alert("HVSTAT: Unknown scanning format");
			return null;
		}
		vo.lastScanDate = (new Date()).toISOString();
		vo.monsterClass = result[3].toUpperCase() || null;
		vo.powerLevel = Number(result[4]) || null;
		vo.trainer = result[5] || null;
		vo.meleeAttack = result[6].toUpperCase() || null;
		var array;
		var defWeak = result[7] || null;
		if (defWeak) {
			array = defWeak.toUpperCase().split(", ");
			array.forEach(function (element, index, array) {
				if (element !== "NOTHING") {
					vo.defenseLevel[element] = hvStat.constant.defenseLevel.WEAK.id;
				}
			});
		}
		var defResistant = result[8] || null;
		if (defResistant) {
			array = defResistant.toUpperCase().split(", ");
			array.forEach(function (element, index, array) {
				if (element !== "NOTHING") {
					vo.defenseLevel[element] = hvStat.constant.defenseLevel.RESISTANT.id;
				}
			});
		}
		var defImpervious = result[9] || null;
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
		debuffElements = document.querySelectorAll("#" + HVStat.Monster.getDomElementId(index) + " div.btm6 > img");
		for (i = 0; i < debuffElements.length; i++) {
			debuffInfo = debuffElements[i].getAttribute("onmouseover");
			for (debuffId in hvStat.constant.debuff) {
				if (debuffInfo.indexOf(hvStat.constant.debuff[debuffId].name) >= 0) {
					vo.debuffsAffected.push(debuffId);
				}
			}
		}
		return new MonsterScanResults(vo);
	}

	return MonsterScanResults;
}());

HVStat.Monster = (function () {
	// private static variable
	var _domElementIds = [
		"mkey_1", "mkey_2", "mkey_3", "mkey_4", "mkey_5",
		"mkey_6", "mkey_7", "mkey_8", "mkey_9", "mkey_0"
	];
	var _maxBarWidth = HVStat.monsterGaugeMaxWidth;

	// constructor
	function Monster(index) {
		if (isNaN(index) || index < 0 || _domElementIds.length <= index) {
			alert("invalid index");
			return null;
		}

		var _index = index;
		var _baseElement = document.getElementById(_domElementIds[_index]);
		var _healthBars = _baseElement.querySelectorAll("div.btm5");
		var _isDead = _healthBars[0].querySelectorAll("img.chb2").length === 0;
		var _waitingForGetResponseOfMonsterScanResults = false;
		var _waitingForGetResponseOfMonsterSkills = false;

		var _id;
		var _name;
		var _maxHp;
		var _prevMpRate;
		var _prevSpRate;
		var _scanResult;
		var _skills = [];

		var currBarRate = function (barIndex) {
			if (barIndex >= _healthBars.length) {
				return 0;
			}
			var v, bar = _healthBars[barIndex].querySelector("img.chb2");
			if (!bar) {
				v = 0;
			} else {
				r = /width\s*?:\s*?(\d+?)px/i.exec(bar.style.cssText);
				if (r && r.length >= 2) {
					v = Number(r[1]) / _maxBarWidth;
				} else {
					v = bar.width() / _maxBarWidth;	// TODO: remove jQuery call
				}
			}
			return v;
		};

		var _currHpRate = currBarRate(0);
		var _currMpRate = currBarRate(1);
		var _currSpRate = currBarRate(2);
		var _hasSpiritPoint = _healthBars.length > 2;
		var _currHp = function () {
			var v = _currHpRate * _maxHp;
			if (!_isDead && v === 0) {
				v = 1;
			}
			return v;
		};
		var _waitingForDBResponse = function () {
			return _waitingForGetResponseOfMonsterScanResults || _waitingForGetResponseOfMonsterSkills;
		};
		var _getManaSkills = function () {
			var manaSkills = [];
			var i, skill;
			var len = _skills.length
			for (i = 0; i < len; i++) {
				skill = _skills[i];
				if (skill.skillType === hvStat.constant.skillType.MANA) {
					manaSkills.push(skill);
				}
			}
			return manaSkills;
		};
		var _getManaSkillTable = function () {
			var manaSkills = _getManaSkills();
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
			for (var i = 0; i < manaSkills.length; i++) {
				attackType = manaSkills[i].attackType.id;
				damageType = manaSkills[i].damageType.id;
				skillTable[attackType].exists = true;
				skillTable[attackType].damageTable[damageType] = true;
			}
			return skillTable;
		};
		var _getSpiritSkill = function () {
			var i, skill;
			var len = _skills.length
			for (i = 0; i < len; i++) {
				skill = _skills[i];
				if (skill.skillType === hvStat.constant.skillType.SPIRIT) {
					return skill;
				}
			}
			return null;
		};
		var _renderStats = function () {
			if (_isDead) {
				return;
			}
			if (!(hvStat.settings.showMonsterHP
					|| hvStat.settings.showMonsterMP
					|| hvStat.settings.showMonsterSP
					|| hvStat.settings.showMonsterInfoFromDB)) {
				return;
			}

			var nameOuterFrameElement = _baseElement.children[1];
			var nameInnerFrameElement = _baseElement.children[1].children[0];
			var maxAbbrLevel = hvStat.settings.ResizeMonsterInfo ? 5 : 1;
			var maxStatsWidth = 315;

			var html, statsHtml;
			var div;
			var abbrLevel;

			if (hvStat.settings.showMonsterInfoFromDB) {
				for (abbrLevel = 0; abbrLevel < maxAbbrLevel; abbrLevel++) {
					statsHtml = '';
					if (!_scanResult || !_scanResult.monsterClass) {
//						if (hvStat.settings.showNewLabelForUnknownMonster) {
							statsHtml = '[<span class="hvstat-monster-status-unknown">NEW</span>]';
//						}
					} else {
						// Class and power level
						if (hvStat.settings.showMonsterClassFromDB || hvStat.settings.showMonsterPowerLevelFromDB) {
							statsHtml += '{';
						}
						if (hvStat.settings.showMonsterClassFromDB) {
							statsHtml += '<span class="hvstat-monster-status-class">';
							statsHtml += _scanResult.monsterClass.toString(abbrLevel);
							statsHtml += '</span>';
						}
						if (hvStat.settings.showMonsterPowerLevelFromDB && _scanResult.powerLevel) {
							if (hvStat.settings.showMonsterClassFromDB) {
								statsHtml += hvStat.constant.delimiter.toString(abbrLevel);
							}
							statsHtml += '<span class="hvstat-monster-status-power-level">';
							statsHtml += _scanResult.powerLevel + '+';
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
							statsHtml += (_scanResult.defWeak.length > 0) ? _scanResult.getDefWeakString(true, true, abbrLevel) : "-";
							statsHtml += '</span>';
						}
						if (hvStat.settings.showMonsterResistancesFromDB) {
							if (hvStat.settings.showMonsterWeaknessesFromDB) {
								statsHtml += '|';
							}
							statsHtml += '<span class="hvstat-monster-status-resistance">';
							statsHtml += (_scanResult.defResistant.length > 0) ? _scanResult.getDefResistantString(true, true, abbrLevel) : '-';
							statsHtml += '</span>';
							if (_scanResult.defImpervious.length > 0) {
								statsHtml += '|<span class="hvstat-monster-status-imperviableness">';
								statsHtml += _scanResult.getDefImperviousString(true, true, abbrLevel);
								statsHtml += '</span>';
							}
						}
						if (hvStat.settings.showMonsterWeaknessesFromDB || hvStat.settings.showMonsterResistancesFromDB) {
							statsHtml += "]";
						}
					}
					// Melee attack and skills
					if (hvStat.settings.showMonsterAttackTypeFromDB) {
						var meleeAttackExists = _scanResult && _scanResult.meleeAttack;
						var manaSkills = _getManaSkills();
						var manaSkillsExist = manaSkills.length > 0;
						var spiritSkill = _getSpiritSkill();
						if (meleeAttackExists || manaSkillsExist || spiritSkill) {
							statsHtml += '(';
						}
						// Melee attack
						if (meleeAttackExists) {
							statsHtml += '<span class="hvstat-monster-status-melee-attack-type">';
							statsHtml += _scanResult.meleeAttack.toString(abbrLevel > 0 ? abbrLevel : 1);
							statsHtml += '</span>';
						}
						// Mana skills
						if (manaSkillsExist) {
							if (meleeAttackExists) {
								statsHtml += ';';
							}
							statsHtml += '<span class="hvstat-monster-status-magic-skill-attack-type">';
							var skillTable = _getManaSkillTable();
							var attackTypeCount, damageTypeCount
							attackTypeCount = 0;
							for (attackType in skillTable) {
								if (skillTable[attackType].exists) {
									if (attackTypeCount > 0) {
										statsHtml += '|';
									}
									damageTypeCount = 0;
									for (damageType in skillTable[attackType].damageTable) {
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
							if (!manaSkillsExist) {
								statsHtml += ';';
							} else {
								statsHtml += '|';
							}
							statsHtml += '<span class="hvstat-monster-status-spirit-skill-attack-type">';
							statsHtml += spiritSkill.toString(abbrLevel > 0 ? abbrLevel : 1);
							statsHtml += '</span>';
						}
						if (meleeAttackExists || manaSkillsExist || spiritSkill) {
							statsHtml += ')';
						}
					}
					if (hv.settings.useHVFontEngine) {
						nameOuterFrameElement.style.width = "auto"; // Tweak for Firefox
						nameInnerFrameElement.style.width = "auto"; // Tweak for Firefox
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
			}
		};

		var _renderPopup = function () {
			var i, len, skill, lastScanString;
			var existsScanResult = _scanResult && _scanResult.monsterClass;
			var html = '<table cellspacing="0" cellpadding="0" style="width:100%">'
				+ '<tr class="monname"><td colspan="2"><b>' + _name + '</b></td></tr>'
				+ '<tr><td width="33%">ID: </td><td>' + _id + '</td></tr>'
				+ '<tr><td>Health: </td><td>' + _currHp().toFixed(1) + ' / ' + _maxHp.toFixed(1) + '</td></tr>'
				+ '<tr><td>Mana: </td><td>' + (_currMpRate * 100).toFixed(2) + '%</td></tr>';
			if (_hasSpiritPoint) {
				html += '<tr><td>Spirit: </td><td>' + (_currSpRate * 100).toFixed(2) + '%</td></tr>';
			}
			if (existsScanResult) {
				html += '<tr><td>Class:</td><td>' + (_scanResult.monsterClass ? _scanResult.monsterClass : "") + '</td></tr>'
					+ '<tr><td>Trainer:</td><td>' + (_scanResult.trainer ? _scanResult.trainer : "") + '</td></tr>';
				if (_scanResult.powerLevel) {
					html += '<tr><td>Power Level:</td><td>' + _scanResult.powerLevel + '</td></tr>';
				}
				html += '<tr><td>Melee Attack:</td><td>' + (_scanResult.meleeAttack ? _scanResult.meleeAttack : "") + '</td></tr>';
			}
			var manaSkills = _getManaSkills();
			if (manaSkills && manaSkills.length > 0) {
				html += '<tr><td valign="top">Skills:</td><td>';
				len = manaSkills.length;
				var skillTable = _getManaSkillTable();
				var skillCount = 0;
				for (attackType in skillTable) {
					if (skillTable[attackType].exists) {
						for (damageType in skillTable[attackType].damageTable) {
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
			var spiritSkill = _getSpiritSkill();
			if (spiritSkill) {
				html += '<tr><td>Spirit Skill:</td><td>';
				html += spiritSkill.toString();
				html += '</td></tr>';
			}
			lastScanString = "Never";
			if (existsScanResult) {
				html += '<tr><td>Weak against:</td><td>' + (_scanResult.defWeak.length > 0 ? _scanResult.getDefWeakString(false, true, 0) : "-") + '</td></tr>'
					+ '<tr><td>Resistant to:</td><td>' + (_scanResult.defResistant.length > 0 ? _scanResult.getDefResistantString(false, true, 0) : "-") + '</td></tr>'
					+ '<tr><td>Impervious to:</td><td>' + (_scanResult.defImpervious.length > 0 ? _scanResult.getDefImperviousString(false, true, 0) : "-") + '</td></tr>'
					+ '<tr><td>Debuffs affected:</td><td>' + (_scanResult.debuffsAffected.length > 0 ? _scanResult.debuffsAffected.join(", ") : "-") + '</td></tr>';
				if (_scanResult.lastScanDate) {
					lastScanString = HVStat.getDateTimeString(_scanResult.lastScanDate);
				}
			}
			html += '<tr><td valign="top">Last Scan:</td><td>' + lastScanString + '</td></tr>';
			if (existsScanResult && _scanResult.lastScanDate) {
				html += '<tr><td></td><td>' + HVStat.getElapsedFrom(_scanResult.lastScanDate) + ' ago</td></tr>';
			}
			html += '</table>';
			return html;
		};

		return {
			get id() { return _id; },
			get name() { return _name; },
			get maxHp() { return _maxHp; },
			get currHp() { return _currHp(); },
			get currHpRate() { return _currHpRate; },
			get currMpRate() { return _currMpRate; },
			get currSpRate() { return _currSpRate; },
			get hasSpiritPoint() { return _hasSpiritPoint; },
			get isDead() { return _isDead; },
			get scanResult() { return _scanResult; },
			get skills() { return _skills },
			get valueObject() {
				var vo = new HVStat.MonsterVO();
				vo.id = _id;
				vo.name = _name;
				vo.maxHp = _maxHp;
				vo.prevMpRate = _currMpRate;
				vo.prevSpRate = _currSpRate;
				vo.scanResult = _scanResult ? _scanResult.valueObject : null;
				for (var i = 0; i < _skills.length; i++) {
					vo.skills[i] = _skills[i].valueObject;
				}
				return vo;
			},
			get domElementId() { return _domElementIds[_index]; },
			get baseElement() { return _baseElement; },

			set id(id) { _id = id; },
			set name(name) { _name = name; },
			set maxHp(maxHp) { _maxHp = maxHp; },

			// Public instance methods
			fetchStartingLog: function (html) {
				var r;
				r = /MID=(\d+)\s/.exec(html);
				if (!r || r.length < 2) {
					alert("HVSTAT: cannot identify MID");
					return;
				}
				_id = Number(r[1]);
				r = /\(([^\.\)]{0,30})\) LV/.exec(html);
				if (r && r.length >= 2) {
					_name = r[1];
				}
				r = /HP=(\d+\.?\d*)$/.exec(html);
				if (r && r.length >= 2) {
					_maxHp = Number(r[1]);
				}
			},
			fetchScanningLog: function (text, transaction) {
				_scanResult = HVStat.MonsterScanResults.fetchScanningLog(_index, text);
				this.putScanResultToDB(transaction);
			},
			fetchSkillLog: function (used, damaged, transaction) {
				var i;
				var spiritSkillFound;
				var skillType = (_prevSpRate <= _currSpRate) ? hvStat.constant.skillType.MANA : hvStat.constant.skillType.SPIRIT;
				var skill = HVStat.MonsterSkill.fetchSkillLog(used, damaged, skillType);
				if (skillType === hvStat.constant.skillType.SPIRIT) {
					// Spirit skill
					// Overwrite if exists
					for (i = 0; i < _skills.length; i++) {
						if (_skills[i].skillType ===  hvStat.constant.skillType.SPIRIT) {
							break;
						}
					}
					_skills[i] = skill;
				} else {
					// Mana skill
					// Overwrite if same name or name is null
					for (i = 0; i < _skills.length; i++) {
						if (_skills[i].skillType ===  hvStat.constant.skillType.MANA
								&& (_skills[i].name === skill.name
									|| (_skills[i].name === null && _skills[i].attackType === skill.attackType && _skills[i].damageType === skill.damageType))) {
							break;
						}
					}
					_skills[i] = skill;
				}
				if (hvStat.settings.isRememberSkillsTypes) {
					this.putSkillsToDB(transaction);
				}
			},
			setFromValueObject: function (valueObject) {
				var vo = valueObject;
				_id = vo.id;
				_name = vo.name;
				_maxHp = vo.maxHp;
				_prevMpRate = vo.prevMpRate;
				_prevSpRate = vo.prevSpRate;
				_scanResult = vo.scanResult ? new HVStat.MonsterScanResults(vo.scanResult) : null;
				vo.skills.forEach(function (element, index, array) {
					_skills.push(new HVStat.MonsterSkill(element));
				});
			},
			getFromDB: function (transaction, callback) {
				if (!_id) {
					return;
				}
				var tx = transaction; 
				var scanResultsStore = tx.objectStore("MonsterScanResults");
				var skillsStore = tx.objectStore("MonsterSkills");
				// MonsterScanResults
				var reqGet = scanResultsStore.get(_id);
				_waitingForGetResponseOfMonsterScanResults = true;
				reqGet.onsuccess = function (event) {
					_waitingForGetResponseOfMonsterScanResults = false;
					//console.debug(event.target.result);
					if (event.target.result === undefined) {
						//console.log("get from MonsterScanResults: not found: id = " + _id);
					} else {
						//console.log("get from MonsterScanResults: success: id = " + _id);
						_scanResult = new HVStat.MonsterScanResults(event.target.result);
						//console.debug(_scanResult.valueObject);
					}
					if (!_waitingForDBResponse()) {
						callback();
					}
				};
				reqGet.onerror = function (event) {
					_waitingForGetResponseOfMonsterScanResults = false;
					console.log("get from MonsterScanResults: error");
				};
				// MonsterSkills
				var reqGet = skillsStore.get(_id);
				var idx = skillsStore.index("ix_id");
				var range = IDBKeyRange.bound(_id, _id);
				var reqOpen = idx.openCursor(range, "next");
				_waitingForGetResponseOfMonsterSkills = true;
				reqOpen.onsuccess = function(){
					var cursor = this.result;
					if (cursor) {
						//console.debug(cursor.value);
						var skill = new HVStat.MonsterSkill(cursor.value);
						//console.debug(skill.valueObject);
						_skills.push(skill);
						//console.log("get from MonsterSkills: id = " + _id);
						cursor.continue();
					} else {
						_waitingForGetResponseOfMonsterSkills = false;
						//console.log("get from MonsterSkills: finished: id = " + _id);
					}
					if (!_waitingForDBResponse()) {
						callback();
					}
				}
				reqOpen.onerror = function(){
					_waitingForGetResponseOfMonsterSkills = false;
					console.log('request error.');
				}
			},
			putScanResultToDB: function (transaction) {
				if (!_id || !_scanResult) {
					return;
				}
				var scanResultsStore = transaction.objectStore("MonsterScanResults");
				var vo = _scanResult.valueObject;
				vo.id = _id;
				vo.name = _name;
				var reqPut = scanResultsStore.put(vo);
				reqPut.onsuccess = function (event) {
					//console.log("putScanResultToDB: success: id = " + _id);
				};
				reqPut.onerror = function (event) {
					console.log("putScanResultToDB: error: id = " + _id);
				};
			},
			putSkillsToDB: function (transaction) {
				if (!_id) {
					return;
				}
				// Put after delete
				var skillsStore = transaction.objectStore("MonsterSkills");
				var range = IDBKeyRange.bound(_id, _id);
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
						for (i = 0; i < _skills.length; i++) {
							vo = _skills[i].valueObject;
							vo.id = _id;
							vo.createKey();
//							alert("Skill: id = " + vo.id + ", name = '" + vo.name + "', skillType = " + vo.skillType + ", attackType = " + vo.attackType + ", damageType = " + vo.damageType);
							reqPut = skillsStore.put(vo);
							reqPut.onsuccess = function (event) {
								//console.log("putSkillsToDB: success: id = " + _id);
							};
							reqPut.onerror = function (event) {
								console.log("putSkillsToDB: error: id = " + _id);
							};
						}
					}
				}
				reqOpen.onerror = function () {
					console.log('request error.');
					alert('request error.');
				}
			},

			renderHealth: function () {
				if (this.isDead || !hvStat.settings.showMonsterHP && !hvStat.settings.showMonsterMP && !hvStat.settings.showMonsterSP) {
					return;
				}

				var nameOuterFrameElement = this.baseElement.children[1];
				var nameInnerFrameElement = this.baseElement.children[1].children[0];
				var hpBarBaseElement = this.baseElement.children[2].children[0];
				var mpBarBaseElement = this.baseElement.children[2].children[1];
				var spBarBaseElement = this.baseElement.children[2].children[2];
				var hpIndicator = "";
				var mpIndicator = "";
				var spIndicator = "";
				var div;

				if (hvStat.settings.showMonsterHP || hvStat.settings.showMonsterHPPercent) {
					div = document.createElement("div");
					div.className = "hvstat-monster-health";
					if (hvStat.settings.showMonsterHPPercent) {
						hpIndicator = (this.currHpRate * 100).toFixed(2) + "%";
					} else if (this.currHp && this.maxHp) {
						hpIndicator = this.currHp.toFixed(0) + " / " + this.maxHp.toFixed(0);
					}
					div.textContent = hpIndicator;
					hpBarBaseElement.parentNode.insertBefore(div, hpBarBaseElement.nextSibling);
				}
				if (hvStat.settings.showMonsterMP) {
					div = document.createElement("div");
					div.className = "hvstat-monster-magic";
					mpIndicator = (this.currMpRate * 100).toFixed(1) + "%";
					div.textContent = mpIndicator;
					mpBarBaseElement.parentNode.insertBefore(div, mpBarBaseElement.nextSibling);
				}
				if (hvStat.settings.showMonsterSP && this.hasSpiritPoint) {
					div = document.createElement("div");
					div.className = "hvstat-monster-spirit";
					spIndicator = (this.currSpRate * 100).toFixed(1) + "%";
					div.textContent = spIndicator;
					spBarBaseElement.parentNode.insertBefore(div, spBarBaseElement.nextSibling);
				}
			},
			renderStats: function () {
				if (!_waitingForDBResponse()) {
					_renderStats();
				} else {
					setTimeout(arguments.callee, 10);
				}
			},
			renderPopup: function () {
				return _renderPopup();
			}
		};
	};

	// Public static method
	Monster.getDomElementId = function (index) {
		if (isNaN(index) || index < 0 || _domElementIds.length <= index) {
			alert("Monster.getDomElementId: invalid index");
			return null;
		}
		return _domElementIds[index];
	};

	return Monster;
}());

//------------------------------------
// IndexedDB manipulators
//------------------------------------

HVStat.deleteIndexedDB = function () {
	// Close connection
	HVStat.transaction = null;
	HVStat.idb = null;

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

HVStat.maintainObjectStores = function (event) {
	var alertMessage = "IndexDB database operation has failed; see console log";
//	var idb = event.target.source;  // does not work with Firefox
	var idb = HVStat.idb;
	var tx = event.target.transaction;
	var oldVer = event.oldVersion;	// does not work with Chrome
	var newVer = event.newVersion || Number(idb.version);
	var store;
//	console.debug(event);
//	console.debug(idb);

	if (newVer >= 1) {
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
};

HVStat.openIndexedDB = function (callback) {
	var errorMessage;

	var idbVersion = 1; // Must be an integer
	var reqOpen = indexedDB.open("HVStat", idbVersion);
	reqOpen.onerror = function (event) {
		errorMessage = "Database open error: " + event.target.errorCode;
		alert(errorMessage);
		console.log(errorMessage);
	};
	// Latest W3C draft (Firefox and Chrome 23 or later)
	reqOpen.onupgradeneeded = function (event) {
		console.log("onupgradeneeded");
		HVStat.idb = reqOpen.result;
		HVStat.maintainObjectStores(event);
		// Subsequently onsuccess event handler is called automatically
	};
	reqOpen.onsuccess = function (event) {
		var idb = HVStat.idb = reqOpen.result;
		if (Number(idb.version) === idbVersion) {
			// Always come here if Firefox and Chrome 23 or later
			if (callback instanceof Function) {
				callback(event);
			}
		} else {
			// Obsolete Chrome style (Chrome 22 or earlier)
			console.debug("came setVersion route");
			var reqVersion = idb.setVersion(idbVersion);
			reqVersion.onerror = function (event) {
				errorMessage = "Database setVersion error: " + event.target.errorCode;
				alert(errorMessage);
				console.log(errorMessage);
			};
			reqVersion.onsuccess = function (event) {
				HVStat.maintainObjectStores(event);
				var tx = reqVersion.result;
				if (callback instanceof Function) {
					tx.oncomplete = callback;
				}
			};
		}
	};
};

HVStat.deleteAllObjectsInMonsterScanResults = function () {
	var tx = HVStat.idb.transaction(["MonsterScanResults"], "readwrite");
	var store = tx.objectStore("MonsterScanResults");
	var range = null; // Select all
	var count = 0;

	var req = store.openCursor(range, "next");
	req.onsuccess = function () {
		var cursor = this.result;
		if (cursor) {
			cursor.delete();
			count++;
			cursor.continue();
		} else {
			alert("Your monster scan results has been deleted.\nsuccess(es): " + count);
		}
	}
	req.onerror = function () {
		console.log('request error.');
		alert('request error.');
	}
};

HVStat.deleteAllObjectsInMonsterSkills = function () {
	var tx = HVStat.idb.transaction(["MonsterSkills"], "readwrite");
	var store = tx.objectStore("MonsterSkills");
	var range = null; // Select all
	var count = 0;

	var req = store.openCursor(range, "next");
	req.onsuccess = function () {
		var cursor = this.result;
		if (cursor) {
			cursor.delete();
			count++;
			cursor.continue();
		} else {
			alert("Your monster skill data has been deleted.\nsuccess(es): " + count);
		}
	}
	req.onerror = function () {
		console.log('request error.');
		alert('request error.');
	}
};

HVStat.exportMonsterScanResults = function (callback) {
	var tx = HVStat.idb.transaction(["MonsterScanResults"], "readonly");
	var store = tx.objectStore("MonsterScanResults");
	var range = null; // Select all
	var count = 0;
	var texts = [];
	var tab = "%09";
	var newline = "%0A"
	texts[0] = "ID"
		+ tab + "LAST_SCAN_DATE"
		+ tab + "NAME"
		+ tab + "MONSTER_CLASS"
		+ tab + "POWER_LEVEL"
		+ tab + "TRAINER"
		+ tab + "MELEE_ATTACK"
		+ tab + "DEF_CRUSHING"
		+ tab + "DEF_SLASHING"
		+ tab + "DEF_PIERCING"
		+ tab + "DEF_FIRE"
		+ tab + "DEF_COLD"
		+ tab + "DEF_ELEC"
		+ tab + "DEF_WIND"
		+ tab + "DEF_HOLY"
		+ tab + "DEF_DARK"
		+ tab + "DEF_SOUL"
		+ tab + "DEF_VOID"
		+ tab + "DEBUFFS_AFFECTED";

	var req = store.openCursor(range, "next");
	req.onsuccess = function (event) {
		var cursor = this.result;
		var vo;
		var text;
		if (cursor) {
			vo = cursor.value;
			count++;
			vo.defenseLevel = vo.defenseLevel || vo.defenceLevel;	// Patch
			texts[count] = vo.id
				+ tab + (vo.lastScanDate !== null ? vo.lastScanDate : "")
				+ tab + (vo.name !== null ? vo.name : "")
				+ tab + (vo.monsterClass !== null ? vo.monsterClass : "")
				+ tab + (vo.powerLevel !== null ? vo.powerLevel : "")
				+ tab + (vo.trainer !== null ? vo.trainer : "")
				+ tab + (vo.meleeAttack !== null ? vo.meleeAttack : "")
				+ tab + (vo.defenseLevel && vo.defenseLevel.CRUSHING ? vo.defenseLevel.CRUSHING : "")
				+ tab + (vo.defenseLevel && vo.defenseLevel.SLASHING ? vo.defenseLevel.SLASHING : "")
				+ tab + (vo.defenseLevel && vo.defenseLevel.PIERCING ? vo.defenseLevel.PIERCING : "")
				+ tab + (vo.defenseLevel && vo.defenseLevel.FIRE ? vo.defenseLevel.FIRE : "")
				+ tab + (vo.defenseLevel && vo.defenseLevel.COLD ? vo.defenseLevel.COLD : "")
				+ tab + (vo.defenseLevel && vo.defenseLevel.ELEC ? vo.defenseLevel.ELEC : "")
				+ tab + (vo.defenseLevel && vo.defenseLevel.WIND ? vo.defenseLevel.WIND : "")
				+ tab + (vo.defenseLevel && vo.defenseLevel.HOLY ? vo.defenseLevel.HOLY : "")
				+ tab + (vo.defenseLevel && vo.defenseLevel.DARK ? vo.defenseLevel.DARK : "")
				+ tab + (vo.defenseLevel && vo.defenseLevel.SOUL ? vo.defenseLevel.SOUL : "")
				+ tab + (vo.defenseLevel && vo.defenseLevel.VOID ? vo.defenseLevel.VOID : "")
				+ tab + (vo.debuffsAffected ? vo.debuffsAffected.join(", ") : "");
			cursor.continue();
		} else {
			HVStat.dataURIMonsterScanResults = "data:text/tsv;charset=utf-8," + texts.join(newline);
			HVStat.nRowsMonsterScanResultsTSV = count;
			if (callback instanceof Function) {
				callback(event);
			}
		}
	}
	req.onerror = function (event) {
		console.log('request error.');
		alert('request error.');
	}
};

HVStat.exportMonsterSkills = function (callback) {
	var tx = HVStat.idb.transaction(["MonsterSkills"], "readonly");
	var store = tx.objectStore("MonsterSkills");
	var range = null; // Select all
	var count = 0;
	var texts = [];
	var tab = "%09";
	var newline = "%0A"
	texts[0] = "ID"
		+ tab + "NAME"
		+ tab + "SKILL_TYPE"
		+ tab + "ATTACK_TYPE"
		+ tab + "DAMAGE_TYPE"
		+ tab + "LAST_USED_DATE";

	var req = store.openCursor(range, "next");
	req.onsuccess = function (event) {
		var cursor = this.result;
		var vo;
		var text;
		if (cursor) {
			vo = cursor.value;
			count++;
			texts[count] = vo.id
				+ tab + (vo.name !== null ? vo.name : "")
				+ tab + (vo.skillType !== null ? vo.skillType : "")
				+ tab + (vo.attackType !== null ? vo.attackType : "")
				+ tab + (vo.damageType !== null ? vo.damageType : "")
				+ tab + (vo.lastUsedDate !== null ? vo.lastUsedDate : "");
			cursor.continue();
		} else {
			HVStat.dataURIMonsterSkills = "data:text/tsv;charset=utf-8," + texts.join(newline);
			HVStat.nRowsMonsterSkillsTSV = count;
			if (callback instanceof Function) {
				callback(event);
			}
		}
	}
	req.onerror = function (event) {
		console.log('request error.');
		alert('request error.');
	}
};

HVStat.importMonsterScanResults = function (file, callback) {
	var reader = new FileReader();
	reader.onload = function (event) {
		var contents = event.target.result;
		var rowCount, procCount;
		var result;
		var tx = HVStat.idb.transaction(["MonsterScanResults"], "readwrite");
		var store = tx.objectStore("MonsterScanResults");
		var skipCount = 0;
		var successCount = 0;
		var errorCount = 0;
		var voExisting, voToPut, reqPut;

		var report = function () {
			if (procCount >= rowCount) {
				alert(rowCount + " row(s) found, " + successCount + " row(s) imported, " + skipCount + " row(s) skipped, " + errorCount + " error(s)");
			}
		}

		// Prescan
		HVStat.reMonsterScanResultsTSV.lastIndex = 0;
		rowCount = 0;
		while ((result = HVStat.reMonsterScanResultsTSV.exec(contents)) !== null) {
			rowCount++;
		}

		// Import
		procCount = 0;
		HVStat.reMonsterScanResultsTSV.lastIndex = 0;
		while ((result = HVStat.reMonsterScanResultsTSV.exec(contents)) !== null) {
			voToPut = new HVStat.MonsterScanResultsVO({
				id: result[1],
				lastScanDate: result[2],
				name: result[3],
				monsterClass: result[4],
				powerLevel: result[5],
				trainer: result[6],
				meleeAttack: result[7],
				defCrushing: result[8],
				defSlashing: result[9],
				defPiercing: result[10],
				defFire: result[11],
				defCold: result[12],
				defElec: result[13],
				defWind: result[14],
				defHoly: result[15],
				defDark: result[16],
				defSoul: result[17],
				defVoid: result[18],
				debuffsAffected: result[19],
			});
			(function (voToPut) {
				reqGet = store.get(voToPut.id);
				reqGet.onsuccess = function (event) {
					var doPut = false;
					if (event.target.result === undefined) {
						doPut = true;
					} else {
						voExisting = event.target.result;
						if (voExisting.lastScanDate === null || voToPut.lastScanDate >= voExisting.lastScanDate) {
							doPut = true;
						} else {
							//console.log("importMonsterScanResults: voToPut.id = [" + voToPut.id + "], voExisting.id  [" + voExisting.id + "]");
							//console.log("importMonsterScanResults: voToPut.lastScanDate = [" + voToPut.lastScanDate + "], voExisting.lastScanDate  [" + voExisting.lastScanDate + "]");
						}
					}
					if (!doPut) {
						skipCount++;
						procCount++;
					} else {
						reqPut = store.put(voToPut);
						reqPut.onsuccess = function (event) {
							successCount++;
							procCount++;
							report();
						};
						reqPut.onerror = function (event) {
							console.log("importMonsterScanResults: put: error");
							errorCount++;
							procCount++;
							report();
						};
					}
				};
				reqGet.onerror = function (event) {
					console.log("importMonsterScanResults: get: error");
					errorCount++;
					procCount++;
					report();
				};
			})(voToPut);
		}
	};
	reader.onerror = function (event) {
		alert("Failed to read file");
	};
	reader.readAsText(file, 'UTF-8');
}

HVStat.importMonsterSkills = function (file, callback) {
	var reader = new FileReader();
	reader.onload = function (event) {
		var contents = event.target.result;
		var rowCount, procCount;
		var result;
		var tx = HVStat.idb.transaction(["MonsterSkills"], "readwrite");
		var store = tx.objectStore("MonsterSkills");
		var skipCount = 0;
		var successCount = 0;
		var errorCount = 0;
		var voExisting, voToPut, reqPut;

		var report = function () {
			if (procCount >= rowCount) {
				alert(rowCount + " row(s) found, " + successCount + " row(s) imported, " + skipCount + " row(s) skipped, " + errorCount + " error(s)");
			}
		}

		// Prescan
		HVStat.reMonsterSkillsTSV.lastIndex = 0;
		rowCount = 0;
		while ((result = HVStat.reMonsterSkillsTSV.exec(contents)) !== null) {
			rowCount++;
		}

		// Import
		procCount = 0;
		HVStat.reMonsterSkillsTSV.lastIndex = 0;
		while ((result = HVStat.reMonsterSkillsTSV.exec(contents)) !== null) {
			voToPut = new HVStat.MonsterSkillVO({
				id: result[1],
				name: result[2],
				skillType: result[3],
				attackType: result[4],
				damageType: result[5],
				lastUsedDate: result[6]
			});
			(function (voToPut) {
				reqGet = store.get(voToPut.id);
				reqGet.onsuccess = function (event) {
					var doPut = false;
					if (event.target.result === undefined) {
						doPut = true;
					} else {
						voExisting = event.target.result;
						if (voExisting.lastUsedDate === null || voToPut.lastUsedDate >= voExisting.lastUsedDate) {
							doPut = true;
						} else {
							//console.log("importMonsterSkills: voToPut.id = [" + voToPut.id + "], voExisting.id  [" + voExisting.id + "]");
							//console.log("importMonsterSkills: voToPut.lastUsedDate = [" + voToPut.lastUsedDate + "], voExisting.lastUsedDate  [" + voExisting.lastUsedDate + "]");
						}
					}
					if (!doPut) {
						skipCount++;
						procCount++;
					} else {
						reqPut = store.put(voToPut);
						reqPut.onsuccess = function (event) {
							successCount++;
							procCount++;
							report();
						};
						reqPut.onerror = function (event) {
							console.log("importMonsterSkills: put: error");
							errorCount++;
							procCount++;
							report();
						};
					}
				};
				reqGet.onerror = function (event) {
					console.log("importMonsterSkills: get: error");
					errorCount++;
					procCount++;
					report();
				};
			})(voToPut);
		}
	};
	reader.onerror = function (event) {
		alert("Failed to read file");
	};
	reader.readAsText(file, 'UTF-8');
}

//------------------------------------
// Migration functions
//------------------------------------
// Finally to be obsolete

HVStat.migration = {};
HVStat.migration.monsterClassFromCode = function (code) {
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

HVStat.migration.skillTypeFromCode = function (code) {
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

HVStat.migration.attackTypeFromCode = function (code) {
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

HVStat.migration.damageTypeFromCode = function (code) {
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

HVStat.migration.createMonsterScanResultsVOFromOldDB = function (oldDB, index) {
	if (!oldDB.mclass[index]) {
		return null;
	}
	var i, len, v, vo = new HVStat.MonsterScanResultsVO();
	// id
	vo.id = Number(index);
	// lastScanDate
	v = oldDB.datescan[index];
	v = v ? new Date(v) : null;
	vo.lastScanDate = v ? v.toISOString() : null;
	// name
	vo.name = null;
	// monsterClass
	v = HVStat.migration.monsterClassFromCode(oldDB.mclass[index]);
	vo.monsterClass = v ? v.id : null;
	// powerLevel
	v = oldDB.mpl[index];
	vo.powerLevel = (!isNaN(v) && v !== 0) ? Number(v) : null;
	// trainer
	vo.trainer = null;
	// meleeAttack
	v = HVStat.migration.damageTypeFromCode(oldDB.mattack[index]);
	vo.meleeAttack = v[0] ? v[0].id : null;
	// defenseLevel
	vo.defenseLevel = new HVStat.DefenseLevelVO();
	v = HVStat.migration.damageTypeFromCode(oldDB.mweak[index]);
	len = v.length;
	for (i = 0; i < len; i++) {
		vo.defenseLevel[v[i].id] = hvStat.constant.defenseLevel.WEAK.id;
	}
	v = HVStat.migration.damageTypeFromCode(oldDB.mresist[index]);
	len = v.length;
	for (i = 0; i < len; i++) {
		vo.defenseLevel[v[i].id] = hvStat.constant.defenseLevel.RESISTANT.id;
	}
	v = HVStat.migration.damageTypeFromCode(oldDB.mimperv[index]);
	len = v.length;
	for (i = 0; i < len; i++) {
		vo.defenseLevel[v[i].id] = hvStat.constant.defenseLevel.IMPERVIOUS.id;
	}
	// debuffsAffected
	vo.debuffsAffected = [];
	return vo;
};

HVStat.migration.migrateMonsterScanResults = function () {
	var tx = HVStat.idb.transaction(["MonsterScanResults"], "readwrite");
	var store = tx.objectStore("MonsterScanResults");
	var i, len = _database.mclass.length;
	var successCount = 0;
	var errorCount = 0;
	var lastIndex, vo, reqPut;
	var report = function () {
		alert("Migration of the monster scan results has completed.\n" + successCount + " success(es), " + errorCount + " error(s)");
	}
	// prescan
	for (i = 0; i < len; i++) {
		if (_database.mclass[i]) {
			lastIndex = i;
		}
	}
	// migrate
	for (i = 0; i < len; i++) {
		if (_database.mclass[i]) {
			vo = HVStat.migration.createMonsterScanResultsVOFromOldDB(_database, i);
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

HVStat.migration.createMonsterSkillVOsFromOldDB = function (oldDB, index) {
	if (!oldDB.mskillspell[index]) {
		return [];
	}
	var v, vo, voArray = [];
	var code, codes = String(oldDB.mskillspell[index]);
	var damageTypes, damageTypeCodes = String(oldDB.mskilltype[index]);
	var damageTypeIndex = 0;

	for (i = 0; i < codes.length; i++) {
		code = codes.substring(i, i + 1);
		damageTypes = HVStat.migration.damageTypeFromCode(damageTypeCodes);
		if (code !== "0") {
			vo = new HVStat.MonsterSkillVO({ id: index });
			v = HVStat.migration.skillTypeFromCode(code);
			vo.skillType = v ? v.id : null;
			v = HVStat.migration.attackTypeFromCode(code);
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

HVStat.migration.migrateMonsterSkills = function () {
	var tx = HVStat.idb.transaction(["MonsterSkills"], "readwrite");
	var store = tx.objectStore("MonsterSkills");
	var i, j;
	var len = _database.mskilltype.length;
	var successCount = 0;
	var errorCount = 0;
	var lastIndex, voArray, reqPut;
	var report = function () {
		alert("Migration of the monster skill data has completed.\n" + successCount + " success(es), " + errorCount + " error(s)");
	}
	// prescan
	for (i = 0; i < len; i++) {
		if (_database.mskilltype[i]) {
			lastIndex = i;
		}
	}
	// migrate
	for (i = 0; i < len; i++) {
		if (_database.mskilltype[i]) {
			voArray = HVStat.migration.createMonsterSkillVOsFromOldDB(_database, i);
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

HVStat.migration.migrateDatabase = function () {
	loadDatabaseObject();
	HVStat.migration.migrateMonsterScanResults();
	HVStat.migration.migrateMonsterSkills();
};

HVStat.migration.deleteOldDatabase = function () {
	localStorage.removeItem("HVMonsterDatabase");
	alert("Your old monster database has been deleted.");
};

//------------------------------------
// legacy codes
//------------------------------------

/* ========== GLOBAL VARIABLES ========== */
HV_EQUIP = "inventoryAlert";
HV_DBASE = "HVMonsterDatabase";
HOURLY = 0;
ARENA = 1;
GRINDFEST = 2;
ITEM_WORLD = 3;
_database = null;
_equips = 0;
_lastEquipName = "";
_artifacts = 0;
_lastArtName = "";
_tokenDrops = [0, 0, 0];

function showMonsterHealth() {
	for (var i = 0; i < hv.battle.elementCache.monsters.length; i++) {
		HVStat.monsters[i].renderHealth();
	}
}
function showMonsterStats() {
	for (var i = 0; i < hv.battle.elementCache.monsters.length; i++) {
		HVStat.monsters[i].renderStats();
	}
}

function showBattleEndStats() {
	var battleLog = document.getElementById("togpane_log");
	battleLog.innerHTML = "<div class='ui-state-default ui-corner-bottom' style='padding:10px;margin-bottom:10px;text-align:left'>" + getBattleEndStatsHtml() + "</div>" + battleLog.innerHTML;
}

HVStat.warnHealthStatus = function () {
	var hpAlertAlreadyShown = !!localStorage.getItem(HVStat.key_hpAlertAlreadyShown);
	var mpAlertAlreadyShown = !!localStorage.getItem(HVStat.key_mpAlertAlreadyShown);
	var spAlertAlreadyShown = !!localStorage.getItem(HVStat.key_spAlertAlreadyShown);
	var ocAlertAlreadyShown = !!localStorage.getItem(HVStat.key_ocAlertAlreadyShown);
	var hpWarningLevel = Number(hvStat.settings.warnAlertLevel);
	var mpWarningLevel = Number(hvStat.settings.warnAlertLevelMP);
	var spWarningLevel = Number(hvStat.settings.warnAlertLevelSP);
	var hpWarningResumeLevel = Math.min(hpWarningLevel + 10, 100);
	var mpWarningResumeLevel = Math.min(mpWarningLevel + 10, 100);
	var spWarningResumeLevel = Math.min(spWarningLevel + 10, 100);
	if (!hv.battle.round.finished) {
		if (hvStat.settings.isShowPopup) {
			if (hv.character.healthPercent <= hpWarningLevel && (!hpAlertAlreadyShown || hvStat.settings.isNagHP)) {
				alert("Your health is dangerously low!");
				hpAlertAlreadyShown = true;
				localStorage.setItem(HVStat.key_hpAlertAlreadyShown, "true");
			}
			if (hv.character.magicPercent <= mpWarningLevel && (!mpAlertAlreadyShown || hvStat.settings.isNagMP)) {
				alert("Your mana is dangerously low!");
				mpAlertAlreadyShown = true;
				localStorage.setItem(HVStat.key_mpAlertAlreadyShown, "true");
			}
			if (hv.character.spiritPercent <= spWarningLevel && (!spAlertAlreadyShown || hvStat.settings.isNagSP)) {
				alert("Your spirit is dangerously low!");
				spAlertAlreadyShown = true;
				localStorage.setItem(HVStat.key_spAlertAlreadyShown, "true");
			}
		}
		if (hvStat.settings.isAlertOverchargeFull && hv.character.overchargeRate >= 1.0 && !ocAlertAlreadyShown) {
			alert("Your overcharge is full.");
			ocAlertAlreadyShown = true;
			localStorage.setItem(HVStat.key_ocAlertAlreadyShown, "true");
		}
	}
	if (hv.character.healthPercent >= hpWarningResumeLevel) {
		localStorage.removeItem(HVStat.key_hpAlertAlreadyShown);
	}
	if (hv.character.magicPercent >= mpWarningResumeLevel) {
		localStorage.removeItem(HVStat.key_mpAlertAlreadyShown);
	}
	if (hv.character.spiritPercent >= spWarningResumeLevel) {
		localStorage.removeItem(HVStat.key_spAlertAlreadyShown);
	}
	if (hv.character.overchargeRate < 1.0) {
		localStorage.removeItem(HVStat.key_ocAlertAlreadyShown);
	}
}

HVStat.resetHealthWarningStates = function () {
	localStorage.removeItem(HVStat.key_hpAlertAlreadyShown);
	localStorage.removeItem(HVStat.key_mpAlertAlreadyShown);
	localStorage.removeItem(HVStat.key_spAlertAlreadyShown);
	localStorage.removeItem(HVStat.key_ocAlertAlreadyShown);
}

function collectCurrentProfsData() {
	var proficiencyTable = document.getElementById("leftpane").children[1].querySelectorAll("div.fd12");
	var prof = hvStat.characterStatus.proficiencies;
	prof.oneHanded = Number(util.innerText(proficiencyTable[2]));
	prof.twoHanded = Number(util.innerText(proficiencyTable[4]));
	prof.dualWielding = Number(util.innerText(proficiencyTable[6]));
	prof.staff = Number(util.innerText(proficiencyTable[8]));
	prof.clothArmor = Number(util.innerText(proficiencyTable[10]));
	prof.lightArmor = Number(util.innerText(proficiencyTable[12]));
	prof.heavyArmor = Number(util.innerText(proficiencyTable[14]));
	prof.elemental = Number(util.innerText(proficiencyTable[17]));
	prof.divine = Number(util.innerText(proficiencyTable[19]));
	prof.forbidden = Number(util.innerText(proficiencyTable[21]));
	prof.spiritual = Number(util.innerText(proficiencyTable[23]));
	prof.deprecating = Number(util.innerText(proficiencyTable[25]));
	prof.supportive = Number(util.innerText(proficiencyTable[27]));
	hvStat.characterStatus.areProficienciesCaptured = true;
	hvStat.storage.characterStatus.save();
}
function inventoryWarning() {
	var d = 4;
	var rectObject = document.querySelector("div.stuffbox").getBoundingClientRect();
	var c = rectObject.width - 85 - 4;
	var div = document.createElement("div");
	div.setAttribute("class", "ui-state-error ui-corner-all");
	div.style.cssText = "position:absolute; top:" + d + "px; left: " + c + "px; z-index:1074; cursor:pointer";
	div.innerHTML = '<span style="margin:3px" class="ui-icon ui-icon-alert" title="Inventory Limit Exceeded."/>';
	document.body.insertBefore(div, null);
	div.addEventListener("click", function (event) {
		if (confirm("Reached equipment inventory limit (1000). Clear warning?")) {
			deleteFromStorage(HV_EQUIP);
		}
	});
}
function collectRoundInfo() {
	HVStat.idbAccessQueue.add(function () {
		HVStat.transaction = HVStat.idb.transaction(["MonsterScanResults", "MonsterSkills"], "readwrite");
	});

	var meleeHitCount = 0;
	var counterHitCount = 0;
	var healedPoints = 0;
	var b = false;
	// create monster objects
	for (var i = 0; i < hv.battle.elementCache.monsters.length; i++) {
		HVStat.monsters[i] = new HVStat.Monster(i);
		if (hvStat.roundInfo.monsters[i]) {
 			HVStat.monsters[i].setFromValueObject(hvStat.roundInfo.monsters[i]);
 		}
	}
	var monsterIndex = 0;
	var turnLog = new HVStat.TurnLog();
	var joinedLogStringOfCurrentTurn = turnLog.texts.join("\n");

	for (var turnLogIndex = 0; turnLogIndex < turnLog.texts.length; turnLogIndex++) {
		var reResult;
		var logText = turnLog.texts[turnLogIndex];
		var logHTML = turnLog.innerHTMLs[turnLogIndex];
		var logHTMLOfPreviousRow = turnLog.innerHTMLs[turnLogIndex - 1];
		if (turnLog.turn === 0) {
			if (logHTML.match(/HP=/)) {
				HVStat.monsters[monsterIndex].fetchStartingLog(logHTML);
				if (hvStat.settings.showMonsterInfoFromDB) {
					HVStat.loadingMonsterInfoFromDB = true;
					(function (monsterIndex) {
						HVStat.idbAccessQueue.add(function () {
							HVStat.monsters[monsterIndex].getFromDB(HVStat.transaction, RoundSave);
						});
					})(monsterIndex);
				}
				if (hvStat.settings.isTrackItems) {
					hvStat.roundInfo.dropChances++;
				}
				monsterIndex++;
			} else if (logHTML.match(/\(Round/)) {
				var f = logHTML.match(/\(round.*?\)/i)[0].replace("(", "").replace(")", "");
				var m = f.split(" ");
				hvStat.roundInfo.currRound = parseInt(m[1]);
				if (m.length > 2) {
					hvStat.roundInfo.maxRound = parseInt(m[3]);
				}
			}
			if (hvStat.settings.isShowRoundReminder &&
					(hvStat.roundInfo.maxRound >= hvStat.settings.reminderMinRounds) &&
					(hvStat.roundInfo.currRound === hvStat.roundInfo.maxRound - hvStat.settings.reminderBeforeEnd) &&
					!b) {
				if (hvStat.settings.reminderBeforeEnd === 0) {
					alert("This is final round");
				} else {
					alert("The final round is approaching.");
				}
				b = true;
			}
			if (logHTML.match(/random encounter/)) {
				hvStat.roundInfo.battleType = HOURLY;
			} else if (logHTML.match(/arena challenge/)) {
				hvStat.roundInfo.battleType = ARENA;
				hvStat.roundInfo.arenaNum = parseInt(logHTML.match(/challenge #\d+?\s/i)[0].replace("challenge #", ""));
			} else if (logHTML.match(/GrindFest/)) {
				hvStat.roundInfo.battleType = GRINDFEST;
			} else if (logHTML.match(/Item World/)) {
				hvStat.roundInfo.battleType = ITEM_WORLD;
			}
			RoundSave();
		}
		if (hvStat.settings.isAlertGem && logHTML.match(/drops a (.*) Gem/)) {
			HVStat.enqueueAlert("You picked up a " + RegExp.$1 + " Gem.");
		}
		if (hvStat.settings.isWarnAbsorbTrigger && /The spell is absorbed/.test(logHTML)) {
			HVStat.enqueueAlert("Absorbing Ward has triggered.");
		}
		if (hvStat.settings.isWarnSparkTrigger && logHTML.match(/spark of life.*defeat/ig)) {
			HVStat.enqueueAlert("Spark of Life has triggered!!");
		}
		if (hvStat.settings.isWarnSparkExpire && logHTML.match(/spark of life.*expired/ig)) {
			HVStat.enqueueAlert("Spark of Life has expired!!");
		}
		if (hvStat.settings.alertWhenChannelingIsGained && logText.indexOf("You gain the effect Channeling") >= 0) {
			HVStat.enqueueAlert("You gained the effect Channeling.");
		}
		if ((hvStat.settings.isShowSidebarProfs || hvStat.settings.isTrackStats) && logHTML.match(/0.0(\d+) points of (.*?) proficiency/ig)) {
			var p = (RegExp.$1) / 100;
			var r = RegExp.$2;
			if (r.match(/one-handed weapon/)) {
				hvStat.characterStatus.proficiencies.oneHanded += p;
				hvStat.roundInfo.weapProfGain[0] += p;
			} else if (r.match(/two-handed weapon/)) {
				hvStat.characterStatus.proficiencies.twoHanded += p;
				hvStat.roundInfo.weapProfGain[1] += p;
			} else if (r.match(/dual wielding/)) {
				hvStat.characterStatus.proficiencies.dualWielding += p;
				hvStat.roundInfo.weapProfGain[2] += p;
			} else if (r.match(/staff/)) {
				hvStat.characterStatus.proficiencies.staff += p;
				hvStat.roundInfo.weapProfGain[3] += p;
			} else if (r.match(/cloth armor/)) {
				hvStat.characterStatus.proficiencies.clothArmor += p;
				hvStat.roundInfo.armorProfGain[0] += p;
			} else if (r.match(/light armor/)) {
				hvStat.characterStatus.proficiencies.lightArmor += p;
				hvStat.roundInfo.armorProfGain[1] += p;
			} else if (r.match(/heavy armor/)) {
				hvStat.characterStatus.proficiencies.heavyArmor += p;
				hvStat.roundInfo.armorProfGain[2] += p;
			} else if (r.match(/elemental magic/)) {
				hvStat.characterStatus.proficiencies.elemental += p;
				hvStat.roundInfo.elemGain += p;
			} else if (r.match(/divine magic/)) {
				hvStat.characterStatus.proficiencies.divine += p;
				hvStat.characterStatus.proficiencies.spiritual = (hvStat.characterStatus.proficiencies.divine + hvStat.characterStatus.proficiencies.forbidden) / 2;
				hvStat.roundInfo.divineGain += p;
			} else if (r.match(/forbidden magic/)) {
				hvStat.characterStatus.proficiencies.forbidden += p;
				hvStat.characterStatus.proficiencies.spiritual = (hvStat.characterStatus.proficiencies.divine + hvStat.characterStatus.proficiencies.forbidden) / 2;
				hvStat.roundInfo.forbidGain += p;
			} else if (r.match(/deprecating magic/)) {
				hvStat.characterStatus.proficiencies.deprecating += p;
				hvStat.roundInfo.depGain += p;
			} else if (r.match(/supportive magic/)) {
				hvStat.characterStatus.proficiencies.supportive += p;
				hvStat.roundInfo.supportGain += p;
			}
			hvStat.storage.characterStatus.save();
		}
		if (hvStat.settings.isRememberScan) {
			if (logHTML.indexOf("Scanning") >= 0) {
				(function () {
					var scanningMonsterName;
					var scanningMonsterIndex = -1;
					var r = /Scanning ([^\.]{0,30})\.{3,}/.exec(logText);
					var i, len, monster;
					if (r && r.length >= 2) {
						scanningMonsterName = r[1];
						len = HVStat.monsters.length;
						for (i = 0; i < len; i++) {
							monster = HVStat.monsters[i];
							if (monster.name === scanningMonsterName) {
								HVStat.loadingMonsterInfoFromDB = true;
								(function (monster, logText) {
									HVStat.idbAccessQueue.add(function () {
										monster.fetchScanningLog(logText, HVStat.transaction);
										RoundSave();
									});
								})(monster, logText);
							}
						}
					}
				})();
			}
		}
		if (hvStat.settings.isTrackStats || hvStat.settings.isShowEndStats) {
			var o = 0;
			if (logHTML.match(/\s(\d+)\s/)) {
				o = parseInt(RegExp.$1);
			}
			if (logHTML.match(/has been defeated/i)) {
				hvStat.roundInfo.kills++;
			} else if (logHTML.match(/bleeding wound hits/i)) {
				hvStat.roundInfo.dDealt[2] += o;
			} else if (logHTML.match(/(you hit)|(you crit)/i)) {
				hvStat.roundInfo.aAttempts++;
				meleeHitCount++;
				hvStat.roundInfo.aHits[logHTML.match(/you crit/i) ? 1 : 0]++;
				hvStat.roundInfo.dDealt[logHTML.match(/you crit/i) ? 1 : 0] += o;
			} else if (logHTML.match(/your offhand (hits|crits)/i)) {
				hvStat.roundInfo.aOffhands[logHTML.match(/offhand crit/i) ? 2 : 0]++;
				hvStat.roundInfo.aOffhands[logHTML.match(/offhand crit/i) ? 3 : 1] += o;
			} else if (logHTML.match(/you counter/i)) {
				hvStat.roundInfo.aCounters[0]++;
				hvStat.roundInfo.aCounters[1] += o;
				counterHitCount++;
				hvStat.roundInfo.dDealt[0] += o;
			} else if (logHTML.match(/hits|blasts|explodes/i) && !logHTML.match(/hits you /i)) {
				if (logHTML.match(/spreading poison hits /i) && !logHTML.match(/(hits you |crits you )/i)) {
					hvStat.roundInfo.effectPoison[1] += o;
					hvStat.roundInfo.effectPoison[0]++;
				} else {
					if (logHTML.match(/(searing skin|freezing limbs|deep burns|turbulent air|burning soul|breached defense|blunted attack) (hits|blasts|explodes)/i) && !logHTML.match(/(hits you |crits you )/i)) {
						hvStat.roundInfo.elemEffects[1]++;
						hvStat.roundInfo.elemEffects[2] += o;
					} else if (logHTML.match(/(fireball|inferno|flare|meteor|nova|flames of loki|icestrike|snowstorm|freeze|blizzard|cryostasis|fimbulvetr|lighting|thunderstorm|ball lighting|chain lighting|shockblast|wrath of thor|windblast|cyclone|gale|hurricane|downburst|storms of njord) (hits|blasts|explodes)/i) && !logHTML.match(/(hits you |crits you )/i)) {
						hvStat.roundInfo.dDealtSp[logHTML.match(/blasts/i) ? 1 : 0] += o;
						hvStat.roundInfo.sHits[logHTML.match(/blasts/i) ? 1 : 0]++;
						hvStat.roundInfo.elemSpells[1]++;
						hvStat.roundInfo.elemSpells[2] += o;
					} else if (logHTML.match(/(condemn|purge|smite|banish) (hits|blasts|explodes)/i) && !logHTML.match(/(hits you |crits you )/i)) {
						hvStat.roundInfo.dDealtSp[logHTML.match(/blasts/i) ? 1 : 0] += o;
						hvStat.roundInfo.sHits[logHTML.match(/blasts/i) ? 1 : 0]++;
						hvStat.roundInfo.divineSpells[1]++;
						hvStat.roundInfo.divineSpells[2] += o
					} else if (logHTML.match(/(soul reaper|soul harvest|soul fire|soul burst|corruption|pestilence|disintegrate|ragnarok) (hits|blasts|explodes)/i) && !logHTML.match(/(hits you |crits you )/i)) {
						hvStat.roundInfo.dDealtSp[logHTML.match(/blasts/i) ? 1 : 0] += o;
						hvStat.roundInfo.sHits[logHTML.match(/blasts/i) ? 1 : 0]++;
						hvStat.roundInfo.forbidSpells[1]++;
						hvStat.roundInfo.forbidSpells[2] += o
					}
				}
			} else if (logHTML.match(/(hits you )|(crits you )/i)) {
				hvStat.roundInfo.mAttempts++;
				hvStat.roundInfo.mHits[logHTML.match(/crits/i) ? 1 : 0]++;
				hvStat.roundInfo.dTaken[logHTML.match(/crits/i) ? 1 : 0] += o;
				if (logHTMLOfPreviousRow.match(/ uses | casts /i)) {
					hvStat.roundInfo.pskills[1]++;
					hvStat.roundInfo.pskills[2] += o;
					if (logHTMLOfPreviousRow.match(/ casts /i)) {
						hvStat.roundInfo.pskills[5]++;
						hvStat.roundInfo.pskills[6] += o;
					} else {
						hvStat.roundInfo.pskills[3]++;
						hvStat.roundInfo.pskills[4] += o;
					}
					if (hvStat.settings.isRememberSkillsTypes) {
						var j = HVStat.monsters.length;
						while (j--) {
							reResult = /([^\.]{1,30}) (?:uses|casts) /.exec(logHTMLOfPreviousRow);
							if (reResult && reResult.length >= 2 && reResult[1] === HVStat.monsters[j].name && reResult[1].indexOf("Unnamed ") !== 0) {
								(function (j, logHTMLOfPreviousRow, logHTML) {
									HVStat.idbAccessQueue.add(function () {
										HVStat.monsters[j].fetchSkillLog(logHTMLOfPreviousRow, logHTML, HVStat.transaction);	// *TRANSACTION*
									});
								})(j, logHTMLOfPreviousRow, logHTML);
								break;
							}
						}
					}
				}
			} else if (logHTML.match(/you (dodge|evade|block|parry|resist)|(misses.*?against you)/i)) {
				hvStat.roundInfo.mAttempts++;
				if (logHTML.match(/dodge|(misses.*?against you)/)) {
					hvStat.roundInfo.pDodges++;
				} else if (logHTML.match(/evade/)) {
					hvStat.roundInfo.pEvades++;
				} else if (logHTML.match(/block/)) {
					hvStat.roundInfo.pBlocks++;
				} else if (logHTML.match(/parry/)) {
					hvStat.roundInfo.pParries++;
				} else if (logHTML.match(/resist/)) {
					hvStat.roundInfo.pResists++;
				}
			} else if (logHTML.match(/casts?/)) {
				if (logHTML.match(/casts/)) {
					hvStat.roundInfo.mAttempts++;
					hvStat.roundInfo.mSpells++;
				} else if (logHTML.match(/you cast/i)) {
					if (logHTML.match(/(poison|slow|weaken|sleep|confuse|imperil|blind|silence|nerf|x.nerf|magnet|lifestream)/i)) {
						hvStat.roundInfo.depSpells[0]++;
						hvStat.roundInfo.sAttempts++
					} else if (logHTML.match(/(condemn|purge|smite|banish)/i)) {
						hvStat.roundInfo.divineSpells[0]++;
						hvStat.roundInfo.sAttempts++;
						if (joinedLogStringOfCurrentTurn.match(/Your spell misses its mark/i)) {
							hvStat.roundInfo.divineSpells[3] += joinedLogStringOfCurrentTurn.match(/Your spell misses its mark/ig).length;
						}
					} else if (logHTML.match(/(soul reaper|soul harvest|soul fire|soul burst|corruption|pestilence|disintegrate|ragnarok)/i)) {
						hvStat.roundInfo.forbidSpells[0]++;
						hvStat.roundInfo.sAttempts++
						if (joinedLogStringOfCurrentTurn.match(/Your spell misses its mark/i)) {
							hvStat.roundInfo.forbidSpells[3] += joinedLogStringOfCurrentTurn.match(/Your spell misses its mark/ig).length;
						}
					} else if (logHTML.match(/(fireball|inferno|flare|meteor|nova|flames of loki|icestrike|snowstorm|freeze|blizzard|cryostasis|fimbulvetr|lighting|thunderstorm|ball lighting|chain lighting|shockblast|wrath of thor|windblast|cyclone|gale|hurricane|downburst|storms of njord)/i)) {
						hvStat.roundInfo.elemSpells[0]++;
						hvStat.roundInfo.sAttempts++;
						if (joinedLogStringOfCurrentTurn.match(/Your spell misses its mark/i)) {
							hvStat.roundInfo.elemSpells[3] += joinedLogStringOfCurrentTurn.match(/Your spell misses its mark/ig).length;
						}
					} else if (logHTML.match(/(spark of life|absorb|protection|shadow veil|haste|flame spikes|frost spikes|lightning spikes|storm spikes|arcane focus|heartseeker)/i)) {
						hvStat.roundInfo.supportSpells++
						if (logHTML.match(/absorb/i)) {
							hvStat.roundInfo.absArry[0]++
						}
					} else if (logHTML.match(/(cure|regen)/i)) {
						hvStat.roundInfo.curativeSpells++
						if (logHTML.match(/cure/i)) {
							if (joinedLogStringOfCurrentTurn.match(/You are healed for (\d+) Health Points/)) {
								healedPoints = parseFloat(RegExp.$1);
							}
							hvStat.roundInfo.cureTotals[logHTML.match(/cure\./i) ? 0 : logHTML.match(/cure ii\./i) ? 1 : 2] += healedPoints;
							hvStat.roundInfo.cureCounts[logHTML.match(/cure\./i) ? 0 : logHTML.match(/cure ii\./i) ? 1 : 2]++
						}
					}
				}
			} else if (logHTML.match(/The spell is absorbed. You gain (\d+) Magic Points/)) {
				hvStat.roundInfo.absArry[1]++;
				hvStat.roundInfo.absArry[2] += parseInt(RegExp.$1);
			} else if (logHTML.match(/Your attack misses its mark/)) {
				hvStat.roundInfo.aAttempts++;
			} else if (logHTML.match(/Your spell misses its mark/)) {
				hvStat.roundInfo.sResists++;
			} else if (logHTML.match(/gains? the effect/i)) {
				if (logHTML.match(/gain the effect Overwhelming Strikes/i)) {
					hvStat.roundInfo.overStrikes++;
				} else if (logHTML.match(/gains the effect Coalesced Mana/i)) {
					hvStat.roundInfo.coalesce++;
				} else if (logHTML.match(/gains the effect Ether Theft/i)) {
					hvStat.roundInfo.eTheft++;
				} else if (logHTML.match(/gain the effect Channeling/i)) {
					hvStat.roundInfo.channel++;
				} else {
					if (logHTML.match(/gains the effect (searing skin|freezing limbs|deep burns|turbulent air|breached defense|blunted attack|burning soul|rippened soul)/i)) {
						hvStat.roundInfo.elemEffects[0]++;
					} else if (logHTML.match(/gains the effect (spreading poison|slowed|weakened|sleep|confused|imperiled|blinded|silenced|nerfed|magically snared|lifestream)/i)) {
						hvStat.roundInfo.depSpells[1]++;
					} else if (logHTML.match(/gains the effect stunned/i)) {
						hvStat.roundInfo.weaponprocs[0]++;
						if (logHTMLOfPreviousRow.match(/You counter/i)) {
							hvStat.roundInfo.weaponprocs[0]--;
							hvStat.roundInfo.weaponprocs[7]++
						}
					} else if (logHTML.match(/gains the effect penetrated armor/i)) {
						hvStat.roundInfo.weaponprocs[1]++;
					} else if (logHTML.match(/gains the effect bleeding wound/i)) {
						hvStat.roundInfo.weaponprocs[2]++;
					} else if (logHTML.match(/gains the effect ether theft/i)) {
						hvStat.roundInfo.weaponprocs[3]++;
					}
				}
			} else if (logHTML.match(/uses?/i)) {
				if (logHTML.match(/uses/i)) {
					hvStat.roundInfo.pskills[0]++;
				} else if (logHTML.match(/use Mystic Gem/i)) {
					hvStat.roundInfo.channel--;
				}
			} else if (logHTML.match(/you drain/i)) {
				if (logHTML.match(/you drain \d+(\.)?\d? hp from/i)) {
					hvStat.roundInfo.weaponprocs[4]++;
				} else if (logHTML.match(/you drain \d+(\.)?\d? mp from/i)) {
					hvStat.roundInfo.weaponprocs[5]++;
				} else if (logHTML.match(/you drain \d+(\.)?\d? sp from/i)) {
					hvStat.roundInfo.weaponprocs[6]++;
				}
			}
		}
		var l = /\[.*?\]/i;
		var n;
		var t = 1;
		if (logHTML.match(/dropped.*?color:.*?red.*?\[.*?\]/ig)) {
			_equips++;
			var q = logHTML.match(l)[0];
			_lastEquipName = q;
			if (hvStat.settings.isTrackItems) {
				hvStat.drops.eqDrop++;
				hvStat.drops.eqArray.push(q);
				hvStat.drops.eqDropbyBT[hvStat.roundInfo.battleType]++;
			}
		} else if (logHTML.match(/dropped.*?color:.*?blue.*?\[.*?\]/ig)) {
			_artifacts++;
			itemToAdd = logHTML.match(l)[0];
			_lastArtName = itemToAdd;
			if (hvStat.settings.isTrackItems) {
				hvStat.drops.artDrop++;
				hvStat.drops.artDropbyBT[hvStat.roundInfo.battleType]++;
				n = true;
				var j = hvStat.drops.artArry.length;
				while (j--) {
					if (itemToAdd === hvStat.drops.artArry[j]) {
						hvStat.drops.artQtyArry[j]++;
						n = false;
						break;
					}
				}
				if (n) {
					hvStat.drops.artQtyArry.push(1);
					hvStat.drops.artArry.push(itemToAdd);
				}
			}
		} else if (hvStat.settings.isTrackItems && (logHTML.match(/dropped.*?color:.*?green.*?\[.*?\]/ig) || logHTML.match(/dropped.*?token/ig))) {
			itemToAdd = logHTML.match(l)[0];
			if (itemToAdd.match(/(\d){0,2}.?x?.?Crystal of /ig)) {
				t = parseInt("0" + RegExp.$1, 10);
				if (t < 1) {
					t = 1;
				}
				itemToAdd = itemToAdd.replace(/(\d){1,2}.?x?.?/, "");
				hvStat.drops.crysDropbyBT[hvStat.roundInfo.battleType]++;
			}
			var j = hvStat.drops.itemArry.length;
			while (j--) {
				if (itemToAdd === hvStat.drops.itemArry[j]) {
					hvStat.drops.itemQtyArry[j] += t;
					hvStat.drops.itemDrop++;
					hvStat.drops.itemDropbyBT[hvStat.roundInfo.battleType]++;
					break;
				}
			}
		} else if (hvStat.settings.isTrackItems && logHTML.match(/dropped.*?color:.*?\#461B7E.*?\[.*?\]/ig)) {
			hvStat.drops.dropChances--;
			hvStat.drops.dropChancesbyBT[hvStat.roundInfo.battleType]--;
		}
		if (logHTML.match(/(clear bonus).*?color:.*?red.*?\[.*?\]/ig)) {
			_equips++;
			var s = logHTML.match(l)[0];
			_lastEquipName = s;
			if (hvStat.settings.isTrackRewards) {
				hvStat.arenaRewards.eqRwrd++;
				hvStat.arenaRewards.eqRwrdArry.push(s);
			}
		} else if (logHTML.match(/(clear bonus).*?color:.*?blue.*?\[.*?\]/ig)) {
			_artifacts++;
			itemToAdd = logHTML.match(l)[0];
			_lastArtName = itemToAdd;
			if (hvStat.settings.isTrackRewards) {
				hvStat.arenaRewards.artRwrd++;
				n = true;
				var j = hvStat.arenaRewards.artRwrdArry.length;
				while (j--) {
					if (itemToAdd === hvStat.arenaRewards.artRwrdArry[j]) {
						hvStat.arenaRewards.artRwrdQtyArry[j]++;
						n = false;
						break;
					}
				}
				if (n) {
					hvStat.arenaRewards.artRwrdQtyArry.push(1);
					hvStat.arenaRewards.artRwrdArry.push(itemToAdd);
				}
			}
		} else if (hvStat.settings.isTrackRewards && (logHTML.match(/(clear bonus).*?color:.*?green.*?\[.*?\]/ig) || logHTML.match(/(clear bonus).*?token/ig))) {
			hvStat.arenaRewards.itemsRwrd++;
			itemToAdd = logHTML.match(l)[0];
			if (itemToAdd.match(/(\d)x Crystal/ig)) {
				t = parseInt("0" + RegExp.$1, 10);
				itemToAdd = itemToAdd.replace(/\dx /, "");
			}
			n = true;
			var j = hvStat.arenaRewards.itemRwrdArry.length;
			while (j--) {
				if (itemToAdd === hvStat.arenaRewards.itemRwrdArry[j]) {
					hvStat.arenaRewards.itemRwrdQtyArry[j] += t;
					n = false;
					break;
				}
			}
			if (n) {
				hvStat.arenaRewards.itemRwrdQtyArry.push(1);
				hvStat.arenaRewards.itemRwrdArry.push(itemToAdd);
			}
		} else if (hvStat.settings.isTrackRewards && (logHTML.match(/(token bonus).*?\[.*?\]/ig))) {
			if (logHTML.match(/token of blood/ig)) {
				_tokenDrops[0]++;
			} else if (logHTML.match(/token of healing/ig)) {
				_tokenDrops[1]++;
			} else if (logHTML.match(/chaos token/ig)) {
				_tokenDrops[2]++;
			}
		}
		if (logHTML.match(/reached equipment inventory limit/i)) {
			localStorage.setItem(HV_EQUIP, "true");
		}
	}
	if (meleeHitCount > 1) {
		hvStat.roundInfo.aDomino[0]++;
		hvStat.roundInfo.aDomino[1] += meleeHitCount;
		hvStat.roundInfo.aDomino[meleeHitCount]++
	}
	if (counterHitCount > 1) {
		hvStat.roundInfo.aCounters[counterHitCount]++;
	}
	if (hvStat.roundInfo.lastTurn < turnLog.lastTurn) {
		hvStat.roundInfo.lastTurn = turnLog.lastTurn;
	}
	RoundSave();
}

function RoundSave() {
	hvStat.roundInfo.monsters = [];
	for (var i = 0; i < HVStat.monsters.length; i++) {
		hvStat.roundInfo.monsters[i] = HVStat.monsters[i].valueObject;
	}
	hvStat.storage.roundInfo.save();
}

function saveStats() {
	var d = 0;
	var c = 0;
	var elements = document.querySelectorAll("#togpane_log td:last-child");
	var i, html;
	for (i = 0; i < elements.length; i++) {
		html = elements[i].innerHTML;
		if (html.match(/you gain.*?credit/i)) {
			c = parseInt(html.split(" ")[2]);
		} else if (html.match(/you gain.*?exp/i)) {
			d = parseFloat(html.split(" ")[2]);
		}
	}
	var b = new Date();
	var a = b.getTime();
	if (hvStat.overview.startTime === 0) {
		hvStat.overview.startTime = a;
	}
	if (hvStat.roundInfo.battleType === HOURLY) {
		hvStat.overview.lastHourlyTime = a;
	}
	hvStat.overview.exp += d;
	hvStat.overview.credits += c;
	hvStat.overview.expbyBT[hvStat.roundInfo.battleType] += d;
	hvStat.overview.creditsbyBT[hvStat.roundInfo.battleType] += c;
	if (_equips > 0) {
		hvStat.overview.lastEquipTime = a;
		hvStat.overview.lastEquipName = _lastEquipName;
		hvStat.overview.equips += _equips;
	}
	if (_artifacts > 0) {
		hvStat.overview.lastArtTime = a;
		hvStat.overview.lastArtName = _lastArtName;
		hvStat.overview.artifacts += _artifacts;
	}
	if (d > 0) {
		hvStat.overview.roundArray[hvStat.roundInfo.battleType]++;
		hvStat.drops.dropChancesbyBT[hvStat.roundInfo.battleType] += hvStat.roundInfo.dropChances;
		hvStat.drops.dropChances += hvStat.roundInfo.dropChances;
	}
	if (hvStat.settings.isTrackStats) {
		hvStat.stats.kills += hvStat.roundInfo.kills;
		hvStat.stats.aAttempts += hvStat.roundInfo.aAttempts;
		hvStat.stats.aHits[0] += hvStat.roundInfo.aHits[0];
		hvStat.stats.aHits[1] += hvStat.roundInfo.aHits[1];
		hvStat.stats.aOffhands[0] += hvStat.roundInfo.aOffhands[0];
		hvStat.stats.aOffhands[1] += hvStat.roundInfo.aOffhands[1];
		hvStat.stats.aOffhands[2] += hvStat.roundInfo.aOffhands[2];
		hvStat.stats.aOffhands[3] += hvStat.roundInfo.aOffhands[3];
		hvStat.stats.sAttempts += hvStat.roundInfo.sAttempts;
		hvStat.stats.sHits[0] += hvStat.roundInfo.sHits[0];
		hvStat.stats.sHits[1] += hvStat.roundInfo.sHits[1];
		hvStat.stats.mAttempts += hvStat.roundInfo.mAttempts;
		hvStat.stats.mHits[0] += hvStat.roundInfo.mHits[0];
		hvStat.stats.mHits[1] += hvStat.roundInfo.mHits[1];
		hvStat.stats.pDodges += hvStat.roundInfo.pDodges;
		hvStat.stats.pEvades += hvStat.roundInfo.pEvades;
		hvStat.stats.pParries += hvStat.roundInfo.pParries;
		hvStat.stats.pBlocks += hvStat.roundInfo.pBlocks;
		hvStat.stats.dDealt[0] += hvStat.roundInfo.dDealt[0];
		hvStat.stats.dDealt[1] += hvStat.roundInfo.dDealt[1];
		hvStat.stats.dDealt[2] += hvStat.roundInfo.dDealt[2];
		hvStat.stats.dTaken[0] += hvStat.roundInfo.dTaken[0];
		hvStat.stats.dTaken[1] += hvStat.roundInfo.dTaken[1];
		hvStat.stats.dDealtSp[0] += hvStat.roundInfo.dDealtSp[0];
		hvStat.stats.dDealtSp[1] += hvStat.roundInfo.dDealtSp[1];
		hvStat.stats.rounds += 1;
		hvStat.stats.absArry[0] += hvStat.roundInfo.absArry[0];
		hvStat.stats.absArry[1] += hvStat.roundInfo.absArry[1];
		hvStat.stats.absArry[2] += hvStat.roundInfo.absArry[2];
		hvStat.stats.coalesce += hvStat.roundInfo.coalesce;
		hvStat.stats.eTheft += hvStat.roundInfo.eTheft;
		hvStat.stats.channel += hvStat.roundInfo.channel;
		hvStat.stats.aDomino[0] += hvStat.roundInfo.aDomino[0];
		hvStat.stats.aDomino[1] += hvStat.roundInfo.aDomino[1];
		hvStat.stats.aDomino[2] += hvStat.roundInfo.aDomino[2];
		hvStat.stats.aDomino[3] += hvStat.roundInfo.aDomino[3];
		hvStat.stats.aDomino[4] += hvStat.roundInfo.aDomino[4];
		hvStat.stats.aDomino[5] += hvStat.roundInfo.aDomino[5];
		hvStat.stats.aDomino[6] += hvStat.roundInfo.aDomino[6];
		hvStat.stats.aDomino[7] += hvStat.roundInfo.aDomino[7];
		hvStat.stats.aDomino[8] += hvStat.roundInfo.aDomino[8];
		hvStat.stats.aDomino[9] += hvStat.roundInfo.aDomino[9];
		hvStat.stats.overStrikes += hvStat.roundInfo.overStrikes;
		hvStat.stats.aCounters[0] += hvStat.roundInfo.aCounters[0];
		hvStat.stats.aCounters[1] += hvStat.roundInfo.aCounters[1];
		hvStat.stats.aCounters[2] += hvStat.roundInfo.aCounters[2];
		hvStat.stats.aCounters[3] += hvStat.roundInfo.aCounters[3];
		hvStat.stats.pResists += hvStat.roundInfo.pResists;
		hvStat.stats.mSpells += hvStat.roundInfo.mSpells;
		hvStat.stats.sResists += hvStat.roundInfo.sResists;
		hvStat.stats.cureTotals[0] += hvStat.roundInfo.cureTotals[0];
		hvStat.stats.cureTotals[1] += hvStat.roundInfo.cureTotals[1];
		hvStat.stats.cureTotals[2] += hvStat.roundInfo.cureTotals[2];
		hvStat.stats.cureCounts[0] += hvStat.roundInfo.cureCounts[0];
		hvStat.stats.cureCounts[1] += hvStat.roundInfo.cureCounts[1];
		hvStat.stats.cureCounts[2] += hvStat.roundInfo.cureCounts[2];
		hvStat.stats.elemEffects[0] += hvStat.roundInfo.elemEffects[0];
		hvStat.stats.elemEffects[1] += hvStat.roundInfo.elemEffects[1];
		hvStat.stats.elemEffects[2] += hvStat.roundInfo.elemEffects[2];
		hvStat.stats.effectPoison[0] += hvStat.roundInfo.effectPoison[0];
		hvStat.stats.effectPoison[1] += hvStat.roundInfo.effectPoison[1];
		hvStat.stats.elemSpells[0] += hvStat.roundInfo.elemSpells[0];
		hvStat.stats.elemSpells[1] += hvStat.roundInfo.elemSpells[1];
		hvStat.stats.elemSpells[2] += hvStat.roundInfo.elemSpells[2];
		hvStat.stats.elemSpells[3] += hvStat.roundInfo.elemSpells[3];
		hvStat.stats.divineSpells[0] += hvStat.roundInfo.divineSpells[0];
		hvStat.stats.divineSpells[1] += hvStat.roundInfo.divineSpells[1];
		hvStat.stats.divineSpells[2] += hvStat.roundInfo.divineSpells[2];
		hvStat.stats.divineSpells[3] += hvStat.roundInfo.divineSpells[3];
		hvStat.stats.forbidSpells[0] += hvStat.roundInfo.forbidSpells[0];
		hvStat.stats.forbidSpells[1] += hvStat.roundInfo.forbidSpells[1];
		hvStat.stats.forbidSpells[2] += hvStat.roundInfo.forbidSpells[2];
		hvStat.stats.forbidSpells[3] += hvStat.roundInfo.forbidSpells[3];
		hvStat.stats.depSpells[0] += hvStat.roundInfo.depSpells[0];
		hvStat.stats.depSpells[1] += hvStat.roundInfo.depSpells[1];
		hvStat.stats.supportSpells += hvStat.roundInfo.supportSpells;
		hvStat.stats.curativeSpells += hvStat.roundInfo.curativeSpells;
		hvStat.stats.elemGain += hvStat.roundInfo.elemGain;
		hvStat.stats.divineGain += hvStat.roundInfo.divineGain;
		hvStat.stats.forbidGain += hvStat.roundInfo.forbidGain;
		hvStat.stats.depGain += hvStat.roundInfo.depGain;
		hvStat.stats.supportGain += hvStat.roundInfo.supportGain;
		hvStat.stats.weapProfGain[0] += hvStat.roundInfo.weapProfGain[0];
		hvStat.stats.weapProfGain[1] += hvStat.roundInfo.weapProfGain[1];
		hvStat.stats.weapProfGain[2] += hvStat.roundInfo.weapProfGain[2];
		hvStat.stats.weapProfGain[3] += hvStat.roundInfo.weapProfGain[3];
		hvStat.stats.armorProfGain[0] += hvStat.roundInfo.armorProfGain[0];
		hvStat.stats.armorProfGain[1] += hvStat.roundInfo.armorProfGain[1];
		hvStat.stats.armorProfGain[2] += hvStat.roundInfo.armorProfGain[2];
		hvStat.stats.weaponprocs[0] += hvStat.roundInfo.weaponprocs[0];
		hvStat.stats.weaponprocs[1] += hvStat.roundInfo.weaponprocs[1];
		hvStat.stats.weaponprocs[2] += hvStat.roundInfo.weaponprocs[2];
		hvStat.stats.weaponprocs[3] += hvStat.roundInfo.weaponprocs[3];
		hvStat.stats.weaponprocs[4] += hvStat.roundInfo.weaponprocs[4];
		hvStat.stats.weaponprocs[5] += hvStat.roundInfo.weaponprocs[5];
		hvStat.stats.weaponprocs[6] += hvStat.roundInfo.weaponprocs[6];
		hvStat.stats.weaponprocs[7] += hvStat.roundInfo.weaponprocs[7];
		hvStat.stats.pskills[0] += hvStat.roundInfo.pskills[0];
		hvStat.stats.pskills[1] += hvStat.roundInfo.pskills[1];
		hvStat.stats.pskills[2] += hvStat.roundInfo.pskills[2];
		hvStat.stats.pskills[3] += hvStat.roundInfo.pskills[3];
		hvStat.stats.pskills[4] += hvStat.roundInfo.pskills[4];
		hvStat.stats.pskills[5] += hvStat.roundInfo.pskills[5];
		hvStat.stats.pskills[6] += hvStat.roundInfo.pskills[6];
		if (hvStat.stats.datestart === 0) hvStat.stats.datestart = (new Date()).getTime();
	}
	hvStat.arenaRewards.tokenDrops[0] += _tokenDrops[0];
	hvStat.arenaRewards.tokenDrops[1] += _tokenDrops[1];
	hvStat.arenaRewards.tokenDrops[2] += _tokenDrops[2];
	hvStat.storage.overview.save();
	hvStat.storage.stats.save();
	hvStat.storage.arenaRewards.save();
	hvStat.storage.drops.save();
}
function getBattleEndStatsHtml() {
	function formatProbability(numerator, denominator, digits) {
		return String(numerator) + "/" + String(denominator)
			+ " (" + String(hvStat.util.percentRatio(numerator, denominator, digits)) + "%)";
	}

	var f = hvStat.roundInfo.sHits[0] + hvStat.roundInfo.sHits[1] + hvStat.roundInfo.depSpells[1] + hvStat.roundInfo.sResists;
	var e = hvStat.roundInfo.sHits[0] + hvStat.roundInfo.sHits[1] + hvStat.roundInfo.depSpells[1];
	var d = hvStat.roundInfo.aHits[0] + hvStat.roundInfo.aHits[1];
	var c = hvStat.roundInfo.sHits[0] + hvStat.roundInfo.sHits[1];
	var b = hvStat.roundInfo.mHits[0] + hvStat.roundInfo.mHits[1];
	var ab = hvStat.roundInfo.aOffhands[0] + hvStat.roundInfo.aOffhands[2];
	var a = "<b>Accuracy</b>: " + formatProbability(d, hvStat.roundInfo.aAttempts, 2) + ", "
		+ "<b>Crits</b>: " + formatProbability(hvStat.roundInfo.aHits[1], d, 2) + ", "
		+ "<b>Offhand</b>: " + formatProbability(ab, d, 2) + ", "
		+ "<b>Domino</b>: " + formatProbability(hvStat.roundInfo.aDomino[0], d, 2) + ", "
		+ "<b>OverStrikes</b>: " + formatProbability(hvStat.roundInfo.overStrikes, d, 2) + ", "
		+ "<b>Coalesce</b>: " + formatProbability(hvStat.roundInfo.coalesce, e, 2) + ", "
		+ "<b>M. Accuracy</b>: " + formatProbability(e, f, 2) + ", "
		+ "<b>Spell Crits</b>: " + formatProbability(hvStat.roundInfo.sHits[1], c, 2) + ", "
		+ "<b>Avg hit dmg</b>: " + hvStat.util.ratio(hvStat.roundInfo.dDealt[0], hvStat.roundInfo.aHits[0]).toFixed(2) + "|" + hvStat.util.ratio(hvStat.roundInfo.dDealtSp[0], hvStat.roundInfo.sHits[0]).toFixed(2) + ", "
		+ "<b>Avg crit dmg</b>: " + hvStat.util.ratio(hvStat.roundInfo.dDealt[1], hvStat.roundInfo.aHits[1]).toFixed(2) + "|" + hvStat.util.ratio(hvStat.roundInfo.dDealtSp[1], hvStat.roundInfo.sHits[1]).toFixed(2) + ", "
		+ "<b>Avg dmg</b>: " + hvStat.util.ratio(hvStat.roundInfo.dDealt[0] + hvStat.roundInfo.dDealt[1], d).toFixed(2) + "|" + hvStat.util.ratio(hvStat.roundInfo.dDealtSp[0] + hvStat.roundInfo.dDealtSp[1], c).toFixed(2)
		+ "<hr style='height:1px;border:0;background-color:#333333;color:#333333' />"
		+ "<b>Hits taken</b>: " + formatProbability(b, hvStat.roundInfo.mAttempts, 2) + ", "
		+ "<b>Missed</b>: " + formatProbability(hvStat.roundInfo.pDodges, hvStat.roundInfo.mAttempts, 2) + ", "
		+ "<b>Evaded</b>: " + formatProbability(hvStat.roundInfo.pEvades, hvStat.roundInfo.mAttempts, 2) + ", "
		+ "<b>Blocked</b>: " + formatProbability(hvStat.roundInfo.pBlocks, hvStat.roundInfo.mAttempts, 2) + ", "
		+ "<b>Parried</b>: " + formatProbability(hvStat.roundInfo.pParries, hvStat.roundInfo.mAttempts, 2) + ", "
		+ "<b>Resisted</b>: " + formatProbability(hvStat.roundInfo.pResists, hvStat.roundInfo.mAttempts, 2) + ", "
		+ "<b>Crits taken</b>: " + formatProbability(hvStat.roundInfo.mHits[1], b, 2) + ", "
		+ "<b>Total dmg taken</b>: " + (hvStat.roundInfo.dTaken[0] + hvStat.roundInfo.dTaken[1]) + ", "
		+ "<b>Avg dmg taken</b>: " + hvStat.util.ratio(hvStat.roundInfo.dTaken[0] + hvStat.roundInfo.dTaken[1], b).toFixed(2);
	if (hvStat.settings.isShowEndProfs && (hvStat.settings.isShowEndProfsMagic || hvStat.settings.isShowEndProfsArmor || hvStat.settings.isShowEndProfsWeapon)) { //isShowEndProfs added by Ilirith
		if (hvStat.settings.isShowEndProfsMagic) {
			a += "<hr style='height:1px;border:0;background-color:#333333;color:#333333' />"
				+ "<b>Curative Spells</b>: " + hvStat.roundInfo.curativeSpells
				+ ", <b>Support Spells</b>: " + hvStat.roundInfo.supportSpells
				+ ", <b>Deprecating Spells</b>: " + hvStat.roundInfo.depSpells[1]
				+ ", <b>Divine Spells</b>: " + hvStat.roundInfo.divineSpells[1]
				+ ", <b>Forbidden Spells</b>: " + hvStat.roundInfo.forbidSpells[1]
				+ ", <b>Elemental Spells</b>: " + hvStat.roundInfo.elemSpells[1]
				+ "<hr style='height:1px;border:0;background-color:#333333;color:#333333' />"
				+ "<b>SupportGain</b>: " + hvStat.roundInfo.supportGain.toFixed(2)
				+ ", <b>Deprecating Gain</b>: " + hvStat.roundInfo.depGain.toFixed(2)
				+ ", <b>Divine Gain</b>: " + hvStat.roundInfo.divineGain.toFixed(2)
				+ ", <b>Forbidden Gain</b>: " + hvStat.roundInfo.forbidGain.toFixed(2)
				+ ", <b>Elemental Gain</b>: " + hvStat.roundInfo.elemGain.toFixed(2);
		}
		if (hvStat.settings.isShowEndProfsArmor) {
			a += "<hr style='height:1px;border:0;background-color:#333333;color:#333333' />"
				+ "<b>Cloth Gain</b>: " + hvStat.roundInfo.armorProfGain[0].toFixed(2)
				+ ", <b>Light Armor Gain</b>: " + hvStat.roundInfo.armorProfGain[1].toFixed(2)
				+ ", <b>Heavy Armor Gain</b>: " + hvStat.roundInfo.armorProfGain[2].toFixed(2);
		}
		if (hvStat.settings.isShowEndProfsWeapon) {
			a += "<hr style='height:1px;border:0;background-color:#333333;color:#333333' />"
				+ "<b>One-Handed Gain</b>: " + hvStat.roundInfo.weapProfGain[0].toFixed(2)
				+ ", <b>Two-Handed Gain</b>: " + hvStat.roundInfo.weapProfGain[1].toFixed(2)
				+ ", <b>Dual Wielding Gain</b>: " + hvStat.roundInfo.weapProfGain[2].toFixed(2)
				+ ", <b>Staff Gain</b>: " + hvStat.roundInfo.weapProfGain[3].toFixed(2);
		}
	}
	return a;
}

function getReportItemHtml() {
	var e = "Tracking disabled.";
	if (hvStat.settings.isTrackItems && hvStat.drops.dropChances === 0)
		e = "No data found. Complete a round to begin tracking.";
	else if (hvStat.settings.isTrackItems && hvStat.drops.dropChances > 0)
		e = '<table class="_UI" cellspacing="0" cellpadding="1" style="width:100%">';
	else if (!hvStat.settings.isTrackItems && hvStat.drops.dropChances > 0)
		e = '<table class="_UI" cellspacing="0" cellpadding="1" style="width:100%"><tr><td align="center" colspan="4"><div align="center" class="ui-state-error ui-corner-all" style="padding:4px;margin:4px"><span class="ui-icon ui-icon-pause"></span><b>TRACKING PAUSED</b></div></td></tr>';
	if (hvStat.drops.dropChances > 0) {
		var b = hvStat.drops.artDrop + hvStat.drops.eqDrop + hvStat.drops.itemDrop;
		var b0 = hvStat.drops.artDropbyBT[0] + hvStat.drops.eqDropbyBT[0] + hvStat.drops.itemDropbyBT[0];
		var b1 = hvStat.drops.artDropbyBT[1] + hvStat.drops.eqDropbyBT[1] + hvStat.drops.itemDropbyBT[1];
		var b2 = hvStat.drops.artDropbyBT[2] + hvStat.drops.eqDropbyBT[2] + hvStat.drops.itemDropbyBT[2];
		var b3 = hvStat.drops.artDropbyBT[3] + hvStat.drops.eqDropbyBT[3] + hvStat.drops.itemDropbyBT[3];
		var b4 = hvStat.drops.artDropbyBT[4] + hvStat.drops.eqDropbyBT[4] + hvStat.drops.itemDropbyBT[4];
		var d = b / 100;
		var a = hvStat.drops.dropChances / 100;
		e += '<tr><td colspan="4"><b>Total Item Drops:</b> ' + b + " from " + hvStat.drops.dropChances + " monsters (" + (b / a).toFixed(2) + '% total drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Items: ' + hvStat.drops.itemDrop + " (" + (d === 0 ? 0 : (hvStat.drops.itemDrop / d).toFixed(2)) + "% of drops, " + (hvStat.drops.itemDrop / a).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Equipment: ' + hvStat.drops.eqDrop + " (" + (d === 0 ? 0 : (hvStat.drops.eqDrop / d).toFixed(2)) + "% of drops, " + (hvStat.drops.eqDrop / a).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Artifacts: ' + hvStat.drops.artDrop + " (" + (d === 0 ? 0 : (hvStat.drops.artDrop / d).toFixed(2)) + "% of drops, " + (hvStat.drops.artDrop / a).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:10px"><b>In hourly encounters:</b> ' + b0 + " from " + hvStat.drops.dropChancesbyBT[0] + " monsters (" + (b0*100 / hvStat.drops.dropChancesbyBT[0]).toFixed(2) + '% total drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Items: ' + hvStat.drops.itemDropbyBT[0] + " (" + (b0 === 0 ? 0 : (hvStat.drops.itemDropbyBT[0]*100 / b0).toFixed(2)) + "% of drops, " + (hvStat.drops.itemDropbyBT[0]*100/hvStat.drops.dropChancesbyBT[0]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:30px">Crystals: ' + hvStat.drops.crysDropbyBT[0] + " (" + (b0 === 0 ? 0 : (hvStat.drops.crysDropbyBT[0]*100 / b0).toFixed(2)) + "% of drops, " + (hvStat.drops.crysDropbyBT[0]*100/hvStat.drops.dropChancesbyBT[0]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Equipment: ' + hvStat.drops.eqDropbyBT[0] + " (" + (b0 === 0 ? 0 : (hvStat.drops.eqDropbyBT[0]*100 / b0).toFixed(2)) + "% of drops, " + (hvStat.drops.eqDropbyBT[0]*100/hvStat.drops.dropChancesbyBT[0]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Artifacts: ' + hvStat.drops.artDropbyBT[0] + " (" + (b0 === 0 ? 0 : (hvStat.drops.artDropbyBT[0]*100 / b0).toFixed(2)) + "% of drops, " + (hvStat.drops.artDropbyBT[0]*100/hvStat.drops.dropChancesbyBT[0]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:10px"><b>In Arenas:</b> ' + b1 + " from " + hvStat.drops.dropChancesbyBT[1] + " monsters (" + (b1*100 / hvStat.drops.dropChancesbyBT[1]).toFixed(2) + '% total drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Items: ' + hvStat.drops.itemDropbyBT[1] + " (" + (b1 === 0 ? 0 : (hvStat.drops.itemDropbyBT[1]*100 / b1).toFixed(2)) + "% of drops, " + (hvStat.drops.itemDropbyBT[1]*100/hvStat.drops.dropChancesbyBT[1]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:30px">Crystals: ' + hvStat.drops.crysDropbyBT[1] + " (" + (b1 === 0 ? 0 : (hvStat.drops.crysDropbyBT[1]*100 / b1).toFixed(2)) + "% of drops, " + (hvStat.drops.crysDropbyBT[1]*100/hvStat.drops.dropChancesbyBT[1]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Equipment: ' + hvStat.drops.eqDropbyBT[1] + " (" + (b1 === 0 ? 0 : (hvStat.drops.eqDropbyBT[1]*100 / b1).toFixed(2)) + "% of drops, " + (hvStat.drops.eqDropbyBT[1]*100/hvStat.drops.dropChancesbyBT[1]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Artifacts: ' + hvStat.drops.artDropbyBT[1] + " (" + (b1 === 0 ? 0 : (hvStat.drops.artDropbyBT[1]*100 / b1).toFixed(2)) + "% of drops, " + (hvStat.drops.artDropbyBT[1]*100/hvStat.drops.dropChancesbyBT[1]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:10px"><b>In GrindFests:</b> ' + b2 + " from " + hvStat.drops.dropChancesbyBT[2] + " monsters (" + (b2*100 / hvStat.drops.dropChancesbyBT[2]).toFixed(2) + '% total drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Items: ' + hvStat.drops.itemDropbyBT[2] + " (" + (b2 === 0 ? 0 : (hvStat.drops.itemDropbyBT[2]*100 / b2).toFixed(2)) + "% of drops, " + (hvStat.drops.itemDropbyBT[2]*100/hvStat.drops.dropChancesbyBT[2]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:30px">Crystals: ' + hvStat.drops.crysDropbyBT[2] + " (" + (b2 === 0 ? 0 : (hvStat.drops.crysDropbyBT[2]*100 / b2).toFixed(2)) + "% of drops, " + (hvStat.drops.crysDropbyBT[2]*100/hvStat.drops.dropChancesbyBT[2]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Equipment: ' + hvStat.drops.eqDropbyBT[2] + " (" + (b2 === 0 ? 0 : (hvStat.drops.eqDropbyBT[2]*100 / b2).toFixed(2)) + "% of drops, " + (hvStat.drops.eqDropbyBT[2]*100/hvStat.drops.dropChancesbyBT[2]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Artifacts: ' + hvStat.drops.artDropbyBT[2] + " (" + (b2 === 0 ? 0 : (hvStat.drops.artDropbyBT[2]*100 / b2).toFixed(2)) + "% of drops, " + (hvStat.drops.artDropbyBT[2]*100/hvStat.drops.dropChancesbyBT[2]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:10px"><b>In Item Worlds:</b> ' + b3 + " from " + hvStat.drops.dropChancesbyBT[3] + " monsters (" + (b3*100 / hvStat.drops.dropChancesbyBT[3]).toFixed(2) + '% total drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Items: ' + hvStat.drops.itemDropbyBT[3] + " (" + (b3 === 0 ? 0 : (hvStat.drops.itemDropbyBT[3]*100 / b3).toFixed(2)) + "% of drops, " + (hvStat.drops.itemDropbyBT[3]*100/hvStat.drops.dropChancesbyBT[3]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:30px">Crystals: ' + hvStat.drops.crysDropbyBT[3] + " (" + (b3 === 0 ? 0 : (hvStat.drops.crysDropbyBT[3]*100 / b3).toFixed(2)) + "% of drops, " + (hvStat.drops.crysDropbyBT[3]*100/hvStat.drops.dropChancesbyBT[3]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Equipment: ' + hvStat.drops.eqDropbyBT[3] + " (" + (b3 === 0 ? 0 : (hvStat.drops.eqDropbyBT[3]*100 / b3).toFixed(2)) + "% of drops, " + (hvStat.drops.eqDropbyBT[3]*100/hvStat.drops.dropChancesbyBT[3]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Artifacts: ' + hvStat.drops.artDropbyBT[3] + " (" + (b3 === 0 ? 0 : (hvStat.drops.artDropbyBT[3]*100 / b3).toFixed(2)) + "% of drops, " + (hvStat.drops.artDropbyBT[3]*100/hvStat.drops.dropChancesbyBT[3]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4"><b>Item:</b></td></tr>';
		for (var c = 0; c < hvStat.drops.itemArry.length; c = c + 2) {
			e += "<tr><td style='width:25%;padding-left:10px'>" + hvStat.drops.itemArry[c] + "</td><td style='width:25%'>x " + hvStat.drops.itemQtyArry[c] + " (" + (hvStat.drops.itemDrop === 0 ? 0 : ((hvStat.drops.itemQtyArry[c] / hvStat.drops.itemDrop) * 100).toFixed(2)) + "%)</td>";
			if (hvStat.drops.itemArry[c + 1] !== " ")
				e += "<td style='width:25%;padding-left:10px'>" + hvStat.drops.itemArry[c + 1] + "</td><td style='width:25%'>x " + hvStat.drops.itemQtyArry[c + 1] + " (" + (hvStat.drops.itemDrop === 0 ? 0 : ((hvStat.drops.itemQtyArry[c + 1] / hvStat.drops.itemDrop) * 100).toFixed(2)) + "%)</td></tr>";
			else e += "<td></td><td></td></tr>";
		}
		e += '<tr><td colspan="4"><b>Equipment:</b></td></tr>';
		var c = hvStat.drops.eqArray.length;
		while (c--) e += '<tr><td colspan="4" style="padding-left:10px">' + hvStat.drops.eqArray[c] + "</td></tr>";
		e += '<tr><td colspan="4"><b>Artifact:</b></td></tr>';
		c = hvStat.drops.artArry.length;
		while (c--) e += '<tr><td colspan="4" style="padding-left:10px">' + hvStat.drops.artArry[c] + " x " + hvStat.drops.artQtyArry[c] + "</td></tr>";
		e += '<tr><td align="right" colspan="4"><input type="button" class="_resetItems" value="Reset Drops" /></td></tr>';
	}
	e += "</table>";
	return e;
}
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
	$(tdReportingPeriod[2]).text(HVStat.getElapsedFrom(start));

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

 	var tdExperiencePointsHourlyEncounters = $('#hvstat-overview-experience-points-hourly-encounters td');
 	var tdExperiencePointsArena = $('#hvstat-overview-experience-points-arenas td');
 	var tdExperiencePointsGrindfests = $('#hvstat-overview-experience-points-grindfests td');
 	var tdExperiencePointsItemWorlds = $('#hvstat-overview-experience-points-item-worlds td');
 	var tdExperiencePointsTotal = $('#hvstat-overview-experience-points-total td');

	$(tdExperiencePointsHourlyEncounters[0]).text(hvStat.util.numberWithCommas(hvStat.overview.expbyBT[0]));
	$(tdExperiencePointsHourlyEncounters[1]).text(hvStat.util.percentRatio(hvStat.overview.expbyBT[0], hvStat.overview.exp, 2) + "%");
	$(tdExperiencePointsHourlyEncounters[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[0], hvStat.overview.roundArray[0]).toFixed()));
	$(tdExperiencePointsHourlyEncounters[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[0], elapsedHours).toFixed()));
	$(tdExperiencePointsHourlyEncounters[4]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[0], elapsedDays).toFixed()));

	$(tdExperiencePointsArena[0]).text(hvStat.util.numberWithCommas(hvStat.overview.expbyBT[1]));
	$(tdExperiencePointsArena[1]).text(hvStat.util.percentRatio(hvStat.overview.expbyBT[1], hvStat.overview.exp, 2) + "%");
	$(tdExperiencePointsArena[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[1], hvStat.overview.roundArray[1]).toFixed()));
	$(tdExperiencePointsArena[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[1], elapsedHours).toFixed()));
	$(tdExperiencePointsArena[4]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[1], elapsedDays).toFixed()));

	$(tdExperiencePointsGrindfests[0]).text(hvStat.util.numberWithCommas(hvStat.overview.expbyBT[2]));
	$(tdExperiencePointsGrindfests[1]).text(hvStat.util.percentRatio(hvStat.overview.expbyBT[2], hvStat.overview.exp, 2) + "%");
	$(tdExperiencePointsGrindfests[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[2], hvStat.overview.roundArray[2]).toFixed()));
	$(tdExperiencePointsGrindfests[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[2], elapsedHours).toFixed()));
	$(tdExperiencePointsGrindfests[4]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[2], elapsedDays).toFixed()));

	$(tdExperiencePointsItemWorlds[0]).text(hvStat.util.numberWithCommas(hvStat.overview.expbyBT[3]));
	$(tdExperiencePointsItemWorlds[1]).text(hvStat.util.percentRatio(hvStat.overview.expbyBT[3], hvStat.overview.exp, 2) + "%");
	$(tdExperiencePointsItemWorlds[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[3], hvStat.overview.roundArray[3]).toFixed()));
	$(tdExperiencePointsItemWorlds[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[3], elapsedHours).toFixed()));
	$(tdExperiencePointsItemWorlds[4]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.expbyBT[3], elapsedDays).toFixed()));

	$(tdExperiencePointsTotal[0]).text(hvStat.util.numberWithCommas(hvStat.overview.exp));
	$(tdExperiencePointsTotal[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.exp, hvStat.overview.totalRounds).toFixed()));
	$(tdExperiencePointsTotal[3]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.exp, elapsedHours).toFixed()));
	$(tdExperiencePointsTotal[4]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.exp, elapsedDays).toFixed()));

	var tdCreditsHourlyEncounters = $('#hvstat-overview-credits-hourly-encounters td');
	var tdCreditsArena = $('#hvstat-overview-credits-arenas td');
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

	$(tdCreditsTotal[0]).text(hvStat.util.numberWithCommas(hvStat.overview.credits));
	$(tdCreditsTotal[2]).text(hvStat.util.numberWithCommas(hvStat.util.ratio(hvStat.overview.credits, hvStat.overview.roundArray[0] + hvStat.overview.roundArray[1]).toFixed()));
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
		lastFoundTime = getRelativeTime(hvStat.overview.lastEquipTime);
	}
	$(spanDropsEquipmentLastFound[0]).text(lastFoundName);
	$(spanDropsEquipmentLastFound[1]).text(lastFoundTime);

	if (hvStat.overview.equips === 0) {
		lastFoundName = "None yet!";
		lastFoundTime = "N/A";
	} else {
		lastFoundName = hvStat.overview.lastArtName;
		lastFoundTime = getRelativeTime(hvStat.overview.lastArtTime);
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
		var j = hvStat.stats.elemSpells[1] + hvStat.stats.divineSpells[1] + hvStat.stats.forbidSpells[1];
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
		var elall = hvStat.stats.elemSpells[1] + hvStat.stats.elemSpells[3];
		var divall = hvStat.stats.divineSpells[1] + hvStat.stats.divineSpells[3];
		var forall = hvStat.stats.forbidSpells[1] + hvStat.stats.forbidSpells[3];
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
function initItemPane() {
	$("#pane3").html(getReportItemHtml());
	$("._resetItems").click(function () {
		if (confirm("Reset Drops tab?")) {
			hvStat.storage.drops.reset();
		}
	});
}
function initRewardsPane() {
	var innerHTML;
	if (hvStat.arenaRewards.totalRwrds === 0) {
		innerHTML = "No data found. Complete an arena to begin tracking.";
	} else {
		innerHTML = browser.extension.getResourceText("html/", "arena-rewards-pane.html");
	}
	$('#hvstat-arena-rewards-pane').html(innerHTML);
	if (hvStat.arenaRewards.totalRwrds > 0) {
		if (!hvStat.settings.isTrackRewards) {
			$('#hvstat-arena-rewards-pane .hvstat-tracking-paused').show();
		}
		// Total Rewards
		$('#hvstat-arena-rewards-total-number').text(hvStat.arenaRewards.totalRwrds);
		var tdTotalArtifact = $('#hvstat-arena-rewards-total-artifact td');
		var tdTotalEquipment = $('#hvstat-arena-rewards-total-equipment td');
		var tdTotalItem = $('#hvstat-arena-rewards-total-item td');
		var tdTotalTotal = $('#hvstat-arena-rewards-total-total td');
		$(tdTotalArtifact[0]).text(hvStat.arenaRewards.artRwrd);
		$(tdTotalArtifact[1]).text(hvStat.util.percentRatio(hvStat.arenaRewards.artRwrd, hvStat.arenaRewards.totalRwrds, 2) + "%");
		$(tdTotalEquipment[0]).text(hvStat.arenaRewards.eqRwrd);
		$(tdTotalEquipment[1]).text(hvStat.util.percentRatio(hvStat.arenaRewards.eqRwrd, hvStat.arenaRewards.totalRwrds, 2) + "%");
		$(tdTotalItem[0]).text(hvStat.arenaRewards.itemsRwrd);
		$(tdTotalItem[1]).text(hvStat.util.percentRatio(hvStat.arenaRewards.itemsRwrd, hvStat.arenaRewards.totalRwrds, 2) + "%");
		$(tdTotalTotal[0]).text(hvStat.arenaRewards.totalRwrds);
		// Token Bonuses
		var totalTokenDrops = hvStat.arenaRewards.tokenDrops[0] + hvStat.arenaRewards.tokenDrops[2];
		$('#hvstat-arena-rewards-token-bonuses-number').text(totalTokenDrops);
		var tdTokenBlood = $('#hvstat-arena-rewards-token-bonuses-blood td');
		var tdTokenChaos = $('#hvstat-arena-rewards-token-bonuses-chaos td');
		var tdTokenTotal = $('#hvstat-arena-rewards-token-bonuses-total td');
		$(tdTokenBlood[0]).text(hvStat.arenaRewards.tokenDrops[0]);
		$(tdTokenBlood[1]).text(hvStat.util.percentRatio(hvStat.arenaRewards.tokenDrops[0], totalTokenDrops, 2) + "%");
		$(tdTokenChaos[0]).text(hvStat.arenaRewards.tokenDrops[2]);
		$(tdTokenChaos[1]).text(hvStat.util.percentRatio(hvStat.arenaRewards.tokenDrops[2], totalTokenDrops, 2) + "%");
		$(tdTokenTotal[0]).text(hvStat.arenaRewards.tokenDrops[0] + hvStat.arenaRewards.tokenDrops[2]);
		// Artifacts
		var i = hvStat.arenaRewards.artRwrdArry.length;
		var artifactsHTML = "";
		while (i--) {
			artifactsHTML += '<li>' + hvStat.arenaRewards.artRwrdArry[i] + ' x ' + hvStat.arenaRewards.artRwrdQtyArry[i] + '</li>';
		}
		$('#hvstat-arena-rewards-artifacts').html(artifactsHTML);
		// Equipments
		i = hvStat.arenaRewards.eqRwrdArry.length;
		var equipmentsHTML = "";
		while (i--) {
			equipmentsHTML += '<li>' + hvStat.arenaRewards.eqRwrdArry[i] + '</li>';
		}
		$('#hvstat-arena-rewards-equipments').html(equipmentsHTML);
		// Items
		i = hvStat.arenaRewards.itemRwrdArry.length;
		var itemsHTML = "";
		while (i--) {
			itemsHTML += '<li>' + hvStat.arenaRewards.itemRwrdArry[i] + ' x ' + hvStat.arenaRewards.itemRwrdQtyArry[i] + '</li>';
		}
		$('#hvstat-arena-rewards-items').html(itemsHTML);
		// Buttons
		$('#hvstat-arena-rewards-artifacts-clear').click(function () {
			if (confirm("Clear Artifact list?")) {
				hvStat.arenaRewards.artRwrdArry = [];
				hvStat.arenaRewards.artRwrdQtyArry = [];
				hvStat.storage.arenaRewards.save();
			}
		});
		$('#hvstat-arena-rewards-equipments-clear').click(function () {
			if (confirm("Clear Equipment list?")) {
				hvStat.arenaRewards.eqRwrdArry = [];
				hvStat.storage.arenaRewards.save();
			}
		});
		$('#hvstat-arena-rewards-items-clear').click(function () {
			if (confirm("Clear Item list?")) {
				hvStat.arenaRewards.itemRwrdArry = [];
				hvStat.arenaRewards.itemRwrdQtyArry = [];
				hvStat.storage.arenaRewards.save();
			}
		});
		$('#hvstat-arena-rewards-reset').click(function () {
			if (confirm("Reset Arena Rewards tab?")) {
				hvStat.storage.arenaRewards.reset();
			}
		});
	}
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
		var tdAbilityPoints = $('#hvstat-shrine-artifact-ability-points td');
		var tdAttributes = $('#hvstat-shrine-artifact-attributes td');
		var tdHath = $('#hvstat-shrine-artifact-hath td');
		var tdCrystals = $('#hvstat-shrine-artifact-crystals td');
		var tdEnergyDrinks = $('#hvstat-shrine-artifact-energy-drinks td');
		var tdTotal = $('#hvstat-shrine-artifact-total td');
		$(tdAbilityPoints[0]).text(hvStat.shrine.artifactAP);
		$(tdAbilityPoints[1]).text(hvStat.util.percentRatio(hvStat.shrine.artifactAP, hvStat.shrine.artifactsTraded, 2) + "%");
		$(tdAttributes[0]).text(hvStat.shrine.artifactStat);
		$(tdAttributes[1]).text(hvStat.util.percentRatio(hvStat.shrine.artifactStat, hvStat.shrine.artifactsTraded, 2) + "%");
		$(tdHath[0]).text(hvStat.shrine.artifactHath);
		$(tdHath[1]).text(hvStat.util.percentRatio(hvStat.shrine.artifactHath, hvStat.shrine.artifactsTraded, 2) + "%");
		$(tdHath[2]).text("(" + hvStat.util.ratio(hvStat.shrine.artifactHathTotal, hvStat.shrine.artifactsTraded).toFixed(2) + " Hath per Artifact)");
		$(tdCrystals[0]).text(hvStat.shrine.artifactCrystal);
		$(tdCrystals[1]).text(hvStat.util.percentRatio(hvStat.shrine.artifactCrystal, hvStat.shrine.artifactsTraded, 2) + "%");
		$(tdEnergyDrinks[0]).text(hvStat.shrine.artifactItem);
		$(tdEnergyDrinks[1]).text(hvStat.util.percentRatio(hvStat.shrine.artifactItem, hvStat.shrine.artifactsTraded, 2) + "%");
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
function initMonsterDatabasePane() {
	$("#hvstat-monster-database-pane").html(browser.extension.getResourceText("html/", "monster-database-pane.html"));
	function showOldDatabaseSize() {
		var oldDatabaseSize = ((localStorage.HVMonsterDatabase ? localStorage.HVMonsterDatabase.length : 0) / 1024 / 1024 * (browser.isChrome ? 2 : 1)).toFixed(2);
		var e = document.getElementById("hvstat-monster-database-old-database-size");
		e.textContent = String(oldDatabaseSize);
	}
	showOldDatabaseSize();
	$("#importMonsterScanResults").change(function (event) {
		var file = event.target.files[0]; 
		if (!file) {
			alert("Failed to load file");
		} else {
			if (confirm("Are you sure to import the monster scan results?")) {
				HVStat.importMonsterScanResults(file);
			}
		}
	});
	$("#importMonsterSkills").change(function (event) {
		var file = event.target.files[0]; 
		if (!file) {
			alert("Failed to load file");
		} else {
			if (confirm("Are you sure to import the monster skill data?")) {
				HVStat.importMonsterSkills(file);
			}
		}
	});
	$("#exportMonsterScanResults").click(function () {
		HVStat.exportMonsterScanResults(function () {
			if (HVStat.nRowsMonsterScanResultsTSV === 0) {
				alert("There is no monster scan result.");
			} else {
				var downloadLink = $("#downloadLinkMonsterScanResults");
				downloadLink.attr("href", HVStat.dataURIMonsterScanResults);
				downloadLink.attr("download", "hvstat_monster_scan.tsv");
				downloadLink.css("visibility", "visible");
				alert("Ready to export your monster scan results.\nClick the download link.");
			}
		});
	});
	$("#exportMonsterSkills").click(function () {
		HVStat.exportMonsterSkills(function () {
			var downloadLink = $("#downloadLinkMonsterSkills");
			if (HVStat.nRowsMonsterSkillsTSV === 0) {
				alert("There is no monster skill data.");
			} else {
				downloadLink.attr("href", HVStat.dataURIMonsterSkills);
				downloadLink.attr("download", "hvstat_monster_skill.tsv");
				downloadLink.css("visibility", "visible");
				alert("Ready to export your monster skill data.\nClick the download link.");
			}
		});
	});
	$("#deleteMonsterScanResults").click(function () {
		if (confirm("Are you sure to delete your monster scan results?")) {
			HVStat.deleteAllObjectsInMonsterScanResults();
		}
	});
	$("#deleteMonsterSkills").click(function () {
		if (confirm("Are you sure to delete your monster skill data?")) {
			HVStat.deleteAllObjectsInMonsterSkills();
		}
	});
	$("#deleteDatabase").click(function () {
		if (confirm("Are you really sure to delete your database?")) {
			HVStat.deleteIndexedDB();
		}
	});
	$("#migrateDatabase").click(function () {
		if (confirm("Are you sure to migrate your monster database?")) {
			HVStat.migration.migrateDatabase();
		}
	});
	$("#deleteOldDatabase").click(function () {
		if (confirm("Are you really sure to delete your old monster database?")) {
			HVStat.migration.deleteOldDatabase();
			showOldDatabaseSize();
		}
	});
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
	if (hvStat.settings.isTrackRewards) $("input[name=isTrackRewards]").attr("checked", "checked");
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
	$("input[name=isTrackRewards]").click(saveSettings);
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
	hvStat.settings.isTrackRewards = $("input[name=isTrackRewards]").get(0).checked;
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
	hvStat.settings.isEffectsAlertSelf[4] = false; // Absorb no longer has duration
	hvStat.settings.isEffectsAlertSelf[5] = $("input[name=isEffectsAlertSelf5]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[6] = $("input[name=isEffectsAlertSelf6]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[7] = $("input[name=isEffectsAlertSelf7]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[8] = $("input[name=isEffectsAlertSelf8]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[9] = $("input[name=isEffectsAlertSelf9]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[10] = $("input[name=isEffectsAlertSelf10]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[11] = $("input[name=isEffectsAlertSelf11]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[12] = $("input[name=isEffectsAlertSelf12]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[13] = $("input[name=isEffectsAlertSelf13]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[14] = $("input[name=isEffectsAlertSelf14]").get(0).checked;
	hvStat.settings.isEffectsAlertSelf[15] = $("input[name=isEffectsAlertSelf15]").get(0).checked;
	hvStat.settings.EffectsAlertSelfRounds[0] = $("input[name=EffectsAlertSelfRounds0]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[1] = $("input[name=EffectsAlertSelfRounds1]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[2] = $("input[name=EffectsAlertSelfRounds2]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[3] = $("input[name=EffectsAlertSelfRounds3]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[4] = 0; // absorb is obsolete
	hvStat.settings.EffectsAlertSelfRounds[5] = $("input[name=EffectsAlertSelfRounds5]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[6] = $("input[name=EffectsAlertSelfRounds6]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[7] = $("input[name=EffectsAlertSelfRounds7]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[8] = $("input[name=EffectsAlertSelfRounds8]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[9] = $("input[name=EffectsAlertSelfRounds9]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[10] = $("input[name=EffectsAlertSelfRounds10]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[11] = $("input[name=EffectsAlertSelfRounds11]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[12] = $("input[name=EffectsAlertSelfRounds12]").get(0).value;
	hvStat.settings.EffectsAlertSelfRounds[13] = $("input[name=EffectsAlertSelfRounds13]").get(0).value;
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
	hvStat.settings.isEffectsAlertMonsters[8] = $("input[name=isEffectsAlertMonsters8]").get(0).checked;
	hvStat.settings.isEffectsAlertMonsters[9] = $("input[name=isEffectsAlertMonsters9]").get(0).checked;
	hvStat.settings.isEffectsAlertMonsters[10] = $("input[name=isEffectsAlertMonsters10]").get(0).checked;
	hvStat.settings.isEffectsAlertMonsters[11] = $("input[name=isEffectsAlertMonsters11]").get(0).checked;
	hvStat.settings.EffectsAlertMonstersRounds[0] = $("input[name=EffectsAlertMonstersRounds0]").get(0).value;
	hvStat.settings.EffectsAlertMonstersRounds[1] = $("input[name=EffectsAlertMonstersRounds1]").get(0).value;
	hvStat.settings.EffectsAlertMonstersRounds[2] = $("input[name=EffectsAlertMonstersRounds2]").get(0).value;
	hvStat.settings.EffectsAlertMonstersRounds[3] = $("input[name=EffectsAlertMonstersRounds3]").get(0).value;
	hvStat.settings.EffectsAlertMonstersRounds[4] = $("input[name=EffectsAlertMonstersRounds4]").get(0).value;
	hvStat.settings.EffectsAlertMonstersRounds[5] = $("input[name=EffectsAlertMonstersRounds5]").get(0).value;
	hvStat.settings.EffectsAlertMonstersRounds[6] = $("input[name=EffectsAlertMonstersRounds6]").get(0).value;
	hvStat.settings.EffectsAlertMonstersRounds[7] = $("input[name=EffectsAlertMonstersRounds7]").get(0).value;
	hvStat.settings.EffectsAlertMonstersRounds[8] = $("input[name=EffectsAlertMonstersRounds8]").get(0).value;
	hvStat.settings.EffectsAlertMonstersRounds[9] = $("input[name=EffectsAlertMonstersRounds9]").get(0).value;
	hvStat.settings.EffectsAlertMonstersRounds[10] = $("input[name=EffectsAlertMonstersRounds10]").get(0).value;
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
function captureShrine() {
	var messageBoxElement = document.querySelector("#messagebox");
	if (!messageBoxElement) {
		return;
	}
	var messageElements = messageBoxElement.querySelectorAll("div.cmb6");
	var message0 = util.innerText(messageElements[0]);
	if (message0.match(/power/i)) {
		hvStat.shrine.artifactsTraded++;
		var message2 = util.innerText(messageElements[2]);
		if (message2.match(/ability point/i)) {
			hvStat.shrine.artifactAP++;
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
		var message3 = util.innerText(messageElements[3]);
		hvStat.shrine.trophyArray.push(message3);
	}
	hvStat.storage.shrine.save();
}
function getRelativeTime(b) {
	var a = (arguments.length > 1) ? arguments[1] : new Date();
	var c = parseInt((a.getTime() - b) / 1000);
	if (c < 60) return "less than a minute ago";
	if (c < 120) return "about a minute ago";
	if (c < (60 * 60)) return (parseInt(c / 60)).toString() + " minutes ago";
	if (c < (120 * 60)) return "about an hour ago";
	if (c < (24 * 60 * 60)) return "about " + (parseInt(c / 3600)).toString() + " hours ago";
	if (c < (48 * 60 * 60)) return "1 day ago";
	return (parseInt(c / 86400)).toString() + " days ago";
}
function HVResetTracking() {
	hvStat.storage.overview.reset();
	hvStat.storage.stats.reset();
	hvStat.storage.arenaRewards.reset();
	hvStat.storage.shrine.reset();
	hvStat.storage.drops.reset();
}
function HVMasterReset() {
	var keys = [
		"HVBackup1",
		"HVBackup2",
		"HVBackup3",
		"HVBackup4",
		"HVBackup5",
		"HVCharacterSettingsandStats",	// Obsolete
		"HVCollectData",		// Obsolete
		"HVDrops",
		"HVLoadTimeCounters",	// Obsolete
		"HVMonsterDatabase",	// Old monster data
		"HVOverview",
		"HVProf",				// Obsolete
		"HVRewards",
		"HVRound",				// Obsolete
		"HVSettings",
		"HVShrine",
		"HVStats",
		"HVTags",
		"inventoryAlert",
		key_hpAlertAlreadyShown,
		key_mpAlertAlreadyShown,
		key_spAlertAlreadyShown,
		key_ocAlertAlreadyShown,
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
function clone(a) {
	if (a === null || typeof(a) !== "object") return a;
	if (a instanceof Array) return a.slice();
	for (var b in a) {
		if (!a.hasOwnProperty(b)) continue;
		this[b] = (a[b] === undefined) ? undefined : clone(a[b]);
	}
}
function loadFromStorage(c, b) {
	var a = localStorage.getItem(b);
	if (a !== null) {
		c.cloneFrom(JSON.parse(a));
		c.isLoaded = true;
	}
}
function saveToStorage(b, a) { localStorage.setItem(a, JSON.stringify(b)); }
function deleteFromStorage(a) { localStorage.removeItem(a); }
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
function loadDatabaseObject() {
	if (_database !== null) return;
	_database = new HVMonsterDatabase();
	_database.load();
}
function HVMonsterDatabase() {
	this.load = function () { loadFromStorage(this, HV_DBASE); }
	this.save = function () { saveToStorage(this, HV_DBASE); }
	this.reset = function () { deleteFromStorage(HV_DBASE); }
	this.cloneFrom = clone;
	this.mclass = [];
	this.mpl = [];
	this.mattack = [];
	this.mweak = [];
	this.mresist = [];
	this.mimperv = [];
	this.mskilltype = [];
	this.mskillspell = [];
	this.datescan = [];
	this.isLoaded = false;
}

function registerEventHandlersForMonsterPopup() {
	var delay = hvStat.settings.monsterPopupDelay;
	var popupLeftOffset = hvStat.settings.isMonsterPopupPlacement ? 955 : 275;
	var showPopup = function (event) {
		var i, index = -1;
		for (i = 0; i < HVStat.monsters.length; i++) {
			if (HVStat.monsters[i].domElementId === this.id) {
				index = i;
				break;
			}
		}
		if (index < 0) return;
		var html = HVStat.monsters[index].renderPopup();
		hv.elementCache.popup.style.width = "270px";
		hv.elementCache.popup.style.height = "auto";
		hv.elementCache.popup.innerHTML = html;
		var popupTopOffset = hv.battle.elementCache.monsterPane.offsetTop
			+ index * ((hv.battle.elementCache.monsterPane.scrollHeight - hv.elementCache.popup.scrollHeight) / 9);
		hv.elementCache.popup.style.top = popupTopOffset + "px";
		hv.elementCache.popup.style.left = popupLeftOffset + "px";
		hv.elementCache.popup.style.visibility = "visible";
	};
	var hidePopup = function () {
		hv.elementCache.popup.style.visibility = "hidden";
	};
	var timerId;
	var prepareForShowingPopup = function (event) {
		(function (event, that) {
			timerId = setTimeout(function () {
				showPopup.call(that, event);
			}, delay);
		})(event, this);
	};
	var prepareForHidingPopup = function (event) {
		hidePopup();
		clearTimeout(timerId);
	};
	var i, len = HVStat.monsters.length;
	for (i = 0; i < len; i++) {
		var monsterElement = HVStat.monsters[i].baseElement;
		monsterElement.addEventListener("mouseover", prepareForShowingPopup);
		monsterElement.addEventListener("mouseout", prepareForHidingPopup);
	}
}
function StartBattleAlerts () {
	var elements = document.querySelectorAll('#arenaform img[onclick*="arenaform"]');
	var i, element;
	for (i = 0; i < elements.length; i++) {
		element = elements[i];
		var oldOnClick = element.getAttribute("onclick");
		var newOnClick = 'if(confirm("Are you sure you want to start this challenge on '
			+ hvStat.characterStatus.difficulty.name
			+ ' difficulty, with set number: '
			+ hvStat.characterStatus.equippedSet + '?\\n';
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
}

function captureCharacterStatuses() {
	var difficulties = ["", "Easy", "Normal", "Hard", "Heroic", "Nightmare", "Hell", "Nintendo", "Battletoads", "IWBTH"];
	var difficulty = hv.settings.difficulty;
	if (difficulty) {
		hvStat.characterStatus.difficulty.name = hv.settings.difficulty;
		hvStat.characterStatus.difficulty.index = difficulties.indexOf(difficulty);
	}
	elements = document.querySelectorAll("#setform img");
	var result;
	for (var i = 0; i < elements.length; i++) {
		result = /set(\d)_on/.exec(elements[i].getAttribute("src"));
		if (result && result.length >= 2) {
			hvStat.characterStatus.equippedSet = Number(result[1]);
			break;
		}
	}
	hvStat.storage.characterStatus.save();
}
function AlertEffectsSelf() {
	var effectNames = [
		"Protection", "Hastened", "Shadow Veil", "Regen", "Absorbing Ward",
		"Spark of Life", "Channeling", "Arcane Focus", "Heartseeker", "Spirit Shield",
		"Flame Spikes", "Frost Spikes", "Lightning Spikes", "Storm Spikes",
		"Chain 1", "Chain 2",
	];
	var elements = hv.battle.elementCache.characterEffectIcons;
	Array.prototype.forEach.call(elements, function (element) {
		var onmouseover = element.getAttribute("onmouseover").toString();
		var result = hvStat.battle.constant.rInfoPaneParameters.exec(onmouseover);
		if (!result) return;
		var effectName = result[1];
		var duration = result[2];
		var i;
		for (i = 0; i < effectNames.length; i++) {
			if (hvStat.settings.isEffectsAlertSelf[i]
					&& (effectName + " ").indexOf(effectNames[i] + " ") >= 0	// To match "Regen" and "Regen II", not "Regeneration"
					&& String(hvStat.settings.EffectsAlertSelfRounds[i]) === duration) {
				alert(effectName + " is expiring");
			}
		}
	});
}
function AlertEffectsMonsters() {
	var effectNames = [
		"Spreading Poison", "Slowed", "Weakened", "Asleep", "Confused",
		"Imperiled", "Blinded", "Silenced", "Nerfed", "Magically Snared",
		"Lifestream", "Coalesced Mana"
	];
	var elements = document.querySelectorAll("#monsterpane div.btm6 > img");
	Array.prototype.forEach.call(elements, function (element) {
		var onmouseover = element.getAttribute("onmouseover").toString();
		var result = hvStat.battle.constant.rInfoPaneParameters.exec(onmouseover);
		if (!result) return;
		var effectName = result[1];
		var duration = result[2];
		var i, base, monsterNumber;
		for (i = 0; i < effectNames.length; i++) {
			if (hvStat.settings.isEffectsAlertMonsters[i]
					&& effectNames[i] === effectName
					&& String(hvStat.settings.EffectsAlertMonstersRounds[i]) === duration) {
				for (base = element; base; base = base.parentElement) {
					if (base.id && base.id.indexOf("mkey_") >= 0) {
						break;
					}
				}
				if (!base) continue;
				monsterNumber = base.id.replace("mkey_", "");
				alert(effectName + '\n on monster number "' + monsterNumber + '" is expiring');
			}
		}
	});
}
function TaggingItems(clean) {
	// Can clean tag data when visited the Inventory page.
	// Because all equipments which is owned are listed.
	var equipTagArrayTable = [
		{id: hvStat.equipmentTags.OneHandedIDs,	value: hvStat.equipmentTags.OneHandedTAGs,	idClean: [], valueClean: []},
		{id: hvStat.equipmentTags.TwoHandedIDs,	value: hvStat.equipmentTags.TwoHandedTAGs,	idClean: [], valueClean: []},
		{id: hvStat.equipmentTags.StaffsIDs,	value: hvStat.equipmentTags.StaffsTAGs,		idClean: [], valueClean: []},
		{id: hvStat.equipmentTags.ShieldIDs,	value: hvStat.equipmentTags.ShieldTAGs,		idClean: [], valueClean: []},
		{id: hvStat.equipmentTags.ClothIDs,		value: hvStat.equipmentTags.ClothTAGs,		idClean: [], valueClean: []},
		{id: hvStat.equipmentTags.LightIDs,		value: hvStat.equipmentTags.LightTAGs,		idClean: [], valueClean: []},
		{id: hvStat.equipmentTags.HeavyIDs,		value: hvStat.equipmentTags.HeavyTAGs,		idClean: [], valueClean: []}
	];
	var elements = document.querySelectorAll("#inv_equip div.eqdp, #item_pane div.eqdp, #equip div.eqdp, #equip_pane div.eqdp");
	Array.prototype.forEach.call(elements, function (element) {
		var equipType = String(element.onmouseover)
			.match(/(One-handed Weapon|Two-handed Weapon|Staff|Shield|Cloth Armor|Light Armor|Heavy Armor) &nbsp; &nbsp; Level/i)[0]
			.replace(/ &nbsp; &nbsp; Level/i, "")
			.replace(/ (Weapon|Armor)/i, "");
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
			if (clean) {
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
	if (clean) {
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
}

//------------------------------------
// Start-up
//------------------------------------
hvStat.startup = {
	phase1: function () {
		HVStat.idbAccessQueue = new util.CallbackQueue();
		HVStat.openIndexedDB(function (event) {
			HVStat.idbAccessQueue.execute();
		});
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
		hv.setup();
		console.debug(hv);
		hvStat.setup();
		console.debug(hvStat);
		if (hvStat.settings.isChangePageTitle) {
			document.title = hvStat.settings.customPageTitle;
		}
		if (hv.battle.active) {
			hvStat.battle.setup();
			collectRoundInfo();
			if (hvStat.roundInfo.currRound > 0 && hvStat.settings.isShowRoundCounter) {
				hvStat.battle.enhancement.roundCounter.create();
			}
			showMonsterHealth();
			if (!HVStat.loadingMonsterInfoFromDB) {
				showMonsterStats();
			} else {
				HVStat.idbAccessQueue.add(function () {
					showMonsterStats();
				});
			}
			if (hvStat.settings.isShowStatsPopup) {
				registerEventHandlersForMonsterPopup();
			}
			// Show warnings
			HVStat.AlertAllFromQueue();
			if (!hv.battle.round.finished) {
				if (hvStat.settings.warnMode[hvStat.roundInfo.battleType]) {
					HVStat.warnHealthStatus();
				}
				if (hvStat.settings.isMainEffectsAlertSelf) {
					AlertEffectsSelf();
				}
				if (hvStat.settings.isMainEffectsAlertMonsters) {
					AlertEffectsMonsters();
				}
			}
			if (hv.battle.round.finished) {
				if (hvStat.settings.isShowEndStats) {
					showBattleEndStats();
				}
				saveStats();
				hvStat.storage.roundInfo.remove();
				if (hvStat.settings.autoAdvanceBattleRound) {
					hvStat.battle.advanceRound();
				}
			}
		} else {
			hvStat.storage.roundInfo.remove();
			if ((hvStat.settings.isStartAlert || hvStat.settings.isShowEquippedSet) && !hv.settings.useHVFontEngine) {
				captureCharacterStatuses();
			}
			if (!hv.location.isRiddle) {
				HVStat.resetHealthWarningStates();
			}
			if (hvStat.settings.enableScrollHotkey) {
				hvStat.keyboard.scrollable.setup();
			}
			// Equipment tag
			if (hv.location.isEquipment && hvStat.settings.isShowTags[0]) {
				TaggingItems(false);
			}
			if (hv.location.isInventory && hvStat.settings.isShowTags[5]) {
				TaggingItems(true);
			}
			if (hv.location.isEquipmentShop && hvStat.settings.isShowTags[1]) {
				TaggingItems(false);
			}
			if (hv.location.isItemWorld && hvStat.settings.isShowTags[2]) {
				TaggingItems(false);
			}
			if (hv.location.isMoogleWrite && hvStat.settings.isShowTags[3]) {
				var mailForm = document.querySelector("#mailform #leftpane");
				if (mailForm) {
					var attachEquipButton = mailForm.children[3].children[1];
					attachEquipButton.addEventListener("click", function (event) {
						TaggingItems(false);
					});
				}
			}
			if (hv.location.isForge && hvStat.settings.isShowTags[4]) {
				TaggingItems(false);
			}
			if (hv.location.isForge && hvStat.settings.isDisableForgeHotKeys) {
				document.onkeypress = null;
			}
			if (hv.location.isCharacter && !hv.settings.useHVFontEngine) {
				collectCurrentProfsData();
			}
			if (hv.location.isShrine) {
				if (hvStat.settings.isTrackShrine) {
					captureShrine();
				}
				if (browser.isChrome && hvStat.settings.enableShrineKeyPatch) {
					document.onkeydown = null;	// Workaround to make enable SPACE key
					hvStat.onkeydown = null;
				}
			}
			if (hvStat.settings.isStartAlert && !hv.settings.useHVFontEngine) {
				StartBattleAlerts();
			}
		}
		if (!hv.settings.useHVFontEngine && hvStat.settings.isShowEquippedSet) {
			hvStat.gadget.equippedSet.create();
		}
		if (hvStat.settings.isShowSidebarProfs) {	// TODO: Disable if useHVFontEngine
			hvStat.gadget.proficiencyPopupIcon.create();
		}
		var invAlert = localStorage.getItem(HV_EQUIP);
		var invFull = (invAlert === null) ? false : JSON.parse(invAlert);
		if (invFull) {
			inventoryWarning();
		}
		document.addEventListener("keydown", hvStat.keyboard.documentKeydown);
		hvStat.ui.setup();
		if (hvStat.settings.adjustKeyEventHandling) {
			document.onkeydown = hvStat.onkeydown;
		}
	},
};

hvStat.startup.phase1();
