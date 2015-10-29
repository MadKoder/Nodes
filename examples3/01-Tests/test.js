$(document).ready(function ()
{

var $tmp = $("#tmp");

var library =
{
	nodes : {},
	functions : functions,
	actions : actions,
	classes : {},
	types : {},
	attribs : {}
};

var fileName = "test.nodes";
var fileName = "events.nodes";
// var fileName = "objects.nodes";
// var fileName = "generics.nodes";
$.get(fileName, function( text ) {
	// setLodash(_);
	setEngineLodash(_);

	var codeGraph = codeToGraph(text, library, parser);
	// var src = compileGraph(codeGraph, library);
	var prog = compileGraph(codeGraph, library);
	var src = escodegen.generate(prog);

	$tmp.append("<div id=\"test\"></div>");
	var $test = $("#test");

	$.globalEval(src)

	function appendText(txt) {
		$tmp.append("<div>" + txt + "</div>");
	}

	if(fileName == "test.nodes") {
		tick(10, 5);
		appendText(x.get());
		appendText(y);
		appendText(z);
		appendText(t.get());
		appendText(b);
		appendText([v.get().x, v.get().y].join(", "));
		appendText([w.x, w.y].join(", "));
	} else if(fileName == "generics.nodes") {
		appendText([v.get().x, v.get().y].join(", "));
	} else if(fileName == "events.nodes") {
		tick();
		appendText(y);
		appendText(z.get());
	} else if(fileName == "objects.nodes") {
		tick();
		appendText([v.x, v.y].join(", "));
		appendText([r.pos.x, r.pos.y].join(", "));
		appendText(x.get());
	}
}
, "text" // Commenter pour lire du json
);

})