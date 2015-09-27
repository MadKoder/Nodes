$(document).ready(function ()
{

var $tmp = $("#tmp");

var library =
{
	nodes : nodes,
	functions : functions,
	actions : actions
};

$.get("test.nodes", function( text ) {
	// setLodash(_);
	setEngineLodash(_);

	var codeGraph = codeToGraph(text, library, parser);
	var src = compileGraph(codeGraph, library);

	$tmp.append("<div id=\"test\"></div>");
	var $test = $("#test");

	$.globalEval(src)

	// tick();

	function appendText(txt)
	{
		$tmp.append("<div>" + txt + "</div>");
	}

	// appendText(genericOutputTest.get());
	appendText(x.get());
}
, "text" // Commenter pour lire du json
);

})