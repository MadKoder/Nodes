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



// $.get("test.nodes", function( text ) {
$.get("arcaNodes.nodes", function( text ) {
	setLodash(_);
	setEngineLodash(_);

	var codeGraph = codeToGraph(text, library, parser);
	var src = compileGraph(codeGraph, library);

	$tmp.append("<div id=\"test\"></div>");
	var $test = $("#test");
	$.globalEval(src)
	// eval(src);
	// $("#test").html(code.a.get());
	tick();
	// $test.html(va.get()[0].x + " " + va.get()[1].y);
}
, "text" // Commenter pour lire du json
);

})