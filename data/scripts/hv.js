//------------------------------------
// HV utility object
//------------------------------------
var hv = {};

hv.util = {
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
};

hv.locationMap = {
	"character":		"?s=Character&ss=ch",
	"equipment":		"?s=Character&ss=eq",
	"abilities":		"?s=Character&ss=ab",
	"training":			"?s=Character&ss=tr",
	"battleItems":		"?s=Character&ss=it",
	"inventory":		"?s=Character&ss=in",
	"settings":			"?s=Character&ss=se",
	"equipmentShop":	"?s=Bazaar&ss=es",
	"itemShop":			"?s=Bazaar&ss=is",
	"itemShopBot":		"?s=Bazaar&ss=ib",
	"monsterLab":		"?s=Bazaar&ss=ml",
	"shrine":			"?s=Bazaar&ss=ss",
	"forge":			"?s=Bazaar&ss=fr",
	"moogleMailInbox":		"?s=Bazaar&ss=mm&filter=Inbox",
	"moogleMailWriteNew":	"?s=Bazaar&ss=mm&filter=Write%20New",
	"moogleMailReadMail":	"?s=Bazaar&ss=mm&filter=Read%20Mail",
	"moogleMailSentMail":	"?s=Bazaar&ss=mm&filter=Sent%20Mail",
	"moogleMail":		"?s=Bazaar&ss=mm",
	"battle":			"?s=Battle&ss=ba",
	"arena":			"?s=Battle&ss=ar",
	"ringOfBlood":		"?s=Battle&ss=rb",
	"grindfest":		"?s=Battle&ss=gr",
	"itemWorld":		"?s=Battle&ss=iw",
};

hv.character = {
	get healthRate() {
		return hv.util.getCharacterGaugeRate(hv.elementCache.leftBar.querySelector('img[alt="health"]'));
	},
	get magicRate() {
		return hv.util.getCharacterGaugeRate(hv.elementCache.leftBar.querySelector('img[alt="magic"]'));
	},
	get spiritRate() {
		return hv.util.getCharacterGaugeRate(hv.elementCache.leftBar.querySelector('img[alt="spirit"]'));
	},
	get overchargeRate() {
		return hv.util.getCharacterGaugeRate(hv.elementCache.leftBar.querySelector('img[alt="overcharge"]'));
	},
	get healthPercent() {
		return hv.util.percent(this.healthRate);
	},
	get magicPercent() {
		return hv.util.percent(this.magicRate);
	},
	get spiritPercent() {
		return hv.util.percent(this.spiritRate);
	},
	get overchargePercent() {
		return hv.util.percent(this.overchargeRate);
	},
};

hv.elementCache = {
	_popup: null,
	get popup() {
		if (!this._popup) {
			this._popup = util.document.body.querySelector('#popup_box');
		}
		return this._popup;
	},
	_stuffBox: null,
	get stuffBox() {
		if (!this._stuffBox) {
			this._stuffBox = util.document.body.querySelector('div.stuffbox');
		}
		return this._stuffBox;
	},
	_leftBar: null,
	get leftBar() {
		if (!this._leftBar) {
			this._leftBar = this.stuffBox.children[0];
		}
		return this._leftBar;
	},
	_infoTables: null,
	get infoTables() {
		if (!this._infoTables) {
			this._infoTables = this.leftBar.querySelectorAll('table.cit');
		}
		return this._infoTables;
	},
};

hv.initialize = function () {
	this.util.isUsingHVFontEngine = util.innerText(hv.elementCache.infoTables[0]).indexOf("Level") === -1;
	var settings = {
		isUsingHVFontEngine: this.util.isUsingHVFontEngine,
		get difficulty() {
			var regexResult = hv.util.innerText(hv.elementCache.infoTables[1]).match(/(Normal|Hard|Nightmare|Hell|Nintendo|Battletoads|IWBTH|PFUDOR)/i);
			if (regexResult) {
				return regexResult[1].toUpperCase();
			} else {
				return "";
			}
		},
	};

	var battleLog = util.document.body.querySelector('#togpane_log');
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
			_monsterEffectIcons: null,
			_monsterGauges: null,
			get mainPane() {
				if (!this._mainPane) {
					this._mainPane = util.document.body.querySelector('#mainpane');
				}
				return this._mainPane;
			},
			get quickcastBar() {
				if (!this._quickcastBar) {
					this._quickcastBar = util.document.body.querySelector('#quickbar');
				}
				return this._quickcastBar;
			},
			get monsterPane() {
				if (!this._monsterPane) {
					this._monsterPane = util.document.body.querySelector('#monsterpane');
				}
				return this._monsterPane;
			},
			get dialog() {
				if (!this._dialog) {
					this._dialog = util.document.body.querySelector('div.btcp');
				}
				return this._dialog;
			},
			get dialogButton() {
				if (!this._dialogButton) {
					this._dialogButton = util.document.body.querySelector('#ckey_continue');
				}
				return this._dialogButton;
			},
			get characterEffectIcons() {
				if (!this._characterEffectIcons) {
					this._characterEffectIcons = this.mainPane.querySelectorAll('div.btt > div.bte > img[onmouseover^="battle.set_infopane_effect"]');
				}
				return this._characterEffectIcons;
			},
			get monsters() {
				if (!this._monsters) {
					this._monsters = this.monsterPane.querySelectorAll('div.btm1');
				}
				return this._monsters;
			},
			get monsterEffectIcons() {
				if (!this._monsterEffectIcons) {
					this._monsterEffectIcons = this.monsterPane.querySelectorAll('div.btm1 > div.btm6 > img[onmouseover^="battle.set_infopane_effect"]');
				}
				return this._monsterEffectIcons;
			},
			get monsterGauges() {
				if (!this._monsterGauges) {
					this._monsterGauges = this.monsterPane.querySelectorAll('div.btm1 > div.btm4 > div.btm5 > div.chbd > img.chb2');
				}
				return this._monsterGauges;
			},
		};
	}
	var isLocationFound = false,
		location = "",
		key;
	if (battle.isActive) {
		location = "engagingBattle";
	} else {
		for (key in this.locationMap) {
			if (document.location.search.indexOf(this.locationMap[key]) === 0) {
				location = key;
				isLocationFound = true;
				break;
			}
		}
		if (!isLocationFound) {
			if (util.document.body.querySelector('#riddleform')) {
				location = "riddle";
			} else if (util.document.body.querySelector('#pattrform')) {
				location = "character";
			}
		}
	}
	this.location = location;
	this.settings = settings;
	this.battle = battle;
};
