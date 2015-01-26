HVSTAT DEV NOTES
================
General programming remarks
---------------------------
Always use easy to understand variable names.
Always put var in front of a newly declared variable, to avoid scope issues.

Optimization Hints
------------------
Try to put all variable declarations at the start of the function (not strictly required).
Don't use regex if possible. It can be extremely slow.
jQuery and jQuery UI must not be used except on the dialog panel for performance reason.

Version Locations
-----------------
package.json - Firefox Manifest
data/manifest.json - Chrome/Opera Manifest
data/hvstat.user.js - Ln 69 (First line of 'var hvStat')

Release Info
------------
- For Opera, name the crx "hvstat\_opera\_[VERSION].nex"
- For Chrome, name the crx "hvstat\_chrome\_[VERSION].crx"
- For Firefox, name zipped package "hvstat\_firefox\_[VERSION].xpi"

No one needs the privatekey (pem file) except developers.
