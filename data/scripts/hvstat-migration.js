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
