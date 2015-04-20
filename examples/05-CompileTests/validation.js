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
	testAction();

	// $tmp.append("<div id=\"aa\"></div>");
	// $("#aa").html(aa.get().join());

	function appendText(txt)
	{
		$tmp.append("<div>" + txt + "</div>");
	}
	validated = true;
	function valid(a, b, testName)
	{
		if(a === b)
		{
			$tmp.append("<div> " + testName + " OK </div>");
		}
		else
		{
			$tmp.append("<div> " + testName + " Nope !!!!!!!!! </div>");
			validated = false;
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
			validated = false;
		}
	}

	valid(clonerTest.get(), 2, "Cloner");
	valid(ifAction.get(), false, "If action");
	valid(whileAction.get(), 10, "While action");
	valid(eventTest.get(), 3, "Event");
	valid(eventDefTestResult.get(), 1, "Event def");
	valid(matchTest.get(), true, "Match");
	valid(reduceTest.get(), 3, "Reduce");
	validArray(rangeTest.get(), [0, 1], "Range");
	valid(matchActionTest.get(), 10, "Match action");
	validArray(mapTemplateTest.get(), [[1], [3]], "Map template");
	validArray(templateOfTemplateTest.get(), [[1, 2], [3, 4]], "Template of template");
	validArray(multiComprehension.get(), [[3], [6]], "Multi comprehension");
	validArray(filteredList.get(), [1, 2], "Filtered list");
	validArray(intList.get(), [3, 4, 5], "int list");
	valid(monsterListDef.get()[1].pos.y, 10, "Monster list def");
	valid(monsterListVar.get()[1].pos.y, 2, "Monster list var");
	valid(listAccess.get().pos.y, 10, "List access");
	valid(x.get(), 6, "var");
	valid(dAccessJust.get(), 2, "Dict access Just");
	valid(dAccessNone.get(), 0, "Dict access None");

	valid(ui.get().children[0].children[2].x, 20, "Recursive signal and ref mutation");
	valid(uiVar.get().children[0].children[2].x, 200, "Recursive signal listening");
	valid(ifExpr.get(), 10, "If expression");
	validArray(mapLambda.get(), [13, 14, 15], "Map lambda");
	valid(updatedAndMergedList.get()[1].x, 21, "updatedAndMergedList 1"); // if condition true
	valid(updatedAndMergedList.get()[0].x, 0, "updatedAndMergedList 2"); // if condition false
	valid(forEachList.get()[1].x, 3, "For each"); // if condition false
	valid(structAcessTest.get().size.x, 12, "Struct access");

	$("#validated").append("<div>" + (validated ? "OK" : "Nope !!!!!!!!!!") + "</div>");
		// valid(ui.get().children[2].x, 10, "Recursive signal and ref mutation");

	//appendText(ui.get().children[0].children[2].x);
	// appendText(intList.get());
	// appendText(monsterListDef.get()[1].pos.y);
	// appendText(monsterListVar.get()[1].pos.y);
	// appendText(x.get());
	// appendText(dAccessJust.get());
	// appendText(dAccessNone.get());
	// appendText(listAccess.get().pos.y);



	// $tmp.append("<div id=\"d\"></div>");
	// $("#aa").html(aa.get().join());
}
, "text" // Commenter pour lire du json
);

})