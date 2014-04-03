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

var code;
var uiIndex = 0;

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
				$tmp.append(enclose("<input size=\"8\" type = \"text\" id=" + uiId + " value = \"" + model.desc + "\"></input>", parentType));
				var $ui = $("#" + uiId);
				var $enclose = $("#enclose" + uiIndex.toString());
				$enclose.attr("modelType", type);
				$enclose.data("ui", $ui);
				$ui = $enclose.data("ui");
				// if(model.desc== "i")
				if(true)
				{
					doingFocus = true;
					// $ui.focus();
					doingFocus = false;
				}
				if(type == "FocusTextInput")
				{
					if(model.focusCounter > focusCounter)
					{
						requestFocus = $ui;
						focusCounter = model.focusCounter;
					}
				}
				if(requestFocus == model.__id)
				{
					requestFocus = $ui;
				}
				// modelToUi[model.__id] = $ui;
				if(!("__focusSlotPushed" in model.__signals))
				{
					model.__signals.__focusSlotPushed = true;
					model.__signals.focus.push({
						signal : function()
						{
							// var a = "a";
							// $("#" + uiId).focus();
							var slots = library.nodes["TextInput"].operators.slots;
							var slot = slots["focus"];
							var model = slot.inputs[0].get();
							requestFocus = model.__id;
						}
					});
				}
				$ui.change(function(event) 
				{
					if(!doingFocus)
					{
						rootUi.signal("onChange",  [new Store($(this).val())], path);
						// $(this).focus();
					}
				});
				uiIndex++;
				return $enclose;
			} else
			{
				var $enclose = view;
				var $ui = $enclose.children();
				$ui.val(model.desc);
				// $ui.change(function(event) 
				// {
				// 	// rootUi.set("toto");
				// 	rootUi.signal("onChange",  [new Store($(this).val())], path);
				// 	// code.p.dirty([]);
				// });
			}
			return view;
			break;
		case "Text" :
			if((view == null) || (type != view.attr("modelType")))
			{
				var uiId = type + uiIndex.toString();
				$tmp.append(enclose("<div class=\"text\" id=" + uiId  + "\">" + model.txt+ "</div>", parentType));			
				var $ui = $("#" + uiId);
				var $enclose = $("#enclose" + uiIndex.toString());
				$enclose.attr("modelType", type);
				$enclose.data("ui", $ui);
				uiIndex++;
				return $enclose;
			}
			else
			{
				var $enclose = view;
				var $ui = $enclose.children();
				$ui.html(model.txt);
				return view;
			}
			break;
		case "Button" :
			if((view == null) || (type != view.attr("modelType")))
			{
				var uiId = type + uiIndex.toString();
				$tmp.append(enclose("<button id=" + uiId + "><img src = \"../../../images/remove.png\"></button>", parentType));
				var $ui = $("#" + uiId);
				var $enclose = $("#enclose" + uiIndex.toString());
				$enclose.attr("modelType", type);
				$enclose.data("ui", $ui);
				$("#" + uiId).button()
				.click(function() 
				{
					rootUi.signal("onClick", [new Store(model.desc)], path);
				});
				uiIndex++;
				return $enclose;
			}
			else
			{
				var $enclose = view;
				var $ui = $enclose.children();
				$ui.html(model.desc);
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
			if(model.folded)
			{
				$ui.hide();
			}
			else
			{
				$ui.show();
			}
			return $ui;
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
					var p = build("ParamDecl", [field[0], buildType(field[1])]);
					return p;
				})
				.value(),
			_.map(struct.subStructs, function(subStruct)
				{
					return buildStruct(subStruct);
				})
		])
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
				prog.get().structs.push(buildStruct(struct));
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
							var p = build("ParamDecl", 
								[
									paramDecl[0], 
									build("TypeDecl", [paramDecl[1]])
								]);
							return p;
						}),
					buildExpr(func.out.val)
				]));
				
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