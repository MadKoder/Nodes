$(document).ready(function ()
{

var $tmp = $("#tmp");

var library =
{
	nodes : nodes,
	functions : functions,
	actions : actions
};

$.get("validation.nodes", function( text ) {
	setLodash(_);
	setEngineLodash(_);

	var codeGraph = codeToGraph(text, library, parser);
	var src = compileGraph(codeGraph, library);


	$.globalEval(src)

	tick();

	// $tmp.append("<div id=\"aa\"></div>");
	// $("#aa").html(aa.get().join());

	function appendText(txt)
	{
		$tmp.append("<div>" + txt + "</div>");
	}
	function valid(a, b, testName)
	{
		if(a === b)
		{
			$tmp.append("<div> " + testName + " OK </div>");
		}
		else
		{
			$tmp.append("<div> " + testName + " Nope !!!!!!!!! </div>");
		}
	}
	function eqArray(a0, a1)
	{
	    // if the other array is a falsy value, return
	    if(!a0 || !a1)
	        return false;

	    // compare lengths - can save a lot of time 
	    if (a0.length != a1.length)
	        return false;

	    for (var i = 0, l=a0.length; i < l; i++) {
	        // Check if we have nested arrays
	        if (a0[i] instanceof Array && a1[i] instanceof Array) {
	            // recurse into the nested as
	            if (!eqArray(a0[i], a1[i]))
	                return false;       
	        }           
	        else if (a0[i] != a1[i]) { 
	            // Warning - two different object instances will never be equal: {x:20} != {x:20}
	            return false;   
	        }           
	    }       
	    return true;
	}
	function validArray(a, b, testName)
	{
		if(eqArray(a, b))
		{
			$tmp.append("<div> " + testName + " OK </div>");
		}
		else
		{
			$tmp.append("<div> " + testName + " Nope !!!!!!!!! </div>");
		}
	}

	validArray(intList.get(), [3, 4, 5], "int list");
	valid(monsterListDef.get()[1].pos.y, 10, "Monster list def");
	valid(monsterListVar.get()[1].pos.y, 2, "Monster list var");
	valid(x.get(), 6, "var");
	valid(dAccessJust.get(), 2, "Dict access Just");
	valid(dAccessNone.get(), 0, "Dict access None");

	appendText(intList.get());
	appendText(monsterListDef.get()[1].pos.y);
	appendText(monsterListVar.get()[1].pos.y);
	appendText(x.get());
	appendText(dAccessJust.get());
	appendText(dAccessNone.get());


	// $tmp.append("<div id=\"d\"></div>");
	// $("#aa").html(aa.get().join());
}
, "text" // Commenter pour lire du json
);

})