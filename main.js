// ==UserScript==
// @name             HV Statistics, Tracking, and Analysis Tool
// @namespace        HV STAT
// @description      Collects data, analyzes statistics, and enhances the interface of the HentaiVerse
// @include          http://hentaiverse.org/*
// @author           Various (http://forums.e-hentai.org/index.php?showtopic=50962)
// @version          5.4.1.2
// @require          https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @require          https://ajax.googleapis.com/ajax/libs/jqueryui/1.8.21/jquery-ui.min.js
// @resource         jQueryUICSS http://www.starfleetplatoon.com/~cmal/HVSTAT/jqueryui.css
// ==/UserScript==

// === GLOBAL VARIABLES
var millisecondsAll = TimeCounter(1);
VERSION = "5.4.1.2";
SAVE_STATS = true;
MAX_MID = 33;
SELF_EFF_TOP = 34;
SELF_EFF_LEFT = 8;
MON_EFF_TOP = -3;
MON_EFF_LEFT = 5;
FIRST_EFF = 33;
HV_OVERVIEW = "HVOverview";
HV_STATS = "HVStats";
HV_PROF = "HVProf";
HV_REWARDS = "HVRewards";
HV_SHRINE = "HVShrine";
HV_DROPS = "HVDrops";
HV_SETTINGS = "HVSettings";
HV_ROUND = "HVRound";
HV_ALERT = "critAlert";
HV_ALERTMP = "critAlertMP";
HV_ALERTSP = "critAlertSP";
HV_ALERTOC = "fullAlertOC";
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
MCOUNT = 0;
MNUM = -1;
DOMLOADED = false;
HASMS = false;
_overview = null;
_stats = null;
_profs = null;
_rewards = null;
_shrine = null;
_drops = null;
_settings = null;
_round = null;
_backup = [null, null, null, null, null];
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

// === EMBEDDED IMAGES
I_NBARGREEN = "data:image/gif;base64,R0lGODlhAQAMAIAAAACmFwAAACwAAAAAAQAMAAACA4SPVgA7";
I_NBARBLUE = "data:image/gif;base64,R0lGODlhAQAMAIAAAAAWuAAAACwAAAAAAQAMAAACA4SPVgA7";
I_NBARDEAD = "data:image/gif;base64,R0lGODlheAAMANUAAAQEAwUFBAoKCQwMCxwcGg4ODR8fHREREMPCt9DPxM/Ow39+damon6innqWkm3FwaGVkXX9+d52clJuakpyaj7i2qqqonenn2+bk2NrYzdHPxObk2eXj2I6MguPg0dXSxFVUT1dWUcPBt8LAttnXzdjWzDk4NMfEt0dGQklIRO7r3+3q3unm2pyaknNxap6clfDs3+/r3trXzSsqJ2RiXDs6N399d358dygnJScmJQoKCgkJCQMDAwAAAAAAAAAAACwAAAAAeAAMAAAG/8CYcEgsGo/IpHLJbDqfMdUlg2i8WpOsdsvter/gsHhMLkscIhlmJdwkIrhBAMCr2+/4vH5fP7j+gCk8foB/IXYhLoc8KYV/B3yRkncAOzgRChxCJTc6PZ+goaKjpKWiBRQWqhYfHieoq6oPnwQdHh4fPSCxFbcgpsDBpDo2JUIjOcLKy6ILFp8oHs89zqM0FiCtKD0z2J+9JszipDkjQgwC4+qmFh7QHr897arbnye5Dx4dPSYesz0VTqwbKIDBuXQDE35qt7ACqHYPwn2a4epBtlz9ZvWrp5BZwWPJOg5sV6DDhxkP3YVa4KGChQ4sUWQ08WGfSGblNtnwdHNcu1F7KFOu6kDgHiiKHfqd0NdzmY4bxmJwUABHDp1JWLEmggDpTiJDgxTdgQDBwJ8aWdPyqXRJA4shLEhUuVKmrt27ePN2OZMmBgwogAMLHkxYSRAAOw==";
I_HVLOGO = "data:image/gif;base64,R0lGODlhlgBuAMQAAO/r3uXc0NzOwtK/tMiwpr+hmLWTiquEfKJ2b5lnYoVKRo9YVHIsKnw7OFUAAF8PDmgdHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACwAAAAAlgBuAAAF/yAgjmRpnmiqrmzrvnAsz3Rt33iu73zv/8CgcEgsGo/IpHLJbDqf0Kh0Sq1ar9isdsvter/gsFgqIJQQiADAgBgADug4mgA3lwpyNEDARtgBAXEFJXUicHl+JX15B3t9fyQCiGgDgQgCI2gGIniImzAECg4PaiIGDg17owINDq6vEAatDgglCa+vCKe4DAEDEK8PJAuuabO4EIMjrLi4us29JAcPza4PBdQOf66pt80PtTIHxSMM2gDE4WWYZ7QkAQRuIgIHA6NmAcQLIgMFop8CmKkjwO4Eq0bwCM67B0gfCQQKMA0g8CeAAWDbUImAJ+/GOFIACGgMMKoUAnftwv+JEJmKxKl9CyGIaEWAgcwADxKcDLezhUiUL5c5kHliVgmaI7it1JhDVC2kPUWczJUJ5VIGKUm4mqlNJIFTBKJOJZfiJ0+rALYWVTsCqQilIXEpKEVDwKgCIx+AlIqqzUO0JB1kTSoYANIGDSCkEtu3IwqzfFWmLWzCKAmaYae2FAkBgbIbJ6kRyIc26l/JAMx9ujoCb0ukP80wRv2YrEisnJhWZss1FK7NunHgREWA2l6+DeRsOpk8jgGRD/C5MZc8ATVlbhFHRq68tlXqCKw7+HyUt+Fzb5lylnOA7gxio4GhHjsqDQD64NQUAMbgUz5gqHzmFkXb3YdLft4V9B//N+SVB1Nb6E0GHC4LFFQXbgMcN0YADDwYwykWMlFQiBuS+IJjY6So4oostujiizDGKOOMNNZo441OTERRPCiUsSNFJCb045BE7uiGkEOegCQkGxXpJJFKDuneO0SiyEIA3rzSkgn0kTUCAQBWI2YwaYA55mpfNlOCmWO2CdcIgWTzSgLe/QZKmFqi0KVVWLo5Zn59tokbCT+9AmeWfo7ZUZxiEmVCoXm2EGg1W7bTTDhsJkqmGpm2ySSkhXWqaTMwMdqmlXE1U6kKvom5alWXrvTkk3QVaQAxcq2pJgB4JjNrkaUMAIcCcjZD56OUwhBAAQsU+ypfsQYhgDmvWAgq/z/ZJDBlDQYU64qjhCYrA33PGhhtCc0wyUIzBVDrgIfXrnDMK+ouhIsAGVZjJajBvUCuntXQNhm9MaRb6HHxqjCvK/W+wQs/1Rwbrqoz/HvCngKnWzAuZuBqVcIpLBxhCe460Ai0sCBL8bh2XhzwCaRO0qBWHKvybZq4sCByvXbdC6e3KPJb7goWc/myCYkKTBjB6LzyCcgo7HzCOK8MirIrEi+1cgxFW+oMzIKiSjPTPau3q8LV1FvyyT8jo+vWMHT917ljH72CxiJ4bAbUa+EdSTMkdumY0BW3TLWbGdcMg99l78P3bn6PcLiYpJSN9cQtc91yyWMmzvQLkXtcxv/ZIadtAucvi5IyzpnHbaflbXrO8Maf2/zu4+VFbnubpOCFS0eEs5znAIiILPvILeju8cI6my4NMpP4hafEwWseqdF0Lz374ooLNWbzuq+tAn2OVu/69V5ThTQviLXvfvto6t60mOD77H21KsAuD78e+tv63F9b36gqhK7u3Y90USMVIR62gpIdi18mYoHcYBXAAiaKgALcXgk8ljN5AY5kuGBbCnZxs1S9on8vkEX7suaS9zUATW1x4fswWBT3oQp2o2CB6lzRvwC8L4Lv+CEA7GE/HM2PG0CEk7uSeAMSotBGPXuACFfAoXcNYRdMlNECGpDFEnCoi0184o22ZcT/MprxjGhMoxrXyMY2uvGNcIyjHOdIRxqQ8QRSisSvnoQJH+3RSC3w4x8BuYxBEgmMeCQGDPF4ILpMY1TI2MQjIfmtmcFJZKP6zCQpGYsZBOAAYQJXAtXHDEoOZROlNOUrLHlEUypgHpj0UydlQAAOOo1VjXyDtxI1y02q0hoo2KWmQOJLTc1SBvTApChzR44lDRJOhiRAAvBkwC8ZsluuGIQz/5iDmlRjkRALxh2HsCe02FEPT6ii207AQYHhriwIBKD67iCnZNDgnTtQ5y1LYDkNsc48LHgnDpUWgB2iApH/pIwQAoAnf7azTgBdAT6dh4JNSjEG+OQBqCTTzztu/3QSYhNoNcY5j5IxAJEfRYTYbIAfuiBKaSb8EytjqtD0OeCVLcAPOBnppmv8gKEBHI41xskvuZAUd0Kt3Qp+QSGSam1McwkCpEBCH5jSNBgzTego0Scpg55UojIlgkHTICd/vs1QoIhnK0exUhUg6gFtzagP+vlSsHbwBVAjTTN22gISjoKvcvWBLcVpV7TilXQD4JxPbeBX5Gk1CQIQplWfGlFc3hWHEHDqEKdoAoPClaeGRcKezKqy0PqEdI11wFdHyJAUIEq1oK3sEAZ62t/I0H0K+APUUrtYE0xOMTJEnQMWCarb4rZhNuAgaUubKAQ91iViYuFaTUmbov7JPmZzrWBhe4pdzEU0taplhw9/iYuZWfcb3f0BrpaZggEYt33pJYF73YcCFb4vIgBIwHv32wAFWHK+743vD4jI1zoWITEGdsJXEszgBjv4wRCOsIQnTOEKW/jCGM6whjfM4Q57+MMiCAEAOw==";
I_HEALTHPOT = "data:image/gif;base64,R0lGODlhHgAgAOYAAPbt9ho9IwArCAArAAARAAhGCAgrCBFXERFGETR7NAgRCEaDRmmvacrkyvb/9uTt5BFXCDR7KxFGCBpXERpGEQgrABFXACtpGleVRhpXCE+nNBppABFGACt7ERErCDSMETR7GiuMABpXACt7CBpGCCtpETR7ETRpGkanETR7CCtpCE+MK4OvaafTjHKnT5XKcjR7ACtpAAgRAE+MGkZ7GnLBKytXAE+MEUZ7EU+MAHLBEcHklWCnAHKnK57bRq/bcnKnEZXKK57BT5XBGvb/28HkRnKMEa/TI9PtcuT2lfb2r9vTI/bt2wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACwAAAAAHgAgAAAH/4AzJioZhRsbEBkqiykmHSUrLhggKzMjLgwuLj0zLkJBKDc0H6QzpjNAQDcrP0o/QT89NURESUhFQR89PkeqMx83wagoOTk1SklBRz5BSERKSEdLRSMpNUW4KCY0JiZAoDdArUlAR83PRUfqQSU94UhJRZwzOTpHOjw6SURCQ0FBSoj80KFjSI8UHlwgAdIjCTIf+OwdGeJDiZIeQYA4+wGER6oZHCokeCakRyto6bAVcRgriBCBKFLkCKbigAEELwImmdHQIpKfKocYRBaER4gbKFCokGAARA8UP569WCHkVjp///4lSdILhQYgSpkucKWhBhJX4XQU+elw64+1Rf90hEpqAoGBkbR+oBAy0B7bgLR2HFmbMRyKDggITMjp4FkNHkPS+RgCpMgPh9CCYKPM48aGAgYuPHWxg0i6rTUgCvFpMt7gXp0RK1hAZMeLr0PO/vCBKwkAB0mCrY1chPKNEQgqRKDl4EE0h0UAE/mNJEcMfeaQCKkBJIWEChmE7KsVPR4RB+gBPPtx41jvJK9mkBiQAYhZZOUrMjmPvvFkaEc4RMsLFAwAASrNJOGDQ0I58xsRDzARREVI6HBDD+K1gIAAEsyAglpcrfSPgw9stVAr2OxQEgorQMChh9/cAuJltChRQw03AJRMRevNIIEABwZTGRL+tLWDgsUAwVL/Ribt90JyEJASzkrFRYcMEhlFhsRkK7G31wsBVBDlB6gUUUsqVWF2SxBCAeFDjT8IUVcFFkipj0CQvYZNEDrEGMt957GAgAx1AhPEPj00hM1E+WgGj0Wv+HBWCwEYkMFRN1S0Qw47MBHPLTFctuYR8JQay3clhFOZEiVN95MrMBBFWUGfrLUQBxkkmkNuSrjEBBMrsdoDNEAYkQMPMwFRkDkiiFBERwEmk4SnAPW6GkfB3ICDTB59ZMMQHkWHJS0++MDEDjq04gMQOeAwww0wwJBDKjfMUENRh9r4w68auZJuMtaZQkOxqahygwk35CBECy7c0EIDLWjwQwuJ/hDLCw0qmADCCfVmu20gADs=";
I_MANAPOT = "data:image/gif;base64,R0lGODlhHgAgAOYAACMRGiMIGkYrRmlPafbT9ox7jGkrcvbT/5V7p0YrYD0aYBEIGq+ewWlPjD0acisaRkYrcntXuCMRRsq47QgAGkYrgysRchEARisaYIx7wZ6M0yMRYNvT9j0jpyMaRhEAYCMRcisacmBPpysag089pxEAexEIRisalSMaYAgARhEIYAgAYGBXuAAATwAARgAAGggIYAgIRhERPQgIGisrafb2/z1GaT1PjCMrRmlyjLjB05Wnnmlyaaeeg1dPPfbt5MGvp9uVeysaGoxyctPBwdvT0/b29gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACwAAAAAHgAgAAAH/4AQGBImhTIyMSYSiw8YKBsVIiQhFRAeIiwiIg0QIggFNgkONKQQphADAwkVDD8MBQwNOUZGRURABTQNOz2qEDQJwag2AgI5P0UFPTsFREY/RD1BQB4POUC4NhgOGBgDoAkDrUUDPc3PQD3qBRsN4URFQJwQAjw9PD48RUYIQwUFP4ww4MFjSIMHKUQQGdCgCLId+Oz1GLLjx48GBQY4YzDARyoIFF6ceIagQSto6bABcRirAAKBNh4ICCYBhosVGQIWgdDQIpGfKocYRFbAB44ENmxISOEiRAMbDJ5lqIDgVjp///4VKdLLxo0BSpl2cHUjBxFX4XgA+elwK4O1QP94hEqKYYWLkbQY2EAw0B7bgLR09FibMZwNFCteqMhZ41kOH0PS7RgyAAgDh9AKYKPsI4EMFy5APBWhw0i6rTkgIvBpMt7gXp0Rt+hgREeGr0POMtiBq8iBGkWCrY0MhHICD4lH0KrBIZpDIICN/CYiAIA+c0QQ5BiA8IUJBPtqQY9npIb5A88YJDjWu8grCBe8DzCLbHxFAuXNN54MrYdDWhl88EIMqDRTxA4OCeXMb0ZwQEABFRHBQwINgKeBXSlAYINaXK30z4IcbLVQK9joUJINFcTgQoY2fHMLh5fR8kMOOSQAUDIVpQcBUwQGUxkR/rSlw4HFDMBSRibhl0H/YjGQEs5KxUGHDBEZRUbEZCupt1cGJQxYSmW1pFIVZrcUINQAO8jIAAJ1vTCDk/oIBNlr2BTAg4ux0FdeBIm9CUwB+zTQEDYT5aMZPBa9ssNZGpTggglHJVCRDgLoQEA8twBwWZk9wONpLCm8sEE4lf1QknQ/uSIEUZQV9MlaC1FggqAC5PaDSwQQsJKpDUAzgAEC+DDTAAWZs8ACQHTkXzJFXArQratxFEwCCsjk0UcBDOERdFTSssMOBOjAQys7DCCAAhAkIIQQAqSSAAQ5FAXojAzkqpEr4yZTnSkO/JqKKglgkIAACGggQgIaTKDBDQxoICgDsSQgAQYhWPDuBLTVBgIAOw==";
I_SPIRITPOT = "data:image/gif;base64,R0lGODlhHgAgAOYAACsACFcRI//k9tvTlcq4Rvbkla+MEdOvI6eMK+TBRu3Tcv/tr8GVGv/2255yAIxpEcGVK4xyNNO4cnJPAO2vI6dyEXJPEYxPAMqVT08rAK9yK4xPEREIAGk0CIxPGns0AMGVcmkrAKdPEXs0CGk0EadyT9OnjEYaAGkrCIxPK3s0EYM0EVcaAEYaCGkrEad7aXs0GmkaAEYRACsRCIM0Gv/k21caCGkrGpVXRrh7aSsIAHsrGkYaEUYRCFcaEVcRCHs0KysAABEAAEYICCsICFcREUYREXs0NBEICINGRuTKyv/29u3k5AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACwAAAAAHgAgAAAH/4AeKig2hRkZLTYoiyMqJC4pJTgwKR4dJS8lJRoeJRgQDxs0FqQeph4VFRspEgsSEBIaCA0NBQoJEBYaBAeqHhYbwagPFxcICwUQBwQQCg0LCgcUCR0jCAm4Dyo0KioVoBsVrQUVB83PCQfqEC4a4QoFCZweFwYHBg4GBQ0YDBAQCxpIMGCAgYYRQ0ooqKChADIC+OwdYEBgwQINECo4k1DBQSoPMnQceYZBQyto6bAlcBgLAgaBD0ZcCIaCBxEjIAIW8NDQooKfKhkYRAbBwYQNDx6g6EEEhoYHEp6BSIHhVjp///4VKNDrQYQKSpkmcRUBgQJX4Qwk+Olwq4S1Cf8MhEqqwgiRkbQkPMAw0B7bgLQGHFibMdwDEkaE+Mi55BkCBwzSEWBQIYEEh9AgYKPsYEOGGURuPC0xoEG6rQggYvBpMt7gXp0RA0jSYACIrwzOSiCAq4CAJQWCrY2cgPKGDkZ0AKG1hEk0hwkAN/it4EIIfeYUYEBQYUQPHTYw7KsVPV6DJegFPJOw4VjvAq88/OBgo4JZZOUr1jiPvvFkaAc4RAsIRXDQAirNFECAQ0I581sDTNQAQUUKGLCBBuKZYAQSPXjwgFpcrfSPg0xstVAr2AxQ0gMptMChh9/cAuJltCyAAAIbAJRMRet50AMSBwZTmQL+tDWAgsVUwFL/RibtB0JyLZASzkrFRYeMAhlFpsBkK7G3FwgB6BClBagkUEsqVWF2CwRCVUBAjRJgUJcOJ0ipj0CQvYYNBAbEGMt95+VgRBB1AgPBPho0hM1E+WgGj0WvEHCWCQEQYcNRG1Q0wAUD1BDPLSFctuYB8JQay3cuhFPZAiVN95MrHxBFWUGfrLWQDDYkekFuC7hUQw0rsaoBNBWIcIEDM1VQkDkssJBARwEmU4CnAPW6GkfBbLCCTB59FAMDHkWHJS0EEFDDAAa0QkAFF6zgwQYffHBBKht4gEBRh9oowa8auZJuMtaZQkOxqaiygQobXICBCSVsYIISJkQggQmJShDLCwYoqADDDvVmu20gADs=";
I_CHANNELING = "data:image/gif;base64,R0lGODlhHgAgAOYAAEYjNBEAESMRIzQjNEY0RgAAERERIzQ0VyMjNEZGVyM0RjRGV09yjHKVryNGV3KvyityjE+v00+VrwAaI3LT7U9yeyuVp0/K03Lt9gARERFPTytychErKyNXV0+vryNGRnLT00+MjIz29jRXV3Kvr6f//4zT0yM0NKft7bj//zRGRk9pabjt7cr//4yvr0ZXV3KMjK/T08rt7Wl7e4OVlae4uMrb20/t23Lt25Xt26f/7YPKuLj/7a/t2yNXRsr/7U+ngzRXRtv/7XKvjCtGNE9pV9Pt22CMaSM0I4yvjEZXRoOeg6e4p7jKuGl7YP//5CsRETQjI0Y0NHtpabi4uKenp4ODg3t7e2lpaVdXV0ZGRjQ0NCMjIxEREQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACwAAAAAHgAgAAAH/4AjHx0VhSEwiEuKS1cziDAhkZIhhR0bFRshOzs5KCw/P0KhNVY1SS4pJSKrIjk4ICAeHpghsCI6OjygPzEvTExNGySqrBivFBYRPpkmOLe5Py0/My9WT1Y0G8SrON2xHhwjITk5IiU6ny0yKytUVjYyHSisIt04Fx4bBh/jziWeLFq4+FDNShMjPnZse3XPw4kCHEJ0u+WJRwsYJ1RkuUIjxokQOlYZA3HjggQOBU54mIgCBQ9dLzhs2aKECJYTK+bVw3ChJLgMH0g405EihS4XTrJgQZKxChYVIVRhwADiwgULHDL4AFGOKA8WMIKc2IJlBhIVTbSc+LBDxNSqEf8sIMjQAcQqXCxmfNiiRYsKK1acEjmBYAEJVxcixJ1b9y6PITL5+tUyZSkSLgIyaIBl1eQJunZFtBxxgoCUmVxOdNFChAuXKAYm1Kp6NWvd0D1kSpGiZcsJAVqyvB4gQMCED7Rr0yUBwtkOAwMAmB6LGXPxLgYMcHggK0IILhkcPICVowIHLgOiuB6wpUvx69gN7PgGgUsXB7Bw5JhgQABmBAagh4AA7l3n2nyJbQDebSCEkB121vm3hX0BBNBFfLVYtcFcm4FAAgcPPkigawjY10WFXBhQAWcQMOYBCStkJ2OFFxbnmo0BdvGBCbC0GF4DG/wmowEXWhhAhAIcSSTpEcw1yEEXJzCgwAQCDFlAkfEVZ0CFBmSgBAywhMDBkTMgQOWQWxpQgIUnundhBl6uMJ+YGXBwwgEDohmAmgVcGcCa2HWRgRYrMEfnCRUokGd2ezLap599/pmBFE4MsUMIn/GzwqInNtpFAV70WaSkSKxQC6YZnBAkmmluCeqjFT7axQuanMSBCipcGGKanT4aaZ8GnODEETuQ8IEgCRB44bLLxuprn15wMEMRRwDxQAj5KIols70+mwFEHxQxLAncWeBAiVDoyuaovoYKEQfiVuDBtRB0MCCzkVZYoRf89hutTEocIYEEgQAAOw==";

jQuery.fn.outerHTML = function () {
	return $("<div>").append(this.eq(0).clone()).html();
};
Array.prototype.init = function (b) {
	if (b === undefined) b = 0;
	for (var a = 0; a < this.length; a++) this[a] = b;
};

loadSettingsObject();
loadLTCObject();

function evResLoad( e ){
	var ele = e.target;
	if (ele.tagName === "IMG"){
		if (ele.src.indexOf("hentaiverse.png") > -1) ele.setAttribute("SRC", _settings.isHideHVLogo ? "" : I_HVLOGO);
		else if (ele.src.indexOf("nbargreen.png") > -1) ele.setAttribute("SRC", I_NBARGREEN);
		else if (ele.src.indexOf("nbarblue.png") > -1){
			MNUM = (ele.parentNode.parentNode.parentNode.parentNode.parentNode.childNodes.length - 6 ) / 2;
			MCOUNT++;
			ele.setAttribute("SRC", I_NBARBLUE);
			if (!HASMS && DOMLOADED && MCOUNT === MNUM) main2();
		}
		else if (ele.src.indexOf("nbardead.png") > -1){
			ele.setAttribute("SRC", I_NBARDEAD);
			ele.setAttribute("ALT", "bardead");
		}
	}
}

function evDomLoad(){
	DOMLOADED = true;
	if (!browserIsChrome() && !cssInserted()) {
		GM_addStyle(GM_getResourceText("jQueryUICSS"));
		cssAdded();
	}
	main();
}

