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

	$.globalEval(src)

	// var float = {};
	// var int = {};
	// var string = {};

	// var List = {params : ["l"],
	// onPushFront : function(self, x){
	// 	var __selfVal = self.get();
	// 	var __pushedRefs = [];
	// 	if("__refs" in __selfVal)
	// 	{
	// 		_.each(__selfVal.__refs, function(ref, i){
	// 			ref.push(__selfVal.__referencedNodes[i]);
	// 			__pushedRefs.push(ref);
	// 		});
	// 	}
	// 	__selfVal.onPushFront(x);
	// 	_.each(__pushedRefs, function(ref, i)
	// 	{
	// 		ref.pop();
	// 	});
	// },
	// pushFront : function(self, x){
	// 	var __v1 = x;
	// 	var __v0 = pushFront(self.get().l, x.get());
	// 	self.setPath(__v0, ["l"]);
	// 	List.onPushFront(self, __v1);

	// 	},
	// };

	// function controlView(l){
	// 	var __ret = {
	// 		__type : "List",
	// 		l : (new Comprehension(function(aa0_0){
	// 			return aa0_0.get()+1;
	// 		},
	// 		[false],
	// 		[new StructAccess(l, ["l"])],
	// 		false, undefined)).get(),
	// 		onPushFront : function(){}
	// 	};
	// 	if(!("controlView" in l.get().__sinks.onPushFront))
	// 	{
	// 		l.get().__sinks.onPushFront["controlView"] =  
	// 		{
	// 			func : controlView$l$onPushFront,
	// 			vars : []
	// 		};
	// 	};
	// 	l.get().__sinks.onPushFront["controlView"].vars.push(new Store(__ret, "List"));
	// 	return __ret;
	// };
	// function controlView$l$onPushFront(__self, x)
	// {
	// 	List.pushFront(__self, new Store(x.get() + 1, "int"))
	// }
	// function controlView2(l){
	// 	return {
	// 		__type : "List",
	// 		l : (new Comprehension(function(aa1_0){
	// 			return aa1_0.get()*2;
	// 		},
	// 		[false],
	// 		[new StructAccess(l, ["l"])],
	// 		false, undefined)).get(),
	// 		onPushFront : function(){}
	// 	};
	// };
	// function controlView2$l$onPushFront(__self, x)
	// {
	// 	List.pushFront(__self, new Store(x.get() * 2, "int"))
	// }
	// var l = new Store
	// (
	// 	{
	// 		__type : "List",
	// 		l : [0, 1, 2],
	// 		onPushFront : function(x)
	// 		{
	// 			for(__sink in this.__sinks.onPushFront)
	// 			{
	// 				__func = this.__sinks.onPushFront[__sink].func;
	// 				__vars = this.__sinks.onPushFront[__sink].vars;
	// 				for(__j = 0; __j < __vars.length; __j++)
	// 				{
	// 					__func(__vars[__j], x);
	// 				}
	// 			}
	// 			// controlView$l$onPushFront(v, x);
	// 			// controlView2$l$onPushFront(w, x);
	// 			// List.pushFront(v, new Store(x.get() + 1, "int"))
	// 			// List.pushFront(w, new Store(x.get() * 2, "int"))
	// 		},
	// 		__sinks :
	// 		{
	// 			"onPushFront" : {}
	// 		}
	// 	},
	// 	"List"
	// );
	
	// var v = new Store(controlView(l), "List");
	

	// var w = new Store(controlView2(l), "List");
	// if(!("controlView2" in l.get().__sinks.onPushFront))
	// {
	// 	l.get().__sinks.onPushFront["controlView2"] =  
	// 	{
	// 		func : controlView2$l$onPushFront,
	// 		vars : []
	// 	};
	// };
	// l.get().__sinks.onPushFront["controlView2"].vars.push(w);

	// function tick(){
	// 	var __v2 = new Store(3, "int");
	// 	List.pushFront(l, __v2);
	// }

	tick();

	function appendText(txt)
	{
		$tmp.append("<div>" + txt + "</div>");
	}

	appendText(l.get().l);
	appendText(v.get().l);
	appendText(w.get().l);
}
, "text" // Commenter pour lire du json
);

})