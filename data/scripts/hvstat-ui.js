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
        browser.extension.style.add(
            ".ui-widget-overlay {background: #000 url(" +
            browser.extension.getResourceURL("css/images/", "hvs.gif") +
            ") 50% 50% repeat;"
        );

		browser.extension.loadScript("scripts/", "hvstat-migration.js");

		var panel = document.createElement("div");
		panel.id = "hvstat-panel";
		$(panel).html(browser.extension.getResourceText("html/", "main.html"));
		$('body').append(panel);
		$(panel).dialog({
			autoOpen: false,
			closeOnEscape: true,
			draggable: false,
			resizable: false,
			height: 627,
			width: 1080,
			modal: true,
			position: ["center", "center"],
			title: "HVS - Statistics, Tracking, and Analysis Tool v." + hvStat.version,
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
	updateEquipments: function (dropType, difficulty, battleType, limit) {
        $('#hvstat-drops-equipments-tbody').html(
            "</tr><tr><td colspan='6' style='text-align:center'><img src='" + 
            browser.extension.getResourceURL("css/images/", "throbber.gif" ) + 
            "' /><br />Loading</td></tr>"
        );
		try {
            limit = typeof limit !== 'undefined' ? limit : 50;
			var tx = hvStat.database.idb.transaction(["EquipmentDrops"], "readonly");
			var store = tx.objectStore("EquipmentDrops");
			var range = null;	// Select all
			var cursorOpenRequest = store.index('ix_date').openCursor(range, "prev");
			cursorOpenRequest.onerror = function (event) {
				var errorMessage = "EquipmentDrops: openCursor: error";
				console.log(errorMessage);
				console.debug(event);
				alert(errorMessage);
			};
			var equipmentsHTML = "";
            var extraEquip = "";
            var firstChunk = 0;
			cursorOpenRequest.onsuccess = function (event) {
				//console.debug(event);
				var cursor = this.result;
				if (cursor && (limit == 0 || firstChunk < limit)) {
                    //console.debug(cursor);
                    var equipment = cursor.value;
                    if ((dropType === null || dropType === equipment.dropType) &&
                            (difficulty === null || difficulty === equipment.difficulty) &&
                            (battleType === null || battleType === equipment.battleType)) {
                        var arenaNumber = (equipment.arenaNumber === null) ? "-" : String(equipment.arenaNumber);
                        var roundNumber = (equipment.roundNumber === null) ? "-" : String(equipment.roundNumber);
                        var difficultyConst = hvStat.constant.difficulty[equipment.difficulty];
                        var battleTypeConst = hvStat.constant.battleType[equipment.battleType];
                        // Reverse order
                        equipmentsHTML += '<tr>' +
                            '<th class="hvstat-color-equipment">' + equipment.name + '</th>' +
                            '<td>' + (difficultyConst ? difficultyConst.name : "?") + '</td>' +
                            '<td>' + (battleTypeConst ? battleTypeConst.name : "?") + '</td>' +
                            '<td>' + arenaNumber + '</td>' +
                            '<td>' + roundNumber + '</td>' +
                            '<td>' + hvStat.util.getDateTimeString(new Date(equipment.timeStamp)) + '</td>' +
                            '</tr>\n';
                        firstChunk += 1;
                        if (firstChunk == limit && limit != 0)
                            equipmentsHTML += '<tr><td colspan="6" style="text-align:center"><a id="showAllDropsLink" style="cursor:pointer">▼ Show All ▼</a></td></tr>';
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
                    $("#showAllDropsLink").click(function () {
                        hvStat.ui.dropsPane.updateEquipments(dropType, difficulty, battleType, 0);
                    });
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
		
		$('#hvstat-localstorage-overview-export').click(function () {
			if (confirm("Export Overview Stats?")) {
				var downloadLink = $('#hvstat-localstorage-overview-download');
				downloadLink.attr("href", "data:text/json;charset=utf-8," + JSON.stringify(localStorage["HVOverview"]));
				downloadLink.attr("download", "hvstat_ls_overview.json");
				downloadLink.css("visibility", "visible");
				alert("Ready to export.\nClick the download link.");
			}
		});
		$('#hvstat-localstorage-shrine-export').click(function () {
			if (confirm("Export Shrine Stats?")) {
				var downloadLink = $('#hvstat-localstorage-shrine-download');
				downloadLink.attr("href", "data:text/json;charset=utf-8," + JSON.stringify(localStorage["HVShrine"]));
				downloadLink.attr("download", "hvstat_ls_shrine.json");
				downloadLink.css("visibility", "visible");
				alert("Ready to export.\nClick the download link.");
			}
		});
		$('#hvstat-localstorage-battle-export').click(function () {
			if (confirm("Export Battle Stats?")) {
				var downloadLink = $('#hvstat-localstorage-battle-download');
				downloadLink.attr("href", "data:text/json;charset=utf-8," + JSON.stringify(localStorage["HVStats"]));
				downloadLink.attr("download", "hvstat_ls_battle.json");
				downloadLink.css("visibility", "visible");
				alert("Ready to export.\nClick the download link.");
			}
		});
		$('#hvstat-localstorage-drops-export').click(function () {
			if (confirm("Export Drop Stats?")) {
				var downloadLink = $('#hvstat-localstorage-drops-download');
				downloadLink.attr("href", "data:text/json;charset=utf-8," + JSON.stringify(localStorage["hvStat.dropStats"]));
				downloadLink.attr("download", "hvstat_ls_drops.json");
				downloadLink.css("visibility", "visible");
				alert("Ready to export.\nClick the download link.");
			}
		});
		$('#hvstat-localstorage-settings-export').click(function () {
			if (confirm("Export Settings?")) {
				var downloadLink = $('#hvstat-localstorage-settings-download');
				downloadLink.attr("href", "data:text/json;charset=utf-8," + JSON.stringify(localStorage["HVSettings"]));
				downloadLink.attr("download", "hvstat_ls_settings.json");
				downloadLink.css("visibility", "visible");
				alert("Ready to export.\nClick the download link.");
			}
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
		
		$('#hvstat-localstorage-overview-import').change(function (event) {
			var file = event.target.files[0];
			if (!file) {
				alert("Failed to load file");
			} else {
				if (confirm("Are you SURE you want to import from this file?\n\r!!WILL OVERWRITE CURRENT VALUES!!")) {
					var reader = new FileReader();
					reader.onerror = function (event) {
						console.log(event);
						alert(event);
					};
					reader.onload = function (event) {
						var contents = event.target.result;
						localStorage.setItem("HVOverview", JSON.parse(contents));
						alert("Overview Stats loaded.\n\rChanges take effect after refresh!");
					};
					reader.readAsText(file, 'UTF-8');
				}
			}
		});
		$('#hvstat-localstorage-shrine-import').change(function (event) {
			var file = event.target.files[0];
			if (!file) {
				alert("Failed to load file");
			} else {
				if (confirm("Are you SURE you want to import from this file?\n\r!!WILL OVERWRITE CURRENT VALUES!!")) {
					var reader = new FileReader();
					reader.onerror = function (event) {
						console.log(event);
						alert(event);
					};
					reader.onload = function (event) {
						var contents = event.target.result;
						localStorage.setItem("HVShrine", JSON.parse(contents));
						alert("Shrine Stats loaded.\n\rChanges take effect after refresh!");
					};
					reader.readAsText(file, 'UTF-8');
				}
			}
		});
		$('#hvstat-localstorage-battle-import').change(function (event) {
			var file = event.target.files[0];
			if (!file) {
				alert("Failed to load file");
			} else {
				if (confirm("Are you SURE you want to import from this file?\n\r!!WILL OVERWRITE CURRENT VALUES!!")) {
					var reader = new FileReader();
					reader.onerror = function (event) {
						console.log(event);
						alert(event);
					};
					reader.onload = function (event) {
						var contents = event.target.result;
						localStorage.setItem("HVStats", JSON.parse(contents));
						alert("Battle Stats loaded.\n\rChanges take effect after refresh!");
					};
					reader.readAsText(file, 'UTF-8');
				}
			}
		});
		$('#hvstat-localstorage-drops-import').change(function (event) {
			var file = event.target.files[0];
			if (!file) {
				alert("Failed to load file");
			} else {
				if (confirm("Are you SURE you want to import from this file?\n\r!!WILL OVERWRITE CURRENT VALUES!!")) {
					var reader = new FileReader();
					reader.onerror = function (event) {
						console.log(event);
						alert(event);
					};
					reader.onload = function (event) {
						var contents = event.target.result;
						localStorage.setItem("hvStat.dropStats", JSON.parse(contents));
						alert("Drop Stats loaded.\n\rChanges take effect after refresh!");
					};
					reader.readAsText(file, 'UTF-8');
				}
			}
		});
		$('#hvstat-localstorage-settings-import').change(function (event) {
			var file = event.target.files[0];
			if (!file) {
				alert("Failed to load file");
			} else {
				if (confirm("Are you SURE you want to import from this file? !!WILL OVERWRITE CURRENT VALUES!!")) {
					var reader = new FileReader();
					reader.onerror = function (event) {
						console.log(event);
						alert(event);
					};
					reader.onload = function (event) {
						var contents = event.target.result;
						localStorage.setItem("HVSettings", JSON.parse(contents));
						alert("Settings loaded. !!Changes take effect after refresh!!");
					};
					reader.readAsText(file, 'UTF-8');
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
	if (hvStat.settings.doesHideLogo) $("input[name=doesHideLogo]").attr("checked", "checked");
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

	// Tracking
	if (hvStat.settings.isTrackStats) $("input[name=isTrackStats]").attr("checked", "checked");
	if (hvStat.settings.isTrackShrine) $("input[name=isTrackShrine]").attr("checked", "checked");
	if (hvStat.settings.isTrackItems) $("input[name=isTrackItems]").attr("checked", "checked");
	if (hvStat.settings.noTrackCredits) $("input[name=noTrackCredits]").attr("checked", "checked");
	if (hvStat.settings.noTrackItems) $("input[name=noTrackItems]").attr("checked", "checked");
	if (hvStat.settings.noTrackCrystals) $("input[name=noTrackCrystals]").attr("checked", "checked");
	if (hvStat.settings.noTrackMonsterFood) $("input[name=noTrackMonsterFood]").attr("checked", "checked");
	if (hvStat.settings.noTrackTokens) $("input[name=noTrackTokens]").attr("checked", "checked");
	if (hvStat.settings.noTrackArtifacts) $("input[name=noTrackArtifacts]").attr("checked", "checked");
	if (hvStat.settings.noTrackTrophies) $("input[name=noTrackTrophies]").attr("checked", "checked");
	if (hvStat.settings.noTrackEquip) $("input[name=noTrackEquip]").attr("checked", "checked");

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
	if (hvStat.settings.isAlertGemHealth) $("input[name=isAlertGemHealth]").attr("checked", "checked");
	if (hvStat.settings.isAlertGemMana) $("input[name=isAlertGemMana]").attr("checked", "checked");
	if (hvStat.settings.isAlertGemSpirit) $("input[name=isAlertGemSpirit]").attr("checked", "checked");
	if (hvStat.settings.isAlertGemMystic) $("input[name=isAlertGemMystic]").attr("checked", "checked");
	if (hvStat.settings.isAlertOverchargeFull) $("input[name=isAlertOverchargeFull]").attr("checked", "checked");
	if (hvStat.settings.isWarnAbsorbTrigger) $("input[name=isWarnAbsorbTrigger]").attr("checked", "checked");
	if (hvStat.settings.isWarnSparkTrigger) $("input[name=isWarnSparkTrigger]").attr("checked", "checked");
	if (hvStat.settings.isWarnSparkExpire) $("input[name=isWarnSparkExpire]").attr("checked", "checked");
	if (hvStat.settings.alertWhenChannelingIsGained) $("input[name=alertWhenChannelingIsGained]").attr("checked", "checked");
	if (hvStat.settings.alertWhenCooldownExpiredForDrain) $("input[name=alertWhenCooldownExpiredForDrain]").attr("checked", "checked");
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
	if (hvStat.settings.doesScaleMonsterGauges) $("input[name=doesScaleMonsterGauges]").attr("checked", "checked");
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
	$("input[name=doesHideLogo]").click(saveSettings);
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

	// Tracking Functions
	$("input[name=isTrackStats]").click(saveSettings);
	$("input[name=isTrackShrine]").click(saveSettings);
	$("input[name=isTrackItems]").click(saveSettings);
	$("input[name=noTrackCredits]").click(saveSettings);
	$("input[name=noTrackItems]").click(saveSettings);
	$("input[name=noTrackCrystals]").click(saveSettings);
	$("input[name=noTrackMonsterFood]").click(saveSettings);
	$("input[name=noTrackTokens]").click(saveSettings);
	$("input[name=noTrackArtifacts]").click(saveSettings);
	$("input[name=noTrackTrophies]").click(saveSettings);
	$("input[name=noTrackEquip]").click(saveSettings);

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
	$("input[name=isAlertGemHealth]").click(saveSettings);
	$("input[name=isAlertGemMana]").click(saveSettings);
	$("input[name=isAlertGemSpirit]").click(saveSettings);
	$("input[name=isAlertGemMystic]").click(saveSettings);
	$("input[name=isAlertOverchargeFull]").click(saveSettings);
	$("input[name=isWarnAbsorbTrigger]").click(saveSettings);
	$("input[name=isWarnSparkTrigger]").click(saveSettings);
	$("input[name=isWarnSparkExpire]").click(saveSettings);
	$("input[name=alertWhenChannelingIsGained]").click(saveSettings);
	$("input[name=alertWhenCooldownExpiredForDrain]").click(saveSettings);
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
	$("input[name=doesScaleMonsterGauges]").click(saveSettings);
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
	hvStat.settings.doesHideLogo = $("input[name=doesHideLogo]").get(0).checked;
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

	// Tracking
	hvStat.settings.isTrackStats = $("input[name=isTrackStats]").get(0).checked;
	hvStat.settings.isTrackShrine = $("input[name=isTrackShrine]").get(0).checked;
	hvStat.settings.isTrackItems = $("input[name=isTrackItems]").get(0).checked;
	hvStat.settings.noTrackCredits = $("input[name=noTrackCredits]").get(0).checked;
	hvStat.settings.noTrackItems = $("input[name=noTrackItems]").get(0).checked;
	hvStat.settings.noTrackCrystals = $("input[name=noTrackCrystals]").get(0).checked;
	hvStat.settings.noTrackMonsterFood = $("input[name=noTrackMonsterFood]").get(0).checked;
	hvStat.settings.noTrackTokens = $("input[name=noTrackTokens]").get(0).checked;
	hvStat.settings.noTrackArtifacts = $("input[name=noTrackArtifacts]").get(0).checked;
	hvStat.settings.noTrackTrophies = $("input[name=noTrackTrophies]").get(0).checked;
	hvStat.settings.noTrackEquip = $("input[name=noTrackEquip]").get(0).checked;

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
	hvStat.settings.isAlertGemHealth = $("input[name=isAlertGemHealth]").get(0).checked;
	hvStat.settings.isAlertGemMana = $("input[name=isAlertGemMana]").get(0).checked;
	hvStat.settings.isAlertGemSpirit = $("input[name=isAlertGemSpirit]").get(0).checked;
	hvStat.settings.isAlertGemMystic = $("input[name=isAlertGemMystic]").get(0).checked;
	hvStat.settings.isAlertOverchargeFull = $("input[name=isAlertOverchargeFull]").get(0).checked;
	hvStat.settings.isWarnAbsorbTrigger = $("input[name=isWarnAbsorbTrigger]").get(0).checked;
	hvStat.settings.isWarnSparkTrigger = $("input[name=isWarnSparkTrigger]").get(0).checked;
	hvStat.settings.isWarnSparkExpire = $("input[name=isWarnSparkExpire]").get(0).checked;
	hvStat.settings.alertWhenChannelingIsGained = $("input[name=alertWhenChannelingIsGained]").get(0).checked;
	hvStat.settings.alertWhenCooldownExpiredForDrain = $("input[name=alertWhenCooldownExpiredForDrain]").get(0).checked;
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
	hvStat.settings.doesScaleMonsterGauges = $("input[name=doesScaleMonsterGauges]").get(0).checked;
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
	hvStat.settings.hideSpecificDamageType[9] = false;	// Soul is obsolete
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
