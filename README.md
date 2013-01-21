HVSTAT DEV NOTES
================
General programming remarks
---------------------------
Always use easy to understand variable names.
Always put var in front of a newly declared variable, to avoid scope issues.

Optimization Hints
------------------
Try to put all variable declarations at the start of the function (not strictly required).

Write efficient loops:
- Original loop: for (var i = 0; i < 10; i++) {}
- Efficient loop: var i = 10; while (i--) {}
- Performance: Great;

Always use === instead of ==. If the types being compared are the same, both will return true at the same time.
- Fast: if (0 === "0") //returns false;
- Slow: if (0 == "0") //returns true; Converts the type of "0" for the test(SLOW);
- Performance: Great if types are different;

regex.test(string) is faster than string.match(regex).
- Fast: /^http:\/\//.test(string);
- Slow: string.match(/^http:\/\//);
- Performance: Okay.

Don't use regex if possible. It can be extremely slow.

jQuery and jQuery UI must not be used except on the dialog panel for performance reason.

Release Info
------------
- For Chrome, name the crx "hvstat-[VERSION].crx"
- For Firefox, name zipped package "hvstat-[VERSION].zip"

No one needs the privatekey (pem file) except developers.
