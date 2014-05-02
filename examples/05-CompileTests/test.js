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

function hit(vec)
{
	var hitResult = project.hitTest(new Point(vec.x, vec.y));
					
	if (!hitResult)
		return -1;

	return hitResult.item.data;
}

localFunctions =
{
	"hit" : mf1
	(
		function(vec)
		{
			return "hit(" + vec + ")";
		},
		inOut1("Vec2", "int")
	)
}

_.merge(functions, localFunctions);
_.merge(nodes, localFunctions, function(node, func){return funcToNodeSpec(func);});


$.get("test3.nodes", function( text ) {
// $.get("arcaNodes.nodes", function( text ) {
// $.get("treeEdit.nodes", function( text ) {
// $.get("editor.nodes", function( text ) {
	setLodash(_);
	setEngineLodash(_);

	var codeGraph = codeToGraph(text, library, parser);
	var src = compileGraph(codeGraph, library);

	$tmp.append("<div id=\"test\"></div>");
	var $test = $("#test");

	$.globalEval(src)
	// eval(src);
	// $("#test").html(code.a.get());
	// tick();
	tick();
	$test.html(v2.get()[0]);
	// $test.html(t.get());
}
, "text" // Commenter pour lire du json
);

})