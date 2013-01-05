// ==UserScript==
// @name            HV Statistics, Tracking, and Analysis Tool
// @namespace       HV STAT
// @description     Collects data, analyzes statistics, and enhances the interface of the HentaiVerse
// @include         http://hentaiverse.org/*
// @exclude         http://hentaiverse.org/pages/showequip*
// @author          Various (http://forums.e-hentai.org/index.php?showtopic=79552)
// @version         5.4.8
// @resource        jquery-1.8.3.min.js                         scripts/jquery-1.8.3.min.js
// @resource        jquery-ui-1.9.2.custom.min.js               scripts/jquery-ui-1.9.2.custom.min.js
// @resource        jquery-ui-1.9.2.custom.min.css              resources/jquery-ui-1.9.2.custom.min.css
// @resource        ui-bg_flat_0_aaaaaa_40x100.png              images/ui-bg_flat_0_aaaaaa_40x100.png
// @resource        ui-bg_flat_55_fbf9ee_40x100.png             images/ui-bg_flat_55_fbf9ee_40x100.png
// @resource        ui-bg_flat_65_edebdf_40x100.png             images/ui-bg_flat_65_edebdf_40x100.png
// @resource        ui-bg_flat_75_e3e0d1_40x100.png             images/ui-bg_flat_75_e3e0d1_40x100.png
// @resource        ui-bg_flat_75_edebdf_40x100.png             images/ui-bg_flat_75_edebdf_40x100.png
// @resource        ui-bg_flat_95_fef1ec_40x100.png             images/ui-bg_flat_95_fef1ec_40x100.png
// @resource        ui-icons_2e83ff_256x240.png                 images/ui-icons_2e83ff_256x240.png
// @resource        ui-icons_5c0d11_256x240.png                 images/ui-icons_5c0d11_256x240.png
// @resource        ui-icons_cd0a0a_256x240.png                 images/ui-icons_cd0a0a_256x240.png
// @resource        hvstat.css                                  resources/hvstat.css
// @resource        battle-log-type0.css                        resources/battle-log-type0.css
// @resource        battle-log-type1.css                        resources/battle-log-type1.css
// @resource        channeling.png                              images/channeling.png
// @resource        healthpot.png                               images/healthpot.png
// @resource        manapot.png                                 images/manapot.png
// @resource        spiritpot.png                               images/spiritpot.png
// @resource        main.html                                   resources/main.html
// @resource        battle-stats-pane.html                      resources/battle-stats-pane.html
// @resource        monster-database-pane.html                  resources/monster-database-pane.html
// @resource        settings-pane.html                          resources/settings-pane.html
// @run-at          document-start
// ==/UserScript==

//------------------------------------
// remove vendor prefix
//------------------------------------
window.indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange|| window.webkitIDBKeyRange;
window.IDBCursor = window.IDBCursor || window.webkitIDBCursor;

//------------------------------------
// generic utilities
//------------------------------------
var util = {
	percent: function (value) { // refactor -> hvStat
		return Math.floor(value * 100);
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
				t = util.innerText(node.childNodes[i]);
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
	CallbackQueue: function () {
		this.closures = [];
		this.executed = false;
		this.context = null;
	},
}
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
	execute: function(context) {
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
// browser utilities
//------------------------------------
var browser = {
	isChrome: navigator.userAgent.indexOf("Chrome") >= 0,
};

browser.extension = {
	ImageResourceInfo: function (originalPath, name, resourcePath) {
		this.originalPath = originalPath;
		this.name = name;
		this.resourcePath = resourcePath;
	},
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
	addStyle: function (styleText) {
		if (browser.isChrome) {
			var styleElement = document.createElement("style");
			styleElement.textContent = styleText;
			document.documentElement.insertBefore(styleElement, null);
		} else {
			GM_addStyle(styleText);
		}
	},
	addStyleFromResource: function (styleResourcePath, styleResouceName, imageResouceInfoArray) {
		var styleText = browser.extension.getResourceText(styleResourcePath, styleResouceName);
		if (imageResouceInfoArray instanceof Array) {
			// replace image URLs
			for (var i = 0; i < imageResouceInfoArray.length; i++) {
				var imageResourceName = imageResouceInfoArray[i].name;
				var imageOriginalPath = imageResouceInfoArray[i].originalPath;
				var imageResourcePath = imageResouceInfoArray[i].resourcePath;
				var imageResourceURL = browser.extension.getResourceURL(imageResourcePath, imageResourceName);
				var regex = new RegExp(util.escapeRegex(imageOriginalPath + imageResourceName), "g");
				styleText = styleText.replace(regex, imageResourceURL);
			}
		}
		// add style
		browser.extension.addStyle(styleText);
	},
	loadScript: function (scriptPath, scriptName) {
		eval.call(window, browser.extension.getResourceText(scriptPath, scriptName));
	}
}

//------------------------------------
// HV utility object
//------------------------------------
var hv;
var HV = (function () {
	// private static
	var getGaugeRate = function (gaugeElement, gaugeMaxWidth) {
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
	};
	var getCharacterGaugeRate = function (gauge) {
		return getGaugeRate(gauge, 120);
	};
	var Effect = function (effectIconElement) {
	};

	// constructor
	function HV() {
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
			quickcastBar: document.getElementById("quickbar"),
			battleLog: document.getElementById("togpane_log"),
			monsterPane: document.getElementById("monsterpane"),
			roundFinishedMessage: document.querySelector('#battleform div.btcp'),
			characterEffectIcons: document.querySelectorAll('#battleform div.btps img[onmouseover^="battle.set_infopane_effect"]'),
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
			healthRate: getCharacterGaugeRate(document.querySelector('img[alt="health"]')),
			magicRate: getCharacterGaugeRate(document.querySelector('img[alt="magic"]')),
			spiritRate: getCharacterGaugeRate(document.querySelector('img[alt="spirit"]')),
			overchargeRate: getCharacterGaugeRate(document.querySelector('img[alt="overcharge"]')),
			healthPercent: 0,	// refactor -> hvStat
			magicPercent: 0,	// refactor -> hvStat
			spiritPercent: 0,	// refactor -> hvStat
			overchargePercent: 0,	// refactor -> hvStat
		};
		character.healthPercent = util.percent(character.healthRate);
		character.magicPercent = util.percent(character.magicRate);
		character.spiritPercent = util.percent(character.spiritRate);
		character.overchargePercent = util.percent(character.overchargeRate);

		var battle = {
			active: !!elementCache.battleLog,
			finished: false, // TODO
			characterEffects: [],
		};
		battle.round = {
			finished: !!elementCache.roundFinishedMessage,
			monsters: [],
		};

		return {
			location: location,
			elementCache: elementCache,
			settings: settings,
			character: character,
			battle: battle,
		};
	}
	return HV;
})();

//------------------------------------
// HV STAT features
//------------------------------------
var hvStat = {};

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
};

hvStat.setup = {
	addBasicStyle: function () {
		var C = browser.extension.ImageResourceInfo;
		var imageResouces = [
			new C("images/", "channeling.png", "images/"),
			new C("images/", "healthpot.png", "images/"),
			new C("images/", "manapot.png", "images/"),
			new C("images/", "spiritpot.png", "images/"),
		];
		browser.extension.addStyleFromResource("resources/", "hvstat.css", imageResouces);
	},
	addUIStyle: function () {
		var C = browser.extension.ImageResourceInfo;
		var imageResouces = [
			new C("images/", "ui-bg_flat_0_aaaaaa_40x100.png", "images/"),
			new C("images/", "ui-bg_flat_55_fbf9ee_40x100.png", "images/"),
			new C("images/", "ui-bg_flat_65_edebdf_40x100.png", "images/"),
			new C("images/", "ui-bg_flat_75_e3e0d1_40x100.png", "images/"),
			new C("images/", "ui-bg_flat_75_edebdf_40x100.png", "images/"),
			new C("images/", "ui-bg_flat_95_fef1ec_40x100.png", "images/"),
			new C("images/", "ui-icons_2e83ff_256x240.png", "images/"),
			new C("images/", "ui-icons_5c0d11_256x240.png", "images/"),
			new C("images/", "ui-icons_cd0a0a_256x240.png", "images/"),
		];
		browser.extension.addStyleFromResource("resources/", "jquery-ui-1.9.2.custom.min.css", imageResouces);
	},
};

