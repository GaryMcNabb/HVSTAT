// ==UserScript==
// @name             HV Statistics, Tracking, and Analysis Tool
// @namespace        HV STAT
// @description      Collects data, analyzes statistics, and enhances the interface of the HentaiVerse
// @include          http://hentaiverse.org/*
// @author           Various (http://forums.e-hentai.org/index.php?showtopic=50962)
// @version          5.4.3.0
// @require          https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @require          https://ajax.googleapis.com/ajax/libs/jqueryui/1.8.21/jquery-ui.min.js
// @resource         jQueryUICSS http://www.starfleetplatoon.com/~cmal/HVSTAT/jqueryui.css
// @run-at           document-end
// ==/UserScript==

// Package
var HVStat = {
	//------------------------------------
	// package scope global constants
	//------------------------------------
	VERSION: "5.4.3.0 Beta",
	isChrome: navigator.userAgent.indexOf("Chrome") >= 0,
	indexedDB: window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB,
	IDBTransaction: window.IDBTransaction || window.webkitIDBTransaction,
	IDBKeyRange: window.IDBKeyRange|| window.webkitIDBKeyRange,
	IDBCursor: window.IDBCursor || window.webkitIDBCursor,
	reMonsterScanResultsTSV: /^(\d+?)\t(.*?)\t(.*?)\t(.*?)\t(\d*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)$/gm,
	reMonsterSkillsTSV: /^(\d+?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)\t(.*?)$/gm,
	charGaugeMaxWidth: 120,
	monsterGaugeMaxWidth: 120,

	// page identification
	isBattleItemsPage: document.location.search === "?s=Character&ss=it",
	isInventoryPage: document.location.search === "?s=Character&ss=in",
	isEquipmentPage: document.location.search.indexOf("?s=Character&ss=eq") > -1,
	isItemWorldPage: document.location.search.indexOf("?s=Battle&ss=iw") > -1,
	isMoogleWrite: document.location.search.indexOf("?s=Bazaar&ss=mm&filter=Write") > -1,
	isShopPage: document.location.search.indexOf("?s=Bazaar&ss=es") > -1,
	isForgePage: document.location.search.indexOf("?s=Bazaar&ss=fr") > -1,
	isShrinePage: document.location.search === "?s=Bazaar&ss=ss",

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
	// DOM caches
	//------------------------------------
	popupElement: null,
	quickcastBarElement: null,
	battleLogElement: null,
	monsterPaneElement: null,
	charHpGaugeElement: null,
	charMpGaugeElement: null,
	charSpGaugeElement: null,
	charOcGaugeElement: null,

	//------------------------------------
	// package scope global variables
	//------------------------------------
	idb: null,
	transaction: null,
	dataURIMonsterScanResults: null,
	dataURIMonsterSkills: null,
	nRowsMonsterScanResultsTSV: 0,
	nRowsMonsterSkillsTSV: 0,

	// page identification
	isCharacterPage: false,
	isRiddlePage: false,

	// page states
	usingHVFont: true,

	// character states
	currHpRate: 0,
	currMpRate: 0,
	currSpRate: 0,
	currOcRate: 0,
	currHpPercent: 0,
	currMpPercent: 0,
	currSpPercent: 0,

	// battle states
	duringBattle: false,
	isBattleOver: false,
	numberOfMonsters: 0,
	monsters: [],	// instances of HVStat.Monster

	// keyboard enhancement
	battleCommandMap: null,
	selectedSkillIndex: -1	// -1: unselected 0-2: selected
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
	if (HVStat.isChrome) {
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
	str = String(mins) + " mins";
	if (hours > 0) {
		str = String(hours) + " hours, " + str;
	}
	if (days > 0) {
		str = String(days) + " days, " + str;
	}
	return str;
};

HVStat.getGaugeRate = function (gaugeElement, gaugeMaxWidth) {
	var reStyleWidth = /width\s*?:\s*?(\d+?)px/i;
	var style = gaugeElement.getAttribute("style");
	var result = reStyleWidth.exec(style);
	var rate;
	if (result && result.length >= 2) {
		rate = Number(result[1]) / gaugeMaxWidth;
	} else {
		rate = gaugeElement.width / gaugeMaxWidth;
	}
	return rate;
};

//------------------------------------
// classes
//------------------------------------

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
	MonsterScanResults.fetchScanningLog = function (index, html) {
		var reOfficial = /Monster Class:.*?<\/td><td.*?>(Common|Uncommon|Rare|Legendary|Ultimate)/;
		var reCustom = /Monster Class:.*?<\/td><td.*?>([A-Za-z]+), Power Level (\d+).*?<\/td/;
		var defWeak, defResistant, defImpervious;
		var vo = new HVStat.MonsterScanResultsVO();
		var r, array;
		vo.lastScanDate = (new Date()).toISOString();
		r = /Monster Trainer:.*?<\/td><td.*?>(.*?)<\/td/.exec(html);
		vo.trainer = r && r[1] || null;
		r = reOfficial.exec(html);
		if (r) {
			vo.monsterClass = r[1].toUpperCase() || null;
			vo.powerLevel = null;
		} else {
			r = reCustom.exec(html);
			if (r) {
				vo.monsterClass = r[1].toUpperCase() || null;
				vo.powerLevel = Number(r[2]) || null;
			} else {
				alert("HVSTAT: Unknown scanning format");
				return null;
			}
		}
		r = /Melee Attack:.*?<\/td><td.*?>(.+?)<\/td/.exec(html);
		vo.meleeAttack = r && r[1].toUpperCase() || null;
		r = /Weak against:.*?<\/td><td.*?>(.+?)<\/td/.exec(html);
		defWeak = r && r[1] || null;
		if (defWeak) {
			array = defWeak.toUpperCase().split(", ");
			array.forEach(function (element, index, array) {
				if (element !== "NOTHING") {
					vo.defenceLevel[element] = HVStat.DefenceLevel.WEAK.id;
				}
			});
		}
		r = /Resistant to:.*?<\/td><td.*?>(.+?)<\/td/.exec(html);
		defResistant = r && r[1] || null;
		if (defResistant) {
			array = defResistant.toUpperCase().split(", ");
			array.forEach(function (element, index, array) {
				if (element !== "NOTHING") {
					vo.defenceLevel[element] = HVStat.DefenceLevel.RESISTANT.id;
				}
			});
		}
		r = /Impervious to:.*?<\/td><td.*?>(.+?)<\/td/.exec(html);
		defImpervious = r && r[1] || null;
		if (defImpervious) {
			array = defImpervious.toUpperCase().split(", ");
			array.forEach(function (element, index, array) {
				if (element !== "NOTHING") {
					vo.defenceLevel[element] = HVStat.DefenceLevel.IMPERVIOUS.id;
				}
			});
		}
		vo.debuffsAffected = [];
		$("#" + HVStat.Monster.getDomElementId(index) + " div.btm6 > img").each(function () {
			var info = $(this).attr("onmouseover");
			var debuffId;
			for (debuffId in HVStat.Debuff) {
				if (info.indexOf(HVStat.Debuff[debuffId].name) >= 0) {
					vo.debuffsAffected.push(debuffId);
				}
			}
		});
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
			var v, style, bar = _healthBars[barIndex].querySelector("img.chb2");
			if (!bar) {
				v = 0;
			} else {
				style = bar.getAttribute("style");
				r = /width\s*?:\s*?(\d+?)px/i.exec(style);
				if (r && r.length >= 2) {
					v = Number(r[1]) / _maxBarWidth;
				} else {
					v = bar.width() / _maxBarWidth;
				}
			}
			return v;
		};

		var _currHpRate = currBarRate(0);
		var _currMpRate = currBarRate(1);
		var _currSpRate = currBarRate(2);
		var _hasSpiritPoint = _healthBars.length > 2;
		var _currHp = function () {
			var v = Math.ceil(_currHpRate * _maxHp);
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
			var hpBarBaseElement = _baseElement.children[2].children[0];
			var mpBarBaseElement = _baseElement.children[2].children[1];
			var spBarBaseElement = _baseElement.children[2].children[2];
			var maxAbbrLevel = _settings.ResizeMonsterInfo ? 5 : 1;
			var maxStatsWidth = 315;

			var hpIndicator = "";
			var mpIndicator = "";
			var spIndicator = "";
			var html, statsHtml;
			var div, divText;
			var statsElement;
			var abbrLevel;

			if (_settings.showMonsterHP || _settings.showMonsterHPPercent) {
				if (_settings.showMonsterHPPercent) {
					hpIndicator = (_currHpRate * 100).toFixed(2) + "%"
				} else {
					hpIndicator = _currHp() + " / " + _maxHp
				}
				div = document.createElement("div");
				div.setAttribute("style", "position:absolute;z-index:1074;top:-1px;font-size:8pt;font-family:arial,helvetica,sans-serif;font-weight:bolder;color:yellow;width:120px;text-align:center");
				divText = document.createTextNode(hpIndicator);
				div.appendChild(divText);
				hpBarBaseElement.parentNode.insertBefore(div, hpBarBaseElement.nextSibling);
			}
			if (_settings.showMonsterMP) {
				mpIndicator = (_currMpRate * 100).toFixed(1);
				div = document.createElement("div");
				div.setAttribute("style", "position:absolute;z-index:1074;top:11px;font-size:8pt;font-family:arial,helvetica,sans-serif;font-weight:bolder;color:yellow;width:120px;text-align:center");
				divText = document.createTextNode(mpIndicator);
				div.appendChild(divText);
				mpBarBaseElement.parentNode.insertBefore(div, mpBarBaseElement.nextSibling);
			}
			if (_hasSpiritPoint && _settings.showMonsterSP) {
				spIndicator = (_currSpRate * 100).toFixed(1);
				div = document.createElement("div");
				div.setAttribute("style", "position:absolute;z-index:1074;top:23px;font-size:8pt;font-family:arial,helvetica,sans-serif;font-weight:bolder;color:yellow;width:120px;text-align:center");
				divText = document.createTextNode(spIndicator);
				div.appendChild(divText);
				spBarBaseElement.parentNode.insertBefore(div, spBarBaseElement.nextSibling);
			}

			if (_settings.showMonsterInfoFromDB) {
				for (abbrLevel = 0; abbrLevel < maxAbbrLevel; abbrLevel++) {
					statsHtml = '';
					if (!_scanResult || !_scanResult.monsterClass) {
						statsHtml = '[<span style="color:red;font-weight:bold">NEW</span>]';
					} else {
						// class and power level
						if (_settings.showMonsterClassFromDB || _settings.showMonsterPowerLevelFromDB) {
							statsHtml += '{<span style="color: blue;">';
						}
						if (_settings.showMonsterClassFromDB) {
							statsHtml += _scanResult.monsterClass.toString(abbrLevel);
						}
						if (_settings.showMonsterPowerLevelFromDB && _scanResult.powerLevel) {
							if (_settings.showMonsterClassFromDB) {
								statsHtml += HVStat.delimiter.toString(abbrLevel);
							}
							statsHtml += _scanResult.powerLevel + '+';
						}
						if (_settings.showMonsterClassFromDB || _settings.showMonsterPowerLevelFromDB) {
							statsHtml += '</span>}';
						}
						// weaknesses and resistances
						if (_settings.showMonsterWeaknessesFromDB || _settings.showMonsterResistancesFromDB) {
							statsHtml += '[';
						}
						if (_settings.showMonsterWeaknessesFromDB) {
							statsHtml += '<span style="color: #3CB878;">';
							statsHtml += (_scanResult.defWeak.length > 0) ? _scanResult.getDefWeakString(true, true, abbrLevel) : "-";
							statsHtml += '</span>';
						}
						if (_settings.showMonsterResistancesFromDB) {
							if (_settings.showMonsterWeaknessesFromDB) {
								statsHtml += '|';
							}
							statsHtml += '<span style="color: #FF3300;">';
							statsHtml += (_scanResult.defResistant.length > 0) ? _scanResult.getDefResistantString(true, true, abbrLevel) : '-';
							statsHtml += '</span>';
							if (_scanResult.defImpervious.length > 0) {
								statsHtml += '|<span style="font-weight: bold; color: #990000; text-decoration: underline;">';
								statsHtml += _scanResult.getDefImperviousString(true, true, abbrLevel);
								statsHtml += '</span>';
							}
						}
						if (_settings.showMonsterWeaknessesFromDB || _settings.showMonsterResistancesFromDB) {
							statsHtml += "]";
						}
						// melee attack and skills
						if (_settings.showMonsterAttackTypeFromDB) {
							statsHtml += '(<span style="color: black;">' + _scanResult.meleeAttack.toString(abbrLevel > 0 ? abbrLevel : 1) + '</span>';
							var manaSkills = _getManaSkills();
							var manaSkillsExist = manaSkills.length > 0;
							if (manaSkillsExist) {
								statsHtml += ';<span style="color:blue">';
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
								statsHtml += '<span style="color:red">' + spiritSkill.toString(abbrLevel > 0 ? abbrLevel : 1) + '</span>';
							}
							statsHtml += ')';
						}
					}
					if (HVStat.usingHVFont) {
						nameOuterFrameElement.style.width = "auto"; // tweak for Firefox
						nameInnerFrameElement.style.width = "auto"; // tweak for Firefox
						html = "<div style='font-family:arial; font-size:7pt; font-style:normal; font-weight:bold; cursor:default; position:relative; top:-1px; left:2px; padding:0 1px; margin-left:0px; white-space:nowrap;'>" + statsHtml + "</div>";
						nameInnerFrameElement.after(html);
						statsElement = nameInnerFrameElement.nextSibling;
						//console.log("scrollWidth = " + statsElement.prop("scrollWidth"));
						if (Number(nameOuterFrameElement.scrollWidth) <= maxStatsWidth) {	// does not work with Firefox without tweak
							break;
						} else if (abbrLevel < maxAbbrLevel - 1) {
							// revert
							statsElement.remove();
						}
					} else {
						html = "<div style='font-family:arial; font-size:7pt; font-style:normal; font-weight:bold; display:inline; cursor:default; padding:0 1px; margin-left:1px; white-space:nowrap;'>" + statsHtml + "</div>";
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
				+ '<tr><td>Health: </td><td>' + _currHp() + ' / ' + _maxHp + '</td></tr>'
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
			fetchScanningLog: function (html, transaction) {
				_scanResult = HVStat.MonsterScanResults.fetchScanningLog(_index, html);
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
				};
				reqGet.onerror = function (event) {
					_waitingForGetResponseOfMonsterScanResults = false;
					console.log("get from MonsterScanResults: error");
				};
				// MonsterSkills
				var reqGet = skillsStore.get(_id);
				var idx = skillsStore.index("ix_id");
				var range = HVStat.IDBKeyRange.bound(_id, _id);
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
				}
				reqOpen.onerror = function(){
					_waitingForGetResponseOfMonsterSkills = false;
					console.log('request error.');
				}
				var doCallback = function () {
					if (callback instanceof Function) {
						if (!_waitingForDBResponse()) {
							callback();
						} else {
							//console.log("waiting");
							setTimeout(arguments.callee, 10);
						}
					}
				};
				doCallback();
			},
			putScanResultToDB: function (transaction) {
				if (!_id) {
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
				var range = HVStat.IDBKeyRange.bound(_id, _id);
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
	var reqDelete = HVStat.indexedDB.deleteDatabase("HVStat");
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
	//console.log("maintainObjectStores: old version = " + oldVer);
	//console.log("maintainObjectStores: new version = " + newVer);

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
	var reqOpen = HVStat.indexedDB.open("HVStat", idbVersion);
	reqOpen.onerror = function (event) {
		errorMessage = "Database open error: " + event.target.errorCode;
		alert(errorMessage);
		console.log(errorMessage);
	};
	// latest W3C draft (Firefox supports)
	reqOpen.onupgradeneeded = function (event) {
		console.log("onupgradeneeded");
		HVStat.idb = reqOpen.result;
		HVStat.maintainObjectStores(event);
		// subsequently onsuccess event handler is called automatically
	};
	reqOpen.onsuccess = function (event) {
		var idb = HVStat.idb = reqOpen.result;
		if (Number(idb.version) === idbVersion) {
			// always come here if Firefox
			if (callback instanceof Function) {
				callback(event);
			}
		} else {
			// for Chrome ('setVersion' style will soon be obsolete)
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
	this.name = spec && this.element && this.element.children[0].children[0].childNodes[0].nodeValue || "";
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
		var style = this.element.getAttribute("style");
		return !(style && style.match(/opacity\s*:\s*0/));
	},
	fire: function () {
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
	var itemElements = document.querySelectorAll("#" + this.elementId + " div.btsd");
	var i;
	for (i = 0; i < itemElements.length; i++) {
		this.items[i] = new HVStat.BattleCommandMenuItem({ parent: this, element: itemElements[i] });
	}
};

HVStat.BattleCommandMenu.prototype = {
	get opened() {
		var style = this.element.getAttribute("style");
		return !(style && style.match(/display\s*:\s*none/));
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
HV_LTC = "HVLoadTimeCounters";
HV_CHSS = "HVCharacterSettingsandStats";
HV_TAGS = "HVTags";
HOURLY = 0;
ARENA = 1;
GRINDFEST = 2;
ITEM_WORLD = 3;
CRYSFEST = 4;
_overview = null;
_stats = null;
_profs = null;
_rewards = null;
_shrine = null;
_drops = null;
_round = null;
_backup = [null, null, null, null, null, null];
_database = null;
_collectdata = null;
_charss = null;
_ltc = null;
_tags = null;
_isMenuInitComplete = false;
_equips = 0;
_lastEquipName = "";
_artifacts = 0;
_lastArtName = "";
_tokenDrops = [0, 0, 0];

/* ========== EMBEDDED IMAGES ========== */
I_HEALTHPOT = "data:image/gif;base64,R0lGODlhHgAgAOYAAPbt9ho9IwArCAArAAARAAhGCAgrCBFXERFGETR7NAgRCEaDRmmvacrkyvb/9uTt5BFXCDR7KxFGCBpXERpGEQgrABFXACtpGleVRhpXCE+nNBppABFGACt7ERErCDSMETR7GiuMABpXACt7CBpGCCtpETR7ETRpGkanETR7CCtpCE+MK4OvaafTjHKnT5XKcjR7ACtpAAgRAE+MGkZ7GnLBKytXAE+MEUZ7EU+MAHLBEcHklWCnAHKnK57bRq/bcnKnEZXKK57BT5XBGvb/28HkRnKMEa/TI9PtcuT2lfb2r9vTI/bt2wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACwAAAAAHgAgAAAH/4AzJioZhRsbEBkqiykmHSUrLhggKzMjLgwuLj0zLkJBKDc0H6QzpjNAQDcrP0o/QT89NURESUhFQR89PkeqMx83wagoOTk1SklBRz5BSERKSEdLRSMpNUW4KCY0JiZAoDdArUlAR83PRUfqQSU94UhJRZwzOTpHOjw6SURCQ0FBSoj80KFjSI8UHlwgAdIjCTIf+OwdGeJDiZIeQYA4+wGER6oZHCokeCakRyto6bAVcRgriBCBKFLkCKbigAEELwImmdHQIpKfKocYRBaER4gbKFCokGAARA8UP569WCHkVjp///4lSdILhQYgSpkucKWhBhJX4XQU+elw64+1Rf90hEpqAoGBkbR+oBAy0B7bgLR2HFmbMRyKDggITMjp4FkNHkPS+RgCpMgPh9CCYKPM48aGAgYuPHWxg0i6rTUgCvFpMt7gXp0RK1hAZMeLr0PO/vCBKwkAB0mCrY1chPKNEQgqRKDl4EE0h0UAE/mNJEcMfeaQCKkBJIWEChmE7KsVPR4RB+gBPPtx41jvJK9mkBiQAYhZZOUrMjmPvvFkaEc4RMsLFAwAASrNJOGDQ0I58xsRDzARREVI6HBDD+K1gIAAEsyAglpcrfSPgw9stVAr2OxQEgorQMChh9/cAuJltChRQw03AJRMRevNIIEABwZTGRL+tLWDgsUAwVL/Ribt90JyEJASzkrFRYcMEhlFhsRkK7G31wsBVBDlB6gUUUsqVWF2SxBCAeFDjT8IUVcFFkipj0CQvYZNEDrEGMt957GAgAx1AhPEPj00hM1E+WgGj0Wv+HBWCwEYkMFRN1S0Qw47MBHPLTFctuYR8JQay3clhFOZEiVN95MrMBBFWUGfrLUQBxkkmkNuSrjEBBMrsdoDNEAYkQMPMwFRkDkiiFBERwEmk4SnAPW6GkfB3ICDTB59ZMMQHkWHJS0++MDEDjq04gMQOeAwww0wwJBDKjfMUENRh9r4w68auZJuMtaZQkOxqahygwk35CBECy7c0EIDLWjwQwuJ/hDLCw0qmADCCfVmu20gADs=";
I_MANAPOT = "data:image/gif;base64,R0lGODlhHgAgAOYAACMRGiMIGkYrRmlPafbT9ox7jGkrcvbT/5V7p0YrYD0aYBEIGq+ewWlPjD0acisaRkYrcntXuCMRRsq47QgAGkYrgysRchEARisaYIx7wZ6M0yMRYNvT9j0jpyMaRhEAYCMRcisacmBPpysag089pxEAexEIRisalSMaYAgARhEIYAgAYGBXuAAATwAARgAAGggIYAgIRhERPQgIGisrafb2/z1GaT1PjCMrRmlyjLjB05Wnnmlyaaeeg1dPPfbt5MGvp9uVeysaGoxyctPBwdvT0/b29gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACwAAAAAHgAgAAAH/4AQGBImhTIyMSYSiw8YKBsVIiQhFRAeIiwiIg0QIggFNgkONKQQphADAwkVDD8MBQwNOUZGRURABTQNOz2qEDQJwag2AgI5P0UFPTsFREY/RD1BQB4POUC4NhgOGBgDoAkDrUUDPc3PQD3qBRsN4URFQJwQAjw9PD48RUYIQwUFP4ww4MFjSIMHKUQQGdCgCLId+Oz1GLLjx48GBQY4YzDARyoIFF6ceIagQSto6bABcRirAAKBNh4ICCYBhosVGQIWgdDQIpGfKocYRFbAB44ENmxISOEiRAMbDJ5lqIDgVjp///4VKdLLxo0BSpl2cHUjBxFX4XgA+elwK4O1QP94hEqKYYWLkbQY2EAw0B7bgLR09FibMZwNFCteqMhZ41kOH0PS7RgyAAgDh9AKYKPsI4EMFy5APBWhw0i6rTkgIvBpMt7gXp0Rt+hgREeGr0POMtiBq8iBGkWCrY0MhHICD4lH0KrBIZpDIICN/CYiAIA+c0QQ5BiA8IUJBPtqQY9npIb5A88YJDjWu8grCBe8DzCLbHxFAuXNN54MrYdDWhl88EIMqDRTxA4OCeXMb0ZwQEABFRHBQwINgKeBXSlAYINaXK30z4IcbLVQK9joUJINFcTgQoY2fHMLh5fR8kMOOSQAUDIVpQcBUwQGUxkR/rSlw4HFDMBSRibhl0H/YjGQEs5KxUGHDBEZRUbEZCupt1cGJQxYSmW1pFIVZrcUINQAO8jIAAJ1vTCDk/oIBNlr2BTAg4ux0FdeBIm9CUwB+zTQEDYT5aMZPBa9ssNZGpTggglHJVCRDgLoQEA8twBwWZk9wONpLCm8sEE4lf1QknQ/uSIEUZQV9MlaC1FggqAC5PaDSwQQsJKpDUAzgAEC+DDTAAWZs8ACQHTkXzJFXArQratxFEwCCsjk0UcBDOERdFTSssMOBOjAQys7DCCAAhAkIIQQAqSSAAQ5FAXojAzkqpEr4yZTnSkO/JqKKglgkIAACGggQgIaTKDBDQxoICgDsSQgAQYhWPDuBLTVBgIAOw==";
I_SPIRITPOT = "data:image/gif;base64,R0lGODlhHgAgAOYAACsACFcRI//k9tvTlcq4Rvbkla+MEdOvI6eMK+TBRu3Tcv/tr8GVGv/2255yAIxpEcGVK4xyNNO4cnJPAO2vI6dyEXJPEYxPAMqVT08rAK9yK4xPEREIAGk0CIxPGns0AMGVcmkrAKdPEXs0CGk0EadyT9OnjEYaAGkrCIxPK3s0EYM0EVcaAEYaCGkrEad7aXs0GmkaAEYRACsRCIM0Gv/k21caCGkrGpVXRrh7aSsIAHsrGkYaEUYRCFcaEVcRCHs0KysAABEAAEYICCsICFcREUYREXs0NBEICINGRuTKyv/29u3k5AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACwAAAAAHgAgAAAH/4AeKig2hRkZLTYoiyMqJC4pJTgwKR4dJS8lJRoeJRgQDxs0FqQeph4VFRspEgsSEBIaCA0NBQoJEBYaBAeqHhYbwagPFxcICwUQBwQQCg0LCgcUCR0jCAm4Dyo0KioVoBsVrQUVB83PCQfqEC4a4QoFCZweFwYHBg4GBQ0YDBAQCxpIMGCAgYYRQ0ooqKChADIC+OwdYEBgwQINECo4k1DBQSoPMnQceYZBQyto6bAlcBgLAgaBD0ZcCIaCBxEjIAIW8NDQooKfKhkYRAbBwYQNDx6g6EEEhoYHEp6BSIHhVjp///4VKNDrQYQKSpkmcRUBgQJX4Qwk+Olwq4S1Cf8MhEqqwgiRkbQkPMAw0B7bgLQGHFibMdwDEkaE+Mi55BkCBwzSEWBQIYEEh9AgYKPsYEOGGURuPC0xoEG6rQggYvBpMt7gXp0RA0jSYACIrwzOSiCAq4CAJQWCrY2cgPKGDkZ0AKG1hEk0hwkAN/it4EIIfeYUYEBQYUQPHTYw7KsVPV6DJegFPJOw4VjvAq88/OBgo4JZZOUr1jiPvvFkaAc4RAsIRXDQAirNFECAQ0I581sDTNQAQUUKGLCBBuKZYAQSPXjwgFpcrfSPg0xstVAr2AxQ0gMptMChh9/cAuJltCyAAAIbAJRMRet50AMSBwZTmQL+tDWAgsVUwFL/RibtB0JyLZASzkrFRYeMAhlFpsBkK7G3FwgB6BClBagkUEsqVWF2CwRCVUBAjRJgUJcOJ0ipj0CQvYYNBAbEGMt95+VgRBB1AgPBPho0hM1E+WgGj0WvEHCWCQEQYcNRG1Q0wAUD1BDPLSFctuYB8JQay3cuhFPZAiVN95MrHxBFWUGfrLWQDDYkekFuC7hUQw0rsaoBNBWIcIEDM1VQkDkssJBARwEmU4CnAPW6GkfBbLCCTB59FAMDHkWHJS0EEFDDAAa0QkAFF6zgwQYffHBBKht4gEBRh9oowa8auZJuMtaZQkOxqaiygQobXICBCSVsYIISJkQggQmJShDLCwYoqADDDvVmu20gADs=";
I_CHANNELING = "data:image/gif;base64,R0lGODlhHgAgAOYAAEYjNBEAESMRIzQjNEY0RgAAERERIzQ0VyMjNEZGVyM0RjRGV09yjHKVryNGV3KvyityjE+v00+VrwAaI3LT7U9yeyuVp0/K03Lt9gARERFPTytychErKyNXV0+vryNGRnLT00+MjIz29jRXV3Kvr6f//4zT0yM0NKft7bj//zRGRk9pabjt7cr//4yvr0ZXV3KMjK/T08rt7Wl7e4OVlae4uMrb20/t23Lt25Xt26f/7YPKuLj/7a/t2yNXRsr/7U+ngzRXRtv/7XKvjCtGNE9pV9Pt22CMaSM0I4yvjEZXRoOeg6e4p7jKuGl7YP//5CsRETQjI0Y0NHtpabi4uKenp4ODg3t7e2lpaVdXV0ZGRjQ0NCMjIxEREQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACwAAAAAHgAgAAAH/4AjHx0VhSEwiEuKS1cziDAhkZIhhR0bFRshOzs5KCw/P0KhNVY1SS4pJSKrIjk4ICAeHpghsCI6OjygPzEvTExNGySqrBivFBYRPpkmOLe5Py0/My9WT1Y0G8SrON2xHhwjITk5IiU6ny0yKytUVjYyHSisIt04Fx4bBh/jziWeLFq4+FDNShMjPnZse3XPw4kCHEJ0u+WJRwsYJ1RkuUIjxokQOlYZA3HjggQOBU54mIgCBQ9dLzhs2aKECJYTK+bVw3ChJLgMH0g405EihS4XTrJgQZKxChYVIVRhwADiwgULHDL4AFGOKA8WMIKc2IJlBhIVTbSc+LBDxNSqEf8sIMjQAcQqXCxmfNiiRYsKK1acEjmBYAEJVxcixJ1b9y6PITL5+tUyZSkSLgIyaIBl1eQJunZFtBxxgoCUmVxOdNFChAuXKAYm1Kp6NWvd0D1kSpGiZcsJAVqyvB4gQMCED7Rr0yUBwtkOAwMAmB6LGXPxLgYMcHggK0IILhkcPICVowIHLgOiuB6wpUvx69gN7PgGgUsXB7Bw5JhgQABmBAagh4AA7l3n2nyJbQDebSCEkB121vm3hX0BBNBFfLVYtcFcm4FAAgcPPkigawjY10WFXBhQAWcQMOYBCStkJ2OFFxbnmo0BdvGBCbC0GF4DG/wmowEXWhhAhAIcSSTpEcw1yEEXJzCgwAQCDFlAkfEVZ0CFBmSgBAywhMDBkTMgQOWQWxpQgIUnundhBl6uMJ+YGXBwwgEDohmAmgVcGcCa2HWRgRYrMEfnCRUokGd2ezLap599/pmBFE4MsUMIn/GzwqInNtpFAV70WaSkSKxQC6YZnBAkmmluCeqjFT7axQuanMSBCipcGGKanT4aaZ8GnODEETuQ8IEgCRB44bLLxuprn15wMEMRRwDxQAj5KIols70+mwFEHxQxLAncWeBAiVDoyuaovoYKEQfiVuDBtRB0MCCzkVZYoRf89hutTEocIYEEgQAAOw==";

jQuery.fn.outerHTML = function () {
	return $("<div>").append(this.eq(0).clone()).html();
};

/* =====
 setLogCSS
 Creates the CSS used to color the Battlelog.
 It uses complex selectors, so be careful!
===== */
function setLogCSS() {
	var bTD = "td[title*=",
		bCSS = "";
		
	if (_settings.isAltHighlight){
		bCSS = bTD+ "'hits']:not([title*='hits you']), "+ bTD+ "'blasts'], "+ bTD+ "'crits']:not([title*='crits you'])"
		+ "{color:black}"
		+ bTD+ "'you hit'], "+ bTD+ "'you crit'], "+ bTD+ "'you counter'], "+ bTD+ "'your offhand hit'], "+ bTD+ "'your offhand crit'], "+ bTD+ "'unleash']"
		+ "{color:black !important}"
		+ bTD+ "'gains the effect'], "+ bTD+ "'penetrated'], "+ bTD+ "'stun'], "+ bTD+ "'ripened soul']"
		+ "{color:purple}"
		+ bTD+ "'proficiency']"
		+ "{color:#BA9E1C}"
		+ bTD+ "'you resist'], "+ bTD+ "'you dodge'], "+ bTD+ "'you evade'], "+ bTD+ "'you block'], "+ bTD+ "'you parry'], "+ bTD+ "'misses'][title*='against you']"
		+ "{color:#555}"
		+ bTD+ "'misses its mark'][title^='your']"
		+ "{color:orange}"
		+ bTD+ "'uses']"
		+ "{color:blue}";
	} else {
		bCSS = bTD+ "'hits']:not([title*='hits you']), "+ bTD+ "'blasts'], "+ bTD+ "'crits']:not([title*='crits you'])"
		+ "{color:teal}"
		+ bTD+ "'procs the effect']"
		+ "{color:purple}"
		+ bTD+ "'you hit'], "+ bTD+ "'you crit'], "+ bTD+ "'you counter'], "+ bTD+ "'your offhand hit'], "+ bTD+ "'your offhand crit'], "+ bTD+ "'unleash']"
		+ "{color:blue !important}"
		+ bTD+ "'you resist'], "+ bTD+ "'you dodge'], "+ bTD+ "'you evade'], "+ bTD+ "'you block'], "+ bTD+ "'you parry'], "+ bTD+ "'misses'][title*='against you'], "+ bTD+ "'misses its mark'][title^='your']"
		+ "{color:#999}"
		+ bTD+ "'you gain']:not([title*='drained'])"
		+ "{color:#BA9E1C}"
		+ bTD+ "'uses']"
		+ "{color:orange}";
	}
	bCSS += bTD+ "'you crit'], "+ bTD+ "'crits'], "+ bTD+ "'blasts'],"+ bTD+ "'unleash']"
	+ "{font-weight:bold}"
	+ bTD+ "'you cast'], "+ bTD+ "'explodes for']"
	+ "{color:teal}"
	+ bTD+ "'bleeding wound hits'], "+ bTD+ "'spreading poison hits'], "+ bTD+ "'your spike shield hits'], "+ bTD+ "'searing skin hits'], "+ bTD+ "'burning soul hits']"
	+ "{color:purple !important}"
	+ bTD+ "'restores'], "+ bTD+ "'you are healed'], "+ bTD+ "'recovered'], "+ bTD+ "'hostile spell is drained'], "+ bTD+ "'you drain'], "+ bTD+ "'ether theft drains'], "+ bTD+ "'lifestream drains']"
	+ "{color:green}"
	+ bTD+ "'enough mp']"
	+ "{color:#F77}"
	+ bTD+ "'its you for']:not([title*='its you for 1 '])"
	+ "{color:red}"
	+ bTD+ "'its you for 1 ']"
	+ "{color:#999}"
	+ bTD+ "'casts']"
	+ "{color:#0016B8}"
	+ bTD+ "'powerup']"
	+ "{color:#F0F}"
	+ bTD+ "'charging soul'], "+ bTD+ "'your spirit shield absorbs']"
	+ "{color:#C97600}";
	
	GM_addStyle(bCSS);
}
/* =====
 highlightLogText
 Copies the text of each Battle Log entry into a title element.
 This is because CSS cannot currently select text nodes.
===== */
function highlightLogText() {
	var logRows = document.getElementById('togpane_log').getElementsByTagName('tr'),
		i = logRows.length,
		currRow = null;

	while (i--) {
		currRow = logRows[i].lastChild;
		currRow.title = currRow.textContent.toLowerCase();
	}
}
/* =====
 addBattleLogDividers
 Adds a divider between Battle Log rounds.
===== */
function addBattleLogDividers() {
	var doc = document,
		logRows = doc.getElementById('togpane_log').getElementsByTagName('tr'),
		i = logRows.length,
		prevTurn = null,
		currTurn = null,
		parent = null,
		divider = null;
	
	while (i--) {
		currTurn = logRows[i].firstChild.innerHTML;
		if (!isNaN(parseInt(currTurn))) {
			if (prevTurn && prevTurn !== currTurn) {
				divider = doc.createElement('tr');
				divider.innerHTML = "<td colspan='3'><hr style='border:0; height:1px; background-color:#666666; color:#666666' /></td>";
				parent = logRows[i].firstChild.parentNode;
				parent.parentNode.insertBefore(divider, parent.nextSibling);
			}
			prevTurn = currTurn;
		}
	}
}
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
	
	div.setAttribute('style', 'font-size:18px;font-weight:bold;font-family:arial,helvetica,sans-serif;text-align:right;position:absolute;top:6px;right:17px;');
	div.innerHTML = "<div style='" + (curRound === maxRound - 1 ? "color:orange;'>" : curRound === maxRound ? "color:red;'>" : "'>") + dispRound + "</div>";
	doc.getElementById('battleform').children[0].appendChild(div);
}
/* =====
 displayPowerupBox
 Adds a Powerup box to the Battle screen.
 Creates a shortcut to the powerup if one is available.
===== */
function displayPowerupBox() {
	var doc = document,
		battleMenu = doc.getElementsByClassName("btp"),
		powerBox = doc.createElement("div");
		powerup = doc.getElementById("ikey_p");
	
	powerBox.setAttribute("style", "position:absolute;top:7px;right:5px;background-color:#EFEEDC;width:30px;height:32px;border-style:double;border-width:2px;border-color:#555555;");
	if (powerup === null) powerBox.innerHTML = "<span style='font-size:16px;font-weight:bold;font-family:arial,helvetica,sans-serif;text-align:center;line-height:32px;cursor:default'>P</span>";
	else {
		var powerInfo = powerup.getAttribute("onmouseover");
		powerBox.setAttribute("onmouseover", powerInfo);
		powerBox.setAttribute("onmouseout", powerup.getAttribute("onmouseout"));
		//powerBox.setAttribute("onclick", 'var e=createEvent("Events");e.initEvent("keydown",true,true);e.altKey=false;e.ctrlKey=false;e.shiftKey=false;e.metaKey=false;e.keyCode=80;document.dispatchEvent(e);');
		powerBox.setAttribute("onclick", 'document.getElementById("ckey_items").onclick();document.getElementById("ikey_p").onclick();document.getElementById("ikey_p").onclick();');
		if (powerInfo.indexOf('Health') > -1) powerBox.innerHTML = "<img class='PowerupGemIcon' src='"+ I_HEALTHPOT+ "' id='healthgem'>";
		else if (powerInfo.indexOf('Mana') > -1) powerBox.innerHTML = "<img class='PowerupGemIcon' src='"+ I_MANAPOT+ "' id='managem'>";
		else if (powerInfo.indexOf('Spirit') > -1) powerBox.innerHTML = "<img class='PowerupGemIcon' src='"+ I_SPIRITPOT+ "' id='spiritgem'>";
		else if (powerInfo.indexOf('Mystic') > -1) powerBox.innerHTML = "<img class='PowerupGemIcon' src='"+ I_CHANNELING+ "' id='channelgem'>";
	}
	battleMenu[0].appendChild(powerBox);
}
function showMonsterStats() {
	for (var i = 0; i < HVStat.numberOfMonsters; i++) {
		HVStat.monsters[i].renderStats();
	}
}
function showMonsterEffectsDuration() {
	for (var i = 0; i < HVStat.numberOfMonsters; i++) {
		var baseElement = document.getElementById(HVStat.Monster.getDomElementId(i));
		var array = baseElement.children[3].getElementsByTagName("img");
		var j = array.length
		while(j--)createDurationBadge(array[j], j);
	}
}
function showSelfEffectsDuration() {
	var array = document.getElementsByClassName("btps")[0].getElementsByTagName("img");
	var i = array.length;
	while(i--)createDurationBadge(array[i], i);
}
function createDurationBadge(a, x) {
	var SELF_EFF_TOP = 34;
	var SELF_EFF_LEFT = 8;
	var MON_EFF_TOP = -3;
	var MON_EFF_LEFT = 5;
	var FIRST_EFF = 33;
	var e = a;
	var g, d;
	var c, f;
	d = e.outerHTML.match(/\s\d+?\)/);
	if (d !== null) g = d[0].replace(")", "").replace(" ", "");
	if (g >= 0) {
		var h = e.parentNode.parentNode.parentNode.id === "monsterpane";
		c = h ? MON_EFF_TOP : SELF_EFF_TOP;
		f = (h ? MON_EFF_LEFT : SELF_EFF_LEFT) + FIRST_EFF * x;
		var b = "<div style='position:absolute;";
		if (h) {
			if (_settings.isMonstersEffectsWarnColor) {
				if (g <= Number(_settings.MonstersWarnRedRounds))
					b += "background-color:red;";
				else if (g <= Number(_settings.MonstersWarnOrangeRounds))
					b += "background-color:orange;";
				else b += "background-color:#EFEEDC;";
			} else  b += "background-color:#EFEEDC;";
		} else if (!h) {
			if (_settings.isSelfEffectsWarnColor) {
				if (g <= Number(_settings.SelfWarnRedRounds))
					b += "background-color:red;";
				else if (g <= Number(_settings.SelfWarnOrangeRounds))
					b += "background-color:orange;";
				else b += "background-color:#EFEEDC;";
			} else b += "background-color:#EFEEDC;";
		}
		b += "font-size:11px;font-weight:bold;font-family:arial,helvetica,sans-serif;line-height:12px;text-align:center;width:20px;height:12px;border-style:solid;border-width:1px;border-color:#5C0D11;overflow:hidden;top:" + c + "px;left:" + f + "px;cursor:default;'>" + g + "</div>";
		e.parentNode.innerHTML += b;
	}
}
function showBattleEndStats() {
	var battleLog = document.getElementById("togpane_log");
	battleLog.innerHTML = "<div class='ui-state-default ui-corner-bottom' style='padding:10px;margin-bottom:10px;text-align:left'>" + getBattleEndStatsHtml() + "</div>" + battleLog.innerHTML;
}
function showMonsterNumber() {
	var targets = document.querySelectorAll('.btmi'), i = targets.length;
	while (i-- > 0) targets[i].parentNode.appendChild(document.createElement('div')).innerHTML = (i+1)%10;
	var style = '.btmi {display:none;} .btmi + div {height:25px; font-size:1.6em; font-family:HentaiVerse; color:black; padding-top:0.4em;}';
	var style2 = document.createElement('style');
	style2.innerHTML = style;
	document.head.appendChild(style2);
}

HVStat.highlightQuickcast = function () {
	var hpHighlightLevel1 = Number(_settings.warnOrangeLevel);
	var hpHighlightLevel2 = Number(_settings.warnRedLevel);
	var mpHighlightLevel1 = Number(_settings.warnOrangeLevelMP);
	var mpHighlightLevel2 = Number(_settings.warnRedLevelMP);
	var spHighlightLevel1 = Number(_settings.warnOrangeLevelSP);
	var spHighlightLevel2 = Number(_settings.warnRedLevelSP);
	if (HVStat.currHpPercent <= hpHighlightLevel1) {
		HVStat.quickcastBarElement.style.backgroundColor = (HVStat.currHpPercent > hpHighlightLevel2) ? "orange" : "red";
	} else if (HVStat.currMpPercent <= mpHighlightLevel1) {
		HVStat.quickcastBarElement.style.backgroundColor = (HVStat.currMpPercent > mpHighlightLevel2) ? "blue" : "darkblue";
	} else if (HVStat.currSpPercent <= spHighlightLevel1) {
		HVStat.quickcastBarElement.style.backgroundColor = (HVStat.currSpPercent > spHighlightLevel2) ? "lime" : "green";
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
	var hpWarningResumeLevel = hpWarningLevel + 10;
	var mpWarningResumeLevel = mpWarningLevel + 10;
	var spWarningResumeLevel = spWarningLevel + 10;
	if (!HVStat.isBattleOver) {
		if (_settings.isShowPopup) {
			if (HVStat.currHpPercent <= hpWarningLevel && (!hpAlertAlreadyShown || _settings.isNagHP)) {
				alert("Your health is dangerously low!");
				hpAlertAlreadyShown = true;
				localStorage.setItem(HVStat.key_hpAlertAlreadyShown, "true");
			}
			if (HVStat.currMpPercent <= mpWarningLevel && (!mpAlertAlreadyShown || _settings.isNagMP)) {
				alert("Your mana is dangerously low!");
				mpAlertAlreadyShown = true;
				localStorage.setItem(HVStat.key_mpAlertAlreadyShown, "true");
			}
			if (HVStat.currSpPercent <= spWarningLevel && (!spAlertAlreadyShown || _settings.isNagSP)) {
				alert("Your spirit is dangerously low!");
				spAlertAlreadyShown = true;
				localStorage.setItem(HVStat.key_spAlertAlreadyShown, "true");
			}
		}
		if (_settings.isAlertOverchargeFull && HVStat.currOcRate >= 1.0 && !ocAlertAlreadyShown) {
			alert("Your overcharge is full.");
			ocAlertAlreadyShown = true;
			localStorage.setItem(HVStat.key_ocAlertAlreadyShown, "true");
		}
	}
	if (hpWarningLevel > hpWarningResumeLevel) {
		localStorage.removeItem(HVStat.key_hpAlertAlreadyShown);
	}
	if (mpWarningLevel > mpWarningResumeLevel) {
		localStorage.removeItem(HVStat.key_mpAlertAlreadyShown);
	}
	if (spWarningLevel > spWarningResumeLevel) {
		localStorage.removeItem(HVStat.key_spAlertAlreadyShown);
	}
	if (HVStat.currOcRate < 1.0) {
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
	if (!HVStat.isCharacterPage || HVStat.usingHVFont)
		return;
	loadProfsObject();
	var c = $(".eqm").children().eq(0).children().eq(1).children();
	var b = _profs.weapProfTotals.length;
	while (b--)
		_profs.weapProfTotals[b] = parseFloat(c.eq(0).children().eq(1).find(".fd12").eq(b * 2 + 1).text());
	b = _profs.armorProfTotals.length;
	while (b--)
		_profs.armorProfTotals[b] = parseFloat(c.eq(0).children().eq(1).find(".fd12").eq(b * 2 + 7).text());
	var a = c.eq(1).children().eq(1).find(".fd12");
	_profs.elemTotal = parseFloat(a.eq(1).text());
	_profs.divineTotal = parseFloat(a.eq(3).text());
	_profs.forbidTotal = parseFloat(a.eq(5).text());
	_profs.spiritTotal = parseFloat(a.eq(7).text()); //spiritTotal added by Ilirith
	_profs.depTotal = parseFloat(a.eq(9).text());
	_profs.supportTotal = parseFloat(a.eq(11).text());
	_profs.curativeTotal = parseFloat(a.eq(13).text());
	_profs.save();
}
function showSidebarProfs() {
	loadProfsObject();
	if (!isProfTotalsRecorded())
		return;
	var b = $(".stuffbox").height() - 31;
	GM_addStyle(".prof_sidebar td {font-family:arial,helvetica,sans-serif; font-size:9pt; font-weight:normal; text-align:left}.prof_sidebar_top td {font-family:arial,helvetica,sans-serif; font-size:10pt; font-weight:bold; text-align:center}");
	var a = "<div id='_profbutton' class='ui-corner-all' style='position:absolute;top:" + b + "px;border:1px solid;margin-left:5px;padding:2px;width:132px;font-size:10pt;font-weight:bold;text-align:center;cursor:default;'>Proficiency</div>";
	$(".clb").append(a);
	$("#_profbutton").mouseover(function () {
		var c = HVStat.popupElement;
		var d = $("#_profbutton").offset();
		c.style.left = d.left + 145 + "px";
		c.style.top = d.top - 126 + "px";
		c.style.width = "260px";
		c.style.height = "126px";
		c.innerHTML = '<table class="prof_sidebar" cellspacing="0" cellpadding="0" style="width:100%">'
			+ '<tr class="prof_sidebar_top"><td colspan="2"><b>Equipment</b></td><td colspan="2"><b>Magic</b></td></tr>'
			+ '<tr><td style="width:34%">One-handed:</td><td>' + _profs.weapProfTotals[0].toFixed(2) + '</td><td style="width:34%">Elemental:</td><td>' + _profs.elemTotal.toFixed(2) + '</td></tr>'
			+ '<tr><td>Two-handed:</td><td>' + _profs.weapProfTotals[1].toFixed(2) + '</td><td>Divine:</td><td>' + _profs.divineTotal.toFixed(2) + '</td></tr>'
			+ '<tr><td>Dual wielding:</td><td>' + _profs.weapProfTotals[2].toFixed(2) + '</td><td>Forbidden:</td><td>' + _profs.forbidTotal.toFixed(2) + '</td></tr>'
			+ '<tr><td>Staff:</td><td>' + _profs.weapProfTotals[3].toFixed(2) + '</td><td>Spiritual:</td><td>' + _profs.spiritTotal.toFixed(2) + '</td></tr>'
			+ '<tr><td>Cloth armor:</td><td>' + _profs.armorProfTotals[1].toFixed(2) + '</td><td>Deprecating:</td><td>' + _profs.depTotal.toFixed(2) + '</td></tr>'
			+ '<tr><td>Light armor:</td><td>' + _profs.armorProfTotals[2].toFixed(2) + '</td><td>Supportive:</td><td>' + _profs.supportTotal.toFixed(2) + '</td></tr>'
			+ '<tr><td>Heavy armor:</td><td>' + _profs.armorProfTotals[3].toFixed(2) + '</td><td>Curative:</td><td>' + _profs.curativeTotal.toFixed(2) + '</td></tr></table>'; //spiritTotal added by Ilirith
		c.style.visibility = "visible";
	});
	$("#_profbutton").mouseout(function () {
		HVStat.popupElement.style.visibility = "hidden";
	});
}
function isProfTotalsRecorded() {
	loadProfsObject();
	return _profs.weapProfTotals.length > 0;
}
function inventoryWarning() {
	var d = 4;
	var c = $(".stuffbox").width() - 85 - 4;
	var a = document.createElement("div");
	var b = "<div class='ui-state-error ui-corner-all' style='position:absolute; top:" + d + "px; left: " + c + "px; z-index:1074'><span style='margin:3px' class='ui-icon ui-icon-alert' title='Inventory Limit Exceeded.'/></div>";
	$(a).html(b);
	$(a).addClass("_warningButton");
	$("body").append(a);
	$(a).css("cursor", "pointer");
	$("._warningButton").click(function () {
		if (confirm("Reached equipment inventory limit (1000). Clear warning?")) deleteFromStorage(HV_EQUIP);
	});
}
function collectRoundInfo() {
	var e = "";
	var a = 0;
	var ac = 0;
	var c = "";
	var d;
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
	var index = HVStat.monsters.length - 1;
	$("#togpane_log td:first-child").each(function (j) {
		var reResult;
		var g = $(this);
		var k = g.next().next();
		if (j === 0) {
			e = g.html();
		}
		c = k.html();
		var kline = g.html();
		var kline2 = parseInt(g.next().html()) - 1;
		var sel0 = $(".t1:contains(" + kline + ")");
		var sel = sel0.next().filter(":contains(" + kline2 + ")").next().html();
		var selall = $(".t1:contains(" + kline + ")").next().next().text();
		if (!_round.isLoaded) { // -> if turn 0
			if (c.match(/HP=/)) {
				HVStat.monsters[index].fetchStartingLog(c);
				if (_settings.showMonsterInfoFromDB) {
					HVStat.monsters[index].getFromDB(HVStat.transaction, RoundSave);
				}
				if (_settings.isTrackItems) {
					_round.dropChances++;
				}
				index--;
			} else if (c.match(/\(Round/)) {
				var f = c.match(/\(round.*?\)/i)[0].replace("(", "").replace(")", "");
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
			if (c.match(/random encounter/)) {
				_round.battleType = HOURLY;
			} else if (c.match(/arena challenge/)) {
				_round.battleType = ARENA;
				_round.arenaNum = parseInt(c.match(/challenge #\d+?\s/i)[0].replace("challenge #", ""));
			} else if (c.match(/GrindFest/)) {
				_round.battleType = GRINDFEST;
			} else if (c.match(/Item World/)) {
				_round.battleType = ITEM_WORLD;
			} else if (c.match(/CrysFest/)) {
				_round.battleType = CRYSFEST;
			}
			RoundSave();
		}
		if (g.html() !== e) {
			return false;
		}
		if (_settings.isAlertGem && c.match(/drops a (.*) Gem/)) {
			alert("You picked up a " + RegExp.$1 + " Gem.");
		}
		if (_settings.isWarnAbsorbTrigger && /The spell is absorbed/.test(c)) {
			alert("Absorbing Ward has triggered.");
		}
		if (_settings.isWarnSparkTrigger && c.match(/spark of life.*defeat/ig)) {
			alert("Spark of Life has triggered!!");
		}
		if (_settings.isWarnSparkExpire && c.match(/spark of life.*expired/ig)) {
			alert("Spark of Life has expired!!");
		}
		if ((_settings.isShowSidebarProfs || _settings.isTrackStats) && c.match(/0.0(\d+) points of (.*?) proficiency/ig)) {
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
				_profs.armorProfTotals[1] += p;
				_round.armorProfGain[1] += p;
			} else if (r.match(/light armor/)) {
				_profs.armorProfTotals[2] += p;
				_round.armorProfGain[2] += p;
			} else if (r.match(/heavy armor/)) {
				_profs.armorProfTotals[3] += p;
				_round.armorProfGain[3] += p;
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
			if (c.indexOf("Scanning") >= 0) {
				(function () {
					var scanningMonsterName;
					var scanningMonsterIndex = -1;
					var r = /Scanning ([^\.]{0,30})\.{3,}/.exec(c);
					var i, len, monster;
					if (r && r.length >= 2) {
						scanningMonsterName = r[1];
						len = HVStat.monsters.length;
						for (i = 0; i < len; i++) {
							monster = HVStat.monsters[i];
							if (monster.name === scanningMonsterName) {
								monster.fetchScanningLog(c, HVStat.transaction);
							}
						}
					}
				})();
			}
		}
		if (_settings.isTrackStats || _settings.isShowEndStats) {
			var o = 0;
			if (c.match(/\s(\d+)\s/)) {
				o = parseInt(RegExp.$1);
			}
			if (c.match(/has been defeated/i)) {
				_round.kills++;
			} else if (c.match(/bleeding wound hits/i)) {
				_round.dDealt[2] += o;
			} else if (c.match(/(you hit)|(you crit)/i)) {
				_round.aAttempts++;
				a++;
				_round.aHits[c.match(/you crit/i) ? 1 : 0]++;
				_round.dDealt[c.match(/you crit/i) ? 1 : 0] += o;
			} else if (c.match(/your offhand (hits|crits)/i)) {
				_round.aOffhands[c.match(/offhand crit/i) ? 2 : 0]++;
				_round.aOffhands[c.match(/offhand crit/i) ? 3 : 1] += o;
			} else if (c.match(/you counter/i)) {
				_round.aCounters[0]++;
				_round.aCounters[1] += o;
				ac++;
				_round.dDealt[0] += o;
			} else if (c.match(/hits|blasts|explodes/i) && !c.match(/hits you /i)) {
				if (c.match(/spreading poison hits /i) && !c.match(/(hits you |crits you )/i)) {
					_round.effectPoison[1] += o;
					_round.effectPoison[0]++;
				} else {
					if (c.match(/(searing skin|freezing limbs|deep burns|turbulent air|burning soul|breached defence|blunted attack) (hits|blasts|explodes)/i) && !c.match(/(hits you |crits you )/i)) {
						_round.elemEffects[1]++;
						_round.elemEffects[2] += o;
					} else if (c.match(/(fireball|inferno|flare|meteor|nova|flames of loki|icestrike|snowstorm|freeze|blizzard|cryostasis|fimbulvetr|lighting|thunderstorm|ball lighting|chain lighting|shockblast|wrath of thor|windblast|cyclone|gale|hurricane|downburst|storms of njord) (hits|blasts|explodes)/i) && !c.match(/(hits you |crits you )/i)) {
						_round.dDealtSp[c.match(/blasts/i) ? 1 : 0] += o;
						_round.sHits[c.match(/blasts/i) ? 1 : 0]++;
						_round.elemSpells[1]++;
						_round.elemSpells[2] += o;
					} else if (c.match(/(condemn|purge|smite|banish) (hits|blasts|explodes)/i) && !c.match(/(hits you |crits you )/i)) {
						_round.dDealtSp[c.match(/blasts/i) ? 1 : 0] += o;
						_round.sHits[c.match(/blasts/i) ? 1 : 0]++;
						_round.divineSpells[1]++;
						_round.divineSpells[2] += o
					} else if (c.match(/(soul reaper|soul harvest|soul fire|soul burst|corruption|pestilence|disintegrate|ragnarok) (hits|blasts|explodes)/i) && !c.match(/(hits you |crits you )/i)) {
						_round.dDealtSp[c.match(/blasts/i) ? 1 : 0] += o;
						_round.sHits[c.match(/blasts/i) ? 1 : 0]++;
						_round.forbidSpells[1]++;
						_round.forbidSpells[2] += o
					}
				}
			} else if (c.match(/(hits you )|(crits you )/i)) {
				_round.mAttempts++;
				_round.mHits[c.match(/crits/i) ? 1 : 0]++;
				_round.dTaken[c.match(/crits/i) ? 1 : 0] += o;
				if (sel.match(/ uses | casts /i)) {
					_round.pskills[1]++;
					_round.pskills[2] += o;
					if (sel.match(/ casts /i)) {
						_round.pskills[5]++;
						_round.pskills[6] += o;
					} else {
						_round.pskills[3]++;
						_round.pskills[4] += o;
					}
					if (_settings.isRememberSkillsTypes) {
						var j = HVStat.monsters.length;
						while (j--) {
							reResult = /([^\.]{1,30}) (?:uses|casts) /.exec(sel);
							if (reResult && reResult.length >= 2 && reResult[1] === HVStat.monsters[j].name && reResult[1].indexOf("Unnamed ") !== 0) {
								HVStat.monsters[j].fetchSkillLog(sel, c, HVStat.transaction);
								break;
							}
						}
					}
				}
			} else if (c.match(/you (dodge|evade|block|parry|resist)|(misses.*?against you)/i)) {
				_round.mAttempts++;
				if (c.match(/dodge|(misses.*?against you)/)) {
					_round.pDodges++;
				} else if (c.match(/evade/)) {
					_round.pEvades++;
				} else if (c.match(/block/)) {
					_round.pBlocks++;
				} else if (c.match(/parry/)) {
					_round.pParries++;
				} else if (c.match(/resist/)) {
					_round.pResists++;
				}
			} else if (c.match(/casts?/)) {
				if (c.match(/casts/)) {
					_round.mAttempts++;
					_round.mSpells++;
				} else if (c.match(/you cast/i)) {
					if (c.match(/(poison|slow|weaken|sleep|confuse|imperil|blind|silence|nerf|x.nerf|magnet|lifestream)/i)) {
						_round.depSpells[0]++;
						_round.sAttempts++
					} else if (c.match(/(condemn|purge|smite|banish)/i)) {
						_round.divineSpells[0]++;
						_round.sAttempts++;
						if (selall.match(/Your spell misses its mark/i)) {
							_round.divineSpells[3] += selall.match(/Your spell misses its mark/ig).length;
						}
					} else if (c.match(/(soul reaper|soul harvest|soul fire|soul burst|corruption|pestilence|disintegrate|ragnarok)/i)) {
						_round.forbidSpells[0]++;
						_round.sAttempts++
						if (selall.match(/Your spell misses its mark/i)) {
							_round.forbidSpells[3] += selall.match(/Your spell misses its mark/ig).length;
						}
					} else if (c.match(/(fireball|inferno|flare|meteor|nova|flames of loki|icestrike|snowstorm|freeze|blizzard|cryostasis|fimbulvetr|lighting|thunderstorm|ball lighting|chain lighting|shockblast|wrath of thor|windblast|cyclone|gale|hurricane|downburst|storms of njord)/i)) {
						_round.elemSpells[0]++;
						_round.sAttempts++;
						if (selall.match(/Your spell misses its mark/i)) {
							_round.elemSpells[3] += selall.match(/Your spell misses its mark/ig).length;
						}
					} else if (c.match(/(spark of life|absorb|protection|shadow veil|haste|flame spikes|frost spikes|lightning spikes|storm spikes|arcane focus|heartseeker)/i)) {
						_round.supportSpells++
						if (c.match(/absorb/i)) {
							_round.absArry[0]++
						}
					} else if (c.match(/(cure|regen)/i)) {
						_round.curativeSpells++
						if (c.match(/cure/i)) {
							_round.cureTotals[c.match(/cure\./i) ? 0 : c.match(/cure ii\./i) ? 1 : 2] += d;
							_round.cureCounts[c.match(/cure\./i) ? 0 : c.match(/cure ii\./i) ? 1 : 2]++
						}
					}
				}
			} else if (c.match(/The spell is absorbed. You gain (\d+) Magic Points/)) {
				_round.absArry[1]++;
				_round.absArry[2] += parseInt(RegExp.$1);
			} else if (c.match(/You are healed for (\d+) Health Points/)) {
				d = parseInt(RegExp.$1);
			} else if (c.match(/Your attack misses its mark/)) {
				_round.aAttempts++;
			} else if (c.match(/Your spell misses its mark/)) {
				_round.sResists++;
			} else if (c.match(/gains? the effect/i)) {
				if (c.match(/gain the effect Overwhelming Strikes/i)) {
					_round.overStrikes++;
				} else if (c.match(/gains the effect Coalesced Mana/i)) {
					_round.coalesce++;
				} else if (c.match(/gains the effect Ether Theft/i)) {
					_round.eTheft++;
				} else if (c.match(/gain the effect Channeling/i)) {
					_round.channel++;
				} else {
					if (c.match(/gains the effect (searing skin|freezing limbs|deep burns|turbulent air|breached defence|blunted attack|burning soul|rippened soul)/i)) {
						_round.elemEffects[0]++;
					} else if (c.match(/gains the effect (spreading poison|slowed|weakened|sleep|confused|imperiled|blinded|silenced|nerfed|magically snared|lifestream)/i)) {
						_round.depSpells[1]++;
					} else if (c.match(/gains the effect stunned/i)) {
						_round.weaponprocs[0]++;
						if (sel.match(/You counter/i)) {
							_round.weaponprocs[0]--;
							_round.weaponprocs[7]++
						}
					} else if (c.match(/gains the effect penetrated armor/i)) {
						_round.weaponprocs[1]++;
					} else if (c.match(/gains the effect bleeding wound/i)) {
						_round.weaponprocs[2]++;
					} else if (c.match(/gains the effect ether theft/i)) {
						_round.weaponprocs[3]++;
					}
				}
			} else if (c.match(/uses?/i)) {
				if (c.match(/uses/i)) {
					_round.pskills[0]++;
				} else if (c.match(/use Mystic Gem/i)) {
					_round.channel--;
				}
			} else if (c.match(/you drain/i)) {
				if (c.match(/you drain \d+(\.)?\d? hp from/i)) {
					_round.weaponprocs[4]++;
				} else if (c.match(/you drain \d+(\.)?\d? mp from/i)) {
					_round.weaponprocs[5]++;
				} else if (c.match(/you drain \d+(\.)?\d? sp from/i)) {
					_round.weaponprocs[6]++;
				}
			}
		}
		var l = /\[.*?\]/i;
		var n;
		var t = 1;
		if (c.match(/dropped.*?color:.*?red.*?\[.*?\]/ig)) {
			_equips++;
			var q = c.match(l)[0];
			_lastEquipName = q;
			if (_settings.isTrackItems) {
				_drops.eqDrop++;
				_drops.eqArray.push(q);
				_drops.eqDropbyBT[_round.battleType]++;
			}
		} else if (c.match(/dropped.*?color:.*?blue.*?\[.*?\]/ig)) {
			_artifacts++;
			itemToAdd = c.match(l)[0];
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
		} else if (_settings.isTrackItems && (c.match(/dropped.*?color:.*?green.*?\[.*?\]/ig) || c.match(/dropped.*?token/ig))) {
			itemToAdd = c.match(l)[0];
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
		} else if (_settings.isTrackItems && c.match(/dropped.*?color:.*?\#461B7E.*?\[.*?\]/ig)) {
			_drops.dropChances--;
			_drops.dropChancesbyBT[_round.battleType]--;
		}
		if (c.match(/(clear bonus).*?color:.*?red.*?\[.*?\]/ig)) {
			_equips++;
			var s = c.match(l)[0];
			_lastEquipName = s;
			if (_settings.isTrackRewards) {
				_rewards.eqRwrd++;
				_rewards.eqRwrdArry.push(s);
			}
		} else if (c.match(/(clear bonus).*?color:.*?blue.*?\[.*?\]/ig)) {
			_artifacts++;
			itemToAdd = c.match(l)[0];
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
		} else if (_settings.isTrackRewards && (c.match(/(clear bonus).*?color:.*?green.*?\[.*?\]/ig) || c.match(/(clear bonus).*?token/ig))) {
			_rewards.itemsRwrd++;
			itemToAdd = c.match(l)[0];
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
		} else if (_settings.isTrackRewards && (c.match(/(token bonus).*?\[.*?\]/ig))) {
			if (c.match(/token of blood/ig)) {
				_tokenDrops[0]++;
			} else if (c.match(/token of healing/ig)) {
				_tokenDrops[1]++;
			} else if (c.match(/chaos token/ig)) {
				_tokenDrops[2]++;
			}
		}
		if (c.match(/reached equipment inventory limit/i)) {
			localStorage.setItem(HV_EQUIP, JSON.stringify("true"));
		}
	});
	if (a > 1) {
		_round.aDomino[0]++;
		_round.aDomino[1] += a;
		_round.aDomino[a]++
	}
	if (ac > 1) {
		_round.aCounters[ac]++;
	}
	if (e > _round.lastTurn) {
		_round.lastTurn = e;
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
	$("#togpane_log td:last-child").each(function () {
		var f = $(this);
		var e = f.html();
		if (e.match(/you gain.*?credit/i)) {
			c = parseInt(e.split(" ")[2]);
			return true;
		} else if (e.match(/you gain.*?exp/i)) {
			d = parseFloat(e.split(" ")[2]);
			return true;
		}
		if (d > 0 && c > 0) return false;
	});
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
		_stats.sInterfs += _round.sInterfs;
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
		_stats.armorProfGain[3] += _round.armorProfGain[3];
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
	var f = _round.sHits[0] + _round.sHits[1] + _round.depSpells[1] + _round.sResists;
	var e = _round.sHits[0] + _round.sHits[1] + _round.depSpells[1];
	var d = _round.aHits[0] + _round.aHits[1];
	var c = _round.sHits[0] + _round.sHits[1];
	var b = _round.mHits[0] + _round.mHits[1];
	var ab = _round.aOffhands[0] + _round.aOffhands[2];
	var a = "<b>Accuracy</b>: " + d + "/" + _round.aAttempts + " (" + (_round.aAttempts === 0 ? 0 : (d / _round.aAttempts * 100).toFixed(2))
		+ "%), <b>Crits</b>: "+ _round.aHits[1] + "/" + d + " (" + (d === 0 ? 0 : (_round.aHits[1] / d * 100).toFixed(2))
		+ "%), <b>Offhand</b>: " + ab + "/" + d + " (" + (d === 0 ? 0 : (ab / d * 100).toFixed(2))
		+ "%), <b>Domino</b>: " + _round.aDomino[0] + "/" + d + " (" + (d === 0 ? 0 : (_round.aDomino[0] / d * 100).toFixed(2))
		+ "%), <b>OverStrikes</b>: " + _round.overStrikes + "/" + d + " (" + (d === 0 ? 0 : (_round.overStrikes / d * 100).toFixed(2))
		+ "%), <b>Coalesce</b>: " + _round.coalesce + "/" + e + " (" + (e === 0 ? 0 : (_round.coalesce / e * 100).toFixed(2))
		+ "%), <b>Interference</b>: " + _round.sInterfs + "/" + _round.sAttempts + " (" + (_round.sAttempts === 0 ? 0 : (_round.sInterfs / _round.sAttempts * 100).toFixed(2))
		+ "%), <b>M. Accuracy</b>: " + e + "/" + f + " (" + (f === 0 ? 0 : (e / f * 100).toFixed(2))
		+ "%), <b>Spell Crits</b>: " + _round.sHits[1] + "/" + c + " (" + (c === 0 ? 0 : (_round.sHits[1] / c * 100).toFixed(2))
		+ "%), <b>Avg hit dmg</b>: " + (_round.aHits[0] === 0 ? 0 : (_round.dDealt[0] / _round.aHits[0]).toFixed(2)) + "|" + (_round.sHits[0] === 0 ? 0 : (_round.dDealtSp[0] / _round.sHits[0]).toFixed(2))
		+ ", <b>Avg crit dmg</b>: " + (_round.aHits[1] === 0 ? 0 : (_round.dDealt[1] / _round.aHits[1]).toFixed(2)) + "|" + (_round.sHits[1] === 0 ? 0 : (_round.dDealtSp[1] / _round.sHits[1]).toFixed(2))
		+ ", <b>Avg dmg</b>: " + (d === 0 ? 0 : ((_round.dDealt[0] + _round.dDealt[1]) / d).toFixed(2)) + "|" + (c === 0 ? 0 : ((_round.dDealtSp[0] + _round.dDealtSp[1]) / c).toFixed(2))
		+ "<hr style='height:1px;border:0;background-color:#333333;color:#333333' />"
		+ "<b>Hits taken</b>: " + b + "/" + _round.mAttempts + " (" + (_round.mAttempts === 0 ? 0 : (b / _round.mAttempts * 100).toFixed(2))
		+ "%), <b>Missed</b>: " + _round.pDodges + "/" + _round.mAttempts + " (" + (_round.mAttempts === 0 ? 0 : (_round.pDodges / _round.mAttempts * 100).toFixed(2))
		+ "%), <b>Evaded</b>: " + _round.pEvades + "/" + _round.mAttempts + " (" + (_round.mAttempts === 0 ? 0 : (_round.pEvades / _round.mAttempts * 100).toFixed(2))
		+ "%), <b>Blocked</b>: " + _round.pBlocks + "/" + _round.mAttempts + " (" + (_round.mAttempts === 0 ? 0 : (_round.pBlocks / _round.mAttempts * 100).toFixed(2))
		+ "%), <b>Parried</b>: " + _round.pParries + "/" + _round.mAttempts + " (" + (_round.mAttempts === 0 ? 0 : (_round.pParries / _round.mAttempts * 100).toFixed(2))
		+ "%), <b>Resisted</b>: " + _round.pResists + "/" + _round.mSpells + " (" + (_round.mSpells === 0 ? 0 : (_round.pResists / _round.mSpells * 100).toFixed(2))
		+ "%), <b>Crits taken</b>: " + _round.mHits[1] + "/" + b + " (" + (b === 0 ? 0 : (_round.mHits[1] / b * 100).toFixed(2))
		+ "%), <b>Total taken</b>: " + (_round.dTaken[0] + _round.dTaken[1])
		+ ", <b>Avg taken</b>: " + (b === 0 ? 0 : ((_round.dTaken[0] + _round.dTaken[1]) / b).toFixed(2));
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
				+ "<b>Cloth Gain</b>: " + _round.armorProfGain[1].toFixed(2)
				+ ", <b>Light Armor Gain</b>: " + _round.armorProfGain[2].toFixed(2)
				+ ", <b>Heavy Armor Gain</b>: " + _round.armorProfGain[3].toFixed(2);
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
	var m = _settings.isColumnInventory ? a : w;
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
	i += _settings.warnMode[4] ? '<span style="color:green"><b>CF</b></span>' : I;
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
		if (HVStat.isChrome) {
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
			+ '<tr><td colspan="2" style="padding-left:10px">Crysfest: ' + _overview.roundArray[4] + ' (' + (_overview.roundArray[4] / _overview.totalRounds * 100).toFixed(2) + '% of total; ' + (M === 0 ? 0 : (_overview.roundArray[4] / M).toFixed()) + ' rounds per day)</td></tr>'
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
			+ '<td style="padding-left:10px;width:33%">Column Inventory: ' + m + '</td>'
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
		if (HVStat.isChrome) dst1 = dst.toLocaleDateString() + " " + dst.toLocaleTimeString();
		c += '<tr><td colspan="2"><b>Rounds tracked:</b> ' + _stats.rounds + ' <b>Since: </b>' + dst1 + '</td></tr><tr><td colspan="2"><b>Monsters killed:</b> ' + _stats.kills + '</td></tr><tr><td colspan="2"><b>Offensive Statistics:</b></td></tr><tr><td style="padding-left:10px"><b>Physical:</b></td><td style="padding-left:10px"><b>Magical:</b></td></tr><tr><td style="padding-left:20px">Accuracy: ' + (_stats.aAttempts === 0 ? 0 : (f / _stats.aAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Accuracy: ' + (h === 0 ? 0 : (g / h * 100).toFixed(2)) + '%</td></tr><tr><td style="padding-left:20px">Crit chance: ' + (f === 0 ? 0 : (_stats.aHits[1] / f * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Crit chance: ' + (e === 0 ? 0 : (_stats.sHits[1] / e * 100).toFixed(2)) + '%</td></tr><tr><td style="padding-left:20px">Overwhelming Strikes chance: ' + (f === 0 ? 0 : (_stats.overStrikes / f * 100).toFixed(2)) + '%</td></tr><tr><td style="padding-left:20px">Counter chance on block/parry: ' + (bp === 0 ? 0 : (_stats.aCounters[0]*100/bp).toFixed(2)) + '%</td></tr><tr><td style="padding-left:30px">Number of counters in turn:</td></tr>';
		c +=  '<tr><td colspan="2" style="padding-left:30px">One - ' + (c1 === 0 ? 0 : (c1*100/call).toFixed(2)) + '% | Two - ' + (_stats.aCounters[2] === 0 ? 0 : (_stats.aCounters[2]*100/call).toFixed(2)) + '% | Three - ' + (_stats.aCounters[3] === 0 ? 0 :(_stats.aCounters[3]*100/call).toFixed(2));
		c += '%</td></tr>';
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
		c += '<tr><td colspan="2"><b>Defensive Statistics:</b></td></tr><tr><td style="padding-left:10px">Overall chance of getting hit: ' + (_stats.mAttempts === 0 ? 0 : (d / _stats.mAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:10px">Average HP restored by Cure:</td></tr><tr><td style="padding-left:20px">Miss chance: ' + (_stats.mAttempts === 0 ? 0 : (_stats.pDodges / _stats.mAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Cure: ' + (_stats.cureCounts[0] === 0 ? 0 : (_stats.cureTotals[0] / _stats.cureCounts[0]).toFixed(2)) + ' HP/cast</td></tr><tr><td style="padding-left:20px">Evade chance: ' + (_stats.mAttempts === 0 ? 0 : (_stats.pEvades / _stats.mAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Cure II: ' + (_stats.cureCounts[1] === 0 ? 0 : (_stats.cureTotals[1] / _stats.cureCounts[1]).toFixed(2)) + ' HP/cast</td></tr><tr><td style="padding-left:20px">Block chance: ' + (_stats.mAttempts === 0 ? 0 : (_stats.pBlocks / _stats.mAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Cure III: ' + (_stats.cureCounts[2] === 0 ? 0 : (_stats.cureTotals[2] / _stats.cureCounts[2]).toFixed(2)) + ' HP/cast</td></tr><tr><td style="padding-left:20px">Parry chance: ' + (_stats.mAttempts === 0 ? 0 : (_stats.pParries / _stats.mAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:10px">Absorb casting efficiency: ' + (_stats.absArry[0] === 0 ? 0 : (_stats.absArry[1] / _stats.absArry[0] * 100).toFixed(2)) + '%</td></tr><tr><td style="padding-left:20px">Resist chance: ' + (_stats.mSpells === 0 ? 0 : (_stats.pResists / _stats.mSpells * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Average MP drained by Absorb: ' + (_stats.absArry[1] === 0 ? 0 : (_stats.absArry[2] / _stats.absArry[1]).toFixed(2)) + ' MP/trigger</td></tr><tr><td style="padding-left:10px">Monster crit chance: ' + (_stats.mAttempts === 0 ? 0 : (_stats.mHits[1] / _stats.mAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Average MP returns of Absorb: ' + (_stats.absArry[0] === 0 ? 0 : (_stats.absArry[2] / _stats.absArry[0]).toFixed(2)) + ' MP/cast</td></tr><tr><td style="padding-left:20px">Percent of monster hits that are crits: ' + (d === 0 ? 0 : (_stats.mHits[1] / d * 100).toFixed(2)) + '%</td></tr><tr><td style="padding-left:10px">Average damage taken per hit: ' + (_stats.mHits[0] === 0 ? 0 : (_stats.dTaken[0] / _stats.mHits[0]).toFixed(2)) + '</td></tr><tr><td style="padding-left:10px">Average damage taken per crit: ' + (_stats.mHits[1] === 0 ? 0 : (_stats.dTaken[1] / _stats.mHits[1]).toFixed(2)) + '</td></tr><tr><td style="padding-left:10px">Average damage taken: ' + (d === 0 ? 0 : ((_stats.dTaken[0] + _stats.dTaken[1]) / d).toFixed(2)) + '</td></tr><tr><td style="padding-left:10px">Average total damage taken per round: ' + (_stats.rounds === 0 ? 0 : ((_stats.dTaken[0] + _stats.dTaken[1]) / _stats.rounds).toFixed(2)) + '</td></tr><tr><td align="left" colspan="7"><form>SelectBackup:<select id="BackupNumber"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select>' + '<input type="button" class="_backupFunc" value="Save Backup" />' + '<input type="button" class="_backupFunc" value="Load Backup"/>' + '<input type="button" class="_backupFunc" value="AddTo Backup"/>' + '<input type="button" class="_backupFunc" value="AddFrom Backup"/>' + '<input type="button" class="_backupFunc" value="Remove Backup"/></td></tr></form>' + '<tr><td><input type="button" class="_checkBackups" value="Check Existing Backups"/></td></tr>' + '</td></tr><tr><td align="right" colspan="2"><input type="button" class="_resetStats" value="Reset Stats" /></td></tr>'
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
		e += '<tr><td colspan="4"><b>Total Item Drops:</b> ' + b + " from " + _drops.dropChances + " monsters (" + (b / a).toFixed(2) + '% total drop chance)</td></tr><tr><td colspan="4" style="padding-left:20px">Items: ' + _drops.itemDrop + " (" + (d === 0 ? 0 : (_drops.itemDrop / d).toFixed(2)) + "% of drops, " + (_drops.itemDrop / a).toFixed(2) + '% drop chance)</td></tr><tr><td colspan="4" style="padding-left:20px">Equipment: ' + _drops.eqDrop + " (" + (d === 0 ? 0 : (_drops.eqDrop / d).toFixed(2)) + "% of drops, " + (_drops.eqDrop / a).toFixed(2) + '% drop chance)</td></tr><tr><td colspan="4" style="padding-left:20px">Artifacts: ' + _drops.artDrop + " (" + (d === 0 ? 0 : (_drops.artDrop / d).toFixed(2)) + "% of drops, " + (_drops.artDrop / a).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:10px"><b>In hourly encounters:</b> ' + b0 + " from " + _drops.dropChancesbyBT[0] + " monsters (" + (b0*100 / _drops.dropChancesbyBT[0]).toFixed(2) + '% total drop chance)</td></tr><tr><td colspan="4" style="padding-left:20px">Items: ' + _drops.itemDropbyBT[0] + " (" + (b0 === 0 ? 0 : (_drops.itemDropbyBT[0]*100 / b0).toFixed(2)) + "% of drops, " + (_drops.itemDropbyBT[0]*100/_drops.dropChancesbyBT[0]).toFixed(2) + '% drop chance)</td></tr><tr><td colspan="4" style="padding-left:30px">Crystals: ' + _drops.crysDropbyBT[0] + " (" + (b0 === 0 ? 0 : (_drops.crysDropbyBT[0]*100 / b0).toFixed(2)) + "% of drops, " + (_drops.crysDropbyBT[0]*100/_drops.dropChancesbyBT[0]).toFixed(2) + '% drop chance)</td></tr><tr><td colspan="4" style="padding-left:20px">Equipment: ' + _drops.eqDropbyBT[0] + " (" + (b0 === 0 ? 0 : (_drops.eqDropbyBT[0]*100 / b0).toFixed(2)) + "% of drops, " + (_drops.eqDropbyBT[0]*100/_drops.dropChancesbyBT[0]).toFixed(2) + '% drop chance)</td></tr><tr><td colspan="4" style="padding-left:20px">Artifacts: ' + _drops.artDropbyBT[0] + " (" + (b0 === 0 ? 0 : (_drops.artDropbyBT[0]*100 / b0).toFixed(2)) + "% of drops, " + (_drops.artDropbyBT[0]*100/_drops.dropChancesbyBT[0]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:10px"><b>In Arenas:</b> ' + b1 + " from " + _drops.dropChancesbyBT[1] + " monsters (" + (b1*100 / _drops.dropChancesbyBT[1]).toFixed(2) + '% total drop chance)</td></tr><tr><td colspan="4" style="padding-left:20px">Items: ' + _drops.itemDropbyBT[1] + " (" + (b1 === 0 ? 0 : (_drops.itemDropbyBT[1]*100 / b1).toFixed(2)) + "% of drops, " + (_drops.itemDropbyBT[1]*100/_drops.dropChancesbyBT[1]).toFixed(2) + '% drop chance)</td></tr><tr><td colspan="4" style="padding-left:30px">Crystals: ' + _drops.crysDropbyBT[1] + " (" + (b1 === 0 ? 0 : (_drops.crysDropbyBT[1]*100 / b1).toFixed(2)) + "% of drops, " + (_drops.crysDropbyBT[1]*100/_drops.dropChancesbyBT[1]).toFixed(2) + '% drop chance)</td></tr><tr><td colspan="4" style="padding-left:20px">Equipment: ' + _drops.eqDropbyBT[1] + " (" + (b1 === 0 ? 0 : (_drops.eqDropbyBT[1]*100 / b1).toFixed(2)) + "% of drops, " + (_drops.eqDropbyBT[1]*100/_drops.dropChancesbyBT[1]).toFixed(2) + '% drop chance)</td></tr><tr><td colspan="4" style="padding-left:20px">Artifacts: ' + _drops.artDropbyBT[1] + " (" + (b1 === 0 ? 0 : (_drops.artDropbyBT[1]*100 / b1).toFixed(2)) + "% of drops, " + (_drops.artDropbyBT[1]*100/_drops.dropChancesbyBT[1]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:10px"><b>In GrindFests:</b> ' + b2 + " from " + _drops.dropChancesbyBT[2] + " monsters (" + (b2*100 / _drops.dropChancesbyBT[2]).toFixed(2) + '% total drop chance)</td></tr><tr><td colspan="4" style="padding-left:20px">Items: ' + _drops.itemDropbyBT[2] + " (" + (b2 === 0 ? 0 : (_drops.itemDropbyBT[2]*100 / b2).toFixed(2)) + "% of drops, " + (_drops.itemDropbyBT[2]*100/_drops.dropChancesbyBT[2]).toFixed(2) + '% drop chance)</td></tr><tr><td colspan="4" style="padding-left:30px">Crystals: ' + _drops.crysDropbyBT[2] + " (" + (b2 === 0 ? 0 : (_drops.crysDropbyBT[2]*100 / b2).toFixed(2)) + "% of drops, " + (_drops.crysDropbyBT[2]*100/_drops.dropChancesbyBT[2]).toFixed(2) + '% drop chance)</td></tr><tr><td colspan="4" style="padding-left:20px">Equipment: ' + _drops.eqDropbyBT[2] + " (" + (b2 === 0 ? 0 : (_drops.eqDropbyBT[2]*100 / b2).toFixed(2)) + "% of drops, " + (_drops.eqDropbyBT[2]*100/_drops.dropChancesbyBT[2]).toFixed(2) + '% drop chance)</td></tr><tr><td colspan="4" style="padding-left:20px">Artifacts: ' + _drops.artDropbyBT[2] + " (" + (b2 === 0 ? 0 : (_drops.artDropbyBT[2]*100 / b2).toFixed(2)) + "% of drops, " + (_drops.artDropbyBT[2]*100/_drops.dropChancesbyBT[2]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:10px"><b>In CrysFests:</b> ' + b4 + " from " + _drops.dropChancesbyBT[4] + " monsters (" + (b4*100 / _drops.dropChancesbyBT[4]).toFixed(2) + '% total drop chance)</td></tr><tr><td colspan="4" style="padding-left:20px">Items: ' + _drops.itemDropbyBT[4] + " (" + (b4 === 0 ? 0 : (_drops.itemDropbyBT[4]*100 / b4).toFixed(2)) + "% of drops, " + (_drops.itemDropbyBT[4]*100/_drops.dropChancesbyBT[4]).toFixed(2) + '% drop chance)</td></tr><tr><td colspan="4" style="padding-left:30px">Crystals: ' + _drops.crysDropbyBT[4] + " (" + (b4 === 0 ? 0 : (_drops.crysDropbyBT[4]*100 / b4).toFixed(2)) + "% of drops, " + (_drops.crysDropbyBT[4]*100/_drops.dropChancesbyBT[4]).toFixed(2) + '% drop chance)</td></tr><tr><td colspan="4" style="padding-left:20px">Artifacts: ' + _drops.artDropbyBT[4] + " (" + (b4 === 0 ? 0 : (_drops.artDropbyBT[4]*100 / b4).toFixed(2)) + "% of drops, " + (_drops.artDropbyBT[4]*100/_drops.dropChancesbyBT[4]).toFixed(2) + '% drop chance)</td></tr>'
			+ '<tr><td colspan="4" style="padding-left:10px"><b>In Item Worlds:</b> ' + b3 + " from " + _drops.dropChancesbyBT[3] + " monsters (" + (b3*100 / _drops.dropChancesbyBT[3]).toFixed(2) + '% total drop chance)</td></tr><tr><td colspan="4" style="padding-left:20px">Items: ' + _drops.itemDropbyBT[3] + " (" + (b3 === 0 ? 0 : (_drops.itemDropbyBT[3]*100 / b3).toFixed(2)) + "% of drops, " + (_drops.itemDropbyBT[3]*100/_drops.dropChancesbyBT[3]).toFixed(2) + '% drop chance)</td></tr><tr><td colspan="4" style="padding-left:30px">Crystals: ' + _drops.crysDropbyBT[3] + " (" + (b3 === 0 ? 0 : (_drops.crysDropbyBT[3]*100 / b3).toFixed(2)) + "% of drops, " + (_drops.crysDropbyBT[3]*100/_drops.dropChancesbyBT[3]).toFixed(2) + '% drop chance)</td></tr><tr><td colspan="4" style="padding-left:20px">Equipment: ' + _drops.eqDropbyBT[3] + " (" + (b3 === 0 ? 0 : (_drops.eqDropbyBT[3]*100 / b3).toFixed(2)) + "% of drops, " + (_drops.eqDropbyBT[3]*100/_drops.dropChancesbyBT[3]).toFixed(2) + '% drop chance)</td></tr><tr><td colspan="4" style="padding-left:20px">Artifacts: ' + _drops.artDropbyBT[3] + " (" + (b3 === 0 ? 0 : (_drops.artDropbyBT[3]*100 / b3).toFixed(2)) + "% of drops, " + (_drops.artDropbyBT[3]*100/_drops.dropChancesbyBT[3]).toFixed(2) + '% drop chance)</td></tr>'
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
		e += '<tr><td style="width:50%"><b>Total Rewards:</b> ' + _rewards.totalRwrds + '</td><td style="width:50%"><b>Token Bonus:</b> ' + a + " (" + (a / c).toFixed(2) + '% chance)</td></tr><tr><td style="padding-left:10px;width:50%">Artifact: ' + _rewards.artRwrd + " (" + (c === 0 ? 0 : (_rewards.artRwrd / c).toFixed(2)) + '%)</td><td style="padding-left:10px;width:50%">[Token of Blood]: ' + _rewards.tokenDrops[0] + " (" + (b === 0 ? 0 : (_rewards.tokenDrops[0] / b).toFixed(2)) + '%)</td></tr><tr><td style="padding-left:10px;width:50%">Equipment: ' + _rewards.eqRwrd + " (" + (c === 0 ? 0 : (_rewards.eqRwrd / c).toFixed(2)) + '%)</td><td style="padding-left:10px;width:50%">[Token of Healing]: ' + _rewards.tokenDrops[1] + " (" + (b === 0 ? 0 : (_rewards.tokenDrops[1] / b).toFixed(2)) + '%)</td></tr><tr><td style="padding-left:10px;width:50%">Item: ' + _rewards.itemsRwrd + " (" + (c === 0 ? 0 : (_rewards.itemsRwrd / c).toFixed(2)) + '%)</td><td style="padding-left:10px;width:50%">[Chaos Token]: ' + _rewards.tokenDrops[2] + " (" + (b === 0 ? 0 : (_rewards.tokenDrops[2] / b).toFixed(2)) + '%)</td></tr><tr><td colspan="2"><b>Artifact:</b></td></tr>';
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
function getMonsterStatsHtml() {
	var oldDatabaseSize = localStorage.HVMonsterDatabase ? localStorage.HVMonsterDatabase.length : 0;
	var h = "";
	h += '<div>';
	h += '<h2>Administration</h2>';
	h += '<h3>Export</h3>';
	h += '<p>Monster scan results and monster skill data can be exported as a TSV (tab-seperated-values) format text file. You can import the data using the exported file.</p>';
	h += '<div>';
	h += '<table><tr>';
	h += '<td><span style="font-weight: bold;">Monster Scan Results</span></td>';
	h += '<td><input type="button" id="exportMonsterScanResults" value="Export" />';
	h += '<a id="downloadLinkMonsterScanResults" style="visibility:hidden;" href="#">Download</a></td>';
	h += '</tr><tr>';
	h += '<td><span style="font-weight: bold;">Monster Skill Data</span></td>';
	h += '<td><input type="button" id="exportMonsterSkills" value="Export" />';
	h += '<a id="downloadLinkMonsterSkills" style="visibility:hidden;" href="#">Download</a></td>';
	h += '</tr></table>';
	h += '</div>';
	h += '<h3>Import</h3>';
	h += '<p>The contents of TSV file will be merged into the database. The rows of TSV file which have older date will be skipped.</p>';
	h += '<div>';
	h += '<table><tr>';
	h += '<td><span style="font-weight: bold;">Monster Scan Results</span></td>';
	h += '<td><input type="file" id="importMonsterScanResults" /></td>';
	h += '</tr><tr>';
	h += '<td><span style="font-weight: bold;">Monster Skill Data</span></td>';
	h += '<td><input type="file" id="importMonsterSkills" /></td>';
	h += '</tr></table>';
	h += '</div>';
	h += '<h3>Delete Data</h3>';
	h += '<p>If you want to clean the database, delete data.</p>';
	h += '<table><tr>';
	h += '<td><span style="font-weight: bold;">Monster Scan Results</span></td>';
	h += '<td><input type="button" id="deleteMonsterScanResults" value="Delete" /></td>';
	h += '</tr><tr>';
	h += '<td><span style="font-weight: bold;">Monster Skill Data</span></td>';
	h += '<td><input type="button" id="deleteMonsterSkills" value="Delete" /></td>';
	h += '</tr></table>';
	h += '</div>';
	h += '<h3>Delete Database</h3>';
	h += '<div>';
	h += '<p>If you are facing a problem with database, and the problem can not be resolved, delete the database.</p>';
	h += '<p>In order to re-create database, reload the page. After that, you can import data previously exported.</p>';
	h += '<input type="button" id="deleteDatabase" value="Delete Database" />';
	h += '</div>';
	h += '<h2>Migration</h2>';
	h += '<h3>Migrate to New Database</h3>';
	h += '<div>';
	h += '<p>HVSTAT will now use the new IndexedDB database instead of the localStorage database. You can migrate your old database into the new database.</p>'
	h += '<p><span style="color: red;">If you have already scanned, note that this operation will overwrite existing data on the new database.</span></p>';
	h += '<input type="button" id="migrateDatabase" value="Migrate" />';
	h += '</div>';
	h += '<h3>Delete Old Database (localStorage)</h3>';
	h += '<div>';
	h += '<p>Currently your old database occupies <span id="oldDatabaseSize" style="font-weight: bold;">'
		+ (oldDatabaseSize / 1024 / 1024 * (HVStat.isChrome ? 2 : 1)).toFixed(2)
		+ '</span> MB on the localStorage. In order to free up space for other HV scripts, delete the old database after migration.</p>';
	h += '<p><span style="color: red;"></span></p>';
	h += '<input type="button" id="deleteOldDatabase" value="Delete" />';
	h += '</div>';
	return h;
}
function initUI() {
	var d = 4;
	var c = $(".stuffbox").width() - 60 - 4;
	var b = document.createElement("div");
	var a = "<div class='ui-state-default ui-corner-all' style='position:absolute; top:" + d + "px; left: " + c + "px; z-index:1074'><span style='margin:3px' class='ui-icon ui-icon-wrench' title='Launch HV STAT UI'/></div>";
	$(b).html(a);
	$(b).addClass("_mainButton");
	$("body").append(b);
	$(b).css("cursor", "pointer");
	$("._mainButton").click(initMainMenu)
}
function initMainMenu() {
	if (_isMenuInitComplete) return;
	var b = "[STAT] HentaiVerse Statistics, Tracking, and Analysis Tool v." + HVStat.VERSION + (HVStat.isChrome ? " (Chrome Edition)" : "");
	var c = document.createElement("div");
	$(c).addClass("_mainMenu").css("text-align", "left");
	var a = '<div id="tabs"><ul>'
		+ '<li><a href="#pane1"><span>Overview</span></a></li>'
		+ '<li><a href="#pane2"><span>Battle Stats</span></a></li>'
		+ '<li><a href="#pane3"><span>Item Drops</span></a></li>'
		+ '<li><a href="#pane4"><span>Arena Rewards</span></a></li>'
		+ '<li><a href="#pane5"><span>Shrine</span></a></li>'
		+ '<li><a href="#pane7"><span>Monster Stats</span></a></li>'
		+ '<li><a href="#pane6"><span>Settings</span></a></li>'
		+ '</ul><div id="pane1">Tab 1 Error</div><div id="pane2">Tab 2 Error</div>'
		+ '<div id="pane3">Tab 3 Error</div><div id="pane4">Tab 4 Error</div>'
		+ '<div id="pane5">Tab 5 Error</div><div id="pane7">Tab 7 Error</div><div id="pane6">Tab 6 Error</div></div>';
	$(c).html(a);
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
	$("#tabs").tabs();
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
	initSettingsPane();
	initMonsterStatsPane();
	$("._mainButton").unbind("click", initMainMenu);
	$("._mainButton").click(function () {
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
	$("#pane2").html(getReportStatsHtml());
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
				if (HVStat.isChrome) ds[i] = nd.toLocaleDateString() + " " + nd.toLocaleTimeString();
			}
			if (_backup[i].datestart !== 0) {
				nd.setTime( _backup[i].datestart);
				d[i] = nd.toLocaleString();
				if (HVStat.isChrome) d[i] = nd.toLocaleDateString() + " " + nd.toLocaleTimeString();
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
	$("#pane7").html(getMonsterStatsHtml());
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
			// TODO: update Monster Stats pane
		}
	});
}
function initSettingsPane() {
	var a = '<a style="color:red;padding-bottom:10px">All changes will take effect on next page load.</a>'
		+ '<table class="_settings" cellspacing="0" cellpadding="2" style="width:100%">'
		+ '<tr><td colspan="3"><b>General Options:</b></td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowSidebarProfs" /></td><td colspan="2">Show proficiencies in sidebar</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isColumnInventory" /></td><td colspan="2">Use column view for item inventory (<span style="color:red">Downloadable/Custom Local Fonts only!</span>)</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isChangePageTitle" /></td><td colspan="2">Change HentaiVerse page title: <input type="text" name="customPageTitle" size="40" /></td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isStartAlert" /></td><td colspan="2">Warnings berfore starting Challenges when HP is below <input type="text" name="StartAlertHP" size="1" maxLength="2" style="text-align:right" />%, MP is below <input type="text" name="StartAlertMP" size="1" maxLength="2" style="text-align:right" />%, SP is below <input type="text" name="StartAlertSP" size="1" maxLength="2" style="text-align:right" />% or difficulty is over <select id="StartAlertDifficulty"><option id=diff1 value=1>Easy</option><option id=diff2 value=2>Normal</option><option id=diff3 value=3>Hard</option><option id=diff4 value=4>Heroic</option><option id=diff5 value=5>Nightmare</option><option id=diff6 value=6>Hell</option><option id=diff7 value=7>Nintendo</option><option id=diff8 value=8>Battletoads</option></select> (<span style="color:red">Downloadable/Custom Local Fonts only!</span>)</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowScanButton" /></td><td colspan="2">Show scan button</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isEnableScanHotkey" /></td><td colspan="2">Enable Scan Hotkeys: numpad","/numpad delete</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowSkillButton" /></td><td colspan="2">Show skill button </td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isEnableSkillHotkey" /></td><td colspan="2">Enable Weapon Skill Hotkeys: "+" / "=" and numpad"+" (Works without skillbutton)</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowEquippedSet" /></td><td colspan="2">Show equipped set number at left panel (<span style="color:red">Downloadable/Custom Local Fonts only!</span>)</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isDisableForgeHotKeys" /></td><td colspan="2">Disable hot keys in the Forge (<span style="color:red">Strongry recommended if use item tags</span>)</td><td></td></tr>'
		+ '<tr><td colspan="3">Show item tags in:</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:15px"><input type="checkbox" name="isShowTags0" /></td><td colspan="3" style="padding-left:15px">Equipment page </td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:15px"><input type="checkbox" name="isShowTags1" /></td><td colspan="3" style="padding-left:15px">Bazaar shop page </td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:15px"><input type="checkbox" name="isShowTags2" /></td><td colspan="3" style="padding-left:15px">Item World </td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:15px"><input type="checkbox" name="isShowTags3" /></td><td colspan="3" style="padding-left:15px">Moogle Mail Attachments list </td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:15px"><input type="checkbox" name="isShowTags4" /></td><td colspan="3" style="padding-left:15px">Forge </td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:15px"><input type="checkbox" name="isShowTags5" /></td><td colspan="3" style="padding-left:15px">Inventory (<span style="color:red">Strongly suggested to turn it on and visit inventory once for a while</span>)</td></tr>'
		+ '<tr><td colspan="2"><b>Battle Enhancement:</b></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowHighlight" /></td><td colspan="2">Highlight battle log</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isAltHighlight" /></td><td colspan="2" style="padding-left:10px">Use alternate highlighting</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowDivider" /></td><td colspan="2">Show turn divider</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowSelfDuration" /></td><td colspan="2">Show self effect durations</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isSelfEffectsWarnColor" /></td><td colspan="2" style="padding-left:10px">Highlight duration badges - <span style="color:orange">Orange</span>: on <input type="text" name="SelfWarnOrangeRounds" size="1" maxLength="2" style="text-align:right" /> rounds; <span style="color:red">Red</span>: on <input type="text" name="SelfWarnRedRounds" size="1" maxLength="1" style="text-align:right" /> rounds</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowRoundReminder" /></td><td colspan="2">Final round reminder - minimum <input type="text" name="reminderMinRounds" size="1" maxLength="3" style="text-align:right" /> rounds; Alert <input type="text" name="reminderBeforeEnd" size="1" maxLength="1" style="text-align:right" /> rounds before end</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowEndStats" /></td><td colspan="2">Show Battle Summary</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isShowEndProfs" /></td><td colspan="2" style="padding-left:10px">Show Proficiency Gain Summary</td><tr><td align="center" style="width:5px;padding-left:40px"><input type="checkbox" name="isShowEndProfsMagic" /></td><td colspan="2" style="padding-left:30px">Show Magic Proficiency</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:40px"><input type="checkbox" name="isShowEndProfsArmor" /></td><td colspan="2" style="padding-left:30px">Show Armor Proficiency</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:40px"><input type="checkbox" name="isShowEndProfsWeapon" /></td><td colspan="2" style="padding-left:30px">Show Weapon Proficiency</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isAlertGem" /></td><td colspan="2">Alert on Powerup drops</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isAlertOverchargeFull" /></td><td colspan="2">Alert when Overcharge is full</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowMonsterNumber"></td><td colspan="2">Show Numbers instead of letters next to monsters.</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowRoundCounter"></td><td colspan="2">Show Round Counter.</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowPowerupBox"></td><td colspan="2">Show Powerup Box.</td></tr>'
		+ '<tr><td colspan="2" style="padding-left:10px">Display Monster Stats:</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="showMonsterHP" /></td><td colspan="2">Show monster HP (<span style="color:red">Estimated</span>)</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:40px"><input type="checkbox" name="showMonsterHPPercent" /></td><td colspan="2" style="padding-left:10px">Show monster HP in percentage</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="showMonsterMP" /></td><td  colspan="2">Show monster MP percentage</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="showMonsterSP" /></td><td colspan="2">Show monster SP percentage</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:40px"><input type="checkbox" name="showMonsterInfoFromDB" /></td><td colspan="2" style="padding-left:10px">Show monster info from database</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:60px"><input type="checkbox" name="showMonsterClassFromDB" /></td><td colspan="2" style="padding-left:20px">Show monster class from database</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:60px"><input type="checkbox" name="showMonsterPowerLevelFromDB" /></td><td colspan="2" style="padding-left:20px">Show monster power level from database</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:60px"><input type="checkbox" name="showMonsterAttackTypeFromDB" /></td><td colspan="2" style="padding-left:20px">Show monster attack type from database</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:60px"><input type="checkbox" name="showMonsterWeaknessesFromDB" /></td><td colspan="2" style="padding-left:20px">Show monster weaknesses from database</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:60px"><input type="checkbox" name="showMonsterResistancesFromDB" /></td><td colspan="2" style="padding-left:20px">Show monster resistances from database</td></tr>'
		+ '<tr><td colspan="3" style="padding-left:85px">Hide specific weaknesses/resitances: </td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="hideSpecificDamageType0" /></td><td colspan="2" style="padding-left:20px">Crushing</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="hideSpecificDamageType1" /></td><td colspan="2" style="padding-left:20px">Slashing</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="hideSpecificDamageType2" /></td><td colspan="2" style="padding-left:20px">Piercing</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="hideSpecificDamageType3" /></td><td colspan="2" style="padding-left:20px">Fire</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="hideSpecificDamageType4" /></td><td colspan="2" style="padding-left:20px">Cold</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="hideSpecificDamageType5" /></td><td colspan="2" style="padding-left:20px">Elec</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="hideSpecificDamageType6" /></td><td colspan="2" style="padding-left:20px">Wind</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="hideSpecificDamageType7" /></td><td colspan="2" style="padding-left:20px">Holy</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="hideSpecificDamageType8" /></td><td colspan="2" style="padding-left:20px">Dark</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="hideSpecificDamageType9" /></td><td colspan="2" style="padding-left:20px">Soul</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="hideSpecificDamageType10" /></td><td colspan="2" style="padding-left:20px">Void</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:60px"><input type="checkbox" name="ResizeMonsterInfo" /></td><td colspan="2" style="padding-left:20px">Resize Monster Info if longer than Info box</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:40px"><input type="checkbox" name="isShowStatsPopup" /></td><td colspan="2" style="padding-left:10px">Show monster statistics on mouseover - delay: <input type="text" name="monsterPopupDelay" size="3" maxLength="4" style="text-align:right" />ms</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:50px"><input type="checkbox" name="isMonsterPopupPlacement" /></td><td colspan="2" style="padding-left:20px">Alternative placement for mouseover popup</td></tr></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isShowMonsterDuration" /></td><td colspan="2">Show monster effect durations</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isMonstersEffectsWarnColor" /></td><td colspan="2" style="padding-left:10px">Highlight duration badges - <span style="color:orange">Orange</span>: below <input type="text" name="MonstersWarnOrangeRounds" size="1" maxLength="2" style="text-align:right" /> rounds; <span style="color:red">Red</span>: below <input type="text" name="MonstersWarnRedRounds" size="1" maxLength="1" style="text-align:right" /> rounds</td></tr>'
		+ '<tr><td colspan="2"><b>Tracking Functions:</b></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isTrackStats" /></td><td colspan="2">Track Battle Statistics</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isTrackItems" /></td><td colspan="2">Track Item Drops</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isTrackRewards" /></td><td colspan="2">Track Arena Rewards</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isTrackShrine" /></td><td colspan="2">Track Shrine (<span style="color:red">Downloadable/Custom Local Fonts only!</span>)</td></tr>'
		+ '<tr><td style="padding-left:20px" colspan="2"><input type="button" class="_resetAll" value="Reset" title="Reset all tracking data." /></td></tr>'
		+ '<tr><td colspan="3"><b>Warning System:</b></td><td></td></tr>'
		+ '<tr><td colspan="2" style="padding-left:10px">Effects Expiring Warnings:</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:5px"><input type="checkbox" name="isMainEffectsAlertSelf" /></td><td colspan="2">Alert when effects on yourself are expiring</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertSelf6" /></td><td style="padding-left:10px">Channeling</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertSelfRounds6" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold"/>rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertSelf0" /></td><td style="padding-left:10px">Protection</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertSelfRounds0" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertSelf1" /></td><td style="padding-left:10px">Hastened</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertSelfRounds1" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertSelf2" /></td><td style="padding-left:10px">Shadow Veil</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertSelfRounds2" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertSelf3" /></td><td style="padding-left:10px">Regen</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertSelfRounds3" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertSelf5" /></td><td style="padding-left:10px">Spark of Life</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertSelfRounds5" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertSelf7" /></td><td style="padding-left:10px">Arcane Focus</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertSelfRounds7" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertSelf8" /></td><td style="padding-left:10px">Heartseeker</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertSelfRounds8" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertSelf9" /></td><td style="padding-left:10px">Spirit Shield</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertSelfRounds9" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:5px"><input type="checkbox" name="isMainEffectsAlertMonsters" /></td><td colspan="2">Alert when effects on monsters are expiring</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertMonsters11" /></td><td style="padding-left:10px">Coalesced Mana</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertMonstersRounds11" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertMonsters0" /></td><td style="padding-left:10px">Spreading Poison</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertMonstersRounds0" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertMonsters1" /></td><td style="padding-left:10px">Slowed</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertMonstersRounds1" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertMonsters2" /></td><td style="padding-left:10px">Weakened</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertMonstersRounds2" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertMonsters3" /></td><td style="padding-left:10px">Asleep</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertMonstersRounds3" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertMonsters4" /></td><td style="padding-left:10px">Confused</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertMonstersRounds4" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertMonsters5" /></td><td style="padding-left:10px">Imperiled</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertMonstersRounds5" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertMonsters6" /></td><td style="padding-left:10px">Blinded</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertMonstersRounds6" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertMonsters7" /></td><td style="padding-left:10px">Silenced</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertMonstersRounds7" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertMonsters8" /></td><td style="padding-left:10px">Nerfed</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertMonstersRounds8" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertMonsters9" /></td><td style="padding-left:10px">Magically Snared</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertMonstersRounds9" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertMonsters10" /></td><td style="padding-left:10px">Lifestream</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertMonstersRounds10" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td colspan="2" style="padding-left:10px">Specific Spell Warnings:</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isWarnAbsorbTrigger" /></td><td colspan="2">Alert when Absorbing Ward triggers</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isWarnSparkTrigger" /></td><td colspan="2">Alert when Spark of Life triggers</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isWarnSparkExpire" /></td><td colspan="2">Alert when Spark of Life expires</td></tr>'
		+ '<tr><td colspan="2" style="padding-left:10px">Alert Mode:</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isHighlightQC" /></td><td colspan="2">Highlight Quickcast - <span style="color:orange">Orange</span>: <input type="text" name="warnOrangeLevel" size="1" maxLength="2" style="text-align:right" />% HP; <span style="color:red">Red</span>: <input type="text" name="warnRedLevel" size="1" maxLength="2" style="text-align:right" />% HP; <span style="color:blue">Blue</span>: <input type="text" name="warnOrangeLevelMP" size="1" maxLength="2" style="text-align:right" />% MP; <span style="color:darkblue">Darkblue</span>: <input type="text" name="warnRedLevelMP" size="1" maxLength="2" style="text-align:right" />% MP; <span style="color:lime">Lime</span>: <input type="text" name="warnOrangeLevelSP" size="1" maxLength="2" style="text-align:right" />% SP; <span style="color:green">Green</span>: <input type="text" name="warnRedLevelSP" size="1" maxLength="2" style="text-align:right" />% SP</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isShowPopup" /></td><td colspan="2">Alert Message - <input type="text" name="warnAlertLevel" size="1" maxLength="2" style="text-align:right" />% HP; <input type="text" name="warnAlertLevelMP" size="1" maxLength="2" style="text-align:right" />% MP; <input type="text" name="warnAlertLevelSP" size="1" maxLength="2" style="text-align:right" />% SP</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isNagHP" /></td><td colspan="2" style="padding-left:10px">HP Nag Mode - Alert message appears every turn your HP is critical</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isNagMP" /></td><td colspan="2" style="padding-left:10px">MP Nag Mode - Alert message appears every turn your MP is critical</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isNagSP" /></td><td colspan="2" style="padding-left:10px">SP Nag Mode - Alert message appears every turn your SP is critical</td></tr>'
		+ '<tr><td colspan="2" style="padding-left:10px">Battle Type:</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isWarnH" /></td><td colspan="2" style="padding-left:10px">Hourly encounters</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isWarnA" /></td><td colspan="2" style="padding-left:10px">Arena</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isWarnGF" /></td><td colspan="2" style="padding-left:10px">Grindfest</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isWarnCF" /></td><td colspan="2" style="padding-left:10px">Crystfest</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isWarnIW" /></td><td colspan="2" style="padding-left:10px">Item World</td></tr>'
		+ '<tr><td colspan="2"><b>Database Options:</b></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isRememberScan" /></td><td colspan="2">Record monster scan results</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isRememberSkillsTypes" /></td><td colspan="2">Record monster skills</td><td></td></tr>'
		+ '</table><hr />'
		+ '<table class="_settings" cellspacing="0" cellpadding="2" style="width:100%">'
		+ '<tr><td align="center"><input type="button" class="_resetSettings" value="Default Settings" title="Reset settings to default."/></td><td align="center"><input type="button" class="_masterReset" value="MASTER RESET" title="Deletes all of STAT\'s saved data and settings."/></td></tr>'
		+ '</table>';
	$("#pane6").html(a);
	if (_settings.isShowHighlight) $("input[name=isShowHighlight]").attr("checked", "checked");
	if (_settings.isAltHighlight) $("input[name=isAltHighlight]").attr("checked", "checked");
	if (_settings.isShowDivider) $("input[name=isShowDivider]").attr("checked", "checked");
	if (_settings.isShowEndStats) $("input[name=isShowEndStats]").attr("checked", "checked");
	//isShowEndProfs added by Ilirith
	if (_settings.isShowEndProfs) {
		$("input[name=isShowEndProfs]").attr("checked", "checked");
		if (_settings.isShowEndProfsMagic) $("input[name=isShowEndProfsMagic]").attr("checked", "checked");
		if (_settings.isShowEndProfsArmor) $("input[name=isShowEndProfsArmor]").attr("checked", "checked");
		if (_settings.isShowEndProfsWeapon) $("input[name=isShowEndProfsWeapon]").attr("checked", "checked");
	} else {
		$("input[name=isShowEndProfsMagic]").removeAttr("checked");
		$("input[name=isShowEndProfsArmor]").removeAttr("checked");
		$("input[name=isShowEndProfsWeapon]").removeAttr("checked");
	}
	//isShowMonsterNumber stolen from HV Lite, and added by Ilirith
	if (_settings.isShowMonsterNumber) $("input[name=isShowMonsterNumber]").attr("checked", "checked");
	if (_settings.isShowRoundCounter) $("input[name=isShowRoundCounter]").attr("checked", "checked");
	if (_settings.isShowPowerupBox) $("input[name=isShowPowerupBox]").attr("checked", "checked");
	if (_settings.showMonsterHP) $("input[name=showMonsterHP]").attr("checked", "checked");
	if (_settings.showMonsterHPPercent) $("input[name=showMonsterHPPercent]").attr("checked", "checked");
	if (_settings.showMonsterMP) $("input[name=showMonsterMP]").attr("checked", "checked");
	if (_settings.showMonsterSP) $("input[name=showMonsterSP]").attr("checked", "checked");
	if (_settings.showMonsterClassFromDB) $("input[name=showMonsterClassFromDB]").attr("checked", "checked");
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
	if (_settings.hideSpecificDamageType[10]) 	$("input[name=hideSpecificDamageType10]").attr("checked", "checked");
	if (_settings.ResizeMonsterInfo) $("input[name=ResizeMonsterInfo]").attr("checked", "checked");
	if (_settings.showMonsterPowerLevelFromDB) $("input[name=showMonsterPowerLevelFromDB]").attr("checked", "checked");
	if (_settings.showMonsterInfoFromDB) $("input[name=showMonsterInfoFromDB]").attr("checked", "checked");
	if (_settings.isShowStatsPopup) $("input[name=isShowStatsPopup]").attr("checked", "checked");
	if (_settings.isMonsterPopupPlacement) $("input[name=isMonsterPopupPlacement]").attr("checked", "checked");
	$("input[name=monsterPopupDelay]").attr("value", _settings.monsterPopupDelay);
	if (_settings.isShowMonsterDuration) $("input[name=isShowMonsterDuration]").attr("checked", "checked");
	if (_settings.isMonstersEffectsWarnColor) $("input[name=isMonstersEffectsWarnColor]").attr("checked", "checked");
	$("input[name=MonstersWarnOrangeRounds]").attr("value", _settings.MonstersWarnOrangeRounds);
	$("input[name=MonstersWarnRedRounds]").attr("value", _settings.MonstersWarnRedRounds);
	if (_settings.isShowSelfDuration) $("input[name=isShowSelfDuration]").attr("checked", "checked");
	if (_settings.isSelfEffectsWarnColor) $("input[name=isSelfEffectsWarnColor]").attr("checked", "checked");
	$("input[name=SelfWarnOrangeRounds]").attr("value", _settings.SelfWarnOrangeRounds);
	$("input[name=SelfWarnRedRounds]").attr("value", _settings.SelfWarnRedRounds);
	if (_settings.isShowSidebarProfs) $("input[name=isShowSidebarProfs]").attr("checked", "checked");
	if (_settings.isRememberScan) $("input[name=isRememberScan]").attr("checked", "checked");
	if (_settings.isRememberSkillsTypes) $("input[name=isRememberSkillsTypes]").attr("checked", "checked");
	if (_settings.isShowRoundReminder) $("input[name=isShowRoundReminder]").attr("checked", "checked");
	$("input[name=reminderMinRounds]").attr("value", _settings.reminderMinRounds);
	if (_settings.isAlertGem) $("input[name=isAlertGem]").attr("checked", "checked");
	if (_settings.isAlertOverchargeFull) $("input[name=isAlertOverchargeFull]").attr("checked", "checked");
	$("input[name=reminderBeforeEnd]").attr("value", _settings.reminderBeforeEnd);
	if (_settings.isChangePageTitle) $("input[name=isChangePageTitle]").attr("checked", "checked");
	if (_settings.isStartAlert) $("input[name=isStartAlert]").attr("checked", "checked");
	if (_settings.isShowEquippedSet) $("input[name=isShowEquippedSet]").attr("checked", "checked");
	if (_settings.isDisableForgeHotKeys) $("input[name=isDisableForgeHotKeys]").attr("checked", "checked");
	if (_settings.isShowTags[0]) $("input[name=isShowTags0]").attr("checked", "checked");
	if (_settings.isShowTags[1]) $("input[name=isShowTags1]").attr("checked", "checked");
	if (_settings.isShowTags[2]) $("input[name=isShowTags2]").attr("checked", "checked");
	if (_settings.isShowTags[3]) $("input[name=isShowTags3]").attr("checked", "checked");
	if (_settings.isShowTags[4]) $("input[name=isShowTags4]").attr("checked", "checked");
	if (_settings.isShowTags[5]) $("input[name=isShowTags5]").attr("checked", "checked");
	$("input[name=StartAlertHP]").attr("value", _settings.StartAlertHP);
	$("input[name=StartAlertMP]").attr("value", _settings.StartAlertMP);
	$("input[name=StartAlertSP]").attr("value", _settings.StartAlertSP);
	var diffsel = "diff" + String(_settings.StartAlertDifficulty);
	$("#"+diffsel+"").attr("selected", true);
	if (_settings.isShowScanButton) $("input[name=isShowScanButton]").attr("checked", "checked");
	if (_settings.isShowSkillButton) $("input[name=isShowSkillButton]").attr("checked", "checked");
	if (_settings.isEnableScanHotkey) $("input[name=isEnableScanHotkey]").attr("checked", "checked");
	if (_settings.isEnableSkillHotkey) $("input[name=isEnableSkillHotkey]").attr("checked", "checked");
	$("input[name=customPageTitle]").attr("value", _settings.customPageTitle);
	if (_settings.isColumnInventory) $("input[name=isColumnInventory]").attr("checked", "checked");
	if (_settings.isTrackStats) $("input[name=isTrackStats]").attr("checked", "checked");
	if (_settings.isTrackRewards) $("input[name=isTrackRewards]").attr("checked", "checked");
	if (_settings.isTrackShrine) $("input[name=isTrackShrine]").attr("checked", "checked");
	if (_settings.isTrackItems) $("input[name=isTrackItems]").attr("checked", "checked");
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
	$("input[name=EffectsAlertSelfRounds0]").attr("value", _settings.EffectsAlertSelfRounds[0]);
	$("input[name=EffectsAlertSelfRounds1]").attr("value", _settings.EffectsAlertSelfRounds[1]);
	$("input[name=EffectsAlertSelfRounds2]").attr("value", _settings.EffectsAlertSelfRounds[2]);
	$("input[name=EffectsAlertSelfRounds3]").attr("value", _settings.EffectsAlertSelfRounds[3]);
	$("input[name=EffectsAlertSelfRounds5]").attr("value", _settings.EffectsAlertSelfRounds[5]);
	$("input[name=EffectsAlertSelfRounds6]").attr("value", _settings.EffectsAlertSelfRounds[6]);
	$("input[name=EffectsAlertSelfRounds7]").attr("value", _settings.EffectsAlertSelfRounds[7]);
	$("input[name=EffectsAlertSelfRounds8]").attr("value", _settings.EffectsAlertSelfRounds[8]);
	$("input[name=EffectsAlertSelfRounds9]").attr("value", _settings.EffectsAlertSelfRounds[9]);
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
	if (_settings.warnMode[0]) $("input[name=isWarnH]").attr("checked", "checked");
	if (_settings.warnMode[1]) $("input[name=isWarnA]").attr("checked", "checked");
	if (_settings.warnMode[2]) $("input[name=isWarnGF]").attr("checked", "checked");
	if (_settings.warnMode[3]) $("input[name=isWarnIW]").attr("checked", "checked");
	if (_settings.warnMode[4]) $("input[name=isWarnCF]").attr("checked", "checked");
	if (_settings.isHighlightQC) $("input[name=isHighlightQC]").attr("checked", "checked");
	$("input[name=warnOrangeLevel]").attr("value", _settings.warnOrangeLevel);
	$("input[name=warnRedLevel]").attr("value", _settings.warnRedLevel);
	$("input[name=warnAlertLevel]").attr("value", _settings.warnAlertLevel);
	if (_settings.isNagHP) $("input[name=isNagHP]").attr("checked", "checked")
	$("input[name=warnOrangeLevelMP]").attr("value", _settings.warnOrangeLevelMP);
	$("input[name=warnRedLevelMP]").attr("value", _settings.warnRedLevelMP);
	$("input[name=warnAlertLevelMP]").attr("value", _settings.warnAlertLevelMP);
	if (_settings.isNagMP) $("input[name=isNagMP]").attr("checked", "checked")
	$("input[name=warnOrangeLevelSP]").attr("value", _settings.warnOrangeLevelSP);
	$("input[name=warnRedLevelSP]").attr("value", _settings.warnRedLevelSP);
	$("input[name=warnAlertLevelSP]").attr("value", _settings.warnAlertLevelSP);
	if (_settings.isNagSP) $("input[name=isNagSP]").attr("checked", "checked");
	if (_settings.isShowPopup) $("input[name=isShowPopup]").attr("checked", "checked");
	if (_settings.isWarnAbsorbTrigger) $("input[name=isWarnAbsorbTrigger]").attr("checked", "checked");
	if (_settings.isWarnSparkTrigger) $("input[name=isWarnSparkTrigger]").attr("checked", "checked");
	if (_settings.isWarnSparkExpire) $("input[name=isWarnSparkExpire]").attr("checked", "checked");
	$("input[name=isShowHighlight]").click(saveSettings);
	$("input[name=isAltHighlight]").click(saveSettings);
	$("input[name=isShowDivider]").click(saveSettings);
	$("input[name=isShowEndStats]").click(saveSettings);
	$("input[name=isShowEndProfs]").click(saveSettings); //isShowEndProfs added by Ilirith
	$("input[name=isShowEndProfsMagic]").click(saveSettings); //isShowEndProfs added by Ilirith
	$("input[name=isShowEndProfsArmor]").click(saveSettings); //isShowEndProfs added by Ilirith
	$("input[name=isShowEndProfsWeapon]").click(saveSettings); //isShowEndProfs added by Ilirith
	$("input[name=showMonsterHP]").click(saveSettings);
	$("input[name=showMonsterHPPercent]").click(saveSettings);
	$("input[name=showMonsterMP]").click(saveSettings);
	$("input[name=showMonsterSP]").click(saveSettings);
	$("input[name=showMonsterInfoFromDB]").click(saveSettings);
	$("input[name=isShowStatsPopup]").click(saveSettings);
	$("input[name=isMonsterPopupPlacement]").click(saveSettings);
	$("input[name=monsterPopupDelay]").change(saveSettings);
	$("input[name=showMonsterClassFromDB]").click(saveSettings);
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
	$("input[name=showMonsterPowerLevelFromDB]").click(saveSettings);
	$("input[name=isShowMonsterDuration]").click(saveSettings);
	$("input[name=isMonstersEffectsWarnColor]").click(saveSettings);
	$("input[name=MonstersWarnOrangeRounds]").change(saveSettings);
	$("input[name=MonstersWarnRedRounds]").change(saveSettings);
	$("input[name=isShowSelfDuration]").click(saveSettings);
	$("input[name=isSelfEffectsWarnColor]").click(saveSettings);
	$("input[name=SelfWarnOrangeRounds]").change(saveSettings);
	$("input[name=SelfWarnRedRounds]").change(saveSettings);
	$("input[name=isShowSidebarProfs]").click(reminderAndSaveSettings);
	$("input[name=isRememberScan]").click(reminderAndSaveSettings);
	$("input[name=isRememberSkillsTypes]").click(reminderAndSaveSettings);
	$("input[name=isShowRoundReminder]").click(saveSettings);
	$("input[name=reminderMinRounds]").change(saveSettings);
	$("input[name=reminderBeforeEnd]").change(saveSettings);
	$("input[name=isAlertGem]").click(saveSettings);
	$("input[name=isAlertOverchargeFull]").click(saveSettings);
	$("input[name=isShowScanButton]").click(saveSettings);
	$("input[name=isShowSkillButton]").click(saveSettings);
	$("input[name=isEnableSkillHotkey]").click(saveSettings);
	$("input[name=isEnableScanHotkey]").click(saveSettings);
	$("input[name=isChangePageTitle]").click(saveSettings);
	$("input[name=isStartAlert]").click(saveSettings);
	$("input[name=isShowEquippedSet]").click(saveSettings);
	$("input[name=isDisableForgeHotKeys]").click(saveSettings);
	$("input[name^=isShowTags]").click(saveSettings);
	$("input[name=StartAlertHP]").change(saveSettings);
	$("input[name=StartAlertMP]").change(saveSettings);
	$("input[name=StartAlertSP]").change(saveSettings);
	$("input[name=StartAlertSP]").change(saveSettings);
	$("select[id=StartAlertDifficulty]").change(saveSettings);
	$("input[name=customPageTitle]").change(saveSettings);
	$("input[name=isColumnInventory]").click(saveSettings);
	$("input[name=isTrackStats]").click(saveSettings);
	$("input[name=isTrackRewards]").click(saveSettings);
	$("input[name=isTrackShrine]").click(saveSettings);
	$("input[name=isTrackItems]").click(saveSettings);
	$("input[name=isMainEffectsAlertSelf]").click(saveSettings);
	$("input[name^=isEffectsAlertSelf]").click(saveSettings);
	$("input[name^=EffectsAlertSelfRounds]").change(saveSettings);
	$("input[name=isMainEffectsAlertMonsters]").click(saveSettings);
	$("input[name^=isEffectsAlertMonsters]").click(saveSettings);
	$("input[name^=EffectsAlertMonstersRounds]").change(saveSettings);
	$("input[name=isWarnAbsorbTrigger]").click(saveSettings);
	$("input[name=isWarnSparkTrigger]").click(saveSettings);
	$("input[name=isWarnSparkExpire]").click(saveSettings);
	$("input[name=isWarnH]").click(saveSettings);
	$("input[name=isWarnA]").click(saveSettings);
	$("input[name=isWarnGF]").click(saveSettings);
	$("input[name=isWarnIW]").click(saveSettings);
	$("input[name=isWarnCF]").click(saveSettings);
	$("input[name=isHighlightQC]").click(saveSettings);
	$("input[name=warnOrangeLevel]").change(saveSettings);
	$("input[name=warnRedLevel]").change(saveSettings);
	$("input[name=warnAlertLevel]").change(saveSettings);
	$("input[name=isNagHP]").click(saveSettings);
	$("input[name=warnOrangeLevelMP]").change(saveSettings);
	$("input[name=warnRedLevelMP]").change(saveSettings);
	$("input[name=warnAlertLevelMP]").change(saveSettings);
	$("input[name=isNagMP]").click(saveSettings);
	$("input[name=warnOrangeLevelSP]").change(saveSettings);
	$("input[name=warnRedLevelSP]").change(saveSettings);
	$("input[name=warnAlertLevelSP]").change(saveSettings);
	$("input[name=isNagSP]").click(saveSettings);
	$("input[name=isShowPopup]").click(saveSettings);
	$("input[name=isShowMonsterNumber]").click(saveSettings);
	$("input[name=isShowPowerupBox]").click(saveSettings);
	$("input[name=isShowRoundCounter]").click(saveSettings);
	$("._resetSettings").click(function (){ if (confirm("Reset Settings to default?")) _settings.reset(); })
	$("._resetAll").click(function (){ if (confirm("Reset All Tracking data?")) HVResetTracking(); })
	$("._masterReset").click(function (){ if (confirm("This will delete ALL HV data saved in localStorage.\nAre you sure you want to do this?")) HVMasterReset(); })
}
function saveSettings() {
	_settings.isShowHighlight = $("input[name=isShowHighlight]").get(0).checked;
	_settings.isAltHighlight = $("input[name=isAltHighlight]").get(0).checked;
	_settings.isShowDivider = $("input[name=isShowDivider]").get(0).checked;
	_settings.isShowEndStats = $("input[name=isShowEndStats]").get(0).checked;
	_settings.isShowEndProfs = $("input[name=isShowEndProfs]").get(0).checked; //isShowEndProfs added by Ilirith
	_settings.isShowEndProfsMagic = $("input[name=isShowEndProfsMagic]").get(0).checked; //isShowEndProfs added by Ilirith
	_settings.isShowEndProfsArmor = $("input[name=isShowEndProfsArmor]").get(0).checked; //isShowEndProfs added by Ilirith
	_settings.isShowEndProfsWeapon = $("input[name=isShowEndProfsWeapon]").get(0).checked; //isShowEndProfs added by Ilirith
	_settings.showMonsterHP = $("input[name=showMonsterHP]").get(0).checked;
	_settings.showMonsterHPPercent = $("input[name=showMonsterHPPercent]").get(0).checked;
	_settings.showMonsterMP = $("input[name=showMonsterMP]").get(0).checked;
	_settings.showMonsterSP = $("input[name=showMonsterSP]").get(0).checked;
	_settings.showMonsterInfoFromDB = $("input[name=showMonsterInfoFromDB]").get(0).checked;
	_settings.isShowStatsPopup = $("input[name=isShowStatsPopup]").get(0).checked;
	_settings.isMonsterPopupPlacement = $("input[name=isMonsterPopupPlacement]").get(0).checked;
	_settings.showMonsterClassFromDB = $("input[name=showMonsterClassFromDB]").get(0).checked;
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
	_settings.showMonsterPowerLevelFromDB = $("input[name=showMonsterPowerLevelFromDB]").get(0).checked;
	_settings.isShowMonsterDuration = $("input[name=isShowMonsterDuration]").get(0).checked;
	_settings.isMonstersEffectsWarnColor = $("input[name=isMonstersEffectsWarnColor]").get(0).checked;
	_settings.MonstersWarnOrangeRounds = $("input[name=MonstersWarnOrangeRounds]").get(0).value;
	_settings.MonstersWarnRedRounds = $("input[name=MonstersWarnRedRounds]").get(0).value;
	_settings.isShowSelfDuration = $("input[name=isShowSelfDuration]").get(0).checked;
	_settings.isSelfEffectsWarnColor = $("input[name=isSelfEffectsWarnColor]").get(0).checked;
	_settings.SelfWarnOrangeRounds = $("input[name=SelfWarnOrangeRounds]").get(0).value;
	_settings.SelfWarnRedRounds = $("input[name=SelfWarnRedRounds]").get(0).value;
	_settings.isShowSidebarProfs = $("input[name=isShowSidebarProfs]").get(0).checked;
	_settings.isRememberScan = $("input[name=isRememberScan]").get(0).checked;
	_settings.isRememberSkillsTypes = $("input[name=isRememberSkillsTypes]").get(0).checked;
	_settings.isShowRoundReminder = $("input[name=isShowRoundReminder]").get(0).checked;
	_settings.reminderMinRounds = $("input[name=reminderMinRounds]").get(0).value;
	_settings.reminderBeforeEnd = $("input[name=reminderBeforeEnd]").get(0).value;
	_settings.isAlertGem = $("input[name=isAlertGem]").get(0).checked;
	_settings.isAlertOverchargeFull = $("input[name=isAlertOverchargeFull]").get(0).checked;
	_settings.isShowScanButton = $("input[name=isShowScanButton]").get(0).checked;
	_settings.isShowSkillButton = $("input[name=isShowSkillButton]").get(0).checked;
	_settings.isEnableScanHotkey = $("input[name=isEnableScanHotkey]").get(0).checked;
	_settings.isEnableSkillHotkey = $("input[name=isEnableSkillHotkey]").get(0).checked;
	_settings.isChangePageTitle = $("input[name=isChangePageTitle]").get(0).checked;
	_settings.isShowEquippedSet = $("input[name=isShowEquippedSet]").get(0).checked;
	_settings.isDisableForgeHotKeys = $("input[name=isDisableForgeHotKeys]").get(0).checked;
	_settings.isShowTags[0] = $("input[name=isShowTags0]").get(0).checked;
	_settings.isShowTags[1] = $("input[name=isShowTags1]").get(0).checked;
	_settings.isShowTags[2] = $("input[name=isShowTags2]").get(0).checked;
	_settings.isShowTags[3] = $("input[name=isShowTags3]").get(0).checked;
	_settings.isShowTags[4] = $("input[name=isShowTags4]").get(0).checked;
	_settings.isShowTags[5] = $("input[name=isShowTags5]").get(0).checked;
	_settings.isStartAlert = $("input[name=isStartAlert]").get(0).checked;
	_settings.StartAlertHP = $("input[name=StartAlertHP]").get(0).value;
	_settings.StartAlertMP = $("input[name=StartAlertMP]").get(0).value;
	_settings.StartAlertSP = $("input[name=StartAlertSP]").get(0).value;
	_settings.StartAlertDifficulty = $("select[id=StartAlertDifficulty]").get(0).value;
	_settings.customPageTitle = $("input[name=customPageTitle]").get(0).value;
	_settings.isColumnInventory = $("input[name=isColumnInventory]").get(0).checked;
	_settings.isTrackStats = $("input[name=isTrackStats]").get(0).checked;
	_settings.isTrackRewards = $("input[name=isTrackRewards]").get(0).checked;
	_settings.isTrackShrine = $("input[name=isTrackShrine]").get(0).checked;
	_settings.isTrackItems = $("input[name=isTrackItems]").get(0).checked;
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
	_settings.isEffectsAlertSelf[9] = $("input[name=isEffectsAlertSelf9]").get(0).checked;
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
	_settings.isWarnAbsorbTrigger = $("input[name=isWarnAbsorbTrigger]").get(0).checked;
	_settings.isWarnSparkTrigger = $("input[name=isWarnSparkTrigger]").get(0).checked;
	_settings.isWarnSparkExpire = $("input[name=isWarnSparkExpire]").get(0).checked;
	_settings.isHighlightQC = $("input[name=isHighlightQC]").get(0).checked;
	_settings.warnOrangeLevel = $("input[name=warnOrangeLevel]").get(0).value;
	_settings.warnRedLevel = $("input[name=warnRedLevel]").get(0).value;
	_settings.warnAlertLevel = $("input[name=warnAlertLevel]").get(0).value;
	_settings.isNagHP = $("input[name=isNagHP]").get(0).checked;
	_settings.warnOrangeLevelMP = $("input[name=warnOrangeLevelMP]").get(0).value;
	_settings.warnRedLevelMP = $("input[name=warnRedLevelMP]").get(0).value;
	_settings.warnAlertLevelMP = $("input[name=warnAlertLevelMP]").get(0).value;
	_settings.isNagMP = $("input[name=isNagMP]").get(0).checked;
	_settings.warnOrangeLevelSP = $("input[name=warnOrangeLevelSP]").get(0).value;
	_settings.warnRedLevelSP = $("input[name=warnRedLevelSP]").get(0).value;
	_settings.warnAlertLevelSP = $("input[name=warnAlertLevelSP]").get(0).value;
	_settings.isNagSP = $("input[name=isNagSP]").get(0).checked;
	_settings.warnMode[0] = $("input[name=isWarnH]").get(0).checked;
	_settings.warnMode[1] = $("input[name=isWarnA]").get(0).checked;
	_settings.warnMode[2] = $("input[name=isWarnGF]").get(0).checked;
	_settings.warnMode[3] = $("input[name=isWarnIW]").get(0).checked;
	_settings.warnMode[4] = $("input[name=isWarnCF]").get(0).checked;
	_settings.isShowPopup = $("input[name=isShowPopup]").get(0).checked;
	_settings.monsterPopupDelay = $("input[name=monsterPopupDelay]").get(0).value;
	_settings.isShowMonsterNumber = $("input[name=isShowMonsterNumber]").get(0).checked;
	_settings.isShowPowerupBox = $("input[name=isShowPowerupBox]").get(0).checked;
	_settings.isShowRoundCounter = $("input[name=isShowRoundCounter]").get(0).checked;
	_settings.save();
}
function reminderAndSaveSettings() {
	loadProfsObject();
	if (!isProfTotalsRecorded() && $("input[name=isShowSidebarProfs]").get(0).checked)
		alert('Please visit the Character Stats page at least once\nwith either the "Use Downloable Fonts" or "Custom\nLocal Font" setting enabled, to allow STAT to record\nyour current proficiencies. STAT cannot record this\ndata while HentaiVerse Font Engine is enabled.');
	saveSettings();
}
function initItemsView() {
	$("#leftpane").hide();
	GM_addStyle("#hv_item_grid * {font-family:arial,helvetica,sans-serif !important;font-size:9pt !important;font-weight:bold !important;line-height:72% !important;padding-top:2px;text-transform:capitalize;}#_health, #_mana, #_spirit, #_other, #_infusion, #_scroll, #_special div div div {cursor:pointer;}#_artifact, #_trophy, #_event, #_token, #_crystal div div div {cursor:default;}#_left {width:194px;height:660px;float:left;overflow:auto;}#_right {width:206px;height:660px;float:left;overflow:auto;}._spacer {padding:1px;float:right;width:194px;}");
	var a = 11101;
	var k = 11201;
	var e = 11301;
	var l = 11401;
	var f = 12101;
	var d = 13101;
	var b = 19101;
	var i = 20001;
	var c = 30001;
	var g = 32001;
	var h = 40001;
	var j = 50001;
	$("#leftpane").before("<div id='hv_item_grid' style='width:404px;height:660px;text-align:left;float:left;position:relative;'><div id='_left'><div id='_health'><div class='_spacer'></div></div><div id='_mana'><div class='_spacer'></div></div><div id='_spirit'><div class='_spacer'></div></div><div id='_other'><div class='_spacer'></div></div><div id='_special'><div class='_spacer'></div></div><div id='_infusion'><div class='_spacer'></div></div><div id='_scroll'><div class='_spacer'></div></div><div id='_token'><div class='_spacer'></div></div><div id='_crystal'><div class='_spacer'></div></div><div id='_artifact'><div class='_spacer'></div></div><div id='_trophy'><div class='_spacer'></div></div><div id='_event'><div class='_spacer'></div></div></div><div id='_right'></div></div>");
	$("#item_pane > table > tbody > tr").each(function () {
		var o = $(this);
		var n = o.children("td").eq(0).children("div").eq(0).attr("id").match(/\d+/)[0];
		var m = o.children("td").eq(0).children("div").eq(0);
		m.children().eq(0).children().eq(0).html(o.children("td").eq(0).text() + "(" + o.children("td").eq(1).text() + ")");
		m.click(function () { select_item(this); })
		if (n >= a && n < k) $("#_health ._spacer").before(m);
		else if (n >= k && n < e) $("#_mana ._spacer").before(m);
		else if (n >= e && n < l) $("#_spirit ._spacer").before(m);
		else if (n >= l && n < f) $("#_other ._spacer").before(m);
		else if (n >= f && n < d) $("#_infusion ._spacer").before(m);
		else if (n >= d && n < b) $("#_scroll ._spacer").before(m);
		else if (n >= b && n < i) $("#_special ._spacer").before(m);
		else if (n >= i && n < c) $("#_artifact ._spacer").before(m);
		else if (n >= c && n < g) $("#_trophy ._spacer").before(m);
		else if (n >= g && n < h) $("#_event ._spacer").before(m);
		else if (n >= h && n < j) $("#_token ._spacer").before(m);
		else if (n >= j) $("#_crystal ._spacer").before(m);
		m.children().eq(0).removeAttr("style").css("width", m.children().width());
		m.removeAttr("style").css({
			"float" : "right",
			width : "200px",
			padding : "2px 1px"
		});
	});
	$("#_crystal").appendTo("#_right");
	$("#_artifact").appendTo("#_right");
	$("#_trophy").appendTo("#_right");
	$("#_event").appendTo("#_right");
}
function captureShrine() {
	if ($("#messagebox").html() !== undefined) {
		loadShrineObject();
		var a = $(".cmb6:eq(0) div:eq(4)").text();
		if (a.match(/power/i)) {
			var b = $(".cmb6:eq(2) div:eq(4)").text();
			_shrine.artifactsTraded++;
			if (b.match(/ability point/i)) _shrine.artifactAP++;
			else if (b.match(/crystal/i)) _shrine.artifactCrystal++;
			else if (b.match(/increased/ig)) _shrine.artifactStat++;
			else if (b.match(/(\d) hath/i)) {
				_shrine.artifactHath++;
				_shrine.artifactHathTotal += parseInt(RegExp.$1);
			} else if (b.match(/energy drink/ig)) _shrine.artifactItem++;
		} else if (a.match(/item/i)) _shrine.trophyArray.push($(".cmb6:eq(3) div:eq(4)").text().replace(/(^|\s)([a-z])/g, function (d, f, e){ return f + e.toUpperCase(); }).replace(" Of ", " of ").replace(" The ", " the "));
		_shrine.save();
	}
	return;
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
	_round.monsters.forEach(function (element, index, array) {
		HVStat.monsters[index].setFromValueObject(element);
	});
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
if (HVStat.isChrome) {	//=== Clones a few GreaseMonkey functions for Chrome Users.
	unsafeWindow = window;
	function GM_addStyle(styleCSS) {
		var doc = document,
		newStyle = doc.createElement("style");
		newStyle.textContent = styleCSS;
		doc.documentElement.insertBefore(newStyle);
	}
	function GM_getValue(b, a) {
		var c = localStorage.getItem(b);
		if (c === "false") return false;
		return c || a;
	}
	function GM_deleteValue(a) { localStorage.removeItem(a); }
	function GM_log(a) { console.log(a); }
	function GM_setValue(a, b) { localStorage.setItem(a, b); }
	function GM_getResourceText(a) {}
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
	this.sInterfs = 0;
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
	this.armorProfGain = [0, 0, 0, 0];
	this.scan = [0, 0, 0, 0, 0, 0, 0, 0];
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
	this.sInterfs = 0;
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
	this.armorProfTotals = [0, 0, 0, 0];
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
		"[Featherweight Shard]", " "
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
	this.isTrackStats = true;
	this.isTrackRewards = false;
	this.isTrackShrine = false;
	this.isTrackItems = false;
	this.isMainEffectsAlertSelf = false;
	this.isEffectsAlertSelf = [false, false, false, false, false, false, false, false, false, false];
	this.EffectsAlertSelfRounds = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	this.isMainEffectsAlertMonsters = false;
	this.isEffectsAlertMonsters = [false, false, false, false, false, false, false, false, false, false, false, false];
	this.EffectsAlertMonstersRounds = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	this.isWarnAbsorbTrigger = false;
	this.isWarnSparkTrigger = true;
	this.isWarnSparkExpire = true;
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
	this.isNagHP = false;
	this.isNagMP = false;
	this.isNagSP = false;
	this.isShowPopup = true;
	this.warnMode = [true, true, false, false, false];
	this.isShowHighlight = true;
	this.isAltHighlight = false;
	this.isShowDivider = true;
	this.isShowEndStats = true;
	this.isShowEndProfs = true;
	this.isShowEndProfsMagic = true;
	this.isShowEndProfsArmor = true;
	this.isShowEndProfsWeapon = true;
	this.showMonsterHP = true;
	this.showMonsterHPPercent = false;
	this.showMonsterMP = true;
	this.showMonsterSP = true;
	this.showMonsterInfoFromDB = false;
	this.isShowStatsPopup = false;
	this.showMonsterClassFromDB = false;
	this.showMonsterAttackTypeFromDB = false;
	this.showMonsterWeaknessesFromDB = false;
	this.showMonsterResistancesFromDB = false;
	this.hideSpecificDamageType = [false, false, false, false, false, false, false, false, false, false, false];
	this.ResizeMonsterInfo = false;
	this.showMonsterPowerLevelFromDB = false;
	this.isShowMonsterDuration = true;
	this.isMonstersEffectsWarnColor = false;
	this.MonstersWarnOrangeRounds = 5;
	this.MonstersWarnRedRounds = 1;
	this.isShowSelfDuration = true;
	this.isSelfEffectsWarnColor = false;
	this.SelfWarnOrangeRounds = 5;
	this.SelfWarnRedRounds = 1;
	this.isShowSidebarProfs = false;
	this.isRememberScan = false;
	this.isRememberSkillsTypes = false;
	this.isShowRoundReminder = false;
	this.reminderMinRounds = 3;
	this.reminderBeforeEnd = 1;
	this.isAlertGem = true;
	this.isAlertOverchargeFull = false;
	this.isChangePageTitle = false;
	this.customPageTitle = "HV";
	this.isColumnInventory = false;
	this.isMonsterPopupPlacement = false;
	this.monsterPopupDelay = 0;
	this.isStartAlert = false;
	this.StartAlertHP = 95;
	this.StartAlertMP = 95;
	this.StartAlertSP = 95;
	this.StartAlertDifficulty = 2;
	this.isShowScanButton = false;
	this.isEnableScanHotkey = false;
	this.isShowSkillButton = false;
	this.isEnableSkillHotkey = false;
	this.isShowEquippedSet = false;
	this.isDisableForgeHotKeys = false;
	//0-twohanded fighter; 1-elemental mage
	//0-equipment page, 1-shop, 2-itemworld, 3-moogle, 4-forge
	this.isShowTags = [false, false, false, false, false, false];
	this.isShowMonsterNumber = false;
	this.isShowPowerupBox = false;
	this.isShowRoundCounter = false;
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
	ba.sInterfs = _stats.sInterfs;
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
	ba.sInterfs += _stats.sInterfs;
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
	_stats.sInterfs = ba.sInterfs;
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
	_stats.sInterfs += ba.sInterfs;
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
	this.sInterfs = 0;
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
	//0-Misc Posting, 1-Adept Learner, 2-Assimilator, 3-Ability Boost, 4-Karma Amplifier
	//5-Karma Shield, 6-Power Saver, 7-Power Regen, 8-Power Tank, 9-Scavenger
	//10-Luck of the Draw, 11-Quartermaster, 12-Archaeologist, 13-Spelunker
	//14-Set Collector, 15-Pack Rat, 16-Refined Aura
	this.training = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	this.isLoaded = false;
}
function loadCHARSSObject() {
	if (_charss !== null) return;
	_charss = new HVCharacterStatsSettings();
	_charss.load();
}

HVStat.scrollTargetMouseoverEventHandler = function (event) {
	var target = event.target;
	while (target && HVStat.scrollTargets.indexOf(target.id) < 0) {
		target = target.parentElement;
	}
	if (target) {
		HVStat.scrollTarget = target;
	}
};

HVStat.scrollTargetMouseoutEventHandler = function (event) {
	HVStat.scrollTarget = null;
};

HVStat.registerScrollTargetMouseEventListeners = function () {
	var i, element;
	for (i = 0; i < HVStat.scrollTargets.length; i++) {
		element = document.getElementById(HVStat.scrollTargets[i]);
		if (element) {
			element.addEventListener("mouseover", HVStat.scrollTargetMouseoverEventHandler);
			element.addEventListener("mouseout", HVStat.scrollTargetMouseoutEventHandler);
		}
	}
};

HVStat.documentKeydownEventHandler = function (event) {
	if (true/*_settings.enablePageUpAndDown*/) {
		if (HVStat.scrollTarget && !event.altKey && !event.ctrlKey && !event.shiftKey) {
			switch (event.keyCode) {
			case 33:	// PAGE UP
				HVStat.scrollTarget.scrollTop -= HVStat.scrollTarget.clientHeight;
				event.preventDefault();
				break;
			case 34:	// PAGE DOWN
				HVStat.scrollTarget.scrollTop += HVStat.scrollTarget.clientHeight;
				event.preventDefault();
				break;
			}
		}
	}
	var boundKeys, i, j;
	if (HVStat.duringBattle) {
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
						HVStat.battleCommandMap["Attack"].select();	// close skills menu
					} else {
						miScan.fire();
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
						HVStat.battleCommandMap["Attack"].select();	// close skills menu
						HVStat.selectedSkillIndex = -1;
					} else {
						for (j = HVStat.selectedSkillIndex + 1; j <= avilableSkillMaxIndex; j++) {
							if (miSkills[j] && miSkills[j].available) {
								miSkills[j].fire();
								HVStat.selectedSkillIndex = j;
								break;
							}
						}
					}
				}
			}
		}
		if (true/*_settings.enableOFCHotkey*/ && miOFC) {
			boundKeys = miOFC.boundKeys;
			for (i = 0; i < boundKeys.length; i++) {
				if (boundKeys[i].equals(event)) {
					if (HVStat.battleCommandMap["Skills"].menuOpened) {
						HVStat.battleCommandMap["Attack"].select();	// close skills menu
					} else {
						miOFC.fire();
					}
				}
			}
		}
	}
};

HVStat.scanButtonClickHandler = function (event) {
	var monsterId = this.id.slice(11);
	var monsterElement = document.getElementById(monsterId);
	HVStat.battleCommandMenuItemMap["Scan"].fire();
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
	HVStat.battleCommandMenuItemMap["Skill" + skillNumber].fire();
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
				div = document.createElement("div");
				div.setAttribute("id", "HVStatScan_" + monsterElementId);
				div.setAttribute("style", "position:absolute; top:" + String(top) + "px; left:556px; background-color:#EFEEDC; width:25px; height:10px; border-style:double; border-width:2px; z-index:2; border-color:#555555;");
				div.innerHTML = "<span style='font-size:10px;font-weight:bold;font-family:arial,helvetica,sans-serif;text-align:center;vertical-align:text-top;cursor:default'>Scan</span>";
				mainPane.parentNode.insertBefore(div, mainPane.nextSibling);
				div.addEventListener("click", HVStat.scanButtonClickHandler);
			}
			if (_settings.isShowSkillButton) {
				for (i = 0; i < skills.length; i++) {
					div = document.createElement("div");
					var tops = top + (i + 1) * 14;
					div.setAttribute("id", "HVStatSkill" + String(i + 1) + "_"+ monsterElementId);
					style = "position:absolute; top:" + String(tops) + "px; left:556px; background-color:#EFEEDC; width:25px; height:10px; border-style:double; border-width:2px; z-index:2; border-color:#555555;"
					if (!skills[i].available) {
						div.setAttribute("style", style + "opacity:0.3;");
					} else {
						div.setAttribute("style", style);
					}
					div.innerHTML = "<span style='font-size:10px; font-weight:bold; font-family:arial,helvetica,sans-serif; text-align:center; vertical-align:text-top; cursor:default'>" + getButtonLabelFromSkillId(skills[i].id) + "</span>";
					mainPane.parentNode.insertBefore(div, mainPane.nextSibling);
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
		var target;
		for (target = event.target; target && target.id.indexOf("mkey_") < 0; target = target.parentElement) {
			;
		}
		if (!target) return;
		var i, index = -1;
		for (i = 0; i < HVStat.monsters.length; i++) {
			if (HVStat.monsters[i].domElementId === target.id) {
				index = i;
				break;
			}
		}
		if (index < 0) return;
		var html = HVStat.monsters[index].renderPopup();
		HVStat.popupElement.style.width = "270px";
		HVStat.popupElement.style.height = "auto";
		HVStat.popupElement.innerHTML = html;
		var popupTopOffset = HVStat.monsterPaneElement.offsetTop
			+ index * ((HVStat.monsterPaneElement.scrollHeight - HVStat.popupElement.scrollHeight) / 9);
		HVStat.popupElement.style.top = popupTopOffset + "px";
		HVStat.popupElement.style.left = popupLeftOffset + "px";
		HVStat.popupElement.style.visibility = "visible";
	};
	var hidePopup = function () {
		HVStat.popupElement.style.visibility = "hidden";
	};
	var timerId;
	var prepareForShowingPopup = function (event) {
		(function (event) {
			timerId = setTimeout(function () {
				showPopup(event);
			}, delay);
		})(event);
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
	var sHP = Math.floor(_charss.currHP * 100);
	var sMP = Math.floor(_charss.currMP * 100);
	var sSP = Math.floor(_charss.currSP * 100);
	var diff = _charss.difficulty[1];
	$('#arenaform img[onclick*="arenaform"]').each(function () {
		var g = $(this);
		var oldOnClick = g.attr("onclick");
		var newOnClick = 'if(confirm("Are you sure you want to start this challenge on ' + diff + ' difficulty, with set number: ' + _charss.set + '?\\n';
		if (_settings.StartAlertHP > sHP) newOnClick += '\\n - HP is only '+ sHP+ '%';
		if (_settings.StartAlertMP > sMP) newOnClick += '\\n - MP is only '+ sMP+ '%';
		if (_settings.StartAlertSP > sSP) newOnClick += '\\n - SP is only '+ sSP+ '%';
		if (_settings.StartAlertDifficulty < _charss.difficulty[0]) newOnClick += '\\n - Difficulty is '+ diff;
		newOnClick += '")) {'+ oldOnClick+ '}';
		g.attr("onclick", newOnClick);
	});
}
function SetDisplay() {
	loadCHARSSObject();
	var set = String(_charss.set);
	var g = $("div.clb table.cit").eq(5);
	var af = g.children().eq(0).children().eq(0).children().eq(0).children().eq(0).html();
	var a = '<table style="position:relative; z-index:999" class="cit"><tbody><tr><td><div style="width:105px; height:17px" id="Byledalej_equipped1" class="fd12">' + af + '</div></td></tr></tbody></table>';
	$("div.clb table.cit").eq(-1).after(a);
	$("#Byledalej_equipped1>div").text("Equipped set: " + set);
}
function FindSettingsStats() {
	loadCHARSSObject();
	var pointsarray = $("div.clb > div.cwbdv").text();
	if (pointsarray !== null) {
		pointsarray = pointsarray.match(/\d+/g);
		_charss.currHP = (pointsarray[0]/pointsarray[1]).toFixed(2);
		_charss.currMP = (pointsarray[2]/pointsarray[3]).toFixed(2);
		_charss.currSP = (pointsarray[4]/pointsarray[5]).toFixed(2);
	}
	var difficulty = 0;
	$("div.clb table.cit").each(function () {
		var b = $(this);
		if (b.text().match(/Difficulty/ig)) difficulty = b.text().match(/Easy|Normal|Hard|Heroic|Nightmare|Hell|Nintendo|Battletoads|IWBTH/ig);
	});
	if (difficulty !== 0) {
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
	var tyh = $("#setform img").length;
	if (tyh > 2) {
		var setnumstring = 0;
		$("#setform img").each(function () {
			var gat = String($(this).attr("src"));
			if (gat.match(/set\d_on/)) setnumstring = parseInt(gat.match(/set\d_on/)[0].replace("set", "").replace("_on", ""));
		});
		_charss.set = parseInt(setnumstring);
	}
	_charss.save();
}
function AlertEffectsSelf() {
	var effectNames = [
		"Protection", "Hastened", "Shadow Veil", "Regen", "Absorbing Ward",
		"Spark of Life", "Channeling", "Arcane Focus", "Heartseeker", "Spirit Shield"
	];
	var elements = document.querySelectorAll("#battleform div.btps > img");
	Array.prototype.forEach.call(elements, function (element) {
		var onmouseover = element.getAttribute("onmouseover").toString();
		var result = /battle\.set_infopane_effect\('([^']*)'\s*,\s*'[^']*'\s*,\s*(.+)\)/.exec(onmouseover);
		if (result && result.length < 3) return;
		var effectName = result[1];
		var duration = result[2];
		var i;
		for (i = 0; i < effectNames.length; i++) {
			if (_settings.isEffectsAlertSelf[i]
					&& effectNames[i] === effectName
					&& _settings.EffectsAlertSelfRounds[i] === duration) {
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
		var result = /battle\.set_infopane_effect\('([^']*)'\s*,\s*'[^']*'\s*,\s*(.+)\)/.exec(onmouseover);
		if (result && result.length < 3) return;
		var effectName = result[1];
		var duration = result[2];
		var i, base, monsterNumber;
		for (i = 0; i < effectNames.length; i++) {
			if (_settings.isEffectsAlertMonsters[i]
					&& effectNames[i] === effectName
					&& _settings.EffectsAlertMonstersRounds[i] === duration) {
				for (base = element; base && base.id.indexOf("mkey_") < 0; base = base.parentElement) {
					;
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
	$("#inv_equip div.eqpp, #inv_equip div.eqp, #item_pane div.eqp, #item_pane div.eqpp, #equip div.eqp, #equip div.eqpp, #equip_pane div.eqp, #equip_pane div.eqpp").each(function() {
		var eqp = $(this);
		var eqdp = eqp.children().filter(".eqdp");
		var equipType = String(eqdp.attr("onmouseover"))
			.match(/(One-handed Weapon|Two-handed Weapon|Staff|Shield|Cloth Armor|Light Armor|Heavy Armor) &nbsp; &nbsp; Level/i)[0]
			.replace(/ &nbsp; &nbsp; Level/i, "")
			.replace(/ (Weapon|Armor)/i, "");
		var id = parseInt(String(eqdp.attr("id")).replace("item_pane", ""), 10);
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
		var index = jQuery.inArray(id, idArray);
		var tagValue = "";
		if (index < 0) {
			tagValue = "_new";
		} else {
			tagValue = valueArray[index];
			if (clean) {
				idCleanArray.push(id);
				valueCleanArray.push(tagValue);
			}
		}
		var html = "<div style='font-size:10px; font-weight:bold; font-family:arial,helvetica,sans-serif; text-align:right; position:absolute; bottom:-21px; Left:320px; opacity:0.8;'>"
			+ "<input type='text' class='ByledalejTag' name='tagid_" + id + "' size='5' maxLength='6' value='" + tagValue + "' /></div>";
		eqp.children().eq(1).after(html);
		$("input.ByledalejTag[name=tagid_" + id + "]").change(function (event) {
			var target = event.target;
			var tagId = parseInt(target.name.replace("tagid_", ""), 10);
			var tagValue = target.value;
			var index = jQuery.inArray(tagId, idArray);
			if (index >= 0) {
				valueArray[index] = tagValue;
			} else {
				idArray.push(tagId);
				valueArray.push(tagValue);
			}
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

//------------------------------------
// main routine
//------------------------------------
HVStat.main1 = function () {
	//console.log("main1: document.readyState = " + document.readyState);
	var waitForDocumentInteractive = function () {
		if (document.readyState === "loading") {
			setTimeout(waitForDocumentInteractive, 10);
		} else {
			setTimeout(HVStat.main2, 1);
		}
	};
	waitForDocumentInteractive();
}

HVStat.main2 = function () {
	//console.log("main2: document.readyState = " + document.readyState);
	// store DOM caches
	HVStat.popupElement = document.getElementById("popup_box");
	HVStat.quickcastBarElement = document.getElementById("quickbar");
	HVStat.battleLogElement = document.getElementById("togpane_log");
	HVStat.monsterPaneElement = document.getElementById("monsterpane");
	HVStat.charHpGaugeElement = document.getElementsByTagName("img")[2];
	HVStat.charMpGaugeElement = document.getElementsByTagName("img")[5];
	HVStat.charSpGaugeElement = document.getElementsByTagName("img")[8];
	HVStat.charOcGaugeElement = document.getElementsByTagName("img")[11];

	// store static values
	HVStat.isCharacterPage = !!document.getElementById("pattrform");
	HVStat.isRiddlePage = !!document.getElementById("riddleform");
	HVStat.usingHVFont = document.getElementsByClassName('fd10')[0].textContent !== "Health points";
	HVStat.currHpRate = HVStat.getGaugeRate(HVStat.charHpGaugeElement, HVStat.charGaugeMaxWidth);
	HVStat.currMpRate = HVStat.getGaugeRate(HVStat.charMpGaugeElement, HVStat.charGaugeMaxWidth);
	HVStat.currSpRate = HVStat.getGaugeRate(HVStat.charSpGaugeElement, HVStat.charGaugeMaxWidth);
	HVStat.currOcRate = HVStat.getGaugeRate(HVStat.charOcGaugeElement, HVStat.charGaugeMaxWidth);
	HVStat.currHpPercent = Math.floor(HVStat.currHpRate * 100);
	HVStat.currMpPercent = Math.floor(HVStat.currMpRate * 100);
	HVStat.currSpPercent = Math.floor(HVStat.currSpRate * 100);
	HVStat.duringBattle = !!HVStat.battleLogElement;
	HVStat.isBattleOver = !!document.querySelector("#battleform div.btcp");

	// processes not require IndexedDB and not alert/confirm immediately
	if (_settings.isChangePageTitle && document.title === "The HentaiVerse") {
		document.title = _settings.customPageTitle;
	}
	if (!HVStat.isChrome && !document.getElementById("cssdiv")) {
		GM_addStyle(GM_getResourceText("jQueryUICSS"));
		var a = document.createElement("div");
		a.setAttribute("id", "cssdiv");
		a.setAttribute("style", "visibility:hidden");
		document.documentElement.appendChild(a);
	}
	initUI();
	if (!HVStat.usingHVFont && _settings.isShowEquippedSet) {
		SetDisplay();
	}
	if (_settings.isShowSidebarProfs) {
		showSidebarProfs();
	}
	if (HVStat.duringBattle) {
		// store static values
		HVStat.numberOfMonsters = document.querySelectorAll("#monsterpane > div").length;
		HVStat.buildBattleCommandMap();
		HVStat.buildBattleCommandMenuItemMap();

		if (_settings.isHighlightQC) {
			HVStat.highlightQuickcast();
		}
		if (_settings.isShowPowerupBox) {
			displayPowerupBox();
		}
		if (_settings.isShowDivider) {
			addBattleLogDividers();
		}
		if (_settings.isShowHighlight) {
			setLogCSS();
			highlightLogText();
		}
		if (_settings.isShowSelfDuration) {
			showSelfEffectsDuration();
		}
		if (_settings.isShowMonsterNumber) {
			showMonsterNumber();
		}
		if (_settings.isShowScanButton || _settings.isShowSkillButton) {
			HVStat.showScanAndSkillButtons();
		}
		if (_settings.isShowMonsterDuration) {
			showMonsterEffectsDuration();
		}
	} else {
		localStorage.removeItem(HV_ROUND);
		if (!HVStat.isRiddlePage) {
			HVStat.resetHealthWarningStates();
		}
		// equipment tag
		if (HVStat.isEquipmentPage && _settings.isShowTags[0]) {
			TaggingItems(false);
		}
		if (HVStat.isInventoryPage && _settings.isShowTags[5]) {
			TaggingItems(true);
		}
		if (HVStat.isShopPage && _settings.isShowTags[1]) {
			TaggingItems(false);
		}
		if (HVStat.isItemWorldPage && _settings.isShowTags[2]) {
			TaggingItems(false);
		}
		if (HVStat.isMoogleWrite && _settings.isShowTags[3]) {
			$("#mailform #leftpane").children().eq(3).children().eq(1).click(TaggingItems);
		}
		if (HVStat.isForgePage && _settings.isShowTags[4]) {
			TaggingItems(false);
			if (_settings.isDisableForgeHotKeys) {
				document.onkeypress = null;
			}
		}
	}
	HVStat.registerScrollTargetMouseEventListeners();
	document.addEventListener("keydown", HVStat.documentKeydownEventHandler);
	setTimeout(HVStat.main3, 1);
}

HVStat.main3 = function () {
	//console.log("main3: document.readyState = " + document.readyState);
	// open database
	HVStat.openIndexedDB(HVStat.main4);
}

HVStat.main4 = function () {
	//console.log("main4: document.readyState = " + document.readyState);
	// processes require IndexedDB and not alert/confirm immediately
	var waitForDocumentComplete = function () {
		if (document.readyState !== "complete") {
			setTimeout(waitForDocumentComplete, 10);
		} else {
			setTimeout(HVStat.main5, 1);
		}
	};
	waitForDocumentComplete();
}

HVStat.main5 = function () {
	//console.log("main5: document.readyState = " + document.readyState);
	// processes require IndexedDB or alert/confirm immediately
	if (HVStat.duringBattle) {
		HVStat.transaction = HVStat.idb.transaction(["MonsterScanResults", "MonsterSkills"], "readwrite");

		collectRoundInfo();		// using alert -- should be split to display part and warning part
		if ((_round !== null) && (_round.currRound > 0) && _settings.isShowRoundCounter) {
			showRoundCounter();	// requires _round
		}
		if ((_round !== null) && (HVStat.monsters.length > 0)){
			showMonsterStats();	// requires _round, IndexedDB
		}
		if (_settings.isShowStatsPopup) {
			registerEventHandlersForMonsterPopup();	// requires _round, IndexedDB
		}
		if (_settings.warnMode[_round.battleType]) {
			HVStat.warnHealthStatus();		// using alert
		}
		if (_settings.isMainEffectsAlertSelf) {
			AlertEffectsSelf();		// using alert
		}
		if (_settings.isMainEffectsAlertMonsters) {
			AlertEffectsMonsters();		// using alert
		}
		if (HVStat.isBattleOver) {
			if (_settings.isShowEndStats) {
				showBattleEndStats();	// requires _round
			}
			saveStats();
			_round.reset();
		}
	} else {
		if (_settings.isColumnInventory && HVStat.isBattleItemsPage) {
			initItemsView();
		} else if (HVStat.isCharacterPage) {
			collectCurrentProfsData();
		} else if (HVStat.isShrinePage) {
			if (_settings.isTrackShrine) {
				captureShrine();
			}
			if (HVStat.isChrome) {
				window.document.onkeydown = null;	// workaround to make enable SPACE key
			}
		}
		if ((_settings.isStartAlert || _settings.isShowEquippedSet) && !HVStat.usingHVFont) {
			FindSettingsStats();
		}
		if (_settings.isStartAlert && !HVStat.usingHVFont) {
			StartBattleAlerts();
		}
	}
	var invAlert = localStorage.getItem(HV_EQUIP);
	var invFull = (invAlert === null) ? false : JSON.parse(invAlert);
	if (invFull) inventoryWarning();
}

//------------------------------------
// execute
//------------------------------------
HVStat.main1();
