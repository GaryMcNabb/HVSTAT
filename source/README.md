HVSTAT DEV NOTES
================
Optimization Hints
------------------
In things like for loops, ALWAYS put var infront of the variable.
- Example: for(var i=0;i<10;i++){};
- Performance: Great;

Always use === instead of ==. If the types being compared are the same, both will return true at the same time.
- Fast: if(0 === "0") //returns false;
- Slow: if(0 == "0") //returns true; Converts the type of "0" for the test(SLOW);
- Performance: Great if types are different;

regex.test(string) is faster than string.match(regex).
- Fast: /^http:\/\//.test(string);
- Slow: string.match(/^http:\/\//);
- Performance: Okay.

Release Info
------------
- For Chrome, name the crx "HVS_CHROME_[VERSION].crx"
- For Firefox, name main.js "HVS_FIREFOX_[VERSION].user.js"

Firefox users DON'T need jquery.min.js, jqueryui.css or jquery-ui.min.js.

No one needs the privatekey (pem file) except developers.