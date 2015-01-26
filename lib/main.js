var pageMod = require("sdk/page-mod");
var data = require("sdk/self").data;

pageMod.PageMod({
  include: [
    "http://hentaiverse.org*",
    "http://alt.hentaiverse.org*",
  ],
  exclude: [
    "http://hentaiverse.org/pages/showequip*",
    "http://alt.hentaiverse.org/pages/showequip*",
    "http://hentaiverse.org/?login*",
    "http://alt.hentaiverse.org/?login*",
  ],
  contentScriptWhen: "start",
  contentScriptFile: [
    data.url("scripts/util.js"),
    data.url("scripts/browser.js"),
    data.url("scripts/hv.js"),
    data.url("hvstat.user.js"),
  ],
  contentScriptOptions: {
    relPath: data.url(""),
    "hvstat-ui.js": data.load("scripts/hvstat-ui.js"),
    "hvstat-injection.js": data.load("scripts/hvstat-injection.js"),
    "hvstat-migration.js": data.load("scripts/hvstat-migration.js"),
    "jquery-1.8.3.min.js": data.load("scripts/jquery-1.8.3.min.js"),
    "hvstat-noncombat.js": data.load("scripts/hvstat-noncombat.js"),
    "jquery-ui-1.9.2.custom.min.js": data.load("scripts/jquery-ui-1.9.2.custom.min.js"),
    "hvstat.css": data.load("css/hvstat.css"),
    "hvstat-ui.css": data.load("css/hvstat-ui.css"),
    "hide-logo.css": data.load("css/hide-logo.css"),
    "battle-log-type0.css": data.load("css/battle-log-type0.css"),
    "battle-log-type1.css": data.load("css/battle-log-type1.css"),
    "jquery-ui-1.9.2.custom.min.css": data.load("css/jquery-ui-1.9.2.custom.min.css"),
    "main.html": data.load("html/main.html"),
    "drops-pane.html": data.load("html/drops-pane.html"),
    "shrine-pane.html": data.load("html/shrine-pane.html"),
    "database-pane.html": data.load("html/database-pane.html"),
    "monster-popup.html": data.load("html/monster-popup.html"),
    "overview-pane.html": data.load("html/overview-pane.html"),
    "settings-pane.html": data.load("html/settings-pane.html"),
    "proficiency-table.html": data.load("html/proficiency-table.html"),
    "battle-stats-pane.html": data.load("html/battle-stats-pane.html"),
    "drops-display-table.json": data.load("json/drops-display-table.json"),
  },
});