function main(b) {
	loadSettingsObject();
	var a = localStorage.getItem(HV_EQUIP);
	var c = (a === null) ? false : JSON.parse(a);
	if (!browserIsChrome() && _settings.isHideHVLogo) document.getElementsByTagName("img")[0].src = "";
	if (_settings.isChangePageTitle) {
		var t1 = TimeCounter(1);
		obscureHVIds();
		_ltc.hidetitle[0]++;
		_ltc.hidetitle[1] += (TimeCounter(0, t1));
		_ltc.obscureHVIds[0]++;
		_ltc.obscureHVIds[1] += (TimeCounter(0, t1));
	}
	if (isBattle()) {
		if (_settings.isShowMonsterNumber) showMonsterNumber();
		if (_settings.isMainEffectsAlertSelf) AlertEffectsSelf();
		if (_settings.isMainEffectsAlertMonsters) AlertEffectsMonsters();
		collectRoundInfo();
		if (_settings.warnMode[_round.battleType]) {
			var t2 = TimeCounter(1);
			healthWarning();
			_ltc.healthWarning[0]++;
			_ltc.healthWarning[1] += (TimeCounter(0, t2));
		}
		if ((_round !== null) && (_round.currRound > 0)) {
			var t3 = TimeCounter(1);
			showRoundCounter();
			_ltc.showRoundCounter[0]++;
			_ltc.showRoundCounter[1] += (TimeCounter(0, t3));
		}
		displayPowerupBox();
		if (_settings.isShowDivider) {
			var t4 = TimeCounter(1);
			addBattleLogDividers();
			_ltc.addBattleLogDividers[0]++;
			_ltc.addBattleLogDividers[1] += (TimeCounter(0, t4));
		}
		if (_settings.isShowHighlight) {
			var t5 = TimeCounter(1);
			highlightLogText();
			_ltc.highlightLogText[0]++;
			_ltc.highlightLogText[1] += (TimeCounter(0, t5));
		}
		if (_settings.isShowSelfDuration) {
			var t7 = TimeCounter(1);
			showSelfEffectsDuration();
			_ltc.showSelfEffectsDuration[0]++;
			_ltc.showSelfEffectsDuration[1] += (TimeCounter(0, t7));
		}
		if ( browserIsChrome() ){
			if (MCOUNT === MNUM && !HASMS) main2();
		} else main2();
	} else {
		if (!isBattle() && (_round !== null)) _round.reset();
		else if (_settings.isColumnInventory && isItemInventoryPage()) initItemsView();
		else if (isCharacterPage()) collectCurrentProfsData();
		else if (isShrinePage() && _settings.isTrackShrine) captureShrine();
	}
	if (_settings.isShowSidebarProfs) {
		var t9 = TimeCounter(1);
		showSidebarProfs();
		_ltc.showSidebarProfs[0]++;
		_ltc.showSidebarProfs[1] += (TimeCounter(0, t9));
	}
	if (c) inventoryWarning();
	initUI();
	main3();
}
function main2(){
	if ((_round !== null) && (_round.monsters.length > 0)){
		var t6 = TimeCounter(1);
		showMonsterStats();
		_ltc.showMonsterStats[0]++;
		_ltc.showMonsterStats[1] += (TimeCounter(0, t6));
	}
	if (isBattleOver()) {
		if (_settings.isShowEndStats) {
			var t8 = TimeCounter(1);
			showBattleEndStats();
			_ltc.showBattleEndStats[1] += (TimeCounter(0, t8));
		}
		saveStats();
		_round.reset();
	}
	if (_settings.isShowStatsPopup) {
		var t45 = TimeCounter(1);
		MonsterPopup();
		_ltc.monsterpopup[0]++;
		_ltc.monsterpopup[1] += TimeCounter(0, t45);
	}
	if (_settings.isShowScanButton || _settings.isShowSkillButton || _settings.isEnableScanHotkey || _settings.isEnableSkillHotkey) {
		var t46 = TimeCounter(1);
		Scanbutton();
		_ltc.showscanbutton[0]++;
		_ltc.showscanbutton[1] += TimeCounter(0, t46);
	}
}
function obscureHVIds() {
	var t20 = TimeCounter(1);
	if (_settings.isChangePageTitle && (document.title === "The HentaiVerse"))
		document.title = _settings.customPageTitle;
	_ltc.hidetitle[1] -= TimeCounter(0, t20);
}
function highlightLogText() {
	$("#togpane_log td:last-child").each(function () {
		var b = $(this);
		var a = b.html();
		if (a.match(/(you crit)|crits|blasts|unleash/i)) b.css("font-weight", "bold");
		if (a.match(/(you (hit|crit|counter))|(your offhand (hit|crit))|(unleash)/i)) b.css("color", !_settings.isAltHighlight ? "blue" : "black");
		else if (a.match(/you cast/i) || a.match(/explodes for/i)) b.css("color", "teal");
		else if (a.match(/hits|blasts/i) && !a.match(/hits you /i) && !a.match(/(bleeding wound)|(spreading poison)|(your spike shield)|(searing skin)|(burning soul) hits/i)) b.css("color", !_settings.isAltHighlight ? "teal" : "black");
		else if (a.match(/procs the effect/i) && !_settings.isAltHighlight) b.css("color", "#800080");
		else if (a.match(/(bleeding wound)|(spreading poison)|(your spike shield)|(searing skin)|(burning soul) hits/i) && !a.match(/has expired/i)) b.css("color", "#800080");
		else if (a.match(/(you (dodge|evade|block|parry|resist))|(misses.*?against you)/i)) b.css("color", !_settings.isAltHighlight ? "#999999" : "#555555");
		else if (a.match(/restores|(you are healed)|recovered/i)) b.css("color", "green");
		else if (a.match(/you gain/i) && !a.match(/drained/i) && !_settings.isAltHighlight) b.css("color", "#ba9e1c");
		else if (a.match(/(hostile spell is drained)|(you drain)|(ether theft drains)|(lifestream drains)/i)) b.css("color", "green");
		else if (a.match(/enough mp/i)) b.css("color", "#ff7777");
		else if (a.match(/(hits|crits) you /i) && !a.match(/(hits|crits) you for 1 /i)) b.css("color", "red");
		else if (a.match(/(hits|crits) you for 1 /i)) b.css("color", "#999999");
		else if (a.match(/Your attack misses its mark/)) b.css("color", !_settings.isAltHighlight ? "#999999" : "orange");
		else if (a.match(/Your spell misses its mark/)) b.css("color", !_settings.isAltHighlight ? "#999999" : "orange");
		else if (a.match(/casts/)) b.css("color", "#0016b8");
		else if (a.match(/uses/i)) b.css("color", !_settings.isAltHighlight ? "orange" : "blue");
		else if (a.match(/powerup/i)) b.css("color", "#ff00ff");
		else if (a.match(/charging soul/i)) b.css("color", "#C97600");
		else if (a.match(/your spirit shield absorbs/i)) b.css("color", "#C97600");
		if (_settings.isAltHighlight) {
			if (a.match(/gains the effect (bleeding|penetrated|stun|(ripened soul))/i) && !a.match(/(bleeding|penetrated|stun|(ripened soul)).*expired/i)) b.css("color", "#800080");
			else if (a.match(/proficiency/i)) b.css("color", "#ba9e1c");
		}
	});
}
function addBattleLogDividers() {
	var a = -1;
	$("#togpane_log td:first-child").each(function () {
		if ($(this).html() !== a) {
			if (a >= 0) $(this).parent("tr").before("<tr><td colspan='3'><hr style='border:0; height:1px; background-color:#666666; color:#666666' /></td></tr>")
			a = $(this).html();
		}
	});
}
function showRoundCounter() {
	var b = "";
	var c = _round.currRound;
	var a = _round.maxRound;
	b = a > 0 ? c + "/" + a : "#" + c;
	html = "<div style='font-size:18px;font-weight:bold;font-family:arial,helvetica,sans-serif;text-align:right;position:absolute;top:6px;right:17px;'><div style='" + (c === a - 1 ? "color:orange;'>" : c === a ? "color:red;'>" : "'>") + b + "</div></div>";
	$("#battleform").children().eq(0).append(html);
}
function displayPowerupBox() {
	var a = $("div.btp");
	var c = document.createElement("div");
	c.setAttribute("style", "position:absolute;top:7px;right:5px;background-color:#EFEEDC;width:30px;height:32px;border-style:double;border-width:2px;border-color:#555555;");
	var e = document.getElementById("ikey_p");
	if (e === null) c.innerHTML = "<span style='font-size:16px;font-weight:bold;font-family:arial,helvetica,sans-serif;text-align:center;line-height:32px;cursor:default'>P</span>";
	else {
		var b = e.getAttribute("onmouseover").match(/set_infopane_item\('.+?'/img)[0].substring(18);
		c.setAttribute("onmouseover", e.getAttribute("onmouseover"));
		c.setAttribute("onmouseout", e.getAttribute("onmouseout"));
		c.setAttribute("onclick", 'document.getElementById("ckey_items").onclick();document.getElementById("ikey_p").onclick();document.getElementById("ikey_p").onclick()');
		if (b.match(/health/i)) c.innerHTML = "<img class='PowerupGemIcon' src='"+ I_HEALTHPOT+ "' id='healthgem'>";
		else if (b.match(/mana/i)) c.innerHTML = "<img class='PowerupGemIcon' src='"+ I_MANAPOT+ "' id='managem'>";
		else if (b.match(/spirit/i)) c.innerHTML = "<img class='PowerupGemIcon' src='"+ I_SPIRITPOT+ "' id='spiritgem'>";
		else if (b.match(/mystic/i)) c.innerHTML = "<img class='PowerupGemIcon' src='"+ I_CHANNELING+ "' id='channelgem'>";
	}
	a.after(c);
}
function showMonsterStats() {
	if (!(_settings.isShowMonsterHP || _settings.isShowMonsterMP || _settings.isShowMonsterSP || _settings.isShowMonsterElements || _settings.isShowMonsterDuration || _settings.isShowStatsPopup)) return;
	var a = new ElementalStats();
	$("#monsterpane > div").each(function (n) {
		var u = $(this);
		if (u === undefined || u.height() >= 100) return;
		var monInfo = _round.monsters[_round.monsters.length - 1 - n];
		if (monInfo === undefined) return;
		var k = u.children().eq(1).children().eq(0);
		var s = k.children().length > 1;
		var e = u.children().eq(2).children().eq(0);
		var h = u.children().eq(2).children().eq(1);
		var sp = u.children().eq(2).children().eq(2);
		var m = e.html().match(/bardead/i);
		if ((_settings.isShowMonsterHP || _settings.isShowMonsterHPPercent || _settings.isShowStatsPopup) && !m) {
			var t31 = TimeCounter(1);
			var l = monInfo.maxHp;
			var o = 0;
			var g = "";
			var b = e.children().eq(0).children("img").eq(1).width() / 120;
			if (_settings.isShowMonsterHPPercent) g = (b * 100).toFixed(2) + "%"
			else {
				o = Math.floor(b * l);
				g = o + " / " + l;
			}
			var r = "<div style='position:absolute;z-index:1074;top:-1px;font-size:8pt;font-family:arial,helvetica,sans-serif;font-weight:bolder;color:yellow;width:120px;text-align:center'>" + g + "</div>";
			e.after(r);
			_ltc.showhp[0]++;
			_ltc.showhp[1] += TimeCounter(0, t31);
		}
		if ((_settings.isShowMonsterMP || _settings.isShowStatsPopup) && !m) {
			var t32 = TimeCounter(1);
			var v = h.children().eq(0).children("img").eq(1).width() / 120;
			var f = (v * 100).toFixed(1);
			var j = "<div style='position:absolute;z-index:1074;top:11px;font-size:8pt;font-family:arial,helvetica,sans-serif;font-weight:bolder;color:yellow;width:120px;text-align:center'>" + f + "%</div>";
			h.after(j);
			_ltc.showmp[0]++;
			_ltc.showmp[1] += TimeCounter(0, t32);
		}
		if ((_settings.isShowMonsterSP || _settings.isShowStatsPopup) && !m) {
			var t62 = TimeCounter(1);
			var sppart = sp.children().eq(0).children("img").eq(1).width() / 120;
			var perc = (sppart * 100).toFixed(1);
			var sptext = "<div style='position:absolute;z-index:1074;top:23px;font-size:8pt;font-family:arial,helvetica,sans-serif;font-weight:bolder;color:yellow;width:120px;text-align:center'>" + perc + "%</div>";
			sp.after(sptext);
			_ltc.showsp[0]++;
			_ltc.showsp[1] += TimeCounter(0, t62);
		}
		if (_settings.isShowStatsPopup) {
			var t45 = TimeCounter(1);
			o = Math.floor(b * l);
			monInfo.currHp = o;
			monInfo.currmp = v;
			_round.save();
			_ltc.monsterpopup[1] += TimeCounter(0, t45);
		}
		var t33 = TimeCounter(1);
		if (_settings.isShowMonsterElements && !m && (monInfo.id < 1000 || _settings.isShowElemHvstatStyle)) {
			var t;
			getMonsterElementsById(a, monInfo.id);
			var d = a.majWeak === "-" ? "" : "[<span style='color:#005826'>" + a.majWeak + "</span>";
				d += a.minWeak === "-" ? "" : ";<span style='color:#3CB878'>" + a.minWeak + "</span>";
				d += a.resist === "-" ? "" : ";<span style='color:red'>" + a.resist + "</span>";
				d += a.imperv === "-" ? "" : ";<span style='color:black'>" + a.imperv + "</span>]";
			if (_settings.isShowElemHvstatStyle) {
				var milliseconds2 = TimeCounter(1);
				var kk = k.children().eq(0);
				var kkl = kk.html().length;
				var mclass = "";
				var mpl = "";
				var mweak = "";
				var mresist = "";
				var mimperv = "";
				var mskilltype = "";
				var mskillspell = "";
				var mskilltype2 = "";
				var mskillspell2 = "";
				var mskilltype3 = "";
				var mskillspell3 = "";
				var mspirittype = "";
				var mspiritsksp = "";
				var mattack = "";
				var allm = 0;
				var allm1 = 0;
				mclass = monInfo.mclass;
				allm += 2;
				if (_settings.isShowPLHvstatStyle) {
					mpl = monInfo.mpl;
					if (mpl !== 0) allm += 2;
				}
				if (_settings.isShowWeakHvstatStyle) {
					mweak = MElemNum(monInfo.mweak, 1);
					allm += 2;
				}
				if (_settings.isShowResHvstatStyle) {
					mresist = MElemNum(monInfo.mresist, 1);
					mimperv = MElemNum(monInfo.mimperv, 1);
					allm += _settings.isShowWeakHvstatStyle ? 2 : 3;
				}
				if (_settings.isShowAttackHvstatStyle) {
					if (monInfo.mskillspell !== undefined) {
						var sk = String(monInfo.mskillspell);
						if (sk.length === 1 || sk.match("9")) {
							if (monInfo.mskillspell < 3 || sk.match("9")) {
								mskilltype = MElemNum(monInfo.mskilltype, 1);
								mskillspell = MElemNum(monInfo.mskillspell, 1);
							} else {
								mspirittype = MElemNum(monInfo.mskilltype, 1);
								mspiritsksp = MElemNum(monInfo.mskillspell, 1);
								allm -= 7;
							}
						} else {
							var mskillspellarray = sk.split("0");
							var mskilltypearray = String(MElemNum(monInfo.mskilltype, 1)).split(", ");
							var sk34 = sk.replace("0","").search(/(3|4)/);
							var other1 = 0;
							var other2 = 0;
							if (sk.length === 3) {
								if (sk34 >= 0) {
									other = sk34 > 0 ? 0 : 1;
									mspirittype = mskilltypearray[sk34];
									mspiritsksp = MElemNum(parseInt(mskillspellarray[sk34]), 1);
									mskillspell = MElemNum(parseInt(mskillspellarray[other1]), 1);
									mskilltype = mskilltypearray[other1];
								} else {
									mskillspell = MElemNum(parseInt(mskillspellarray[0]), 1);
									mskilltype = mskilltypearray[0];
									mskillspell2 = MElemNum(parseInt(mskillspellarray[1]), 1);
									mskilltype2 = mskilltypearray[1];
								}
								allm += 2;
								if (mskillspell === mskillspell2) {
									mskillspell2 = "";
									mskilltype = mskilltype + ", " + mskilltype2;
									mskilltype2 = "";
									allm -= 2;
								} else if (mskilltype === mskilltype2) {
									mskillspell = mskillspell + ", " + mskillspell2;
									mskillspell2 = "";
									mskilltype2 = "";
									allm -= 2;
								}
							} else if (sk.length === 5) {
								if (sk34 >= 0) {
									other1 = sk34 > 0 ? 0 : 1;
									other2 = sk34 > 1 ? 1 : 2;
									mspirittype = mskilltypearray[sk34];
									mspiritsksp = MElemNum(parseInt(mskillspellarray[sk34]), 1);
									mskillspell = MElemNum(parseInt(mskillspellarray[other1]), 1);
									mskilltype = mskilltypearray[other1];
									mskillspell2 = MElemNum(parseInt(mskillspellarray[other2]), 1);
									mskilltype2 = mskilltypearray[other2];
								} else {
									mskillspell = MElemNum(parseInt(mskillspellarray[0]), 1);
									mskilltype = mskilltypearray[0];
									mskillspell2 = MElemNum(parseInt(mskillspellarray[1]), 1);
									mskilltype2 = mskilltypearray[1];
									mskillspell3 = MElemNum(parseInt(mskillspellarray[2]), 1);
									mskilltype3 = mskilltypearray[2];
								}
								allm += 4;
								if (mskillspell === mskillspell2) {
									mskillspell2 = "";
									mskilltype = mskilltype + ", " + mskilltype2;
									mskilltype2 = "";
									allm -= 2;
								} else if (mskillspell === mskillspell3) {
									mskillspell3 = "";
									mskilltype = mskilltype + ", " + mskilltype3;
									mskilltype3 = "";
									allm -= 2;
								} else if (mskillspell2 === mskillspell3) {
									mskillspell3 = "";
									mskilltype2 = mskilltype2 + ", " + mskilltype3;
									mskilltype3 = "";
									allm -= 2;
								} else if (mskilltype === mskilltype2) {
									mskillspell = mskillspell + ", " + mskillspell2;
									mskillspell2 = "";
									mskilltype2 = "";
									allm -= 2;
								} else if (mskilltype === mskilltype3) {
									mskillspell = mskillspell + ", " + mskillspell3;
									mskillspell3 = "";
									mskilltype3 = "";
									allm -= 2;
								} else if (mskilltype2 === mskilltype3) {
									mskillspell2 = mskillspell2 + ", " + mskillspell3;
									mskillspell3 = "";
									mskilltype3 = "";
									allm -= 2;
								}
							}
						}
					}
					mattack = MElemNum(monInfo.mattack, 1);
					allm += 4;
				}
				if (mpl === undefined || mpl === null) {
					mpl = 0;
					allm -= 2;
				}
				if (mskillspell === undefined || mskillspell === null || mskillspell === 0 || mskillspell === "0"){
					mskillspell = "";
					allm -= 1;
				}
				if (mskilltype === undefined || mskilltype === null || mskilltype === 0 || mskilltype === "0"){
					mskilltype = "";
					allm -= 1;
				}
				if (mclass !== undefined) mclass = mclass > 30 ? "-" : MClassNum(mclass, 1);
						
				mclass = String(mclass);
				mweak = String(mweak);
				mresist = String(mresist);
				mimperv = String(mimperv);
				mskilltype = String(mskilltype);
				mskillspell = String(mskillspell);
				mskilltype2 = String(mskilltype2);
				mskillspell2 = String(mskillspell2);
				mskilltype3 = String(mskilltype3);
				mskillspell3 = String(mskillspell3);
				mspirittype = String(mspirittype);
				mspiritsksp = String(mspiritsksp);
				mattack = String(mattack);
				if (_settings.ResizeMonsterInfo){
					if (_settings.HideThisResHvstatStyle[0] || _settings.HideThisResHvstatStyle[1] || _settings.HideThisResHvstatStyle[2]) {
						mweak = mweak.replace(", Phys", "Slash, Crush, Pierc").replace("?Phys", "Slash, Crush, Pierc").replace("Phys", "Slash, Crush, Pierc");
						mresist = mresist.replace(", Phys", "Slash, Crush, Pierc").replace("?Phys", "Slash, Crush, Pierc").replace("Phys", "Slash, Crush, Pierc");
						mimperv = mimperv.replace(", Phys", "Slash, Crush, Pierc").replace("?Phys", "Slash, Crush, Pierc").replace("Phys", "Slash, Crush, Pierc");
					}
					if (_settings.HideThisResHvstatStyle[3] || _settings.HideThisResHvstatStyle[4] || _settings.HideThisResHvstatStyle[5] || _settings.HideThisResHvstatStyle[6]) {
						mweak = mweak.replace(", Elem", "Fire, Cold, Elec, Wind").replace("?Elem", "Fire, Cold, Elec, Wind").replace("Elem", "Fire, Cold, Elec, Wind");
						mresist = mresist.replace(", Elem", "Fire, Cold, Elec, Wind").replace("?Elem", "Fire, Cold, Elec, Wind").replace("Elem", "Fire, Cold, Elec, Wind");
						mimperv = mimperv.replace(", Elem", "Fire, Cold, Elec, Wind").replace("?Elem", "Fire, Cold, Elec, Wind").replace("Elem", "Fire, Cold, Elec, Wind");
					}
					if (_settings.HideThisResHvstatStyle[0]) {
						mweak = mweak.replace(", Slashing", "").replace(", Slash", "").replace("Slashing", "").replace("Slash", "");
						mresist = mresist.replace(", Slashing", "").replace(", Slash", "").replace("Slashing", "").replace("Slash", "");
						mimperv = mimperv.replace(", Slashing", "").replace(", Slash", "").replace("Slashing", "").replace("Slash", "");
					}
					if (_settings.HideThisResHvstatStyle[1]) {
						mweak = mweak.replace(", Crushing", "").replace(", Crush", "").replace("Crushing", "").replace("Crush", "");
						mresist = mresist.replace(", Crushing", "").replace(", Crush", "").replace("Crushing", "").replace("Crush", "");
						mimperv = mimperv.replace(", Crushing", "").replace(", Crush", "").replace("Crushing", "").replace("Crush", "");
					}
					if (_settings.HideThisResHvstatStyle[2]) {
						mweak = mweak.replace(", Piercing", "").replace(", Pierc", "").replace("Piercing", "").replace("Pierc", "");
						mresist = mresist.replace(", Piercing", "").replace(", Pierc", "").replace("Piercing", "").replace("Pierc", "");
						mimperv = mimperv.replace(", Piercing", "").replace(", Pierc", "").replace("Piercing", "").replace("Pierc", "");
					}
					if (_settings.HideThisResHvstatStyle[3]) {
						mweak = mweak.replace(", Fire", "").replace("Fire", "");
						mresist = mresist.replace(", Fire", "").replace("Fire", "");
						mimperv = mimperv.replace(", Fire", "").replace("Fire", "");
					}
					if (_settings.HideThisResHvstatStyle[4]) {
						mweak = mweak.replace(", Cold", "").replace("Cold", "");
						mresist = mresist.replace(", Cold", "").replace("Cold", "");
						mimperv = mimperv.replace(", Cold", "").replace("Cold", "");
					}
					if (_settings.HideThisResHvstatStyle[5]) {
						mweak = mweak.replace(", Elec", "").replace("Elec", "");
						mresist = mresist.replace(", Elec", "").replace("Elec", "");
						mimperv = mimperv.replace(", Elec", "").replace("Elec", "");
					}
					if (_settings.HideThisResHvstatStyle[6]) {
						mweak = mweak.replace(", Wind", "").replace("Wind", "");
						mresist = mresist.replace(", Wind", "").replace("Wind", "");
						mimperv = mimperv.replace(", Wind", "").replace("Wind", "");
					}
					if (_settings.HideThisResHvstatStyle[7]) {
						mweak = mweak.replace(", Holy", "").replace("Holy", "");
						mresist = mresist.replace(", Holy", "").replace("Holy", "");
						mimperv = mimperv.replace(", Holy", "").replace("Holy", "");
					}
					if (_settings.HideThisResHvstatStyle[8]) {
						mweak = mweak.replace(", Dark", "").replace("Dark", "");
						mresist = mresist.replace(", Dark", "").replace("Dark", "");
						mimperv = mimperv.replace(", Dark", "").replace("Dark", "");
					}
					if (_settings.HideThisResHvstatStyle[9]) {
						mweak = mweak.replace(", Soul", "").replace("Soul", "");
						mresist = mresist.replace(", Soul", "").replace("Soul", "");
						mimperv = mimperv.replace(", Soul", "").replace("Soul", "");
					}
					if (_settings.HideThisResHvstatStyle[10]) {
						mweak = mweak.replace(", Void", "").replace("Void", "");
						mresist = mresist.replace(", Void", "").replace("Void", "");
						mimperv = mimperv.replace(", Void", "").replace("Void", "");
					}
				
					var maxchar = (12 - kkl) * (kkl <= 12 ? 0.7 : 1.4) + 46;
					allm1 = allm + mclass.length + mskillspell.length + mskilltype.length + mimperv.length + mresist.length + mweak.length + mattack.length + String(mpl).length + mskillspell2.length + mskilltype2.length + mskillspell3.length + mskilltype3.length + mspiritsksp.length + mspirittype.length;
					if (allm1 > maxchar) {
						if (kkl > 12 && !isHVFontEngine()) {
							kk.css("font-size", 12);
							kk.css("font-weight", "bold")
						}
						if (kkl >= 17 && !isHVFontEngine()) kk.html(kk.html().slice(0,15) + "...");
						kkl = kk.html().length;
						if (kkl <= 5) maxchar =  (12 - kkl)*1.9 + 46;
						else if (kkl <= 12) maxchar =  (12 - kkl)*1.95 + 46;
						else if (kkl < 17) maxchar =  (17 - kkl)*0.8 + 46;
						else maxchar =  (18 - kkl)*1.2 + 46;
					}
					if (allm1 > maxchar) {
						mimperv = mimperv.replace(/\s/g, "");
						mresist = mresist.replace(/\s/g, "");
						mweak = mweak.replace(/\s/g, "");
						mskilltype = mskilltype.replace(/\s/g, "");
						mskilltype2 = mskilltype2.replace(/\s/g, "");
						mskillspell = mskillspell.replace(/\s/g, "");
						mskillspell2 = mskillspell2.replace(/\s/g, "");
						allm1 = allm + mclass.length + mskillspell.length + mskilltype.length + mimperv.length + mresist.length + mweak.length + mattack.length + String(mpl).length + mskillspell2.length + mskilltype2.length + mskillspell3.length + mskilltype3.length + mspiritsksp.length + mspirittype.length;
					}
					if (allm1 > maxchar) {
						mskilltype = mskilltype.replace("Slash", "Sl").replace("Crush", "Cr").replace("Pierc", "Pi");
						mskilltype2 = mskilltype2.replace("Slash", "Sl").replace("Crush", "Cr").replace("Pierc", "Pi");
						mskilltype3 = mskilltype3.replace("Slash", "Sl").replace("Crush", "Cr").replace("Pierc", "Pi");
						mspirittype = mspirittype.replace("Slash", "Sl").replace("Crush", "Cr").replace("Pierc", "Pi");
						mspiritsksp = mspiritsksp.replace("Spirit:", "S:");
						mattack = mattack.replace("Slash", "Sl").replace("Crush", "Cr").replace("Pierc", "Pi");
						allm1 = allm + mclass.length + mskillspell.length + mskilltype.length + mimperv.length + mresist.length + mweak.length + mattack.length + String(mpl).length + mskillspell2.length + mskilltype2.length + mskillspell3.length + mskilltype3.length + mspiritsksp.length + mspirittype.length;
					}
					if (allm1 > maxchar) {
						mimperv = mimperv.replace("Slash", "Sl").replace("Crush", "Cr").replace("Pierc", "Pi");
						mresist = mresist.replace("Slash", "Sl").replace("Crush", "Cr").replace("Pierc", "Pi");
						allm1 = allm + mclass.length + mskillspell.length + mskilltype.length + mimperv.length + mresist.length + mweak.length + mattack.length + String(mpl).length + mskillspell2.length + mskilltype2.length + mskillspell3.length + mskilltype3.length + mspiritsksp.length + mspirittype.length;
					}
					if (allm1 > maxchar) {
						mweak = mweak.replace("Slash", "Sl").replace("Crush", "Cr").replace("Pierc", "Pi");
						mspiritsksp = mspiritsksp.replace("S:", "");
						allm1 = allm + mclass.length + mskillspell.length + mskilltype.length + mimperv.length + mresist.length + mweak.length + mattack.length + String(mpl).length + mskillspell2.length + mskilltype2.length + mskillspell3.length + mskilltype3.length + mspiritsksp.length + mspirittype.length;
					}
					if (allm1 > maxchar) {
						mclass = mclass.slice(0, 4);
						allm1 = allm + mclass.length + mskillspell.length + mskilltype.length + mimperv.length + mresist.length + mweak.length + mattack.length + String(mpl).length + mskillspell2.length + mskilltype2.length + mskillspell3.length + mskilltype3.length + mspiritsksp.length + mspirittype.length;
					}
					if (allm1 > maxchar) {
						mclass = mclass.slice(0, 3);
						allm1 = allm + mclass.length + mskillspell.length + mskilltype.length + mimperv.length + mresist.length + mweak.length + mattack.length + String(mpl).length + mskillspell2.length + mskilltype2.length + mskillspell3.length + mskilltype3.length + mspiritsksp.length + mspirittype.length;
					}
					if (allm1 > maxchar) {
						mskilltype = mskilltype.replace("Fire", "Fir").replace("Cold", "Col").replace("Elec", "Ele").replace("Wind", "Win").replace("Holy", "Hol").replace("Dark", "Dar").replace("Soul", "Sou").replace("Slash", "Sl").replace("Crush", "Cr").replace("Pierc", "Pi");
						mskilltype2 = mskilltype2.replace("Fire", "Fir").replace("Cold", "Col").replace("Elec", "Ele").replace("Wind", "Win").replace("Holy", "Hol").replace("Dark", "Dar").replace("Soul", "Sou").replace("Slash", "Sl").replace("Crush", "Cr").replace("Pierc", "Pi");
						mskilltype3 = mskilltype3.replace("Fire", "Fir").replace("Cold", "Col").replace("Elec", "Ele").replace("Wind", "Win").replace("Holy", "Hol").replace("Dark", "Dar").replace("Soul", "Sou").replace("Slash", "Sl").replace("Crush", "Cr").replace("Pierc", "Pi");
						mspirittype = mspirittype.replace("Fire", "Fir").replace("Cold", "Col").replace("Elec", "Ele").replace("Wind", "Win").replace("Holy", "Hol").replace("Dark", "Dar").replace("Soul", "Sou").replace("Slash", "Sl").replace("Crush", "Cr").replace("Pierc", "Pi");
						mattack = mattack.replace("Fire", "Fir").replace("Cold", "Col").replace("Elec", "Ele").replace("Wind", "Win").replace("Holy", "Hol").replace("Dark", "Dar").replace("Soul", "Sou").replace("Slash", "Sl").replace("Crush", "Cr").replace("Pierc", "Pi");
						allm1 = allm + mclass.length + mskillspell.length + mskilltype.length + mimperv.length + mresist.length + mweak.length + mattack.length + String(mpl).length + mskillspell2.length + mskilltype2.length + mskillspell3.length + mskilltype3.length + mspiritsksp.length + mspirittype.length;
					}
					if (allm1 > maxchar) {
						mresist = mresist.replace("Fire", "Fir").replace("Cold", "Col").replace("Elec", "Ele").replace("Wind", "Win").replace("Holy", "Hol").replace("Dark", "Dar").replace("Soul", "Sou").replace("Slash", "Sl").replace("Crush", "Cr").replace("Pierc", "Pi");
						mimperv = mimperv.replace("Fire", "Fir").replace("Cold", "Col").replace("Elec", "Ele").replace("Wind", "Win").replace("Holy", "Hol").replace("Dark", "Dar").replace("Soul", "Sou").replace("Slash", "Sl").replace("Crush", "Cr").replace("Pierc", "Pi");
						allm1 = allm + mclass.length + mskillspell.length + mskilltype.length + mimperv.length + mresist.length + mweak.length + mattack.length + String(mpl).length + mskillspell2.length + mskilltype2.length + mskillspell3.length + mskilltype3.length + mspiritsksp.length + mspirittype.length;
					}
					if (allm1 > maxchar) {
						mweak = mweak.replace("Fire", "Fir").replace("Cold", "Col").replace("Elec", "Ele").replace("Wind", "Win").replace("Holy", "Hol").replace("Dark", "Dar").replace("Soul", "Sou").replace("Slash", "Sl").replace("Crush", "Cr").replace("Pierc", "Pi");
						allm1 = allm + mclass.length + mskillspell.length + mskilltype.length + mimperv.length + mresist.length + mweak.length + mattack.length + String(mpl).length + mskillspell2.length + mskilltype2.length + mskillspell3.length + mskilltype3.length + mspiritsksp.length + mspirittype.length;
					}
					if (allm1 > maxchar) {
						mskillspell = mskillspell.replace("Mag", "Ma").replace("Phys", "Ph");
						mskillspell2 = mskillspell2.replace("Mag", "Ma").replace("Phys", "Ph");
						mskillspell3 = mskillspell3.replace("Mag", "Ma").replace("Phys", "Ph");
						mspiritsksp = mspiritsksp.replace("Mag", "Ma").replace("Phys", "Ph");
						allm1 = allm + mclass.length + mskillspell.length + mskilltype.length + mimperv.length + mresist.length + mweak.length + mattack.length + String(mpl).length + mskillspell2.length + mskilltype2.length + mskillspell3.length + mskilltype3.length + mspiritsksp.length + mspirittype.length;
					}
					if (allm1 > maxchar) {
						mattack = mattack.replace("Fir", "Fi").replace("Col", "Co").replace("Ele", "El").replace("Win", "Wi").replace("Hol", "Ho").replace("Dar", "Da").replace("Sou", "So").replace("Elm", "Elem");
						mskilltype = mskilltype.replace("Fir", "Fi").replace("Col", "Co").replace("Ele", "El").replace("Win", "Wi").replace("Hol", "Ho").replace("Dar", "Da").replace("Sou", "So").replace("Elm", "Elem");
						mskilltype2 = mskilltype2.replace("Fir", "Fi").replace("Col", "Co").replace("Ele", "El").replace("Win", "Wi").replace("Hol", "Ho").replace("Dar", "Da").replace("Sou", "So").replace("Elm", "Elem");
						mskilltype3 = mskilltype3.replace("Fir", "Fi").replace("Col", "Co").replace("Ele", "El").replace("Win", "Wi").replace("Hol", "Ho").replace("Dar", "Da").replace("Sou", "So").replace("Elm", "Elem");
						mspirittype = mspirittype.replace("Fir", "Fi").replace("Col", "Co").replace("Ele", "El").replace("Win", "Wi").replace("Hol", "Ho").replace("Dar", "Da").replace("Sou", "So").replace("Elm", "Elem");
						allm1 = allm + mclass.length + mskillspell.length + mskilltype.length + mimperv.length + mresist.length + mweak.length + mattack.length + String(mpl).length + mskillspell2.length + mskilltype2.length + mskillspell3.length + mskilltype3.length + mspiritsksp.length + mspirittype.length;
					}
					if (allm1 > maxchar) {
						mresist = mresist.replace("Fir", "Fi").replace("Col", "Co").replace("Ele", "El").replace("Win", "Wi").replace("Hol", "Ho").replace("Dar", "Da").replace("Sou", "So").replace("Elm", "Elem");
						mimperv = mimperv.replace("Fir", "Fi").replace("Col", "Co").replace("Ele", "El").replace("Win", "Wi").replace("Hol", "Ho").replace("Dar", "Da").replace("Sou", "So").replace("Elm", "Elem");
						allm1 = allm + mclass.length + mskillspell.length + mskilltype.length + mimperv.length + mresist.length + mweak.length + mattack.length + String(mpl).length + mskillspell2.length + mskilltype2.length + mskillspell3.length + mskilltype3.length + mspiritsksp.length + mspirittype.length;
					}
					if (allm1 > maxchar) {
						mweak = mweak.replace("Fir", "Fi").replace("Col", "Co").replace("Ele", "El").replace("Win", "Wi").replace("Hol", "Ho").replace("Dar", "Da").replace("Sou", "So").replace("Elm", "Elem");
						allm1 = allm + mclass.length + mskillspell.length + mskilltype.length + mimperv.length + mresist.length + mweak.length + mattack.length + String(mpl).length + mskillspell2.length + mskilltype2.length + mskillspell3.length + mskilltype3.length + mspiritsksp.length + mspirittype.length;
					}
					if (allm1 > maxchar) {
						mattack = mattack.replace("Fi", "F").replace("Co", "C").replace("El", "E").replace("Wi", "W").replace("Ho", "H").replace("Da", "D").replace("So", "S").replace("Eem", "Elem");
						mskilltype = mskilltype.replace("Fi", "F").replace("Co", "C").replace("El", "E").replace("Wi", "W").replace("Ho", "H").replace("Da", "D").replace("So", "S").replace("Eem", "Elem");
						mskilltype2 = mskilltype2.replace("Fi", "F").replace("Co", "C").replace("El", "E").replace("Wi", "W").replace("Ho", "H").replace("Da", "D").replace("So", "S").replace("Eem", "Elem");
						mskilltype3 = mskilltype3.replace("Fi", "F").replace("Co", "C").replace("El", "E").replace("Wi", "W").replace("Ho", "H").replace("Da", "D").replace("So", "S").replace("Eem", "Elem");
						mspirittype = mspirittype.replace("Fi", "F").replace("Co", "C").replace("El", "E").replace("Wi", "W").replace("Ho", "H").replace("Da", "D").replace("So", "S").replace("Eem", "Elem");
						allm1 = allm + mclass.length + mskillspell.length + mskilltype.length + mimperv.length + mresist.length + mweak.length + mattack.length + String(mpl).length + mskillspell2.length + mskilltype2.length + mskillspell3.length + mskilltype3.length + mspiritsksp.length + mspirittype.length;
					}
					if (allm1 > maxchar) {
						mskillspell = mskillspell.replace("Ma", "M").replace("Ph", "P");
						mskillspell2 = mskillspell2.replace("Ma", "M").replace("Ph", "P");
						mskillspell3 = mskillspell3.replace("Ma", "M").replace("Ph", "P");
						mspiritsksp = mspiritsksp.replace("Ma", "M").replace("Ph", "P");
						allm1 = allm + mclass.length + mskillspell.length + mskilltype.length + mimperv.length + mresist.length + mweak.length + mattack.length + String(mpl).length + mskillspell2.length + mskilltype2.length + mskillspell3.length + mskilltype3.length + mspiritsksp.length + mspirittype.length;
					}
					if (allm1 > maxchar) {
						mresist = mresist.replace("Fi", "F").replace("Co", "C").replace("El", "E").replace("Wi", "W").replace("Ho", "H").replace("Da", "D").replace("So", "S").replace("Eem", "Elem");
						mimperv = mimperv.replace("Fi", "F").replace("Co", "C").replace("El", "E").replace("Wi", "W").replace("Ho", "H").replace("Da", "D").replace("So", "S").replace("Eem", "Elem");
						allm1 = allm + mclass.length + mskillspell.length + mskilltype.length + mimperv.length + mresist.length + mweak.length + mattack.length + String(mpl).length + mskillspell2.length + mskilltype2.length + mskillspell3.length + mskilltype3.length + mspiritsksp.length + mspirittype.length;
					}
					if (allm1 > maxchar) {
						mweak = mweak.replace("Fi", "F").replace("Co", "C").replace("El", "E").replace("Wi", "W").replace("Ho", "H").replace("Da", "D").replace("So", "S").replace("Eem", "Elem");
					}
				}
				if (mclass !== "0" && mclass !== "undefined" && mclass !== "unde" && mclass !== "und") {
					d = "";
					if (_settings.isShowClassHvstatStyle){
						d = "{<span style='color:blue'>" + mclass;
						d += _settings.isShowPLHvstatStyle ? ", " + mpl + "+</span>}" : "</span>}";
					} else if (_settings.isShowPLHvstatStyle) d = "{<span style='color:blue'>" + mpl + "+</span>}";
					if (_settings.isShowWeakHvstatStyle) {
						d += mweak === "0" ? "" : "[<span style='color:#3CB878'>" + mweak + "</span>";
						if (!_settings.isShowResHvstatStyle) d += "]";
					}
					if (_settings.isShowResHvstatStyle) {
						if (!_settings.isShowWeakHvstatStyle) d += "[";
						d += mresist === "-" ? "" : "|<span style='color:#FF3300'>" + mresist + "</span>";
						d += mimperv === "-" ? "" : "|<b><u><span style='color:#990000'>" + mimperv + "</span></u></b>";
						d += "]";
					}
					if (_settings.isShowAttackHvstatStyle) {
						d += mattack === "0" ? "(" : "(<span style='color:black'>" + mattack + "</span>";
						d += mskillspell === "" ? "" : ";<span style='color:blue'>" + mskillspell + "</span>";
						d += mskilltype === "" ? "" : "-<span style='color:blue'>" + mskilltype + "</span>";
						d += mskillspell2 === "" ? "" : "|<span style='color:blue'>" + mskillspell2 + "</span>";
						d += mskilltype2 === "" ? "" : "-<span style='color:blue'>" + mskilltype2 + "</span>";
						d += mskillspell3 === "" ? "" : "|<span style='color:blue'>" + mskillspell3 + "</span>";
						d += mskilltype3 === "" ? "" : "-<span style='color:blue'>" + mskilltype3 + "</span>";
						d += mspiritsksp === "" ? "" : "|<span style='color:red'>" + mspiritsksp + "</span>";
						d += mspirittype === "" ? "" : "-<span style='color:red'>" + mspirittype + "</span>";
						d += ")";
					}
				} else d = "[<span style='color:blue;font-weight:bold'>NEW</span>]";
				_ltc.isShowElemHvstatStyle[0]++;
				_ltc.isShowElemHvstatStyle[1] += TimeCounter(0, milliseconds2);
			}
			if (s) {
				t = "<div style='cursor:default;position:relative;top:-2px;left:2px;padding:0 1px;margin-left:0px;white-space:nowrap'>" + d + "</span></div>";
				k.after(t);
			} else {
				t = "<div style='font-family:arial;font-size:7pt;font-style:normal;font-weight:bold;display:inline;cursor:default;padding:0 1px;margin-left:1px;white-space:nowrap'>" + d + "</span></div>";
				var p = k.children().eq(0);
				var c = p.html();
				p.html(c + t);
				p.css("white-space", "nowrap");
			}
		}
		_ltc.showelem[0]++;
		_ltc.showelem[1] += TimeCounter(0, t33);
		if (_settings.isShowMonsterDuration) {
			var t2 = TimeCounter(1);
			showMonsterEffectsDuration(u);
			_ltc.showMonsterEffectsDuration[0]++;
			_ltc.showMonsterEffectsDuration[1] += TimeCounter(0, t2);
		}
	});
	_ltc.save();
	HASMS = true;
}
function showMonsterEffectsDuration(a) {
	a.children().eq(3).children("img").each(createDurationBadge);
}
function showSelfEffectsDuration() {
	$(".btps img").each(createDurationBadge);
}
function createDurationBadge(a) {
	var e = $(this);
	var g, d;
	var c, f;
	d = e.outerHTML().match(/\s\d+?\)/);
	if (d !== null) g = d[0].replace(")", "").replace(" ", "");
	if (g >= 0) {
		var h = e.parent().parent().parent().attr("id") === "monsterpane";
		c = h ? MON_EFF_TOP : SELF_EFF_TOP;
		f = (h ? MON_EFF_LEFT : SELF_EFF_LEFT) + FIRST_EFF * a;
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
		e.after(b);
	}
}
function showBattleEndStats() {
	$("#togpane_log").children().before("<div class='ui-state-default ui-corner-bottom' style='padding:10px;margin-bottom:10px;text-align:left'>" + getBattleEndStatsHtml() + "</div>");
}
function showMonsterNumber() {
	var targets = document.querySelectorAll('.btmi'), i = targets.length;
	while (i --> 0) targets[i].parentNode.appendChild(document.createElement('div')).innerHTML = (i+1)%10;
	var style = '';
	style += '.btmi {display:none;} .btmi + div {height:25px; font-size:1.6em; font-family:HentaiVerse; color:black; padding-top:0.4em;}';
	var style2 = document.createElement('style');
	style2.innerHTML = style;
	document.head.appendChild(style2);
}
function healthWarning() {
	var barFrameWidth = 120;
	var c = document.getElementsByTagName("img")[2];
//	var e = document.getElementsByTagName("img")[3];
	var cmp = document.getElementsByTagName("img")[5];
//	var emp = document.getElementsByTagName("img")[6];
	var csp = document.getElementsByTagName("img")[8];
//	var esp = document.getElementsByTagName("img")[9];
	var elemOCBar = document.getElementsByTagName("img")[11];
//	var elemOCFrame = document.getElementsByTagName("img")[12];
	var b = c.width / barFrameWidth;
	var bmp = cmp.width / barFrameWidth;
	var bsp = csp.width / barFrameWidth;
	var overchargeRate = elemOCBar.width / barFrameWidth;
	var d = localStorage.getItem(HV_ALERT);
	var dmp = localStorage.getItem(HV_ALERTMP);
	var dsp = localStorage.getItem(HV_ALERTSP);
	var overchargeAlertState = localStorage.getItem(HV_ALERTOC);
	var f = (d === null) ? false : JSON.parse(d);
	var fmp = (dmp === null) ? false : JSON.parse(dmp);
	var fsp = (dsp === null) ? false : JSON.parse(dsp);
	var overchargeAlertAlreadyShown = overchargeAlertState === null ? false : JSON.parse(overchargeAlertState);
	var g = parseFloat(_settings.warnOrangeLevel / 100);
	var i = parseFloat(_settings.warnRedLevel / 100);
	var h = parseFloat(_settings.warnAlertLevel / 100);
	var gmp = parseFloat(_settings.warnOrangeLevelMP / 100);
	var imp = parseFloat(_settings.warnRedLevelMP / 100);
	var hmp = parseFloat(_settings.warnAlertLevelMP / 100);
	var gsp = parseFloat(_settings.warnOrangeLevelSP / 100);
	var isp = parseFloat(_settings.warnRedLevelSP / 100);
	var hsp = parseFloat(_settings.warnAlertLevelSP / 100);
	var a = h + 0.1;
	var amp = hmp + 0.1;
	var asp = hsp + 0.1;
	if ((b <= g) && _settings.isHighlightQC)
		document.getElementById("quickbar").style.backgroundColor = b > i ? "orange" : "red";
	else if ((bmp <= gmp) && _settings.isHighlightQC)
		document.getElementById("quickbar").style.backgroundColor = bmp > imp ? "blue" : "darkblue";
	else if ((bsp <= gsp) && _settings.isHighlightQC)
		document.getElementById("quickbar").style.backgroundColor = bsp > isp ? "lime" : "green";
	if (!isBattleOver() && _settings.isShowPopup && (b <= h) && (!f || _settings.isNagHP)) {
		var sec1 = TimeCounter(1);
		alert("Your health is dangerously low!");
		_ltc.healthWarning[1] -= TimeCounter(0, sec1);
		_ltc.main[1] -= TimeCounter(0, sec1);
		_ltc.isbattle[1] -= TimeCounter(0, sec1);
		f = true;
		localStorage.setItem(HV_ALERT, JSON.stringify(f));
	}
	if (!isBattleOver() && _settings.isShowPopup && (bmp <= hmp) && (!fmp || _settings.isNagMP)) {
		var sec1 = TimeCounter(1);
		alert("Your mana is dangerously low!");
		_ltc.healthWarning[1] -= TimeCounter(0, sec1);
		_ltc.main[1] -= TimeCounter(0, sec1);
		_ltc.isbattle[1] -= TimeCounter(0, sec1);
		fmp = true;
		localStorage.setItem(HV_ALERTMP, JSON.stringify(fmp));
	}
	if (!isBattleOver() && _settings.isShowPopup && (bsp <= hsp) && (!fsp || _settings.isNagSP)) {
		var sec1 = TimeCounter(1);
		alert("Your spirit is dangerously low!");
		_ltc.healthWarning[1] -= TimeCounter(0, sec1);
		_ltc.main[1] -= TimeCounter(0, sec1);
		_ltc.isbattle[1] -= TimeCounter(0, sec1);
		fsp = true;
		localStorage.setItem(HV_ALERTSP, JSON.stringify(fsp));
	}
	if (!isBattleOver() && _settings.isAlertOverchargeFull && overchargeRate >= 1.0 && !overchargeAlertAlreadyShown) {
		var sec1 = TimeCounter(1);
		alert("Your overcharge is full.");
		overchargeAlertAlreadyShown = true;
		localStorage.setItem(HV_ALERTOC, JSON.stringify(overchargeAlertAlreadyShown));
		_ltc.main[1] -= TimeCounter(0, sec1);
		_ltc.isbattle[1] -= TimeCounter(0, sec1);
	}
	if (_settings.isShowPopup) {
		if (f && b > a) localStorage.removeItem(HV_ALERT);
		if (fmp && bmp > amp) localStorage.removeItem(HV_ALERTMP);
		if (fsp && bsp > asp) localStorage.removeItem(HV_ALERTSP);
	}
	if (overchargeAlertAlreadyShown && overchargeRate < 1.0)
		localStorage.removeItem(HV_ALERTOC);
}
function collectCurrentProfsData() {
	if (!isCharacterPage() || isHVFontEngine()) return;
	loadProfsObject();
	var c = $(".eqm").children().eq(0).children().eq(1).children();
	var b;
	for (b = 0; b < _profs.weapProfTotals.length; b++) _profs.weapProfTotals[b] = parseFloat(c.eq(0).children().eq(1).find(".fd12").eq(b * 2 + 1).text());
	for (b = 0; b < _profs.armorProfTotals.length; b++) _profs.armorProfTotals[b] = parseFloat(c.eq(0).children().eq(1).find(".fd12").eq(b * 2 + 7).text());
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
	if (!isProfTotalsRecorded()) return;
	var b = $(".stuffbox").height() - 31;
	GM_addStyle(".prof_sidebar td {font-family:arial,helvetica,sans-serif; font-size:9pt; font-weight:normal; text-align:left}.prof_sidebar_top td {font-family:arial,helvetica,sans-serif; font-size:10pt; font-weight:bold; text-align:center}");
	var a = "<div id='_profbutton' class='ui-corner-all' style='position:absolute;top:" + b + "px;border:1px solid;margin-left:5px;padding:2px;width:132px;font-size:10pt;font-weight:bold;text-align:center;cursor:default;'>Proficiency</div>";
	$(".clb").append(a);
	$("#_profbutton").mouseover(function () {
		var c = document.getElementById("popup_box");
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
		document.getElementById("popup_box").style.visibility = "hidden";
	});
}
function isProfTotalsRecorded() {
	loadProfsObject();
	return _profs.weapProfTotals[0] > 0;
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
	var milliseconds1 = TimeCounter(1);
	var e = "";
	var a = 0;
	var ac = 0;
	var c = "";
	var d;
	var b = false;
	loadRoundObject();
	if (_settings.isRememberSkillsTypes) loadCollectdataObject();
	if (_settings.isTrackItems) loadDropsObject();
	if (_settings.isTrackRewards) loadRewardsObject();
	if (_settings.isSpellsSkillsDifference || _settings.isShowStatsPopup) {
		var t74 = TimeCounter(1);
		// issue: SP is always zero in the monster popup when first load
		for (var i = 0; i < _round.monsters.length; i++) {
			if (_round.monsters[i].hasspbar) {
				var spbar = $("#" + getMonsterElementId(i)).children().eq(2).children().eq(2);
				// get current SP percent
				_round.monsters[i].sp1 = spbar.children().eq(0).children("img").eq(1).width() / 120;
			}
		}
		_ltc.changedMHits[1] += TimeCounter(0, t74);
	}
	$("#togpane_log td:first-child").each(function (j) {
		var g = $(this);
		var k = g.next().next();
		if (j === 0) {
			e = g.html();
		}
		c = k.html();
		var t87 = TimeCounter(1);
		var kline = g.html();
		var kline2 = parseInt(g.next().html()) - 1;
		var sel0 = $(".t1:contains(" + kline + ")");
		var sel = sel0.next().filter(":contains(" + kline2 + ")").next().html();
		var selall = $(".t1:contains(" + kline + ")").next().next().text();
		_ltc.sel[0]++;
		_ltc.sel[1] += TimeCounter(0, t87);
		if (!_round.isLoaded) {
			if (c.match(/HP=/)) {
				var h = new HVMonster();
				h.maxHp = parseInt(c.match(/HP=\d+(\.)?[0-9]+?$/)[0].replace("HP=", ""));
				h.currHp = h.maxHp;
				var mid = parseInt(c.match(/MID=\d+?\s/)[0].replace("MID=", ""));
				h.id = mid;
				h.name = c.match(/\([^\.\)]{0,30}\) LV/i)[0].replace("(", "").replace(")", "").replace(" LV", "");
				if (_settings.isShowElemHvstatStyle) {
					var t43 = TimeCounter(1);
					loadDatabaseObject();
					h.mclass = _database.mclass[mid];
					h.mpl = _database.mpl[mid];
					h.mattack = _database.mattack[mid];
					h.mweak = _database.mweak[mid];
					h.mresist = _database.mresist[mid];
					h.mimperv = _database.mimperv[mid];
					h.mskilltype = _database.mskilltype[mid];
					h.mskillspell = _database.mskillspell[mid];
					h.datescan = _database.datescan[mid];
					_ltc.isShowElemHvstatStyle[1] += TimeCounter(0, t43);
				}
				_round.monsters.push(h);
				if (_settings.isTrackItems) {
					_round.dropChances++;
				}
			} else if (c.match(/\(Round/)) {
				var f = c.match(/\(round.*?\)/i)[0].replace("(", "").replace(")", "");
				var m = f.split(" ");
				_round.currRound = parseInt(m[1]);
				if (m.length > 2) {
					_round.maxRound = parseInt(m[3]);
				}
			}
			if (_settings.isShowRoundReminder && (_round.maxRound >= _settings.reminderMinRounds) && (_round.currRound === _round.maxRound - _settings.reminderBeforeEnd) && !b) {
				var sec1 = TimeCounter(1);
				if (_settings.reminderBeforeEnd === 0) {
					alert("This is final round");
				} else {
					alert("The final round is approaching.");
				}
				b = true;
				_ltc.collectRoundInfo[1] -= TimeCounter(0, sec1);
				_ltc.main[1] -= TimeCounter(0, sec1);
				_ltc.isbattle[1] -= TimeCounter(0, sec1);
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
			_round.save();
		}
		if (g.html() !== e) {
			return false;
		}
		if (_settings.isSpellsSkillsDifference) {
			var t71 = TimeCounter(1);
			for (var i = 0; i < _round.monsters.length; i++) {
				if ($("#" + getMonsterElementId(i)).children().eq(2).children().filter(".btm5").length > 2) {
					_round.monsters[i].hasspbar = true;
				}
			}
			_ltc.changedMHits[1] += TimeCounter(0, t71);
		}
		if (_settings.isAlertGem && c.match(/drops a (.*) Gem/)) {
			var sec2 = TimeCounter(1);
			alert("You picked up a " + RegExp.$1 + " Gem.");
			_ltc.collectRoundInfo[1] -= TimeCounter(0, sec2);
			_ltc.main[1] -= TimeCounter(0, sec2);
			_ltc.isbattle[1] -= TimeCounter(0, sec2);
		}
		if (_settings.isWarnSparkTrigger && c.match(/spark of life.*defeat/ig)) {
			var sec3 = TimeCounter(1);
			alert("Spark of Life has triggered!!");
			_ltc.collectRoundInfo[1] -= TimeCounter(0, sec3);
			_ltc.main[1] -= TimeCounter(0, sec3);
			_ltc.isbattle[1] -= TimeCounter(0, sec3);
		}
		if (_settings.isWarnSparkExpire && c.match(/spark of life.*expired/ig)) {
			var sec4 = TimeCounter(1);
			alert("Spark of Life has expired!!");
			_ltc.collectRoundInfo[1] -= TimeCounter(0, sec4);
			_ltc.main[1] -= TimeCounter(0, sec4);
			_ltc.isbattle[1] -= TimeCounter(0, sec4);
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
				_round.divineGain += p;
			} else if (r.match(/forbidden magic/)) {
				_profs.forbidTotal += p;
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
			if (c.match(/scanning/i)) {
				var milliseconds3 = TimeCounter(1);
				_round.scan[0] = c.match(/scanning [^\.]{1,30}\.{3,}/i)[0].replace("Scanning ", "").replace("...", "");
				var scanname = c.match(/scanning [^\.]{1,30}\.{3,}/i)[0].replace("Scanning ", "").replace("...", "");
				var monnum = 0;
				while ((monnum < 10) && (_round.monsters[monnum] !== undefined)) {
					if (_round.monsters[monnum].name === scanname) {
						_round.scan[0] = _round.monsters[monnum].id;
						break;
					}
					monnum++;
				}
				if (c.match(/Monster Class.{1,37}(Common|Uncommon|Rare|Legendary|Ultimate)/i)) {
					_round.scan[1] =c.match(/Monster Class.{1,37}(Common|Uncommon|Rare|Legendary|Ultimate)/i)[0].replace("Monster Class:</strong></td><td style=\"width:60%\">", "");
					_round.scan[2] = 0;
				} else {	
					_round.scan[1] = c.match(/[a-z]+. Power Level/i)[0].replace(", Power Level", "");
					_round.scan[2] = parseInt(c.match(/Power Level \d+/i)[0].replace("Power Level ", ""));
				}
				_round.scan[3] = c.match(/melee attack.{1,19}[a-z]+/i)[0].replace("Melee Attack:</strong></td><td>", "");
				_round.scan[4] = c.match(/weak against.{1,19}[a-z]+(\, [a-z]+)*/i)[0].replace("Weak against:</strong></td><td>", "");
				_round.scan[5] = c.match(/resistant to.{1,19}[a-z]+(\, [a-z]+)*/i)[0].replace("Resistant to:</strong></td><td>", "");
				_round.scan[6] = c.match(/impervious to.{1,19}[a-z]+(\, [a-z]+)*/i)[0].replace("Impervious to:</strong></td><td>", "");
				_round.scan[7] = (new Date()).getTime();
				if (_settings.isRememberSkillsTypes) {
					SaveToDatabase(0);
				} else {
					SaveToDatabase(1);
				}
				var mid = parseInt(_round.scan[0]);
				_round.monsters[monnum].mclass = _database.mclass[mid];
				_round.monsters[monnum].mpl = _database.mpl[mid];
				_round.monsters[monnum].mattack = _database.mattack[mid];
				_round.monsters[monnum].mweak = _database.mweak[mid];
				_round.monsters[monnum].mresist = _database.mresist[mid];
				_round.monsters[monnum].mimperv = _database.mimperv[mid];
				_round.monsters[monnum].mskilltype = _database.mskilltype[mid];
				_round.monsters[monnum].mskillspell = _database.mskillspell[mid];
				_round.monsters[monnum].datescan = _database.datescan[mid];
				_ltc.isRememberScan[0]++;
				_ltc.isRememberScan[1] += TimeCounter(0, milliseconds3);
				_ltc.collectRoundInfo[1] -= TimeCounter(0, milliseconds3);
				_ltc.main[1] -= TimeCounter(0, milliseconds3);
				_ltc.isbattle[1] -= TimeCounter(0,milliseconds3);
			}
		}
		if (_settings.isTrackStats || _settings.isShowEndStats) {
			var milliseconds4 = TimeCounter(1);
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
					var milliseconds20 = TimeCounter(1);
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
					_ltc.extendedHits[0]++;
					_ltc.extendedHits[1] += TimeCounter(0, milliseconds20);
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
						var maxmon = parseInt(_round.monsters.length) - 1;
						var milliseconds21 = TimeCounter(1);
						var monnum4 = 0;
						while (monnum4 <= maxmon) {
							if (sel.match(/[^\.]{1,30} (uses|casts) /i)[0].replace(" uses ","").replace(" casts ","") === _round.monsters[monnum4].name) {
								var mid = parseInt(_round.monsters[monnum4].id);
								var stype = c.match(/[a-z]{1,10} damage/i)[0].replace(" damage","");
								_collectdata.skillmid.push(mid);
								_collectdata.skilltype.push(stype);
								var spdiff = _round.monsters[monnum4].sp1 - _round.monsters[monnum4].sp2;
								if (sel.match(/ casts /i)) {
									if (spdiff < 0) {
										_collectdata.mskillspell.push(3);
									} else {
										_collectdata.mskillspell.push(1);
									}
								} else {
									if (spdiff < 0) {
										_collectdata.mskillspell.push(4);
									} else {
										_collectdata.mskillspell.push(2);
									}
								}
								_collectdata.save();
								break;
							}
							monnum4++;
						}
						_ltc.changedMHits[0]++;
						_ltc.changedMHits[1] += TimeCounter(0, milliseconds21);
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
					var milliseconds22 = TimeCounter(1);
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
					_ltc.cast[0]++;
					_ltc.cast[1] += TimeCounter(0, milliseconds22);
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
					var milliseconds23 = TimeCounter(1);
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
					_ltc.effects[0]++;
					_ltc.effects[1] += TimeCounter(0, milliseconds23);
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
			if (_settings.isTrackStats && !_settings.isShowEndStats) {
				_ltc.isTrackStats[0]++;
				_ltc.isTrackStats[1] += TimeCounter(0, milliseconds4);
			} else if (_settings.isShowEndStats && !_settings.isTrackStats) {
				_ltc.showBattleEndStats[0]++;
				_ltc.showBattleEndStats[1] += TimeCounter(0, milliseconds4);
			} else {
				_ltc.isTrackStats[0]++;
				_ltc.isTrackStats[1] += parseInt((TimeCounter(0, milliseconds4) / 2).toFixed());
				_ltc.showBattleEndStats[0]++;
				_ltc.showBattleEndStats[1] += parseInt((TimeCounter(0, milliseconds4) / 2).toFixed());
			}
		}
		var l = /\[.*?\]/i;
		var n;
		var t = 1;
		var milliseconds5 = TimeCounter(1);
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
				for (var j = 0; j < _drops.artArry.length; j++) {
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
				itemToAdd = itemToAdd.replace(/(\d){1,2}.?x?.?/, "")
				_drops.crysDropbyBT[_round.battleType]++;
			}
			for (var j = 0; j < _drops.itemArry.length; j++) {
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
		_ltc.isTrackItems[0]++;
		_ltc.isTrackItems[1] += TimeCounter(0, milliseconds5);
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
				for (var j = 0; j < _rewards.artRwrdArry.length; j++) {
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
			for (var j = 0; j < _rewards.itemRwrdArry.length; j++) {
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
	if (_settings.isSpellsSkillsDifference) {
		var t74 = TimeCounter(1);
		for (var i = 0; i < _round.monsters.length; i++) {
			if (_round.monsters[i].hasspbar) {
				_round.monsters[i].sp2 = _round.monsters[i].sp1;
			}
		}
		_ltc.changedMHits[1] += TimeCounter(0, t74);
	}
	_round.save();
	_ltc.collectRoundInfo[0]++;
	_ltc.collectRoundInfo[1] += TimeCounter(0, milliseconds1);
	_ltc.save();
}
function saveStats() {
	var milliseconds1 = TimeCounter(1);
	if (!SAVE_STATS) return;
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
	_ltc.saveStats[0]++;
	_ltc.saveStats[1] += TimeCounter(0, milliseconds1);
	_ltc.save();
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
	var p = _settings.isHideHVLogo ? a : w;
	var b = _settings.isShowSidebarProfs ? a : w;
	var o = _settings.isShowRoundReminder ? a : w;
	var h = _settings.isShowHighlight ? a : w;
	var n = _settings.isShowDivider ? a : w;
	var D = _settings.isShowSelfDuration ? a : w;
	var G = _settings.isShowEndStats ? a : w;
	var J = _settings.isAlertGem ? a : w;
	y = _settings.isShowMonsterHP ? '<span style="color:green"><b>HP</b></span>' : I;
	y += N;
	y += _settings.isShowMonsterMP ? '<span style="color:green"><b>MP</b></span>' : I;
	y += N;
	y += _settings.isShowMonsterSP ? '<span style="color:green"><b>SP</b></span>' : I;
	y += N;
	y += _settings.isShowMonsterElements ? '<span style="color:green"><b>Resistance</b></span>' : I;
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
		if (browserIsChrome()) {
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
		var avtime = (_ltc.main[1] / _ltc.main[0]).toFixed();
		var avtime2 = (_ltc.isbattle[1] / _ltc.isbattle[0]).toFixed(1);
		var loadtime = (_ltc.pageLoad[3] / _ltc.pageLoad[2]).toFixed(1);
		var at = (_ltc.isbattle[1]/_ltc.isbattle[0] + _ltc.pageLoad[3]/_ltc.pageLoad[2]).toFixed(1);
		var loadtime03 = (_ltc.pageLoad[5] / _ltc.pageLoad[4]).toFixed(1);
		var at03 = (_ltc.isbattle[1]/_ltc.isbattle[0] + _ltc.pageLoad[5]/_ltc.pageLoad[4]).toFixed(1);
		var loadtime06 = (_ltc.pageLoad[7] / _ltc.pageLoad[6]).toFixed(1);
		var at06 = (_ltc.isbattle[1]/_ltc.isbattle[0] + _ltc.pageLoad[7]/_ltc.pageLoad[6]).toFixed(1);
		var loadtime09 = (_ltc.pageLoad[9] / _ltc.pageLoad[8]).toFixed(1);
		var at09 = (_ltc.isbattle[1]/_ltc.isbattle[0] + _ltc.pageLoad[9]/_ltc.pageLoad[8]).toFixed(1);
		var loadtime12 = (_ltc.pageLoad[11] / _ltc.pageLoad[10]).toFixed(1);
		var at12 = (_ltc.isbattle[1]/_ltc.isbattle[0] + _ltc.pageLoad[11]/_ltc.pageLoad[10]).toFixed(1);
		var loadtime15 = (_ltc.pageLoad[13] / _ltc.pageLoad[12]).toFixed(1);
		var at15 = (_ltc.isbattle[1]/_ltc.isbattle[0] + _ltc.pageLoad[13]/_ltc.pageLoad[12]).toFixed(1);
		var loadtime18 = (_ltc.pageLoad[15] / _ltc.pageLoad[14]).toFixed(1);
		var at18 = (_ltc.isbattle[1]/_ltc.isbattle[0] + _ltc.pageLoad[15]/_ltc.pageLoad[14]).toFixed(1);
		var loadtime21 = (_ltc.pageLoad[17] / _ltc.pageLoad[16]).toFixed(1);
		var at21 = (_ltc.isbattle[1]/_ltc.isbattle[0] + _ltc.pageLoad[17]/_ltc.pageLoad[16]).toFixed(1);
		var loadtime24 = (_ltc.pageLoad[19] / _ltc.pageLoad[18]).toFixed(1);
		var at24 = (_ltc.isbattle[1]/_ltc.isbattle[0] + _ltc.pageLoad[19]/_ltc.pageLoad[18]).toFixed(1);
		if (_overview.artifacts > 0) {
			t = (_overview.totalRounds / _overview.artifacts).toFixed(1);
			s = _overview.lastArtName;
			H = getRelativeTime(_overview.lastArtTime);
		}
		x = '<table class="_UI" cellspacing="0" cellpadding="2" style="width:100%">'
			+ '<tr><td colspan="2"><b>Reporting period:</b> ' + e + " to " + z + '</td></tr>'
			+ '<tr><td colspan="2" style="padding-left:10px">Total time: ' + E + '</td></tr>'
			+ '<tr><td colspan="2"><b>Average execution time:</b></tr>'
			+ '<tr><td colspan="2" style="padding-left:10px">HV STAT work time :' + avtime + ' ms / in battle :' + avtime2 + ' ms</td></tr>';
		if (_settings.isCountPageLoadTime) {
			x += '<tr><td colspan="2" style="padding-left:10px">In battle page load time :' + loadtime + ' ms | Including HV STAT : ' + (at) + 'ms (' + ((avtime2)*100/loadtime).toFixed(1) + '% more)</td></tr>'
				+ '<tr><td colspan="2" style="padding-left:10px">Load time by hours:</td></tr>'
				+ '<tr><td> 0-3 AM - ';
			x += _ltc.pageLoad[4] > 0 ? loadtime03 + ' ms | ' + (at03) + 'ms (' + ((avtime2)*100/loadtime03).toFixed(1) + '% more)' : 'Not tracked yet';
			x += '</td><td> 0-3 PM - ';
			x += _ltc.pageLoad[12] > 0 ? loadtime15 + ' ms | ' + (at15) + 'ms (' + ((avtime2)*100/loadtime15).toFixed(1) + '% more)' : 'Not tracked yet';
			x += '</td></tr><tr><td> 3-6 AM - ';
			x += _ltc.pageLoad[6] > 0 ? loadtime06 + ' ms | ' + (at06) + 'ms (' + ((avtime2)*100/loadtime06).toFixed(1) + '% more)' : 'Not tracked yet';
			x += '</td><td> 3-6 PM - ';
			x += _ltc.pageLoad[14] > 0 ? loadtime18 + ' ms | ' + (at18) + 'ms (' + ((avtime2)*100/loadtime18).toFixed(1) + '% more)' : 'Not tracked yet';
			x += '</td></tr><tr><td> 6-9 AM  - ';
			x += _ltc.pageLoad[8] > 0 ? loadtime09 + ' ms | ' + (at09) + 'ms (' + ((avtime2)*100/loadtime09).toFixed(1) + '% more)' : 'Not tracked yet';
			x += '</td><td> 6-9 PM - ';
			x += _ltc.pageLoad[16] > 0 ? loadtime21 + ' ms | ' + (at21) + 'ms (' + ((avtime2)*100/loadtime21).toFixed(1) + '% more)' : 'Not tracked yet';
			x += '</td></tr><tr><td> 9-12 AM  - ';
			x += _ltc.pageLoad[10] > 0 ? loadtime12 + ' ms | ' + (at12) + 'ms (' + ((avtime2)*100/loadtime12).toFixed(1) + '% more)' : 'Not tracked yet';
			x += '</td><td>9-12 PM - ';
			x += _ltc.pageLoad[18] > 0 ? loadtime24 + ' ms | ' + (at24) + 'ms (' + ((avtime2)*100/loadtime24).toFixed(1) + '% more)' : 'Not tracked yet';
			x += '</td></tr>';
		}
		x += '<tr><td colspan="2" style="padding-left:10px"><input type="button" class="_resetLTC" value="Reset execution time counters" /></td></tr>'
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
		+ '<tr><td style="width:33%"><b>General Options:</b></td><td style="width:34%"><b>Battle Enhancement:</b></td><td style="width:33%"><b>Tracking Status:</b></td></tr>'
		+ '<tr><td style="padding-left:10px;width:33%">HP Warning:</td><td style="padding-left:10px;width:34%">Log Highlighting: ' + h + '</td><td style="padding-left:10px;width:33%">Battle Stats: ' + B + '</td></tr>'
		+ '<tr><td style="padding-left:20px;width:33%">Spark Warning: ' + u + '</td><td style="padding-left:10px;width:34%">Turn Divider: ' + n + '</td><td style="padding-left:10px;width:33%">Item Drops: ' + A + '</td></tr>'
		+ '<tr><td style="padding-left:20px;width:33%">Highlight QC: ' + C + '</td><td style="padding-left:10px;width:34%">Status Effect Duration: ' + D + '</td><td style="padding-left:10px;width:33%">Arena Rewards: ' + l + '</td></tr>'
		+ '<tr><td style="padding-left:20px;width:33%">Popup: ' + j + '</td><td style="padding-left:10px;width:34%">Monster Stats:</td><td style="padding-left:10px;width:33%">Shrine: ' + Shrine + '</td></tr>'
		+ '<tr><td style="padding-left:20px;width:33%">Battle Type: ' + i + '</td><td style="padding-left:20px;width:34%">' + y + '</td><td style="padding-left:10px;width:33%"></td></tr>'
		+ '<tr><td style="padding-left:10px;width:33%">Proficiency Table: ' + b + '</td><td style="padding-left:10px;width:34%">Battle Summary: ' + G + '</td><td style="padding-left:10px;width:33%"></td></tr>'
		+ '<tr><td style="padding-left:10px;width:33%">Column Inventory: ' + m + '</td><td style="padding-left:10px;width:34%">Round Reminder: ' + o + '</td><td></td></tr>'
		+ '<tr><td style="padding-left:10px;width:33%">Hide HV Logo: ' + p + '</td><td style="padding-left:10px;width:34%">Powerup Alerts: ' + J + "</td><td></td></tr></table>";
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
		if (browserIsChrome()) dst1 = dst.toLocaleDateString() + " " + dst.toLocaleTimeString();
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
		c += '<tr><td colspan="2"><b>Defensive Statistics:</b></td></tr><tr><td style="padding-left:10px">Overall chance of getting hit: ' + (_stats.mAttempts === 0 ? 0 : (d / _stats.mAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:10px">Average HP restored by Cure:</td></tr><tr><td style="padding-left:20px">Miss chance: ' + (_stats.mAttempts === 0 ? 0 : (_stats.pDodges / _stats.mAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Cure: ' + (_stats.cureCounts[0] === 0 ? 0 : (_stats.cureTotals[0] / _stats.cureCounts[0]).toFixed(2)) + ' HP/cast</td></tr><tr><td style="padding-left:20px">Evade chance: ' + (_stats.mAttempts === 0 ? 0 : (_stats.pEvades / _stats.mAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Cure II: ' + (_stats.cureCounts[1] === 0 ? 0 : (_stats.cureTotals[1] / _stats.cureCounts[1]).toFixed(2)) + ' HP/cast</td></tr><tr><td style="padding-left:20px">Block chance: ' + (_stats.mAttempts === 0 ? 0 : (_stats.pBlocks / _stats.mAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Cure III: ' + (_stats.cureCounts[2] === 0 ? 0 : (_stats.cureTotals[2] / _stats.cureCounts[2]).toFixed(2)) + ' HP/cast</td></tr><tr><td style="padding-left:20px">Parry chance: ' + (_stats.mAttempts === 0 ? 0 : (_stats.pParries / _stats.mAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:10px">Absorb casting efficiency: ' + (_stats.absArry[0] === 0 ? 0 : (_stats.absArry[1] / _stats.absArry[0] * 100).toFixed(2)) + '%</td></tr><tr><td style="padding-left:20px">Resist chance: ' + (_stats.mSpells === 0 ? 0 : (_stats.pResists / _stats.mSpells * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Average MP drained by Absorb: ' + (_stats.absArry[1] === 0 ? 0 : (_stats.absArry[2] / _stats.absArry[1]).toFixed(2)) + ' MP/trigger</td></tr><tr><td style="padding-left:10px">Monster crit chance: ' + (_stats.mAttempts === 0 ? 0 : (_stats.mHits[1] / _stats.mAttempts * 100).toFixed(2)) + '%</td><td style="padding-left:20px">Average MP returns of Absorb: ' + (_stats.absArry[0] === 0 ? 0 : (_stats.absArry[2] / _stats.absArry[0]).toFixed(2)) + ' MP/cast</td></tr><tr><td style="padding-left:20px">Percent of monster hits that are crits: ' + (d === 0 ? 0 : (_stats.mHits[1] / d * 100).toFixed(2)) + '%</td></tr><tr><td style="padding-left:10px">Average damage taken per hit: ' + (_stats.mHits[0] === 0 ? 0 : (_stats.dTaken[0] / _stats.mHits[0]).toFixed(2)) + '</td></tr><tr><td style="padding-left:10px">Average damage taken per crit: ' + (_stats.mHits[1] === 0 ? 0 : (_stats.dTaken[1] / _stats.mHits[1]).toFixed(2)) + '</td></tr><tr><td style="padding-left:10px">Average damage taken: ' + (d === 0 ? 0 : ((_stats.dTaken[0] + _stats.dTaken[1]) / d).toFixed(2)) + '</td></tr><tr><td style="padding-left:10px">Average total damage taken per round: ' + (_stats.rounds === 0 ? 0 : ((_stats.dTaken[0] + _stats.dTaken[1]) / _stats.rounds).toFixed(2)) + '</td></tr><tr><td align="left" colspan="7"><form>SelectBackup:<select id="BackupNumber"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select>' + '<input type="button" class="_savebackup" value="Save Backup" />' + '<input type="button" class="_loadbackup" value="Load Backup"/>' + '<input type="button" class="_addtobackup" value="AddTo Backup"/>' + '<input type="button" class="_addfrombackup" value="AddFrom Backup"/>' + '<input type="button" class="_resetbackup" value="Remove Backup"/></td></tr></form>' + '<tr><td><input type="button" class="_checkbackups" value="Check Existing Backups"/></td></tr>' + '</td></tr><tr><td align="right" colspan="2"><input type="button" class="_resetStats" value="Reset Stats" /></td></tr>'
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
		for (var c = _drops.eqArray.length - 1; c >= 0; c--) e += '<tr><td colspan="4" style="padding-left:10px">' + _drops.eqArray[c] + "</td></tr>";
		e += '<tr><td colspan="4"><b>Artifact:</b></td></tr>';
		for (var c = 0; c < _drops.artArry.length; c++) e += '<tr><td colspan="4" style="padding-left:10px">' + _drops.artArry[c] + " x " + _drops.artQtyArry[c] + "</td></tr>";
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
		for (var d = 0; d < _rewards.artRwrdArry.length; d++) e += '<tr><td colspan="2" style="padding-left:10px">' + _rewards.artRwrdArry[d] + " x " + _rewards.artRwrdQtyArry[d] + "</td></tr>";
		e += '<tr><td colspan="2"><b>Equipment:</b></td></tr>';
		for (var d = _rewards.eqRwrdArry.length - 1; d >= 0; d--) e += '<tr><td colspan="2" style="padding-left:10px">' + _rewards.eqRwrdArry[d] + "</tr></td>";
		e += '<tr><td colspan="2"><b>Item:</b></td></tr>';
		for (var d = 0; d < _rewards.itemRwrdArry.length; d++) e += '<tr><td colspan="2" style="padding-left:10px">' + _rewards.itemRwrdArry[d] + " x " + _rewards.itemRwrdQtyArry[d] + "</td></tr>";
		e += '<tr><td align="right" colspan="2"><input type="button" class="_resetRewards" value="Reset Arena Rewards" /></td></tr>';
	}
	e += "</table>";
	return e;
}
function getReportShrineHtml() {
	var c = "Tracking disabled.";
	if (_settings.isTrackShrine && _shrine.totalRewards === 0) c = "No data found. Make an offering at Snowflake's Shrine to begin tracking.";
	else if (_settings.isTrackShrine && _shrine.isLoaded && _shrine.totalRewards > 0) c = '<table class="_UI" cellspacing="0" cellpadding="1" style="width:100%">';
	else if (!_settings.isTrackShrine && _shrine.isLoaded && _shrine.totalRewards > 0) c = '<table class="_UI" cellspacing="0" cellpadding="1" style="width:100%"><tr><td align="center"><div align="center" class="ui-state-error ui-corner-all" style="padding:4px;margin:4px"><span class="ui-icon ui-icon-pause"></span><b>TRACKING PAUSED</b></div></td></tr>';
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
			+ '<tr><td style="padding-left:10px">Energy Drinks: ' + _shrine.artifactItem + ' (' + f + "% chance)</td></tr>";
			+ '<tr><td ><b>Trophies:</b> ' + _shrine.trophyArray.length + ' traded</td></tr>';
		for (var b = _shrine.trophyArray.length - 1; b >= 0; b--)
			c += '<tr><td style="padding-left:10px">' + _shrine.trophyArray[b] + "</td></tr>";
		c += '<tr><td align="right"><input type="button" class="_clearTrophies" value="Clear Trophies" /> <input type="button" class="_resetShrine" value="Reset Shrine" /></td></tr>';
	}
	c += "</table>";
	return c;
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
	var b = "[STAT] HentaiVerse Statistics, Tracking, and Analysis Tool v." + VERSION + (browserIsChrome() ? " (Chrome Edition)" : "");
	var c = document.createElement("div");
	$(c).addClass("_mainMenu").css("text-align", "left");
	var a = '<div id="tabs"><ul>'
		+ '<li><a href="#pane1"><span>Overview</span></a></li>'
		+ '<li><a href="#pane2"><span>Battle Stats</span></a></li>'
		+ '<li><a href="#pane3"><span>Item Drops</span></a></li>'
		+ '<li><a href="#pane4"><span>Arena Rewards</span></a></li>'
		+ '<li><a href="#pane5"><span>Shrine</span></a></li>'
		+ '<li><a href="#pane6"><span>Settings</span></a></li>'
		+ '</ul><div id="pane1">Tab 1 Error</div><div id="pane2">Tab 2 Error</div>'
		+ '<div id="pane3">Tab 3 Error</div><div id="pane4">Tab 4 Error</div>'
		+ '<div id="pane5">Tab 5 Error</div><div id="pane6">Tab 6 Error</div></div>';
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
	$("._resetLTC").click(function () {
		if (confirm("You want to reset execution time counters?")) _ltc.reset();
	});
}
function initStatsPane() {
	$("#pane2").html(getReportStatsHtml());
	$("._resetStats").click(function () {
		if (confirm("Reset Stats tab?")) _stats.reset();
	});
	$("._checkbackups").click(function () {
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
				if (browserIsChrome()) ds[i] = nd.toLocaleDateString() + " " + nd.toLocaleTimeString();
			}
			if (_backup[i].datestart !== 0) {
				nd.setTime( _backup[i].datestart);
				d[i] = nd.toLocaleString();
				if (browserIsChrome()) d[i] = nd.toLocaleDateString() + " " + nd.toLocaleTimeString();
			}
		}
		alert("Backup 1:\nLast save date: " + ds[1] + "\nStats tracked since: " + d[1] + "\nNumber of rounds tracked: " + _backup[1].rounds
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
		if (confirm("Reset Shrine tab?")) _shrine.reset();
	});
	$("._clearTrophies").click(function () {
		if (confirm("Clear Trophy list?")) {
			_shrine.trophyArray = [];
			_shrine.save();
		}
	});
}
function initSettingsPane() {
	var t0 = (_ltc.isbattle[1] / _ltc.isbattle[0]).toFixed();
	var t0b = ((_ltc.main[1] - _ltc.isbattle[1]) / (_ltc.main[0] - _ltc.isbattle[0])).toFixed();
	var t1 = (_ltc.main[1] / _ltc.main[0]).toFixed();
	var t2 = (_ltc.collectRoundInfo[1] / _ltc.collectRoundInfo[0]).toFixed(1);
	var t3 = (_ltc.obscureHVIds[1] / _ltc.obscureHVIds[0]).toFixed();
	var t4 = (_ltc.highlightLogText[1] / _ltc.highlightLogText[0]).toFixed(1);
	var t5 = (_ltc.addBattleLogDividers[1] / _ltc.addBattleLogDividers[0]).toFixed(1);
	var t6 = (_ltc.showRoundCounter[1] / _ltc.showRoundCounter[0]).toFixed(1);
	var t7 = (_ltc.displayPowerupBox[1] / _ltc.displayPowerupBox[0]).toFixed(1);
	var t8 = (_ltc.showMonsterStats[1] / _ltc.showMonsterStats[0]).toFixed(1);
	var t9 = (_ltc.showMonsterEffectsDuration[1] / _ltc.showMonsterEffectsDuration[0]).toFixed(1);
	var t10 = (_ltc.showSelfEffectsDuration[1] / _ltc.showSelfEffectsDuration[0]).toFixed(1);
	var t11 = (_ltc.showBattleEndStats[1] / _ltc.showBattleEndStats[0]).toFixed(1);
	var t12 = (_ltc.healthWarning[1] / _ltc.healthWarning[0]).toFixed(1);
	var t13 = (_ltc.showSidebarProfs[1] / _ltc.showSidebarProfs[0]).toFixed(1);
	var t15 = (_ltc.isRememberScan[1] / _ltc.isRememberScan[0]).toFixed(1);
	var t15b0 = ((_ltc.isbattle[1] + _ltc.isRememberScan[1]) / _ltc.isbattle[0]).toFixed();
	var t15b = (_ltc.isRememberScan[1] / (_ltc.isRememberScan[0] +  _ltc.collectRoundInfo[0])).toFixed(1);
	var t16 = (_ltc.isTrackStats[1] / _ltc.collectRoundInfo[0]).toFixed(1);
	var t17 = (_ltc.isTrackItems[1] / _ltc.collectRoundInfo[0]).toFixed(1);
	var t18 = (_ltc.saveStats[1] / _ltc.saveStats[0]).toFixed(1);
	var t19 = (_ltc.isShowElemHvstatStyle[1] / _ltc.showMonsterStats[0]).toFixed(1);
	var t20 = (_ltc.extendedHits[1] / _ltc.collectRoundInfo[0]).toFixed(1);
	var t21 = (_ltc.changedMHits[1] / _ltc.collectRoundInfo[0]).toFixed(1);
	var t22 = (_ltc.cast[1] /	_ltc.collectRoundInfo[0]).toFixed(1);
	var t23 = (_ltc.effects[1] / _ltc.collectRoundInfo[0]).toFixed(1);
	var t24 = (_ltc.hidetitle[1] / _ltc.hidetitle[0]).toFixed(1);
	var t25 = (_ltc.showhp[1] / _ltc.showhp[0]).toFixed(1);
	var t26 = (_ltc.showmp[1] / _ltc.showmp[0]).toFixed(1);
	var t27 = (_ltc.showelem[1] / _ltc.showelem[0]).toFixed(1);
	var t33 = (_ltc.showsp[1] / _ltc.showsp[0]).toFixed(1);
	var t34 = (_ltc.monsterpopup[1] / _ltc.monsterpopup[0]).toFixed(1);
	var t35 = (_ltc.showscanbutton[1] / _ltc.isbattle[0]).toFixed(1);
	var t36 = (_ltc.taggingitems[1] / _ltc.taggingitems[0]).toFixed(1);
	var t37 = (_ltc.startalerts[1] / _ltc.startalerts[0]).toFixed(1);
	var t38 = (_ltc.showset[1] / _ltc.showset[0]).toFixed(1);
	var t39 = (_ltc.botfunction[1] / _ltc.botfunction[0]).toFixed(1);
	var tp1 = (_ltc.pageLoad[3] / _ltc.pageLoad[2]).toFixed(1);
	var a = '<a style="color:red;padding-bottom:10px">All changes will take effect on next page load.</a>'
		+ '<table class="_settings" cellspacing="0" cellpadding="2" style="width:100%">'
		+ '<tr><td colspan="3"><b>General Options:</b></td><td align="center"><b>Average execution time: </b></td></tr>'
		+ '<tr><td colspan="3"></td><td align="center" style="width:120px"><b>In battle: </b></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isCountPageLoadTime" /></td><td colspan="3">Count page load time (it may have big impact on performance)</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowSidebarProfs" /></td><td colspan="2">Show proficiencies in sidebar</td><td align="center" style="width:120px">' + t13 + ' ms (' + (t13*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isColumnInventory" /></td><td colspan="2">Use column view for item inventory (<span style="color:red">Downloadable/Custom Local Fonts only!</span>)</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isHideHVLogo" /></td><td colspan="2">Hide HentaiVerse logo</td><td align="center" style="width:120px">' + t3 + ' ms (' + (t3*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isChangePageTitle" /></td><td colspan="2">Change HentaiVerse page title: <input type="text" name="customPageTitle" size="40" /></td><td align="center" style="width:120px">' + t24 + ' ms (' + (t24*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isStartAlert" /></td><td colspan="2">Warnings berfore starting Challenges when HP is below <input type="text" name="StartAlertHP" size="1" maxLength="2" style="text-align:right" />%, MP is below <input type="text" name="StartAlertMP" size="1" maxLength="2" style="text-align:right" />%, SP is below <input type="text" name="StartAlertSP" size="1" maxLength="2" style="text-align:right" />% or difficulty is over <select id="StartAlertDifficulty"><option id=diff1 value=1>Easy</option><option id=diff2 value=2>Normal</option><option id=diff3 value=3>Hard</option><option id=diff4 value=4>Heroic</option><option id=diff5 value=5>Nightmare</option><option id=diff6 value=6>Hell</option><option id=diff7 value=7>Nintendo</option><option id=diff8 value=8>Battletoads</option></select> (<span style="color:red">Downloadable/Custom Local Fonts only!</span>)</td><td align="center" style="width:120px">' + t37 + ' ms (' + (t37*100/t0b).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowScanButton" /></td><td colspan="2">Show scan button</td><td align="center" style="width:120px">' + t35 + ' ms (' + (t35*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isEnableScanHotkey" /></td><td colspan="2">Enable Scan Hotkeys: numpad","/numpad delete</td><td align="center" style="width:120px"></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowSkillButton" /></td><td colspan="2">Show skill button </td><td align="center" style="width:120px"></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isEnableSkillHotkey" /></td><td colspan="2">Enable Weapon Skill Hotkeys: "+" / "=" and numpad"+" (Works without skillbutton)</td><td align="center" style="width:120px"></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowEquippedSet" /></td><td colspan="2">Show equipped set number at left panel (<span style="color:red">Downloadable/Custom Local Fonts only!</span>)</td><td align="center" style="width:120px">' + t38 + ' ms (' + (t38*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td colspan="3">Show item tags in:</td><td align="center" style="width:120px">' + t36 + ' ms by tagging</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:15px"><input type="checkbox" name="isShowTags0" /></td><td colspan="3" style="padding-left:15px">Equipment page </td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:15px"><input type="checkbox" name="isShowTags1" /></td><td colspan="3" style="padding-left:15px">Bazaar shop page </td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:15px"><input type="checkbox" name="isShowTags2" /></td><td colspan="3" style="padding-left:15px">Item World </td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:15px"><input type="checkbox" name="isShowTags3" /></td><td colspan="3" style="padding-left:15px">Moogle Mail Attachments list </td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:15px"><input type="checkbox" name="isShowTags4" /></td><td colspan="3" style="padding-left:15px">Forge </td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:15px"><input type="checkbox" name="isShowTags5" /></td><td colspan="3" style="padding-left:15px">Inventory (<span style="color:red">Strongly suggested to turn it on and visit inventory once for a while</span>)</td></tr>'
		+ '<tr><td colspan="2"><b>Battle Enhancement:</b></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowHighlight" /></td><td colspan="2">Highlight battle log</td><td align="center" style="width:120px">' + t4 + ' ms (' + (t4*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isAltHighlight" /></td><td colspan="2" style="padding-left:10px">Use alternate highlighting</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowDivider" /></td><td colspan="2">Show turn divider</td><td align="center" style="width:120px">' + t5 + ' ms (' + (t5*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowSelfDuration" /></td><td colspan="2">Show self effect durations</td><td align="center" style="width:120px">' + t10 + ' ms (' + (t10*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isSelfEffectsWarnColor" /></td><td colspan="2" style="padding-left:10px">Highlight duration badges - <span style="color:orange">Orange</span>: on <input type="text" name="SelfWarnOrangeRounds" size="1" maxLength="2" style="text-align:right" /> rounds; <span style="color:red">Red</span>: on <input type="text" name="SelfWarnRedRounds" size="1" maxLength="1" style="text-align:right" /> rounds</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowRoundReminder" /></td><td colspan="2">Final round reminder - minimum <input type="text" name="reminderMinRounds" size="1" maxLength="3" style="text-align:right" /> rounds; Alert <input type="text" name="reminderBeforeEnd" size="1" maxLength="1" style="text-align:right" /> rounds before end</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowEndStats" /></td><td colspan="2">Show Battle Summary</td><td align="center" style="width:120px">' + t11 + ' ms (' + (t11*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isShowEndProfs" /></td><td colspan="2" style="padding-left:10px">Show Proficiency Gain Summary</td><tr><td align="center" style="width:5px;padding-left:40px"><input type="checkbox" name="isShowEndProfsMagic" /></td><td colspan="2" style="padding-left:30px">Show Magic Proficiency</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:40px"><input type="checkbox" name="isShowEndProfsArmor" /></td><td colspan="2" style="padding-left:30px">Show Armor Proficiency</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:40px"><input type="checkbox" name="isShowEndProfsWeapon" /></td><td colspan="2" style="padding-left:30px">Show Weapon Proficiency</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isAlertGem" /></td><td colspan="2">Alert on Powerup drops</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isAlertOverchargeFull" /></td><td colspan="2">Alert when overcharge is full</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isShowMonsterNumber"></td><td colspan="2">Show Numbers intead of letters next to monsters.</td></tr>'
		+ '<tr><td colspan="2" style="padding-left:10px">Display Monster Stats:</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isShowMonsterHP" /></td><td colspan="2">Show monster HP (<span style="color:red">Estimated</span>)</td><td align="center" style="width:120px">' + t25 + ' ms (' + (t25*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:40px"><input type="checkbox" name="isShowMonsterHPPercent" /></td><td colspan="2" style="padding-left:10px">Show monster HP in percentage</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isShowMonsterMP" /></td><td  colspan="2">Show monster MP percentage</td><td align="center" style="width:120px">' + t26 + ' ms (' + (t26*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isShowMonsterSP" /></td><td colspan="2">Show monster SP percentage</td><td align="center" style="width:120px">' + t33 + ' ms (' + (t33*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isShowMonsterElements" /></td><td colspan="2">Show monster resistances</td><td align="center" style="width:120px">' + t27 + ' ms (' + (t27*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:40px"><input type="checkbox" name="isShowElemHvstatStyle" /></td><td colspan="2" style="padding-left:10px">Show monster info from database</td><td align="center" style="width:120px">' + t19 + ' ms (' + (t19*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:60px"><input type="checkbox" name="isShowClassHvstatStyle" /></td><td colspan="2" style="padding-left:20px">Show monster class from database</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:60px"><input type="checkbox" name="isShowAttackHvstatStyle" /></td><td colspan="2" style="padding-left:20px">Show monster attack type from database</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:60px"><input type="checkbox" name="isShowWeakHvstatStyle" /></td><td colspan="2" style="padding-left:20px">Show monster weaknesses from database</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:60px"><input type="checkbox" name="isShowResHvstatStyle" /></td><td colspan="2" style="padding-left:20px">Show monster resistances from database</td></tr>'
		+ '<tr><td colspan="3" style="padding-left:85px">Hide specific weaknesses/resitances: </td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="HideThisResHvstatStyle0" /></td><td colspan="2" style="padding-left:20px">Slashing</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="HideThisResHvstatStyle1" /></td><td colspan="2" style="padding-left:20px">Crushing</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="HideThisResHvstatStyle2" /></td><td colspan="2" style="padding-left:20px">Piercing</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="HideThisResHvstatStyle3" /></td><td colspan="2" style="padding-left:20px">Fire</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="HideThisResHvstatStyle4" /></td><td colspan="2" style="padding-left:20px">Cold</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="HideThisResHvstatStyle5" /></td><td colspan="2" style="padding-left:20px">Elec</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="HideThisResHvstatStyle6" /></td><td colspan="2" style="padding-left:20px">Wind</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="HideThisResHvstatStyle7" /></td><td colspan="2" style="padding-left:20px">Holy</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="HideThisResHvstatStyle8" /></td><td colspan="2" style="padding-left:20px">Dark</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="HideThisResHvstatStyle9" /></td><td colspan="2" style="padding-left:20px">Soul</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:65px"><input type="checkbox" name="HideThisResHvstatStyle10" /></td><td colspan="2" style="padding-left:20px">Void</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:60px"><input type="checkbox" name="ResizeMonsterInfo" /></td><td colspan="2" style="padding-left:20px">Resize Monster Info if longer than Info box</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:60px"><input type="checkbox" name="isShowPLHvstatStyle" /></td><td colspan="2" style="padding-left:20px">Show monster power levels from database</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:40px"><input type="checkbox" name="isShowStatsPopup" /></td><td colspan="2" style="padding-left:10px">Show monster statistics on mouseover - delay: <input type="text" name="monsterPopupDelay" size="3" maxLength="4" style="text-align:right" />ms</td><td align="center" style="width:120px">' + t34 + ' ms (' + (t34*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:50px"><input type="checkbox" name="isMonsterPopupPlacement" /></td><td colspan="2" style="padding-left:20px">Alternative placement for mouseover popup</td></tr></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:20px"><input type="checkbox" name="isShowMonsterDuration" /></td><td colspan="2">Show monster effect durations</td><td align="center" style="width:120px">' + t9 + ' ms (' + (t9*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isMonstersEffectsWarnColor" /></td><td colspan="2" style="padding-left:10px">Highlight duration badges - <span style="color:orange">Orange</span>: below <input type="text" name="MonstersWarnOrangeRounds" size="1" maxLength="2" style="text-align:right" /> rounds; <span style="color:red">Red</span>: below <input type="text" name="MonstersWarnRedRounds" size="1" maxLength="1" style="text-align:right" /> rounds</td></tr>'
		+ '<tr><td colspan="2"><b>Tracking Functions:</b></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isTrackStats" /></td><td colspan="2">Track Battle Statistics</td><td align="center" style="width:120px">' + t16 + ' ms (' + (t16*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isTrackItems" /></td><td colspan="2">Track Item Drops</td><td align="center" style="width:120px">' + t17 + ' ms (' + (t17*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isTrackRewards" /></td><td colspan="2">Track Arena Rewards</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isTrackShrine" /></td><td colspan="2">Track Shrine (<span style="color:red">Downloadable/Custom Local Fonts only!</span>)</td></tr>'
		+ '<tr><td style="padding-left:20px" colspan="2"><input type="button" class="_resetAll" value="Reset" title="Reset all tracking data." /></td></tr>'
		+ '<tr><td colspan="3"><b>Warning System:</b></td><td align="center" style="width:120px">' + t12 + ' ms (' + (t12*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td colspan="2" style="padding-left:10px">Effects Expiring Warnings:</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:5px"><input type="checkbox" name="isMainEffectsAlertSelf" /></td><td colspan="2">Alert when effects on yourself are expiring</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertSelf6" /></td><td style="padding-left:10px">Channeling</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertSelfRounds6" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold"/>rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertSelf0" /></td><td style="padding-left:10px">Protection</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertSelfRounds0" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertSelf1" /></td><td style="padding-left:10px">Hastened</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertSelfRounds1" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertSelf2" /></td><td style="padding-left:10px">Shadow Veil</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertSelfRounds2" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertSelf3" /></td><td style="padding-left:10px">Regen</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertSelfRounds3" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:30px"><input type="checkbox" name="isEffectsAlertSelf4" /></td><td style="padding-left:10px">Absorbing Ward</td><td style="width:440px">- alert on <input type="text" name="EffectsAlertSelfRounds4" size="1" maxLength="3" style="text-align:right;font-size:11px;font-weight:bold" />rounds remaining</td><td></td></tr>'
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
		+ '<tr><td colspan="2" style="padding-left:10px">Spark Warning:</td></tr>'
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
		+ '<tr><td colspan="3"><input type="button" class="_startdatabase" value="Save Original Monsters" /><input type="button" class="_assumemonsterstats" value="Assume Monster Stats" /></td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isRememberScan" /></td><td colspan="2">Save scan results</td><td align="center" style="width:120px">' + t15 + ' ms by scan, ' + t15b + ' ms by round(' + (t15b*100/t15b0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px"><input type="checkbox" name="isRememberSkillsTypes" /></td><td colspan="2">Save skill types (elements) while used in  battle (data updated on scan and outside of battle)</td><td align="center" style="width:120px">' + t21 + ' ms (' + (t21*100/t0).toFixed(1) + '%)</td></tr>'
		+ '<tr><td align="center" style="width:5px;padding-left:10px"><input type="checkbox" name="isSpellsSkillsDifference" /></td><td colspan="2" style="padding-left:10px">Save monster\'s physical/magical skills usage and damage separetly </td></tr></table><hr /><table class="_settings" cellspacing="0" cellpadding="2" style="width:100%"><tr><td align="center"><input type="button" class="_resetSettings" value="Default Settings" title="Reset settings to default."/></td><td align="center"><input type="button" class="_masterReset" value="MASTER RESET" title="Deletes all of STAT\'s saved data and settings."/></td></tr></table>';
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
	if (_settings.isShowMonsterHP) $("input[name=isShowMonsterHP]").attr("checked", "checked");
	if (_settings.isShowMonsterHPPercent) $("input[name=isShowMonsterHPPercent]").attr("checked", "checked");
	if (_settings.isShowMonsterMP) $("input[name=isShowMonsterMP]").attr("checked", "checked");
	if (_settings.isShowMonsterSP) $("input[name=isShowMonsterSP]").attr("checked", "checked");
	if (_settings.isShowMonsterElements) $("input[name=isShowMonsterElements]").attr("checked", "checked");
	if (_settings.isShowClassHvstatStyle) $("input[name=isShowClassHvstatStyle]").attr("checked", "checked");
	if (_settings.isShowAttackHvstatStyle) $("input[name=isShowAttackHvstatStyle]").attr("checked", "checked");
	if (_settings.isShowWeakHvstatStyle) $("input[name=isShowWeakHvstatStyle]").attr("checked", "checked");
	if (_settings.isShowResHvstatStyle) $("input[name=isShowResHvstatStyle]").attr("checked", "checked");
	if (_settings.HideThisResHvstatStyle[0]) $("input[name=HideThisResHvstatStyle0]").attr("checked", "checked");
	if (_settings.HideThisResHvstatStyle[1]) $("input[name=HideThisResHvstatStyle1]").attr("checked", "checked");
	if (_settings.HideThisResHvstatStyle[2]) $("input[name=HideThisResHvstatStyle2]").attr("checked", "checked");
	if (_settings.HideThisResHvstatStyle[3]) $("input[name=HideThisResHvstatStyle3]").attr("checked", "checked");
	if (_settings.HideThisResHvstatStyle[4]) $("input[name=HideThisResHvstatStyle4]").attr("checked", "checked");
	if (_settings.HideThisResHvstatStyle[5]) $("input[name=HideThisResHvstatStyle5]").attr("checked", "checked");
	if (_settings.HideThisResHvstatStyle[6]) $("input[name=HideThisResHvstatStyle6]").attr("checked", "checked");
	if (_settings.HideThisResHvstatStyle[7]) $("input[name=HideThisResHvstatStyle7]").attr("checked", "checked");
	if (_settings.HideThisResHvstatStyle[8]) $("input[name=HideThisResHvstatStyle8]").attr("checked", "checked");
	if (_settings.HideThisResHvstatStyle[9]) $("input[name=HideThisResHvstatStyle9]").attr("checked", "checked");
	if (_settings.HideThisResHvstatStyle[10]) 	$("input[name=HideThisResHvstatStyle10]").attr("checked", "checked");
	if (_settings.ResizeMonsterInfo) $("input[name=ResizeMonsterInfo]").attr("checked", "checked");
	if (_settings.isShowPLHvstatStyle) $("input[name=isShowPLHvstatStyle]").attr("checked", "checked");
	if (_settings.isShowElemHvstatStyle) $("input[name=isShowElemHvstatStyle]").attr("checked", "checked");
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
	if (_settings.isSpellsSkillsDifference) $("input[name=isSpellsSkillsDifference]").attr("checked", "checked");
	if (_settings.isShowRoundReminder) $("input[name=isShowRoundReminder]").attr("checked", "checked");
	$("input[name=reminderMinRounds]").attr("value", _settings.reminderMinRounds);
	if (_settings.isAlertGem) $("input[name=isAlertGem]").attr("checked", "checked");
	if (_settings.isAlertOverchargeFull) $("input[name=isAlertOverchargeFull]").attr("checked", "checked");
	$("input[name=reminderBeforeEnd]").attr("value", _settings.reminderBeforeEnd);
	if (_settings.isHideHVLogo) $("input[name=isHideHVLogo]").attr("checked", "checked");
	if (_settings.isChangePageTitle) $("input[name=isChangePageTitle]").attr("checked", "checked");
	if (_settings.isStartAlert) $("input[name=isStartAlert]").attr("checked", "checked");
	if (_settings.isShowEquippedSet) $("input[name=isShowEquippedSet]").attr("checked", "checked");
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
	if (_settings.isCountPageLoadTime) $("input[name=isCountPageLoadTime]").attr("checked", "checked");
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
	if (_settings.isEffectsAlertSelf[4]) $("input[name=isEffectsAlertSelf4]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[5]) $("input[name=isEffectsAlertSelf5]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[6]) $("input[name=isEffectsAlertSelf6]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[7]) $("input[name=isEffectsAlertSelf7]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[8]) $("input[name=isEffectsAlertSelf8]").attr("checked", "checked");
	if (_settings.isEffectsAlertSelf[9]) $("input[name=isEffectsAlertSelf9]").attr("checked", "checked");
	$("input[name=EffectsAlertSelfRounds0]").attr("value", _settings.EffectsAlertSelfRounds[0]);
	$("input[name=EffectsAlertSelfRounds1]").attr("value", _settings.EffectsAlertSelfRounds[1]);
	$("input[name=EffectsAlertSelfRounds2]").attr("value", _settings.EffectsAlertSelfRounds[2]);
	$("input[name=EffectsAlertSelfRounds3]").attr("value", _settings.EffectsAlertSelfRounds[3]);
	$("input[name=EffectsAlertSelfRounds4]").attr("value", _settings.EffectsAlertSelfRounds[4]);
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
	$("input[name=isShowMonsterHP]").click(saveSettings);
	$("input[name=isShowMonsterHPPercent]").click(saveSettings);
	$("input[name=isShowMonsterMP]").click(saveSettings);
	$("input[name=isShowMonsterSP]").click(saveSettings);
	$("input[name=isShowMonsterElements]").click(saveSettings);
	$("input[name=isShowElemHvstatStyle]").click(saveSettings);
	$("input[name=isShowStatsPopup]").click(saveSettings);
	$("input[name=isMonsterPopupPlacement]").click(saveSettings);
	$("input[name=monsterPopupDelay]").change(saveSettings);
	$("input[name=isShowClassHvstatStyle]").click(saveSettings);
	$("input[name=isShowAttackHvstatStyle]").click(saveSettings);
	$("input[name=isShowWeakHvstatStyle]").click(saveSettings);
	$("input[name=isShowResHvstatStyle]").click(saveSettings);
	$("input[name=HideThisResHvstatStyle0]").click(saveSettings);
	$("input[name=HideThisResHvstatStyle1]").click(saveSettings);
	$("input[name=HideThisResHvstatStyle2]").click(saveSettings);
	$("input[name=HideThisResHvstatStyle3]").click(saveSettings);
	$("input[name=HideThisResHvstatStyle4]").click(saveSettings);
	$("input[name=HideThisResHvstatStyle5]").click(saveSettings);
	$("input[name=HideThisResHvstatStyle6]").click(saveSettings);
	$("input[name=HideThisResHvstatStyle7]").click(saveSettings);
	$("input[name=HideThisResHvstatStyle8]").click(saveSettings);
	$("input[name=HideThisResHvstatStyle9]").click(saveSettings);
	$("input[name=HideThisResHvstatStyle10]").click(saveSettings);
	$("input[name=ResizeMonsterInfo]").click(saveSettings);
	$("input[name=isShowPLHvstatStyle]").click(saveSettings);
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
	$("input[name=isSpellsSkillsDifference]").click(reminderAndSaveSettings);
	$("input[name=isShowRoundReminder]").click(saveSettings);
	$("input[name=reminderMinRounds]").change(saveSettings);
	$("input[name=reminderBeforeEnd]").change(saveSettings);
	$("input[name=isAlertGem]").click(saveSettings);
	$("input[name=isAlertOverchargeFull]").click(saveSettings);
	$("input[name=isHideHVLogo]").click(saveSettings);
	$("input[name=isShowScanButton]").click(saveSettings);
	$("input[name=isShowSkillButton]").click(saveSettings);
	$("input[name=isEnableSkillHotkey]").click(saveSettings);
	$("input[name=isEnableScanHotkey]").click(saveSettings);
	$("input[name=isCountPageLoadTime]").click(saveSettings);
	$("input[name=isChangePageTitle]").click(saveSettings);
	$("input[name=isStartAlert]").click(saveSettings);
	$("input[name=isShowEquippedSet]").click(saveSettings);
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
	$("._startdatabase").click(function (){ if (confirm("Write original bestiary monsters into database?")) StartDatabase(); })
	$("._assumemonsterstats").click(function (){ if (confirm("Write assumed stats based on custom monsters classes into database?")) AssumeResistances(); })
	$("._minimizedatabase").click(function (){ if (confirm("Minimize Size of Monsters Database?")) MinimalizeDatabaseSize(); })
	$("._resetSettings").click(function (){ if (confirm("Reset Settings to default?")) _settings.reset(); })
	$("._resetAll").click(function (){ if (confirm("Reset All Tracking data?")) HVResetTracking(); })
	$("._masterReset").click(function (){ if (confirm("This will delete ALL HV data saved in localStorage.\nAre you sure you want to do this?")) HVMasterReset(); })
//	$("._redirectlist").click(function (){ if (confirm("Pop up monsterlist window?")) Popupmonsterlist(); })
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
	_settings.isShowMonsterHP = $("input[name=isShowMonsterHP]").get(0).checked;
	_settings.isShowMonsterHPPercent = $("input[name=isShowMonsterHPPercent]").get(0).checked;
	_settings.isShowMonsterMP = $("input[name=isShowMonsterMP]").get(0).checked;
	_settings.isShowMonsterSP = $("input[name=isShowMonsterSP]").get(0).checked;
	_settings.isShowMonsterElements = $("input[name=isShowMonsterElements]").get(0).checked;
	_settings.isShowElemHvstatStyle = $("input[name=isShowElemHvstatStyle]").get(0).checked;
	_settings.isShowStatsPopup = $("input[name=isShowStatsPopup]").get(0).checked;
	_settings.isMonsterPopupPlacement = $("input[name=isMonsterPopupPlacement]").get(0).checked;
	_settings.isShowClassHvstatStyle = $("input[name=isShowClassHvstatStyle]").get(0).checked;
	_settings.isShowAttackHvstatStyle = $("input[name=isShowAttackHvstatStyle]").get(0).checked;
	_settings.isShowWeakHvstatStyle = $("input[name=isShowWeakHvstatStyle]").get(0).checked;
	_settings.isShowResHvstatStyle = $("input[name=isShowResHvstatStyle]").get(0).checked;
	_settings.HideThisResHvstatStyle[0] = $("input[name=HideThisResHvstatStyle0]").get(0).checked;
	_settings.HideThisResHvstatStyle[1] = $("input[name=HideThisResHvstatStyle1]").get(0).checked;
	_settings.HideThisResHvstatStyle[2] = $("input[name=HideThisResHvstatStyle2]").get(0).checked;
	_settings.HideThisResHvstatStyle[3] = $("input[name=HideThisResHvstatStyle3]").get(0).checked;
	_settings.HideThisResHvstatStyle[4] = $("input[name=HideThisResHvstatStyle4]").get(0).checked;
	_settings.HideThisResHvstatStyle[5] = $("input[name=HideThisResHvstatStyle5]").get(0).checked;
	_settings.HideThisResHvstatStyle[6] = $("input[name=HideThisResHvstatStyle6]").get(0).checked;
	_settings.HideThisResHvstatStyle[7] = $("input[name=HideThisResHvstatStyle7]").get(0).checked;
	_settings.HideThisResHvstatStyle[8] = $("input[name=HideThisResHvstatStyle8]").get(0).checked;
	_settings.HideThisResHvstatStyle[9] = $("input[name=HideThisResHvstatStyle9]").get(0).checked;
	_settings.HideThisResHvstatStyle[10] = $("input[name=HideThisResHvstatStyle10]").get(0).checked;
	_settings.ResizeMonsterInfo = $("input[name=ResizeMonsterInfo]").get(0).checked;
	_settings.isShowPLHvstatStyle = $("input[name=isShowPLHvstatStyle]").get(0).checked;
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
	_settings.isSpellsSkillsDifference = $("input[name=isSpellsSkillsDifference]").get(0).checked;
	_settings.isShowRoundReminder = $("input[name=isShowRoundReminder]").get(0).checked;
	_settings.reminderMinRounds = $("input[name=reminderMinRounds]").get(0).value;
	_settings.reminderBeforeEnd = $("input[name=reminderBeforeEnd]").get(0).value;
	_settings.isAlertGem = $("input[name=isAlertGem]").get(0).checked;
	_settings.isAlertOverchargeFull = $("input[name=isAlertOverchargeFull]").get(0).checked;
	_settings.isHideHVLogo = $("input[name=isHideHVLogo]").get(0).checked;
	_settings.isShowScanButton = $("input[name=isShowScanButton]").get(0).checked;
	_settings.isShowSkillButton = $("input[name=isShowSkillButton]").get(0).checked;
	_settings.isEnableScanHotkey = $("input[name=isEnableScanHotkey]").get(0).checked;
	_settings.isEnableSkillHotkey = $("input[name=isEnableSkillHotkey]").get(0).checked;
	_settings.isCountPageLoadTime = $("input[name=isCountPageLoadTime]").get(0).checked;
	_settings.isChangePageTitle = $("input[name=isChangePageTitle]").get(0).checked;
	_settings.isShowEquippedSet = $("input[name=isShowEquippedSet]").get(0).checked;
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
	_settings.isEffectsAlertSelf[4] = $("input[name=isEffectsAlertSelf4]").get(0).checked;
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
	_settings.EffectsAlertSelfRounds[4] = $("input[name=EffectsAlertSelfRounds4]").get(0).value;
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
function isBattle() { return ($("#togpane_log").length > 0); }
function isBattleOver() { return ($("#battleform .btcp").length > 0); }
function isItemInventoryPage() { return document.location.href.match(/s=character&ss=it/i); }
function isAllInventoryPage() { return document.location.href.match(/s=Character&ss=in/i); }
function isEquipmentInventoryPage() { return document.location.href.match(/s=Character&ss=eq/i); }
function isItemWorldPage() { return document.location.href.match(/s=Battle&ss=iw/i); }
function isMoogleWrite() { return document.location.href.match(/s=Bazaar&ss=mm&filter=Write/i); }
function isCharacterPage() { return document.getElementById("pattrform"); }
function isHentaiVerse() { return ($(".stuffbox").length); }
function isShopPage() { return document.location.href.match(/s=Bazaar&ss=es/i); }
function isForgePage() { return document.location.href.match(/s=Bazaar&ss=fr/i); }
function isShrinePage() { return document.location.href.match(/s=Bazaar&ss=ss/i); }
function isHVFontEngine() { return !$(".clb .cbl .fd10").eq(0).text().match(/Health points/i); }
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
}
function getMonsterElementsById(a, b) {
	switch (b) {
		case 1:
			a.imperv = "-";
			a.resist = "Wind,Holy";
			a.majWeak = "Fire,Cold";
			a.minWeak = "-";
			break;
		case 2:
			a.imperv = "-";
			a.resist = "Holy,Dark";
			a.majWeak = "Fire,Elec";
			a.minWeak = "-";
			break;
		case 3:
			a.imperv = "-";
			a.resist = "Fire,Holy";
			a.majWeak = "Cold,Elec";
			a.minWeak = "-";
			break;
		case 4:
			a.imperv = "-";
			a.resist = "Cold,Elec";
			a.majWeak = "Holy,Dark";
			a.minWeak = "Fire";
			break;
		case 5:
			a.imperv = "-";
			a.resist = "Cold,Wind";
			a.majWeak = "Fire,Dark";
			a.minWeak = "-";
			break;
		case 6:
			a.imperv = "-";
			a.resist = "Fire,Dark";
			a.majWeak = "Cold,Holy";
			a.minWeak = "-";
			break;
		case 7:
			a.imperv = "-";
			a.resist = "Wind,Dark";
			a.majWeak = "Fire,Holy";
			a.minWeak = "-";
			break;
		case 8:
			a.imperv = "-";
			a.resist = "Fire,Cold";
			a.majWeak = "Elec,Holy";
			a.minWeak = "Wind";
			break;
		case 9:
			a.imperv = "-";
			a.resist = "Cold,Holy";
			a.majWeak = "Wind";
			a.minWeak = "Fire";
			break;
		case 10:
			a.imperv = "-";
			a.resist = "Fire,Elec";
			a.majWeak = "Wind,Dark";
			a.minWeak = "Holy";
			break;
		case 11:
			a.imperv = "-";
			a.resist = "Fire,Wind";
			a.majWeak = "Cold,Elec";
			a.minWeak = "-";
			break;
		case 12:
			a.imperv = "-";
			a.resist = "Fire,Elec,Holy";
			a.majWeak = "Dark";
			a.minWeak = "Wind";
			break;
		case 13:
			a.imperv = "-";
			a.resist = "Elec,Dark";
			a.majWeak = "Fire,Holy";
			a.minWeak = "Cold";
			break;
		case 14:
			a.imperv = "-";
			a.resist = "Cold,Holy";
			a.majWeak = "Elec,Dark";
			a.minWeak = "Fire";
			break;
		case 15:
			a.imperv = "-";
			a.resist = "Cold,Dark";
			a.majWeak = "Fire,Holy";
			a.minWeak = "Wind";
			break;
		case 16:
			a.imperv = "-";
			a.resist = "Cold,Elec,Wind,Holy,Dark";
			a.majWeak = "Fire";
			a.minWeak = "Soul";
			break;
		case 17:
			a.imperv = "-";
			a.resist = "Fire,Elec,Wind,Holy,Dark";
			a.majWeak = "Cold";
			a.minWeak = "-";
			break;
		case 18:
			a.imperv = "-";
			a.resist = "Fire,Cold,Elec,Wind,Dark";
			a.majWeak = "Holy";
			a.minWeak = "Soul";
			break;
		case 19:
			a.imperv = "-";
			a.resist = "Fire,Cold,Wind,Holy,Dark";
			a.majWeak = "Elec";
			a.minWeak = "Soul";
			break;
		case 20:
			a.imperv = "-";
			a.resist = "Fire,Cold,Elec,Holy,Dark";
			a.majWeak = "Wind";
			a.minWeak = "Soul";
			break;
		case 21:
			a.imperv = "-";
			a.resist = "Elem,Crush,Slash";
			a.majWeak = "Holy,Dark,Pierce";
			a.minWeak = "-";
			break;
		case 22:
			a.imperv = "-";
			a.resist = "Elem,Crush,Pierce";
			a.majWeak = "Holy,Dark,Slash";
			a.minWeak = "-";
			break;
		case 23:
			a.imperv = "-";
			a.resist = "Elem,Slash,Pierce";
			a.majWeak = "Holy,Dark,Crush";
			a.minWeak = "-";
			break;
		case 24:
			a.imperv = "-";
			a.resist = "Elem,Holy,Dark,Phys";
			a.majWeak = "-";
			a.minWeak = "Soul";
			break;
		case 25:
			a.imperv = "-";
			a.resist = "Fire,Holy";
			a.majWeak = "Wind,Dark";
			a.minWeak = "Elec";
			break;
		case 26:
			a.imperv = "-";
			a.resist = "Wind,Dark";
			a.majWeak = "Fire,Holy";
			a.minWeak = "Elec";
			break;
		case 27:
			a.imperv = "-";
			a.resist = "Fire,Cold,Wind,Holy,Dark";
			a.majWeak = "Soul,Elec";
			a.minWeak = "-";
			break;
		case 28:
			a.imperv = "-";
			a.resist = "Fire,Elec,Wind,Holy,Dark";
			a.majWeak = "Soul,Cold";
			a.minWeak = "-";
			break;
		case 29:
			a.imperv = "-";
			a.resist = "Fire,Cold,Elec,Holy,Dark";
			a.majWeak = "Soul,Wind";
			a.minWeak = "-";
			break;
		case 30:
			a.imperv = "-";
			a.resist = "Cold,Elec,Wind,Holy,Dark";
			a.majWeak = "Soul,Fire";
			a.minWeak = "-";
			break;
		case 31:
			a.imperv = "Elem,Holy,Phys";
			a.resist = "Soul";
			a.majWeak = "Dark";
			a.minWeak = "-";
			break;
		case 32:
			a.imperv = "Elem,Dark,Phys";
			a.resist = "Soul";
			a.majWeak = "Holy";
			a.minWeak = "-";
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
function browserIsChrome(){ return /Chrome/i.test(navigator.userAgent); }
if (browserIsChrome()) {	//=== Clones a few GreaseMonkey functions for Chrome Users.
	unsafeWindow = window;
	function GM_addStyle(a) {
		var b = document.createElement("style");
		b.textContent = a;
		document.getElementsByTagName("head")[0].appendChild(b);
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
function cssAdded() {
	var a = document.createElement("div");
	a.setAttribute("id", "cssdiv");
	a.setAttribute("style", "visibility:hidden");
	$("body").append(a);
	return;
}
function cssInserted(){ return ($("#cssdiv").length > 0); }
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
	deleteFromStorage(HV_ALERT);
	deleteFromStorage(HV_EQUIP);
	deleteFromStorage(HV_DATA);
	deleteFromStorage("HVBackup1");
	deleteFromStorage("HVBackup2");
	deleteFromStorage("HVBackup3");
	deleteFromStorage("HVBackup4");
	deleteFromStorage("HVBackup5")
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
	this.itemQtyArry.init(0);
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
	this.isShowMonsterHP = true;
	this.isShowMonsterHPPercent = false;
	this.isShowMonsterMP = true;
	this.isShowMonsterSP = true;
	this.isShowMonsterElements = false;
	this.isShowElemHvstatStyle = false;
	this.isShowStatsPopup = false;
	this.isShowClassHvstatStyle = false;
	this.isShowAttackHvstatStyle = false;
	this.isShowWeakHvstatStyle = false;
	this.isShowResHvstatStyle = false;
	this.HideThisResHvstatStyle = [false, false, false, false, false, false, false, false, false, false, false];
	this.ResizeMonsterInfo = false;
	this.isShowPLHvstatStyle = false;
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
	this.isSpellsSkillsDifference = false;
	this.isShowRoundReminder = false;
	this.reminderMinRounds = 3;
	this.reminderBeforeEnd = 1;
	this.isAlertGem = true;
	this.isAlertOverchargeFull = false;
	this.isHideHVLogo = false;
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
	this.isCountPageLoadTime = false;
	this.isShowEquippedSet = false;
	//0-twohanded fighter; 1-elemental mage
	//0-equipment page, 1-shop, 2-itemworld, 3-moogle, 4-forge
	this.isShowTags = [false, false, false, false, false, false];
	this.isShowMonsterNumber = false;
}
function HVMonster() {
	this.id = 0;
	this.maxHp = 0;
	this.currHp = 0;
	this.name = "";
	this.mclass = 0;
	this.mpl = 0;
	this.mattack = 0;
	this.mweak = 0;
	this.mresist = 0;
	this.mimperv = 0;
	this.mskilltype = 0;
	this.mskillspell = 0;
	this.datesave = 0;
	this.hasspbar = false;
	this.sp1 = 0;
	this.sp2 = 0;
	this.currmp = 0;
}
function ElementalStats() {
	this.resist = "";
	this.imperv = "";
	this.majWeak = "";
	this.minWeak = "";
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
function StartDatabase() {
	var sec = TimeCounter(1);
	loadDatabaseObject();
	_database.mclass[1] = 31;
	_database.mattack[1] = 52;
	_database.mweak[1] = 6162;
	_database.mresist[1] = 6471;
	_database.mimperv[1] = 99;
	_database.mskillspell[1] = 1;
	_database.mskilltype[1] = 64;
	_database.mclass[2] = 31;
	_database.mattack[2] = 53;
	_database.mweak[2] = 6163;
	_database.mresist[2] = 7172;
	_database.mimperv[2] = 99;
	_database.mskillspell[2] = 1;
	_database.mskilltype[2] = 72;
	_database.mclass[3] = 31;
	_database.mattack[3] = 53;
	_database.mweak[3] = 6263;
	_database.mresist[3] = 6171;
	_database.mimperv[3] = 99;
	_database.mskillspell[3] = 1;
	_database.mskilltype[3] = 61;
	_database.mclass[4] = 31;
	_database.mattack[4] = 53;
	_database.mweak[4] = 617172;
	_database.mresist[4] = 6263;
	_database.mimperv[4] = 99;
	_database.mskillspell[4] = 2;
	_database.mskilltype[4] = 53;
	_database.mclass[5] = 31;
	_database.mattack[5] = 51;
	_database.mweak[5] = 6172;
	_database.mresist[5] = 6264;
	_database.mimperv[5] = 99;
	_database.mskillspell[5] = 2;
	_database.mskilltype[5] = 53;
	_database.mclass[6] = 31;
	_database.mattack[6] = 51;
	_database.mweak[6] = 6271;
	_database.mresist[6] = 6172;
	_database.mimperv[6] = 99;
	_database.mskillspell[6] = 2;
	_database.mskilltype[6] = 61;
	_database.mclass[7] = 31;
	_database.mattack[7] = 74;
	_database.mweak[7] = 6171;
	_database.mresist[7] = 6472;
	_database.mimperv[7] = 99;
	_database.mskillspell[7] = 1;
	_database.mskilltype[7] = 72;
	_database.mclass[8] = 31;
	_database.mattack[8] = 53;
	_database.mweak[8] = 636471;
	_database.mresist[8] = 6162;
	_database.mimperv[8] = 99;
	_database.mskillspell[8] = 2;
	_database.mskilltype[8] = 72;
	_database.mclass[9] = 31;
	_database.mattack[9] = 51;
	_database.mweak[9] = 6164;
	_database.mresist[9] = 6271;
	_database.mimperv[9] = 99;
	_database.mskillspell[9] = 2;
	_database.mskilltype[9] = 51;
	_database.mclass[10] = 31;
	_database.mattack[10] = 52;
	_database.mweak[10] = 647271;
	_database.mresist[10] = 6163;
	_database.mimperv[10] = 99;
	_database.mskillspell[10] = 1;
	_database.mskilltype[10] = 71;
	_database.mclass[11] = 32;
	_database.mattack[11] = 51;
	_database.mweak[11] = 626371;
	_database.mresist[11] = 6164;
	_database.mimperv[11] = 99;
	_database.mskillspell[11] = 1;
	_database.mskilltype[11] = 64;
	_database.mclass[12] = 32;
	_database.mattack[12] = 51;
	_database.mweak[12] = 6472;
	_database.mresist[12] = 616371;
	_database.mimperv[12] = 99;
	_database.mskillspell[12] = 2;
	_database.mskilltype[12] = 51;
	_database.mclass[13] = 32;
	_database.mattack[13] = 52;
	_database.mweak[13] = 616271;
	_database.mresist[13] = 6372;
	_database.mimperv[13] = 99;
	_database.mskillspell[13] = 1;
	_database.mskilltype[13] = 63;
	_database.mclass[14] = 32;
	_database.mattack[14] = 52;
	_database.mweak[14] = 616372;
	_database.mresist[14] = 6271;
	_database.mimperv[14] = 99;
	_database.mskillspell[14] = 2;
	_database.mskilltype[14] = 52;
	_database.mclass[15] = 32;
	_database.mattack[15] = 53;
	_database.mweak[15] = 616471;
	_database.mresist[15] = 6272;
	_database.mimperv[15] = 99;
	_database.mskillspell[15] = 1;
	_database.mskilltype[15] = 62;
	_database.mclass[16] = 33;
	_database.mattack[16] = 51;
	_database.mweak[16] = 61;
	_database.mresist[16] = 6263647172;
	_database.mimperv[16] = 99;
	_database.mskillspell[16] = 203;
	_database.mskilltype[16] = 7361;
	_database.mclass[17] = 33;
	_database.mattack[17] = 53;
	_database.mweak[17] = 62;
	_database.mresist[17] = 6163647172;
	_database.mimperv[17] = 99;
	_database.mskillspell[17] = 104;
	_database.mskilltype[17] = 7371;
	_database.mclass[18] = 33;
	_database.mattack[18] = 51;
	_database.mweak[18] = 71;
	_database.mresist[18] = 6162636472;
	_database.mimperv[18] = 99;
	_database.mskillspell[18] = 104;
	_database.mskilltype[18] = 7364;
	_database.mclass[19] = 33;
	_database.mattack[19] = 53;
	_database.mweak[19] = 63;
	_database.mresist[19] = 6162647172;
	_database.mimperv[19] = 99;
	_database.mskillspell[19] = 104;
	_database.mskilltype[19] = 7361;
	_database.mclass[20] = 34;
	_database.mattack[20] = 52;
	_database.mweak[20] = 64;
	_database.mresist[20] = 616263717273;
	_database.mimperv[20] = 99;
	_database.mskillspell[20] = 104;
	_database.mskilltype[20] = 7352;
	_database.mclass[21] = 34;
	_database.mattack[21] = 53;
	_database.mweak[21] = 537172;
	_database.mresist[21] = 515261626364;
	_database.mimperv[21] = 99;
	_database.mskillspell[21] = 103;
	_database.mskilltype[21] = 7372;
	_database.mclass[22] = 34;
	_database.mattack[22] = 51;
	_database.mweak[22] = 517172;
	_database.mresist[22] = 525361626364;
	_database.mimperv[22] = 99;
	_database.mskillspell[22] = 204;
	_database.mskilltype[22] = 7362;
	_database.mclass[23] = 34;
	_database.mattack[23] = 52;
	_database.mweak[23] = 527172;
	_database.mresist[23] = 515361626364;
	_database.mimperv[23] = 99;
	_database.mskillspell[23] = 103;
	_database.mskilltype[23] = 7372;
	_database.mclass[24] = 35;
	_database.mattack[24] = 73;
	_database.mweak[24] = 99;
	_database.mresist[24] = 51525373;
	_database.mimperv[24] = 616263647172;
	_database.mskillspell[24] = 203;
	_database.mskilltype[24] = 7373;
	_database.mclass[25] = 31;
	_database.mattack[25] = 53;
	_database.mweak[25] = 636472;
	_database.mresist[25] = 6171;
	_database.mimperv[25] = 99;
	_database.mskillspell[25] = 102;
	_database.mskilltype[25] = 7353;
	_database.mclass[26] = 31;
	_database.mattack[26] = 52;
	_database.mweak[26] = 616371;
	_database.mresist[26] = 6472;
	_database.mimperv[26] = 99;
	_database.mskillspell[26] = 102;
	_database.mskilltype[26] = 7373;
	_database.mclass[27] = 34;
	_database.mattack[27] = 52;
	_database.mweak[27] = 6373;
	_database.mresist[27] = 6162647172;
	_database.mimperv[27] = 99;
	_database.mskillspell[27] = 104;
	_database.mskilltype[27] = 6373;
	_database.mclass[28] = 34;
	_database.mattack[28] = 53;
	_database.mweak[28] = 6273;
	_database.mresist[28] = 6163647172;
	_database.mimperv[28] = 99;
	_database.mskillspell[28] = 104;
	_database.mskilltype[28] = 6273;
	_database.mclass[29] = 34;
	_database.mattack[29] = 51;
	_database.mweak[29] = 6473;
	_database.mresist[29] = 6162637172;
	_database.mimperv[29] = 99;
	_database.mskillspell[29] = 104;
	_database.mskilltype[29] = 6473;
	_database.mclass[30] = 34;
	_database.mattack[30] = 73;
	_database.mweak[30] = 6173;
	_database.mresist[30] = 6263647172;
	_database.mimperv[30] = 99;
	_database.mskillspell[30] = 0;
	_database.mskilltype[30] = 0;
	_database.mclass[31] = 35;
	_database.mattack[31] = 71;
	_database.mweak[31] = 72;
	_database.mresist[31] = 51525373;
	_database.mimperv[31] = 6162636471;
	_database.mskillspell[31] = 203;
	_database.mskilltype[31] = 7173;
	_database.mclass[32] = 35;
	_database.mattack[32] = 72;
	_database.mweak[32] = 71;
	_database.mresist[32] = 51525373;
	_database.mimperv[32] = 6162636472;
	_database.mskillspell[32] = 203;
	_database.mskilltype[32] = 7273;
	_database.mclass[8223] = 34;
	_database.mattack[8223] = 52;
	_database.mweak[8223] = 62;
	_database.mresist[8223] = 52616364717273;
	_database.mimperv[8223] = 99;
	_database.mskillspell[8223] = 203;
	_database.mskilltype[8223] = 6161;
	_database.mclass[8224] = 34;
	_database.mattack[8224] = 52;
	_database.mweak[8224] = 62;
	_database.mresist[8224] = 52616364717273;
	_database.mimperv[8224] = 99;
	_database.mskillspell[8224] = 203;
	_database.mskilltype[8224] = 6161;
	_database.mclass[8225] = 34;
	_database.mattack[8225] = 52;
	_database.mweak[8225] = 71;
	_database.mresist[8225] = 51616263647273;
	_database.mimperv[8225] = 99;
	_database.mskillspell[8225] = 203;
	_database.mskilltype[8225] = 7274;
	_database.save();
	alert("Done");
	_ltc.main[1] -= TimeCounter(0, sec);
	if (isBattle()) _ltc.isbattle[1] -= TimeCounter(0, sec);
	_ltc.save();
}
function MinimalizeDatabaseSize() {
	loadDatabaseObject();
	var mid = 0;
	while (_database.mclass[mid] !== undefined) {
		_database.mclass[mid] = _database.mclass[mid] === null ? 0 : _database.mclass[mid] = MClassNum(_database.mclass[mid], 0);
		_database.mattack[mid] = MElemNum(_database.mattack[mid], 0);
		_database.mweak[mid] = MElemNum(_database.mweak[mid], 0);
		_database.mresist[mid] = MElemNum(_database.mresist[mid], 0);
		_database.mimperv[mid] = MElemNum(_database.mimperv[mid], 0);
		_database.mskilltype[mid] = MElemNum(_database.mskilltype[mid], 0);
		if (_database.mskillspell[mid] === null) _database.mskillspell[mid] = 0;
		else if (String(_database.mskillspell[mid]).match(/ma/i)) _database.mskillspell[mid] = 1;
		else if (String(_database.mskillspell[mid]).match(/ph/i)) _database.mskillspell[mid] = 2;
		if (_database.mpl[mid] === null) _database.mpl[mid] = 0;
		if (mid === 10) alert("It is working 10");
		if (mid === 100) alert("It is working 100");
		if (mid === 1000) alert("It is working 1000");
		mid++;
	}
	_database.save();
	alert("Done");
}
function MElemNum(a, b) {
	if (a === null || a === 0) {
		a = 0;
		return a;
	}
	if ((b === 0 || b === null || b === undefined) && String(a).match(/\d/ig)) return a;
	if (b === 0 || b === null || b === undefined) {
		a = a.replace(/\?/ig, "");
		if (a.length < 10) {
			switch (a) {
			case "Nothing":
			case "nothing":
			case "":
					a = 99; break;
			case "Slashing":
			case "slashing":
			case "Sl":
					a = 51; break;
			case "Crushing":
			case "crushing":
			case "Cr":
					a = 52; break;
			case "Piercing":
			case "piercing":
			case "Pi":
					a = 53; break;
			case "Fire":
			case "fire":
					a = 61; break;
			case "Cold":
			case "cold":
					a = 62; break;
			case "Elec":
			case "elec":
					a = 63; break;
			case "Wind":
			case"wind":
					a = 64; break;
			case "Holy":
			case "holy":
					a = 71; break;
			case "Dark":
			case "dark":
					a = 72; break;
			case "Soul":
			case "soul":
					a = 73; break;
			case "Void":
			case "void":
					a = 74; break;
			case "Elemental":
			case "elemental":
			case "Elem":
			case "elem":
				a = 61626364;
			}
		} else {
			a = a.replace(/\,\s/ig, "").replace(/slashing/ig, "51").replace(/sl/ig, "51").replace(/crushing/ig, "52").replace(/cr/ig, "52").replace(/piercing/ig, "53").replace(/pi/ig, "53").replace(/physical/ig,"515253").replace(/phys/ig,"515253").replace(/ph/ig,"515253");
			a = a.replace(/fire/ig,"61").replace(/cold/ig,"62").replace(/elec/ig,"63").replace(/wind/ig,"64").replace(/elemental/ig,"61626364").replace(/elem/ig,"61626364").replace(/el/ig,"61626364");
			a = a.replace(/holy/ig,"71").replace(/dark/ig,"72").replace(/soul/ig,"73").replace(/void/ig,"74");
			a = parseInt(a);
		}
	} else {
		if (a < 100) {
			switch (a) {
				case 99:
					a = "-"; break;
				case 51:
					a = "Slash"; break;
				case 52:
					a = "Crush"; break;
				case 53:
					a = "Pierc"; break;
				case 61:
					a = "Fire"; break;
				case 62:
					a = "Cold"; break;
				case 63:
					a = "Elec"; break;
				case 64:
					a = "Wind"; break;
				case 71:
					a = "Holy"; break;
				case 72:
					a = "Dark"; break;
				case 73:
					a = "Soul"; break;
				case 74:
					a = "Void"; break;
				case 1:
					a = "Mag"; break;
				case 91:
					a = "?Mag"; break;
				case 2:
					a = "Phys"; break;
				case 92:
					a = "?Phys"; break;
				case 3:
					a = "Spirit:Mag"; break;
				case 4:
					a = "Spirit:Phys";
			}
		} else {
			a = String(a);
			a = a.replace(/61626364/,", Elem").replace(/515253/,", Phys").replace(/525153/,", Phys").replace(/51852/,", ?Sl/Cr").replace(/52853/,", ?Cr/Pi").replace(/51853/,", ?Cr/Pi").replace(/9/,"?");
			a = a.replace(/61/g,", Fire").replace(/62/g,", Cold").replace(/63/g,", Elec").replace(/64/g,", Wind");
			a = a.replace(/71/g,", Holy").replace(/72/g,", Dark").replace(/73/g,", Soul").replace(/74/g,", Void");
			a = a.replace(/51/g, ", Slash").replace(/52/g, ", Crush").replace(/53/g, ", Pierc");
			a = a.replace(/1/, ", Mag").replace(/2/, ", Phys").replace(/3/, ", Spirit:Mag").replace(/4/, ", Spirit:Phys").replace(", ", "");
		}
	}
	return a;
}
function MClassNum(a, b) {
	if (b === 1 || String(b).match(/rev/)) {
		switch (a) {
			case 1:
				a = "Arthropod"; break;
			case 2:
				a = "Avion"; break;
			case 3:
				a = "Beast"; break;
			case 4:
				a = "Celestial"; break;
			case 5:
				a = "Daimon"; break;
			case 6:
				a = "Dragonkin"; break;
			case 7:
				a = "Elemental"; break;
			case 8:
				a = "Giant"; break;
			case 9:
				a = "Humanoid"; break;
			case 10:
				a = "Mechanoid"; break;
			case 11:
				a = "Reptilian"; break;
			case 12:
				a = "Sprite"; break;
			case 13:
				a = "Undead"; break;
			case 31:
				a = "Common"; break;
			case 32:
				a = "Uncommon"; break;
			case 33:
				a = "Rare"; break;
			case 34:
				a = "Legendary"; break;
			case 35:
				a = "Ultimate"; break;
			default:
				a = 0;
		}
	} else {
		if (!String(a).match(/\d/)){
			switch (a) {
				case "Arthropod":
					a = 1; break;
				case "Avion":
					a = 2; break;
				case "Beast":
					a = 3; break;
				case "Celestial":
					a = 4; break;
				case "Daimon":
					a = 5; break;
				case "Dragonkin":
					a = 6; break;
				case "Elemental":
					a = 7; break;
				case "Giant":
					a = 8; break;
				case "Humanoid":
					a = 9; break;
				case "Mechanoid":
					a = 10; break;
				case "Reptilian":
					a = 11; break;
				case "Sprite":
					a = 12; break;
				case "Undead":
					a = 13; break;
				case "Common":
					a = 31; break;
				case "Uncommon":
					a = 32; break;
				case "Rare":
					a = 33; break;
				case "Legendary":
					a = 34; break;
				case "Ultimate":
					a = 35; break;
				default:
					a = 0;
			}
		}
	}
	return a;
}
function HVCollectData() {
	this.load = function () { loadFromStorage(this, HV_COLL); };
	this.save = function () { saveToStorage(this, HV_COLL); };
	this.reset = function () { deleteFromStorage(HV_COLL); };
	this.cloneFrom = clone;
	this.skillmid = [];
	this.skilltype = [];
	this.mskillspell = [];
	this.isLoaded = false;
}
function loadCollectdataObject() {
	if (_collectdata === null) {
		_collectdata = new HVCollectData();
		_collectdata.load();
	}
}
function SaveToDatabase(a) {
	loadDatabaseObject();
	if (a === 1 || a === 0) {
		var dmid = parseInt(_round.scan[0]);
		_database.mclass[dmid] = MClassNum(_round.scan[1], 0);
		if (_round.scan[2] === null) _database.mpl[mid] = 0;
		else _database.mpl[dmid] = _round.scan[2];
		_database.mattack[dmid] = MElemNum(_round.scan[3], 0);
		_database.mweak[dmid] = MElemNum(_round.scan[4], 0);
		_database.mresist[dmid] = MElemNum(_round.scan[5], 0);
		_database.mimperv[dmid] = MElemNum(_round.scan[6], 0);
		_database.datescan[dmid] = _round.scan[7];
	}
	if (a === 2 || a === 0) {
		loadCollectdataObject();
		var n = 0;
		while (_collectdata.skillmid[n] !== undefined) {
			var mid = _collectdata.skillmid[n];
			if (_database.mskilltype[mid] === 0 || _database.mskilltype[mid] === null || _database.mskilltype[mid] === undefined) {
				_database.mskillspell[mid] = _collectdata.mskillspell[n];
				_database.mskilltype[mid] = MElemNum(_collectdata.skilltype[n], 0);
			} else if (String(_database.mskillspell[mid]).length === 1) {
				if ((_database.mskillspell[mid] !== _collectdata.mskillspell[n]) || (_database.mskilltype[mid] !== MElemNum(_collectdata.skilltype[n], 0))) {
					_database.mskillspell[mid] = parseInt(String(_database.mskillspell[mid]) + '0' + String(_collectdata.mskillspell[n]));
					_database.mskilltype[mid] = parseInt(String(_database.mskilltype[mid]) + String(MElemNum(_collectdata.skilltype[n], 0)));
				}
			} else if (String(_database.mskillspell[mid]).length === 3) {
				if (((parseInt(String(_database.mskillspell[mid]).slice(0, 1)) !== _collectdata.mskillspell[n]) || (parseInt(String(_database.mskilltype[mid]).slice(0, 2)) !== MElemNum(_collectdata.skilltype[n], 0)))
					&& ((parseInt(String(_database.mskillspell[mid]).slice(-1)) !== _collectdata.mskillspell[n] || parseInt(String(_database.mskilltype[mid]).slice(-2)) !== MElemNum( _collectdata.skilltype[n], 0 ))))
				{
					_database.mskillspell[mid] = parseInt(String(_database.mskillspell[mid]) + '0' + String(_collectdata.mskillspell[n]));
					_database.mskilltype[mid] = parseInt(String(_database.mskilltype[mid]) + String(MElemNum(_collectdata.skilltype[n], 0)));
				}
			}
			n++;
		}
		_collectdata.reset();
	}
	_database.save()
}
function AssumeResistances() {
	var sec = TimeCounter(1);
	loadDatabaseObject();
	var n = 0;
	while (_database.mclass[n] !== undefined) {
		if ((_database.mclass[n] !== null) && (_database.mweak[n] === null) && (_database.mattack[n] === null)) {
			switch (_database.mclass[n]){
				case 1: 	//Arthropod
					_database.mattack[n] = 52853;
					_database.mweak[n] = 95262;
					_database.mresist[n] = 51616364;
					_database.mimperv[n] = 99;
					if (_database.mskillspell[n] === null) _database.mskillspell[n] = 9515253;
					break;
				case 2: 	//Avion
					_database.mattack[n] = 51853;
					_database.mweak[n] = 96164;
					_database.mresist[n] = 63;
					_database.mimperv[n] = 99;
					if (_database.mskillspell[n] === null) _database.mskillspell[n] = 9515253;
					break;
				case 3: 	//Beast
					_database.mattack[n] = 51853;
					_database.mweak[n] = 961;
					_database.mresist[n] = 526264;
					_database.mimperv[n] = 99;
					if (_database.mskillspell[n] === null) _database.mskillspell[n] = 9515253;
					break;
				case 4: 	//Celestial
					_database.mattack[n] = 51852;
					_database.mweak[n] = 95152537273;
					_database.mresist[n] = 6162636471;
					_database.mimperv[n] = 99;
					if (_database.mskillspell[n] === null) _database.mskillspell[n] = 9515253;
					break;
				case 5: 	//Daimon
					_database.mattack[n] = 51853;
					_database.mweak[n] = 95152537173;
					_database.mresist[n] = 6162636472;
					_database.mimperv[n] = 99;
					if (_database.mskillspell[n] === null) _database.mskillspell[n] = 9515253;
					break;
				case 6: 	//Dragonkin
					_database.mattack[n] = 52853;
					_database.mweak[n] = 96264;
					_database.mresist[n] = 51526163;
					_database.mimperv[n] = 99;
					if (_database.mskillspell[n] === null) _database.mskillspell[n] = 9515253;
					break;
				case 7: 	//Elemental
					_database.mattack[n] = 961626364;
					_database.mweak[n] = 9525373;
					_database.mresist[n] = 616263647172;
					_database.mimperv[n] = 99;
					if (_database.mskillspell[n] === null) _database.mskillspell[n] = 961626364;
					break;
				case 8: 	//Giant
					_database.mattack[n] = 52;
					_database.mweak[n] = 96364;
					_database.mresist[n] = 51526162;
					_database.mimperv[n] = 99;
					if (_database.mskillspell[n] === null) _database.mskillspell[n] = 9515253;
					break;
				case 9: 	//Humanoid
					_database.mattack[n] = 9515253;
					_database.mweak[n] = 972;
					_database.mresist[n] = 99;
					_database.mimperv[n] = 99;
					if (_database.mskillspell[n] === null) _database.mskillspell[n] = 9515253;
					break;
				case 10:	//Mechanoid
					_database.mattack[n] = 51853;
					_database.mweak[n] = 963;
					_database.mresist[n] = 51536162647173;
					_database.mimperv[n] = 99;
					if (_database.mskillspell[n] === null) _database.mskillspell[n] = 9515253;
					break;
				case 11:	//Retilian
					_database.mattack[n] = 51853;
					_database.mweak[n] = 962;
					_database.mresist[n] = 51526163;
					_database.mimperv[n] = 99;
					if (_database.mskillspell[n] === null) _database.mskillspell[n] = 9515253;
					break;
				case 12:	//Sprite
					_database.mattack[n] = 51853;
					_database.mweak[n] = 95272;
					_database.mresist[n] = 536162636471;
					_database.mimperv[n] = 99;
					if (_database.mskillspell[n] === null) _database.mskillspell[n] = 9515253;
					break;
				case 13:	//Undead
					_database.mattack[n] = 51852;
					_database.mweak[n] = 96171;
					_database.mresist[n] = 525362636472;
					_database.mimperv[n] = 99;
					if (_database.mskillspell[n] === null) _database.mskillspell[n] = 9515253;
			}
		}
		n++;
	}
	alert("Done");
	_database.save();
	_ltc.main[1] -= TimeCounter(0, sec);
	if (isBattle()) _ltc.isbattle[1] -= TimeCounter(0, sec);
	_ltc.save();
}
function TimeCounter(a, b) {
	var dtm = new Date();
	if (a === 1) var b = dtm.getTime();
	else if (a === 0) b = dtm.getTime() - b;
	return b;
}
function HVLoadTimeCounters() {
	this.load = function () { loadFromStorage(this, HV_LTC); };
	this.save = function () { saveToStorage(this, HV_LTC); };
	this.reset = function () { deleteFromStorage(HV_LTC); };
	this.cloneFrom = clone;
	this.collectRoundInfo = [0, 0];
	this.main = [0, 0];
	this.obscureHVIds = [0, 0];
	this.highlightLogText = [0, 0];
	this.addBattleLogDividers = [0, 0];
	this.showRoundCounter = [0, 0];
	this.displayPowerupBox = [0, 0];
	this.showMonsterStats = [0, 0];
	this.showMonsterEffectsDuration = [0, 0];
	this.showSelfEffectsDuration = [0, 0];
	this.showBattleEndStats = [0, 0];
	this.healthWarning = [0, 0];
	this.showSidebarProfs = [0, 0];
	this.isRememberScan = [0, 0];
	this.isTrackStats = [0, 0];
	this.isTrackItems = [0, 0];
	this.saveStats = [0, 0];
	this.isShowElemHvstatStyle = [0, 0];
	this.extendedHits = [0, 0];
	this.changedMHits = [0, 0];
	this.cast = [0, 0];
	this.effects = [0, 0];
	this.hidetitle = [0, 0];
	this.showhp = [0, 0];
	this.showmp = [0, 0];
	this.showsp = [0, 0];
	this.showelem = [0, 0];
	this.isbattle = [0, 0];
	this.pageLoad = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	this.sel = [0, 0];
	this.monsterpopup = [0, 0];
	this.showscanbutton = [0, 0];
	this.taggingitems = [0, 0];
	this.startalerts = [0, 0];
	this.showset = [0, 0];
	this.botfunction = [0, 0];
	this.isLoaded = false;
}
function loadLTCObject() {
	if (_ltc !== null) return;
	_ltc = new HVLoadTimeCounters();
	_ltc.load();
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
function Scanbutton() {
	pressedScanbySTAT = false;
	pressedSkillbySTAT = 0;
	var skillnum = [null, null, null];
	var cooldown = [true, true, true];
	$("#togpane_skill  div.btsd").each(function () {
		var g = $(this);
		var st = g.attr("style");
		var skid = g.attr("id");
		if (String(skid).match(/1(1|2|3|4|5)0001/)) {
			skillnum[0] = skid;
			if (!String(st).match(/opacity.0.5/i)) cooldown[0] = false;
		} else if (String(skid).match(/1(1|2|3|4|5)0002/)) {
			skillnum[1] = skid;
			if (!String(st).match(/opacity.0.5/i)) cooldown[1] = false;
		} else if (String(skid).match(/1(1|2|3|4|5)0003/)) {
			skillnum[2] = skid;
			if (!String(st).match(/opacity.0.5/i)) cooldown[2] = false;
		}
	});
	var skillname = [null, null, null];
	switch (skillnum[0]) {
	case 110001:
	case "110001":
		skillname[0] = "SkyS"; break;
	case 120001:
	case "120001":
		skillname[0] = "ShiB"; break;
	case 130001:
	case "130001":
		skillname[0] = "GreC"; break;
	case 140001:
	case "140001":
		skillname[0] = "IrisS"; break;
	case 150001:
	case "150001":
		skillname[0] = "ConS";
	}
	switch (skillnum[1]) {
	case 120002:
	case "120002":
		skillname[1] = "VitS"; break;
	case 130002:
	case "130002":
		skillname[1] = "RenB"; break;
	case 140002:
	case "140002":
		skillname[1] = "Stab";
	}
	switch (skillnum[2]) {
	case 120003:
	case "120003":
		skillname[2] = "MerB"; break;
	case 130003:
	case "130003":
		skillname[2] = "ShaS"; break;
	case 140003:
	case "140003":
		skillname[2] = "FreB";
	}
	var mkeymax = $("#monsterpane > div").length;
	var n = mkeymax;
	var num = 0;
	var a = $("#mainpane");
	var ischromeSTAT = browserIsChrome();
	document.addEventListener('keydown', function(a) {
		var key = a.keyCode ? a.keyCode : a.which;
		if (_settings.isEnableScanHotkey) {
			if (key === 110 || key === 46) {
				if (!window.pressedScanbySTAT) {
					if (window.pressedSkillbySTAT === 0) {
						// open skill menu
						if (ischromeSTAT) {
							document.getElementById("ckey_skills").onclick();
						} else {
							location.href = 'javascript:document.getElementById("ckey_skills").onclick(); void(0);';
						}
					}
					// select scan
					if (ischromeSTAT) {
						document.getElementById("100020").onclick();
					} else {
						location.href = 'javascript:document.getElementById("100020").onclick(); void(0);';
					}
					window.pressedScanbySTAT = true;
				} else {
					// close skill menu
					if (ischromeSTAT) {
						document.getElementById("ckey_skills").onclick();
					} else {
						location.href = 'javascript:document.getElementById("ckey_skills").onclick(); void(0);';
					}
					window.pressedScanbySTAT = false;
					window.pressedSkillbySTAT = 0;
				}
			}
		}
		if (_settings.isEnableSkillHotkey) {
			if (key === 107 || key === 187) {
				if (window.pressedSkillbySTAT === 0) {
					if (!window.pressedScanbySTAT) {
						// open skill menu
						if (ischromeSTAT) {
							document.getElementById("ckey_skills").onclick();
						} else {
							location.href = 'javascript:document.getElementById("ckey_skills").onclick(); void(0);';
						}
					}
					if (!cooldown[0]) {
						if (ischromeSTAT) {
							document.getElementById(skillnum[0]).onclick();
						} else {
							location.href = 'javascript:document.getElementById("' + skillnum[0] + '").onclick(); void(0);';
						}
						if (!cooldown[1]) {
							window.pressedSkillbySTAT = 1;
						} else if (!cooldown[2]) {
							window.pressedSkillbySTAT = 2;
						} else {
							window.pressedSkillbySTAT = 3;
						}
					} else if (!cooldown[1]) {
						if (ischromeSTAT) {
							document.getElementById(skillnum[1]).onclick();
						} else {
							location.href = 'javascript:document.getElementById("' + skillnum[1] + '").onclick(); void(0);';
						}
						if (!cooldown[2]) {
							window.pressedSkillbySTAT = 2;
						} else {
							window.pressedSkillbySTAT = 3;
						}
					} else if (!cooldown[2]) {
						if (ischromeSTAT) {
							document.getElementById(skillnum[2]).onclick();
						} else {
							location.href = 'javascript:document.getElementById("' + skillnum[2] + '").onclick(); void(0);';
						}
						window.pressedSkillbySTAT = 3;
					} else if (window.pressedScanbySTAT) {
						// close skill menu
						if (ischromeSTAT) {
							document.getElementById("ckey_skills").onclick();
						} else {
							location.href = 'javascript:document.getElementById("ckey_skills").onclick(); void(0);';
						}
						window.pressedScanbySTAT = false;
						window.pressedSkillbySTAT = 0;
					}
				} else if (window.pressedSkillbySTAT === 1) {
					if (!cooldown[1]) {
						if (ischromeSTAT) {
							document.getElementById(skillnum[1]).onclick();
						} else {
							location.href = 'javascript:document.getElementById("' + skillnum[1] + '").onclick(); void(0);';
						}
						if (!cooldown[2]) {
							window.pressedSkillbySTAT = 2;
						} else {
							window.pressedSkillbySTAT = 3;
						}
					} else if (!cooldown[2]) {
						if (ischromeSTAT) {
							document.getElementById(skillnum[2]).onclick();
						} else {
							location.href = 'javascript:document.getElementById("' + skillnum[2] + '").onclick(); void(0);';
						}
						window.pressedSkillbySTAT = 3;
					} else {
						window.pressedSkillbySTAT = 3;
					}
				} else if (window.pressedSkillbySTAT === 2) {
					if (!cooldown[2]) {
						if (ischromeSTAT) {
							document.getElementById(skillnum[2]).onclick();
						} else {
							location.href = 'javascript:document.getElementById("' + skillnum[2] + '").onclick(); void(0);';
						}
						window.pressedSkillbySTAT = 3;
					} else {
						window.pressedSkillbySTAT = 3;
					}
				} else if (window.pressedSkillbySTAT === 3) {
					// close skill menu
					if (ischromeSTAT) {
						document.getElementById("ckey_skills").onclick();
					} else {
						location.href = 'javascript:document.getElementById("ckey_skills").onclick(); void(0);';
					}
					window.pressedScanbySTAT = false;
					window.pressedSkillbySTAT = 0;
				}
			}
		}
	});
	while (num < mkeymax) {
		var monsterElementId = getMonsterElementId(mkeymax - num - 1);
		var u = $("#" + monsterElementId);
		var e = u.children().eq(2).children().eq(0);
		var dead = e.html().match(/bardead/i);
		if (!dead) {
			var top = u.offset().top;
			if (_settings.isShowScanButton) {
				var c = document.createElement("div");
				var d = "<span style='font-size:10px;font-weight:bold;font-family:arial,helvetica,sans-serif;text-align:center;vertical-align:text-top;cursor:default'>Scan</span>";
				c.setAttribute("id", "STATscan_" + String(n));
				c.setAttribute("style", "position:absolute;top:" + String(top) + "px;left:556px;background-color:#EFEEDC;width:25px;height:10px;border-style:double;border-width:2px;z-index:2;border-color:#555555;");
				c.setAttribute("onclick", 'document.getElementById("ckey_skills").onclick();document.getElementById("100020").onclick();document.getElementById("' + monsterElementId + '").onclick()');
				c.innerHTML = d;
				a.after(c);
			}
			if (_settings.isShowSkillButton) {
				for (var i = 0; i < 3; i++) {
					var cs = document.createElement("div");
					var tops = top + (i + 1) * 14;
					if (skillnum[i] !== null) {
						var ds = "<span style='font-size:10px;font-weight:bold;font-family:arial,helvetica,sans-serif;text-align:center;vertical-align:text-top;cursor:default'>" + skillname[i] + "</span>";
						cs.setAttribute("id", "STATskill_" + String(i + 1) + "_"+ String(n));
						var style = "position:absolute;top:" + String(tops) + "px;left:556px;background-color:#EFEEDC;width:25px;height:10px;border-style:double;border-width:2px;z-index:2;border-color:#555555;"
						if (cooldown[i]) {
							cs.setAttribute("style", style + "opacity:0.3;");
						} else {
							cs.setAttribute("style", style);
							cs.setAttribute("onclick", 'document.getElementById("ckey_skills").onclick();document.getElementById("' + skillnum[i] + '").onclick();document.getElementById("' + monsterElementId + '").onclick()');
						}
						cs.innerHTML = ds;
						a.after(cs);
					}
				}
			}
		}
		num++;
		n--;
	}
}
function MonsterPopup() {
	$('.btm1').unbind('mouseover');
	$('.btm1').unbind('mouseout');
	var n = 0;
	var id = 0;
	var num = _round.monsters.length;
	var c = document.getElementById("popup_box");
	var name = "";
	var maxhp = "";
	var currhp = "";
	var currmp = "";
	var currsp = "";
	var mclass = "";
	var mpl = "";
	var mweak = "";
	var mresist = "";
	var mimperv = "";
	var mskilltype = "";
	var mskillspell = "";
	var mattack = "";
	var datescan = 0;
	var mskilltype2 = "";
	var mskillspell2 = "";
	var mskilltype3 = "";
	var mskillspell3 = "";
	var mspirittype = "";
	var mspiritsksp = "";
	var delay = _settings.monsterPopupDelay;
	var delay2 = Math.floor(delay * 0.5);
	var placement = _settings.isMonsterPopupPlacement;
	var leftpixels = placement ? 955 : 300;
	var elemMonsterPane = $("#monsterpane");
	loadRoundObject();
	while (n < 10 && (_round.monsters[n] !== undefined)) {
		var q = _round.monsters[n];
		mskilltype = "";
		mskillspell = "";
		mattack = "";
		mskilltype2 = "";
		mskillspell2 = "";
		mskilltype3 = "";
		mskillspell3 = "";
		mspirittype = "";
		mspiritsksp = "";
		if (q.mweak !== undefined) mweak = MElemNum(q.mweak, 1);
		if (q.mresist !== undefined && q.mimperv !== undefined) {
			mresist = MElemNum(q.mresist, 1);
			mimperv = MElemNum(q.mimperv, 1);
		}
		if (q.mskillspell !== undefined) {
			mattack = MElemNum(q.mattack, 1);
			var sk = String(q.mskillspell);
			if (sk.length === 1 || sk.match("9")) {
				if (q.mskillspell < 3 || sk.match("9")) {
					mskilltype = MElemNum(q.mskilltype, 1);
					mskillspell = MElemNum(q.mskillspell, 1);
				} else {
					mspirittype = MElemNum(q.mskilltype, 1);
					mspiritsksp = MElemNum(q.mskillspell, 1);
					allm -= 7;
				}
			} else {
				var mskillspellarray = sk.split("0");
				var mskilltypearray = String(MElemNum(q.mskilltype, 1)).split(", ");
				var sk34 = sk.replace("0","").search(/(3|4)/);
				var other1 = 0;
				var other2 = 0;
				if (sk.length === 3) {
					if (sk34 >= 0) {
						other1 = sk34 > 0 ? 0 : 1;
						mspirittype = mskilltypearray[sk34];
						mspiritsksp = MElemNum(parseInt(mskillspellarray[sk34]), 1);
						mskillspell = MElemNum(parseInt(mskillspellarray[other1]), 1);
						mskilltype = mskilltypearray[other1];
					} else {
						mskillspell = MElemNum(parseInt(mskillspellarray[0]), 1);
						mskilltype = mskilltypearray[0];
						mskillspell2 = MElemNum(parseInt(mskillspellarray[1]), 1);
						mskilltype2 = mskilltypearray[1];
					}
				} else if (sk.length === 5) {
					if (sk34 >= 0) {
						other1 = sk34 > 0 ? 0 : 1;
						other2 = sk34 > 1 ? 1 : 2;
						mspirittype = mskilltypearray[sk34];
						mspiritsksp = MElemNum(parseInt(mskillspellarray[sk34]), 1);
						mskillspell = MElemNum(parseInt(mskillspellarray[other1]), 1);
						mskilltype = mskilltypearray[other1];
						mskillspell2 = MElemNum(parseInt(mskillspellarray[other2]), 1);
						mskilltype2 = mskilltypearray[other2];
					} else {
						mskillspell = MElemNum(parseInt(mskillspellarray[0]), 1);
						mskilltype = mskilltypearray[0];
						mskillspell2 = MElemNum(parseInt(mskillspellarray[1]), 1);
						mskilltype2 = mskilltypearray[1];
						mskillspell3 = MElemNum(parseInt(mskillspellarray[2]), 1);
						mskilltype3 = mskilltypearray[2];
					}
				}
			}
		}
		if (q.mskilltype === null ||q.mskilltype === 0 ||q.mskilltype === "0") mskilltype = "";
		if (q.mattack !== undefined) mattack = MElemNum(q.mattack, 1);
		var dst = new Date();
		var dst1 = 0;
		datescan = q.datescan;
		if (datescan === undefined || datescan === null || datescan === 0) {
			datescan = dst.getTime();
			dst1 = 1;
		}
		var k = dst.getTime();
		if (dst1 === 1) dst1 = "Never";
		else {
			dst.setTime(datescan);
			dst1 = dst.toLocaleString();
			if (browserIsChrome()) dst1 = dst.toLocaleDateString() + " " + dst.toLocaleTimeString();
		}
		var d = ((k - datescan) / (60 * 60 * 1000));
		var E = "";
		var v = (60 * d).toFixed();
		var K = Math.floor(v / (60 * 24));
		var M = v / (60 * 24);
		if (d < 1) {
			E = v + " mins";
			if (d === 0) E = "-";
		} else E = d < 24 ? Math.floor(v / 60) + " hours, " + (v % 60).toFixed() + " mins" : K + " days, " + Math.floor((v / 60) - (K * 24)) + " hours, " + (v % 60).toFixed() + " mins";
		mpl = q.mpl;
		if (mpl === undefined || mpl === null || mpl === 0 || mpl === "0") mpl = "";
		mclass = q.mclass;
		if (mclass !== undefined) mclass = MClassNum(mclass, 1);
		var monsterElementId = getMonsterElementId(num - 1);
		name = q.name;
		maxhp = q.maxHp;
		currhp = q.currHp;
		if (currhp === null || currhp === undefined || isNaN(currhp)) currhp = 0;
		currmp = (q.currmp * 100).toFixed(2);
		if (currmp === null || currmp === undefined || isNaN(currmp)) currmp = 0;
		currsp = (q.sp2 * 100).toFixed(2);

		function formatAttackType(s) {
			if (s === undefined) {
				return "undefined";
			} else if (typeof(s) === "number") {
				return s.toString();
			}
			f = s.replace(/Slash|Sl/g, "Slashing")
				.replace(/Crush|Cr/g, "Crushing")
				.replace(/Pierc|Pi/g, "Piercing")
				.replace(/Phys|Ph/ig, "Physical")
				.replace(/Mag|Ma/ig, "Magical")
				.replace("?", "Presumably: ")
				.replace("/", " or ");
			return f;
		}

		//alert("["+mweak+"]["+mresist+"]["+mskilltype+"]["+mskillspell+"]["+mskilltype2+"]["+mskillspell2+"]["+mskilltype3+"]["+mspirittype+"]["+mattack+"]");
		mweak = formatAttackType(mweak);
		mresist = formatAttackType(mresist);
		mskilltype = formatAttackType(mskilltype);
		mskillspell = formatAttackType(mskillspell);
		mskilltype2 = formatAttackType(mskilltype2);
		mskillspell2 = formatAttackType(mskillspell2);
		mskilltype3 = formatAttackType(mskilltype3);
		mskillspell3 = formatAttackType(mskillspell3);
		mspirittype = formatAttackType(mspirittype);
		if (mspiritsksp === undefined) {
			mspiritsksp = "?";
		} else {
			mspiritsksp = mspiritsksp.replace(/Spirit:/g, "");
			mspiritsksp = formatAttackType(mspiritsksp);
		}
		mattack = formatAttackType(mattack);
		$("#" + monsterElementId).bind('mouseover', {h:num, na:name, mhp:maxhp, chp:currhp, cmp:currmp, csp:currsp, cl:mclass, pl:mpl, at:mattack, sk:mskilltype, sksp:mskillspell, sk2:mskilltype2, sksp2:mskillspell2, sk3:mskilltype3, sksp3:mskillspell3,spty:mspirittype,spss:mspiritsksp, res:mresist, imp:mimperv, we:mweak, scd:dst1, scago:E}, function (r) {
			var popupHeight = 220;
			var popupTopOffset = elemMonsterPane.offset().top + (r.data.h - 1) * ((elemMonsterPane.height() - popupHeight) / 9);
			c.style.left = leftpixels + "px";
			setTimeoutByledalej1 = setTimeout('document.getElementById("popup_box").style.top = ' + popupTopOffset + ' + "px"', delay);
			c.style.width = "270px";
			c.style.height = String(popupHeight) + "px";
			var fi = "<table></table>";
			if (r.data.cl !== undefined && r.data.cl !== 0) {
				fi = '<table class="info_' + r.data.h + '" cellspacing="0" cellpadding="0" style="width:100%">'
					+ '<tr class="monname"><td colspan="2"><b>' + r.data.na + '</b></td></tr>'
					+ '<tr><td style="width:27%">Health: </td><td>' + r.data.chp + '/' + r.data.mhp + '</td></tr>'
					+ '<tr><td style="width:27%">Mana: </td><td>' + r.data.cmp + '%</td></tr>'
					+ '<tr><td style="width:27%">Spirit: </td><td>' + r.data.csp + '%</td></tr>'
					+ '<tr><td style="width:27%">Class:</td><td>' + r.data.cl + '</td></tr>'
					+ '<tr><td style="width:27%">Power level:</td><td>' + r.data.pl + '</td></tr>'
					+ '<tr><td style="width:27%">Attack:</td><td>' + r.data.at + '</td></tr>'
					+ '<tr><td style="width:27%">Skill:</td><td>' + r.data.sk + '-' + r.data.sksp + (r.data.sksp2 === "" ? "" :(' | ' + r.data.sk2 + '-' + r.data.sksp2)) + (r.data.sksp3 === "" ? "" :(' | ' + r.data.sk3 + '-' + r.data.sksp3)) + '</td></tr>'
					+ '<tr><td style="width:27%">Spirit attack:</td><td>' + (r.data.spss === "" ? "" :(r.data.spty + '-' + r.data.spss)) + '</td></tr>'
					+ '<tr><td style="width:25%">Weak to:</td><td>' + r.data.we + '</td></tr>'
					+ '<tr><td style="width:20%">Resistant to:</td><td>' + r.data.res + '</td></tr>'
					+ '<tr><td style="width:25%">Impervious to:</td><td>' + r.data.imp + '</td></tr>'
					+ '<tr><td style="width:27%">Last scan:</td><td>' + r.data.scd + '</td></tr>'
					+ '<tr><td></td><td>' + r.data.scago + ' ago</td></tr></table>';
			} else {
				fi = '<table class="info_' + r.data.h + '" cellspacing="0" cellpadding="0" style="width:100%">'
					+ '<tr class="monname"><td colspan="2"><b>' + r.data.na + '</b></td></tr>'
					+ '<tr><td style="width:27%">Health: </td><td>' + r.data.chp + '/' + r.data.mhp + '</td></tr>'
					+ '<tr><td style="width:27%">Mana: </td><td>' + r.data.cmp +  '%</td></tr>'
					+ '<tr><td style="width:27%">Spirit: </td><td>' + r.data.csp + '%</td></tr>'
					+ '<tr><td style="width:27%">Last scan:</td><td>' + r.data.scd + '</td></tr>';
			}
			setTimeoutByledalej2 = setTimeout("document.getElementById('popup_box').innerHTML='" + fi + "'", delay);
			setTimeoutByledalej3 = setTimeout('document.getElementById("popup_box").style.visibility="visible"', delay);
		});
		$("#" + monsterElementId).bind('mouseout', function () {
			setTimeout('document.getElementById("popup_box").style.visibility="hidden"', delay);
			clearTimeout(window.setTimeoutByledalej1);
			clearTimeout(window.setTimeoutByledalej2);
			clearTimeout(window.setTimeoutByledalej3);
		});
		n++;
		num--;
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
		var newOnClick = 'if(confirm("Are you sure you want to start this challenge on ' + diff + ' difficulty, with set number: ' + _charss.set; + '?\\n';
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
	$("div.btps > img").each(function () {
		var allinfo = $(this).attr("onmouseover")
			.replace("battle.set_infopane_effect(", "")
			.replace(")", "")
			.replace(/\'\,\s/g, '", ')
			.replace(/\'/g, "")
			.split('", ');
		var effectNames = [
			"Protection", "Hastened", "Shadow Veil", "Regen", "Absorbing Ward",
			"Spark of Life", "Channeling", "Arcane Focus", "Heartseeker", "Spirit Shield"
		];
		for (var n = 0; n < effectNames.length; n++) {
			if (_settings.isEffectsAlertSelf[n]
					&& allinfo[0].match(effectNames[n])
					&& allinfo[2] === _settings.EffectsAlertSelfRounds[n]) {
				var sec1 = TimeCounter(1);
				alert(allinfo[0] + " is expiring");
				_ltc.main[1] -= TimeCounter(0, sec1);
				_ltc.isbattle[1] -= TimeCounter(0, sec1);
			}
		}
	});
}
function AlertEffectsMonsters() {
	$("div.btm6 > img").each(function () {
		var allinfo = $(this).attr("onmouseover")
			.replace("battle.set_infopane_effect(", "")
			.replace(")", "")
			.replace(/\'\,\s/g, '", ')
			.replace(/\'/g, "")
			.split('", ');
		var effectNames = [
			"Spreading Poison", "Slowed", "Weakened", "Asleep", "Confused",
			"Imperiled", "Blinded", "Silenced", "Nerfed", "Magically Snared",
			"Lifestream", "Coalesced Mana"
		];
		for (var n = 0; n < effectNames.length; n++) {
			if (_settings.isEffectsAlertMonsters[n]
					&& allinfo[0].match(effectNames[n])
					&& allinfo[2] === _settings.EffectsAlertMonstersRounds[n]) {
				var monnum = $(this).parent().parent().attr("id").replace("mkey_", "");
				var sec1 = TimeCounter(1);
				alert(allinfo[0] + '\n on monster number "' + monnum + '" is expiring');
				_ltc.main[1] -= TimeCounter(0, sec1);
				_ltc.isbattle[1] -= TimeCounter(0, sec1);
			}
		}
	});
}
function CheckForAction() {
	$("#ckey_defend, #ckey_focus, .btm1, .btsd, .btii, .btqss, .btqi2").each(function (j) {
		var onclickadded = $(this).attr("onclick");
		if (onclickadded !== null) $(this).attr("onclick", "var data = [0, 0]; data[0] = 1; var dtm = new Date(); var b = dtm.getTime(); data[1] = b; if (typeof(GM_deleteValue) !== 'undefined') {GM_setValue('PLTC',JSON.stringify(data));} else {localStorage.setItem('PLTC',JSON.stringify(data));}" + onclickadded + ";");
	});
}
function TaggingItems(clean) {
	loadTagsObject();
	var taID = null;
	var taTAG = null;
	var taTYPE = null;
	var OneHandedTAGsArray = [];
	var OneHandedIDsArray = [];
	var TwoHandedTAGsArray = [];
	var TwoHandedIDsArray = [];
	var StaffsTAGsArray = [];
	var StaffsIDsArray = [];
	var ShieldTAGsArray = [];
	var ShieldIDsArray = [];
	var ClothTAGsArray = [];
	var ClothIDsArray = [];
	var LightTAGsArray = [];
	var LightIDsArray = [];
	var HeavyTAGsArray = [];
	var HeavyIDsArray = [];
	$("#inv_equip div.eqpp, #inv_equip div.eqp, #item_pane div.eqp, #item_pane div.eqpp, #equip div.eqp, #equip div.eqpp, #equip_pane div.eqp, #equip_pane div.eqpp").each(function() {
		var g = $(this);
		var itemstype = String(String(g.children().filter(".eqdp").attr("onmouseover")).match(/Level \d+ (One-handed Weapon|Two-handed Weapon|Staff|Shield|Cloth Armor|Light Armor|Heavy Armor)/i)[0]).replace(/Level \d+ /i,"").replace(/ (Weapon|Armor)/i,"");
		var id = parseInt(String(g.children().filter(".eqdp").attr("id")).replace("item_pane",""));
		var n = 0;
		var tag = "_new";
		if (itemstype.match(/One-Handed/i)) {
			n = jQuery.inArray(id, _tags.OneHandedIDs);
			tag = _tags.OneHandedTAGs[n];
			if (clean > 0 && tag !== undefined) {
				OneHandedTAGsArray.push(tag);
				OneHandedIDsArray.push(id);
			}
			taTYPE = 0;
			if (n < 0) n = parseInt(_tags.OneHandedTAGs.length) + 1;
		} else if (itemstype.match(/Two-Handed/i)) {
			n = jQuery.inArray(id, _tags.TwoHandedIDs);
			tag = _tags.TwoHandedTAGs[n];
			if (clean > 0 && tag !== undefined) {
				TwoHandedTAGsArray.push(tag);
				TwoHandedIDsArray.push(id);
			}
			taTYPE = 1;
			if (n < 0) n = parseInt(_tags.TwoHandedTAGs.length) + 1;
		} else if (itemstype.match(/Staff/i)) {
			n = jQuery.inArray(id, _tags.StaffsIDs);
			tag = _tags.StaffsTAGs[n];
			if (clean > 0 && tag !== undefined) {
				StaffsTAGsArray.push(tag);
				StaffsIDsArray.push(id);
			}
			taTYPE = 2;
			if (n < 0) n = parseInt(_tags.StaffsTAGs.length) + 1;
		} else if (itemstype.match(/Shield/i)) {
			n = jQuery.inArray(id, _tags.ShieldIDs);
			tag = _tags.ShieldTAGs[n];
			if (clean > 0 && tag !== undefined) {
				ShieldTAGsArray.push(tag);
				ShieldIDsArray.push(id);
			}
			taTYPE = 3;
			if (n < 0) n = parseInt(_tags.ShieldTAGs.length) + 1;
		} else if (itemstype.match(/Cloth/i)) {
			n = jQuery.inArray(id, _tags.ClothIDs);
			tag = _tags.ClothTAGs[n];
			if (clean > 0 && tag !== undefined) {
				ClothTAGsArray.push(tag);
				ClothIDsArray.push(id);
			}
			taTYPE = 4;
			if (n < 0) n = parseInt(_tags.ClothTAGs.length) + 1;
		} else if (itemstype.match(/Light/i)) {
			n = jQuery.inArray(id, _tags.LightIDs);
			tag = _tags.LightTAGs[n];
			if (clean > 0 && tag !== undefined) {
				LightTAGsArray.push(tag);
				LightIDsArray.push(id);
			}
			taTYPE = 5;
			if (n < 0) n = parseInt(_tags.LightTAGs.length) + 1;
		} else if (itemstype.match(/Heavy/i)) {
			n = jQuery.inArray(id, _tags.HeavyIDs);
			tag = _tags.HeavyTAGs[n];
			if (clean > 0 && tag !== undefined) {
				HeavyTAGsArray.push(tag);
				HeavyIDsArray.push(id);
			}
			taTYPE = 6;
			if (n < 0) n = parseInt(_tags.HeavyTAGs.length) + 1;
		}
		if (tag === undefined) tag = "_new";
		var tagid = "tagid_" + String(id);
		var tagbox = $("#leftpane input.ByledalejTag[name=tagid_"+id+"]");
		var exist = tagbox.length;
		if (exist > 0) {
			tagbox.attr("alt", n);
			tagbox.attr("value", tag);
		} else {
			var a = "<div style='font-size:10px;font-weight:bold;font-family:arial,helvetica,sans-serif;text-align:right;width:60px; height:18px; position:absolute; top:1px;left:330px'><input type='text' class='ByledalejTag' name='tagid_"+id+"'  alt='"+n+"' size='4' maxLength='4' value='"+tag+"' /></div>";
			g.children().eq(1).after(a);
		}
		$("input.ByledalejTag[name=tagid_"+id+"]").unbind().bind("change", {y:taTYPE, x:tagid}, saveTags);
	});
	var cleaned = 0;
	if (clean > 0 && OneHandedTAGsArray.length < _tags.OneHandedTAGs.length) {
		_tags.OneHandedTAGs = OneHandedTAGsArray;
		_tags.OneHandedIDs = OneHandedIDsArray;
		cleaned++;
	}
	if (clean > 0 && TwoHandedTAGsArray.length < _tags.TwoHandedTAGs.length) {
		_tags.TwoHandedTAGs = TwoHandedTAGsArray;
		_tags.TwoHandedIDs = TwoHandedIDsArray;
		cleaned++;
	}
	if (clean > 0 && StaffsTAGsArray.length < _tags.StaffsTAGs.length) {
		_tags.StaffsTAGs = StaffsTAGsArray;
		_tags.StaffsIDs = StaffsIDsArray;
		cleaned++;
	}
	if (clean > 0 && ShieldTAGsArray.length < _tags.ShieldTAGs.length) {
		_tags.ShieldTAGs = ShieldTAGsArray;
		_tags.ShieldIDs = ShieldIDsArray;
		cleaned++;
	}
	if (clean > 0 && ClothTAGsArray.length < _tags.ClothTAGs.length) {
		_tags.ClothTAGs = ClothTAGsArray;
		_tags.ClothIDs = ClothIDsArray;
		cleaned++;
	}
	if (clean > 0 && LightTAGsArray.length < _tags.LightTAGs.length) {
		_tags.LightTAGs = LightTAGsArray;
		_tags.LightIDs = LightIDsArray;
		cleaned++;
	}
	if (clean > 0 && HeavyTAGsArray.length < _tags.HeavyTAGs.length) {
		_tags.HeavyTAGs = HeavyTAGsArray;
		_tags.HeavyIDs = HeavyIDsArray;
		cleaned++;
	}
	if (cleaned > 0) {
		_tags.save();
		TaggingItems();
	}
}
function saveTags(z) {
	var taID = null;
	var taTAG = null;
	z.data.y = parseInt(z.data.y);
	var h = $("input.ByledalejTag[name='"+z.data.x+"']");
	var nn = parseInt(h.attr("alt"));
	if (z.data.y === 0) {
		_tags.OneHandedIDs[nn] = parseInt(String(h.attr("name")).replace("tagid_",""));
		_tags.OneHandedTAGs[nn] = h.attr("value");
	} else if (z.data.y === 1) {
		_tags.TwoHandedIDs[nn] = parseInt(String(h.attr("name")).replace("tagid_",""));
		_tags.TwoHandedTAGs[nn] = h.attr("value");
	} else if (z.data.y === 2) {
		_tags.StaffsIDs[nn] = parseInt(String(h.attr("name")).replace("tagid_",""));
		_tags.StaffsTAGs[nn] = h.attr("value");
	} else if (z.data.y === 3) {
		_tags.ShieldIDs[nn] = parseInt(String(h.attr("name")).replace("tagid_",""));
		_tags.ShieldTAGs[nn] = h.attr("value");
	} else if (z.data.y === 4) {
		_tags.ClothIDs[nn] = parseInt(String(h.attr("name")).replace("tagid_",""));
		_tags.ClothTAGs[nn] = h.attr("value");
	} else if (z.data.y === 5) {
		_tags.LightIDs[nn] = parseInt(String(h.attr("name")).replace("tagid_",""));
		_tags.LightTAGs[nn] = h.attr("value");
	} else if (z.data.y === 6) {
		_tags.HeavyIDs[nn] = parseInt(String(h.attr("name")).replace("tagid_",""));
		_tags.HeavyTAGs[nn] = h.attr("value");
	}
	_tags.save();
	TaggingItems();
}
function ShrineButton() {
	$("#item_pane.cspp div[id$=item_pane]").each(function() {
		$(this).bind("click");
	});
}
function main3 () {
	if (isBattle()) {
		if (_settings.isCountPageLoadTime) {
			var clickedLTC = localStorage.getItem('PLTC');
			if (clickedLTC !== null) {
				if (clickedLTC[1] === 1) {
					localStorage.removeItem('PLTC');
					_ltc.pageLoad[0] = 1;
					var treadyload = (TimeCounter(0, clickedLTC.slice(3, 16)) - TimeCounter(0, millisecondsAll));
					if (treadyload < 3000) {
						_ltc.pageLoad[2]++;
						_ltc.pageLoad[3] += treadyload;
					}
					var d45 = new Date();
					d45.setTime(clickedLTC.slice(3, 16));
					var ltchour = d45.getHours();
					var n11 = 1;
					while (n11 < 9) {
						if (ltchour < (n11 * 3)) {
							if (treadyload < 3000) {
								_ltc.pageLoad[2 + (n11 * 2)]++;
								_ltc.pageLoad[3 + (n11 * 2)] += treadyload;
							}
							break;
						}
						n11++;
					}
				}
			}
			CheckForAction();
		}
		_ltc.isbattle[0]++;
		_ltc.isbattle[1] += TimeCounter(0, millisecondsAll);
	} else {
		if (isEquipmentInventoryPage() && _settings.isShowTags[0]) {
			var t47 = TimeCounter(1);
			TaggingItems(0);
			_ltc.taggingitems[0]++;
			_ltc.taggingitems[1] += TimeCounter(0, t47);
		}
		if (isAllInventoryPage() && _settings.isShowTags[5]) {
			var t47 = TimeCounter(1);
			TaggingItems(1);
			_ltc.taggingitems[0]++;
			_ltc.taggingitems[1] += TimeCounter(0, t47);
		}
		if (isShopPage() && _settings.isShowTags[1]) {
			var t48 = TimeCounter(1);
			TaggingItems(0);
			_ltc.taggingitems[0]++;
			_ltc.taggingitems[1] += TimeCounter(0, t48);
		}
		if (isItemWorldPage() && _settings.isShowTags[2]) {
			var t49 = TimeCounter(1);
			TaggingItems(0);
			_ltc.taggingitems[0]++;
			_ltc.taggingitems[1] += TimeCounter(0, t49);
		}
		if (isMoogleWrite() && _settings.isShowTags[3]) {
			var t50 = TimeCounter(1);
			$("#mailform #leftpane").children().eq(3).children().eq(1).click(TaggingItems);
			_ltc.taggingitems[0]++;
			_ltc.taggingitems[1] += TimeCounter(0, t50);
		}
		if (isForgePage() && _settings.isShowTags[4]) {
			var t51 = TimeCounter(1);
			TaggingItems(0);
			_ltc.taggingitems[0]++;
			_ltc.taggingitems[1] += TimeCounter(0, t51);
		}
		if (_settings.isRememberSkillsTypes) {
			loadCollectdataObject();
			if (_collectdata.skillmid.length > 3) {
				SaveToDatabase(2);
			}
		}
		if ((_settings.isStartAlert || _settings.isShowEquippedSet) && !isHVFontEngine()) {
			var t52 = TimeCounter(1);
			FindSettingsStats();
			_ltc.startalerts[0]++;
			_ltc.startalerts[1] += TimeCounter(0, t52);
		}
		if (_settings.isStartAlert && !isHVFontEngine()) {
			var t53 = TimeCounter(1);
			StartBattleAlerts();
			_ltc.startalerts[0]++;
			_ltc.startalerts[1] += TimeCounter(0, t53);
		}
	}
	if (!isHVFontEngine() && _settings.isShowEquippedSet) {
		var t54 = TimeCounter(1);
		SetDisplay();
		_ltc.showset[0]++;
		_ltc.showset[1] += TimeCounter(0, t54);
	}
	_ltc.main[0]++;
	_ltc.main[1] += TimeCounter(0, millisecondsAll);
	_ltc.save();
}
function getMonsterElementId(n) {
	var ids = [
		"mkey_1", "mkey_2", "mkey_3", "mkey_4", "mkey_5",
		"mkey_6", "mkey_7", "mkey_8", "mkey_9", "mkey_0"
	];
	if (!(0 <= n && n <= 9)) throw new Error("n must be 0 to 9");
	return ids[n];
}

//=== Event Listeners
// beforeload triggers each time an external resource is loaded like images.
// DOMContentLoaded triggers when the DOM has finished loading.
// DON'T rely on the order of their execution.
//===================
if (browserIsChrome()){
	document.addEventListener( "DOMContentLoaded", evDomLoad, false );
	document.addEventListener( "beforeload", evResLoad, true );
} else evDomLoad();