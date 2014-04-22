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


$.get("test.nodes", function( text ) {
// $.get("arcaNodes.nodes", function( text ) {
// $.get("treeEdit.nodes", function( text ) {
// $.get("editor.nodes", function( text ) {
	setLodash(_);
	setEngineLodash(_);

	var codeGraph = codeToGraph(text, library, parser);
	var src = compileGraph(codeGraph, library);

	$tmp.append("<div id=\"test\"></div>");
	var $test = $("#test");

	var float = {};
var int = {};
var string = {};
var Vec2 = {params : ["x", "y"],
click : function(self, what){
self.get().click(what);
},
inc : function(self, delta){
var __v0 = new Store("tata", string);
Vec2.click(self, __v0);

},
};
var sa = new Store(["a", "b", "c"], {base : "list",params : ["string"]});
var t = new Store("tutu", "string");
var arrays0 = [sa, ];
var aa0_0 = new ArrayAccess(arrays0[0], {base : "list",params : ["string"]});
var index0_0 = new FuncInput(int);
var inputs0 = [aa0_0, ];
var indices0 = [index0_0, ];
var comp0 = new __Obj(Vec2, [index0_0, index0_0], "Vec2", {
click : function(what){var __v1 = (new Cloner(what)).get();
aa0_0.set(__v1);
}});
var va = new Store((new Comprehension(comp0 , inputs0, indices0, arrays0, false, undefined)).get(), {base : "list",params : ["Vec2"]});
function tick(){
it0 = new ArrayAccess(va);
var __v3 = new __Obj(Vec2, [new Store(1, "int"), new Store(1, "int")], "Vec2", {
click : function(){}});
var __v2 = va.get().length - 1;
for(; __v2 >= 0; __v2--){
it0.push(__v2);
Vec2.inc(it0, __v3);
it0.pop();
}
}

	// $.globalEval(src)
	// eval(src);
	// $("#test").html(code.a.get());
	tick();
	$test.html(sa.get()[0]);
}
, "text" // Commenter pour lire du json
);

})