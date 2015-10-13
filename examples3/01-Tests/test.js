$(document).ready(function ()
{

var $tmp = $("#tmp");

var library =
{
	nodes : {},
	functions : functions,
	actions : actions,
	types : {}
};

$.get("test.nodes", function( text ) {
	// setLodash(_);
	setEngineLodash(_);

	var codeGraph = codeToGraph(text, library, parser);
	// var src = compileGraph(codeGraph, library);
	var prog = compileGraph(codeGraph, library);
	var src = escodegen.generate(prog);

	$tmp.append("<div id=\"test\"></div>");
	var $test = $("#test");

	$.globalEval(src)

	// tick();

	function appendText(txt)
	{
		$tmp.append("<div>" + txt + "</div>");
	}

	tick(10, 5);
	appendText(x());
	appendText(y);
	appendText(z);
	appendText(t());
	appendText([v().x, v().y].join(", "));
}
, "text" // Commenter pour lire du json
);

})