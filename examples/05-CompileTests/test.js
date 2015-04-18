$(document).ready(function ()
{

var $tmp = $("#tmp");
var doingFocus;
var requestFocus;
var focusCounter = 0;

var library =
{
	nodes : nodes,
	functions : functions,
	actions : actions
};

$.get("test2.nodes", function( text ) {
	setLodash(_);
	setEngineLodash(_);

	var codeGraph = codeToGraph(text, library, parser);
	var src = compileGraph(codeGraph, library);

	$tmp.append("<div id=\"test\"></div>");
	var $test = $("#test");

	$.globalEval(src)

	tick();

	function appendText(txt)
	{
		$tmp.append("<div>" + txt + "</div>");
	}

	appendText(ui.get().children[0].children[2].x);
	// appendText(ui.get().children[0].children[2].x);
}
, "text" // Commenter pour lire du json
);

})