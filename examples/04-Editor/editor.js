$(document).ready(function ()
{


function mf1(func1, inAndOutTypes)
{
	return {
		params : [["first", inAndOutTypes.inputs[0]]],
		func : function(params)	{	
			return func1(params[0]);
		},
		type : inAndOutTypes.output
	}
}

function enclose(str, parentType)
{
	switch(parentType)
	{
		case "VGroup" :
			return "<div>" + str + "</div>";
		case "HGroup" :
			return "<div class=\"hgroup\">" + str + "</div>";
		case "" :
			return str;
	}
}

var code;
var uiIndex = 0;
function buildUi(model, parentView, parentType, path, rootUi)
{
	
	var type = model.__type;
	switch(type)
	{
		case "TextInput" :
			var uiId = type + uiIndex.toString();
			var buttonIndex = uiIndex;
			parentView.append(enclose("<input size=\"8\" type = \"text\" id=" + uiId + " value = \"" + model.desc + "\"></input>", parentType));
			$("#" + uiId).change(function(event) 
			{
				// rootUi.set("toto");
				rootUi.signal("onChange",  [new Store($(this).val())], path);
				// code.p.dirty([]);
			});
			uiIndex++;
			break;
		case "Button" :
			var uiId = type + uiIndex.toString();
			var buttonIndex = uiIndex;
			parentView.append(enclose("<button id=" + uiId + "></button>", parentType));
			$("#" + uiId).button().html(model.desc).click(function() 
			{
				rootUi.signal("onClick", [new Store(model.desc)], path);
			});
			uiIndex++;
			break;
		case "HGroup" :
		case "VGroup" :
			var uiId = type + uiIndex.toString();
			// parentView.append(enclose("<div id=" + uiId + "></div>", parentType));
			parentView.append((parentType == "HGroup") ? 
				"<div class=\"hgroup\" id=" + uiId + "></div>" :
				"<div id=" + uiId + "></div>"
			);
			var $ui = $("#" + uiId);
			uiIndex++;
			_.each(model.children, function(child, index)
			{
				buildUi(child, $ui, type, path.concat(["children", index]), rootUi);
			});
			break;
	}
}

var mainUiIndex = 0;
localNodes =
{
	"UiView" : 
	{
		"fields" : [["ui", "Ui"]],
		"builder" : function(fields) 
		{	
			var ui = fields.ui;
			var $ui = $("#ui" + mainUiIndex);
			mainUiIndex++;	

			ui.addSink(this);			
			
			this.dirty = function()
			{
				$ui.empty();
				buildUi(ui.get(), $ui, "", [], ui);
			}

			this.dirty();
		}
	}
}

_.merge(nodes, localNodes);

var library =
{
	nodes : nodes,
	functions : functions,
	actions : actions
};



$.get("editor.nodes", function( text ) {
// $.get( "structSlots.nodes", function( text ) {
	setLodash(_);
	setEngineLodash(_);

	var codeGraph = codeToGraph(text, library, parser);
	code = compileGraph(codeGraph, library);

	function build(type, params)
	{
		var fieldsDecl = library.nodes[type].fields;
		var fields = _.zipObject(_.map(fieldsDecl, function(fieldDecl, i)
		{
			return [fieldDecl[0], params[i]];
		}));
		return new library.nodes[type].builder
		(
			_.mapValues(fields, function(fieldVal)
			{
				return new Store(fieldVal);
			})
		).get();
	}

	function buildExpr(expr)
	{
		if(_.isArray(expr))
		{
			return	build("Ref", [_.map(expr, function(elem)
			{
				return elem;
			})]);
		}
		else
		{
			return	build("Func", 
				[
					expr.type, 
					_.map(expr.params, function(param)
					{
						return buildExpr(param);
					})
				])
		}
	}

	//var txt = JSON.stringify(codeGraph, undefined, 4);
	var prog = code.program;
	$.get("test2.json", function(graph)
	{
		// TODO enable
		// return;
		_.each(graph.structsAndFuncs, function(structOrfunc)
		{
			if("struct" in structOrfunc)
			{
				var struct = structOrfunc.struct;	
			} else if("func" in structOrfunc)
			{
				var func = structOrfunc.func;
				// prog.get().functions.push(new library.nodes.Function.builder(
				// {
				// 	id : new Store(func.id)
				// }).get());
				prog.get().functions.push(build("FuncDef",
				[
					func.id,
					_.map(func.in, function(paramDecl)
						{
							var p = build("ParamDecl", [paramDecl[0], paramDecl[1]]);
							return p;
						}),
					buildExpr(func.out.val)
				]));
				prog.dirty([]);
			}
		});
	}, "json");
	// var $ui = $("#ui");	
	// var ui = code.ui.get();

	// buildUi(ui, $ui, "", [], code.ui);
	// $ui.empty();
	// buildUi(ui, $ui, "", [], code.ui);

	var tick   = Bacon.interval(20);
	//code.tick.signal();
	tick.onValue(function(t)
	{
		// code.tick.signal();
	});
}
, "text" // Commenter pour lire du json
);

})