hvStat.setup.battle = {
	addLogStyle: function () {
		var styleName;
		if (_settings.isAltHighlight) {
			styleName = "battle-log-type1.css";
		} else {
			styleName = "battle-log-type0.css";
		}
		browser.extension.addStyleFromResource("resources/", styleName);
	},
	// Copies the text of each Battle Log entry into a title element.
	// This is because CSS cannot currently select text nodes.
	highlightLogText: function () {
		var targets = hv.elementCache.battleLog.querySelectorAll('td:last-of-type');
		Array.prototype.forEach.call(targets, function (e) {
			e.title = e.textContent;
		});
	},
	// Adds a divider between Battle Log rounds.
	addBattleLogDividers: function () {
		var logRows = hv.elementCache.battleLog.getElementsByTagName('tr');
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

var HVStat = {
	//------------------------------------
	// package scope global constants
	//------------------------------------
	VERSION: "5.4.8",
	reMonsterScanResultsTSV: /^(\d+?)\t(.*?)\t(.*?)\t(.*?)\t(\d*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)$/gm,
	reMonsterSkillsTSV: /^(\d+?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)$/gm,
	reSetInfoPaneParameters: /battle\.set_infopane_(?:spell|skill|item|effect)\('((?:[^'\\]|\\.)*)'\s*,\s*'(?:[^'\\]|\\.)*'\s*,\s*(.+)\)/,
	monsterGaugeMaxWidth: 120,

	// temporary localStorage keys (attach the prefix "HVStat" to avoid conflicts with other scripts)
	key_hpAlertAlreadyShown: "HVStatHpAlertAlreadyShown",
	key_mpAlertAlreadyShown: "HVStatMpAlertAlreadyShown",
	key_spAlertAlreadyShown: "HVStatSpAlertAlreadyShown",
	key_ocAlertAlreadyShown: "HVStatOcAlertAlreadyShown",

	// scroll targets
	scrollTargets: [
		// Character
		"stats_pane",
		// Equipment
		"equip_pane",
		// Inventory
		"inv_item", "inv_equip",
		// Battle Inventory, Shop, Forge, Item World
		"item_pane", "shop_pane",
		// Monster Lab
		"slot_pane",
		// Moogle write
		"item", "equip",
		// Arena
		"arena_pane"
	],

	//------------------------------------
	// package scope global variables
	//------------------------------------
	// indexedDB
	idb: null,
	transaction: null,
	idbAccessQueue: null,

	// monster database import/export
	dataURIMonsterScanResults: null,
	dataURIMonsterSkills: null,
	nRowsMonsterScanResultsTSV: 0,
	nRowsMonsterSkillsTSV: 0,

	// battle states
	numberOfMonsters: 0,
	monsters: [],	// instances of HVStat.Monster
	alertQueue: [],

	// keyboard enhancement
	battleCommandMap: null,
	selectedSkillIndex: -1	// -1: not selected, 0-2: selected
};

HV_SETTINGS = "HVSettings";
_settings = null;
loadSettingsObject();

//------------------------------------
// basic classes
//------------------------------------

HVStat.Keyword = function (id, name, abbrNames) {
	var _id = String(id);
	var _name = String(name);
	var i, _abbrNames = [];
	if (abbrNames !== undefined) {
		if (abbrNames instanceof Array) {
			for (i = 0; i < abbrNames.length; i++) {
				_abbrNames[i] = String(abbrNames[i]);
			}
		} else {
			_abbrNames[0] = String(abbrNames);
		}
	}
	return {
		get id() { return _id; },
		get name() { return _name; },
		toString: function (abbrLevel) {
			// if abbrLevel is not set or 0 then return name else return abbreviated name
			abbrLevel = Number(abbrLevel);
			if (isNaN(abbrLevel) || abbrLevel < 0) {
				abbrLevel = 0;
			} else if (abbrLevel >= _abbrNames.length) {
				abbrLevel = _abbrNames.length;
			}
			return (abbrLevel === 0) ? _name : _abbrNames[abbrLevel - 1];
		}
	};
}

HVStat.MonsterClass = (function () {
	var MonsterClass = {};
	var kw = HVStat.Keyword;
	var keywords = [
		new kw("ARTHROPOD", "Arthropod", ["Arth", "Art"]),
		new kw("AVION", "Avion", ["Avio", "Avi"]),
		new kw("BEAST", "Beast", ["Beas", "Bea"]),
		new kw("CELESTIAL", "Celestial", ["Cele", "Cel"]),
		new kw("DAIMON", "Daimon", ["Daim", "Dai"]),
		new kw("DRAGONKIN", "Dragonkin", ["Drag", "Dra"]),
		new kw("ELEMENTAL", "Elemental", ["Elem", "Ele"]),
		new kw("GIANT", "Giant", ["Gian", "Gia"]),
		new kw("HUMANOID", "Humanoid", ["Huma", "Hum"]),
		new kw("MECHANOID", "Mechanoid", ["Mech", "Mec"]),
		new kw("REPTILIAN", "Reptilian", ["Rept", "Rep"]),
		new kw("SPRITE", "Sprite", ["Spri", "Spr"]),
		new kw("UNDEAD", "Undead", ["Unde", "Und"]),
		new kw("COMMON", "Common", ["Comm", "Com"]),
		new kw("UNCOMMON", "Uncommon", ["Unco", "Unc"]),
		new kw("RARE", "Rare", ["Rare", "Rar"]),
		new kw("LEGENDARY", "Legendary", ["Lege", "Leg"]),
		new kw("ULTIMATE", "Ultimate", ["Ulti", "Ult"])
	];
	var i, keyword, len = keywords.length;
	for (i = 0; i < len; i++) {
		keyword = keywords[i];
		MonsterClass[keyword.id] = keyword;
	}
	return MonsterClass;
}());

HVStat.SkillType = (function () {
	var SkillType = {};
	var kw = HVStat.Keyword;
	var keywords = [
		new kw("MANA", "Mana", [""]),
		new kw("SPIRIT", "Spirit", ["Spirit", "S"])
	];
	var i, keyword, len = keywords.length;
	for (i = 0; i < len; i++) {
		keyword = keywords[i];
		SkillType[keyword.id] = keyword;
	}
	return SkillType;
}());

HVStat.AttackType = (function () {
	var AttackType = {};
	var kw = HVStat.Keyword;
	var keywords = [
		new kw("PHYSICAL", "Physical", ["Phys", "Ph", "P"]),
		new kw("MAGICAL", "Magical", ["Mag", "Ma", "M"])
	];
	var i, keyword, len = keywords.length;
	for (i = 0; i < len; i++) {
		keyword = keywords[i];
		AttackType[keyword.id] = keyword;
	}
	return AttackType;
}());

HVStat.DamageType = (function () {
	var DamageType = {};
	var kw = HVStat.Keyword;
	var keywords = [
		new kw("CRUSHING", "Crushing", ["Crush", "Cr"]),
		new kw("SLASHING", "Slashing", ["Slash", "Sl"]),
		new kw("PIERCING", "Piercing", ["Pierc", "Pi"]),
		new kw("FIRE", "Fire", ["Fire", "Fir", "Fi", "F"]),
		new kw("COLD", "Cold", ["Cold", "Col", "Co", "C"]),
		new kw("ELEC", "Elec", ["Elec", "Elc", "El", "E"]),
		new kw("WIND", "Wind", ["Wind", "Win", "Wi", "W"]),
		new kw("HOLY", "Holy", ["Holy", "Hol", "Ho", "H"]),
		new kw("DARK", "Dark", ["Dark", "Dar", "Da", "D"]),
		new kw("SOUL", "Soul", ["Soul", "Sou", "So", "S"]),
		new kw("VOID", "Void", ["Void", "Voi", "Vo", "V"])
	];
	var i, keyword, len = keywords.length;
	for (i = 0; i < len; i++) {
		keyword = keywords[i];
		DamageType[keyword.id] = keyword;
	}
	return DamageType;
}());

HVStat.GenericDamageType = (function () {
	var GenericDamageType = {};
	var kw = HVStat.Keyword;
	var keywords = [
		new kw("PHYSICAL", "Physical", ["Phys", "Ph"]),
		new kw("ELEMENTAL", "Elemental", ["Elem", "El"])
	];
	var i, keyword, len = keywords.length;
	for (i = 0; i < len; i++) {
		keyword = keywords[i];
		GenericDamageType[keyword.id] = keyword;
	}
	return GenericDamageType;
}());

HVStat.DefenceLevel = (function () {
	var DefenceLevel = {};
	var kw = HVStat.Keyword;
	var keywords = [
		new kw("WEAK", "Weak"),
		new kw("AVERAGE", "Average"),
		new kw("RESISTANT", "Resistant"),
		new kw("IMPERVIOUS", "Impervious")
	];
	var i, keyword, len = keywords.length;
	for (i = 0; i < len; i++) {
		keyword = keywords[i];
		DefenceLevel[keyword.id] = keyword;
	}
	return DefenceLevel;
}());

HVStat.Debuff = (function () {
	var Debuff = {};
	var kw = HVStat.Keyword;
	var keywords = [
		new kw("IMPERILED", "Imperiled"),
		new kw("DEEP_BURNS", "Deep Burns"),
		new kw("TURBULENT_AIR", "Turbulent Air"),
		new kw("FREEZING_LIMBS", "Freezing Limbs"),
		new kw("SEARING_SKIN", "Searing Skin"),
		new kw("BREACHED_DEFENSE", "Breached Defense"),
		new kw("BLUNTED_ATTACK", "Blunted Attack")
	];
	var i, keyword, len = keywords.length;
	for (i = 0; i < len; i++) {
		keyword = keywords[i];
		Debuff[keyword.id] = keyword;
	}
	return Debuff;
}());

HVStat.delimiter = new HVStat.Keyword("DELIMITER", ", ", [","]);

//------------------------------------
// value objects
//------------------------------------

HVStat.DefenceLevelVO = function () {
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
	this.defenceLevel = new HVStat.DefenceLevelVO();
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
		dl = HVStat.DefenceLevel[spec.defCrushing.toUpperCase()];
		if (dl) {
			this.defenceLevel.CRUSHING = dl.id;
		}
		dl = HVStat.DefenceLevel[spec.defSlashing.toUpperCase()];
		if (dl) {
			this.defenceLevel.SLASHING = dl.id;
		}
		dl = HVStat.DefenceLevel[spec.defPiercing.toUpperCase()];
		if (dl) {
			this.defenceLevel.PIERCING = dl.id;
		}
		dl = HVStat.DefenceLevel[spec.defFire.toUpperCase()];
		if (dl) {
			this.defenceLevel.FIRE = dl.id;
		}
		dl = HVStat.DefenceLevel[spec.defCold.toUpperCase()];
		if (dl) {
			this.defenceLevel.COLD = dl.id;
		}
		dl = HVStat.DefenceLevel[spec.defElec.toUpperCase()];
		if (dl) {
			this.defenceLevel.ELEC = dl.id;
		}
		dl = HVStat.DefenceLevel[spec.defWind.toUpperCase()];
		if (dl) {
			this.defenceLevel.WIND = dl.id;
		}
		dl = HVStat.DefenceLevel[spec.defHoly.toUpperCase()];
		if (dl) {
			this.defenceLevel.HOLY = dl.id;
		}
		dl = HVStat.DefenceLevel[spec.defDark.toUpperCase()];
		if (dl) {
			this.defenceLevel.DARK = dl.id;
		}
		dl = HVStat.DefenceLevel[spec.defSoul.toUpperCase()];
		if (dl) {
			this.defenceLevel.SOUL = dl.id;
		}
		dl = HVStat.DefenceLevel[spec.defVoid.toUpperCase()];
		if (dl) {
			this.defenceLevel.VOID = dl.id;
		}
		if (spec.debuffsAffected) {
			debuffs = spec.debuffsAffected.replace(" ", "").split(", ");
			for (i = 0; i < debuffs.length; i++) {
				debuff = HVStat.Debuff[debuffs[i].toUpperCase()];
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
		(this.name !== null) ? this.name : "",	// must not be null
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
// utility functions
//------------------------------------

HVStat.getDateTimeString = function (date) {
	if (browser.isChrome) {
		// see http://code.google.com/p/chromium/issues/detail?id=3607
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
// classes
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
	// constructor
	function MonsterSkill(vo) {
		var _name = vo.name || null;
		var _lastUsedDate = vo.lastUsedDate ? new Date(vo.lastUsedDate) : null;
		var _skillType = HVStat.SkillType[vo.skillType] || null;
		var _attackType = HVStat.AttackType[vo.attackType] || null;
		var _damageType = HVStat.DamageType[vo.damageType] || null;

		return {
			get name() { return _name; },
			get lastUsedDate() { return _lastUsedDate; },
			set lastUsedDate(date) { _lastUsedDate = date; },
			get skillType() { return _skillType; },
			get attackType() { return _attackType; },
			get damageType() { return _damageType; },
			get valueObject() {
				var vo = new HVStat.MonsterSkillVO();
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

	// public static method
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
			vo.attackType = HVStat.AttackType.PHYSICAL.id;
			break;
		case "casts":
			vo.attackType = HVStat.AttackType.MAGICAL.id;
			break;
		default:
			vo.attackType = null;
		}
		r = / ([A-Za-z]+) damage/.exec(logDamaged);
		if (!r || r.length < 2) {
			return null;
		}
		var dt = HVStat.DamageType[r[1].toUpperCase()];
		vo.damageType = dt ? dt.id : null;
		vo.lastUsedDate = new Date();
		return new MonsterSkill(vo);
	};

	return MonsterSkill;
}());

HVStat.MonsterScanResults = (function () {
	// private static variable
	var _mappingToSettingsHideSpecificDamageType = [
		HVStat.DamageType.CRUSHING,
		HVStat.DamageType.SLASHING,
		HVStat.DamageType.PIERCING,
		HVStat.DamageType.FIRE,
		HVStat.DamageType.COLD,
		HVStat.DamageType.ELEC,
		HVStat.DamageType.WIND,
		HVStat.DamageType.HOLY,
		HVStat.DamageType.DARK,
		HVStat.DamageType.SOUL,
		HVStat.DamageType.VOID
	];
	var _damageTypeGeneralizingTable = [
		{
			generic: HVStat.GenericDamageType.PHYSICAL,
			elements: [
				HVStat.DamageType.CRUSHING,
				HVStat.DamageType.SLASHING,
				HVStat.DamageType.PIERCING
			]
		},
		{
			generic: HVStat.GenericDamageType.ELEMENTAL,
			elements: [
				HVStat.DamageType.FIRE,
				HVStat.DamageType.COLD,
				HVStat.DamageType.ELEC,
				HVStat.DamageType.WIND
			]
		}
	];

	var _damageTypesToBeHidden = [];
	(function () {
		var i, len = _mappingToSettingsHideSpecificDamageType.length;
		for (i = 0; i < len; i++) {
			if (_settings.hideSpecificDamageType[i]) {
				_damageTypesToBeHidden.push(_mappingToSettingsHideSpecificDamageType[i]);
			}
		}
	})();

	// constructor
	function MonsterScanResults(vo) {
		var _lastScanDate;
		var _monsterClass;
		var _powerLevel;
		var _trainer;
		var _meleeAttack;
		var _defenceLevel = {};
		var _debuffsAffected = [];
		var _defWeak = [];
		var _defResistant = [];
		var _defImpervious = [];
		var damageTypeId, debuffId;

		_powerLevel = vo.powerLevel || null;
		_trainer = vo.trainer || null;
		_lastScanDate = vo.lastScanDate ? new Date(vo.lastScanDate) : null;
		_monsterClass = HVStat.MonsterClass[vo.monsterClass] || null;
		_meleeAttack = HVStat.DamageType[vo.meleeAttack] || null;

		for (damageTypeId in HVStat.DamageType) {
			_defenceLevel[damageTypeId] = HVStat.DefenceLevel[vo.defenceLevel[damageTypeId]] || null;
		}
		for (damageTypeId in _defenceLevel) {
			switch (_defenceLevel[damageTypeId]) {
			case HVStat.DefenceLevel.WEAK:
				_defWeak.push(HVStat.DamageType[damageTypeId]);
				break;
			case HVStat.DefenceLevel.RESISTANT:
				_defResistant.push(HVStat.DamageType[damageTypeId]);
				break;
			case HVStat.DefenceLevel.IMPERVIOUS:
				_defImpervious.push(HVStat.DamageType[damageTypeId]);
				break;
			}
		}
		for (var i in vo.debuffsAffected) {
			_debuffsAffected.push(HVStat.Debuff[vo.debuffsAffected[i]]);
		}

		// private instance method
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
			var delimiter = HVStat.delimiter.toString(abbrLevel);
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
			get defenceLevel() {
				var i, dl = {};
				for (i in _defenceLevel) {
					dl[i] = _defenceLevel[i];
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
				vo.lastScanDate = _lastScanDate ? _lastScanDate.toISOString() : null;
				vo.monsterClass = _monsterClass ? _monsterClass.id : null;
				vo.powerLevel = _powerLevel;
				vo.trainer = _trainer;
				vo.meleeAttack = _meleeAttack ? _meleeAttack.id : null;
				for (i in _defenceLevel) {
					vo.defenceLevel[i] = _defenceLevel[i].id;
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

	// public static method
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
					vo.defenceLevel[element] = HVStat.DefenceLevel.WEAK.id;
				}
			});
		}
		var defResistant = result[8] || null;
		if (defResistant) {
			array = defResistant.toUpperCase().split(", ");
			array.forEach(function (element, index, array) {
				if (element !== "NOTHING") {
					vo.defenceLevel[element] = HVStat.DefenceLevel.RESISTANT.id;
				}
			});
		}
		var defImpervious = result[9] || null;
		if (defImpervious) {
			array = defImpervious.toUpperCase().split(", ");
			array.forEach(function (element, index, array) {
				if (element !== "NOTHING") {
					vo.defenceLevel[element] = HVStat.DefenceLevel.IMPERVIOUS.id;
				}
			});
		}
		vo.debuffsAffected = [];
		var i, debuffElements, debuffInfo, debuffId;
		debuffElements = document.querySelectorAll("#" + HVStat.Monster.getDomElementId(index) + " div.btm6 > img");
		for (i = 0; i < debuffElements.length; i++) {
			debuffInfo = debuffElements[i].getAttribute("onmouseover");
			for (debuffId in HVStat.Debuff) {
				if (debuffInfo.indexOf(HVStat.Debuff[debuffId].name) >= 0) {
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
				if (skill.skillType === HVStat.SkillType.MANA) {
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
				if (skill.skillType === HVStat.SkillType.SPIRIT) {
					return skill;
				}
			}
			return null;
		};
		var _renderStats = function () {
			if (_isDead) {
				return;
			}
			if (!(_settings.showMonsterHP
					|| _settings.showMonsterMP
					|| _settings.showMonsterSP
					|| _settings.showMonsterInfoFromDB)) {
				return;
			}

			var nameOuterFrameElement = _baseElement.children[1];
			var nameInnerFrameElement = _baseElement.children[1].children[0];
			var maxAbbrLevel = _settings.ResizeMonsterInfo ? 5 : 1;
			var maxStatsWidth = 315;

			var html, statsHtml;
			var div;
			var abbrLevel;

			if (_settings.showMonsterInfoFromDB) {
				for (abbrLevel = 0; abbrLevel < maxAbbrLevel; abbrLevel++) {
					statsHtml = '';
					if (!_scanResult || !_scanResult.monsterClass) {
						statsHtml = '[<span class="hvstat-monster-status-unknown">NEW</span>]';
					} else {
						// class and power level
						if (_settings.showMonsterClassFromDB || _settings.showMonsterPowerLevelFromDB) {
							statsHtml += '{';
						}
						if (_settings.showMonsterClassFromDB) {
							statsHtml += '<span class="hvstat-monster-status-class">';
							statsHtml += _scanResult.monsterClass.toString(abbrLevel);
							statsHtml += '</span>';
						}
						if (_settings.showMonsterPowerLevelFromDB && _scanResult.powerLevel) {
							if (_settings.showMonsterClassFromDB) {
								statsHtml += HVStat.delimiter.toString(abbrLevel);
							}
							statsHtml += '<span class="hvstat-monster-status-power-level">';
							statsHtml += _scanResult.powerLevel + '+';
							statsHtml += '</span>';
						}
						if (_settings.showMonsterClassFromDB || _settings.showMonsterPowerLevelFromDB) {
							statsHtml += '}';
						}
						// weaknesses and resistances
						if (_settings.showMonsterWeaknessesFromDB || _settings.showMonsterResistancesFromDB) {
							statsHtml += '[';
						}
						if (_settings.showMonsterWeaknessesFromDB) {
							statsHtml += '<span class="hvstat-monster-status-weakness">';
							statsHtml += (_scanResult.defWeak.length > 0) ? _scanResult.getDefWeakString(true, true, abbrLevel) : "-";
							statsHtml += '</span>';
						}
						if (_settings.showMonsterResistancesFromDB) {
							if (_settings.showMonsterWeaknessesFromDB) {
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
						if (_settings.showMonsterWeaknessesFromDB || _settings.showMonsterResistancesFromDB) {
							statsHtml += "]";
						}
						// melee attack and skills
						if (_settings.showMonsterAttackTypeFromDB) {
							statsHtml += '(<span class="hvstat-monster-status-melee-attack-type">';
							statsHtml += _scanResult.meleeAttack.toString(abbrLevel > 0 ? abbrLevel : 1);
							statsHtml += '</span>';
							var manaSkills = _getManaSkills();
							var manaSkillsExist = manaSkills.length > 0;
							if (manaSkillsExist) {
								statsHtml += ';<span class="hvstat-monster-status-magic-skill-attack-type">';
							}
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
												statsHtml += HVStat.AttackType[attackType].toString(abbrLevel > 0 ? abbrLevel : 1) + '-';
											} else {
												statsHtml += HVStat.delimiter.toString(abbrLevel);
											}
											statsHtml += HVStat.DamageType[damageType].toString(abbrLevel > 0 ? abbrLevel : 1);
											damageTypeCount++;
										}
									}
									attackTypeCount++;
								}
							}
							if (manaSkillsExist) {
								statsHtml += '</span>';
							}
							var spiritSkill = _getSpiritSkill();
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
							statsHtml += ')';
						}
					}
					if (hv.settings.useHVFontEngine) {
						nameOuterFrameElement.style.width = "auto"; // tweak for Firefox
						nameInnerFrameElement.style.width = "auto"; // tweak for Firefox
						div = document.createElement("div");
						div.className ="hvstat-monster-status-on-hv-font";
						div.innerHTML = statsHtml;
						nameInnerFrameElement.parentNode.insertBefore(div, nameInnerFrameElement.nextSibling);
						//console.log("scrollWidth = " + div.prop("scrollWidth"));
						if (Number(nameOuterFrameElement.scrollWidth) <= maxStatsWidth) {	// does not work with Firefox without tweak
							break;
						} else if (abbrLevel < maxAbbrLevel - 1) {
							// revert
							nameInnerFrameElement.parentNode.removeChild(div);
						}
					} else {
						html = '<div class="hvstat-monster-status-on-custom-font">' + statsHtml + "</div>";
						var nameElement = nameInnerFrameElement.children[0];
						var name = nameElement.innerHTML;
						nameOuterFrameElement.style.width = "auto"; // tweak for Firefox
						nameInnerFrameElement.style.width = "auto"; // tweak for Firefox
						nameElement.innerHTML = name + html;
						nameElement.style.whiteSpace = "nowrap";
						//console.log("scrollWidth = " + nameElement.prop("scrollWidth"));
						if (Number(nameElement.scrollWidth) <= maxStatsWidth) {	// does not work with Firefox without tweak
							break;
						} else if (_settings.ResizeMonsterInfo) {
							// revert
							nameElement.innerHTML = name;
							if (abbrLevel >= maxAbbrLevel - 1) {
								// reduce name length
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
								html += HVStat.AttackType[attackType].name + '-' + HVStat.DamageType[damageType].name;
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

			// public instance methods
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
				var skillType = (_prevSpRate <= _currSpRate) ? HVStat.SkillType.MANA : HVStat.SkillType.SPIRIT;
				var skill = HVStat.MonsterSkill.fetchSkillLog(used, damaged, skillType);
				if (skillType === HVStat.SkillType.SPIRIT) {
					// spirit skill
					// overwrite if exists
					for (i = 0; i < _skills.length; i++) {
						if (_skills[i].skillType ===  HVStat.SkillType.SPIRIT) {
							break;
						}
					}
					_skills[i] = skill;
				} else {
					// mana skill
					// overwrite if same name or name is null
					for (i = 0; i < _skills.length; i++) {
						if (_skills[i].skillType ===  HVStat.SkillType.MANA
								&& (_skills[i].name === skill.name
									|| (_skills[i].name === null && _skills[i].attackType === skill.attackType && _skills[i].damageType === skill.damageType))) {
							break;
						}
					}
					_skills[i] = skill;
				}
				if (_settings.isRememberSkillsTypes) {
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
					if (event.target.result === undefined) {
						//console.log("get from MonsterScanResults: not found: id = " + _id);
					} else {
						//console.log("get from MonsterScanResults: success: id = " + _id);
						_scanResult = new HVStat.MonsterScanResults(event.target.result);
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
						_skills.push(new HVStat.MonsterSkill(cursor.value));
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
				// put after delete
				var skillsStore = transaction.objectStore("MonsterSkills");
				var range = IDBKeyRange.bound(_id, _id);
				var reqOpen = skillsStore.openCursor(range, "next");
				reqOpen.onsuccess = function () {
					var i;
					var vo;
					var reqPut;
					var cursor = this.result;
					if (cursor) {
						// delete
						cursor.delete();
						cursor.continue();
					} else {
						// put
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
				if (this.isDead || !_settings.showMonsterHP && !_settings.showMonsterMP && !_settings.showMonsterSP) {
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

				if (_settings.showMonsterHP || _settings.showMonsterHPPercent) {
					div = document.createElement("div");
					div.className = "hvstat-monster-health";
					if (_settings.showMonsterHPPercent) {
						hpIndicator = (this.currHpRate * 100).toFixed(2) + "%";
					} else if (this.currHp && this.maxHp) {
						hpIndicator = this.currHp.toFixed(0) + " / " + this.maxHp.toFixed(0);
					}
					div.textContent = hpIndicator;
					hpBarBaseElement.parentNode.insertBefore(div, hpBarBaseElement.nextSibling);
				}
				if (_settings.showMonsterMP) {
					div = document.createElement("div");
					div.className = "hvstat-monster-magic";
					mpIndicator = (this.currMpRate * 100).toFixed(1) + "%";
					div.textContent = mpIndicator;
					mpBarBaseElement.parentNode.insertBefore(div, mpBarBaseElement.nextSibling);
				}
				if (_settings.showMonsterSP && this.hasSpiritPoint) {
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

	// public static method
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
	// close connection
	HVStat.transaction = null;
	HVStat.idb = null;

	// delete database
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

	var idbVersion = 1; // must be an integer
	var reqOpen = indexedDB.open("HVStat", idbVersion);
	reqOpen.onerror = function (event) {
		errorMessage = "Database open error: " + event.target.errorCode;
		alert(errorMessage);
		console.log(errorMessage);
	};
	// latest W3C draft (Firefox and Chrome 23 or later)
	reqOpen.onupgradeneeded = function (event) {
		console.log("onupgradeneeded");
		HVStat.idb = reqOpen.result;
		HVStat.maintainObjectStores(event);
		// subsequently onsuccess event handler is called automatically
	};
	reqOpen.onsuccess = function (event) {
		var idb = HVStat.idb = reqOpen.result;
		if (Number(idb.version) === idbVersion) {
			// always come here if Firefox and Chrome 23 or later
			if (callback instanceof Function) {
				callback(event);
			}
		} else {
			// obsolete Chrome style (Chrome 22 or earlier)
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
	var range = null; // select all
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
	var range = null; // select all
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
	var range = null; // select all
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
			texts[count] = vo.id
				+ tab + (vo.lastScanDate !== null ? vo.lastScanDate : "")
				+ tab + (vo.name !== null ? vo.name : "")
				+ tab + (vo.monsterClass !== null ? vo.monsterClass : "")
				+ tab + (vo.powerLevel !== null ? vo.powerLevel : "")
				+ tab + (vo.trainer !== null ? vo.trainer : "")
				+ tab + (vo.meleeAttack !== null ? vo.meleeAttack : "")
				+ tab + (vo.defenceLevel && vo.defenceLevel.CRUSHING ? vo.defenceLevel.CRUSHING : "")
				+ tab + (vo.defenceLevel && vo.defenceLevel.SLASHING ? vo.defenceLevel.SLASHING : "")
				+ tab + (vo.defenceLevel && vo.defenceLevel.PIERCING ? vo.defenceLevel.PIERCING : "")
				+ tab + (vo.defenceLevel && vo.defenceLevel.FIRE ? vo.defenceLevel.FIRE : "")
				+ tab + (vo.defenceLevel && vo.defenceLevel.COLD ? vo.defenceLevel.COLD : "")
				+ tab + (vo.defenceLevel && vo.defenceLevel.ELEC ? vo.defenceLevel.ELEC : "")
				+ tab + (vo.defenceLevel && vo.defenceLevel.WIND ? vo.defenceLevel.WIND : "")
				+ tab + (vo.defenceLevel && vo.defenceLevel.HOLY ? vo.defenceLevel.HOLY : "")
				+ tab + (vo.defenceLevel && vo.defenceLevel.DARK ? vo.defenceLevel.DARK : "")
				+ tab + (vo.defenceLevel && vo.defenceLevel.SOUL ? vo.defenceLevel.SOUL : "")
				+ tab + (vo.defenceLevel && vo.defenceLevel.VOID ? vo.defenceLevel.VOID : "")
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
	var range = null; // select all
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

		// prescan
		HVStat.reMonsterScanResultsTSV.lastIndex = 0;
		rowCount = 0;
		while ((result = HVStat.reMonsterScanResultsTSV.exec(contents)) !== null) {
			rowCount++;
		}

		// import
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

		// prescan
		HVStat.reMonsterSkillsTSV.lastIndex = 0;
		rowCount = 0;
		while ((result = HVStat.reMonsterSkillsTSV.exec(contents)) !== null) {
			rowCount++;
		}

		// import
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
// migration functions
//------------------------------------
// finally to be obsolete

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
		return HVStat.MonsterClass[key];
	} else {
		return null;
	}
};

HVStat.migration.skillTypeFromCode = function (code) {
	code = String(code);
	var st = HVStat.SkillType;
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
	var at = HVStat.AttackType;
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
			array.push(HVStat.DamageType[key]);
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
	// defenceLevel
	vo.defenceLevel = new HVStat.DefenceLevelVO();
	v = HVStat.migration.damageTypeFromCode(oldDB.mweak[index]);
	len = v.length;
	for (i = 0; i < len; i++) {
		vo.defenceLevel[v[i].id] = HVStat.DefenceLevel.WEAK.id;
	}
	v = HVStat.migration.damageTypeFromCode(oldDB.mresist[index]);
	len = v.length;
	for (i = 0; i < len; i++) {
		vo.defenceLevel[v[i].id] = HVStat.DefenceLevel.RESISTANT.id;
	}
	v = HVStat.migration.damageTypeFromCode(oldDB.mimperv[index]);
	len = v.length;
	for (i = 0; i < len; i++) {
		vo.defenceLevel[v[i].id] = HVStat.DefenceLevel.IMPERVIOUS.id;
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
// battle command wrapper
//------------------------------------

HVStat.KeyCombination = function (spec) {
	this.altKey = spec && spec.altKey || false;
	this.ctrlKey = spec && spec.ctrlKey || false;
	this.shiftKey = spec && spec.shiftKey || false;
	this.keyCode = spec && spec.keyCode || 0;
}

HVStat.KeyCombination.prototype.equals = function (obj) {
	if (!obj) {
		return false;
	}
	return this.altKey === obj.altKey
		&& this.ctrlKey === obj.ctrlKey
		&& this.shiftKey === obj.shiftKey
		&& this.keyCode === obj.keyCode;
};

HVStat.KeyCombination.prototype.toString = function () {
	var s = "";
	if (this.altKey) {
		s += "ALT+";
	}
	if (this.ctrlKey) {
		s += "CTRL+";
	}
	if (this.shiftKey) {
		s += "SHIFT+";
	}
	s += String(this.keyCode);
};

HVStat.BattleCommandMenuItem = function (spec) {
	this.parent = spec && spec.parent || null;
	this.element = spec && spec.element || null;
	var onmouseover = this.element.getAttribute("onmouseover").toString();
	var result = HVStat.reSetInfoPaneParameters.exec(onmouseover);
	if (!result || result.length < 3) {
		return null;
	}
	this.name = result[1];
	this.id = this.element && this.element.id || "";
	this.boundKeys = [];
	this.commandTarget = null;

	var onclick = this.element.getAttribute("onclick").toString();
	if (onclick.indexOf("friendly") >= 0) {
		this.commandTarget = "self";
	} else if (onclick.indexOf("hostile") >= 0) {
		this.commandTarget = "enemy";
	}
};

HVStat.BattleCommandMenuItem.prototype = {
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

HVStat.BattleCommandMenu = function (spec) {
	this.parent = spec && spec.parent || null;
	this.elementId = spec && spec.elementId || null;
	this.element = this.elementId && document.getElementById(this.elementId) || null;

	this.items = [];
	var itemElements = this.element.querySelectorAll("div.btsd, #ikey_p, img.btii");
	var i;
	for (i = 0; i < itemElements.length; i++) {
		this.items[i] = new HVStat.BattleCommandMenuItem({ parent: this, element: itemElements[i] });
	}
};

HVStat.BattleCommandMenu.prototype = {
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

HVStat.BattleCommand = function (spec) {
	this.elementId = spec && spec.elementId || null;
	this.name = spec && spec.name || "";
	this.menuElementIds = spec && spec.menuElementIds || [];
	this.element = this.elementId && document.getElementById(this.elementId) || null;
	this.menus = [];

	// build menus
	var i;
	for (i = 0; i < this.menuElementIds.length; i++) {
		this.menus[i] = new HVStat.BattleCommandMenu({ parent: this, elementId: this.menuElementIds[i] });
	}
};

HVStat.BattleCommand.prototype = {
	get hasMenu() { return this.menus.length > 0; },
	get menuOpened() {
		var i;
		for (i = 0; i < this.menus.length; i++) {
			if (this.menus[i].opened) {
				return true;
			}
		}
		return false;
	},
	get selectedMenu() {
		var i;
		for (i = 0; i < this.menus.length; i++) {
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

HVStat.buildBattleCommandMap = function () {
	HVStat.battleCommandMap = {
		"Attack": new HVStat.BattleCommand({ elementId: "ckey_attack", name: "Attack" }),
		"Magic": new HVStat.BattleCommand({ elementId: "ckey_magic", name: "Magic", menuElementIds: ["togpane_magico", "togpane_magict"] }),
		"Spirit": new HVStat.BattleCommand({ elementId: "ckey_spirit", name: "Spirit" }),
		"Skills": new HVStat.BattleCommand({ elementId: "ckey_skills", name: "Skills", menuElementIds: ["togpane_skill"] }),
		"Items": new HVStat.BattleCommand({ elementId: "ckey_items", name: "Items", menuElementIds: ["togpane_item"] }),
		"Defend": new HVStat.BattleCommand({ elementId: "ckey_defend", name: "Defend" }),
		"Focus": new HVStat.BattleCommand({ elementId: "ckey_focus", name: "Focus" })
	};
};

HVStat.getBattleCommandMenuItemById = function (commandMenuItemId) {
	var key, menus, i, items, j;
	for (key in HVStat.battleCommandMap) {
		menus = HVStat.battleCommandMap[key].menus;
		for (i = 0; i < menus.length; i++) {
			items = menus[i].items;
			for (j = 0; j < items.length; j++) {
				if (items[j].id === commandMenuItemId) {
					return items[j];
				}
			}
		}
	}
	return null;
};

HVStat.getBattleCommandMenuItemByName = function (commandMenuItemName) {
	var key, menus, i, items, j;
	for (key in HVStat.battleCommandMap) {
		menus = HVStat.battleCommandMap[key].menus;
		for (i = 0; i < menus.length; i++) {
			items = menus[i].items;
			for (j = 0; j < items.length; j++) {
				if (items[j].name === commandMenuItemName) {
					return items[j];
				}
			}
		}
	}
	return null;
};

HVStat.getBattleCommandMenuItemsByBoundKey = function (keyCombination) {
	var foundItems = [];
	var key, menus, i, items, j, boundKeys, k;
	for (key in HVStat.battleCommandMap) {
		menus = HVStat.battleCommandMap[key].menus;
		for (i = 0; i < menus.length; i++) {
			items = menus[i].items;
			for (j = 0; j < items.length; j++) {
				boundKeys = items[j].boundKeys;
				for (k = 0; k < boundKeys.length; k++) {
					if (boundKeys[k].equals(keyCombination)) {
						foundItems.push(items[j]);
					}
				}
			}
		}
	}
	return foundItems;
};

HVStat.buildBattleCommandMenuItemMap = function () {
	HVStat.battleCommandMenuItemMap = {
		"PowerupGem": HVStat.getBattleCommandMenuItemById("ikey_p"),
		"Scan": HVStat.getBattleCommandMenuItemByName("Scan"),
		"Skill1": HVStat.getBattleCommandMenuItemById("110001")
			|| HVStat.getBattleCommandMenuItemById("120001")
			|| HVStat.getBattleCommandMenuItemById("130001")
			|| HVStat.getBattleCommandMenuItemById("140001")
			|| HVStat.getBattleCommandMenuItemById("150001"),
		"Skill2": HVStat.getBattleCommandMenuItemById("110002")
			|| HVStat.getBattleCommandMenuItemById("120002")
			|| HVStat.getBattleCommandMenuItemById("130002")
			|| HVStat.getBattleCommandMenuItemById("140002")
			|| HVStat.getBattleCommandMenuItemById("150002"),
		"Skill3": HVStat.getBattleCommandMenuItemById("110003")
			|| HVStat.getBattleCommandMenuItemById("120003")
			|| HVStat.getBattleCommandMenuItemById("130003")
			|| HVStat.getBattleCommandMenuItemById("140003")
			|| HVStat.getBattleCommandMenuItemById("150003"),
		"OFC": HVStat.getBattleCommandMenuItemByName("Orbital Friendship Cannon")
	};
	if (HVStat.battleCommandMenuItemMap["Scan"]) {
		HVStat.battleCommandMenuItemMap["Scan"].bindKeys([
			new HVStat.KeyCombination({ keyCode: 46 }),		// Delete
			new HVStat.KeyCombination({ keyCode: 110 })		// Numpad . Del
		]);
	}
	if (HVStat.battleCommandMenuItemMap["Skill1"]) {
		HVStat.battleCommandMenuItemMap["Skill1"].bindKeys([
			new HVStat.KeyCombination({ keyCode: 107 }),	// Numpad +
			new HVStat.KeyCombination({ keyCode: 187 })		// = +
		]);
	}
	if (HVStat.battleCommandMenuItemMap["OFC"]) {
		HVStat.battleCommandMenuItemMap["OFC"].bindKeys([
			new HVStat.KeyCombination({ keyCode: 109 }),	// Numpad -
			new HVStat.KeyCombination({ keyCode: 189 })		// - _
		]);
	}
};

//------------------------------------
// legacy codes
//------------------------------------

/* ========== GLOBAL VARIABLES ========== */
HV_OVERVIEW = "HVOverview";
HV_STATS = "HVStats";
HV_PROF = "HVProf";
HV_REWARDS = "HVRewards";
HV_SHRINE = "HVShrine";
HV_DROPS = "HVDrops";
HV_ROUND = "HVRound";
HV_EQUIP = "inventoryAlert";
HV_DBASE = "HVMonsterDatabase";
HV_COLL = "HVCollectData";
HV_CHSS = "HVCharacterSettingsandStats";
HV_TAGS = "HVTags";
HOURLY = 0;
ARENA = 1;
GRINDFEST = 2;
ITEM_WORLD = 3;
_overview = null;
_stats = null;
_profs = null;
_rewards = null;
_shrine = null;
_drops = null;
_round = null;
_backup = [null, null, null, null, null, null];
_database = null;
_charss = null;
_tags = null;
_isMenuInitComplete = false;
_equips = 0;
_lastEquipName = "";
_artifacts = 0;
_lastArtName = "";
_tokenDrops = [0, 0, 0];

/* =====
 showRoundCounter
 Adds a Round counter to the Battle screen.
===== */
function showRoundCounter() {
	var doc = document,
		curRound = _round.currRound,
		maxRound = _round.maxRound,
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
}
/* =====
 displayPowerupBox
 Adds a Powerup box to the Battle screen.
 Creates a shortcut to the powerup if one is available.
===== */
function displayPowerupBox() {
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
			HVStat.battleCommandMenuItemMap["PowerupGem"].select();
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
}
function showMonsterHealth() {
	for (var i = 0; i < HVStat.numberOfMonsters; i++) {
		HVStat.monsters[i].renderHealth();
	}
}
function showMonsterStats() {
	for (var i = 0; i < HVStat.numberOfMonsters; i++) {
		HVStat.monsters[i].renderStats();
	}
}

function showMonsterEffectsDuration() {
	for (var i = 0; i < HVStat.numberOfMonsters; i++) {
		var baseElement = document.getElementById(HVStat.Monster.getDomElementId(i));
		var effectIcons = baseElement.querySelectorAll('img[onmouseover^="battle.set_infopane_effect"]');
		for (var j = 0; j < effectIcons.length; j++) {
			var badge = createDurationBadge(effectIcons[j]);
			if (badge) {
				badge.className += " hvstat-duration-badge-monster";
			}
		}
	}
}

function showSelfEffectsDuration() {
	var effectIcons = document.querySelectorAll('#battleform div.btps img[onmouseover^="battle.set_infopane_effect"]');
	for (var i = 0; i < effectIcons.length; i++) {
		var badge = createDurationBadge(effectIcons[i]);
		if (badge) {
			badge.className += " hvstat-duration-badge-player";
		}
	}
}

function createDurationBadge(effectIcon) {
	var result = HVStat.reSetInfoPaneParameters.exec(effectIcon.getAttribute("onmouseover"));
	if (!result || result.length < 3) {
		return;
	}
	var duration = parseFloat(result[2]);
	if (isNaN(duration)) {
		return;
	}
	var badgeBase = document.createElement("div");
	badgeBase.className = "hvstat-duration-badge";
	if (_settings.isSelfEffectsWarnColor) {
		if (duration <= Number(_settings.SelfWarnRedRounds)) {
			badgeBase.className += " hvstat-duration-badge-red-alert";
		} else if (duration <= Number(_settings.SelfWarnOrangeRounds)) {
			badgeBase.className += " hvstat-duration-badge-yellow-alert";
		}
	}
	var badge = badgeBase.appendChild(document.createElement('div'));
	badge.textContent = String(duration);
	effectIcon.parentNode.insertBefore(badgeBase, effectIcon.nextSibling);
	return badgeBase;
}

function showBattleEndStats() {
	var battleLog = document.getElementById("togpane_log");
	battleLog.innerHTML = "<div class='ui-state-default ui-corner-bottom' style='padding:10px;margin-bottom:10px;text-align:left'>" + getBattleEndStatsHtml() + "</div>" + battleLog.innerHTML;
}

function showMonsterNumber() {
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
}

HVStat.highlightQuickcast = function () {
	var healthYellowLevel = Number(_settings.warnOrangeLevel);
	var healthRedLevel = Number(_settings.warnRedLevel);
	var magicYellowLevel = Number(_settings.warnOrangeLevelMP);
	var magicRedLevel = Number(_settings.warnRedLevelMP);
	var spiritYellowLevel = Number(_settings.warnOrangeLevelSP);
	var spiritRedLevel = Number(_settings.warnRedLevelSP);
	if (hv.character.healthPercent <= healthRedLevel) {
		hv.elementCache.quickcastBar.className += " hvstat-health-red-alert";
	} else if (hv.character.healthPercent <= healthYellowLevel) {
		hv.elementCache.quickcastBar.className += " hvstat-health-yellow-alert";
	} else if (hv.character.magicPercent <= magicRedLevel) {
		hv.elementCache.quickcastBar.className += " hvstat-magic-red-alert";
	} else if (hv.character.magicPercent <= magicYellowLevel) {
		hv.elementCache.quickcastBar.className += " hvstat-magic-yellow-alert";
	} else if (hv.character.spiritPercent <= spiritRedLevel) {
		hv.elementCache.quickcastBar.className += " hvstat-spirit-red-alert";
	} else if (hv.character.spiritPercent <= spiritYellowLevel) {
		hv.elementCache.quickcastBar.className += " hvstat-spirit-yellow-alert";
	}
}

HVStat.warnHealthStatus = function () {
	var hpAlertAlreadyShown = !!localStorage.getItem(HVStat.key_hpAlertAlreadyShown);
	var mpAlertAlreadyShown = !!localStorage.getItem(HVStat.key_mpAlertAlreadyShown);
	var spAlertAlreadyShown = !!localStorage.getItem(HVStat.key_spAlertAlreadyShown);
	var ocAlertAlreadyShown = !!localStorage.getItem(HVStat.key_ocAlertAlreadyShown);
	var hpWarningLevel = Number(_settings.warnAlertLevel);
	var mpWarningLevel = Number(_settings.warnAlertLevelMP);
	var spWarningLevel = Number(_settings.warnAlertLevelSP);
	var hpWarningResumeLevel = Math.min(hpWarningLevel + 10, 100);
	var mpWarningResumeLevel = Math.min(mpWarningLevel + 10, 100);
	var spWarningResumeLevel = Math.min(spWarningLevel + 10, 100);
	if (!hv.battle.round.finished) {
		if (_settings.isShowPopup) {
			if (hv.character.healthPercent <= hpWarningLevel && (!hpAlertAlreadyShown || _settings.isNagHP)) {
				alert("Your health is dangerously low!");
				hpAlertAlreadyShown = true;
				localStorage.setItem(HVStat.key_hpAlertAlreadyShown, "true");
			}
			if (hv.character.magicPercent <= mpWarningLevel && (!mpAlertAlreadyShown || _settings.isNagMP)) {
				alert("Your mana is dangerously low!");
				mpAlertAlreadyShown = true;
				localStorage.setItem(HVStat.key_mpAlertAlreadyShown, "true");
			}
			if (hv.character.spiritPercent <= spWarningLevel && (!spAlertAlreadyShown || _settings.isNagSP)) {
				alert("Your spirit is dangerously low!");
				spAlertAlreadyShown = true;
				localStorage.setItem(HVStat.key_spAlertAlreadyShown, "true");
			}
		}
		if (_settings.isAlertOverchargeFull && hv.character.overchargeRate >= 1.0 && !ocAlertAlreadyShown) {
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
	if (!hv.location.isCharacter || hv.settings.useHVFontEngine) {
		return;
	}
	loadProfsObject();
	var proficiencyTableElements = document.getElementById("leftpane").children[1].querySelectorAll("div.fd12");
	_profs.weapProfTotals[0] = Number(util.innerText(proficiencyTableElements[2]));
	_profs.weapProfTotals[1] = Number(util.innerText(proficiencyTableElements[4]));
	_profs.weapProfTotals[2] = Number(util.innerText(proficiencyTableElements[6]));
	_profs.weapProfTotals[3] = Number(util.innerText(proficiencyTableElements[8]));
	_profs.armorProfTotals[0] = Number(util.innerText(proficiencyTableElements[10]));
	_profs.armorProfTotals[1] = Number(util.innerText(proficiencyTableElements[12]));
	_profs.armorProfTotals[2] = Number(util.innerText(proficiencyTableElements[14]));
	_profs.elemTotal = Number(util.innerText(proficiencyTableElements[17]));
	_profs.divineTotal = Number(util.innerText(proficiencyTableElements[19]));
	_profs.forbidTotal = Number(util.innerText(proficiencyTableElements[21]));
	_profs.spiritTotal = Number(util.innerText(proficiencyTableElements[23]));
	_profs.depTotal = Number(util.innerText(proficiencyTableElements[25]));
	_profs.supportTotal = Number(util.innerText(proficiencyTableElements[27]));
	_profs.curativeTotal = Number(util.innerText(proficiencyTableElements[29]));
	_profs.save();
}
function showSidebarProfs() {
	loadProfsObject();
	if (!isProfTotalsRecorded())
		return;
	var b = document.querySelector("div.stuffbox").scrollHeight - 31;
	browser.extension.addStyle(".prof_sidebar td {font-family:arial,helvetica,sans-serif; font-size:9pt; font-weight:normal; text-align:left}.prof_sidebar_top td {font-family:arial,helvetica,sans-serif; font-size:10pt; font-weight:bold; text-align:center}");
	var div = document.createElement("div");
	div.setAttribute("id", "_profbutton");
	div.setAttribute("class", "ui-corner-all");
	div.style.cssText = 'position:absolute;top:' + b + 'px;border:1px solid;margin-left:5px;padding:2px;width:132px;font-size:10pt;font-weight:bold;text-align:center;cursor:default;';
	div.innerHTML = "Proficiency";
	var leftBar = document.querySelector("div.clb");
	leftBar.parentNode.insertBefore(div, leftBar.nextSibling);

	div.addEventListener("mouseover", function () {
		var c = hv.elementCache.popup;
		var rectObject = div.getBoundingClientRect();
		c.style.left = rectObject.left + 145 + "px";
		c.style.top = rectObject.top - 126 + "px";
		c.style.width = "260px";
		c.style.height = "126px";
		c.innerHTML = '<table class="prof_sidebar" cellspacing="0" cellpadding="0" style="width:100%">'
			+ '<tr class="prof_sidebar_top"><td colspan="2"><b>Equipment</b></td><td colspan="2"><b>Magic</b></td></tr>'
			+ '<tr><td style="width:34%">One-handed:</td><td>' + _profs.weapProfTotals[0].toFixed(2) + '</td><td style="width:34%">Elemental:</td><td>' + _profs.elemTotal.toFixed(2) + '</td></tr>'
			+ '<tr><td>Two-handed:</td><td>' + _profs.weapProfTotals[1].toFixed(2) + '</td><td>Divine:</td><td>' + _profs.divineTotal.toFixed(2) + '</td></tr>'
			+ '<tr><td>Dual wielding:</td><td>' + _profs.weapProfTotals[2].toFixed(2) + '</td><td>Forbidden:</td><td>' + _profs.forbidTotal.toFixed(2) + '</td></tr>'
			+ '<tr><td>Staff:</td><td>' + _profs.weapProfTotals[3].toFixed(2) + '</td><td>Spiritual:</td><td>' + _profs.spiritTotal.toFixed(2) + '</td></tr>'
			+ '<tr><td>Cloth armor:</td><td>' + _profs.armorProfTotals[0].toFixed(2) + '</td><td>Deprecating:</td><td>' + _profs.depTotal.toFixed(2) + '</td></tr>'
			+ '<tr><td>Light armor:</td><td>' + _profs.armorProfTotals[1].toFixed(2) + '</td><td>Supportive:</td><td>' + _profs.supportTotal.toFixed(2) + '</td></tr>'
			+ '<tr><td>Heavy armor:</td><td>' + _profs.armorProfTotals[2].toFixed(2) + '</td><td>Curative:</td><td>' + _profs.curativeTotal.toFixed(2) + '</td></tr></table>'; //spiritTotal added by Ilirith
		c.style.visibility = "visible";
	});
	div.addEventListener("mouseout", function () {
		hv.elementCache.popup.style.visibility = "hidden";
	});
}
function isProfTotalsRecorded() {
	loadProfsObject();
	return _profs.weapProfTotals.length > 0;
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

	var a = 0;
	var ac = 0;
	var d = 0;
	var b = false;
	// create monster objects
	for (var i = 0; i < HVStat.numberOfMonsters; i++) {
		HVStat.monsters.push(new HVStat.Monster(i));
	}
	loadRoundObject();
	if (_settings.isTrackItems)
		loadDropsObject();
	if (_settings.isTrackRewards)
		loadRewardsObject();
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
				if (_settings.showMonsterInfoFromDB) {
					HVStat.loadingMonsterInfoFromDB = true;
					(function (monsterIndex) {
						HVStat.idbAccessQueue.add(function () {
							HVStat.monsters[monsterIndex].getFromDB(HVStat.transaction, RoundSave);
						});
					})(monsterIndex);
				}
				if (_settings.isTrackItems) {
					_round.dropChances++;
				}
				monsterIndex++;
			} else if (logHTML.match(/\(Round/)) {
				var f = logHTML.match(/\(round.*?\)/i)[0].replace("(", "").replace(")", "");
				var m = f.split(" ");
				_round.currRound = parseInt(m[1]);
				if (m.length > 2) {
					_round.maxRound = parseInt(m[3]);
				}
			}
			if (_settings.isShowRoundReminder && (_round.maxRound >= _settings.reminderMinRounds) && (_round.currRound === _round.maxRound - _settings.reminderBeforeEnd) && !b) {
				if (_settings.reminderBeforeEnd === 0) {
					alert("This is final round");
				} else {
					alert("The final round is approaching.");
				}
				b = true;
			}
			if (logHTML.match(/random encounter/)) {
				_round.battleType = HOURLY;
			} else if (logHTML.match(/arena challenge/)) {
				_round.battleType = ARENA;
				_round.arenaNum = parseInt(logHTML.match(/challenge #\d+?\s/i)[0].replace("challenge #", ""));
			} else if (logHTML.match(/GrindFest/)) {
				_round.battleType = GRINDFEST;
			} else if (logHTML.match(/Item World/)) {
				_round.battleType = ITEM_WORLD;
			}
			RoundSave();
		}
		if (_settings.isAlertGem && logHTML.match(/drops a (.*) Gem/)) {
			HVStat.enqueueAlert("You picked up a " + RegExp.$1 + " Gem.");
		}
		if (_settings.isWarnAbsorbTrigger && /The spell is absorbed/.test(logHTML)) {
			HVStat.enqueueAlert("Absorbing Ward has triggered.");
		}
		if (_settings.isWarnSparkTrigger && logHTML.match(/spark of life.*defeat/ig)) {
			HVStat.enqueueAlert("Spark of Life has triggered!!");
		}
		if (_settings.isWarnSparkExpire && logHTML.match(/spark of life.*expired/ig)) {
			HVStat.enqueueAlert("Spark of Life has expired!!");
		}
		if ((_settings.isShowSidebarProfs || _settings.isTrackStats) && logHTML.match(/0.0(\d+) points of (.*?) proficiency/ig)) {
			var p = (RegExp.$1) / 100;
			var r = RegExp.$2;
			loadProfsObject();
			if (r.match(/one-handed weapon/)) {
				_profs.weapProfTotals[0] += p;
				_round.weapProfGain[0] += p;
			} else if (r.match(/two-handed weapon/)) {
				_profs.weapProfTotals[1] += p;
				_round.weapProfGain[1] += p;
			} else if (r.match(/dual wielding/)) {
				_profs.weapProfTotals[2] += p;
				_round.weapProfGain[2] += p;
			} else if (r.match(/staff/)) {
				_profs.weapProfTotals[3] += p;
				_round.weapProfGain[3] += p;
			} else if (r.match(/cloth armor/)) {
				_profs.armorProfTotals[0] += p;
				_round.armorProfGain[0] += p;
			} else if (r.match(/light armor/)) {
				_profs.armorProfTotals[1] += p;
				_round.armorProfGain[1] += p;
			} else if (r.match(/heavy armor/)) {
				_profs.armorProfTotals[2] += p;
				_round.armorProfGain[2] += p;
			} else if (r.match(/elemental magic/)) {
				_profs.elemTotal += p;
				_round.elemGain += p;
			} else if (r.match(/divine magic/)) {
				_profs.divineTotal += p;
				_profs.spiritTotal = (_profs.divineTotal+_profs.forbidTotal) / 2;
				_round.divineGain += p;
			} else if (r.match(/forbidden magic/)) {
				_profs.forbidTotal += p;
				_profs.spiritTotal = (_profs.divineTotal+_profs.forbidTotal) / 2;
				_round.forbidGain += p;
			} else if (r.match(/deprecating magic/)) {
				_profs.depTotal += p;
				_round.depGain += p;
			} else if (r.match(/supportive magic/)) {
				_profs.supportTotal += p;
				_round.supportGain += p;
			} else if (r.match(/curative magic/)) {
				_profs.curativeTotal += p;
				_round.curativeGain += p;
			}
			_profs.save();
		}
		if (_settings.isRememberScan) {
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
		if (_settings.isTrackStats || _settings.isShowEndStats) {
			var o = 0;
			if (logHTML.match(/\s(\d+)\s/)) {
				o = parseInt(RegExp.$1);
			}
			if (logHTML.match(/has been defeated/i)) {
				_round.kills++;
			} else if (logHTML.match(/bleeding wound hits/i)) {
				_round.dDealt[2] += o;
			} else if (logHTML.match(/(you hit)|(you crit)/i)) {
				_round.aAttempts++;
				a++;
				_round.aHits[logHTML.match(/you crit/i) ? 1 : 0]++;
				_round.dDealt[logHTML.match(/you crit/i) ? 1 : 0] += o;
			} else if (logHTML.match(/your offhand (hits|crits)/i)) {
				_round.aOffhands[logHTML.match(/offhand crit/i) ? 2 : 0]++;
				_round.aOffhands[logHTML.match(/offhand crit/i) ? 3 : 1] += o;
			} else if (logHTML.match(/you counter/i)) {
				_round.aCounters[0]++;
				_round.aCounters[1] += o;
				ac++;
				_round.dDealt[0] += o;
			} else if (logHTML.match(/hits|blasts|explodes/i) && !logHTML.match(/hits you /i)) {
				if (logHTML.match(/spreading poison hits /i) && !logHTML.match(/(hits you |crits you )/i)) {
					_round.effectPoison[1] += o;
					_round.effectPoison[0]++;
				} else {
					if (logHTML.match(/(searing skin|freezing limbs|deep burns|turbulent air|burning soul|breached defence|blunted attack) (hits|blasts|explodes)/i) && !logHTML.match(/(hits you |crits you )/i)) {
						_round.elemEffects[1]++;
						_round.elemEffects[2] += o;
					} else if (logHTML.match(/(fireball|inferno|flare|meteor|nova|flames of loki|icestrike|snowstorm|freeze|blizzard|cryostasis|fimbulvetr|lighting|thunderstorm|ball lighting|chain lighting|shockblast|wrath of thor|windblast|cyclone|gale|hurricane|downburst|storms of njord) (hits|blasts|explodes)/i) && !logHTML.match(/(hits you |crits you )/i)) {
						_round.dDealtSp[logHTML.match(/blasts/i) ? 1 : 0] += o;
						_round.sHits[logHTML.match(/blasts/i) ? 1 : 0]++;
						_round.elemSpells[1]++;
						_round.elemSpells[2] += o;
					} else if (logHTML.match(/(condemn|purge|smite|banish) (hits|blasts|explodes)/i) && !logHTML.match(/(hits you |crits you )/i)) {
						_round.dDealtSp[logHTML.match(/blasts/i) ? 1 : 0] += o;
						_round.sHits[logHTML.match(/blasts/i) ? 1 : 0]++;
						_round.divineSpells[1]++;
						_round.divineSpells[2] += o
					} else if (logHTML.match(/(soul reaper|soul harvest|soul fire|soul burst|corruption|pestilence|disintegrate|ragnarok) (hits|blasts|explodes)/i) && !logHTML.match(/(hits you |crits you )/i)) {
						_round.dDealtSp[logHTML.match(/blasts/i) ? 1 : 0] += o;
						_round.sHits[logHTML.match(/blasts/i) ? 1 : 0]++;
						_round.forbidSpells[1]++;
						_round.forbidSpells[2] += o
					}
				}
			} else if (logHTML.match(/(hits you )|(crits you )/i)) {
				_round.mAttempts++;
				_round.mHits[logHTML.match(/crits/i) ? 1 : 0]++;
				_round.dTaken[logHTML.match(/crits/i) ? 1 : 0] += o;
				if (logHTMLOfPreviousRow.match(/ uses | casts /i)) {
					_round.pskills[1]++;
					_round.pskills[2] += o;
					if (logHTMLOfPreviousRow.match(/ casts /i)) {
						_round.pskills[5]++;
						_round.pskills[6] += o;
					} else {
						_round.pskills[3]++;
						_round.pskills[4] += o;
					}
					if (_settings.isRememberSkillsTypes) {
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
				_round.mAttempts++;
				if (logHTML.match(/dodge|(misses.*?against you)/)) {
					_round.pDodges++;
				} else if (logHTML.match(/evade/)) {
					_round.pEvades++;
				} else if (logHTML.match(/block/)) {
					_round.pBlocks++;
				} else if (logHTML.match(/parry/)) {
					_round.pParries++;
				} else if (logHTML.match(/resist/)) {
					_round.pResists++;
				}
			} else if (logHTML.match(/casts?/)) {
				if (logHTML.match(/casts/)) {
					_round.mAttempts++;
					_round.mSpells++;
				} else if (logHTML.match(/you cast/i)) {
					if (logHTML.match(/(poison|slow|weaken|sleep|confuse|imperil|blind|silence|nerf|x.nerf|magnet|lifestream)/i)) {
						_round.depSpells[0]++;
						_round.sAttempts++
					} else if (logHTML.match(/(condemn|purge|smite|banish)/i)) {
						_round.divineSpells[0]++;
						_round.sAttempts++;
						if (joinedLogStringOfCurrentTurn.match(/Your spell misses its mark/i)) {
							_round.divineSpells[3] += joinedLogStringOfCurrentTurn.match(/Your spell misses its mark/ig).length;
						}
					} else if (logHTML.match(/(soul reaper|soul harvest|soul fire|soul burst|corruption|pestilence|disintegrate|ragnarok)/i)) {
						_round.forbidSpells[0]++;
						_round.sAttempts++
						if (joinedLogStringOfCurrentTurn.match(/Your spell misses its mark/i)) {
							_round.forbidSpells[3] += joinedLogStringOfCurrentTurn.match(/Your spell misses its mark/ig).length;
						}
					} else if (logHTML.match(/(fireball|inferno|flare|meteor|nova|flames of loki|icestrike|snowstorm|freeze|blizzard|cryostasis|fimbulvetr|lighting|thunderstorm|ball lighting|chain lighting|shockblast|wrath of thor|windblast|cyclone|gale|hurricane|downburst|storms of njord)/i)) {
						_round.elemSpells[0]++;
						_round.sAttempts++;
						if (joinedLogStringOfCurrentTurn.match(/Your spell misses its mark/i)) {
							_round.elemSpells[3] += joinedLogStringOfCurrentTurn.match(/Your spell misses its mark/ig).length;
						}
					} else if (logHTML.match(/(spark of life|absorb|protection|shadow veil|haste|flame spikes|frost spikes|lightning spikes|storm spikes|arcane focus|heartseeker)/i)) {
						_round.supportSpells++
						if (logHTML.match(/absorb/i)) {
							_round.absArry[0]++
						}
					} else if (logHTML.match(/(cure|regen)/i)) {
						_round.curativeSpells++
						if (logHTML.match(/cure/i)) {
							if (joinedLogStringOfCurrentTurn.match(/You are healed for (\d+) Health Points/)) {
								d = parseFloat(RegExp.$1);
							}
							_round.cureTotals[logHTML.match(/cure\./i) ? 0 : logHTML.match(/cure ii\./i) ? 1 : 2] += d;
							_round.cureCounts[logHTML.match(/cure\./i) ? 0 : logHTML.match(/cure ii\./i) ? 1 : 2]++
						}
					}
				}
			} else if (logHTML.match(/The spell is absorbed. You gain (\d+) Magic Points/)) {
				_round.absArry[1]++;
				_round.absArry[2] += parseInt(RegExp.$1);
			} else if (logHTML.match(/Your attack misses its mark/)) {
				_round.aAttempts++;
			} else if (logHTML.match(/Your spell misses its mark/)) {
				_round.sResists++;
			} else if (logHTML.match(/gains? the effect/i)) {
				if (logHTML.match(/gain the effect Overwhelming Strikes/i)) {
					_round.overStrikes++;
				} else if (logHTML.match(/gains the effect Coalesced Mana/i)) {
					_round.coalesce++;
				} else if (logHTML.match(/gains the effect Ether Theft/i)) {
					_round.eTheft++;
				} else if (logHTML.match(/gain the effect Channeling/i)) {
					_round.channel++;
				} else {
					if (logHTML.match(/gains the effect (searing skin|freezing limbs|deep burns|turbulent air|breached defence|blunted attack|burning soul|rippened soul)/i)) {
						_round.elemEffects[0]++;
					} else if (logHTML.match(/gains the effect (spreading poison|slowed|weakened|sleep|confused|imperiled|blinded|silenced|nerfed|magically snared|lifestream)/i)) {
						_round.depSpells[1]++;
					} else if (logHTML.match(/gains the effect stunned/i)) {
						_round.weaponprocs[0]++;
						if (logHTMLOfPreviousRow.match(/You counter/i)) {
							_round.weaponprocs[0]--;
							_round.weaponprocs[7]++
						}
					} else if (logHTML.match(/gains the effect penetrated armor/i)) {
						_round.weaponprocs[1]++;
					} else if (logHTML.match(/gains the effect bleeding wound/i)) {
						_round.weaponprocs[2]++;
					} else if (logHTML.match(/gains the effect ether theft/i)) {
						_round.weaponprocs[3]++;
					}
				}
			} else if (logHTML.match(/uses?/i)) {
				if (logHTML.match(/uses/i)) {
					_round.pskills[0]++;
				} else if (logHTML.match(/use Mystic Gem/i)) {
					_round.channel--;
				}
			} else if (logHTML.match(/you drain/i)) {
				if (logHTML.match(/you drain \d+(\.)?\d? hp from/i)) {
					_round.weaponprocs[4]++;
				} else if (logHTML.match(/you drain \d+(\.)?\d? mp from/i)) {
					_round.weaponprocs[5]++;
				} else if (logHTML.match(/you drain \d+(\.)?\d? sp from/i)) {
					_round.weaponprocs[6]++;
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
			if (_settings.isTrackItems) {
				_drops.eqDrop++;
				_drops.eqArray.push(q);
				_drops.eqDropbyBT[_round.battleType]++;
			}
		} else if (logHTML.match(/dropped.*?color:.*?blue.*?\[.*?\]/ig)) {
			_artifacts++;
			itemToAdd = logHTML.match(l)[0];
			_lastArtName = itemToAdd;
			if (_settings.isTrackItems) {
				_drops.artDrop++;
				_drops.artDropbyBT[_round.battleType]++;
				n = true;
				var j = _drops.artArry.length;
				while (j--) {
					if (itemToAdd === _drops.artArry[j]) {
						_drops.artQtyArry[j]++;
						n = false;
						break;
					}
				}
				if (n) {
					_drops.artQtyArry.push(1);
					_drops.artArry.push(itemToAdd);
				}
			}
		} else if (_settings.isTrackItems && (logHTML.match(/dropped.*?color:.*?green.*?\[.*?\]/ig) || logHTML.match(/dropped.*?token/ig))) {
			itemToAdd = logHTML.match(l)[0];
			if (itemToAdd.match(/(\d){0,2}.?x?.?Crystal of /ig)) {
				t = parseInt("0" + RegExp.$1, 10);
				if (t < 1) {
					t = 1;
				}
				itemToAdd = itemToAdd.replace(/(\d){1,2}.?x?.?/, "");
				_drops.crysDropbyBT[_round.battleType]++;
			}
			var j = _drops.itemArry.length;
			while (j--) {
				if (itemToAdd === _drops.itemArry[j]) {
					_drops.itemQtyArry[j] += t;
					_drops.itemDrop++;
					_drops.itemDropbyBT[_round.battleType]++;
					break;
				}
			}
		} else if (_settings.isTrackItems && logHTML.match(/dropped.*?color:.*?\#461B7E.*?\[.*?\]/ig)) {
			_drops.dropChances--;
			_drops.dropChancesbyBT[_round.battleType]--;
		}
		if (logHTML.match(/(clear bonus).*?color:.*?red.*?\[.*?\]/ig)) {
			_equips++;
			var s = logHTML.match(l)[0];
			_lastEquipName = s;
			if (_settings.isTrackRewards) {
				_rewards.eqRwrd++;
				_rewards.eqRwrdArry.push(s);
			}
		} else if (logHTML.match(/(clear bonus).*?color:.*?blue.*?\[.*?\]/ig)) {
			_artifacts++;
			itemToAdd = logHTML.match(l)[0];
			_lastArtName = itemToAdd;
			if (_settings.isTrackRewards) {
				_rewards.artRwrd++;
				n = true;
				var j = _rewards.artRwrdArry.length;
				while (j--) {
					if (itemToAdd === _rewards.artRwrdArry[j]) {
						_rewards.artRwrdQtyArry[j]++;
						n = false;
						break;
					}
				}
				if (n) {
					_rewards.artRwrdQtyArry.push(1);
					_rewards.artRwrdArry.push(itemToAdd);
				}
			}
		} else if (_settings.isTrackRewards && (logHTML.match(/(clear bonus).*?color:.*?green.*?\[.*?\]/ig) || logHTML.match(/(clear bonus).*?token/ig))) {
			_rewards.itemsRwrd++;
			itemToAdd = logHTML.match(l)[0];
			if (itemToAdd.match(/(\d)x Crystal/ig)) {
				t = parseInt("0" + RegExp.$1, 10);
				itemToAdd = itemToAdd.replace(/\dx /, "");
			}
			n = true;
			var j = _rewards.itemRwrdArry.length;
			while (j--) {
				if (itemToAdd === _rewards.itemRwrdArry[j]) {
					_rewards.itemRwrdQtyArry[j] += t;
					n = false;
					break;
				}
			}
			if (n) {
				_rewards.itemRwrdQtyArry.push(1);
				_rewards.itemRwrdArry.push(itemToAdd);
			}
		} else if (_settings.isTrackRewards && (logHTML.match(/(token bonus).*?\[.*?\]/ig))) {
			if (logHTML.match(/token of blood/ig)) {
				_tokenDrops[0]++;
			} else if (logHTML.match(/token of healing/ig)) {
				_tokenDrops[1]++;
			} else if (logHTML.match(/chaos token/ig)) {
				_tokenDrops[2]++;
			}
		}
		if (logHTML.match(/reached equipment inventory limit/i)) {
			localStorage.setItem(HV_EQUIP, JSON.stringify("true"));
		}
	}
	if (a > 1) {
		_round.aDomino[0]++;
		_round.aDomino[1] += a;
		_round.aDomino[a]++
	}
	if (ac > 1) {
		_round.aCounters[ac]++;
	}
	if (_round.lastTurn < turnLog.lastTurn) {
		_round.lastTurn = turnLog.lastTurn;
	}
	RoundSave();
}

function RoundSave() {
	_round.monsters = [];
	HVStat.monsters.forEach(function (element, index, array) {
		_round.monsters[index] = element.valueObject;
	});
	_round.save();
}

function saveStats() {
	loadOverviewObject();
	loadStatsObject();
	loadRewardsObject();
	loadDropsObject();
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
	if (_overview.startTime === 0) {
		_overview.startTime = a;
	}
	if (_round.battleType === HOURLY) {
		_overview.lastHourlyTime = a;
	}
	_overview.exp += d;
	_overview.credits += c;
	_overview.expbyBT[_round.battleType] += d;
	_overview.creditsbyBT[_round.battleType] += c;
	if (_equips > 0) {
		_overview.lastEquipTime = a;
		_overview.lastEquipName = _lastEquipName;
		_overview.equips += _equips;
	}
	if (_artifacts > 0) {
		_overview.lastArtTime = a;
		_overview.lastArtName = _lastArtName;
		_overview.artifacts += _artifacts;
	}
	if (d > 0) {
		_overview.roundArray[_round.battleType]++;
		_drops.dropChancesbyBT[_round.battleType] += _round.dropChances;
		_drops.dropChances += _round.dropChances;
	}
	if (_settings.isTrackStats) {
		_stats.kills += _round.kills;
		_stats.aAttempts += _round.aAttempts;
		_stats.aHits[0] += _round.aHits[0];
		_stats.aHits[1] += _round.aHits[1];
		_stats.aOffhands[0] += _round.aOffhands[0];
		_stats.aOffhands[1] += _round.aOffhands[1];
		_stats.aOffhands[2] += _round.aOffhands[2];
		_stats.aOffhands[3] += _round.aOffhands[3];
		_stats.sAttempts += _round.sAttempts;
		_stats.sHits[0] += _round.sHits[0];
		_stats.sHits[1] += _round.sHits[1];
		_stats.mAttempts += _round.mAttempts;
		_stats.mHits[0] += _round.mHits[0];
		_stats.mHits[1] += _round.mHits[1];
		_stats.pDodges += _round.pDodges;
		_stats.pEvades += _round.pEvades;
		_stats.pParries += _round.pParries;
		_stats.pBlocks += _round.pBlocks;
		_stats.dDealt[0] += _round.dDealt[0];
		_stats.dDealt[1] += _round.dDealt[1];
		_stats.dDealt[2] += _round.dDealt[2];
		_stats.dTaken[0] += _round.dTaken[0];
		_stats.dTaken[1] += _round.dTaken[1];
		_stats.dDealtSp[0] += _round.dDealtSp[0];
		_stats.dDealtSp[1] += _round.dDealtSp[1];
		_stats.rounds += 1;
		_stats.absArry[0] += _round.absArry[0];
		_stats.absArry[1] += _round.absArry[1];
		_stats.absArry[2] += _round.absArry[2];
		_stats.coalesce += _round.coalesce;
		_stats.eTheft += _round.eTheft;
		_stats.channel += _round.channel;
		_stats.aDomino[0] += _round.aDomino[0];
		_stats.aDomino[1] += _round.aDomino[1];
		_stats.aDomino[2] += _round.aDomino[2];
		_stats.aDomino[3] += _round.aDomino[3];
		_stats.aDomino[4] += _round.aDomino[4];
		_stats.aDomino[5] += _round.aDomino[5];
		_stats.aDomino[6] += _round.aDomino[6];
		_stats.aDomino[7] += _round.aDomino[7];
		_stats.aDomino[8] += _round.aDomino[8];
		_stats.aDomino[9] += _round.aDomino[9];
		_stats.overStrikes += _round.overStrikes;
		_stats.aCounters[0] += _round.aCounters[0];
		_stats.aCounters[1] += _round.aCounters[1];
		_stats.aCounters[2] += _round.aCounters[2];
		_stats.aCounters[3] += _round.aCounters[3];
		_stats.pResists += _round.pResists;
		_stats.mSpells += _round.mSpells;
		_stats.sResists += _round.sResists;
		_stats.cureTotals[0] += _round.cureTotals[0];
		_stats.cureTotals[1] += _round.cureTotals[1];
		_stats.cureTotals[2] += _round.cureTotals[2];
		_stats.cureCounts[0] += _round.cureCounts[0];
		_stats.cureCounts[1] += _round.cureCounts[1];
		_stats.cureCounts[2] += _round.cureCounts[2];
		_stats.elemEffects[0] += _round.elemEffects[0];
		_stats.elemEffects[1] += _round.elemEffects[1];
		_stats.elemEffects[2] += _round.elemEffects[2];
		_stats.effectPoison[0] += _round.effectPoison[0];
		_stats.effectPoison[1] += _round.effectPoison[1];
		_stats.elemSpells[0] += _round.elemSpells[0];
		_stats.elemSpells[1] += _round.elemSpells[1];
		_stats.elemSpells[2] += _round.elemSpells[2];
		_stats.elemSpells[3] += _round.elemSpells[3];
		_stats.divineSpells[0] += _round.divineSpells[0];
		_stats.divineSpells[1] += _round.divineSpells[1];
		_stats.divineSpells[2] += _round.divineSpells[2];
		_stats.divineSpells[3] += _round.divineSpells[3];
		_stats.forbidSpells[0] += _round.forbidSpells[0];
		_stats.forbidSpells[1] += _round.forbidSpells[1];
		_stats.forbidSpells[2] += _round.forbidSpells[2];
		_stats.forbidSpells[3] += _round.forbidSpells[3];
		_stats.depSpells[0] += _round.depSpells[0];
		_stats.depSpells[1] += _round.depSpells[1];
		_stats.supportSpells += _round.supportSpells;
		_stats.curativeSpells += _round.curativeSpells;
		_stats.elemGain += _round.elemGain;
		_stats.divineGain += _round.divineGain;
		_stats.forbidGain += _round.forbidGain;
		_stats.depGain += _round.depGain;
		_stats.supportGain += _round.supportGain;
		_stats.curativeGain += _round.curativeGain;
		_stats.weapProfGain[0] += _round.weapProfGain[0];
		_stats.weapProfGain[1] += _round.weapProfGain[1];
		_stats.weapProfGain[2] += _round.weapProfGain[2];
		_stats.weapProfGain[3] += _round.weapProfGain[3];
		_stats.armorProfGain[0] += _round.armorProfGain[0];
		_stats.armorProfGain[1] += _round.armorProfGain[1];
		_stats.armorProfGain[2] += _round.armorProfGain[2];
		_stats.weaponprocs[0] += _round.weaponprocs[0];
		_stats.weaponprocs[1] += _round.weaponprocs[1];
		_stats.weaponprocs[2] += _round.weaponprocs[2];
		_stats.weaponprocs[3] += _round.weaponprocs[3];
		_stats.weaponprocs[4] += _round.weaponprocs[4];
		_stats.weaponprocs[5] += _round.weaponprocs[5];
		_stats.weaponprocs[6] += _round.weaponprocs[6];
		_stats.weaponprocs[7] += _round.weaponprocs[7];
		_stats.pskills[0] += _round.pskills[0];
		_stats.pskills[1] += _round.pskills[1];
		_stats.pskills[2] += _round.pskills[2];
		_stats.pskills[3] += _round.pskills[3];
		_stats.pskills[4] += _round.pskills[4];
		_stats.pskills[5] += _round.pskills[5];
		_stats.pskills[6] += _round.pskills[6];
		if (_stats.datestart === 0) _stats.datestart = (new Date()).getTime();
	}
	_rewards.tokenDrops[0] += _tokenDrops[0];
	_rewards.tokenDrops[1] += _tokenDrops[1];
	_rewards.tokenDrops[2] += _tokenDrops[2];
	_overview.save();
	_stats.save();
	_rewards.save();
	_drops.save();
}
function getBattleEndStatsHtml() {
	function formatProbability(numerator, denominator, digits) {
		return String(numerator) + "/" + String(denominator)
			+ " (" + String(hvStat.util.percentRatio(numerator, denominator, digits)) + "%)";
	}

	var f = _round.sHits[0] + _round.sHits[1] + _round.depSpells[1] + _round.sResists;
	var e = _round.sHits[0] + _round.sHits[1] + _round.depSpells[1];
	var d = _round.aHits[0] + _round.aHits[1];
	var c = _round.sHits[0] + _round.sHits[1];
	var b = _round.mHits[0] + _round.mHits[1];
	var ab = _round.aOffhands[0] + _round.aOffhands[2];
	var a = "<b>Accuracy</b>: " + formatProbability(d, _round.aAttempts, 2) + ", "
		+ "<b>Crits</b>: " + formatProbability(_round.aHits[1], d, 2) + ", "
		+ "<b>Offhand</b>: " + formatProbability(ab, d, 2) + ", "
		+ "<b>Domino</b>: " + formatProbability(_round.aDomino[0], d, 2) + ", "
		+ "<b>OverStrikes</b>: " + formatProbability(_round.overStrikes, d, 2) + ", "
		+ "<b>Coalesce</b>: " + formatProbability(_round.coalesce, e, 2) + ", "
		+ "<b>M. Accuracy</b>: " + formatProbability(e, f, 2) + ", "
		+ "<b>Spell Crits</b>: " + formatProbability(_round.sHits[1], c, 2) + ", "
		+ "<b>Avg hit dmg</b>: " + hvStat.util.ratio(_round.dDealt[0], _round.aHits[0]).toFixed(2) + "|" + hvStat.util.ratio(_round.dDealtSp[0], _round.sHits[0]).toFixed(2) + ", "
		+ "<b>Avg crit dmg</b>: " + hvStat.util.ratio(_round.dDealt[1], _round.aHits[1]).toFixed(2) + "|" + hvStat.util.ratio(_round.dDealtSp[1], _round.sHits[1]).toFixed(2) + ", "
		+ "<b>Avg dmg</b>: " + hvStat.util.ratio(_round.dDealt[0] + _round.dDealt[1], d).toFixed(2) + "|" + hvStat.util.ratio(_round.dDealtSp[0] + _round.dDealtSp[1], c).toFixed(2)
		+ "<hr style='height:1px;border:0;background-color:#333333;color:#333333' />"
		+ "<b>Hits taken</b>: " + formatProbability(b, _round.mAttempts, 2) + ", "
		+ "<b>Missed</b>: " + formatProbability(_round.pDodges, _round.mAttempts, 2) + ", "
		+ "<b>Evaded</b>: " + formatProbability(_round.pEvades, _round.mAttempts, 2) + ", "
		+ "<b>Blocked</b>: " + formatProbability(_round.pBlocks, _round.mAttempts, 2) + ", "
		+ "<b>Parried</b>: " + formatProbability(_round.pParries, _round.mAttempts, 2) + ", "
		+ "<b>Resisted</b>: " + formatProbability(_round.pResists, _round.mAttempts, 2) + ", "
		+ "<b>Crits taken</b>: " + formatProbability(_round.mHits[1], b, 2) + ", "
		+ "<b>Total dmg taken</b>: " + (_round.dTaken[0] + _round.dTaken[1]) + ", "
		+ "<b>Avg dmg taken</b>: " + hvStat.util.ratio(_round.dTaken[0] + _round.dTaken[1], b).toFixed(2);
	if (_settings.isShowEndProfs && (_settings.isShowEndProfsMagic || _settings.isShowEndProfsArmor || _settings.isShowEndProfsWeapon)) { //isShowEndProfs added by Ilirith
		if (_settings.isShowEndProfsMagic) {
			a += "<hr style='height:1px;border:0;background-color:#333333;color:#333333' />"
				+ "<b>Curative Spells</b>: " + _round.curativeSpells
				+ ", <b>Support Spells</b>: " + _round.supportSpells
				+ ", <b>Deprecating Spells</b>: " + _round.depSpells[1]
				+ ", <b>Divine Spells</b>: " + _round.divineSpells[1]
				+ ", <b>Forbidden Spells</b>: " + _round.forbidSpells[1]
				+ ", <b>Elemental Spells</b>: " + _round.elemSpells[1]
				+ "<hr style='height:1px;border:0;background-color:#333333;color:#333333' />"
				+ "<b>Curative Gain</b>: " + _round.curativeGain.toFixed(2)
				+ ", <b>SupportGain</b>: " + _round.supportGain.toFixed(2)
				+ ", <b>Deprecating Gain</b>: " + _round.depGain.toFixed(2)
				+ ", <b>Divine Gain</b>: " + _round.divineGain.toFixed(2)
				+ ", <b>Forbidden Gain</b>: " + _round.forbidGain.toFixed(2)
				+ ", <b>Elemental Gain</b>: " + _round.elemGain.toFixed(2);
		}
		if (_settings.isShowEndProfsArmor) {
			a += "<hr style='height:1px;border:0;background-color:#333333;color:#333333' />"
				+ "<b>Cloth Gain</b>: " + _round.armorProfGain[0].toFixed(2)
				+ ", <b>Light Armor Gain</b>: " + _round.armorProfGain[1].toFixed(2)
				+ ", <b>Heavy Armor Gain</b>: " + _round.armorProfGain[2].toFixed(2);
		}
		if (_settings.isShowEndProfsWeapon) {
			a += "<hr style='height:1px;border:0;background-color:#333333;color:#333333' />"
				+ "<b>One-Handed Gain</b>: " + _round.weapProfGain[0].toFixed(2)
				+ ", <b>Two-Handed Gain</b>: " + _round.weapProfGain[1].toFixed(2)
				+ ", <b>Dual Wielding Gain</b>: " + _round.weapProfGain[2].toFixed(2)
				+ ", <b>Staff Gain</b>: " + _round.weapProfGain[3].toFixed(2);
		}
	}
	return a;
}

function getReportOverviewHtml() {
	var a = '<span style="color:green"><b>ON</b></span>';
	var w = '<span style="color:red"><b>OFF</b></span>';
	var q = '<span style="color:orange"><b>PAUSED</b></span>';
	var N = "<b> | </b>";
	var I = '<span style="color:red"><b>--</b></span>';
	var B = a;
	var l = w;
	var A = w;
	var u = "";
	var i = "";
	var C = "";
	var j = "";
	var y = "";
	var b = _settings.isShowSidebarProfs ? a : w;
	var o = _settings.isShowRoundReminder ? a : w;
	var h = _settings.isShowHighlight ? a : w;
	var n = _settings.isShowDivider ? a : w;
	var D = _settings.isShowSelfDuration ? a : w;
	var G = _settings.isShowEndStats ? a : w;
	var J = _settings.isAlertGem ? a : w;
	y = _settings.showMonsterHP ? '<span style="color:green"><b>HP</b></span>' : I;
	y += N;
	y += _settings.showMonsterMP ? '<span style="color:green"><b>MP</b></span>' : I;
	y += N;
	y += _settings.showMonsterSP ? '<span style="color:green"><b>SP</b></span>' : I;
	y += N;
	y += _settings.isShowMonsterDuration ? '<span style="color:green"><b>Duration</b></span>' : I;
	B = _settings.isTrackStats ? a : _stats.isLoaded && _stats.rounds > 0 ? q : w;
	A = _settings.isTrackItems ? a : _drops.isLoaded && _drops.dropChances > 0 ? q : w;
	l = _settings.isTrackRewards ? a : _rewards.isLoaded && _rewards.totalRwrds > 0 ? q : w;
	Shrine = _settings.isTrackShrine ? a : _shrine.isLoaded && _shrine.totalRewards > 0 ? q : w;
	u = _settings.isWarnSparkTrigger ? '<span style="color:green"><b>Trig</b></span>' : I;
	u += N;
	u += _settings.isWarnSparkExpire ? '<span style="color:green"><b>Exp</b></span>' : I;
	if (_settings.isHighlightQC)
		C = '<span style="color:Orange"><b>'
			+ _settings.warnOrangeLevel + '% HP</span>; <span style="color:Red">'
			+ _settings.warnRedLevel + '% HP</span>;\n <span style="color:blue">'
			+ _settings.warnOrangeLevelMP + '% MP</span>; <span style="color:darkblue">'
			+ _settings.warnRedLevelMP + '% MP</span>;\n <span style="color:lime">'
			+ _settings.warnOrangeLevelSP + '% SP</span>; <span style="color:green">'
			+ _settings.warnRedLevelSP + "% SP</b></span>";
	else C = w;
	if (_settings.isShowPopup)
		j = '<span style="color:green"><b>'
			+ _settings.warnAlertLevel + "% HP</b></span>" + (_settings.isNagHP ? " <b>(Nag)</b>" : "") + '; \n<span style="color:green"><b>'
			+ _settings.warnAlertLevelMP + "% MP</b></span>" + (_settings.isNagMP ? " <b>(Nag)</b>" : "") + '; \n<span style="color:green"><b>'
			+ _settings.warnAlertLevelSP + "% SP</b></span>" + (_settings.isNagSP ? " <b>(Nag)</b>" : "");
	else j = w;
	i = _settings.warnMode[0] ? '<span style="color:green"><b>Ho</b></span>' : I;
	i += N;
	i += _settings.warnMode[1] ? '<span style="color:green"><b>Ar</b></span>' : I;
	i += N;
	i += _settings.warnMode[2] ? '<span style="color:green"><b>GF</b></span>' : I;
	i += N;
	i += _settings.warnMode[3] ? '<span style="color:green"><b>IW</b></span>' : I;
	var x = '<table class="_UI" cellspacing="0" cellpadding="2" style="width:100%"><tr><td colspan="3">No data found. Complete a round to begin tracking.</td></tr></table>';
	if (_overview.isLoaded && _overview.totalRounds > 0) {
		var f = new Date();
		f.setTime(_overview.startTime);
		var r = new Date();
		var k = r.getTime();
		var d = ((k - _overview.startTime) / (60 * 60 * 1000));
		var E = "";
		var v = (60 * d).toFixed();
		var K = Math.floor(v / (60 * 24));
		var M = v / (60 * 24);
		if (d < 1) E = v + " mins";
		else if (d < 24) E = Math.floor(v / 60) + " hours, " + (v % 60).toFixed() + " mins";
		else E = K + " days, " + Math.floor((v / 60) - (K * 24)) + " hours, " + (v % 60).toFixed() + " mins";
		var e = f.toLocaleString();
		var z = r.toLocaleString();
		if (browser.isChrome) {
			e = f.toLocaleDateString() + " " + f.toLocaleTimeString();
			z = r.toLocaleDateString() + " " + r.toLocaleTimeString();
		}
		var c;
		if (_overview.lastHourlyTime === 0) c = "Never";
		else {
			c = new Date();
			c.setTime(_overview.lastHourlyTime);
			c = c.toLocaleTimeString();
		}
		var F = 0;
		var g = "none yet!";
		var L = "N/A";
		if (_overview.equips > 0) {
			F = (_overview.totalRounds / _overview.equips).toFixed();
			g = _overview.lastEquipName;
			L = getRelativeTime(_overview.lastEquipTime);
		}
		var t = 0;
		var s = "none yet!";
		var H = "N/A";
		if (_overview.artifacts > 0) {
			t = (_overview.totalRounds / _overview.artifacts).toFixed(1);
			s = _overview.lastArtName;
			H = getRelativeTime(_overview.lastArtTime);
		}
		x = '<table class="_UI" cellspacing="0" cellpadding="2" style="width:100%">'
			+ '<tr><td colspan="2"><b>Reporting period:</b> ' + e + " to " + z + '</td></tr>'
			+ '<tr><td colspan="2" style="padding-left:10px">Total time: ' + E + '</td></tr>'
			+ '<tr><td colspan="2"><b>Rounds completed:</b> ' + _overview.totalRounds + " (" + (M === 0 ? 0 : (_overview.totalRounds / M).toFixed()) + ' rounds per day)</td></tr>'
			+ '<tr><td colspan="2" style="padding-left:10px">Hourly encounters: ' + _overview.roundArray[0] + ' (' + (_overview.roundArray[0] / _overview.totalRounds * 100).toFixed(2) + '% of total; ' + (M === 0 ? 0 : (_overview.roundArray[0] / M).toFixed()) + ' rounds per day); Last Hourly: ' + c + '</td></tr>'
			+ '<tr><td colspan="2" style="padding-left:10px">Arena: ' + _overview.roundArray[1] + ' (' + (_overview.roundArray[1] / _overview.totalRounds * 100).toFixed(2) + '% of total)</td></tr>'
			+ '<tr><td colspan="2" style="padding-left:10px">Grindfest: ' + _overview.roundArray[2] + ' (' + (_overview.roundArray[2] / _overview.totalRounds * 100).toFixed(2) + '% of total; ' + (M === 0 ? 0 : (_overview.roundArray[2] / M).toFixed()) + ' rounds per day)</td></tr>'
			+ '<tr><td colspan="2" style="padding-left:10px">Item World: ' + _overview.roundArray[3] + ' (' + (_overview.roundArray[3] / _overview.totalRounds * 100).toFixed(2) + '% of total; ' + (M === 0 ? 0 : (_overview.roundArray[3] / M).toFixed()) + ' rounds per day)</td></tr>'
			+ '<tr><td><b>Total EXP gained:</b> ' + _overview.exp.toFixed() + '</td><td><b>Total Credits gained:</b> ' + (_overview.credits).toFixed() + '</td></tr>'
			+ '<tr><td style="padding-left:10px">EXP per round: ' + (_overview.exp / _overview.totalRounds).toFixed(2) + '</td><td style="padding-left:10px">Credits per round: ' + (_overview.credits / _overview.totalRounds).toFixed(2) + '</td></tr>'
			+ '<tr><td style="padding-left:10px">Ho: ' + (_overview.expbyBT[0] / _overview.roundArray[0]).toFixed(2) + '| Ar: ' + (_overview.expbyBT[1] / _overview.roundArray[1]).toFixed(2) + '| GF: ' + (_overview.expbyBT[2] / _overview.roundArray[2]).toFixed(2) + '| CF: ' + (_overview.expbyBT[4] / _overview.roundArray[4]).toFixed(2) + '| IW: ' + (_overview.expbyBT[3] / _overview.roundArray[3]).toFixed(2) + '</td><td style="padding-left:10px">Ho: ' + (_overview.creditsbyBT[0] / _overview.roundArray[0]).toFixed(2) + '| Ar: ' + (_overview.creditsbyBT[1] / _overview.roundArray[1]).toFixed(2) + '| GF: ' + (_overview.creditsbyBT[2] / _overview.roundArray[2]).toFixed(2) + '</td></tr>'
			+ '<tr><td style="padding-left:10px">EXP per hour: ' + (_overview.exp / d).toFixed(2) + '</td><td style="padding-left:10px">Credits per hour: ' + (_overview.credits / d).toFixed(2) + '</td></tr>'
			+ '<tr><td style="padding-left:10px">EXP per day: ' + (M === 0 ? 0 : (_overview.exp / M).toFixed(2)) + '</td><td style="padding-left:10px">Credits per day: ' + (M === 0 ? 0 : (_overview.credits / M).toFixed(2)) + '</td></tr>'
			+ '<tr><td colspan="2"><b>Total Equipment found:</b> ' + _overview.equips + ' pieces (' + F + ' rounds per equip)</td></tr>'
			+ '<tr><td colspan="2" style="padding-left:10px">Last found: <span style="color:red">' + g + '</span> (' + L + ')</td></tr>'
			+ '<tr><td colspan="2"><b>Total Artifacts found:</b> ' + _overview.artifacts + ' pieces (' + t + ' rounds per artifact)</td></tr>'
			+ '<tr><td colspan="2" style="padding-left:10px">Last found: <span style="color:blue">' + s + '</span> (' + H + ')</td></tr></table>'
	}
	x += '<table class="_UI" cellspacing="0" cellpadding="2" style="width:100%"><tr><td>&nbsp;</td></tr>'
		+ '<tr>'
			+ '<td style="width:33%"><b>General Options:</b></td>'
			+ '<td style="width:34%"><b>Battle Enhancement:</b></td>'
			+ '<td style="width:33%"><b>Tracking Status:</b></td>'
		+ '</tr><tr>'
			+ '<td style="padding-left:10px;width:33%">HP Warning:</td>'
			+ '<td style="padding-left:10px;width:34%">Log Highlighting: ' + h + '</td>'
			+ '<td style="padding-left:10px;width:33%">Battle Stats: ' + B + '</td>'
		+ '</tr><tr>'
			+ '<td style="padding-left:20px;width:33%">Absorb Warning: ' + (_settings.isWarnAbsorbTrigger ? a : w) + '</td>'
			+ '<td style="padding-left:10px;width:34%">Turn Divider: ' + n + '</td>'
			+ '<td style="padding-left:10px;width:33%">Item Drops: ' + A + '</td>'
		+ '</tr><tr>'
			+ '<td style="padding-left:20px;width:33%">Spark Warning: ' + u + '</td>'
			+ '<td style="padding-left:10px;width:34%">Status Effect Duration: ' + D + '</td>'
			+ '<td style="padding-left:10px;width:33%">Arena Rewards: ' + l + '</td>'
		+ '</tr><tr>'
			+ '<td style="padding-left:20px;width:33%">Highlight QC: ' + C + '</td>'
			+ '<td style="padding-left:10px;width:34%">Monster Stats:</td>'
			+ '<td style="padding-left:10px;width:33%">Shrine: ' + Shrine + '</td>'
		+ '</tr><tr>'
			+ '<td style="padding-left:20px;width:33%">Popup: ' + j + '</td>'
			+ '<td style="padding-left:20px;width:34%">' + y + '</td>'
			+ '<td style="padding-left:10px;width:33%"></td>'
		+ '</tr><tr>'
			+ '<td style="padding-left:20px;width:33%">Battle Type: ' + i + '</td>'
			+ '<td style="padding-left:10px;width:34%">Battle Summary: ' + G + '</td>'
			+ '<td></td>'
		+ '</tr><tr>'
			+ '<td style="padding-left:10px;width:33%">Proficiency Table: ' + b + '</td>'
			+ '<td style="padding-left:10px;width:34%">Round Reminder: ' + o + '</td>'
			+ '<td></td>'
		+ '</tr><tr>'
			+ '<td></td>'
			+ '<td style="padding-left:10px;width:34%">Powerup Alerts: ' + J + '</td>'
			+ '<td></td>'
		+ '</tr><tr>'
			+ '<td style="padding-left:10px;width:33%"></td>'
			+ '<td style="padding-left:10px;width:34%">Overcharge Alert: ' + (_settings.isAlertOverchargeFull ? a : w) + '</td>'
			+ '<td></td>'
		+ '</tr></table>';
	if (_overview.isLoaded && _overview.totalRounds > 0)
		x += '<table class="_UI" cellspacing="0" cellpadding="2" style="width:100%"><tr><td align="right" colspan="3"><input type="button" class="_resetOverview" value="Reset Overview" /></td></tr></table>'
	return x;
}
function getReportStatsHtml() {
	var c = "No data found. Complete a round to begin tracking.";
	if (_stats.isLoaded && _stats.rounds > 0) {
		c = '<table class="_UI" cellspacing="0" cellpadding="2" style="width:100%">';
		if (!_settings.isTrackStats)
			c += '<tr><td align="center" colspan="2"><div align="center" class="ui-state-error ui-corner-all" style="padding:4px;margin:4px"><span class="ui-icon ui-icon-pause"></span><b>TRACKING PAUSED</b></div></td></tr>';
		var j = _stats.elemSpells[1] + _stats.divineSpells[1] + _stats.forbidSpells[1];
		var i = _stats.supportSpells + _stats.curativeSpells + _stats.depSpells[1] + _stats.sHits[0] + _stats.sHits[1];
		var h = _stats.sHits[0] + _stats.sHits[1] + _stats.depSpells[1] + _stats.sResists;
		var g = _stats.sHits[0] + _stats.sHits[1] + _stats.depSpells[1];
		var f = _stats.aHits[0] + _stats.aHits[1];
		var e = _stats.sHits[0] + _stats.sHits[1];
		var d = _stats.mHits[0] + _stats.mHits[1];
		var b = _stats.dDealt[0] + _stats.dDealt[1] + _stats.dDealt[2];
		var a = _stats.dDealt[0] + _stats.dDealt[1];
		var bp = _stats.pParries + _stats.pBlocks;
		var call = _stats.aCounters[0] - _stats.aCounters[2] - 2*_stats.aCounters[3];
		var c1 = _stats.aCounters[0] - 2*_stats.aCounters[2] - 3*_stats.aCounters[3];
		var dst = new Date();
		dst.setTime(_stats.datestart);
		var dst1 = dst.toLocaleString();
		var dom = _stats.aDomino[0];
		var elall = _stats.elemSpells[1] + _stats.elemSpells[3];
		var divall = _stats.divineSpells[1] + _stats.divineSpells[3];
		var forall = _stats.forbidSpells[1] + _stats.forbidSpells[3];
		var offhand = _stats.aOffhands[0] + _stats.aOffhands[2];
		var offhanddam = _stats.aOffhands[1] + _stats.aOffhands[3];
		if (browser.isChrome) dst1 = dst.toLocaleDateString() + " " + dst.toLocaleTimeString();
		c += '<tr><td colspan="2"><b>Rounds tracked:</b> ' + _stats.rounds + ' <b>Since: </b>' + dst1 + '</td></tr>'
		c += '<tr><td colspan="2"><b>Monsters killed:</b> ' + _stats.kills + '</td></tr>'
		c += '<tr><td colspan="2"><b>Offensive Statistics:</b></td></tr>'
		c += '<tr><td style="padding-left:10px"><b>Physical:</b></td><td style="padding-left:10px"><b>Magical:</b></td></tr>'
		c += '<tr><td style="padding-left:20px">Accuracy: ' + (_stats.aAttempts === 0 ? 0 : (f / _stats.aAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Accuracy: ' + (h === 0 ? 0 : (g / h * 100).toFixed(2)) + '%</td></tr>'
		c += '<tr><td style="padding-left:20px">Crit chance: ' + (f === 0 ? 0 : (_stats.aHits[1] / f * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Crit chance: ' + (e === 0 ? 0 : (_stats.sHits[1] / e * 100).toFixed(2)) + '%</td></tr>'
		c += '<tr><td style="padding-left:20px">Overwhelming Strikes chance: ' + (f === 0 ? 0 : (_stats.overStrikes / f * 100).toFixed(2)) + '%</td></tr>'
		c += '<tr><td style="padding-left:20px">Counter chance on block/parry: ' + (bp === 0 ? 0 : (_stats.aCounters[0]*100/bp).toFixed(2)) + '%</td></tr>'
		c += '<tr><td style="padding-left:30px">Number of counters in turn:</td></tr>';
		c += '<tr><td colspan="2" style="padding-left:30px">One - ' + (c1 === 0 ? 0 : (c1*100/call).toFixed(2)) + '% | Two - ' + (_stats.aCounters[2] === 0 ? 0 : (_stats.aCounters[2]*100/call).toFixed(2)) + '% | Three - ' + (_stats.aCounters[3] === 0 ? 0 :(_stats.aCounters[3]*100/call).toFixed(2)) + '%</td></tr>';
		c += '<tr><td style="padding-left:30px">Stun chance on counter: ' + (call === 0 ? 0 : (_stats.weaponprocs[7]*100/call).toFixed(2)) + '%</td></tr>';
		c += '<tr><td style="padding-left:30px">Average Counter damage: ' + (_stats.aCounters[0] === 0 ? 0 : (_stats.aCounters[1] / _stats.aCounters[0]).toFixed(2)) + '</td></tr>';
		c += '<tr><td style="padding-left:20px">Offhand Strike chance: ' + (f === 0 ? 0 : (offhand / f * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Channeling chance: ' + (i === 0 ? 0 : (_stats.channel / i * 100).toFixed(2)) + '%</td></tr>';
		c += '<tr><td colspan="2" style="padding-left:30px">Average Offhand damage: ' + (offhand === 0 ? 0 : (offhanddam / offhand).toFixed(2)) + '</td></tr>';
		c += '<tr><td colspan="2" style="padding-left:20px">Domino Strike chance: ' + (f === 0 ? 0 : (dom / f * 100).toFixed(2)) + '%</td></tr>';
		c += '<tr><td colspan="2" style="padding-left:30px">Number of hits:</td></tr>';
		c += '<tr><td colspan="2" style="padding-left:30px">2 - ' + (dom === 0 ? 0 : (_stats.aDomino[2]*100/dom).toFixed(2)) + '%| 3 - ' + (dom === 0 ? 0 : (_stats.aDomino[3]*100/dom).toFixed(2)) + '%| 4 - ' + (dom === 0 ? 0 : (_stats.aDomino[4]*100/dom).toFixed(2)) + '% | 5 - ' + (dom === 0 ? 0 : (_stats.aDomino[5]*100/dom).toFixed(2)) + '%</td></tr>';
		c += '<tr><td colspan="2" style="padding-left:30px">6 - ' + (dom === 0 ? 0 : (_stats.aDomino[6]*100/dom).toFixed(2)) + '%| 7 - ' + (dom === 0 ? 0 : (_stats.aDomino[7]*100/dom).toFixed(2)) + '%| 8 - ' + (dom === 0 ? 0 : (_stats.aDomino[8]*100/dom).toFixed(2)) + '%| 9 - ' + (dom === 0 ? 0 : (_stats.aDomino[9]*100/dom).toFixed(2)) + '%</td></tr>';
		c += '<tr><td colspan="2" style="padding-left:35px">Average number of hits: ' + (dom === 0 ? 0 : (_stats.aDomino[1] / dom).toFixed(2)) + '</td></tr>';
		c += '<tr><td colspan="2" style="padding-left:20px">Stun chance: ' + (f === 0 ? 0 : (_stats.weaponprocs[0]*100 / f).toFixed(2)) + '%</td></tr>';
		c += '<tr><td colspan="2" style="padding-left:20px">Penetrated armor chance: ' + (f === 0 ? 0 : (_stats.weaponprocs[1]*100 / f).toFixed(2)) + '%</td></tr>';
		c += '<tr><td colspan="2" style="padding-left:20px">Bleeding wound chance: ' + (f === 0 ? 0 : (_stats.weaponprocs[2]*100 / f).toFixed(2)) + '%</td></tr>';
		c += '<tr><td style="padding-left:20px">Average damage dealt per hit: ' + (_stats.aHits[0] === 0 ? 0 : (_stats.dDealt[0] / _stats.aHits[0]).toFixed(2)) + '</td><td style="padding-left:20px">Average damage dealt per spell: ' + (_stats.sHits[0] === 0 ? 0 : (_stats.dDealtSp[0] / _stats.sHits[0]).toFixed(2)) + '</td></tr>';
		c += '<tr><td style="padding-left:20px">Average damage dealt per crit: ' + (_stats.aHits[1] === 0 ? 0 : (_stats.dDealt[1] / _stats.aHits[1]).toFixed(2)) + '</td><td style="padding-left:20px">Average damage dealt per spell crit: ' + (_stats.sHits[1] === 0 ? 0 : (_stats.dDealtSp[1] / _stats.sHits[1]).toFixed(2)) + '</td></tr>';
		c += '<tr><td style="padding-left:20px">Average damage dealt:</td><td style="padding-left:20px">Average spell damage dealt: ' + (e === 0 ? 0 : ((_stats.dDealtSp[0] + _stats.dDealtSp[1]) / e).toFixed(2)) + '</td></tr>';
		c += '<tr><td colspan="2" style="padding-left:30px">Without Bleeding Wound: ' + (f === 0 ? 0 : (a / f).toFixed(2)) + '</td>';
		c += '<tr><td colspan="2" style="padding-left:30px">With Bleeding Wound: ' + (f === 0 ? 0 : (b / f).toFixed(2)) + '</td></tr>';
		c += '<tr><td colspan="2" style="padding-left:30px">Percent total damage from Bleeding Wound: ' + (b === 0 ? 0 : (_stats.dDealt[2] / b * 100).toFixed(2)) + '%</td></tr>';
		c += '<tr><td colspan="2" style="padding-left:30px">Percent change in average damage: ' + (a === 0 ? 0 : (Math.abs(((b / f) - (a / f))) / Math.abs(a / f) * 100).toFixed(2)) + '%</td></tr>';
		c += '<tr><td colspan="2" style="padding-left:20px">Drain HP chance: ' + (f === 0 ? 0 : (_stats.weaponprocs[4]*100 / f).toFixed(2)) + '%</td></tr>';
		c += '<tr><td colspan="2" style="padding-left:20px">Drain MP chance: ' + (f === 0 ? 0 : (_stats.weaponprocs[5]*100 / f).toFixed(2)) + '%</td></tr>';
		c += '<tr><td colspan="2" style="padding-left:20px">Drain SP chance: ' + (f === 0 ? 0 : (_stats.weaponprocs[6]*100 / f).toFixed(2)) + '%</td></tr>';
		c += '<tr><td colspan="2"><b>Defensive Statistics:</b></td></tr>'
		c += '<tr><td style="padding-left:10px">Overall chance of getting hit: ' + (_stats.mAttempts === 0 ? 0 : (d / _stats.mAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:10px">Average HP restored by Cure:</td></tr>'
		c += '<tr><td style="padding-left:20px">Miss chance: ' + (_stats.mAttempts === 0 ? 0 : (_stats.pDodges / _stats.mAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Cure: ' + (_stats.cureCounts[0] === 0 ? 0 : (_stats.cureTotals[0] / _stats.cureCounts[0]).toFixed(2)) + ' HP/cast</td></tr>'
		c += '<tr><td style="padding-left:20px">Evade chance: ' + (_stats.mAttempts === 0 ? 0 : (_stats.pEvades / _stats.mAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Cure II: ' + (_stats.cureCounts[1] === 0 ? 0 : (_stats.cureTotals[1] / _stats.cureCounts[1]).toFixed(2)) + ' HP/cast</td></tr>'
		c += '<tr><td style="padding-left:20px">Block chance: ' + (_stats.mAttempts === 0 ? 0 : (_stats.pBlocks / _stats.mAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Cure III: ' + (_stats.cureCounts[2] === 0 ? 0 : (_stats.cureTotals[2] / _stats.cureCounts[2]).toFixed(2)) + ' HP/cast</td></tr>'
		c += '<tr><td style="padding-left:20px">Parry chance: ' + (_stats.mAttempts === 0 ? 0 : (_stats.pParries / _stats.mAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:10px">Absorb casting efficiency: ' + (_stats.absArry[0] === 0 ? 0 : (_stats.absArry[1] / _stats.absArry[0] * 100).toFixed(2)) + '%</td></tr>'
		c += '<tr><td style="padding-left:20px">Resist chance: ' + (_stats.mSpells === 0 ? 0 : (_stats.pResists / _stats.mSpells * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Average MP drained by Absorb: ' + (_stats.absArry[1] === 0 ? 0 : (_stats.absArry[2] / _stats.absArry[1]).toFixed(2)) + ' MP/trigger</td></tr>'
		c += '<tr><td style="padding-left:10px">Monster crit chance: ' + (_stats.mAttempts === 0 ? 0 : (_stats.mHits[1] / _stats.mAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Average MP returns of Absorb: ' + (_stats.absArry[0] === 0 ? 0 : (_stats.absArry[2] / _stats.absArry[0]).toFixed(2)) + ' MP/cast</td></tr>'
		c += '<tr><td style="padding-left:20px">Percent of monster hits that are crits: ' + (d === 0 ? 0 : (_stats.mHits[1] / d * 100).toFixed(2)) + '%</td></tr>'
		c += '<tr><td style="padding-left:10px">Average damage taken per hit: ' + (_stats.mHits[0] === 0 ? 0 : (_stats.dTaken[0] / _stats.mHits[0]).toFixed(2)) + '</td></tr>'
		c += '<tr><td style="padding-left:10px">Average damage taken per crit: ' + (_stats.mHits[1] === 0 ? 0 : (_stats.dTaken[1] / _stats.mHits[1]).toFixed(2)) + '</td></tr>'
		c += '<tr><td style="padding-left:10px">Average damage taken: ' + (d === 0 ? 0 : ((_stats.dTaken[0] + _stats.dTaken[1]) / d).toFixed(2)) + '</td></tr>'
		c += '<tr><td style="padding-left:10px">Average total damage taken per round: ' + (_stats.rounds === 0 ? 0 : ((_stats.dTaken[0] + _stats.dTaken[1]) / _stats.rounds).toFixed(2)) + '</td></tr>'
		c += '<tr><td align="left" colspan="7"><form>SelectBackup:<select id="BackupNumber"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select>' + '<input type="button" class="_backupFunc" value="Save Backup" />' + '<input type="button" class="_backupFunc" value="Load Backup"/>' + '<input type="button" class="_backupFunc" value="AddTo Backup"/>' + '<input type="button" class="_backupFunc" value="AddFrom Backup"/>' + '<input type="button" class="_backupFunc" value="Remove Backup"/></form></td></tr>'
		c += '<tr><td><input type="button" class="_checkBackups" value="Check Existing Backups"/></td></tr>' + '</td></tr>'
		c += '<tr><td align="right" colspan="2"><input type="button" class="_resetStats" value="Reset Stats" /></td></tr>'
	}
	c += "</table>";
	return c;
}
function getReportItemHtml() {
	var e = "Tracking disabled.";
	if (_settings.isTrackItems && _drops.dropChances === 0)
		e = "No data found. Complete a round to begin tracking.";
	else if (_settings.isTrackItems && _drops.isLoaded && _drops.dropChances > 0)
		e = '<table class="_UI" cellspacing="0" cellpadding="1" style="width:100%">';
	else if (!_settings.isTrackItems && _drops.isLoaded && _drops.dropChances > 0)
		e = '<table class="_UI" cellspacing="0" cellpadding="1" style="width:100%"><tr><td align="center" colspan="4"><div align="center" class="ui-state-error ui-corner-all" style="padding:4px;margin:4px"><span class="ui-icon ui-icon-pause"></span><b>TRACKING PAUSED</b></div></td></tr>';
	if (_drops.isLoaded && _drops.dropChances > 0) {
		var b = _drops.artDrop + _drops.eqDrop + _drops.itemDrop;
		var b0 = _drops.artDropbyBT[0] + _drops.eqDropbyBT[0] + _drops.itemDropbyBT[0];
		var b1 = _drops.artDropbyBT[1] + _drops.eqDropbyBT[1] + _drops.itemDropbyBT[1];
		var b2 = _drops.artDropbyBT[2] + _drops.eqDropbyBT[2] + _drops.itemDropbyBT[2];
		var b3 = _drops.artDropbyBT[3] + _drops.eqDropbyBT[3] + _drops.itemDropbyBT[3];
		var b4 = _drops.artDropbyBT[4] + _drops.eqDropbyBT[4] + _drops.itemDropbyBT[4];
		var d = b / 100;
		var a = _drops.dropChances / 100;
		e += '<tr><td colspan="4"><b>Total Item Drops:</b> ' + b + " from " + _drops.dropChances + " monsters (" + (b / a).toFixed(2) + '% total drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Items: ' + _drops.itemDrop + " (" + (d === 0 ? 0 : (_drops.itemDrop / d).toFixed(2)) + "% of drops, " + (_drops.itemDrop / a).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Equipment: ' + _drops.eqDrop + " (" + (d === 0 ? 0 : (_drops.eqDrop / d).toFixed(2)) + "% of drops, " + (_drops.eqDrop / a).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Artifacts: ' + _drops.artDrop + " (" + (d === 0 ? 0 : (_drops.artDrop / d).toFixed(2)) + "% of drops, " + (_drops.artDrop / a).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:10px"><b>In hourly encounters:</b> ' + b0 + " from " + _drops.dropChancesbyBT[0] + " monsters (" + (b0*100 / _drops.dropChancesbyBT[0]).toFixed(2) + '% total drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Items: ' + _drops.itemDropbyBT[0] + " (" + (b0 === 0 ? 0 : (_drops.itemDropbyBT[0]*100 / b0).toFixed(2)) + "% of drops, " + (_drops.itemDropbyBT[0]*100/_drops.dropChancesbyBT[0]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:30px">Crystals: ' + _drops.crysDropbyBT[0] + " (" + (b0 === 0 ? 0 : (_drops.crysDropbyBT[0]*100 / b0).toFixed(2)) + "% of drops, " + (_drops.crysDropbyBT[0]*100/_drops.dropChancesbyBT[0]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Equipment: ' + _drops.eqDropbyBT[0] + " (" + (b0 === 0 ? 0 : (_drops.eqDropbyBT[0]*100 / b0).toFixed(2)) + "% of drops, " + (_drops.eqDropbyBT[0]*100/_drops.dropChancesbyBT[0]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Artifacts: ' + _drops.artDropbyBT[0] + " (" + (b0 === 0 ? 0 : (_drops.artDropbyBT[0]*100 / b0).toFixed(2)) + "% of drops, " + (_drops.artDropbyBT[0]*100/_drops.dropChancesbyBT[0]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:10px"><b>In Arenas:</b> ' + b1 + " from " + _drops.dropChancesbyBT[1] + " monsters (" + (b1*100 / _drops.dropChancesbyBT[1]).toFixed(2) + '% total drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Items: ' + _drops.itemDropbyBT[1] + " (" + (b1 === 0 ? 0 : (_drops.itemDropbyBT[1]*100 / b1).toFixed(2)) + "% of drops, " + (_drops.itemDropbyBT[1]*100/_drops.dropChancesbyBT[1]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:30px">Crystals: ' + _drops.crysDropbyBT[1] + " (" + (b1 === 0 ? 0 : (_drops.crysDropbyBT[1]*100 / b1).toFixed(2)) + "% of drops, " + (_drops.crysDropbyBT[1]*100/_drops.dropChancesbyBT[1]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Equipment: ' + _drops.eqDropbyBT[1] + " (" + (b1 === 0 ? 0 : (_drops.eqDropbyBT[1]*100 / b1).toFixed(2)) + "% of drops, " + (_drops.eqDropbyBT[1]*100/_drops.dropChancesbyBT[1]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Artifacts: ' + _drops.artDropbyBT[1] + " (" + (b1 === 0 ? 0 : (_drops.artDropbyBT[1]*100 / b1).toFixed(2)) + "% of drops, " + (_drops.artDropbyBT[1]*100/_drops.dropChancesbyBT[1]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:10px"><b>In GrindFests:</b> ' + b2 + " from " + _drops.dropChancesbyBT[2] + " monsters (" + (b2*100 / _drops.dropChancesbyBT[2]).toFixed(2) + '% total drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Items: ' + _drops.itemDropbyBT[2] + " (" + (b2 === 0 ? 0 : (_drops.itemDropbyBT[2]*100 / b2).toFixed(2)) + "% of drops, " + (_drops.itemDropbyBT[2]*100/_drops.dropChancesbyBT[2]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:30px">Crystals: ' + _drops.crysDropbyBT[2] + " (" + (b2 === 0 ? 0 : (_drops.crysDropbyBT[2]*100 / b2).toFixed(2)) + "% of drops, " + (_drops.crysDropbyBT[2]*100/_drops.dropChancesbyBT[2]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Equipment: ' + _drops.eqDropbyBT[2] + " (" + (b2 === 0 ? 0 : (_drops.eqDropbyBT[2]*100 / b2).toFixed(2)) + "% of drops, " + (_drops.eqDropbyBT[2]*100/_drops.dropChancesbyBT[2]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Artifacts: ' + _drops.artDropbyBT[2] + " (" + (b2 === 0 ? 0 : (_drops.artDropbyBT[2]*100 / b2).toFixed(2)) + "% of drops, " + (_drops.artDropbyBT[2]*100/_drops.dropChancesbyBT[2]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:10px"><b>In Item Worlds:</b> ' + b3 + " from " + _drops.dropChancesbyBT[3] + " monsters (" + (b3*100 / _drops.dropChancesbyBT[3]).toFixed(2) + '% total drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Items: ' + _drops.itemDropbyBT[3] + " (" + (b3 === 0 ? 0 : (_drops.itemDropbyBT[3]*100 / b3).toFixed(2)) + "% of drops, " + (_drops.itemDropbyBT[3]*100/_drops.dropChancesbyBT[3]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:30px">Crystals: ' + _drops.crysDropbyBT[3] + " (" + (b3 === 0 ? 0 : (_drops.crysDropbyBT[3]*100 / b3).toFixed(2)) + "% of drops, " + (_drops.crysDropbyBT[3]*100/_drops.dropChancesbyBT[3]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Equipment: ' + _drops.eqDropbyBT[3] + " (" + (b3 === 0 ? 0 : (_drops.eqDropbyBT[3]*100 / b3).toFixed(2)) + "% of drops, " + (_drops.eqDropbyBT[3]*100/_drops.dropChancesbyBT[3]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:20px">Artifacts: ' + _drops.artDropbyBT[3] + " (" + (b3 === 0 ? 0 : (_drops.artDropbyBT[3]*100 / b3).toFixed(2)) + "% of drops, " + (_drops.artDropbyBT[3]*100/_drops.dropChancesbyBT[3]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4"><b>Item:</b></td></tr>';
		for (var c = 0; c < _drops.itemArry.length; c = c + 2) {
			e += "<tr><td style='width:25%;padding-left:10px'>" + _drops.itemArry[c] + "</td><td style='width:25%'>x " + _drops.itemQtyArry[c] + " (" + (_drops.itemDrop === 0 ? 0 : ((_drops.itemQtyArry[c] / _drops.itemDrop) * 100).toFixed(2)) + "%)</td>";
			if (_drops.itemArry[c + 1] !== " ")
				e += "<td style='width:25%;padding-left:10px'>" + _drops.itemArry[c + 1] + "</td><td style='width:25%'>x " + _drops.itemQtyArry[c + 1] + " (" + (_drops.itemDrop === 0 ? 0 : ((_drops.itemQtyArry[c + 1] / _drops.itemDrop) * 100).toFixed(2)) + "%)</td></tr>";
			else e += "<td></td><td></td></tr>";
		}
		e += '<tr><td colspan="4"><b>Equipment:</b></td></tr>';
		var c = _drops.eqArray.length;
		while (c--) e += '<tr><td colspan="4" style="padding-left:10px">' + _drops.eqArray[c] + "</td></tr>";
		e += '<tr><td colspan="4"><b>Artifact:</b></td></tr>';
		c = _drops.artArry.length;
		while (c--) e += '<tr><td colspan="4" style="padding-left:10px">' + _drops.artArry[c] + " x " + _drops.artQtyArry[c] + "</td></tr>";
		e += '<tr><td align="right" colspan="4"><input type="button" class="_resetItems" value="Reset Drops" /></td></tr>';
	}
	e += "</table>";
	return e;
}
function getReportRewardHtml() {
	var e = "Tracking disabled.";
	if (_settings.isTrackRewards && _rewards.totalRwrds === 0) e = "No data found. Complete an arena to begin tracking.";
	else if (_settings.isTrackRewards && _rewards.isLoaded && _rewards.totalRwrds > 0) e = '<table class="_UI" cellspacing="0" cellpadding="1" style="width:100%">';
	else if (!_settings.isTrackRewards && _rewards.isLoaded && _rewards.totalRwrds > 0) e = '<table class="_UI" cellspacing="0" cellpadding="1" style="width:100%"><tr><td align="center" colspan="2"><div align="center" class="ui-state-error ui-corner-all" style="padding:4px;margin:4px"><span class="ui-icon ui-icon-pause"></span><b>TRACKING PAUSED</b></div></td></tr>';
	if (_rewards.isLoaded && _rewards.totalRwrds > 0) {
		var c = _rewards.totalRwrds / 100;
		var a = _rewards.tokenDrops[0] + _rewards.tokenDrops[1] + _rewards.tokenDrops[2];
		var b = a / 100;
		e += '<tr><td style="width:50%"><b>Total Rewards:</b> ' + _rewards.totalRwrds + '</td><td style="width:50%"><b>Token Bonus:</b> ' + a + " (" + (a / c).toFixed(2) + '% chance)</td></tr>'
			+ '<tr><td style="padding-left:10px;width:50%">Artifact: ' + _rewards.artRwrd + " (" + (c === 0 ? 0 : (_rewards.artRwrd / c).toFixed(2)) + '%)</td><td style="padding-left:10px;width:50%">[Token of Blood]: ' + _rewards.tokenDrops[0] + " (" + (b === 0 ? 0 : (_rewards.tokenDrops[0] / b).toFixed(2)) + '%)</td></tr>'
			+ '<tr><td style="padding-left:10px;width:50%">Equipment: ' + _rewards.eqRwrd + " (" + (c === 0 ? 0 : (_rewards.eqRwrd / c).toFixed(2)) + '%)</td><td style="padding-left:10px;width:50%">[Token of Healing]: ' + _rewards.tokenDrops[1] + " (" + (b === 0 ? 0 : (_rewards.tokenDrops[1] / b).toFixed(2)) + '%)</td></tr>'
			+ '<tr><td style="padding-left:10px;width:50%">Item: ' + _rewards.itemsRwrd + " (" + (c === 0 ? 0 : (_rewards.itemsRwrd / c).toFixed(2)) + '%)</td><td style="padding-left:10px;width:50%">[Chaos Token]: ' + _rewards.tokenDrops[2] + " (" + (b === 0 ? 0 : (_rewards.tokenDrops[2] / b).toFixed(2)) + '%)</td></tr>'
			+ '<tr><td colspan="2"><b>Artifact:</b></td></tr>';
		var d = _rewards.artRwrdArry.length;
		while (d--) e += '<tr><td colspan="2" style="padding-left:10px">' + _rewards.artRwrdArry[d] + " x " + _rewards.artRwrdQtyArry[d] + "</td></tr>";
		e += '<tr><td colspan="2"><b>Equipment:</b></td></tr>';
		d = _rewards.eqRwrdArry.length;
		while (d--) e += '<tr><td colspan="2" style="padding-left:10px">' + _rewards.eqRwrdArry[d] + "</tr></td>";
		e += '<tr><td colspan="2"><b>Item:</b></td></tr>';
		d = _rewards.itemRwrdArry.length;
		while (d--) e += '<tr><td colspan="2" style="padding-left:10px">' + _rewards.itemRwrdArry[d] + " x " + _rewards.itemRwrdQtyArry[d] + "</td></tr>";
		e += '<tr><td align="right" colspan="2"><input type="button" class="_resetRewards" value="Reset Arena Rewards" /></td></tr>';
	}
	e += "</table>";
	return e;
}
function getReportShrineHtml() {
	var c = "Tracking disabled.";
	if (_settings.isTrackShrine && _shrine.totalRewards === 0)
		c = "No data found. Make an offering at Snowflake's Shrine to begin tracking.";
	else if (_settings.isTrackShrine && _shrine.isLoaded && _shrine.totalRewards > 0)
		c = '<table class="_UI" cellspacing="0" cellpadding="1" style="width:100%">';
	else if (!_settings.isTrackShrine && _shrine.isLoaded && _shrine.totalRewards > 0)
		c = '<table class="_UI" cellspacing="0" cellpadding="1" style="width:100%"><tr><td align="center"><div align="center" class="ui-state-error ui-corner-all" style="padding:4px;margin:4px"><span class="ui-icon ui-icon-pause"></span><b>TRACKING PAUSED</b></div></td></tr>';
	if (_shrine.isLoaded && _shrine.totalRewards > 0) {
		var g = 0;
		var d = 0;
		var a = 0;
		var b = 0;
		var e = 0;
		var h = 0;
		var f = 0;
		if (_shrine.artifactsTraded > 0) {
			g = (_shrine.artifactsTraded) / 100;
			d = (_shrine.artifactAP / g).toFixed(2);
			a = (_shrine.artifactHath / g).toFixed(2);
			e = (_shrine.artifactHathTotal / (g * 100)).toFixed(2);
			h = (_shrine.artifactCrystal / g).toFixed(2);
			f = (_shrine.artifactItem / g).toFixed(2)
			b = (_shrine.artifactStat / g).toFixed(2)
		}
		c += "<tr><td><b>Artifacts:</b> " + _shrine.artifactsTraded + ' traded</td></tr>'
			+ '<tr><td style="padding-left:10px">Ability Points: ' + _shrine.artifactAP + ' (' + d + '% chance)</td></tr>'
			+ '<tr><td style="padding-left:10px">Attributes: ' + _shrine.artifactStat + ' (' + b + '% chance)</td></tr>'
			+ '<tr><td style="padding-left:10px">Hath: ' + _shrine.artifactHathTotal + ' (' + a + '% chance; ' + e + ' Hath per Artifact)</td></tr>'
			+ '<tr><td style="padding-left:10px">Crystals: ' + _shrine.artifactCrystal + ' (' + h + '% chance)</td></tr>'
			+ '<tr><td style="padding-left:10px">Energy Drinks: ' + _shrine.artifactItem + ' (' + f + '% chance)</td></tr>'
			+ '<tr><td ><b>Trophies:</b> ' + _shrine.trophyArray.length + ' traded</td></tr>';
		var b = _shrine.trophyArray.length;
		while (b--)
			c += '<tr><td style="padding-left:10px">' + _shrine.trophyArray[b] + "</td></tr>";
		c += '<tr><td align="right"><input type="button" class="_clearTrophies" value="Clear Trophies" /> <input type="button" class="_resetShrine" value="Reset Shrine" /></td></tr>';
	}
	c += "</table>";
	return c;
}
function initUI() {
	var top = 4;
	var left = document.querySelector("div.stuffbox").scrollWidth - 60 - 4;
	var div = document.createElement("div");
	div.id = "hvstat-open-button";
	div.className = "ui-state-default ui-corner-all";
	div.style.cssText = "position: absolute; top: " + top + "px; left: " + left + "px; cursor: pointer;";
	div.innerHTML = '<span style="margin: 3px;" class="ui-icon ui-icon-wrench" title="Launch HV STAT UI"/>';
	div.addEventListener("click", initMainMenu);
	div.addEventListener("mouseover", function (event) {
		this.className = this.className.replace(" ui-state-hover", "");
		this.className += " ui-state-hover";
	});
	div.addEventListener("mouseout", function (event) {
		this.className = this.className.replace(" ui-state-hover", "");
	});
	document.body.insertBefore(div, null);
}

function initMainMenu(event) {
	event.currentTarget.removeEventListener("click", initMainMenu);
	// load jQuery and jQuery UI
	browser.extension.loadScript("scripts/", "jquery-1.8.3.min.js");
	browser.extension.loadScript("scripts/", "jquery-ui-1.9.2.custom.min.js");

	var b = "[STAT] HentaiVerse Statistics, Tracking, and Analysis Tool v." + HVStat.VERSION;
	var c = document.createElement("div");
	$(c).addClass("_mainMenu").css("text-align", "left");
	$(c).html(browser.extension.getResourceText("resources/", "main.html"));
	$("body").append(c);
	$(c).dialog({
		autoOpen: false,
		closeOnEscape: true,
		draggable: false,
		resizable: false,
		height: 560,
		width: 850,
		modal: true,
		position: ["center", "center"],
		title: b
	});
	$("#hvstat-tabs").tabs();
	loadOverviewObject();
	loadStatsObject();
	loadDropsObject();
	loadRewardsObject();
	loadShrineObject();
	initOverviewPane();
	initStatsPane();
	initItemPane();
	initRewardsPane();
	initShrinePane();
	$("#hvstat-settings-pane").html(browser.extension.getResourceText("resources/", "settings-pane.html"));
	initSettingsPane();
	$("#hvstat-monster-database-pane").html(browser.extension.getResourceText("resources/", "monster-database-pane.html"));
	initMonsterStatsPane();
	var mainButton = document.getElementById("hvstat-open-button");
	mainButton.addEventListener("click", function () {
		if ($(c).dialog("isOpen"))
			$(c).dialog("close");
		else
			$(c).dialog("open");
	});
	_isMenuInitComplete = true;
	$(c).dialog("open");
}
function initOverviewPane() {
	$("#pane1").html(getReportOverviewHtml());
	$("._resetOverview").click(function () {
		if (confirm("Reset Overview tab?")) _overview.reset();
	});
}
function initStatsPane() {
	var innerHTML;
	if (_stats.isLoaded && _stats.rounds > 0) {
		innerHTML = browser.extension.getResourceText("resources/", "battle-stats-pane.html");
	} else {
		innerHTML = "No data found. Complete a round to begin tracking.";
	}
	$("#battle-stats-pane").html(innerHTML);

	if (_stats.isLoaded && _stats.rounds > 0) {
		if (!_settings.isTrackStats) {
		}
		var j = _stats.elemSpells[1] + _stats.divineSpells[1] + _stats.forbidSpells[1];
		var i = _stats.supportSpells + _stats.curativeSpells + _stats.depSpells[1] + _stats.sHits[0] + _stats.sHits[1];
		var h = _stats.sHits[0] + _stats.sHits[1] + _stats.depSpells[1] + _stats.sResists;
		var g = _stats.sHits[0] + _stats.sHits[1] + _stats.depSpells[1];
		var f = _stats.aHits[0] + _stats.aHits[1];
		var e = _stats.sHits[0] + _stats.sHits[1];
		var d = _stats.mHits[0] + _stats.mHits[1];
		var b = _stats.dDealt[0] + _stats.dDealt[1] + _stats.dDealt[2];
		var a = _stats.dDealt[0] + _stats.dDealt[1];
		var bp = _stats.pParries + _stats.pBlocks;
		var call = _stats.aCounters[0] - _stats.aCounters[2] - 2*_stats.aCounters[3];
		var c1 = _stats.aCounters[0] - 2*_stats.aCounters[2] - 3*_stats.aCounters[3];
		var dst = new Date();
		dst.setTime(_stats.datestart);
		var dst1 = dst.toLocaleString();
		var dom = _stats.aDomino[0];
		var elall = _stats.elemSpells[1] + _stats.elemSpells[3];
		var divall = _stats.divineSpells[1] + _stats.divineSpells[3];
		var forall = _stats.forbidSpells[1] + _stats.forbidSpells[3];
		var offhand = _stats.aOffhands[0] + _stats.aOffhands[2];
		var offhanddam = _stats.aOffhands[1] + _stats.aOffhands[3];
		if (browser.isChrome) dst1 = dst.toLocaleDateString() + " " + dst.toLocaleTimeString();
		$('#hvstat-battle-stats-rounds-tracked').text(_stats.rounds);
		$('#hvstat-battle-stats-since').text(dst1);
		$('#hvstat-battle-stats-monsters-killed').text(_stats.kills);

		$('#hvstat-battle-stats-p-accuracy').text(_stats.aAttempts === 0 ? 0 : (f / _stats.aAttempts * 100).toFixed(2));
		$('#hvstat-battle-stats-m-accuracy').text(h === 0 ? 0 : (g / h * 100).toFixed(2));
		$('#hvstat-battle-stats-p-crit-chance').text(f === 0 ? 0 : (_stats.aHits[1] / f * 100).toFixed(2));
		$('#hvstat-battle-stats-m-crit-chance').text(e === 0 ? 0 : (_stats.sHits[1] / e * 100).toFixed(2));

		$('#hvstat-battle-stats-overwhelming-strikes-chance').text(f === 0 ? 0 : (_stats.overStrikes / f * 100).toFixed(2));
		$('#hvstat-battle-stats-counter-chance').text(bp === 0 ? 0 : (_stats.aCounters[0]*100/bp).toFixed(2));
		$('#hvstat-battle-stats-1-counter').text(c1 === 0 ? 0 : (c1*100/call).toFixed(2));
		$('#hvstat-battle-stats-2-counter').text(_stats.aCounters[2] === 0 ? 0 : (_stats.aCounters[2]*100/call).toFixed(2));
		$('#hvstat-battle-stats-3-counter').text(_stats.aCounters[3] === 0 ? 0 :(_stats.aCounters[3]*100/call).toFixed(2));
		$('#hvstat-battle-stats-stun-chance-on-counter').text(call === 0 ? 0 : (_stats.weaponprocs[7]*100/call).toFixed(2));
		$('#hvstat-battle-stats-average-counter-damage').text(_stats.aCounters[0] === 0 ? 0 : (_stats.aCounters[1] / _stats.aCounters[0]).toFixed(2));

		$('#hvstat-battle-stats-offhand-strike-chance').text(f === 0 ? 0 : (offhand / f * 100).toFixed(2));
		$('#hvstat-battle-stats-chenneling-chance').text(i === 0 ? 0 : (_stats.channel / i * 100).toFixed(2));
		$('#hvstat-battle-stats-average-offhand-damage').text(offhand === 0 ? 0 : (offhanddam / offhand).toFixed(2));

		$('#hvstat-battle-stats-domino-strike-chance').text(f === 0 ? 0 : (dom / f * 100).toFixed(2));
		$('#hvstat-battle-stats-domino-2-hits').text(dom === 0 ? 0 : (_stats.aDomino[2]*100/dom).toFixed(2));
		$('#hvstat-battle-stats-domino-3-hits').text(dom === 0 ? 0 : (_stats.aDomino[3]*100/dom).toFixed(2));
		$('#hvstat-battle-stats-domino-4-hits').text(dom === 0 ? 0 : (_stats.aDomino[4]*100/dom).toFixed(2));
		$('#hvstat-battle-stats-domino-5-hits').text(dom === 0 ? 0 : (_stats.aDomino[5]*100/dom).toFixed(2));
		$('#hvstat-battle-stats-domino-6-hits').text(dom === 0 ? 0 : (_stats.aDomino[6]*100/dom).toFixed(2));
		$('#hvstat-battle-stats-domino-7-hits').text(dom === 0 ? 0 : (_stats.aDomino[7]*100/dom).toFixed(2));
		$('#hvstat-battle-stats-domino-8-hits').text(dom === 0 ? 0 : (_stats.aDomino[8]*100/dom).toFixed(2));
		$('#hvstat-battle-stats-domino-9-hits').text(dom === 0 ? 0 : (_stats.aDomino[9]*100/dom).toFixed(2));
		$('#hvstat-battle-stats-domino-average-number-of-hits').text(dom === 0 ? 0 : (_stats.aDomino[1] / dom).toFixed(2));

		$('#hvstat-battle-stats-stun-chance').text(f === 0 ? 0 : (_stats.weaponprocs[0]*100 / f).toFixed(2));
		$('#hvstat-battle-stats-penetrated-armor-chance').text(f === 0 ? 0 : (_stats.weaponprocs[1]*100 / f).toFixed(2));

		$('#hvstat-battle-stats-bleeding-wound-chance').text(f === 0 ? 0 : (_stats.weaponprocs[2]*100 / f).toFixed(2));
		$('#hvstat-battle-stats-average-damage-dealt-per-hit').text(_stats.aHits[0] === 0 ? 0 : (_stats.dDealt[0] / _stats.aHits[0]).toFixed(2));
		$('#hvstat-battle-stats-average-damage-dealt-per-spell').text(_stats.sHits[0] === 0 ? 0 : (_stats.dDealtSp[0] / _stats.sHits[0]).toFixed(2));
		$('#hvstat-battle-stats-average-damage-dealt-per-crit').text(_stats.aHits[1] === 0 ? 0 : (_stats.dDealt[1] / _stats.aHits[1]).toFixed(2));
		$('#hvstat-battle-stats-average-damage-dealt-per-spell-crit').text(_stats.sHits[1] === 0 ? 0 : (_stats.dDealtSp[1] / _stats.sHits[1]).toFixed(2));
		$('#hvstat-battle-stats-average-spell-damage-dealt').text(e === 0 ? 0 : ((_stats.dDealtSp[0] + _stats.dDealtSp[1]) / e).toFixed(2));
		$('#hvstat-battle-stats-average-damage-dealt-without-bleeding-wound').text(f === 0 ? 0 : (a / f).toFixed(2));
		$('#hvstat-battle-stats-average-damage-dealt-with-bleeding-wound').text(f === 0 ? 0 : (b / f).toFixed(2));
		$('#hvstat-battle-stats-percent-total-damage-from-bleeding-wound').text(b === 0 ? 0 : (_stats.dDealt[2] / b * 100).toFixed(2));
		$('#hvstat-battle-stats-percent-change-in-average-damage').text(a === 0 ? 0 : (Math.abs(((b / f) - (a / f))) / Math.abs(a / f) * 100).toFixed(2));

		$('#hvstat-battle-stats-drain-hp-chance').text(f === 0 ? 0 : (_stats.weaponprocs[4]*100 / f).toFixed(2));
		$('#hvstat-battle-stats-drain-mp-chance').text(f === 0 ? 0 : (_stats.weaponprocs[5]*100 / f).toFixed(2));
		$('#hvstat-battle-stats-drain-sp-chance').text(f === 0 ? 0 : (_stats.weaponprocs[6]*100 / f).toFixed(2));

		$('#hvstat-battle-stats-overall-chance-of-getting-hit').text(_stats.mAttempts === 0 ? 0 : (d / _stats.mAttempts * 100).toFixed(2));
		$('#hvstat-battle-stats-miss-chance').text(_stats.mAttempts === 0 ? 0 : (_stats.pDodges / _stats.mAttempts * 100).toFixed(2));
		$('#hvstat-battle-stats-average-hp-restored-by-cure').text(_stats.cureCounts[0] === 0 ? 0 : (_stats.cureTotals[0] / _stats.cureCounts[0]).toFixed(2));
		$('#hvstat-battle-stats-evade-chance').text(_stats.mAttempts === 0 ? 0 : (_stats.pEvades / _stats.mAttempts * 100).toFixed(2));
		$('#hvstat-battle-stats-average-hp-restored-by-cure2').text(_stats.cureCounts[1] === 0 ? 0 : (_stats.cureTotals[1] / _stats.cureCounts[1]).toFixed(2));
		$('#hvstat-battle-stats-block-chance').text(_stats.mAttempts === 0 ? 0 : (_stats.pBlocks / _stats.mAttempts * 100).toFixed(2));
		$('#hvstat-battle-stats-average-hp-restored-by-cure3').text(_stats.cureCounts[2] === 0 ? 0 : (_stats.cureTotals[2] / _stats.cureCounts[2]).toFixed(2));
		$('#hvstat-battle-stats-parry-chance').text(_stats.mAttempts === 0 ? 0 : (_stats.pParries / _stats.mAttempts * 100).toFixed(2));
		$('#hvstat-battle-stats-absorb-casting-efficiency').text(_stats.absArry[0] === 0 ? 0 : (_stats.absArry[1] / _stats.absArry[0] * 100).toFixed(2));
		$('#hvstat-battle-stats-resist-chance').text(_stats.mSpells === 0 ? 0 : (_stats.pResists / _stats.mSpells * 100).toFixed(2));
		$('#hvstat-battle-stats-average-mp-drained-by-absorb').text(_stats.absArry[1] === 0 ? 0 : (_stats.absArry[2] / _stats.absArry[1]).toFixed(2));
		$('#hvstat-battle-stats-monster-crit-chance').text(_stats.mAttempts === 0 ? 0 : (_stats.mHits[1] / _stats.mAttempts * 100).toFixed(2));
		$('#hvstat-battle-stats-average-mp-returns-of-absorb').text(_stats.absArry[0] === 0 ? 0 : (_stats.absArry[2] / _stats.absArry[0]).toFixed(2));
		$('#hvstat-battle-stats-percent-of-monster-hits-that-are-crits').text(d === 0 ? 0 : (_stats.mHits[1] / d * 100).toFixed(2));
		$('#hvstat-battle-stats-average-damage-taken-per-hit').text(_stats.mHits[0] === 0 ? 0 : (_stats.dTaken[0] / _stats.mHits[0]).toFixed(2));
		$('#hvstat-battle-stats-average-damage-taken-per-crit').text(_stats.mHits[1] === 0 ? 0 : (_stats.dTaken[1] / _stats.mHits[1]).toFixed(2));
		$('#hvstat-battle-stats-average-damage-taken').text(d === 0 ? 0 : ((_stats.dTaken[0] + _stats.dTaken[1]) / d).toFixed(2));
		$('#hvstat-battle-stats-average-total-damage-taken-per-round').text(_stats.rounds === 0 ? 0 : ((_stats.dTaken[0] + _stats.dTaken[1]) / _stats.rounds).toFixed(2));
	}

	$("._resetStats").click(function () {
		if (confirm("Reset Stats tab?")) _stats.reset();
	});
	$("._checkBackups").click(function () {
		loadBackupObject(1);
		loadBackupObject(2);
		loadBackupObject(3);
		loadBackupObject(4);
		loadBackupObject(5);
		var ds = [];
		var d = [];
		ds[1] = ds[2] = ds[3] = ds[4] = ds[5] = "None yet";
		d[1] = d[2] = d[3] = d[4] = d[5] = "Never";
		var nd = new Date();
		for (var i = 1; i <= 5; i++) {
			if (_backup[i].datesave !== 0) {
				nd.setTime( _backup[i].datesave);
				ds[i] = nd.toLocaleString();
				if (browser.isChrome) ds[i] = nd.toLocaleDateString() + " " + nd.toLocaleTimeString();
			}
			if (_backup[i].datestart !== 0) {
				nd.setTime( _backup[i].datestart);
				d[i] = nd.toLocaleString();
				if (browser.isChrome) d[i] = nd.toLocaleDateString() + " " + nd.toLocaleTimeString();
			}
			
		}
		alert( "Backup 1:\nLast save date: " + ds[1] + "\nStats tracked since: " + d[1] + "\nNumber of rounds tracked: " + _backup[1].rounds
			+ "\n\nBackup 2\nLast save date: " + ds[2] + "\nStats tracked since: " + d[2] + "\nNumber of rounds tracked: " + _backup[2].rounds
			+ "\n\nBackup 3\nLast save date: " + ds[3] + "\nStats tracked since: " + d[3] + "\nNumber of rounds tracked: " + _backup[3].rounds
			+ "\n\nBackup 4\nLast save date: " + ds[4] + "\nStats tracked since: " + d[4] + "\nNumber of rounds tracked: " + _backup[4].rounds
			+ "\n\nBackup 5\nLast save date: " + ds[5] + "\nStats tracked since: " + d[5] + "\nNumber of rounds tracked: " + _backup[5].rounds);
	});
	
	$("._backupFunc").click(function () {
		var backupID = Number(document.getElementById("BackupNumber").options[document.getElementById("BackupNumber").selectedIndex].value);
		var ba = 0;
		loadStatsObject();
		if ( backupID < 1 || backupID > 5 ) {
			alert ("'" + backupID + "'" + " is not correct number: " + "Choose beetwen 1-5");
			return;
		}
		loadBackupObject(backupID);
		ba = _backup[backupID];
		
		switch ($(this).attr("value")) {
		case "Save Backup":
			if (confirm("Save stats to backup " + backupID + "?")) {
				saveStatsBackup(backupID);
				ba.datesave = (new Date()).getTime();
				ba.save();
			}
			break;
		case "Load Backup":
			if (confirm("Load stats from backup " + backupID + "?")) {
				loadStatsBackup(backupID);
				_stats.save();
			}
			break;
		case "AddTo Backup":
			if (confirm("Add stats to backup " + backupID + "?")) {
				addtoStatsBackup(backupID);
				ba.datesave = (new Date()).getTime();
				ba.save();
			}
			break;
		case "AddFrom Backup":
			if (confirm("Add stats from backup " + backupID + "?")) {
				addfromStatsBackup(backupID);
				_stats.save();
			}
			break;
		case "Remove Backup":
			if (confirm("Remove stats from backup " + backupID + "?")) ba.reset();
		}
	});
}
function initItemPane() {
	$("#pane3").html(getReportItemHtml());
	$("._resetItems").click(function () {
		if (confirm("Reset Item Drops tab?")) _drops.reset();
	});
}
function initRewardsPane() {
	$("#pane4").html(getReportRewardHtml());
	$("._resetRewards").click(function () {
		if (confirm("Reset Arena Rewards tab?")) _rewards.reset();
	});
}
function initShrinePane() {
	$("#pane5").html(getReportShrineHtml());
	$("._resetShrine").click(function () {
		if (confirm("Reset Shrine tab?"))
			_shrine.reset();
	});
	$("._clearTrophies").click(function () {
		if (confirm("Clear Trophy list?")) {
			_shrine.trophyArray = [];
			_shrine.save();
		}
	});
}
function initMonsterStatsPane() {
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
	// General Options
	if (_settings.isShowSidebarProfs) $("input[name=isShowSidebarProfs]").attr("checked", "checked");
	if (_settings.isChangePageTitle) $("input[name=isChangePageTitle]").attr("checked", "checked");
	$("input[name=customPageTitle]").attr("value", _settings.customPageTitle);
	if (_settings.isStartAlert) $("input[name=isStartAlert]").attr("checked", "checked");
	$("input[name=StartAlertHP]").attr("value", _settings.StartAlertHP);
	$("input[name=StartAlertMP]").attr("value", _settings.StartAlertMP);
	$("input[name=StartAlertSP]").attr("value", _settings.StartAlertSP);
	var diffsel = "diff" + String(_settings.StartAlertDifficulty);
	$("#"+diffsel+"").attr("selected", true);
	if (_settings.isShowScanButton) $("input[name=isShowScanButton]").attr("checked", "checked");
	if (_settings.isShowSkillButton) $("input[name=isShowSkillButton]").attr("checked", "checked");
	if (_settings.isShowEquippedSet) $("input[name=isShowEquippedSet]").attr("checked", "checked");
	if (_settings.isShowTags[0]) $("input[name=isShowTags0]").attr("checked", "checked");
	if (_settings.isShowTags[1]) $("input[name=isShowTags1]").attr("checked", "checked");
	if (_settings.isShowTags[2]) $("input[name=isShowTags2]").attr("checked", "checked");
	if (_settings.isShowTags[3]) $("input[name=isShowTags3]").attr("checked", "checked");
	if (_settings.isShowTags[4]) $("input[name=isShowTags4]").attr("checked", "checked");
	if (_settings.isShowTags[5]) $("input[name=isShowTags5]").attr("checked", "checked");

	// Keyboard Options
	if (_settings.adjustKeyEventHandling) $("input[name=adjustKeyEventHandling]").attr("checked", "checked");
	if (_settings.isEnableScanHotkey) $("input[name=isEnableScanHotkey]").attr("checked", "checked");
	if (_settings.isEnableSkillHotkey) $("input[name=isEnableSkillHotkey]").attr("checked", "checked");
	if (_settings.enableOFCHotkey) $("input[name=enableOFCHotkey]").attr("checked", "checked");
	if (_settings.enableScrollHotkey) $("input[name=enableScrollHotkey]").attr("checked", "checked");
	if (_settings.isDisableForgeHotKeys) $("input[name=isDisableForgeHotKeys]").attr("checked", "checked");
	if (_settings.enableShrineKeyPatch) $("input[name=enableShrineKeyPatch]").attr("checked", "checked");

	// Battle Enhancement
	if (_settings.isShowHighlight) $("input[name=isShowHighlight]").attr("checked", "checked");
	if (_settings.isAltHighlight) $("input[name=isAltHighlight]").attr("checked", "checked");
	if (_settings.isShowDivider) $("input[name=isShowDivider]").attr("checked", "checked");
	if (_settings.isShowSelfDuration) $("input[name=isShowSelfDuration]").attr("checked", "checked");
	if (_settings.isSelfEffectsWarnColor) $("input[name=isSelfEffectsWarnColor]").attr("checked", "checked");
	$("input[name=SelfWarnOrangeRounds]").attr("value", _settings.SelfWarnOrangeRounds);
	$("input[name=SelfWarnRedRounds]").attr("value", _settings.SelfWarnRedRounds);
	if (_settings.isShowRoundReminder) $("input[name=isShowRoundReminder]").attr("checked", "checked");
	$("input[name=reminderMinRounds]").attr("value", _settings.reminderMinRounds);
	$("input[name=reminderBeforeEnd]").attr("value", _settings.reminderBeforeEnd);
	if (_settings.isShowEndStats) $("input[name=isShowEndStats]").attr("checked", "checked");
	if (_settings.isShowEndProfs) {	//isShowEndProfs added by Ilirith
		$("input[name=isShowEndProfs]").attr("checked", "checked");
		if (_settings.isShowEndProfsMagic) $("input[name=isShowEndProfsMagic]").attr("checked", "checked");
		if (_settings.isShowEndProfsArmor) $("input[name=isShowEndProfsArmor]").attr("checked", "checked");
		if (_settings.isShowEndProfsWeapon) $("input[name=isShowEndProfsWeapon]").attr("checked", "checked");
	} else {
		$("input[name=isShowEndProfsMagic]").removeAttr("checked");
		$("input[name=isShowEndProfsArmor]").removeAttr("checked");
		$("input[name=isShowEndProfsWeapon]").removeAttr("checked");
	}
	if (_settings.isAlertGem) $("input[name=isAlertGem]").attr("checked", "checked");
	if (_settings.isAlertOverchargeFull) $("input[name=isAlertOverchargeFull]").attr("checked", "checked");
	if (_settings.isShowMonsterNumber) $("input[name=isShowMonsterNumber]").attr("checked", "checked"); //isShowMonsterNumber stolen from HV Lite, and added by Ilirith
	if (_settings.isShowRoundCounter) $("input[name=isShowRoundCounter]").attr("checked", "checked");
	if (_settings.isShowPowerupBox) $("input[name=isShowPowerupBox]").attr("checked", "checked");
	if (_settings.autoAdvanceBattleRound) $("input[name=autoAdvanceBattleRound]").attr("checked", "checked");
	$("input[name=autoAdvanceBattleRoundDelay]").attr("value", _settings.autoAdvanceBattleRoundDelay);

	// Display Monster Stats
	if (_settings.showMonsterHP) $("input[name=showMonsterHP]").attr("checked", "checked");
	if (_settings.showMonsterHPPercent) $("input[name=showMonsterHPPercent]").attr("checked", "checked");
	if (_settings.showMonsterMP) $("input[name=showMonsterMP]").attr("checked", "checked");
	if (_settings.showMonsterSP) $("input[name=showMonsterSP]").attr("checked", "checked");
	if (_settings.showMonsterInfoFromDB) $("input[name=showMonsterInfoFromDB]").attr("checked", "checked");
	if (_settings.showMonsterClassFromDB) $("input[name=showMonsterClassFromDB]").attr("checked", "checked");
	if (_settings.showMonsterPowerLevelFromDB) $("input[name=showMonsterPowerLevelFromDB]").attr("checked", "checked");
	if (_settings.showMonsterAttackTypeFromDB) $("input[name=showMonsterAttackTypeFromDB]").attr("checked", "checked");
	if (_settings.showMonsterWeaknessesFromDB) $("input[name=showMonsterWeaknessesFromDB]").attr("checked", "checked");
	if (_settings.showMonsterResistancesFromDB) $("input[name=showMonsterResistancesFromDB]").attr("checked", "checked");
	if (_settings.hideSpecificDamageType[0]) $("input[name=hideSpecificDamageType0]").attr("checked", "checked");
	if (_settings.hideSpecificDamageType[1]) $("input[name=hideSpecificDamageType1]").attr("checked", "checked");
	if (_settings.hideSpecificDamageType[2]) $("input[name=hideSpecificDamageType2]").attr("checked", "checked");
	if (_settings.hideSpecificDamageType[3]) $("input[name=hideSpecificDamageType3]").attr("checked", "checked");
	if (_settings.hideSpecificDamageType[4]) $("input[name=hideSpecificDamageType4]").attr("checked", "checked");
	if (_settings.hideSpecificDamageType[5]) $("input[name=hideSpecificDamageType5]").attr("checked", "checked");
	if (_settings.hideSpecificDamageType[6]) $("input[name=hideSpecificDamageType6]").attr("checked", "checked");
	if (_settings.hideSpecificDamageType[7]) $("input[name=hideSpecificDamageType7]").attr("checked", "checked");
	if (_settings.hideSpecificDamageType[8]) $("input[name=hideSpecificDamageType8]").attr("checked", "checked");
	if (_settings.hideSpecificDamageType[9]) $("input[name=hideSpecificDamageType9]").attr("checked", "checked");
	if (_settings.hideSpecificDamageType[10]) $("input[name=hideSpecificDamageType10]").attr("checked", "checked");
	if (_settings.ResizeMonsterInfo) $("input[name=ResizeMonsterInfo]").attr("checked", "checked");
	if (_settings.isShowStatsPopup) $("input[name=isShowStatsPopup]").attr("checked", "checked");
	if (_settings.isMonsterPopupPlacement) $("input[name=isMonsterPopupPlacement]").attr("checked", "checked");
	$("input[name=monsterPopupDelay]").attr("value", _settings.monsterPopupDelay);
	if (_settings.isShowMonsterDuration) $("input[name=isShowMonsterDuration]").attr("checked", "checked");
	if (_settings.isMonstersEffectsWarnColor) $("input[name=isMonstersEffectsWarnColor]").attr("checked", "checked");
	$("input[name=MonstersWarnOrangeRounds]").attr("value", _settings.MonstersWarnOrangeRounds);
	$("input[name=MonstersWarnRedRounds]").attr("value", _settings.MonstersWarnRedRounds);

	// Tracking Functions
	if (_settings.isTrackStats) $("input[name=isTrackStats]").attr("checked", "checked");
	if (_settings.isTrackRewards) $("input[name=isTrackRewards]").attr("checked", "checked");
	if (_settings.isTrackShrine) $("input[name=isTrackShrine]").attr("checked", "checked");
	if (_settings.isTrackItems) $("input[name=isTrackItems]").attr("checked", "checked");

	// Warning System
	// Effects Expiring Warnings
	if (_settings.isMainEffectsAlertSelf) $("input[name=isMainEffectsAlertSelf]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[0]) $("input[name=isEffectsAlertSelf0]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[1]) $("input[name=isEffectsAlertSelf1]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[2]) $("input[name=isEffectsAlertSelf2]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[3]) $("input[name=isEffectsAlertSelf3]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[5]) $("input[name=isEffectsAlertSelf5]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[6]) $("input[name=isEffectsAlertSelf6]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[7]) $("input[name=isEffectsAlertSelf7]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[8]) $("input[name=isEffectsAlertSelf8]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[9]) $("input[name=isEffectsAlertSelf9]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[10]) $("input[name=isEffectsAlertSelf10]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[11]) $("input[name=isEffectsAlertSelf11]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[12]) $("input[name=isEffectsAlertSelf12]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[13]) $("input[name=isEffectsAlertSelf13]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[14]) $("input[name=isEffectsAlertSelf14]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[15]) $("input[name=isEffectsAlertSelf15]").attr("checked", "checked");
	$("input[name=EffectsAlertSelfRounds0]").attr("value", _settings.EffectsAlertSelfRounds[0]);
	$("input[name=EffectsAlertSelfRounds1]").attr("value", _settings.EffectsAlertSelfRounds[1]);
	$("input[name=EffectsAlertSelfRounds2]").attr("value", _settings.EffectsAlertSelfRounds[2]);
	$("input[name=EffectsAlertSelfRounds3]").attr("value", _settings.EffectsAlertSelfRounds[3]);
	$("input[name=EffectsAlertSelfRounds5]").attr("value", _settings.EffectsAlertSelfRounds[5]);
	$("input[name=EffectsAlertSelfRounds6]").attr("value", _settings.EffectsAlertSelfRounds[6]);
	$("input[name=EffectsAlertSelfRounds7]").attr("value", _settings.EffectsAlertSelfRounds[7]);
	$("input[name=EffectsAlertSelfRounds8]").attr("value", _settings.EffectsAlertSelfRounds[8]);
	$("input[name=EffectsAlertSelfRounds9]").attr("value", _settings.EffectsAlertSelfRounds[9]);
	$("input[name=EffectsAlertSelfRounds10]").attr("value", _settings.EffectsAlertSelfRounds[10]);
	$("input[name=EffectsAlertSelfRounds11]").attr("value", _settings.EffectsAlertSelfRounds[11]);
	$("input[name=EffectsAlertSelfRounds12]").attr("value", _settings.EffectsAlertSelfRounds[12]);
	$("input[name=EffectsAlertSelfRounds13]").attr("value", _settings.EffectsAlertSelfRounds[13]);
	$("input[name=EffectsAlertSelfRounds14]").attr("value", _settings.EffectsAlertSelfRounds[14]);
	$("input[name=EffectsAlertSelfRounds15]").attr("value", _settings.EffectsAlertSelfRounds[15]);
	if (_settings.isMainEffectsAlertMonsters) $("input[name=isMainEffectsAlertMonsters]").attr("checked", "checked");
	if (_settings.isEffectsAlertMonsters[0]) $("input[name=isEffectsAlertMonsters0]").attr("checked", "checked");
	if (_settings.isEffectsAlertMonsters[1]) $("input[name=isEffectsAlertMonsters1]").attr("checked", "checked");
	if (_settings.isEffectsAlertMonsters[2]) $("input[name=isEffectsAlertMonsters2]").attr("checked", "checked");
	if (_settings.isEffectsAlertMonsters[3]) $("input[name=isEffectsAlertMonsters3]").attr("checked", "checked");
	if (_settings.isEffectsAlertMonsters[4]) $("input[name=isEffectsAlertMonsters4]").attr("checked", "checked");
	if (_settings.isEffectsAlertMonsters[5]) $("input[name=isEffectsAlertMonsters5]").attr("checked", "checked");
	if (_settings.isEffectsAlertMonsters[6]) $("input[name=isEffectsAlertMonsters6]").attr("checked", "checked");
	if (_settings.isEffectsAlertMonsters[7]) $("input[name=isEffectsAlertMonsters7]").attr("checked", "checked");
	if (_settings.isEffectsAlertMonsters[8]) $("input[name=isEffectsAlertMonsters8]").attr("checked", "checked");
	if (_settings.isEffectsAlertMonsters[9]) $("input[name=isEffectsAlertMonsters9]").attr("checked", "checked");
	if (_settings.isEffectsAlertMonsters[10]) $("input[name=isEffectsAlertMonsters10]").attr("checked", "checked");
	if (_settings.isEffectsAlertMonsters[11]) $("input[name=isEffectsAlertMonsters11]").attr("checked", "checked");
	$("input[name=EffectsAlertMonstersRounds0]").attr("value", _settings.EffectsAlertMonstersRounds[0]);
	$("input[name=EffectsAlertMonstersRounds1]").attr("value", _settings.EffectsAlertMonstersRounds[1]);
	$("input[name=EffectsAlertMonstersRounds2]").attr("value", _settings.EffectsAlertMonstersRounds[2]);
	$("input[name=EffectsAlertMonstersRounds3]").attr("value", _settings.EffectsAlertMonstersRounds[3]);
	$("input[name=EffectsAlertMonstersRounds4]").attr("value", _settings.EffectsAlertMonstersRounds[4]);
	$("input[name=EffectsAlertMonstersRounds5]").attr("value", _settings.EffectsAlertMonstersRounds[5]);
	$("input[name=EffectsAlertMonstersRounds6]").attr("value", _settings.EffectsAlertMonstersRounds[6]);
	$("input[name=EffectsAlertMonstersRounds7]").attr("value", _settings.EffectsAlertMonstersRounds[7]);
	$("input[name=EffectsAlertMonstersRounds8]").attr("value", _settings.EffectsAlertMonstersRounds[8]);
	$("input[name=EffectsAlertMonstersRounds9]").attr("value", _settings.EffectsAlertMonstersRounds[9]);
	$("input[name=EffectsAlertMonstersRounds10]").attr("value", _settings.EffectsAlertMonstersRounds[10]);
	$("input[name=EffectsAlertMonstersRounds11]").attr("value", _settings.EffectsAlertMonstersRounds[11]);

	// Specific Spell Warnings
	if (_settings.isWarnAbsorbTrigger) $("input[name=isWarnAbsorbTrigger]").attr("checked", "checked");
	if (_settings.isWarnSparkTrigger) $("input[name=isWarnSparkTrigger]").attr("checked", "checked");
	if (_settings.isWarnSparkExpire) $("input[name=isWarnSparkExpire]").attr("checked", "checked");

	// Alert Mode
	if (_settings.isHighlightQC) $("input[name=isHighlightQC]").attr("checked", "checked");
	$("input[name=warnOrangeLevel]").attr("value", _settings.warnOrangeLevel);
	$("input[name=warnRedLevel]").attr("value", _settings.warnRedLevel);
	$("input[name=warnAlertLevel]").attr("value", _settings.warnAlertLevel);
	$("input[name=warnOrangeLevelMP]").attr("value", _settings.warnOrangeLevelMP);
	$("input[name=warnRedLevelMP]").attr("value", _settings.warnRedLevelMP);
	$("input[name=warnAlertLevelMP]").attr("value", _settings.warnAlertLevelMP);
	$("input[name=warnOrangeLevelSP]").attr("value", _settings.warnOrangeLevelSP);
	$("input[name=warnRedLevelSP]").attr("value", _settings.warnRedLevelSP);
	$("input[name=warnAlertLevelSP]").attr("value", _settings.warnAlertLevelSP);
	if (_settings.isShowPopup) $("input[name=isShowPopup]").attr("checked", "checked");
	if (_settings.isNagHP) $("input[name=isNagHP]").attr("checked", "checked")
	if (_settings.isNagMP) $("input[name=isNagMP]").attr("checked", "checked")
	if (_settings.isNagSP) $("input[name=isNagSP]").attr("checked", "checked");

	// Battle Type
	if (_settings.warnMode[0]) $("input[name=isWarnH]").attr("checked", "checked");
	if (_settings.warnMode[1]) $("input[name=isWarnA]").attr("checked", "checked");
	if (_settings.warnMode[2]) $("input[name=isWarnGF]").attr("checked", "checked");
	if (_settings.warnMode[3]) $("input[name=isWarnIW]").attr("checked", "checked");

	// Database Options
	if (_settings.isRememberScan) $("input[name=isRememberScan]").attr("checked", "checked");
	if (_settings.isRememberSkillsTypes) $("input[name=isRememberSkillsTypes]").attr("checked", "checked");

	// General Options
	$("input[name=isShowSidebarProfs]").click(reminderAndSaveSettings);
	$("input[name=isChangePageTitle]").click(saveSettings);
	$("input[name=customPageTitle]").change(saveSettings);
	$("input[name=isStartAlert]").click(saveSettings);
	$("input[name=StartAlertHP]").change(saveSettings);
	$("input[name=StartAlertMP]").change(saveSettings);
	$("input[name=StartAlertSP]").change(saveSettings);
	$("select[id=StartAlertDifficulty]").change(saveSettings);
	$("input[name=isShowScanButton]").click(saveSettings);
	$("input[name=isShowSkillButton]").click(saveSettings);
	$("input[name=isShowEquippedSet]").click(saveSettings);
	$("input[name^=isShowTags]").click(saveSettings);

	// Keyboard Options
	$("input[name=adjustKeyEventHandling]").click(saveSettings);
	$("input[name=isEnableScanHotkey]").click(saveSettings);
	$("input[name=isEnableSkillHotkey]").click(saveSettings);
	$("input[name=enableOFCHotkey]").click(saveSettings);
	$("input[name=enableScrollHotkey]").click(saveSettings);
	$("input[name=isDisableForgeHotKeys]").click(saveSettings);
	$("input[name=enableShrineKeyPatch]").click(saveSettings);

	// Battle Enhancement
	$("input[name=isShowHighlight]").click(saveSettings);
	$("input[name=isAltHighlight]").click(saveSettings);
	$("input[name=isShowDivider]").click(saveSettings);
	$("input[name=isShowSelfDuration]").click(saveSettings);
	$("input[name=isSelfEffectsWarnColor]").click(saveSettings);
	$("input[name=SelfWarnOrangeRounds]").change(saveSettings);
	$("input[name=SelfWarnRedRounds]").change(saveSettings);
	$("input[name=isShowRoundReminder]").click(saveSettings);
	$("input[name=reminderMinRounds]").change(saveSettings);
	$("input[name=reminderBeforeEnd]").change(saveSettings);
	$("input[name=isShowEndStats]").click(saveSettings);
	$("input[name=isShowEndProfs]").click(saveSettings); //isShowEndProfs added by Ilirith
	$("input[name=isShowEndProfsMagic]").click(saveSettings); //isShowEndProfs added by Ilirith
	$("input[name=isShowEndProfsArmor]").click(saveSettings); //isShowEndProfs added by Ilirith
	$("input[name=isShowEndProfsWeapon]").click(saveSettings); //isShowEndProfs added by Ilirith
	$("input[name=isAlertGem]").click(saveSettings);
	$("input[name=isAlertOverchargeFull]").click(saveSettings);
	$("input[name=isShowMonsterNumber]").click(saveSettings);
	$("input[name=isShowRoundCounter]").click(saveSettings);
	$("input[name=isShowPowerupBox]").click(saveSettings);
	$("input[name=autoAdvanceBattleRound]").click(saveSettings);
	$("input[name=autoAdvanceBattleRoundDelay]").change(saveSettings);

	// Display Monster Stats
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
	$("input[name=isMonsterPopupPlacement]").click(saveSettings);
	$("input[name=monsterPopupDelay]").change(saveSettings);
	$("input[name=isShowMonsterDuration]").click(saveSettings);
	$("input[name=isMonstersEffectsWarnColor]").click(saveSettings);
	$("input[name=MonstersWarnOrangeRounds]").change(saveSettings);
	$("input[name=MonstersWarnRedRounds]").change(saveSettings);

	// Tracking Functions
	$("input[name=isTrackStats]").click(saveSettings);
	$("input[name=isTrackRewards]").click(saveSettings);
	$("input[name=isTrackShrine]").click(saveSettings);
	$("input[name=isTrackItems]").click(saveSettings);

	// Warning System
	// Effects Expiring Warnings
	$("input[name=isMainEffectsAlertSelf]").click(saveSettings);
	$("input[name^=isEffectsAlertSelf]").click(saveSettings);
	$("input[name^=EffectsAlertSelfRounds]").change(saveSettings);
	$("input[name=isMainEffectsAlertMonsters]").click(saveSettings);
	$("input[name^=isEffectsAlertMonsters]").click(saveSettings);
	$("input[name^=EffectsAlertMonstersRounds]").change(saveSettings);

	// Specific Spell Warnings
	$("input[name=isWarnAbsorbTrigger]").click(saveSettings);
	$("input[name=isWarnSparkTrigger]").click(saveSettings);
	$("input[name=isWarnSparkExpire]").click(saveSettings);

	// Alert Mode
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

	// Battle Type
	$("input[name=isWarnH]").click(saveSettings);
	$("input[name=isWarnA]").click(saveSettings);
	$("input[name=isWarnGF]").click(saveSettings);
	$("input[name=isWarnIW]").click(saveSettings);
	$("input[name=isWarnCF]").click(saveSettings);

	// Database Options
	$("input[name=isRememberScan]").click(reminderAndSaveSettings);
	$("input[name=isRememberSkillsTypes]").click(reminderAndSaveSettings);

	$("._resetSettings").click(function (){ if (confirm("Reset Settings to default?")) _settings.reset(); })
	$("._resetAll").click(function (){ if (confirm("Reset All Tracking data?")) HVResetTracking(); })
	$("._masterReset").click(function (){ if (confirm("This will delete ALL HV data saved in localStorage.\nAre you sure you want to do this?")) HVMasterReset(); })
}
function saveSettings() {
	// General Options
	_settings.isShowSidebarProfs = $("input[name=isShowSidebarProfs]").get(0).checked;
	_settings.isChangePageTitle = $("input[name=isChangePageTitle]").get(0).checked;
	_settings.customPageTitle = $("input[name=customPageTitle]").get(0).value;
	_settings.isStartAlert = $("input[name=isStartAlert]").get(0).checked;
	_settings.StartAlertHP = $("input[name=StartAlertHP]").get(0).value;
	_settings.StartAlertMP = $("input[name=StartAlertMP]").get(0).value;
	_settings.StartAlertSP = $("input[name=StartAlertSP]").get(0).value;
	_settings.StartAlertDifficulty = $("select[id=StartAlertDifficulty]").get(0).value;
	_settings.isShowScanButton = $("input[name=isShowScanButton]").get(0).checked;
	_settings.isShowSkillButton = $("input[name=isShowSkillButton]").get(0).checked;
	_settings.isShowEquippedSet = $("input[name=isShowEquippedSet]").get(0).checked;
	_settings.isShowTags[0] = $("input[name=isShowTags0]").get(0).checked;
	_settings.isShowTags[1] = $("input[name=isShowTags1]").get(0).checked;
	_settings.isShowTags[2] = $("input[name=isShowTags2]").get(0).checked;
	_settings.isShowTags[3] = $("input[name=isShowTags3]").get(0).checked;
	_settings.isShowTags[4] = $("input[name=isShowTags4]").get(0).checked;
	_settings.isShowTags[5] = $("input[name=isShowTags5]").get(0).checked;

	// Keyboard Options
	_settings.adjustKeyEventHandling = $("input[name=adjustKeyEventHandling]").get(0).checked;
	_settings.isEnableScanHotkey = $("input[name=isEnableScanHotkey]").get(0).checked;
	_settings.isEnableSkillHotkey = $("input[name=isEnableSkillHotkey]").get(0).checked;
	_settings.enableOFCHotkey = $("input[name=enableOFCHotkey]").get(0).checked;
	_settings.enableScrollHotkey = $("input[name=enableScrollHotkey]").get(0).checked;
	_settings.isDisableForgeHotKeys = $("input[name=isDisableForgeHotKeys]").get(0).checked;
	_settings.enableShrineKeyPatch = $("input[name=enableShrineKeyPatch]").get(0).checked;

	// Battle Enhancement
	_settings.isShowHighlight = $("input[name=isShowHighlight]").get(0).checked;
	_settings.isAltHighlight = $("input[name=isAltHighlight]").get(0).checked;
	_settings.isShowDivider = $("input[name=isShowDivider]").get(0).checked;
	_settings.isShowSelfDuration = $("input[name=isShowSelfDuration]").get(0).checked;
	_settings.isSelfEffectsWarnColor = $("input[name=isSelfEffectsWarnColor]").get(0).checked;
	_settings.SelfWarnOrangeRounds = $("input[name=SelfWarnOrangeRounds]").get(0).value;
	_settings.SelfWarnRedRounds = $("input[name=SelfWarnRedRounds]").get(0).value;
	_settings.isShowRoundReminder = $("input[name=isShowRoundReminder]").get(0).checked;
	_settings.reminderMinRounds = $("input[name=reminderMinRounds]").get(0).value;
	_settings.reminderBeforeEnd = $("input[name=reminderBeforeEnd]").get(0).value;
	_settings.isShowEndStats = $("input[name=isShowEndStats]").get(0).checked;
	_settings.isShowEndProfs = $("input[name=isShowEndProfs]").get(0).checked; //isShowEndProfs added by Ilirith
	_settings.isShowEndProfsMagic = $("input[name=isShowEndProfsMagic]").get(0).checked; //isShowEndProfs added by Ilirith
	_settings.isShowEndProfsArmor = $("input[name=isShowEndProfsArmor]").get(0).checked; //isShowEndProfs added by Ilirith
	_settings.isShowEndProfsWeapon = $("input[name=isShowEndProfsWeapon]").get(0).checked; //isShowEndProfs added by Ilirith
	_settings.isAlertGem = $("input[name=isAlertGem]").get(0).checked;
	_settings.isAlertOverchargeFull = $("input[name=isAlertOverchargeFull]").get(0).checked;
	_settings.isShowMonsterNumber = $("input[name=isShowMonsterNumber]").get(0).checked;
	_settings.isShowRoundCounter = $("input[name=isShowRoundCounter]").get(0).checked;
	_settings.isShowPowerupBox = $("input[name=isShowPowerupBox]").get(0).checked;
	_settings.autoAdvanceBattleRound = $("input[name=autoAdvanceBattleRound]").get(0).checked;
	_settings.autoAdvanceBattleRoundDelay = $("input[name=autoAdvanceBattleRoundDelay]").get(0).value;

	// Display Monster Stats
	_settings.showMonsterHP = $("input[name=showMonsterHP]").get(0).checked;
	_settings.showMonsterHPPercent = $("input[name=showMonsterHPPercent]").get(0).checked;
	_settings.showMonsterMP = $("input[name=showMonsterMP]").get(0).checked;
	_settings.showMonsterSP = $("input[name=showMonsterSP]").get(0).checked;
	_settings.showMonsterInfoFromDB = $("input[name=showMonsterInfoFromDB]").get(0).checked;
	_settings.showMonsterClassFromDB = $("input[name=showMonsterClassFromDB]").get(0).checked;
	_settings.showMonsterPowerLevelFromDB = $("input[name=showMonsterPowerLevelFromDB]").get(0).checked;
	_settings.showMonsterAttackTypeFromDB = $("input[name=showMonsterAttackTypeFromDB]").get(0).checked;
	_settings.showMonsterWeaknessesFromDB = $("input[name=showMonsterWeaknessesFromDB]").get(0).checked;
	_settings.showMonsterResistancesFromDB = $("input[name=showMonsterResistancesFromDB]").get(0).checked;
	_settings.hideSpecificDamageType[0] = $("input[name=hideSpecificDamageType0]").get(0).checked;
	_settings.hideSpecificDamageType[1] = $("input[name=hideSpecificDamageType1]").get(0).checked;
	_settings.hideSpecificDamageType[2] = $("input[name=hideSpecificDamageType2]").get(0).checked;
	_settings.hideSpecificDamageType[3] = $("input[name=hideSpecificDamageType3]").get(0).checked;
	_settings.hideSpecificDamageType[4] = $("input[name=hideSpecificDamageType4]").get(0).checked;
	_settings.hideSpecificDamageType[5] = $("input[name=hideSpecificDamageType5]").get(0).checked;
	_settings.hideSpecificDamageType[6] = $("input[name=hideSpecificDamageType6]").get(0).checked;
	_settings.hideSpecificDamageType[7] = $("input[name=hideSpecificDamageType7]").get(0).checked;
	_settings.hideSpecificDamageType[8] = $("input[name=hideSpecificDamageType8]").get(0).checked;
	_settings.hideSpecificDamageType[9] = $("input[name=hideSpecificDamageType9]").get(0).checked;
	_settings.hideSpecificDamageType[10] = $("input[name=hideSpecificDamageType10]").get(0).checked;
	_settings.ResizeMonsterInfo = $("input[name=ResizeMonsterInfo]").get(0).checked;
	_settings.isShowStatsPopup = $("input[name=isShowStatsPopup]").get(0).checked;
	_settings.isMonsterPopupPlacement = $("input[name=isMonsterPopupPlacement]").get(0).checked;
	_settings.monsterPopupDelay = $("input[name=monsterPopupDelay]").get(0).value;
	_settings.isShowMonsterDuration = $("input[name=isShowMonsterDuration]").get(0).checked;
	_settings.isMonstersEffectsWarnColor = $("input[name=isMonstersEffectsWarnColor]").get(0).checked;
	_settings.MonstersWarnOrangeRounds = $("input[name=MonstersWarnOrangeRounds]").get(0).value;
	_settings.MonstersWarnRedRounds = $("input[name=MonstersWarnRedRounds]").get(0).value;

	// Tracking Functions
	_settings.isTrackStats = $("input[name=isTrackStats]").get(0).checked;
	_settings.isTrackRewards = $("input[name=isTrackRewards]").get(0).checked;
	_settings.isTrackShrine = $("input[name=isTrackShrine]").get(0).checked;
	_settings.isTrackItems = $("input[name=isTrackItems]").get(0).checked;

	// Warning System
	// Effects Expiring Warnings
	_settings.isMainEffectsAlertSelf = $("input[name=isMainEffectsAlertSelf]").get(0).checked;
	_settings.isEffectsAlertSelf[0] = $("input[name=isEffectsAlertSelf0]").get(0).checked;
	_settings.isEffectsAlertSelf[1] = $("input[name=isEffectsAlertSelf1]").get(0).checked;
	_settings.isEffectsAlertSelf[2] = $("input[name=isEffectsAlertSelf2]").get(0).checked;
	_settings.isEffectsAlertSelf[3] = $("input[name=isEffectsAlertSelf3]").get(0).checked;
	_settings.isEffectsAlertSelf[4] = false; // absorb is obsolete
	_settings.isEffectsAlertSelf[5] = $("input[name=isEffectsAlertSelf5]").get(0).checked;
	_settings.isEffectsAlertSelf[6] = $("input[name=isEffectsAlertSelf6]").get(0).checked;
	_settings.isEffectsAlertSelf[7] = $("input[name=isEffectsAlertSelf7]").get(0).checked;
	_settings.isEffectsAlertSelf[8] = $("input[name=isEffectsAlertSelf8]").get(0).checked;
	_settings.isEffectsAlertSelf[9] = $("input[name=isEffectsAlertSelf9]").get(0).checked;
	_settings.isEffectsAlertSelf[10] = $("input[name=isEffectsAlertSelf10]").get(0).checked;
	_settings.isEffectsAlertSelf[11] = $("input[name=isEffectsAlertSelf11]").get(0).checked;
	_settings.isEffectsAlertSelf[12] = $("input[name=isEffectsAlertSelf12]").get(0).checked;
	_settings.isEffectsAlertSelf[13] = $("input[name=isEffectsAlertSelf13]").get(0).checked;
	_settings.isEffectsAlertSelf[14] = $("input[name=isEffectsAlertSelf14]").get(0).checked;
	_settings.isEffectsAlertSelf[15] = $("input[name=isEffectsAlertSelf15]").get(0).checked;
	_settings.EffectsAlertSelfRounds[0] = $("input[name=EffectsAlertSelfRounds0]").get(0).value;
	_settings.EffectsAlertSelfRounds[1] = $("input[name=EffectsAlertSelfRounds1]").get(0).value;
	_settings.EffectsAlertSelfRounds[2] = $("input[name=EffectsAlertSelfRounds2]").get(0).value;
	_settings.EffectsAlertSelfRounds[3] = $("input[name=EffectsAlertSelfRounds3]").get(0).value;
	_settings.EffectsAlertSelfRounds[4] = 0; // absorb is obsolete
	_settings.EffectsAlertSelfRounds[5] = $("input[name=EffectsAlertSelfRounds5]").get(0).value;
	_settings.EffectsAlertSelfRounds[6] = $("input[name=EffectsAlertSelfRounds6]").get(0).value;
	_settings.EffectsAlertSelfRounds[7] = $("input[name=EffectsAlertSelfRounds7]").get(0).value;
	_settings.EffectsAlertSelfRounds[8] = $("input[name=EffectsAlertSelfRounds8]").get(0).value;
	_settings.EffectsAlertSelfRounds[9] = $("input[name=EffectsAlertSelfRounds9]").get(0).value;
	_settings.EffectsAlertSelfRounds[10] = $("input[name=EffectsAlertSelfRounds10]").get(0).value;
	_settings.EffectsAlertSelfRounds[11] = $("input[name=EffectsAlertSelfRounds11]").get(0).value;
	_settings.EffectsAlertSelfRounds[12] = $("input[name=EffectsAlertSelfRounds12]").get(0).value;
	_settings.EffectsAlertSelfRounds[13] = $("input[name=EffectsAlertSelfRounds13]").get(0).value;
	_settings.EffectsAlertSelfRounds[14] = $("input[name=EffectsAlertSelfRounds14]").get(0).value;
	_settings.EffectsAlertSelfRounds[15] = $("input[name=EffectsAlertSelfRounds15]").get(0).value;
	_settings.isMainEffectsAlertMonsters = $("input[name=isMainEffectsAlertMonsters]").get(0).checked;
	_settings.isEffectsAlertMonsters[0] = $("input[name=isEffectsAlertMonsters0]").get(0).checked;
	_settings.isEffectsAlertMonsters[1] = $("input[name=isEffectsAlertMonsters1]").get(0).checked;
	_settings.isEffectsAlertMonsters[2] = $("input[name=isEffectsAlertMonsters2]").get(0).checked;
	_settings.isEffectsAlertMonsters[3] = $("input[name=isEffectsAlertMonsters3]").get(0).checked;
	_settings.isEffectsAlertMonsters[4] = $("input[name=isEffectsAlertMonsters4]").get(0).checked;
	_settings.isEffectsAlertMonsters[5] = $("input[name=isEffectsAlertMonsters5]").get(0).checked;
	_settings.isEffectsAlertMonsters[6] = $("input[name=isEffectsAlertMonsters6]").get(0).checked;
	_settings.isEffectsAlertMonsters[7] = $("input[name=isEffectsAlertMonsters7]").get(0).checked;
	_settings.isEffectsAlertMonsters[8] = $("input[name=isEffectsAlertMonsters8]").get(0).checked;
	_settings.isEffectsAlertMonsters[9] = $("input[name=isEffectsAlertMonsters9]").get(0).checked;
	_settings.isEffectsAlertMonsters[10] = $("input[name=isEffectsAlertMonsters10]").get(0).checked;
	_settings.isEffectsAlertMonsters[11] = $("input[name=isEffectsAlertMonsters11]").get(0).checked;
	_settings.EffectsAlertMonstersRounds[0] = $("input[name=EffectsAlertMonstersRounds0]").get(0).value;
	_settings.EffectsAlertMonstersRounds[1] = $("input[name=EffectsAlertMonstersRounds1]").get(0).value;
	_settings.EffectsAlertMonstersRounds[2] = $("input[name=EffectsAlertMonstersRounds2]").get(0).value;
	_settings.EffectsAlertMonstersRounds[3] = $("input[name=EffectsAlertMonstersRounds3]").get(0).value;
	_settings.EffectsAlertMonstersRounds[4] = $("input[name=EffectsAlertMonstersRounds4]").get(0).value;
	_settings.EffectsAlertMonstersRounds[5] = $("input[name=EffectsAlertMonstersRounds5]").get(0).value;
	_settings.EffectsAlertMonstersRounds[6] = $("input[name=EffectsAlertMonstersRounds6]").get(0).value;
	_settings.EffectsAlertMonstersRounds[7] = $("input[name=EffectsAlertMonstersRounds7]").get(0).value;
	_settings.EffectsAlertMonstersRounds[8] = $("input[name=EffectsAlertMonstersRounds8]").get(0).value;
	_settings.EffectsAlertMonstersRounds[9] = $("input[name=EffectsAlertMonstersRounds9]").get(0).value;
	_settings.EffectsAlertMonstersRounds[10] = $("input[name=EffectsAlertMonstersRounds10]").get(0).value;
	_settings.EffectsAlertMonstersRounds[11] = $("input[name=EffectsAlertMonstersRounds11]").get(0).value;

	// Specific Spell Warnings
	_settings.isWarnAbsorbTrigger = $("input[name=isWarnAbsorbTrigger]").get(0).checked;
	_settings.isWarnSparkTrigger = $("input[name=isWarnSparkTrigger]").get(0).checked;
	_settings.isWarnSparkExpire = $("input[name=isWarnSparkExpire]").get(0).checked;

	// Alert Mode
	_settings.isHighlightQC = $("input[name=isHighlightQC]").get(0).checked;
	_settings.warnOrangeLevel = $("input[name=warnOrangeLevel]").get(0).value;
	_settings.warnRedLevel = $("input[name=warnRedLevel]").get(0).value;
	_settings.warnAlertLevel = $("input[name=warnAlertLevel]").get(0).value;
	_settings.warnOrangeLevelMP = $("input[name=warnOrangeLevelMP]").get(0).value;
	_settings.warnRedLevelMP = $("input[name=warnRedLevelMP]").get(0).value;
	_settings.warnAlertLevelMP = $("input[name=warnAlertLevelMP]").get(0).value;
	_settings.warnOrangeLevelSP = $("input[name=warnOrangeLevelSP]").get(0).value;
	_settings.warnRedLevelSP = $("input[name=warnRedLevelSP]").get(0).value;
	_settings.warnAlertLevelSP = $("input[name=warnAlertLevelSP]").get(0).value;
	_settings.isShowPopup = $("input[name=isShowPopup]").get(0).checked;
	_settings.isNagHP = $("input[name=isNagHP]").get(0).checked;
	_settings.isNagMP = $("input[name=isNagMP]").get(0).checked;
	_settings.isNagSP = $("input[name=isNagSP]").get(0).checked;

	// Battle Type
	_settings.warnMode[0] = $("input[name=isWarnH]").get(0).checked;
	_settings.warnMode[1] = $("input[name=isWarnA]").get(0).checked;
	_settings.warnMode[2] = $("input[name=isWarnGF]").get(0).checked;
	_settings.warnMode[3] = $("input[name=isWarnIW]").get(0).checked;

	// Database Options
	_settings.isRememberScan = $("input[name=isRememberScan]").get(0).checked;
	_settings.isRememberSkillsTypes = $("input[name=isRememberSkillsTypes]").get(0).checked;

	_settings.save();
}
function reminderAndSaveSettings() {
	loadProfsObject();
	if (!isProfTotalsRecorded() && $("input[name=isShowSidebarProfs]").get(0).checked)
		alert('Please visit the Character Stats page at least once\nwith either the "Use Downloable Fonts" or "Custom\nLocal Font" setting enabled, to allow STAT to record\nyour current proficiencies. STAT cannot record this\ndata while HentaiVerse Font Engine is enabled.');
	saveSettings();
}
function captureShrine() {
	var messageBoxElement = document.querySelector("#messagebox");
	if (!messageBoxElement) {
		return;
	}
	loadShrineObject();
	var messageElements = messageBoxElement.querySelectorAll("div.cmb6");
	var message0 = util.innerText(messageElements[0]);
	if (message0.match(/power/i)) {
		_shrine.artifactsTraded++;
		var message2 = util.innerText(messageElements[2]);
		if (message2.match(/ability point/i)) {
			_shrine.artifactAP++;
		} else if (message2.match(/crystal/i)) {
			_shrine.artifactCrystal++;
		} else if (message2.match(/increased/i)) {
			_shrine.artifactStat++;
		} else if (message2.match(/(\d) hath/i)) {
			_shrine.artifactHath++;
			_shrine.artifactHathTotal += Number(RegExp.$1);
		} else if (message2.match(/energy drink/i)) {
			_shrine.artifactItem++;
		}
	} else if (message0.match(/item/i)) {
		var message3 = util.innerText(messageElements[3]);
		_shrine.trophyArray.push(message3);
	}
	_shrine.save();
}
function loadOverviewObject() {
	if (_overview !== null) return;
	_overview = new HVCacheOverview();
	_overview.load();
}
function loadStatsObject() {
	if (_stats !== null) return;
	_stats = new HVCacheStats();
	_stats.load();
}
function loadProfsObject() {
	if (_profs !== null) return;
	_profs = new HVCacheProf();
	_profs.load();
}
function loadRewardsObject() {
	if (_rewards !== null) return;
	_rewards = new HVCacheRewards();
	_rewards.load();
}
function loadShrineObject() {
	if (_shrine !== null) return;
	_shrine = new HVCacheShrine();
	_shrine.load();
}
function loadDropsObject() {
	if (_drops !== null) return;
	_drops = new HVCacheDrops();
	_drops.load();
}
function loadSettingsObject() {
	if (_settings !== null) return;
	_settings = new HVSettings();
	_settings.load();
}
function loadRoundObject() {
	if (_round !== null) return;
	_round = new HVRound();
	_round.load();
	for (var i = 0; i < HVStat.monsters.length; i++) {
		if (_round.monsters[i]) {
			HVStat.monsters[i].setFromValueObject(_round.monsters[i]);
		}
	}
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
	_overview.reset();
	_stats.reset();
	_rewards.reset();
	_shrine.reset();
	_drops.reset();
}
function HVMasterReset() {
	deleteFromStorage(HV_OVERVIEW);
	deleteFromStorage(HV_STATS);
	deleteFromStorage(HV_PROF);
	deleteFromStorage(HV_REWARDS);
	deleteFromStorage(HV_SHRINE);
	deleteFromStorage(HV_DROPS);
	deleteFromStorage(HV_SETTINGS);
	deleteFromStorage(HV_ROUND);
	deleteFromStorage(HV_EQUIP);
	deleteFromStorage(HV_DATA);
	deleteFromStorage("HVBackup1");
	deleteFromStorage("HVBackup2");
	deleteFromStorage("HVBackup3");
	deleteFromStorage("HVBackup4");
	deleteFromStorage("HVBackup5")
	deleteFromStorage(key_hpAlertAlreadyShown);
	deleteFromStorage(key_mpAlertAlreadyShown);
	deleteFromStorage(key_spAlertAlreadyShown);
	deleteFromStorage(key_ocAlertAlreadyShown);
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
function HVRound() {
	this.load = function () { loadFromStorage(this, HV_ROUND); };
	this.save = function () { saveToStorage(this, HV_ROUND); };
	this.reset = function () { deleteFromStorage(HV_ROUND); };
	this.cloneFrom = clone;
	this.monsters = [];
	this.currRound = 0;
	this.maxRound = 0;
	this.arenaNum = 0;
	this.dropChances = 0;
	this.battleType = 0;
	this.lastTurn = -1;
	this.kills = 0;
	this.aAttempts = 0;
	this.aHits = [0, 0];
	this.aOffhands = [0, 0, 0, 0];
	this.aDomino = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	this.aCounters = [0, 0, 0, 0];
	this.dDealt = [0, 0, 0];
	this.sHits = [0, 0];
	this.sResists = 0;
	this.dDealtSp = [0, 0];
	this.sAttempts = 0;
	this.absArry = [0, 0, 0];
	this.mAttempts = 0;
	this.mHits = [0, 0];
	this.mSpells = 0;
	this.pDodges = 0;
	this.pEvades = 0;
	this.pParries = 0;
	this.pBlocks = 0;
	this.pResists = 0;
	this.dTaken = [0, 0];
	this.coalesce = 0;
	this.eTheft = 0;
	this.channel = 0;
	this.overStrikes = 0;
	this.cureTotals = [0, 0, 0];
	this.cureCounts = [0, 0, 0];
	this.elemEffects = [0, 0, 0];
	this.effectPoison = [0, 0];
	this.elemSpells = [0, 0, 0, 0];
	this.divineSpells = [0, 0, 0, 0];
	this.forbidSpells = [0, 0, 0, 0];
	this.depSpells = [0, 0];
	this.supportSpells = 0;
	this.curativeSpells = 0;
	this.elemGain = 0;
	this.divineGain = 0;
	this.forbidGain = 0;
	this.depGain = 0;
	this.supportGain = 0;
	this.curativeGain = 0;
	this.weapProfGain = [0, 0, 0, 0];
	this.armorProfGain = [0, 0, 0];
	this.weaponprocs = [0, 0, 0, 0, 0, 0, 0, 0];
	this.pskills = [0, 0, 0, 0, 0, 0, 0];
	this.isLoaded = false;
}
function HVCacheOverview() {
	this.load = function () { loadFromStorage(this, HV_OVERVIEW); };
	this.save = function () {
		this.totalRounds = this.roundArray[0] + this.roundArray[1] + this.roundArray[2] + this.roundArray[3] + this.roundArray[4];
		saveToStorage(this, HV_OVERVIEW);
	};
	this.reset = function () { deleteFromStorage(HV_OVERVIEW); };
	this.cloneFrom = clone;
	this.startTime = 0;
	this.lastHourlyTime = 0;
	this.exp = 0;
	this.credits = 0;
	this.lastEquipTime = 0;
	this.lastEquipName = "";
	this.equips = 0;
	this.lastArtTime = 0;
	this.lastArtName = "";
	this.artifacts = 0;
	this.roundArray = [0, 0, 0, 0, 0];
	this.totalRounds = 0;
	this.expbyBT = [0, 0, 0, 0, 0];
	this.creditsbyBT = [0, 0, 0, 0, 0];
	this.isLoaded = false;
}
function HVCacheStats() {
	this.load = function () { loadFromStorage(this, HV_STATS); };
	this.save = function () { saveToStorage(this, HV_STATS); };
	this.reset = function () { deleteFromStorage(HV_STATS); };
	this.cloneFrom = clone;
	this.rounds = 0;
	this.kills = 0;
	this.aAttempts = 0;
	this.aHits = [0, 0];
	this.aOffhands = [0, 0, 0, 0];
	this.sAttempts = 0;
	this.aDomino = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	this.aCounters = [0, 0, 0, 0];
	this.dDealt = [0, 0, 0];
	this.sHits = [0, 0];
	this.sResists = 0;
	this.dDealtSp = [0, 0];
	this.absArry = [0, 0, 0];
	this.mAttempts = 0;
	this.dTaken = [0, 0];
	this.mHits = [0, 0];
	this.pDodges = 0;
	this.pEvades = 0;
	this.pParries = 0;
	this.pBlocks = 0;
	this.pResists = 0;
	this.mSpells = 0;
	this.overStrikes = 0;
	this.coalesce = 0;
	this.eTheft = 0;
	this.channel = 0;
	this.cureTotals = [0, 0, 0];
	this.cureCounts = [0, 0, 0];
	this.elemEffects = [0, 0, 0];
	this.effectPoison = [0, 0];
	this.elemSpells = [0, 0, 0, 0];
	this.divineSpells = [0, 0, 0, 0];
	this.forbidSpells = [0, 0, 0, 0];
	this.depSpells = [0, 0];
	this.supportSpells = 0;
	this.curativeSpells = 0;
	this.elemGain = 0;
	this.divineGain = 0;
	this.forbidGain = 0;
	this.depGain = 0;
	this.supportGain = 0;
	this.curativeGain = 0;
	this.weapProfGain = [0, 0, 0, 0];
	this.armorProfGain = [0, 0, 0];
	this.weaponprocs = [0, 0, 0, 0, 0, 0, 0, 0];
	this.pskills = [0, 0, 0, 0, 0, 0, 0];
	this.datestart = 0;
	this.isLoaded = false;
}
function HVCacheProf() {
	this.load = function () { loadFromStorage(this, HV_PROF); };
	this.save = function () { saveToStorage(this, HV_PROF); };
	this.reset = function () { deleteFromStorage(HV_PROF); };
	this.cloneFrom = clone;
	this.elemTotal = 0;
	this.divineTotal = 0;
	this.forbidTotal = 0;
	this.spiritTotal = 0; //spiritTotal added by Ilirith
	this.depTotal = 0;
	this.supportTotal = 0;
	this.curativeTotal = 0;
	this.weapProfTotals = [0, 0, 0, 0];
	this.armorProfTotals = [0, 0, 0];
	this.isLoaded = false;
}
function HVCacheRewards() {
	this.load = function () { loadFromStorage(this, HV_REWARDS); };
	this.save = function () {
		this.totalRwrds = this.artRwrd + this.eqRwrd + this.itemsRwrd;
		saveToStorage(this, HV_REWARDS);
	};
	this.reset = function () { deleteFromStorage(HV_REWARDS); };
	this.cloneFrom = clone;
	this.eqRwrd = 0;
	this.eqRwrdArry = [];
	this.itemsRwrd = 0;
	this.itemRwrdArry = [];
	this.itemRwrdQtyArry = [];
	this.artRwrd = 0;
	this.artRwrdArry = [];
	this.artRwrdQtyArry = [];
	this.tokenDrops = [0, 0, 0];
	this.totalRwrds = 0;
	this.isLoaded = false;
}
function HVCacheShrine() {
	this.load = function () { loadFromStorage(this, HV_SHRINE); };
	this.save = function () {
		this.totalRewards = this.trophyArray.length + this.artifactsTraded;
		saveToStorage(this, HV_SHRINE);
	};
	this.reset = function () { deleteFromStorage(HV_SHRINE); };
	this.cloneFrom = clone;
	this.artifactsTraded = 0;
	this.artifactStat = 0;
	this.artifactAP = 0;
	this.artifactHath = 0;
	this.artifactHathTotal = 0;
	this.artifactCrystal = 0;
	this.artifactItem = 0;
	this.trophyArray = [];
	this.totalRewards = 0;
	this.isLoaded = false
}
function HVCacheDrops() {
	this.load = function () { loadFromStorage(this, HV_DROPS); };
	this.save = function () { saveToStorage(this, HV_DROPS); };
	this.reset = function () { deleteFromStorage(HV_DROPS); };
	this.cloneFrom = clone;
	this.dropChances = 0;
	this.itemArry = [
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
	];
	this.itemQtyArry = new Array(this.itemArry.length);
	i = this.itemArry.length;
	while (i--)
		this.itemQtyArry[i] = 0;
	this.itemDrop = 0;
	this.eqArray = [];
	this.eqDrop = 0;
	this.artArry = [];
	this.artQtyArry = [];
	this.artDrop = 0;
	this.eqDropbyBT = [0, 0, 0, 0, 0];
	this.artDropbyBT = [0, 0, 0, 0, 0];
	this.itemDropbyBT = [0, 0, 0, 0, 0];
	this.crysDropbyBT = [0, 0, 0, 0, 0];
	this.dropChancesbyBT = [0, 0, 0, 0, 0];
	this.isLoaded = false;
}
function HVSettings() {
	this.load = function () { loadFromStorage(this, HV_SETTINGS); };
	this.save = function () { saveToStorage(this, HV_SETTINGS); };
	this.reset = function () { deleteFromStorage(HV_SETTINGS); };
	this.cloneFrom = clone;

	// General Options
	this.isShowSidebarProfs = false;
	this.isChangePageTitle = false;
	this.customPageTitle = "HV";
	this.isStartAlert = false;
	this.StartAlertHP = 95;
	this.StartAlertMP = 95;
	this.StartAlertSP = 95;
	this.StartAlertDifficulty = 2;
	this.isShowScanButton = false;
	this.isShowSkillButton = false;
	this.isShowEquippedSet = false;
	//0-equipment page, 1-shop, 2-itemworld, 3-moogle, 4-forge
	this.isShowTags = [false, false, false, false, false, false];

	// Keyboard Options
	this.adjustKeyEventHandling = false;
	this.isEnableScanHotkey = false;
	this.isEnableSkillHotkey = false;
	this.enableOFCHotkey = false;
	this.enableScrollHotkey = false;
	this.isDisableForgeHotKeys = false;
	this.enableShrineKeyPatch = false;

	// Battle Enhancement
	this.isShowHighlight = true;
	this.isAltHighlight = false;
	this.isShowDivider = true;
	this.isShowSelfDuration = true;
	this.isSelfEffectsWarnColor = false;
	this.SelfWarnOrangeRounds = 5;
	this.SelfWarnRedRounds = 1;
	this.isShowRoundReminder = false;
	this.reminderMinRounds = 3;
	this.reminderBeforeEnd = 1;
	this.isShowEndStats = true;
	this.isShowEndProfs = true;
	this.isShowEndProfsMagic = true;
	this.isShowEndProfsArmor = true;
	this.isShowEndProfsWeapon = true;
	this.isAlertGem = true;
	this.isAlertOverchargeFull = false;
	this.isShowMonsterNumber = false;
	this.isShowRoundCounter = false;
	this.isShowPowerupBox = false;
	this.autoAdvanceBattleRound = false;
	this.autoAdvanceBattleRoundDelay = 500;

	// Display Monster Stats
	this.showMonsterHP = true;
	this.showMonsterHPPercent = false;
	this.showMonsterMP = true;
	this.showMonsterSP = true;
	this.showMonsterInfoFromDB = false;
	this.showMonsterClassFromDB = false;
	this.showMonsterPowerLevelFromDB = false;
	this.showMonsterAttackTypeFromDB = false;
	this.showMonsterWeaknessesFromDB = false;
	this.showMonsterResistancesFromDB = false;
	this.hideSpecificDamageType = [false, false, false, false, false, false, false, false, false, false, false];
	this.ResizeMonsterInfo = false;
	this.isShowStatsPopup = false;
	this.isMonsterPopupPlacement = false;
	this.monsterPopupDelay = 0;
	this.isShowMonsterDuration = true;
	this.isMonstersEffectsWarnColor = false;
	this.MonstersWarnOrangeRounds = 5;
	this.MonstersWarnRedRounds = 1;

	// Tracking Functions
	this.isTrackStats = true;
	this.isTrackRewards = false;
	this.isTrackShrine = false;
	this.isTrackItems = false;

	// Warning System
	// Effects Expiring Warnings
	this.isMainEffectsAlertSelf = false;
	this.isEffectsAlertSelf = [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
	this.EffectsAlertSelfRounds = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	this.isMainEffectsAlertMonsters = false;
	this.isEffectsAlertMonsters = [false, false, false, false, false, false, false, false, false, false, false, false];
	this.EffectsAlertMonstersRounds = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

	// Specific Spell Warnings
	this.isWarnAbsorbTrigger = false;
	this.isWarnSparkTrigger = true;
	this.isWarnSparkExpire = true;

	// Alert Mode
	this.isHighlightQC = true;
	this.warnOrangeLevel = 40;
	this.warnRedLevel = 35;
	this.warnAlertLevel = 25;
	this.warnOrangeLevelMP = 15;
	this.warnRedLevelMP = 5;
	this.warnAlertLevelMP = -1;
	this.warnOrangeLevelSP = -1;
	this.warnRedLevelSP = -1;
	this.warnAlertLevelSP = -1;
	this.isShowPopup = true;
	this.isNagHP = false;
	this.isNagMP = false;
	this.isNagSP = false;

	// Battle Type
	this.warnMode = [true, true, false, false];

	// Database Options
	this.isRememberScan = false;
	this.isRememberSkillsTypes = false;
}
function saveStatsBackup(back) {
	loadStatsObject();
	var ba = 0;
	ba = _backup[back];
	loadBackupObject(back);
	ba.rounds = _stats.rounds;
	ba.kills = _stats.kills;
	ba.aAttempts = _stats.aAttempts;
	ba.aHits[0] = _stats.aHits[0];
	ba.aHits[1] = _stats.aHits[1];
	ba.aOffhands[0] = _stats.aOffhands[0];
	ba.aOffhands[1] = _stats.aOffhands[1];
	ba.aOffhands[2] = _stats.aOffhands[2];
	ba.aOffhands[3] = _stats.aOffhands[3];
	ba.sAttempts = _stats.sAttempts;
	ba.aDomino[0] = _stats.aDomino[0];
	ba.aDomino[1] = _stats.aDomino[1];
	ba.aDomino[2] = _stats.aDomino[2];
	ba.aDomino[3] = _stats.aDomino[3];
	ba.aDomino[4] = _stats.aDomino[4];
	ba.aDomino[5] = _stats.aDomino[5];
	ba.aDomino[6] = _stats.aDomino[6];
	ba.aDomino[7] = _stats.aDomino[7];
	ba.aDomino[8] = _stats.aDomino[8];
	ba.aDomino[9] = _stats.aDomino[9];
	ba.aCounters[0] = _stats.aCounters[0];
	ba.aCounters[1] = _stats.aCounters[1];
	ba.aCounters[2] = _stats.aCounters[2];
	ba.aCounters[3] = _stats.aCounters[3];
	ba.dDealt[0] = _stats.dDealt[0];
	ba.dDealt[1] = _stats.dDealt[1];
	ba.dDealt[2] = _stats.dDealt[2];
	ba.sHits[0] = _stats.sHits[0];
	ba.sHits[1] = _stats.sHits[1];
	ba.sResists = _stats.sResists;
	ba.dDealtSp[0] = _stats.dDealtSp[0];
	ba.dDealtSp[1] = _stats.dDealtSp[1];
	ba.absArry[0] = _stats.absArry[0];
	ba.absArry[1] = _stats.absArry[1];
	ba.absArry[2] = _stats.absArry[2];
	ba.mAttempts = _stats.mAttempts;
	ba.dTaken[0] = _stats.dTaken[0];
	ba.dTaken[1] = _stats.dTaken[1];
	ba.mHits[0] = _stats.mHits[0];
	ba.mHits[1] = _stats.mHits[1];
	ba.pDodges = _stats.pDodges;
	ba.pEvades = _stats.pEvades;
	ba.pParries = _stats.pParries;
	ba.pBlocks = _stats.pBlocks;
	ba.pResists = _stats.pResists;
	ba.mSpells = _stats.mSpells;
	ba.overStrikes = _stats.overStrikes;
	ba.coalesce = _stats.coalesce;
	ba.eTheft = _stats.eTheft;
	ba.channel = _stats.channel;
	ba.cureTotals[0] = _stats.cureTotals[0];
	ba.cureTotals[1] = _stats.cureTotals[1];
	ba.cureTotals[2] = _stats.cureTotals[2];
	ba.cureCounts[0] = _stats.cureCounts[0];
	ba.cureCounts[1] = _stats.cureCounts[1];
	ba.cureCounts[2] = _stats.cureCounts[2];
	ba.elemEffects[0] = _stats.elemEffects[0];
	ba.elemEffects[1] = _stats.elemEffects[1];
	ba.elemEffects[2] = _stats.elemEffects[2];
	ba.effectPoison[0] = _stats.effectPoison[0];
	ba.effectPoison[1] = _stats.effectPoison[1];
	ba.elemSpells[0] = _stats.elemSpells[0];
	ba.elemSpells[1] = _stats.elemSpells[1];
	ba.elemSpells[2] = _stats.elemSpells[2];
	ba.elemSpells[3] = _stats.elemSpells[3];
	ba.divineSpells[0] = _stats.divineSpells[0];
	ba.divineSpells[1] = _stats.divineSpells[1];
	ba.divineSpells[2] = _stats.divineSpells[2];
	ba.divineSpells[3] = _stats.divineSpells[3];
	ba.forbidSpells[0] = _stats.forbidSpells[0];
	ba.forbidSpells[1] = _stats.forbidSpells[1];
	ba.forbidSpells[2] = _stats.forbidSpells[2];
	ba.forbidSpells[3] = _stats.forbidSpells[3];
	ba.depSpells[0] = _stats.depSpells[0];
	ba.depSpells[1] = _stats.depSpells[1];
	ba.supportSpells = _stats.supportSpells;
	ba.curativeSpells = _stats.curativeSpells;
	ba.elemGain = _stats.elemGain;
	ba.divineGain = _stats.divineGain;
	ba.forbidGain = _stats.forbidGain;
	ba.depGain = _stats.depGain;
	ba.supportGain = _stats.supportGain;
	ba.curativeGain = _stats.curativeGain;
	ba.weapProfGain[0] = _stats.weapProfGain[0];
	ba.weapProfGain[1] = _stats.weapProfGain[1];
	ba.weapProfGain[2] = _stats.weapProfGain[2];
	ba.weapProfGain[3] = _stats.weapProfGain[3];
	ba.armorProfGain[0] = _stats.armorProfGain[0];
	ba.armorProfGain[1] = _stats.armorProfGain[1];
	ba.armorProfGain[2] = _stats.armorProfGain[2];
	ba.armorProfGain[3] = _stats.armorProfGain[3];
	ba.weaponprocs[0] = _stats.weaponprocs[0];
	ba.weaponprocs[1] = _stats.weaponprocs[1];
	ba.weaponprocs[2] = _stats.weaponprocs[2];
	ba.weaponprocs[3] = _stats.weaponprocs[3];
	ba.weaponprocs[4] = _stats.weaponprocs[4];
	ba.weaponprocs[5] = _stats.weaponprocs[5];
	ba.weaponprocs[6] = _stats.weaponprocs[6];
	ba.weaponprocs[7] = _stats.weaponprocs[7];
	ba.pskills[0] = _stats.pskills[0];
	ba.pskills[1] = _stats.pskills[1];
	ba.pskills[2] = _stats.pskills[2];
	ba.pskills[3] = _stats.pskills[3];
	ba.pskills[4] = _stats.pskills[4];
	ba.pskills[5] = _stats.pskills[5];
	ba.pskills[6] = _stats.pskills[6];
	ba.datestart = _stats.datestart;
	ba.save();
}
function addtoStatsBackup(back) {
	loadStatsObject();
	var ba = 0;
	ba = _backup[back];
	loadBackupObject(back);
	ba.rounds += _stats.rounds;
	ba.kills += _stats.kills;
	ba.aAttempts += _stats.aAttempts;
	ba.aHits[0] += _stats.aHits[0];
	ba.aHits[1] += _stats.aHits[1];
	ba.aOffhands[0] += _stats.aOffhands[0];
	ba.aOffhands[1] += _stats.aOffhands[1];
	ba.aOffhands[2] += _stats.aOffhands[2];
	ba.aOffhands[3] += _stats.aOffhands[3];
	ba.sAttempts += _stats.sAttempts;
	ba.aDomino[0] += _stats.aDomino[0];
	ba.aDomino[1] += _stats.aDomino[1];
	ba.aDomino[2] += _stats.aDomino[2];
	ba.aDomino[3] += _stats.aDomino[3];
	ba.aDomino[4] += _stats.aDomino[4];
	ba.aDomino[5] += _stats.aDomino[5];
	ba.aDomino[6] += _stats.aDomino[6];
	ba.aDomino[7] += _stats.aDomino[7];
	ba.aDomino[8] += _stats.aDomino[8];
	ba.aDomino[9] += _stats.aDomino[9];
	ba.aCounters[0] += _stats.aCounters[0];
	ba.aCounters[1] += _stats.aCounters[1];
	ba.aCounters[2] += _stats.aCounters[2];
	ba.aCounters[3] += _stats.aCounters[3];
	ba.dDealt[0] += _stats.dDealt[0];
	ba.dDealt[1] += _stats.dDealt[1];
	ba.dDealt[2] += _stats.dDealt[2];
	ba.sHits[0] += _stats.sHits[0];
	ba.sHits[1] += _stats.sHits[1];
	ba.sResists += _stats.sResists;
	ba.dDealtSp[0] += _stats.dDealtSp[0];
	ba.dDealtSp[1] += _stats.dDealtSp[1];
	ba.absArry[0] += _stats.absArry[0];
	ba.absArry[1] += _stats.absArry[1];
	ba.absArry[2] += _stats.absArry[2];
	ba.mAttempts += _stats.mAttempts;
	ba.dTaken[0] += _stats.dTaken[0];
	ba.dTaken[1] += _stats.dTaken[1];
	ba.mHits[0] += _stats.mHits[0];
	ba.mHits[1] += _stats.mHits[1];
	ba.pDodges += _stats.pDodges;
	ba.pEvades += _stats.pEvades;
	ba.pParries += _stats.pParries;
	ba.pBlocks += _stats.pBlocks;
	ba.pResists += _stats.pResists;
	ba.mSpells += _stats.mSpells;
	ba.overStrikes += _stats.overStrikes;
	ba.coalesce += _stats.coalesce;
	ba.eTheft += _stats.eTheft;
	ba.channel += _stats.channel;
	ba.cureTotals[0] += _stats.cureTotals[0];
	ba.cureTotals[1] += _stats.cureTotals[1];
	ba.cureTotals[2] += _stats.cureTotals[2];
	ba.cureCounts[0] += _stats.cureCounts[0];
	ba.cureCounts[1] += _stats.cureCounts[1];
	ba.cureCounts[2] += _stats.cureCounts[2];
	ba.elemEffects[0] += _stats.elemEffects[0];
	ba.elemEffects[1] += _stats.elemEffects[1];
	ba.elemEffects[2] += _stats.elemEffects[2];
	ba.effectPoison[0] += _stats.effectPoison[0];
	ba.effectPoison[1] += _stats.effectPoison[1];
	ba.elemSpells[0] += _stats.elemSpells[0];
	ba.elemSpells[1] += _stats.elemSpells[1];
	ba.elemSpells[2] += _stats.elemSpells[2];
	ba.elemSpells[3] += _stats.elemSpells[3];
	ba.divineSpells[0] += _stats.divineSpells[0];
	ba.divineSpells[1] += _stats.divineSpells[1];
	ba.divineSpells[2] += _stats.divineSpells[2];
	ba.divineSpells[3] += _stats.divineSpells[3];
	ba.forbidSpells[0] += _stats.forbidSpells[0];
	ba.forbidSpells[1] += _stats.forbidSpells[1];
	ba.forbidSpells[2] += _stats.forbidSpells[2];
	ba.forbidSpells[3] += _stats.forbidSpells[3];
	ba.depSpells[0] += _stats.depSpells[0];
	ba.depSpells[1] += _stats.depSpells[1];
	ba.supportSpells += _stats.supportSpells;
	ba.curativeSpells += _stats.curativeSpells;
	ba.elemGain += _stats.elemGain;
	ba.divineGain += _stats.divineGain;
	ba.forbidGain += _stats.forbidGain;
	ba.depGain += _stats.depGain;
	ba.supportGain += _stats.supportGain;
	ba.curativeGain += _stats.curativeGain;
	ba.weapProfGain[0] += _stats.weapProfGain[0];
	ba.weapProfGain[1] += _stats.weapProfGain[1];
	ba.weapProfGain[2] += _stats.weapProfGain[2];
	ba.weapProfGain[3] += _stats.weapProfGain[3];
	ba.armorProfGain[0] += _stats.armorProfGain[0];
	ba.armorProfGain[1] += _stats.armorProfGain[1];
	ba.armorProfGain[2] += _stats.armorProfGain[2];
	ba.armorProfGain[3] += _stats.armorProfGain[3];
	ba.weaponprocs[0] += _stats.weaponprocs[0];
	ba.weaponprocs[1] += _stats.weaponprocs[1];
	ba.weaponprocs[2] += _stats.weaponprocs[2];
	ba.weaponprocs[3] += _stats.weaponprocs[3];
	ba.weaponprocs[4] += _stats.weaponprocs[4];
	ba.weaponprocs[5] += _stats.weaponprocs[5];
	ba.weaponprocs[6] += _stats.weaponprocs[6];
	ba.weaponprocs[7] += _stats.weaponprocs[7];
	ba.pskills[0] += _stats.pskills[0];
	ba.pskills[1] += _stats.pskills[1];
	ba.pskills[2] += _stats.pskills[2];
	ba.pskills[3] += _stats.pskills[3];
	ba.pskills[4] += _stats.pskills[4];
	ba.pskills[5] += _stats.pskills[5];
	ba.pskills[6] += _stats.pskills[6];
	ba.save();
}
function loadStatsBackup(back) {
	loadStatsObject();
	var ba = 0;
	ba = _backup[back];
	loadBackupObject(back);
	_stats.rounds = ba.rounds;
	_stats.kills = ba.kills;
	_stats.aAttempts = ba.aAttempts;
	_stats.aHits[0] = ba.aHits[0];
	_stats.aHits[1] = ba.aHits[1];
	_stats.aOffhands[0] = ba.aOffhands[0];
	_stats.aOffhands[1] = ba.aOffhands[1];
	_stats.aOffhands[2] = ba.aOffhands[2];
	_stats.aOffhands[3] = ba.aOffhands[3];
	_stats.sAttempts = ba.sAttempts;
	_stats.aDomino[0] = ba.aDomino[0];
	_stats.aDomino[1] = ba.aDomino[1];
	_stats.aDomino[2] = ba.aDomino[2];
	_stats.aDomino[3] = ba.aDomino[3];
	_stats.aDomino[4] = ba.aDomino[4];
	_stats.aDomino[5] = ba.aDomino[5];
	_stats.aDomino[6] = ba.aDomino[6];
	_stats.aDomino[7] = ba.aDomino[7];
	_stats.aDomino[8] = ba.aDomino[8];
	_stats.aDomino[9] = ba.aDomino[9];
	_stats.aCounters[0] = ba.aCounters[0];
	_stats.aCounters[1] = ba.aCounters[1];
	_stats.aCounters[2] = ba.aCounters[2];
	_stats.aCounters[3] = ba.aCounters[3];
	_stats.dDealt[0] = ba.dDealt[0];
	_stats.dDealt[1] = ba.dDealt[1];
	_stats.dDealt[2] = ba.dDealt[2];
	_stats.sHits[0] = ba.sHits[0];
	_stats.sHits[1] = ba.sHits[1];
	_stats.sResists = ba.sResists;
	_stats.dDealtSp[0] = ba.dDealtSp[0];
	_stats.dDealtSp[1] = ba.dDealtSp[1];
	_stats.absArry[0] = ba.absArry[0];
	_stats.absArry[1] = ba.absArry[1];
	_stats.absArry[2] = ba.absArry[2];
	_stats.mAttempts = ba.mAttempts;
	_stats.dTaken[0] = ba.dTaken[0];
	_stats.dTaken[1] = ba.dTaken[1];
	_stats.mHits[0] = ba.mHits[0];
	_stats.mHits[1] = ba.mHits[1];
	_stats.pDodges = ba.pDodges;
	_stats.pEvades = ba.pEvades;
	_stats.pParries = ba.pParries;
	_stats.pBlocks = ba.pBlocks;
	_stats.pResists = ba.pResists;
	_stats.mSpells = ba.mSpells;
	_stats.overStrikes = ba.overStrikes;
	_stats.coalesce = ba.coalesce;
	_stats.eTheft = ba.eTheft;
	_stats.channel = ba.channel;
	_stats.cureTotals[0] = ba.cureTotals[0];
	_stats.cureTotals[1] = ba.cureTotals[1];
	_stats.cureTotals[2] = ba.cureTotals[2];
	_stats.cureCounts[0] = ba.cureCounts[0];
	_stats.cureCounts[1] = ba.cureCounts[1];
	_stats.cureCounts[2] = ba.cureCounts[2];
	_stats.elemEffects[0] = ba.elemEffects[0];
	_stats.elemEffects[1] = ba.elemEffects[1];
	_stats.elemEffects[2] = ba.elemEffects[2];
	_stats.effectPoison[0] = ba.effectPoison[0];
	_stats.effectPoison[1] = ba.effectPoison[1];
	_stats.elemSpells[0] = ba.elemSpells[0];
	_stats.elemSpells[1] = ba.elemSpells[1];
	_stats.elemSpells[2] = ba.elemSpells[2];
	_stats.elemSpells[3] = ba.elemSpells[3];
	_stats.divineSpells[0] = ba.divineSpells[0];
	_stats.divineSpells[1] = ba.divineSpells[1];
	_stats.divineSpells[2] = ba.divineSpells[2];
	_stats.divineSpells[3] = ba.divineSpells[3];
	_stats.forbidSpells[0] = ba.forbidSpells[0];
	_stats.forbidSpells[1] = ba.forbidSpells[1];
	_stats.forbidSpells[2] = ba.forbidSpells[2];
	_stats.forbidSpells[3] = ba.forbidSpells[3];
	_stats.depSpells[0] = ba.depSpells[0];
	_stats.depSpells[1] = ba.depSpells[1];
	_stats.supportSpells = ba.supportSpells;
	_stats.curativeSpells = ba.curativeSpells;
	_stats.elemGain = ba.elemGain;
	_stats.divineGain = ba.divineGain;
	_stats.forbidGain = ba.forbidGain;
	_stats.depGain = ba.depGain;
	_stats.supportGain = ba.supportGain;
	_stats.curativeGain = ba.curativeGain;
	_stats.weapProfGain[0] = ba.weapProfGain[0];
	_stats.weapProfGain[1] = ba.weapProfGain[1];
	_stats.weapProfGain[2] = ba.weapProfGain[2];
	_stats.weapProfGain[3] = ba.weapProfGain[3];
	_stats.armorProfGain[0] = ba.armorProfGain[0];
	_stats.armorProfGain[1] = ba.armorProfGain[1];
	_stats.armorProfGain[2] = ba.armorProfGain[2];
	_stats.armorProfGain[3] = ba.armorProfGain[3];
	_stats.weaponprocs[0] = ba.weaponprocs[0];
	_stats.weaponprocs[1] = ba.weaponprocs[1];
	_stats.weaponprocs[2] = ba.weaponprocs[2];
	_stats.weaponprocs[3] = ba.weaponprocs[3];
	_stats.weaponprocs[4] = ba.weaponprocs[4];
	_stats.weaponprocs[5] = ba.weaponprocs[5];
	_stats.weaponprocs[6] = ba.weaponprocs[6];
	_stats.weaponprocs[7] = ba.weaponprocs[7];
	_stats.pskills[0] = ba.pskills[0];
	_stats.pskills[1] = ba.pskills[1];
	_stats.pskills[2] = ba.pskills[2];
	_stats.pskills[3] = ba.pskills[3];
	_stats.pskills[4] = ba.pskills[4];
	_stats.pskills[5] = ba.pskills[5];
	_stats.pskills[6] = ba.pskills[6];
	_stats.datestart = ba.datestart;
	_stats.save();
}
function addfromStatsBackup(back) {
	loadStatsObject();
	var ba = 0;
	ba = _backup[back];
	loadBackupObject(back);
	_stats.rounds += ba.rounds;
	_stats.kills += ba.kills;
	_stats.aAttempts += ba.aAttempts;
	_stats.aHits[0] += ba.aHits[0];
	_stats.aHits[1] += ba.aHits[1];
	_stats.aOffhands[0] += ba.aOffhands[0];
	_stats.aOffhands[1] += ba.aOffhands[1];
	_stats.aOffhands[2] += ba.aOffhands[2];
	_stats.aOffhands[3] += ba.aOffhands[3];
	_stats.sAttempts += ba.sAttempts;
	_stats.aDomino[0] += ba.aDomino[0];
	_stats.aDomino[1] += ba.aDomino[1];
	_stats.aDomino[2] += ba.aDomino[2];
	_stats.aDomino[3] += ba.aDomino[3];
	_stats.aDomino[4] += ba.aDomino[4];
	_stats.aDomino[5] += ba.aDomino[5];
	_stats.aDomino[6] += ba.aDomino[6];
	_stats.aDomino[7] += ba.aDomino[7];
	_stats.aDomino[8] += ba.aDomino[8];
	_stats.aDomino[9] += ba.aDomino[9];
	_stats.aCounters[0] += ba.aCounters[0];
	_stats.aCounters[1] += ba.aCounters[1];
	_stats.aCounters[2] += ba.aCounters[2];
	_stats.aCounters[3] += ba.aCounters[3];
	_stats.dDealt[0] += ba.dDealt[0];
	_stats.dDealt[1] += ba.dDealt[1];
	_stats.dDealt[2] += ba.dDealt[2];
	_stats.sHits[0] += ba.sHits[0];
	_stats.sHits[1] += ba.sHits[1];
	_stats.sResists += ba.sResists;
	_stats.dDealtSp[0] += ba.dDealtSp[0];
	_stats.dDealtSp[1] += ba.dDealtSp[1];
	_stats.absArry[0] += ba.absArry[0];
	_stats.absArry[1] += ba.absArry[1];
	_stats.absArry[2] += ba.absArry[2];
	_stats.mAttempts += ba.mAttempts;
	_stats.dTaken[0] += ba.dTaken[0];
	_stats.dTaken[1] += ba.dTaken[1];
	_stats.mHits[0] += ba.mHits[0];
	_stats.mHits[1] += ba.mHits[1];
	_stats.pDodges += ba.pDodges;
	_stats.pEvades += ba.pEvades;
	_stats.pParries += ba.pParries;
	_stats.pBlocks += ba.pBlocks;
	_stats.pResists += ba.pResists;
	_stats.mSpells += ba.mSpells;
	_stats.overStrikes += ba.overStrikes;
	_stats.coalesce += ba.coalesce;
	_stats.eTheft += ba.eTheft;
	_stats.channel += ba.channel;
	_stats.cureTotals[0] += ba.cureTotals[0];
	_stats.cureTotals[1] += ba.cureTotals[1];
	_stats.cureTotals[2] += ba.cureTotals[2];
	_stats.cureCounts[0] += ba.cureCounts[0];
	_stats.cureCounts[1] += ba.cureCounts[1];
	_stats.cureCounts[2] += ba.cureCounts[2];
	_stats.elemEffects[0] += ba.elemEffects[0];
	_stats.elemEffects[1] += ba.elemEffects[1];
	_stats.elemEffects[2] += ba.elemEffects[2];
	_stats.effectPoison[0] += ba.effectPoison[0];
	_stats.effectPoison[1] += ba.effectPoison[1];
	_stats.elemSpells[0] += ba.elemSpells[0];
	_stats.elemSpells[1] += ba.elemSpells[1];
	_stats.elemSpells[2] += ba.elemSpells[2];
	_stats.elemSpells[3] += ba.elemSpells[3];
	_stats.divineSpells[0] += ba.divineSpells[0];
	_stats.divineSpells[1] += ba.divineSpells[1];
	_stats.divineSpells[2] += ba.divineSpells[2];
	_stats.divineSpells[3] += ba.divineSpells[3];
	_stats.forbidSpells[0] += ba.forbidSpells[0];
	_stats.forbidSpells[1] += ba.forbidSpells[1];
	_stats.forbidSpells[2] += ba.forbidSpells[2];
	_stats.forbidSpells[3] += ba.forbidSpells[3];
	_stats.depSpells[0] += ba.depSpells[0];
	_stats.depSpells[1] += ba.depSpells[1];
	_stats.supportSpells += ba.supportSpells;
	_stats.curativeSpells += ba.curativeSpells;
	_stats.elemGain += ba.elemGain;
	_stats.divineGain += ba.divineGain;
	_stats.forbidGain += ba.forbidGain;
	_stats.depGain += ba.depGain;
	_stats.supportGain += ba.supportGain;
	_stats.curativeGain += ba.curativeGain;
	_stats.weapProfGain[0] += ba.weapProfGain[0];
	_stats.weapProfGain[1] += ba.weapProfGain[1];
	_stats.weapProfGain[2] += ba.weapProfGain[2];
	_stats.weapProfGain[3] += ba.weapProfGain[3];
	_stats.armorProfGain[0] += ba.armorProfGain[0];
	_stats.armorProfGain[1] += ba.armorProfGain[1];
	_stats.armorProfGain[2] += ba.armorProfGain[2];
	_stats.armorProfGain[3] += ba.armorProfGain[3];
	_stats.weaponprocs[0] += ba.weaponprocs[0];
	_stats.weaponprocs[1] += ba.weaponprocs[1];
	_stats.weaponprocs[2] += ba.weaponprocs[2];
	_stats.weaponprocs[3] += ba.weaponprocs[3];
	_stats.weaponprocs[4] += ba.weaponprocs[4];
	_stats.weaponprocs[5] += ba.weaponprocs[5];
	_stats.weaponprocs[6] += ba.weaponprocs[6];
	_stats.weaponprocs[7] += ba.weaponprocs[7];
	_stats.pskills[0] += ba.pskills[0];
	_stats.pskills[1] += ba.pskills[1];
	_stats.pskills[2] += ba.pskills[2];
	_stats.pskills[3] += ba.pskills[3];
	_stats.pskills[4] += ba.pskills[4];
	_stats.pskills[5] += ba.pskills[5];
	_stats.pskills[6] += ba.pskills[6];
	_stats.save();
}
function HVTags() {
	this.load = function () { loadFromStorage(this, HV_TAGS); };
	this.save = function () { saveToStorage(this, HV_TAGS); };
	this.reset = function () { deleteFromStorage(HV_TAGS); };
	this.cloneFrom = clone;
	this.OneHandedIDs = [];
	this.OneHandedTAGs = [];
	this.TwoHandedIDs = [];
	this.TwoHandedTAGs = [];
	this.StaffsIDs = [];
	this.StaffsTAGs = [];
	this.ShieldIDs =[];
	this.ShieldTAGs =[];
	this.ClothIDs = [];
	this.ClothTAGs = [];
	this.LightIDs = [];
	this.LightTAGs = [];
	this.HeavyIDs = [];
	this.HeavyTAGs = [];
	this.isLoaded = false;
}
function loadTagsObject() {
	if (_tags !== null) return;
	_tags = new HVTags();
	_tags.load();
}
function HVCacheBackup(ID) {
	var backupID = "HVBackup"+ID;
	this.load = function () { loadFromStorage(this, backupID); };
	this.save = function () { saveToStorage(this, backupID); };
	this.reset = function () { deleteFromStorage(backupID); };
	this.cloneFrom = clone;
	this.rounds = 0;
	this.kills = 0;
	this.aAttempts = 0;
	this.aHits = [0, 0];
	this.aOffhands = [0, 0, 0, 0];
	this.sAttempts = 0;
	this.aDomino = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	this.aCounters = [0, 0, 0, 0];
	this.dDealt = [0, 0, 0];
	this.sHits = [0, 0];
	this.sResists = 0;
	this.dDealtSp = [0, 0];
	this.absArry = [0, 0, 0];
	this.mAttempts = 0;
	this.dTaken = [0, 0];
	this.mHits = [0, 0];
	this.pDodges = 0;
	this.pEvades = 0;
	this.pParries = 0;
	this.pBlocks = 0;
	this.pResists = 0;
	this.mSpells = 0;
	this.overStrikes = 0;
	this.coalesce = 0;
	this.eTheft = 0;
	this.channel = 0;
	this.cureTotals = [0, 0, 0];
	this.cureCounts = [0, 0, 0];
	this.elemEffects = [0, 0, 0];
	this.effectPoison = [0, 0];
	this.elemSpells = [0, 0, 0, 0];
	this.divineSpells = [0, 0, 0, 0];
	this.forbidSpells = [0, 0, 0, 0];
	this.depSpells = [0, 0];
	this.supportSpells = 0;
	this.curativeSpells = 0;
	this.elemGain = 0;
	this.divineGain = 0;
	this.forbidGain = 0;
	this.depGain = 0;
	this.supportGain = 0;
	this.curativeGain = 0;
	this.weapProfGain = [0, 0, 0, 0];
	this.armorProfGain = [0, 0, 0, 0];
	this.weaponprocs = [0, 0, 0, 0, 0, 0, 0, 0];
	this.pskills = [0, 0, 0, 0, 0, 0, 0];
	this.datestart = 0;
	this.datesave = 0;
	this.isLoaded = false;
}
function loadBackupObject(ID) {
	if (_backup[ID] !== null) return;
	_backup[ID] = new HVCacheBackup(ID);
	_backup[ID].load();
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
function HVCharacterStatsSettings() {
	this.load = function () { loadFromStorage(this, HV_CHSS); };
	this.save = function () { saveToStorage(this, HV_CHSS); };
	this.reset = function () { deleteFromStorage(HV_CHSS); };
	this.cloneFrom = clone;
	this.currHP = 0;
	this.currMP = 0;
	this.currSP = 0;
	//1-easy, 2-normal, 3-hard, 4-heroic, 5-
	this.difficulty = [0, 0];
	this.set = 0;
	this.isLoaded = false;
}
function loadCHARSSObject() {
	if (_charss !== null) return;
	_charss = new HVCharacterStatsSettings();
	_charss.load();
}

HVStat.registerScrollTargetMouseEventListeners = function () {
	var i, element;
	for (i = 0; i < HVStat.scrollTargets.length; i++) {
		element = document.getElementById(HVStat.scrollTargets[i]);
		if (element) {
			element.addEventListener("mouseover", function (event) {
				HVStat.scrollTarget = this;
			});
			element.addEventListener("mouseout", function (event) {
				HVStat.scrollTarget = null;
			});
		}
	}
};

HVStat.documentKeydownEventHandler = function (event) {
	if (_settings.enableScrollHotkey) {
		if (HVStat.scrollTarget && !event.altKey && !event.ctrlKey && !event.shiftKey) {
			switch (event.keyCode) {
			case 33:	// PAGE UP
				HVStat.scrollTarget.scrollTop -= HVStat.scrollTarget.clientHeight - 20;
				event.preventDefault();
				break;
			case 34:	// PAGE DOWN
				HVStat.scrollTarget.scrollTop += HVStat.scrollTarget.clientHeight - 20;
				event.preventDefault();
				break;
			}
		}
	}
	var boundKeys, i, j;
	if (hv.battle.active) {
		var miScan = HVStat.battleCommandMenuItemMap["Scan"];
		var miSkill1 = HVStat.battleCommandMenuItemMap["Skill1"];
		var miSkill2 = HVStat.battleCommandMenuItemMap["Skill2"];
		var miSkill3 = HVStat.battleCommandMenuItemMap["Skill3"];
		var miOFC = HVStat.battleCommandMenuItemMap["OFC"];
		var miSkills = [miSkill1, miSkill2, miSkill3];

		if (_settings.isEnableScanHotkey && miScan) {
			boundKeys = miScan.boundKeys;
			for (i = 0; i < boundKeys.length; i++) {
				if (boundKeys[i].equals(event)) {
					if (HVStat.battleCommandMap["Skills"].menuOpened) {
						HVStat.battleCommandMap["Skills"].close();
					} else {
						miScan.select();
					}
				}
			}
		}
		if (_settings.isEnableSkillHotkey && miSkill1) {
			var avilableSkillMaxIndex = -1;
			for (i = 0; i < miSkills.length; i++) {
				if (miSkills[i] && miSkills[i].available) {
					avilableSkillMaxIndex = i;
				}
			}
			boundKeys = miSkill1.boundKeys;
			for (i = 0; i < boundKeys.length; i++) {
				if (boundKeys[i].equals(event)) {
					if (HVStat.selectedSkillIndex >= avilableSkillMaxIndex) {
						HVStat.battleCommandMap["Skills"].close();
						HVStat.selectedSkillIndex = -1;
					} else {
						for (j = HVStat.selectedSkillIndex + 1; j <= avilableSkillMaxIndex; j++) {
							if (miSkills[j] && miSkills[j].available) {
								miSkills[j].select();
								HVStat.selectedSkillIndex = j;
								break;
							}
						}
					}
				}
			}
		}
		if (_settings.enableOFCHotkey && miOFC) {
			boundKeys = miOFC.boundKeys;
			for (i = 0; i < boundKeys.length; i++) {
				if (boundKeys[i].equals(event)) {
					if (HVStat.battleCommandMap["Skills"].menuOpened) {
						HVStat.battleCommandMap["Skills"].close();
					} else {
						miOFC.select();
					}
				}
			}
		}
	}
};

HVStat.scanButtonClickHandler = function (event) {
	var monsterId = this.id.slice(11);
	var monsterElement = document.getElementById(monsterId);
	HVStat.battleCommandMenuItemMap["Scan"].select();
	monsterElement.onclick();
}

HVStat.skillButtonClickHandler = function (event) {
	var result = /HVStatSkill(\d)_(.+)/.exec(this.id)
	if (!result || result.length < 3) {
		return;
	}
	var skillNumber = result[1];
	var monsterId = result[2];
	var monsterElement = document.getElementById(monsterId);
	HVStat.battleCommandMenuItemMap["Skill" + skillNumber].select();
	monsterElement.onclick();
}

HVStat.showScanAndSkillButtons = function () {
	var skill1 = HVStat.battleCommandMenuItemMap["Skill1"];
	var skill2 = HVStat.battleCommandMenuItemMap["Skill2"];
	var skill3 = HVStat.battleCommandMenuItemMap["Skill3"];
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
	var getButtonLabelFromSkillId = function (skillId) {
		var skillButtonLabelTable = [
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
		var i;
		for (i = 0; i < skillButtonLabelTable.length; i++) {
			if (skillButtonLabelTable[i].id === skillId) {
				return skillButtonLabelTable[i].label;
			}
		}
		return "";
	}

	var mainPane = document.getElementById("mainpane");
	var i, j;
	for (j = 0; j < HVStat.numberOfMonsters; j++) {
		var monsterElementId = HVStat.Monster.getDomElementId(j);
		var u = document.getElementById(monsterElementId);
		var e = u.children[2].children[0];
		var dead = e.innerHTML.indexOf("bardead") >= 0;
		var div, style;
		if (!dead) {
			var rectObject = u.getBoundingClientRect();
			var top = rectObject.top;
			if (_settings.isShowScanButton) {
				hv.elementCache.monsterPane.style.overflow = "visible";
				div = document.createElement("div");
				div.setAttribute("id", "HVStatScan_" + monsterElementId);
				div.className = "hvstat-scan-button";
				div.textContent = "Scan";
				u.insertBefore(div, null);
				div.addEventListener("click", HVStat.scanButtonClickHandler);
			}
			if (_settings.isShowSkillButton) {
				hv.elementCache.monsterPane.style.overflow = "visible";
				for (i = 0; i < skills.length; i++) {
					div = document.createElement("div");
					div.setAttribute("id", "HVStatSkill" + String(i + 1) + "_"+ monsterElementId);
					div.className = "hvstat-skill-button hvstat-skill-button" + String(i + 1);
					if (!skills[i].available) {
						div.style.cssText += "opacity: 0.3;";
					}
					div.textContent = getButtonLabelFromSkillId(skills[i].id);
					u.insertBefore(div, null);
					div.addEventListener("click", HVStat.skillButtonClickHandler);
				}
			}
		}
	}
}
function registerEventHandlersForMonsterPopup() {
	var delay = _settings.monsterPopupDelay;
	var popupLeftOffset = _settings.isMonsterPopupPlacement ? 955 : 300;
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
		var popupTopOffset = hv.elementCache.monsterPane.offsetTop
			+ index * ((hv.elementCache.monsterPane.scrollHeight - hv.elementCache.popup.scrollHeight) / 9);
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
		setTimeout(hidePopup, delay);
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
	var diff = _charss.difficulty[1];
	var elements = document.querySelectorAll('#arenaform img[onclick*="arenaform"]');
	var i, element;
	for (i = 0; i < elements.length; i++) {
		element = elements[i];
		var oldOnClick = element.getAttribute("onclick");
		var newOnClick = 'if(confirm("Are you sure you want to start this challenge on ' + diff + ' difficulty, with set number: ' + _charss.set + '?\\n';
		if (_settings.StartAlertHP > hv.character.healthPercent) {
			newOnClick += '\\n - HP is only '+ hv.character.healthPercent + '%';
		}
		if (_settings.StartAlertMP > hv.character.magicPercent) {
			newOnClick += '\\n - MP is only '+ hv.character.magicPercent + '%';
		}
		if (_settings.StartAlertSP > hv.character.spiritPercent) {
			newOnClick += '\\n - SP is only '+ hv.character.spiritPercent + '%';
		}
		if (_settings.StartAlertDifficulty < _charss.difficulty[0]) {
			newOnClick += '\\n - Difficulty is '+ diff;
		}
		newOnClick += '")) {'+ oldOnClick+ '}';
		element.setAttribute("onclick", newOnClick);
	}
}

HVStat.showEquippedSet = function () {
	loadCHARSSObject();
	var leftBar = document.querySelector("div.clb");
	var cssText = leftBar.querySelector("table.cit td > div > div").style.cssText;
	var table = document.createElement("table");
	table.setAttribute("class", "cit");
	table.innerHTML ='<tbody><tr><td><div class="fd12"><div id="HVStatEquippedSet"></div></div></td></tr></tbody>';
	leftBar.insertBefore(table, null);
	var equippedSet = document.getElementById("HVStatEquippedSet");
	equippedSet.style.cssText = cssText;
	equippedSet.innerHTML = "Equipped set: " + String(_charss.set);
};

function FindSettingsStats() {
	loadCHARSSObject();
	_charss.currHP = hv.character.healthRate;
	_charss.currMP = hv.character.magicRate;
	_charss.currSP = hv.character.spiritRate;
	var difficulty;
	var elements = document.querySelectorAll("div.clb table.cit");
	var i, element, text;
	for (i = 0; i < elements.length; i++) {
		element = elements[i];
		text = util.innerText(element);
		if (text.match(/Difficulty/ig)) {
			difficulty = text.match(/Easy|Normal|Hard|Heroic|Nightmare|Hell|Nintendo|Battletoads|IWBTH/ig);
		}
	}
	if (difficulty) {
		_charss.difficulty[1] = difficulty;
		switch (String(difficulty)) {
			case "Easy":
				_charss.difficulty[0] = 1; break;
			case "Normal":
				_charss.difficulty[0] = 2; break;
			case "Hard":
				_charss.difficulty[0] = 3; break;
			case "Heroic":
				_charss.difficulty[0] = 4; break;
			case "Nightmare":
				_charss.difficulty[0] = 5; break;
			case "Hell":
				_charss.difficulty[0] = 6; break;
			case "Nintendo":
				_charss.difficulty[0] = 7; break;
			case "Battletoads":
				_charss.difficulty[0] = 8; break;
			case "IWBTH":
				_charss.difficulty[0] = 9;
		}
	}
	elements = document.querySelectorAll("#setform img");
	var result;
	for (i = 0; i < elements.length; i++) {
		result = /set(\d)_on/.exec(elements[i].getAttribute("src"));
		if (result && result.length >= 2) {
			_charss.set = Number(result[1]);
			break;
		}
	}
	_charss.save();
}
function AlertEffectsSelf() {
	var effectNames = [
		"Protection", "Hastened", "Shadow Veil", "Regen", "Absorbing Ward",
		"Spark of Life", "Channeling", "Arcane Focus", "Heartseeker", "Spirit Shield",
		"Flame Spikes", "Frost Spikes", "Lightning Spikes", "Storm Spikes",
		"Chain 1", "Chain 2",
	];
	var elements = document.querySelectorAll("#battleform div.btps > img");
	Array.prototype.forEach.call(elements, function (element) {
		var onmouseover = element.getAttribute("onmouseover").toString();
		var result = HVStat.reSetInfoPaneParameters.exec(onmouseover);
		if (!result || result.length < 3) return;
		var effectName = result[1];
		var duration = result[2];
		var i;
		for (i = 0; i < effectNames.length; i++) {
			if (_settings.isEffectsAlertSelf[i]
					&& (effectName + " ").indexOf(effectNames[i] + " ") >= 0	// to match "Regen" and "Regen II", not "Regeneration"
					&& String(_settings.EffectsAlertSelfRounds[i]) === duration) {
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
		var result = HVStat.reSetInfoPaneParameters.exec(onmouseover);
		if (!result || result.length < 3) return;
		var effectName = result[1];
		var duration = result[2];
		var i, base, monsterNumber;
		for (i = 0; i < effectNames.length; i++) {
			if (_settings.isEffectsAlertMonsters[i]
					&& effectNames[i] === effectName
					&& String(_settings.EffectsAlertMonstersRounds[i]) === duration) {
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
	// can clean tag data when visited the Inventory page
	// because all equipments which is owned are listed.
	loadTagsObject();
	var equipTagArrayTable = [
		{id: _tags.OneHandedIDs,	value: _tags.OneHandedTAGs,	idClean: [], valueClean: []},
		{id: _tags.TwoHandedIDs,	value: _tags.TwoHandedTAGs,	idClean: [], valueClean: []},
		{id: _tags.StaffsIDs,		value: _tags.StaffsTAGs,	idClean: [], valueClean: []},
		{id: _tags.ShieldIDs,		value: _tags.ShieldTAGs,	idClean: [], valueClean: []},
		{id: _tags.ClothIDs,		value: _tags.ClothTAGs,		idClean: [], valueClean: []},
		{id: _tags.LightIDs,		value: _tags.LightTAGs,		idClean: [], valueClean: []},
		{id: _tags.HeavyIDs,		value: _tags.HeavyTAGs,		idClean: [], valueClean: []}
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
		if (equipTypeIdx < 0)
			throw new Exception("unexpected equipment type");
		var idArray = equipTagArrayTable[equipTypeIdx].id;
		var valueArray = equipTagArrayTable[equipTypeIdx].value;
		var idCleanArray = equipTagArrayTable[equipTypeIdx].idClean;
		var valueCleanArray = equipTagArrayTable[equipTypeIdx].valueClean;
		var index = idArray.indexOf(id);
		var inputElement = document.createElement("input");
		inputElement.type = "text";
		inputElement.className = "hvstat-equipment-tag";
		inputElement.name = "tagid_" + String(id);
		inputElement.size = 5;
		inputElement.maxLength = 6;
		inputElement.value = tagValue;
		var tagValue = "";
		if (index < 0) {
			inputElement.className += " hvstat-equipment-tag-new";
			inputElement.value = "*NEW*";
		} else {
			inputElement.value = valueArray[index];
			if (clean) {
				idCleanArray.push(id);
				valueCleanArray.push(tagValue);
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
			_tags.save();
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
					_tags.OneHandedIDs = idCleanArray;
					_tags.OneHandedTAGs = valueCleanArray;
					break;
				case 1:
					_tags.TwoHandedIDs = idCleanArray;
					_tags.TwoHandedTAGs = valueCleanArray;
					break;
				case 2:
					_tags.StaffsIDs = idCleanArray;
					_tags.StaffsTAGs = valueCleanArray;
					break;
				case 3:
					_tags.ShieldIDs = idCleanArray;
					_tags.ShieldTAGs = valueCleanArray;
					break;
				case 4:
					_tags.ClothIDs = idCleanArray;
					_tags.ClothTAGs = valueCleanArray;
					break;
				case 5:
					_tags.LightIDs = idCleanArray;
					_tags.LightTAGs = valueCleanArray;
					break;
				case 6:
					_tags.HeavyIDs = idCleanArray;
					_tags.HeavyTAGs = valueCleanArray;
					break;
				}
				cleaned = true;
			}
		}
		if (cleaned) {
			_tags.save();
		}
	}
}

HVStat.autoAdvanceBattleRound = function () {
	var dialogButton = document.getElementById("ckey_continue");
	if (dialogButton) {
		var onclick = dialogButton.getAttribute("onclick");
		if (onclick === "battle.battle_continue()") {
			(function (dialogButton) {
				setTimeout(function () {
					dialogButton.click();
					return 0;
				}, _settings.autoAdvanceBattleRoundDelay);
			})(dialogButton);
		}
	}
};

//------------------------------------
// main routine
//------------------------------------
HVStat.documentReadyStateChangeHandler = function (event) {
	document.removeEventListener("readystatechange", HVStat.documentReadyStateChangeHandler);
	HVStat.main2();
};

// readyState: loading
HVStat.main1 = function () {
	document.onkeydown = null;
	HVStat.idbAccessQueue = new util.CallbackQueue();
	// open database
	HVStat.openIndexedDB(function (event) {
		HVStat.idbAccessQueue.execute();
	});

	if (document.readyState === "loading") {
		document.addEventListener("readystatechange", HVStat.documentReadyStateChangeHandler);
	} else {
		HVStat.main2();
	}
};

// readyState: interactive
HVStat.main2 = function () {
	if (_settings.adjustKeyEventHandling) {
		hvStat.onkeydown = document.onkeydown;
		document.onkeydown = null;
	}

	hvStat.setup.addBasicStyle();
	if (_settings.isShowHighlight) {
		hvStat.setup.battle.addLogStyle();
	}
	hv = new HV();
	if (_settings.isChangePageTitle && document.title === "The HentaiVerse") {
		document.title = _settings.customPageTitle;
	}
	if (hv.battle.active) {
		HVStat.numberOfMonsters = document.querySelectorAll("#monsterpane > div").length;

		HVStat.buildBattleCommandMap();
		HVStat.buildBattleCommandMenuItemMap();

		if (_settings.isShowSelfDuration) {
			showSelfEffectsDuration();
		}
		if (_settings.isShowPowerupBox) {
			displayPowerupBox();
		}
		if (_settings.isHighlightQC) {
			HVStat.highlightQuickcast();
		}
		if (_settings.isShowDivider) {
			hvStat.setup.battle.addBattleLogDividers();
		}
		if (_settings.isShowHighlight) {
			hvStat.setup.battle.highlightLogText();
		}
		if (_settings.isShowScanButton || _settings.isShowSkillButton) {
			HVStat.showScanAndSkillButtons();
		}
		if (_settings.isShowMonsterNumber) {
			showMonsterNumber();
		}
		if (_settings.isShowMonsterDuration) {
			showMonsterEffectsDuration();
		}

		collectRoundInfo();
		if ((_round !== null) && (_round.currRound > 0) && _settings.isShowRoundCounter) {
			showRoundCounter();
		}
		if ((_round !== null) && (HVStat.monsters.length > 0)){
			showMonsterHealth();
			if (!HVStat.loadingMonsterInfoFromDB) {
				showMonsterStats();
			} else {
				HVStat.idbAccessQueue.add(function () {
					showMonsterStats();
				});
			}
		}
		if (_settings.isShowStatsPopup) {
			registerEventHandlersForMonsterPopup();
		}

		// show warnings
		HVStat.AlertAllFromQueue();
		if (!hv.battle.round.finished) {
			if (_settings.warnMode[_round.battleType]) {
				HVStat.warnHealthStatus();
			}
			if (_settings.isMainEffectsAlertSelf) {
				AlertEffectsSelf();
			}
			if (_settings.isMainEffectsAlertMonsters) {
				AlertEffectsMonsters();
			}
		}

		if (hv.battle.round.finished) {
			if (_settings.isShowEndStats) {
				showBattleEndStats();
			}
			saveStats();
			_round.reset();
			if (_settings.autoAdvanceBattleRound) {
				HVStat.autoAdvanceBattleRound();
			}
		}
	} else {
		localStorage.removeItem(HV_ROUND);
		if ((_settings.isStartAlert || _settings.isShowEquippedSet) && !hv.settings.useHVFontEngine) {
			FindSettingsStats();
		}
		if (!hv.location.isRiddle) {
			HVStat.resetHealthWarningStates();
		}
		if (_settings.enableScrollHotkey) {
			HVStat.registerScrollTargetMouseEventListeners();
		}
		// equipment tag
		if (hv.location.isEquipment && _settings.isShowTags[0]) {
			TaggingItems(false);
		}
		if (hv.location.isInventory && _settings.isShowTags[5]) {
			TaggingItems(true);
		}
		if (hv.location.isEquipmentShop && _settings.isShowTags[1]) {
			TaggingItems(false);
		}
		if (hv.location.isItemWorld && _settings.isShowTags[2]) {
			TaggingItems(false);
		}
		if (hv.location.isMoogleWrite && _settings.isShowTags[3]) {
			var mailForm = document.querySelector("#mailform #leftpane");
			if (mailForm) {
				var attachEquipButton = mailForm.children[3].children[1];
				attachEquipButton.addEventListener("click", function (event) {
					TaggingItems(false);
				});
			}
		}
		if (hv.location.isForge && _settings.isShowTags[4]) {
			TaggingItems(false);
			if (_settings.isDisableForgeHotKeys) {
				document.onkeypress = null;
			}
		}
		if (hv.location.isCharacter) {
			collectCurrentProfsData();
		}
		if (hv.location.isShrine) {
			if (_settings.isTrackShrine) {
				captureShrine();
			}
			if (browser.isChrome && _settings.enableShrineKeyPatch) {
				document.onkeydown = null;	// workaround to make enable SPACE key
			}
		}
		if (_settings.isStartAlert && !hv.settings.useHVFontEngine) {
			StartBattleAlerts();
		}
	}
	if (!hv.settings.useHVFontEngine && _settings.isShowEquippedSet) {
		HVStat.showEquippedSet();
	}
	if (_settings.isShowSidebarProfs) {
		showSidebarProfs();
	}

	var invAlert = localStorage.getItem(HV_EQUIP);
	var invFull = (invAlert === null) ? false : JSON.parse(invAlert);
	if (invFull) inventoryWarning();

	document.addEventListener("keydown", HVStat.documentKeydownEventHandler);

	hvStat.setup.addUIStyle();
	initUI();

	if (_settings.adjustKeyEventHandling) {
		document.onkeydown = hvStat.onkeydown;
	}
};

//------------------------------------
// execute
//------------------------------------
HVStat.main1();
