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
			return"<div class=\"vGroupElem\" id=enclose" + uiIndex.toString() + ">" + str + "</div>";
		case "HGroup" :
			return "<div class=\"hGroupElem\" id=enclose" + uiIndex.toString() + ">" + str + "</div>";
		case "" :
			return str;
	}
}


var code;
var uiIndex = 0;
var $tmp = $("#tmp");
var doingFocus;
var requestFocus;
var focusCounter = 0;

var modelToUi = {};
function buildUi(view, model, parentType, path, rootUi, ticks, parentTick)
{
	if((ticks != undefined) && (ticks.tick < parentTick))
		return view;

	var type = model.__type;
	switch(type)
	{
		case "FocusTextInput" :
		case "TextInput" :
			if((view == null) || (type != view.attr("modelType")))
			{
				var uiId = type + uiIndex.toString();
				var buttonIndex = uiIndex;
				$tmp.append("<input size=\"8\" type = \"text\" id=" + uiId + " value = \"" + model.desc + "\"></input>");
				var $ui = $("#" + uiId);
				$ui.attr("modelType", type);
				if(type == "FocusTextInput")
				{
					if(model.focusCounter > focusCounter)
					{
						requestFocus = $ui;
						focusCounter = model.focusCounter;
					}
				}
				$ui.change(function(event) 
				{
					rootUi.signal("onChange",  [new Store($(this).val())], path);
				});
				uiIndex++;
				return $ui;
			} else
			{
				var $ui = view;
				$ui.val(model.desc);
				return view;
			}
		case "Text" :
			if((view == null) || (type != view.attr("modelType")))
			{
				var uiId = type + uiIndex.toString();
				$tmp.append("<div class=\"text\" id=" + uiId  + ">" + model.txt+ "</div>");
				var $ui = $("#" + uiId);
				$ui.attr("modelType", type);
				uiIndex++;
				return $ui;
			}
			else
			{
				var $ui = view;
				$ui.html(model.txt);
				return view;
			}
		case "Button" :
			if((view == null) || (type != view.attr("modelType")))
			{
				var uiId = type + uiIndex.toString();
				$tmp.append("<button id=" + uiId + "></button>");
				var $ui = $("#" + uiId);
				if(model.image.length > 0)
				{
					$ui.append("<img width = 20 src = \"../../../images/" + model.image + "\">")
					$ui.width(20);
				}
				else
				{
					$ui.html(model.desc);
				}
				$ui.attr("modelType", type);
				$ui.button()
				.click(function() 
				{
					model.click();
				});
				uiIndex++;
				if(model.visible)
				{
					$ui.show();
				}
				else
				{
					$ui.hide();
				}
				return $ui;
			}
			else
			{
				var $ui = view;
				$ui.html(model.desc);
				if(model.visible)
				{
					$ui.show();
				}
				else
				{
					$ui.hide();
				}
				return view;
			}
			break;
		case "HGroup" :
		case "VGroup" :
			if((view == null) || (type != view.attr("modelType")))
			{				
				var uiId = type + uiIndex.toString();
				// $tmp.append(enclose("<div id=" + uiId + "></div>", parentType));
				var uiClass = type == "HGroup" ? "hGroup" : "vGroup";
				$tmp.append((parentType == "HGroup") ? 
					"<div class=\"hGroupElem " + uiClass + "\" id=" + uiId + "></div>" :
					"<div class=\"vGroupElem " + uiClass + "\" id=" + uiId + "></div>"
				);
				var $ui = $("#" + uiId);
				$ui.attr("modelType", type);				
				uiIndex++;
				_.each(model.children, function(child, index)
				{
					var childUi = buildUi(null, child, type, path.concat(["children", index]), rootUi);
					$ui.append(childUi);
					$ui.data(index.toString(), childUi);
					var test = $ui.data(index.toString());
					test = $ui.data();					
					var a = test;
				});
				$ui.hover(
					function()
					{
						model.mouseEnter();
					},
					function()
					{
						model.mouseLeave();
					}
				);
			} else if((ticks.subs == undefined) || (ticks.subs.children == undefined) || (ticks.subs.children.subs == undefined))
			{
				var $ui = view;
				$ui.empty();
				_.each(model.children, function(child, index)
				{
					var childUi = buildUi(null, child, type, path.concat(["children", index]), rootUi);
					$ui.append(childUi);
					$ui.data(index.toString(), childUi);
					var test = $ui.data(index.toString());
					var a = test;
				});
			} else
			{
				var childrenTicks = ticks.subs.children.subs;
				$ui = view;
				var $uiChildren = $ui.children();
				var $uiChild = $ui.children().first();
				var newUis = jQuery();
				// $ui.empty();
				_.each(model.children, function(child, index)
				// $uiChildren.each(function(index, child)
				{
					var test = $ui.data();
					var childUi = $ui.data(index.toString());
					var previousType = $uiChild.attr("modelType");
					// $uiChild.replaceWith(buildUi($uiChild, child, type, path.concat(["children", index]), rootUi, childrenTicks[index], ticks.tick));
					// requestFocus = false;
					var newUi = buildUi($uiChild, child, type, path.concat(["children", index]), rootUi, childrenTicks[index], ticks.tick);
					// var newUi = buildUi($(child), model.children[index], type, path.concat(["children", index]), rootUi, childrenTicks[index], ticks.tick);
					var next = $uiChild.next();
					if(previousType != newUi.attr("modelType"))
					{
						$uiChild.replaceWith(newUi);
					}
					// $ui.append(newUi);
					// if(model.children[index].__type == "TextInput")
					// {						
					// 	newUi.change(function(event) 
					// 	{
					// 		rootUi.signal("onChange",  [new Store($(this).val())], path.concat(["children", index]));
					// 	});
					// }

					// newUis = newUis.add(buildUi($uiChild, child, type, path.concat(["children", index]), rootUi, childrenTicks[index], ticks.tick));
					$uiChild = next;
				});
				// $ui.empty();
				// $ui.append(newUis);
				// _.each(newUis, function(newUi)
				// {
				// 	$ui.append(newUi);
				// })
				
			}
			if(model.visible)
			{
				$ui.show();
			}
			else
			{
				$ui.hide();
			}
			return $ui;
			break;
	}
}

