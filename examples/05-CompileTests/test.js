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

function _PushFunc(func)
{
	this.func = func;
	this.val = func();

	this.get = function(refs)
	{
		return this.val;
	}

	this.dirty = function()
	{
		this.val = this.func();
	}
}

function FieldUpdater(obj, param, source)
{
	this.obj = obj;
	this.param = param;
	this.source = source;
	this.dirty = function()
	{
		this.obj.val[this.param] = this.source.get();
	}
}

function _PushObj(structDef, params, type, signals)
{
	this.structDef = structDef;
	this.type = type;
	this.fields = {};
	this.updaters = {};
	_.each(params, function(param, i)
	{
		this.fields[structDef.params[i]] = param;
		this.updaters[structDef.params[i]] = new FieldUpdater(this, structDef.params[i], param);
	}, this);
	this.signals = signals;
	
	var struct = {};
	_.each(this.fields, function(field, key)
	{
		struct[key] = field.get();
	});
	struct.__type = type;
	struct.__views = {};
	_.each(this.signals, function(action, key)
	{
		struct[key] = action;
	});
	this.val = struct;

	this.get = function()
	{
		return this.val;
	}

	this.getType = function()
	{
		return this.type;
	}

	this.addSink = function(sink)
	{
		_.each(this.fields, function(field)
		{
			field.addSink(sink);
		});
	}
}

$.get("testModelView.nodes", function( text ) {
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
	var y = new _PushFunc(function(){
		return z.get()+1;
	});
	x.addSink(y);
	var vec = new _PushObj(
		Vec2,
		[x, x]);
	x.addSink(vec.updaters.x);
	x.addSink(vec.updaters.y);
	// eval(src);
	// $("#test").html(code.a.get());
	// tick();
	tick();
	// $test.html(y.get());
	$test.html(vec.get().y);
	// $test.html(v.get().join());
	// $test.html(t.get());
}
, "text" // Commenter pour lire du json
);

})