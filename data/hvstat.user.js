// ==UserScript==
// @name            HV Statistics, Tracking, and Analysis Tool
// @namespace       HV STAT
// @description     Collects data, analyzes statistics, and enhances the interface of the HentaiVerse
// @include         http://hentaiverse.org/*
// @exclude         http://hentaiverse.org/pages/showequip*
// @exclude         http://hentaiverse.org/?login*
// @include         http://alt.hentaiverse.org/*
// @exclude         http://alt.hentaiverse.org/pages/showequip*
// @exclude         http://alt.hentaiverse.org/?login*
// @author          Various (http://forums.e-hentai.org/index.php?showtopic=79552)
// @version         5.6.8.2
// @require         scripts/util.js
// @require         scripts/browser.js
// @require         scripts/hv.js
// @grant           GM_getResourceText
// @grant           GM_getResourceURL
// @grant           GM_addStyle
// @resource        battle-log-type0.css                        css/battle-log-type0.css
// @resource        battle-log-type1.css                        css/battle-log-type1.css
// @resource        hide-logo.css                               css/hide-logo.css
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
// @resource        monster-popup.html                          html/monster-popup.html
// @resource        overview-pane.html                          html/overview-pane.html
// @resource        proficiency-table.html                      html/proficiency-table.html
// @resource        settings-pane.html                          html/settings-pane.html
// @resource        shrine-pane.html                            html/shrine-pane.html
// @resource        drops-display-table.json                    json/drops-display-table.json
// @resource        hvstat-injection.js                         scripts/hvstat-injection.js
// @resource        hvstat-migration.js                         scripts/hvstat-migration.js
// @resource        hvstat-noncombat.js                         scripts/hvstat-noncombat.js
// @resource        hvstat-ui.js                                scripts/hvstat-ui.js
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
// HV STAT object
//------------------------------------
var hvStat = {
	version: "5.6.8.2",
	imageResources: [
		new browser.I("images/", "channeling.png", "css/images/"),
		new browser.I("images/", "healthpot.png", "css/images/"),
		new browser.I("images/", "manapot.png", "css/images/"),
		new browser.I("images/", "spiritpot.png", "css/images/"),
	],
	isStyleAdded: false,
	addStyle: function () {
		if (!this.isStyleAdded) {
			browser.extension.style.addFromResource("css/", "hvstat.css", this.imageResources);
			if (hvStat.settings.doesHideLogo) {
				browser.extension.style.add("img.cw{visibility:hidden;}");
			}
			this.isStyleAdded = true;
		}
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
		return date.toLocaleDateString() + " " + date.toLocaleTimeString();
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
		if (days >= 2) {
			return days + " days ago";
		} else if (days === 1) {
			return "1 day ago";
		} else if (hours >= 2) {
			return "about " + hours + " hours ago";
		} else if (hours === 1) {
			return "about an hour ago";
		} else if (mins >= 2) {
			return mins + " minites ago";
		} else if (mins === 1) {
			return "about a minite ago";
		} else {
			return "less than a minute ago";
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
	new hvStat.C("PFUDOR", "PFUDOR"),
]);

hvStat.constant.battleType = hvStat.constant.factory([
	new hvStat.C("HOURLY_ENCOUNTER", "Random Encounter"),
	new hvStat.C("ARENA", "Arena"),
	new hvStat.C("GRINDFEST", "Grindfest"),
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
		doesHideLogo: false,
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

		// Tracking
		isTrackStats: true,
		isTrackShrine: false,
		isTrackItems: false,
		noTrackCredits: false,
		noTrackItems: false,
		noTrackCrystals: false,
		noTrackMonsterFood: false,
		noTrackTokens: false,
		noTrackArtifacts: false,
		noTrackEquip: false,

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
		isAlertGemHealth: true,
		isAlertGemMana: true,
		isAlertGemSpirit: true,
		isAlertGemMystic: true,
		isAlertOverchargeFull: false,
		isWarnAbsorbTrigger: false,
		isWarnSparkTrigger: true,
		isWarnSparkExpire: true,
		alertWhenChannelingIsGained: false,
		alertWhenCooldownExpiredForDrain: false,
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
		doesScaleMonsterGauges: false,
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
	from_5_6_5: function () {
		delete hvStat.settings.enableShrineKeyPatch;
		hvStat.storage.settings.save();
	},
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
	initialize: function () {
		if (hvStat.settings.isShowEquippedSet) {
			hvStat.gadget.equippedSet.create();
		}
		if (hvStat.settings.isShowSidebarProfs) {
			hvStat.gadget.proficiencyPopupIcon.create();
		}
		if (hvStat.characterStatus.didReachInventoryLimit) {
			hvStat.gadget.inventoryWarningIcon.create();
		}
		hvStat.gadget.wrenchIcon.create();
	},
};

hvStat.gadget.wrenchIcon = {
	create: function () {
		var stuffBox = hv.elementCache.stuffBox;
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
		var leftBar = hv.elementCache.leftBar;
		var table = document.createElement("table");
		table.className = "cit";
		var tbody = table.appendChild(document.createElement("tbody"));
		var tr = tbody.appendChild(document.createElement("tr"));
		var td = tr.appendChild(document.createElement("td"));
		var div0 = td.appendChild(document.createElement("div"));
		div0.className = "fd4";
		var div1 = div0.appendChild(document.createElement("div"));
		div1.style.cssText = hv.elementCache.infoTables[0].children[0].children[0].children[0].children[0].children[0].style.cssText;
		div1.textContent = "Equipped set: " + hvStat.characterStatus.equippedSet;
		leftBar.insertBefore(table, null);
	},
};

hvStat.gadget.proficiencyPopupIcon = {
	icon: null,
	popup: null,
	create: function () {
		if (!hvStat.characterStatus.areProficienciesCaptured) {
			return;
		}
		this.icon = document.createElement("div");
		this.icon.id = "hvstat-proficiency-popup-icon";
		this.icon.className = "ui-corner-all";
		this.icon.textContent = "Proficiency";
		this.icon.addEventListener("mouseover", this.onmouseover);
		this.icon.addEventListener("mouseout", this.onmouseout);
		var leftBar = hv.elementCache.leftBar;
		leftBar.parentNode.insertBefore(this.icon, leftBar.nextSibling);
	},
	createPopup: function () {
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
		this.icon.appendChild(this.popup);
	},
	onmouseover: function (event) {
		if (!hvStat.gadget.proficiencyPopupIcon.popup) {
			hvStat.gadget.proficiencyPopupIcon.createPopup();
		}
		hvStat.gadget.proficiencyPopupIcon.popup.style.visibility = "visible";
	},
	onmouseout: function (event) {
		if (!hvStat.gadget.proficiencyPopupIcon.popup) {
			hvStat.gadget.proficiencyPopupIcon.createPopup();
		}
		hvStat.gadget.proficiencyPopupIcon.popup.style.visibility = "hidden";
	},
};

hvStat.gadget.inventoryWarningIcon = {
	create: function () {
		var stuffBox = hv.elementCache.stuffBox;
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
};

//------------------------------------
// Keyboard Management
//------------------------------------
hvStat.keyboard = {};

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
		this.defenseLevel.CRUSHING = dl && dl.id || spec.defCrushing;
		dl = hvStat.constant.defenseLevel[spec.defSlashing.toUpperCase()];
		this.defenseLevel.SLASHING = dl && dl.id || spec.defSlashing;
		dl = hvStat.constant.defenseLevel[spec.defPiercing.toUpperCase()];
		this.defenseLevel.PIERCING = dl && dl.id || spec.defPiercing;
		dl = hvStat.constant.defenseLevel[spec.defFire.toUpperCase()];
		this.defenseLevel.FIRE = dl && dl.id || spec.defFire;
		dl = hvStat.constant.defenseLevel[spec.defCold.toUpperCase()];
		this.defenseLevel.COLD = dl && dl.id || spec.defCold;
		dl = hvStat.constant.defenseLevel[spec.defElec.toUpperCase()];
		this.defenseLevel.ELEC = dl && dl.id || spec.defElec;
		dl = hvStat.constant.defenseLevel[spec.defWind.toUpperCase()];
		this.defenseLevel.WIND = dl && dl.id || spec.defWind;
		dl = hvStat.constant.defenseLevel[spec.defHoly.toUpperCase()];
		this.defenseLevel.HOLY = dl && dl.id || spec.defHoly;
		dl = hvStat.constant.defenseLevel[spec.defDark.toUpperCase()];
		this.defenseLevel.DARK = dl && dl.id || spec.defDark;
		dl = hvStat.constant.defenseLevel[spec.defSoul.toUpperCase()];
		this.defenseLevel.SOUL = dl && dl.id || spec.defSoul;
		dl = hvStat.constant.defenseLevel[spec.defVoid.toUpperCase()];
		this.defenseLevel.VOID = dl && dl.id || spec.defVoid;

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
	var reqDelete = window.indexedDB.deleteDatabase("HVStat");
	reqDelete.onsuccess = function (event) {
		alert("Your database has been deleted.");
	};
	reqDelete.onerror = function (event) {
		alert("Error: Failed to delete your database");
	};
	reqDelete.onblocked = function (event) {
		alert("Blocked: Please wait for a while or close the browser.");
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
    if (oldVersion < 3) {
        // Update EquipmentDrops - Adding Date index
		try {
			store = versionChangeTransaction.objectStore("EquipmentDrops");
		} catch (e) {
			alert(alertMessage);
			console.log(e.message + "\n" + e.stack);
		}
        try {
			store.createIndex("ix_date", "timeStamp", { unique: false });
		} catch (e) {
			alert(alertMessage);
			console.log(e.message + "\n" + e.stack);
		}
    }
};

hvStat.database.openIndexedDB = function (callback) {
	var errorMessage;

	var idbVersion = 3; // Must be an integer
	var idbOpenDBRequest = window.indexedDB.open("HVStat", idbVersion);
	idbOpenDBRequest.onerror = function (event) {
		errorMessage = event.target.webkitErrorMessage || event.target.error.message || event.target.error.name || "";
		errorMessage = "Database open error: " + errorMessage;
		console.log(event.target);
		alert(errorMessage);
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
		};
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
					};
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
					};
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
			obj.defenseLevel && obj.defenseLevel.CRUSHING !== null ? obj.defenseLevel.CRUSHING : "",
			obj.defenseLevel && obj.defenseLevel.SLASHING !== null ? obj.defenseLevel.SLASHING : "",
			obj.defenseLevel && obj.defenseLevel.PIERCING !== null ? obj.defenseLevel.PIERCING : "",
			obj.defenseLevel && obj.defenseLevel.FIRE !== null ? obj.defenseLevel.FIRE : "",
			obj.defenseLevel && obj.defenseLevel.COLD !== null ? obj.defenseLevel.COLD : "",
			obj.defenseLevel && obj.defenseLevel.ELEC !== null ? obj.defenseLevel.ELEC : "",
			obj.defenseLevel && obj.defenseLevel.WIND !== null ? obj.defenseLevel.WIND : "",
			obj.defenseLevel && obj.defenseLevel.HOLY !== null ? obj.defenseLevel.HOLY : "",
			obj.defenseLevel && obj.defenseLevel.DARK !== null ? obj.defenseLevel.DARK : "",
			obj.defenseLevel && obj.defenseLevel.SOUL !== null ? obj.defenseLevel.SOUL : "",
			obj.defenseLevel && obj.defenseLevel.VOID !== null ? obj.defenseLevel.VOID : "",
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
		var spiritCommand = util.document.body.querySelector('#ckey_spirit');
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
				hvStat.roundContext.aDomino[meleeHitCount]++;
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
		regex: /^(.+?) (hits|crits|blasts) (?!you)(.+?) for (\d+(?:\.\d+)?)(?: (.+?))? damage(?: \((\d+)% resisted\))?\.?$/,
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
			var abilityName = message.regexResult[1];
			if (hvStat.settings.alertWhenCooldownExpiredForDrain && abilityName === "Drain") {
				hvStat.battle.warningSystem.enqueueAlert(message.regexResult[0]);
			}
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
				if (hvStat.settings.isAlertGemHealth && message.regexResult[2] === "Health Gem") {
					hvStat.battle.warningSystem.enqueueAlert("You picked up a " + message.regexResult[2] + ".");
				} else if (hvStat.settings.isAlertGemMana && message.regexResult[2] === "Mana Gem") {
					hvStat.battle.warningSystem.enqueueAlert("You picked up a " + message.regexResult[2] + ".");
				} else if (hvStat.settings.isAlertGemSpirit && message.regexResult[2] === "Spirit Gem") {
					hvStat.battle.warningSystem.enqueueAlert("You picked up a " + message.regexResult[2] + ".");
				} else if (hvStat.settings.isAlertGemMystic && message.regexResult[2] === "Mystic Gem") {
					hvStat.battle.warningSystem.enqueueAlert("You picked up a " + message.regexResult[2] + ".");
				} 
			}
			// TODO: Collect statistics
		},
	},
	SCAN: {
		regex: /^Scanning (.*)\.\.\.\s+HP: [^\s]+\/([^\s]+)\s+MP: [^\s]+\/[^\s]+(?:\s+SP: [^\s]+\/[^\s]+)? Monster Class: (.+?)(?:, Power Level (\d+))? Monster Trainer:(?: (.+))? Melee Attack: (.+) Fire: ([\-\+]?\d+)% Cold: ([\-\+]?\d+)% Elec: ([\-\+]?\d+)% Wind: ([\-\+]?\d+)% Holy: ([\-\+]?\d+)% Dark: ([\-\+]?\d+)% Crushing: ([\-\+]?\d+)% Slashing: ([\-\+]?\d+)% Piercing: ([\-\+]?\d+)%/,
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
								monster.showStatus();
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
				if (hvStat.settings.isTrackItems && !hvStat.settings.noTrackCredits) {
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
				if (hvStat.settings.isTrackItems && !hvStat.settings.noTrackItems) {
					hvStat.statistics.drops.addItem(stuffName, hvStat.constant.dropType.MONSTER_DROP.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			case "#ba05b4":	// Crystal
				if (hvStat.settings.isTrackItems && !hvStat.settings.noTrackCrystals) {
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
				if (hvStat.settings.isTrackItems && !hvStat.settings.noTrackMonsterFood) {
					hvStat.statistics.drops.addMonsterFood(stuffName, hvStat.constant.dropType.MONSTER_DROP.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			case "#254117":	// Token
				if (hvStat.settings.isTrackItems && !hvStat.settings.noTrackTokens) {
					hvStat.statistics.drops.addToken(stuffName, hvStat.constant.dropType.MONSTER_DROP.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			case "#0000ff":	// Artifact or Collectable
				hvStat.roundContext.artifacts++;
				hvStat.roundContext.lastArtName = stuffName;
				if (hvStat.settings.isTrackItems && !hvStat.settings.noTrackArtifacts) {
					hvStat.statistics.drops.addArtifact(stuffName, hvStat.constant.dropType.MONSTER_DROP.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			case "#ff0000":	// Equipment
				hvStat.roundContext.equips++;
				hvStat.roundContext.lastEquipName = stuffName;
				if (hvStat.settings.isTrackItems && !hvStat.settings.noTrackEquip) {
					hvStat.statistics.drops.addEquipment(stuffName, hvStat.constant.dropType.MONSTER_DROP.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName,
						hvStat.roundContext.arenaNum, hvStat.roundContext.currRound);
				}
				break;
			case "#461b7e":	// Trophy
				if (hvStat.settings.isTrackItems && !hvStat.settings.noTrackTrophies) {
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
				if (hvStat.settings.isTrackItems && !hvStat.settings.noTrackItems) {
					hvStat.statistics.drops.addItem(stuffName, hvStat.constant.dropType.ARENA_CLEAR_BONUS.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			case "#ba05b4":	// Crystal
				if (hvStat.settings.isTrackItems && !hvStat.settings.noTrackCrystals) {
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
				if (hvStat.settings.isTrackItems && !hvStat.settings.noTrackMonsterFood) {
					hvStat.statistics.drops.addItem(stuffName, hvStat.constant.dropType.ARENA_CLEAR_BONUS.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			case "#254117":	// Token
				if (hvStat.settings.isTrackItems && !hvStat.settings.noTrackTokens) {
					hvStat.statistics.drops.addToken(stuffName, hvStat.constant.dropType.ARENA_CLEAR_BONUS.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			case "#0000ff":	// Artifact or Collectable
				hvStat.roundContext.artifacts++;
				hvStat.roundContext.lastArtName = stuffName;
				if (hvStat.settings.isTrackItems && !hvStat.settings.noTrackArtifacts) {
					hvStat.statistics.drops.addArtifact(stuffName, hvStat.constant.dropType.ARENA_CLEAR_BONUS.id,
						hvStat.characterStatus.difficulty.id, hvStat.roundContext.battleTypeName);
				}
				break;
			case "#ff0000":	// Equipment
				hvStat.roundContext.equips++;
				hvStat.roundContext.lastEquipName = stuffName;
				if (hvStat.settings.isTrackItems && !hvStat.settings.noTrackEquip) {
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
				if (hvStat.settings.isTrackItems && !hvStat.settings.noTrackTokens) {
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
				this.element.click();
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
	this.element = this.elementId && util.document.body.querySelector("#" + this.elementId) || null;

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
			this.parent.element.click();
		}
	},
	close: function () {
		if (this.opened) {
			this.parent.element.click();
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
	this.element = this.elementId && util.document.body.querySelector('#' + this.elementId) || null;
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
		this.element.click();
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
		badgeBase.addEventListener("mouseover", function (event) {
			util.event.mouseOver(effectIcon);
		});
		badgeBase.addEventListener("mouseout", function (event) {
			util.event.mouseOut(effectIcon);
		});
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
		var effectIcons = hv.battle.elementCache.monsterEffectIcons;
		for (var i = 0; i < effectIcons.length; i++) {
			var badge = this.create(effectIcons[i]);
			if (badge) {
				badge.className += " hvstat-duration-badge-monster";
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
		badgeBase.addEventListener("mouseover", function (event) {
			util.event.mouseOver(effectIcon);
		});
		badgeBase.addEventListener("mouseout", function (event) {
			util.event.mouseOut(effectIcon);
		});
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
			if (badge) {
				badge.className += " hvstat-effect-stack-level-badge-character";
			}
		}
	},
	showForMonsters: function () {
		var effectIcons = hv.battle.elementCache.monsterEffectIcons;
		for (var i = 0; i < effectIcons.length; i++) {
			var badge = this.create(effectIcons[i]);
			if (badge) {
				badge.className += " hvstat-effect-stack-level-badge-monster";
			}
		}
	}
};

hvStat.battle.enhancement.powerupBox = {
	// Adds a Powerup box to the Battle screen.
	// Creates a shortcut to the powerup if one is available.
	powerup: null,
	create: function () {
		var battleMenu = util.document.body.querySelector('.btp'),
			powerBox = document.createElement("div");
		this.powerup = util.document.body.querySelector('#ikey_p');

		powerBox.className = "hvstat-powerup-box";
		if (!this.powerup) {
			powerBox.className += " hvstat-powerup-box-none";
			powerBox.textContent = "P";
		} else {
			var powerInfo = this.powerup.getAttribute("onmouseover");
			if (powerInfo.indexOf('Health') > -1) {
				powerBox.className += " hvstat-powerup-box-health";
			} else if (powerInfo.indexOf('Mana') > -1) {
				powerBox.className += " hvstat-powerup-box-mana";
			} else if (powerInfo.indexOf('Spirit') > -1) {
				powerBox.className += " hvstat-powerup-box-spirit";
			} else if (powerInfo.indexOf('Mystic') > -1) {
				powerBox.className += " hvstat-powerup-box-channeling";
			}
			if (!hv.battle.isRoundFinished) {
				powerBox.addEventListener("click", this.onclick);
			}
			powerBox.addEventListener("mouseover", this.onmouseover);
			powerBox.addEventListener("mouseout", this.onmouseout);
		}
		battleMenu.appendChild(powerBox);
	},
	onclick: function (event) {
		hvStat.battle.command.menuItemMap["PowerupGem"].select();
	},
	onmouseover: function (event) {
		var powerup = hvStat.battle.enhancement.powerupBox.powerup;
		if (powerup) {
			util.event.mouseOver(powerup);
		}
	},
	onmouseout: function (event) {
		var powerup = hvStat.battle.enhancement.powerupBox.powerup;
		if (powerup) {
			util.event.mouseOut(powerup);
		}
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
			monster.click();
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
			monster.click();
		});
		return button;
	},
};

hvStat.battle.enhancement.monsterLabel = {
	replaceWithNumber: function () {
		var targets = hv.battle.elementCache.monsterPane.querySelectorAll('div.btm1 > div.btm2 > div > img');
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
			this.monsters[i] = new hvStat.battle.monster.Monster(i);
			if (hvStat.roundContext.monsters[i]) {
				this.monsters[i].setFromValueObject(hvStat.roundContext.monsters[i]);
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
	setScale: function () {
		var i, highestHp = -1;
		for (i = 0; i < this.monsters.length; i++) {
			var hp = this.monsters[i].maxHp;
			if (hp && highestHp < hp) {
				highestHp = hp;
			}
		}
		for (i = 0; i < this.monsters.length; i++) {
			var monster = this.monsters[i];
			monster.gaugeScale = monster.maxHp / highestHp;
		}
	},
	scaleGaugesAll: function () {
		for (var i = 0; i < this.monsters.length; i++) {
			this.monsters[i].scaleGauges();
		}
	},
	showHealthAll: function () {
		for (var i = 0; i < this.monsters.length; i++) {
			this.monsters[i].showHealth();
		}
	},
	showStatusAll: function () {
		for (var i = 0; i < this.monsters.length; i++) {
			this.monsters[i].showStatus();
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
	_templateHTML: null,
	get templateHTML() {
		if (!this._templateHTML) {
			this._templateHTML = browser.extension.getResourceText("html/", "monster-popup.html");
		}
		return this._templateHTML;
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
		hv.elementCache.popup.style.width = "290px";
		hv.elementCache.popup.style.height = "auto";
		hv.elementCache.popup.innerHTML = hvStat.battle.monster.popup.templateHTML;
		hvStat.battle.monster.monsters[index].setPopupContents(hv.elementCache.popup);
		var popupTopOffset = hv.battle.elementCache.monsterPane.offsetTop +
			index * ((hv.battle.elementCache.monsterPane.scrollHeight - hv.elementCache.popup.scrollHeight) / 9);
		var popupLeftOffset = hvStat.settings.isMonsterPopupPlacement ? 1245 : 535;
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
		this._defenseLevel[damageTypeId] = hvStat.constant.defenseLevel[(vo.defenseLevel || vo.defenceLevel)[damageTypeId]] || vo.defenseLevel[damageTypeId];
	}
	for (damageTypeId in this._defenseLevel) {
		switch (this._defenseLevel[damageTypeId]) {
		// HV 0.76 or earlier
		case hvStat.constant.defenseLevel.WEAK:
			this._defWeak.push(hvStat.constant.damageType[damageTypeId]);
			break;
		case hvStat.constant.defenseLevel.AVERAGE:
			// Do nothing
			break;
		case hvStat.constant.defenseLevel.RESISTANT:
			this._defResistant.push(hvStat.constant.damageType[damageTypeId]);
			break;
		case hvStat.constant.defenseLevel.IMPERVIOUS:
			this._defImpervious.push(hvStat.constant.damageType[damageTypeId]);
			break;
		// HV 0.77 or later
		default:
			var mitigation = parseFloat(this._defenseLevel[damageTypeId]);
			if (!isNaN(mitigation)) {
				if (mitigation <= 0) {
					this._defWeak.push(hvStat.constant.damageType[damageTypeId]);
				} else if (mitigation <= 50) {
					// Do nothing
				} else if (mitigation <= 75) {
					this._defResistant.push(hvStat.constant.damageType[damageTypeId]);
				} else {
					this._defImpervious.push(hvStat.constant.damageType[damageTypeId]);
				}
			}
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
			if (!isNaN(parseFloat(this._defenseLevel[i]))) {
				vo.defenseLevel[i] = this._defenseLevel[i];
			} else {
				vo.defenseLevel[i] = this._defenseLevel[i] && this._defenseLevel[i].id || null;
			}
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

		vo.defenseLevel.FIRE = String(Number(regexResult[7]));
		vo.defenseLevel.COLD = String(Number(regexResult[8]));
		vo.defenseLevel.ELEC = String(Number(regexResult[9]));
		vo.defenseLevel.WIND = String(Number(regexResult[10]));
		vo.defenseLevel.HOLY = String(Number(regexResult[11]));
		vo.defenseLevel.DARK = String(Number(regexResult[12]));
		vo.defenseLevel.CRUSHING = String(Number(regexResult[13]));
		vo.defenseLevel.SLASHING = String(Number(regexResult[14]));
		vo.defenseLevel.PIERCING = String(Number(regexResult[15]));
		vo.defenseLevel.SOUL = null;
		vo.defenseLevel.VOID = null;

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
	this.gaugeScale = null;
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
	showStatus: function () {
		var that = this;
		if (that.isDead || !hvStat.settings.showMonsterInfoFromDB) {
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
					html = '<div class="hvstat-monster-status-on-custom-font">' + statsHtml + '</div>';
					var nameElement = nameInnerFrameElement.children[0];
					var name = nameElement.innerHTML;
					nameOuterFrameElement.style.width = "auto"; // Tweak for Firefox
					nameInnerFrameElement.style.width = "auto"; // Tweak for Firefox
					nameElement.innerHTML = name + html;
					nameElement.style.whiteSpace = "nowrap";
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
	setPopupContents: function (popup) {
		var tdName = popup.querySelector('.hvstat-monster-popup-name td');
		if (tdName) tdName.textContent = this._name;

		var tdId = popup.querySelector('.hvstat-monster-popup-id td');
		if (tdId) tdId.textContent = this._id;

		var tdHealth = popup.querySelector('.hvstat-monster-popup-health td');
		if (tdHealth) tdHealth.textContent = this.healthPoints.toFixed(1) + ' / ' + this._maxHp.toFixed(1);

		var tdMana = popup.querySelector('.hvstat-monster-popup-mana td');
		if (tdMana) tdMana.textContent = (this.magicPointRate * 100).toFixed(2) + '%';

		var tdSpirit = popup.querySelector('.hvstat-monster-popup-spirit td');
		if (tdSpirit) {
			if (!this.hasSpiritPoint) {
				tdSpirit.className += " hvstat-display-none";
			} else {
				tdSpirit.textContent = (this.spiritPointRate * 100).toFixed(2) + '%';
			}
		}

		var tdClass = popup.querySelector('.hvstat-monster-popup-class td');
		var trClass = tdClass.parentNode;
		var tdTrainer = popup.querySelector('.hvstat-monster-popup-trainer td');
		var trTrainer = tdTrainer.parentNode;
		var tdPowerLevel = popup.querySelector('.hvstat-monster-popup-power-level td');
		var trPowerLevel = tdPowerLevel.parentNode;
		var tdMeleeAttack = popup.querySelector('.hvstat-monster-popup-melee-attack td');
		var trMeleeAttack = tdMeleeAttack.parentNode;
		var tdMagicSkills = popup.querySelector('.hvstat-monster-popup-magic-skills td');
		var trMagicSkills = tdMagicSkills.parentNode;
		var tdSpiritSkill = popup.querySelector('.hvstat-monster-popup-spirit-skill td');
		var trSpiritSkill = tdSpiritSkill.parentNode;
		var trMitigationsTitle = popup.querySelector('.hvstat-monster-popup-mitigations-title');
		var trMitigations = popup.querySelector('.hvstat-monster-popup-mitigations');
		var tdMitigations = popup.querySelectorAll('.hvstat-monster-popup-mitigations table td');
		var tdWeaknesses = popup.querySelector('.hvstat-monster-popup-weaknesses td');
		var trWeaknesses = tdWeaknesses.parentNode;
		var tdResistances = popup.querySelector('.hvstat-monster-popup-resistances td');
		var trResistances = tdResistances.parentNode;
		var tdImperviousnesses = popup.querySelector('.hvstat-monster-popup-imperviousnesses td');
		var trImperviousnesses = tdImperviousnesses.parentNode;
		var tdDebuffsAffected = popup.querySelector('.hvstat-monster-popup-debuffs-affected td');
		var trDebuffsAffected = tdDebuffsAffected.parentNode;

		if (!this.doesScanResultExist) {
			if (trClass) trClass.className += " hvstat-display-none";
			if (trTrainer) trTrainer.className += " hvstat-display-none";
			if (trPowerLevel) trPowerLevel.className += " hvstat-display-none";
			if (trMeleeAttack) trMeleeAttack.className += " hvstat-display-none";
			if (trMitigationsTitle) trMitigationsTitle.className += " hvstat-display-none";
			if (trMitigations) trMitigations.className += " hvstat-display-none";
			if (trWeaknesses) trWeaknesses.className += " hvstat-display-none";
			if (trResistances) trResistances.className += " hvstat-display-none";
			if (trImperviousnesses) trImperviousnesses.className += " hvstat-display-none";
			if (trDebuffsAffected) trDebuffsAffected.className += " hvstat-display-none";
		} else {
			if (tdClass) tdClass.textContent = this._scanResult.monsterClass ? this._scanResult.monsterClass : "";
			if (tdTrainer) tdTrainer.textContent = this._scanResult.trainer ? this._scanResult.trainer : "";
			if (tdPowerLevel) {
				if (!this._scanResult.powerLevel) {
					trPowerLevel.className += " hvstat-display-none";
				} else {
					tdPowerLevel.textContent = this._scanResult.powerLevel;
				}
			}
			if (tdMeleeAttack) tdMeleeAttack.textContent = this._scanResult.meleeAttack ? this._scanResult.meleeAttack : "";

			if (tdMitigations) {
				var mit = this._scanResult.defenseLevel;
				var mitArray = [mit.FIRE, mit.COLD, mit.ELEC, mit.WIND, mit.HOLY, mit.DARK, mit.CRUSHING, mit.SLASHING, mit.PIERCING];
				var isHV077Format = false;
				for (var i = 0; i < mitArray.length; i++) {
					var value = parseFloat(mitArray[i]);
					if (!isNaN(value)) {
						tdMitigations[i].textContent = String(value) + '%';
						isHV077Format = true;
					}
				}
				if (!isHV077Format) {
					trMitigationsTitle.className += " hvstat-display-none";
					trMitigations.className += " hvstat-display-none";
				}
			}

			if (tdWeaknesses) tdWeaknesses.textContent = this._scanResult.defWeak.length > 0 ? this._scanResult.getDefWeakString(false, true, 0) : "-";
			if (tdResistances) tdResistances.textContent = this._scanResult.defResistant.length > 0 ? this._scanResult.getDefResistantString(false, true, 0) : "-";
			if (tdImperviousnesses) tdImperviousnesses.textContent = this._scanResult.defImpervious.length > 0 ? this._scanResult.getDefImperviousString(false, true, 0) : "-";
			if (tdDebuffsAffected) tdDebuffsAffected.textContent = this._scanResult.debuffsAffected.length > 0 ? this._scanResult.debuffsAffected.join(", ") : "-";
		}

		if (tdMagicSkills) {
			var magicSkills = this.magicSkills;
			if (!magicSkills || magicSkills.length === 0) {
				trMagicSkills.className += " hvstat-display-none";
			} else {
				var magicSkillsHTML = "";
				var skillTable = this.magicSkillTable;
				var skillCount = 0;
				for (var attackType in skillTable) {
					if (skillTable[attackType].exists) {
						for (var damageType in skillTable[attackType].damageTable) {
							if (skillTable[attackType].damageTable[damageType]) {
								if (skillCount > 0) {
									magicSkillsHTML += '<br />';
								}
								magicSkillsHTML += hvStat.constant.attackType[attackType].name + '-' + hvStat.constant.damageType[damageType].name;
								skillCount++;
							}
						}
					}
				}
				tdMagicSkills.innerHTML = magicSkillsHTML;
			}
		}

		if (tdSpiritSkill) {
			if (!this.spiritSkill) {
				trSpiritSkill.className += " hvstat-display-none";
			} else {
				tdSpiritSkill.textContent = this.spiritSkill;
			}
		}

		var tdLastScan = popup.querySelector('.hvstat-monster-popup-last-scan td');
		if (tdLastScan) {
			if (!this.doesScanResultExist || !this._scanResult.lastScanDate) {
				tdLastScan.textContent = "Never";
			} else {
				tdLastScan.innerHTML = hvStat.util.getDateTimeString(this._scanResult.lastScanDate) + '<br />' +
					hvStat.util.getElapseFrom(this._scanResult.lastScanDate);
			}
		}
	},
	get gauges() {
		if (!this._gauges) {
			var allGauges = hv.battle.elementCache.monsterGauges;
			this._gauges = [];
			for (var i = 0; i < allGauges.length; i++) {
				var gauge = allGauges[i];
				if (gauge.parentNode.parentNode.parentNode.parentNode === this.baseElement) {
					this._gauges.push(gauge);
				}
			}
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
	getCssScaleXText: function (scaleX) {
		var s = "scaleX(" + scaleX + ")";
		var t = "transform: " + s + "; transform-origin: left;" +
			"-moz-transform: " + s + "; -moz-transform-origin: left;" +
			"-webkit-transform: " + s + "; -webkit-transform-origin: left;";
		return t;
	},
	scaleGauges: function () {
		if (hvStat.settings.doesScaleMonsterGauges && this.gaugeScale) {
			for (var i = 0; i < this.gauges.length; i++) {
				this.gauges[i].parentNode.style.cssText += this.getCssScaleXText(this.gaugeScale);
			}
		}
	},
	showHealth: function () {
		var that = this;
		if (that.isDead || !hvStat.settings.showMonsterHP && !hvStat.settings.showMonsterMP && !hvStat.settings.showMonsterSP) {
			return;
		}
		var div;
		if (hvStat.settings.showMonsterHP || hvStat.settings.showMonsterHPPercent) {
			div = document.createElement("div");
			if (hvStat.settings.doesScaleMonsterGauges && this.gaugeScale) {
				div.style.cssText += this.getCssScaleXText(1 / this.gaugeScale);
			}
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
			if (hvStat.settings.doesScaleMonsterGauges && this.gaugeScale) {
				div.style.cssText += this.getCssScaleXText(1 / this.gaugeScale);
			}
			div.className = "hvstat-monster-magic";
			div.textContent = (that.magicPointRate * 100).toFixed(1) + "%";
			this.gauges[1].parentNode.insertBefore(div, null);
		}
		if (hvStat.settings.showMonsterSP && this.hasSpiritPoint) {
			div = document.createElement("div");
			if (hvStat.settings.doesScaleMonsterGauges && this.gaugeScale) {
				div.style.cssText += this.getCssScaleXText(1 / this.gaugeScale);
			}
			div.className = "hvstat-monster-spirit";
			div.textContent = (that.spiritPointRate * 100).toFixed(1) + "%";
			this.gauges[2].parentNode.insertBefore(div, null);
		}
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
		var elements = hv.battle.elementCache.monsterEffectIcons;
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

//------------------------------------
// Battle - Keyboard
//------------------------------------
hvStat.battle.keyboard = {
	selectedSkillIndex: -1,	// -1: not selected, 0-2: selected
	documentKeydown: function (event) {
		var boundKeys, i, j;
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
			var startIndex = hvStat.battle.keyboard.selectedSkillIndex;
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
						hvStat.battle.keyboard.selectedSkillIndex = -1;
					} else {
						for (j = startIndex + increment;
								hvStat.settings.reverseSkillHotkeyTraversalOrder && 0 <= j ||
								!hvStat.settings.reverseSkillHotkeyTraversalOrder && j <= availableSkillMaxIndex;
								j += increment) {
							if (miSkills[j] && miSkills[j].available) {
								miSkills[j].select();
								hvStat.battle.keyboard.selectedSkillIndex = j;
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
		return String(numerator) + "/" + String(denominator) + " (" + String(hvStat.util.percentRatio(numerator, denominator, digits)) + "%)";
	}

	var f = hvStat.roundContext.sHits[0] + hvStat.roundContext.sHits[1] + hvStat.roundContext.depSpells[1] + hvStat.roundContext.sResists;
	var e = hvStat.roundContext.sHits[0] + hvStat.roundContext.sHits[1] + hvStat.roundContext.depSpells[1];
	var d = hvStat.roundContext.aHits[0] + hvStat.roundContext.aHits[1];
	var c = hvStat.roundContext.sHits[0] + hvStat.roundContext.sHits[1];
	var b = hvStat.roundContext.mHits[0] + hvStat.roundContext.mHits[1];
	var ab = hvStat.roundContext.aOffhands[0] + hvStat.roundContext.aOffhands[2];
	var a = "<b>Accuracy</b>: " + formatProbability(d, hvStat.roundContext.aAttempts, 2) + ", " +
		"<b>Crits</b>: " + formatProbability(hvStat.roundContext.aHits[1], d, 2) + ", " +
		"<b>Offhand</b>: " + formatProbability(ab, d, 2) + ", " +
		"<b>Domino</b>: " + formatProbability(hvStat.roundContext.aDomino[0], d, 2) + ", " +
		"<b>OverStrikes</b>: " + formatProbability(hvStat.roundContext.overStrikes, d, 2) + ", " +
		"<b>Coalesce</b>: " + formatProbability(hvStat.roundContext.coalesce, e, 2) + ", " +
		"<b>M. Accuracy</b>: " + formatProbability(e, f, 2) + ", " +
		"<b>Spell Crits</b>: " + formatProbability(hvStat.roundContext.sHits[1], c, 2) + ", " +
		"<b>Avg hit dmg</b>: " + hvStat.util.ratio(hvStat.roundContext.dDealt[0], hvStat.roundContext.aHits[0]).toFixed(2) + "|" + hvStat.util.ratio(hvStat.roundContext.dDealtSp[0], hvStat.roundContext.sHits[0]).toFixed(2) + ", " +
		"<b>Avg crit dmg</b>: " + hvStat.util.ratio(hvStat.roundContext.dDealt[1], hvStat.roundContext.aHits[1]).toFixed(2) + "|" + hvStat.util.ratio(hvStat.roundContext.dDealtSp[1], hvStat.roundContext.sHits[1]).toFixed(2) + ", " +
		"<b>Avg dmg</b>: " + hvStat.util.ratio(hvStat.roundContext.dDealt[0] + hvStat.roundContext.dDealt[1], d).toFixed(2) + "|" + hvStat.util.ratio(hvStat.roundContext.dDealtSp[0] + hvStat.roundContext.dDealtSp[1], c).toFixed(2) +
		"<hr style='height:1px;border:0;background-color:#333333;color:#333333' />" +
		"<b>Hits taken</b>: " + formatProbability(b, hvStat.roundContext.mAttempts, 2) + ", " +
		"<b>Missed</b>: " + formatProbability(hvStat.roundContext.pDodges, hvStat.roundContext.mAttempts, 2) + ", " +
		"<b>Evaded</b>: " + formatProbability(hvStat.roundContext.pEvades, hvStat.roundContext.mAttempts, 2) + ", " +
		"<b>Blocked</b>: " + formatProbability(hvStat.roundContext.pBlocks, hvStat.roundContext.mAttempts, 2) + ", " +
		"<b>Parried</b>: " + formatProbability(hvStat.roundContext.pParries, hvStat.roundContext.mAttempts, 2) + ", " +
		"<b>Resisted</b>: " + formatProbability(hvStat.roundContext.pResists, hvStat.roundContext.mAttempts, 2) + ", " +
		"<b>Crits taken</b>: " + formatProbability(hvStat.roundContext.mHits[1], b, 2) + ", " +
		"<b>Total dmg taken</b>: " + (hvStat.roundContext.dTaken[0] + hvStat.roundContext.dTaken[1]) + ", " +
		"<b>Avg dmg taken</b>: " + hvStat.util.ratio(hvStat.roundContext.dTaken[0] + hvStat.roundContext.dTaken[1], b).toFixed(2);
	if (hvStat.settings.isShowEndProfs && (hvStat.settings.isShowEndProfsMagic || hvStat.settings.isShowEndProfsArmor || hvStat.settings.isShowEndProfsWeapon)) { //isShowEndProfs added by Ilirith
		if (hvStat.settings.isShowEndProfsMagic) {
			a += "<hr style='height:1px;border:0;background-color:#333333;color:#333333' />" +
				"<b>Curative Spells</b>: " + hvStat.roundContext.curativeSpells +
				", <b>Support Spells</b>: " + hvStat.roundContext.supportSpells +
				", <b>Deprecating Spells</b>: " + hvStat.roundContext.depSpells[1] +
				", <b>Divine Spells</b>: " + hvStat.roundContext.divineSpells[1] +
				", <b>Forbidden Spells</b>: " + hvStat.roundContext.forbidSpells[1] +
				", <b>Elemental Spells</b>: " + hvStat.roundContext.elemSpells[1] +
				"<hr style='height:1px;border:0;background-color:#333333;color:#333333' />" +
				"<b>SupportGain</b>: " + hvStat.roundContext.supportGain.toFixed(2) +
				", <b>Deprecating Gain</b>: " + hvStat.roundContext.depGain.toFixed(2) +
				", <b>Divine Gain</b>: " + hvStat.roundContext.divineGain.toFixed(2) +
				", <b>Forbidden Gain</b>: " + hvStat.roundContext.forbidGain.toFixed(2) +
				", <b>Elemental Gain</b>: " + hvStat.roundContext.elemGain.toFixed(2);
		}
		if (hvStat.settings.isShowEndProfsArmor) {
			a += "<hr style='height:1px;border:0;background-color:#333333;color:#333333' />" +
				"<b>Cloth Gain</b>: " + hvStat.roundContext.armorProfGain[0].toFixed(2) +
				", <b>Light Armor Gain</b>: " + hvStat.roundContext.armorProfGain[1].toFixed(2) +
				", <b>Heavy Armor Gain</b>: " + hvStat.roundContext.armorProfGain[2].toFixed(2);
		}
		if (hvStat.settings.isShowEndProfsWeapon) {
			a += "<hr style='height:1px;border:0;background-color:#333333;color:#333333' />" +
				"<b>One-Handed Gain</b>: " + hvStat.roundContext.weapProfGain[0].toFixed(2) +
				", <b>Two-Handed Gain</b>: " + hvStat.roundContext.weapProfGain[1].toFixed(2) +
				", <b>Dual Wielding Gain</b>: " + hvStat.roundContext.weapProfGain[2].toFixed(2) +
				", <b>Staff Gain</b>: " + hvStat.roundContext.weapProfGain[3].toFixed(2);
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
		if (document.head || document.documentElement) {
			hvStat.addStyle();
		}
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
		hv.initialize();
		hvStat.addStyle();
		if (hvStat.settings.isChangePageTitle) {
			document.title = hvStat.settings.customPageTitle;
		}
		hvStat.gadget.addStyle();

		if (hv.battle.isActive) {
			if (hvStat.settings.adjustKeyEventHandling) {
				var siteScript = browser.extension.getResourceText("scripts/", "hvstat-injection.js");
				util.addSiteScript(siteScript);
			}
			util.document.extractBody();
			hvStat.gadget.initialize();
			hvStat.battle.initialize();
			if (hvStat.settings.delayRoundEndAlerts) {
				hvStat.battle.warningSystem.restoreAlerts();
			}
			hvStat.battle.eventLog.processEvents();
			if (hvStat.roundContext.currRound > 0 && hvStat.settings.isShowRoundCounter) {
				hvStat.battle.enhancement.roundCounter.create();
			}
			if (hvStat.settings.doesScaleMonsterGauges) {
				hvStat.battle.monster.setScale();
			}
			hvStat.battle.monster.showHealthAll();
			if (hvStat.settings.doesScaleMonsterGauges) {
				hvStat.battle.monster.scaleGaugesAll();
			}
			util.document.restoreBody();
			if (!hvStat.database.loadingMonsterInfoFromDB) {
				hvStat.battle.monster.showStatusAll();
			}
			if (hvStat.settings.isShowStatsPopup) {
				hvStat.battle.monster.popup.initialize();
			}
			if (!hv.battle.isRoundFinished) {
				// Show warnings
				if (hvStat.settings.warnMode[hvStat.roundContext.battleType]) {
					hvStat.battle.warningSystem.warnHealthStatus();
				}
				if (hvStat.settings.isMainEffectsAlertSelf) {
					hvStat.battle.warningSystem.warnSelfEffectExpiring();
				}
				if (hvStat.settings.isMainEffectsAlertMonsters) {
					hvStat.battle.warningSystem.warnMonsterEffectExpiring();
				}
			} else {
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
			document.addEventListener("keydown", hvStat.battle.keyboard.documentKeydown);
			if (hvStat.settings.adjustKeyEventHandling) {
				document.dispatchEvent(new CustomEvent("hvstatcomplete"));
			}
		} else if (hv.location === "riddle") {
			hvStat.gadget.initialize();
		} else {
			hvStat.storage.roundContext.remove();
			hvStat.storage.warningState.remove();
            browser.extension.loadScript("scripts/", "hvstat-noncombat.js");
			if (hvStat.settings.isStartAlert || hvStat.settings.isShowEquippedSet ||
					hvStat.settings.isTrackItems || hvStat.settings.isTrackShrine) {
				hvStat.noncombat.support.captureStatuses();
			}
			if (hvStat.settings.enableScrollHotkey) {
				hvStat.noncombat.keyboard.scrollable.initialize();
				document.addEventListener("keydown", hvStat.noncombat.keyboard.documentKeydown);
			}
			// Equipment tag
			switch (hv.location) {
			case "character":
				hvStat.noncombat.support.captureProficiencies();
				break;
			case "equipment":
				if (hvStat.settings.isShowTags[0]) {
					hvStat.noncombat.inventory.equipment.showTagInputFields(false);
					hvStat.noncombat.support.popup.addObserver();
				}
				break;
			case "inventory":
				if (hvStat.settings.isShowTags[5]) {
					hvStat.noncombat.inventory.equipment.showTagInputFields(true);
					hvStat.noncombat.support.popup.addObserver();
				}
				break;
			case "equipmentShop":
				if (hvStat.settings.isShowTags[1]) {
					hvStat.noncombat.inventory.equipment.showTagInputFields(false);
					hvStat.noncombat.support.popup.addObserver();
				}
				break;
			case "shrine":
				if (hvStat.settings.isTrackShrine) {
					hvStat.noncombat.support.captureShrine();
				}
				break;
			case "forge":
				if (hvStat.settings.isShowTags[4]) {
					hvStat.noncombat.inventory.equipment.showTagInputFields(false);
					hvStat.noncombat.support.popup.addObserver();
				}
				if (hvStat.settings.isDisableForgeHotKeys) {
					util.addSiteScript('document.onkeypress = null;');
				}
				break;
			case "moogleMailWriteNew":
				if (hvStat.settings.isShowTags[3]) {
					hvStat.noncombat.inventory.equipment.showTagInputFields(false);
					hvStat.noncombat.support.popup.addObserver();
				}
				break;
			case "arena":
				if (hvStat.settings.isStartAlert) {
					hvStat.noncombat.support.confirmBeforeBattle();
				}
				break;
			case "ringOfBlood":
				if (hvStat.settings.isStartAlert) {
					hvStat.noncombat.support.confirmBeforeBattle();
				}
				break;
			case "grindfest":
				if (hvStat.settings.isStartAlert) {
					hvStat.noncombat.support.confirmBeforeBattle();
				}
				break;
			case "itemWorld":
				if (hvStat.settings.isShowTags[2]) {
					hvStat.noncombat.inventory.equipment.showTagInputFields(false);
					hvStat.noncombat.support.popup.addObserver();
				}
				if (hvStat.settings.isStartAlert) {
					hvStat.noncombat.support.confirmBeforeBattle();
				}
				break;
			}
			hvStat.gadget.initialize();
		}
	},
};

hvStat.startup.phase1();
