$(document).ready(function ()
{


var code;
var uiIndex = 0;

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

$.get("testModelView2.nodes", function( text ) {
	setLodash(_);
	setEngineLodash(_);

	var codeGraph = codeToGraph(text, library, parser);
	var src = compileGraph(codeGraph, library);

	$tmp.append("<div id=\"test\"></div>");
	var $test = $("#test");

	$.globalEval(src);

	l.addListView(v0);

	tick();
	$test.html(v0.get().join());
}
, "text" // Commenter pour lire du json
);

})