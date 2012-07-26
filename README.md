HVSTAT DEV NOTES
================
Optimization Hints
------------------
In things like for loops, ALWAYS put var infront of the variable.
	Example: for(var i=0;i<10;i++){};
	Performance: Great;
Always use === instead of ==. If the types being compared are the same, both will return true at the same time.
	Example:	if(0 === "0") //returns false; 
			if(0 == "0") //returns true; Converts the type of "0" for the test(SLOW);
	Performance: Great if types are different;
regex.test(string) is faster than string.match(regex).
	Example:	string.match(/^http:\/\//); //Slower
    			/^http:\/\//.test(string); //Faster
	Performance: Okay.

Release Info
------------
For Chrome, name the crx "HVS_CHROME.crx"
For Firefox, name the user.js "HVS_FIREFOX.user.js"

The zip containing the release should look like this:
[HVSTAT-5.2.2.zip]
- HVS_CHROME.crx
- HVS_FIREFOX.user.js
[/zip]

Firefox users DON'T need jquery.min.js, jqueryui.css or jquery-ui.min.js.
No one needs the privatekey (pem file) except developers.