var mainUiIndex = 0;
function UiView(ui) 
{
	this.index = mainUiIndex;
	var $ui = $("#ui" + mainUiIndex);
	mainUiIndex++;	

	ui.addSink(this);			
	
	var $root = null;
	this.tick = globalTick;
	this.dirty = function()
	{
		var mustAppend = ($root == null);
		// requestFocus = null;
		var uiVal = ui.get();
		$root = buildUi($root, uiVal, "", [], ui, ui.ticks, this.tick);
		this.tick = globalTick;
		if(mustAppend)
		{
			$ui.append($root);
		}
		// if(requestFocus != null && requestFocus in modelToUi)
		if(requestFocus != null)
		{
			doingFocus = true;
			requestFocus.focus();
			doingFocus = false;
			requestFocus = null;
		}
	}

	this.dirty();
}


localNodes =
{
	"UiView" : 
	{
		"fields" : [["ui", "Ui"]],
		"builder" : function(fields) 
		{	
			return {
				getNode : function(){
					return "new UiView(" + fields.ui.getNode() + ")";
				},
				getBeforeStr : function()
				{
					return "";
				},
				getType : function()
				{
					return "UiView";
				}
			};

			var ui = fields.ui;
			this.index = mainUiIndex;
			var $ui = $("#ui" + mainUiIndex);
			mainUiIndex++;	

			ui.addSink(this);			
			
			var $root = null;
			this.tick = globalTick;
			this.dirty = function()
			{
				var mustAppend = ($root == null);
				// requestFocus = null;
				var uiVal = ui.get();
				$root = buildUi($root, uiVal, "", [], ui, ui.ticks, this.tick);
				this.tick = globalTick;
				if(mustAppend)
				{
					$ui.append($root);
				}
				// if(requestFocus != null && requestFocus in modelToUi)
				if(requestFocus != null)
				{
					doingFocus = true;
					requestFocus.focus();
					doingFocus = false;
					requestFocus = null;
				}
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
	setLibrary(library);
	code = compileGraph(codeGraph, library);

	$.globalEval(code)
	
	var types = {
		Ref : Ref,
		Func : Func,
		TypeDecl : TypeDecl,
		Parametric : Parametric,
		ParamDecl : ParamDecl,
		SignalNode : SignalNode,
		Seq : Seq,
		StructDef : StructDef,
		FieldDef : FieldDef,
		SignalDef : SignalDef,
		SlotDef : SlotDef,


	}

	function build(type, params)
	{
		var ret = {
			__type : type,
			__views : {}
		}
		var fieldsDecl = types[type].params;
		_.each(fieldsDecl, function(field, i)
		{
			ret[field] = params[i];
		});
		return ret;		
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

	function buildType(type)
	{
		if(_.isString(type))
		{
			return build("TypeDecl", [type]);
		}
		return build("Parametric", 
			[
				type.base, 
				_.map(type.templates, buildType)
			]);
	}

	function buildParamsDef(paramsDef)
	{
		return _.map(paramsDef, function(paramDecl)
		{
			var p = build("ParamDecl", 
				[
					paramDecl[0], 
					build("TypeDecl", [paramDecl[1]])
				]);
			return p;
		})
	}

	function buildAction(action)
	{
		if("set" in action) 
		{}
		else if("var" in action) // Signal node
		{
			return build("SignalNode", 
				[
					action["var"],
					action.signal,
					_.map(action.params, buildExpr)
				]);
		}
		else // seq
		{
			return build("Seq", [_.map(action.slots, buildAction)]);
		}
	}

	function buildStruct(struct)
	{
		return build("StructDef",
		[
			struct.name,
			_(struct.fields)
				.filter(function(field)
					{
						return _.isArray(field);
					})
				.map(function(field)
				{
					var p = build("FieldDef", [field[0], buildType(field[1])]);
					return p;
				})
				.value()
				.concat
				(
					_(struct.fields)
					.filter(function(field)
						{
							return !(_.isArray(field)) && ("signal" in field);
						})
					.map(function(field)
					{
						return build("SignalDef", [field.signal, buildParamsDef(field.params)]);
					})
					.value()
					.concat
					(
						_(struct.fields)
						.filter(function(field)
							{
								return !(_.isArray(field)) && ("slot" in field);
							})
						.map(function(field)
						{
							return build("SlotDef", [field.slot, buildParamsDef(field.params), buildAction(field.action)]);
						})
						.value()
					)
				),
			_.map(struct.subs, function(subStruct)
				{
					return buildStruct(subStruct);
				})
		])
	}

	//var txt = JSON.stringify(codeGraph, undefined, 4);
	var prog = program;
	$.get("test2.json", function(graph)
	{
		// TODO enable
		// return;
		
		_.each(graph.structsAndFuncs, function(structOrfunc)
		{
			if("struct" in structOrfunc)
			{
				var struct = structOrfunc.struct;
				var builtStructs = buildStruct(struct);
				// var built = tmp;
				// var str = "var builtStructs = " + built + ";";
								
				// $.globalEval(str)
				
				prog.get().structs.push(builtStructs);
			} else if("func" in structOrfunc)
			{
				var func = structOrfunc.func;
				// prog.get().functions.push(new library.nodes.Function.builder(
				// {
				// 	id : new Store(func.id)
				// }).get());

				// prog.get().functions.push(build("FuncDef",
				// [
				// 	func.id,
				// 	buildParamsDef(func.in),
				// 	buildExpr(func.out.val)
				// ]));
				
			}
		});
		globalTick++;
		prog.dirty([]);
	}, "json");
	// var $ui = $("#ui");	
	// var ui = code.ui.get();

	// buildUi(ui, $ui, "", [], code.ui);
	// $ui.empty();
	// buildUi(ui, $ui, "", [], code.ui);

	// var tick   = Bacon.interval(20);
	//code.tick.signal();
	// tick.onValue(function(t)
	// {
		// code.tick.signal();
	// });
}
, "text" // Commenter pour lire du json
);

})