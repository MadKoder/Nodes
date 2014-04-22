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

// var float = {};
// var int = {};
// var string = {};
// var Vec2 = {
//     params: ["x", "y"],
// };
// var Vec3 = {
//     params: ["x", "y", "z"],
// };
// var Color = {
//     params: ["r", "g", "b"],
// };
// var State = {
//     params: ["color"],
// };
// var Ui = {
//     params: ["visible"],
//     mouseEnter: function (self) {
//         self.get().mouseEnter();
//     },
//     mouseLeave: function (self) {
//         self.get().mouseLeave();
//     },
// };
// var Group = {
//     params: ["visible", "children"],
//     mouseEnter: function (self) {
//         self.get().mouseEnter();
//     },
//     mouseLeave: function (self) {
//         self.get().mouseLeave();
//     },
// };
// var HGroup = {
//     params: ["visible", "children"],
//     mouseEnter: function (self) {
//         self.get().mouseEnter();
//     },
//     mouseLeave: function (self) {
//         self.get().mouseLeave();
//     },
// };
// var VGroup = {
//     params: ["visible", "children"],
//     mouseEnter: function (self) {
//         self.get().mouseEnter();
//     },
//     mouseLeave: function (self) {
//         self.get().mouseLeave();
//     },
// };
// var Button = {
//     params: ["visible", "desc", "image"],
//     mouseEnter: function (self) {
//         self.get().mouseEnter();
//     },
//     mouseLeave: function (self) {
//         self.get().mouseLeave();
//     },
//     click: function (self, what) {
//         self.get().click(what);
//     },
//     onClick: function (self, what) {
//         var __v0 = what;
//         Button.click(self, __v0);

//     },
// };
// var TextInput = {
//     params: ["visible", "desc"],
//     mouseEnter: function (self) {
//         self.get().mouseEnter();
//     },
//     mouseLeave: function (self) {
//         self.get().mouseLeave();
//     },
//     set: function (self, text) {
//         self.get().set(text);
//     },
//     focus: function (self, what) {
//         self.get().focus(what);
//     },
//     onBuilt: function (self) {
//         self.get().onBuilt();
//     },
//     onChange: function (self, text) {
//         var __v1 = text;
//         TextInput.set(self, __v1);

//     },
// };
// var FocusTextInput = {
//     params: ["visible", "desc", "focusCounter"],
//     mouseEnter: function (self) {
//         self.get().mouseEnter();
//     },
//     mouseLeave: function (self) {
//         self.get().mouseLeave();
//     },
//     set: function (self, text) {
//         self.get().set(text);
//     },
//     focus: function (self, what) {
//         self.get().focus(what);
//     },
//     onBuilt: function (self) {
//         self.get().onBuilt();
//     },
//     onChange: function (self, text) {
//         var __v2 = text;
//         FocusTextInput.set(self, __v2);

//     },
// };
// var Text = {
//     params: ["visible", "txt"],
//     mouseEnter: function (self) {
//         self.get().mouseEnter();
//     },
//     mouseLeave: function (self) {
//         self.get().mouseLeave();
//     },
// };
// var UiStore = {
//     params: ["visible", "focusCounter", "hover"],
// };
// var TypeDecl = {
//     params: ["name"],
// };
// var Parametric = {
//     params: ["name", "params"],
// };
// var ParamDecl = {
//     params: ["name", "type"],
// };
// var Expr = {
//     params: [],
// };
// var Func = {
//     params: ["type", "params"],
// };
// var Ref = {
//     params: ["path"],
// };
// var LitExpr = {
//     params: [],
// };
// var IntExpr = {
//     params: ["x"],
// };
// var StrExpr = {
//     params: ["str"],
// };
// var Action = {
//     params: [],
// };
// var Seq = {
//     params: ["actions"],
// };
// var RefSlot = {
//     params: ["path"],
// };
// var SignalNode = {
//     params: ["path", "slot", "params"],
// };
// var MemberDef = {
//     params: [],
// };
// var FieldDef = {
//     params: ["name", "type"],
// };
// var SlotDef = {
//     params: ["name", "params", "action"],
// };
// var SignalDef = {
//     params: ["name", "params"],
// };
// var FuncDef = {
//     params: ["id", "inputs", "output"],
// };
// var StructDef = {
//     params: ["name", "members", "subStructs"],
// };
// var Program = {
//     params: ["functions", "structs"],
// };

// function mHGroup(children) {
//     return {
//         __type: "HGroup",
//         visible: true,
//         mouseEnter: function () {},
//         mouseLeave: function () {},
//         children: children.get(),
//     };
// };

// function mVGroup(children) {
//     return {
//         __type: "VGroup",
//         visible: true,
//         mouseEnter: function () {},
//         mouseLeave: function () {},
//         children: children.get(),
//     };
// };

// function txtButton(desc) {
//     return {
//         __type: "Button",
//         visible: true,
//         mouseEnter: function () {},
//         mouseLeave: function () {},
//         click: function () {},
//         desc: desc.get(),
//         image: "",
//     };
// };

// function imgButton(image) {
//     return {
//         __type: "Button",
//         visible: true,
//         mouseEnter: function () {},
//         mouseLeave: function () {},
//         click: function () {},
//         desc: "",
//         image: image.get(),
//     };
// };

// function join(strs, sep) {
//     function lambda0(accum, elem) {
//         var __v3 = new Store(accum, "string");
//         var __v4 = new Store(elem, "string");
//         return accumsepelem
//     }
//     return _.reduce(new Store(strs, {
//         base: "list",
//         params: ["string"]
//     }).get(), function (accum, val) {
//         return lambda0(accum, val);
//     });
// };

// function split(str, sep) {
//     function lambda0(accum, elem) {
//         var __v5 = new Store(accum, {
//             base: "list",
//             params: ["string"]
//         });
//         var __v6 = new Store(elem, "string");
//         return elem == sep ? pushBack(accum, "") : (new Comprehension(comp0, inputs0, indices0, arrays0, false, undefined)).get()
//     }
//     return _.reduce(new _Func(function () {
//         return str.split("");
//     }, {
//         base: "list",
//         params: ["string"]
//     }, [new Store(str, "string")]).get(), function (accum, val) {
//         return lambda0(accum, val);
//     }, new List([new Store("", string)]).get());
// };

// function addVec2(v0, v1) {
//     return {
//         __type: "Vec2",
//         x: v0.x + v1.x,
//         y: v0.y + v1.y,
//     };
// };

// function subVec2(v0, v1) {
//     return {
//         __type: "Vec2",
//         x: v0.x - v1.x,
//         y: v0.y - v1.y,
//     };
// };

// function txtIn(txtNode) {
//     return {
//         __type: "TextInput",
//         visible: true,
//         mouseEnter: function () {},
//         mouseLeave: function () {},
//         set: function () {},
//         focus: function () {},
//         onBuilt: function () {},
//         desc: txtNode.get(),
//     };
// };

// function matchFuncStr(str) {
//     return findAllMatches(new RegExp("(\D(?:\w*))\(([^)]*)\)"), str);
// };

// function matchNewFuncStr(str) {
//     return findAllMatches(new RegExp("(\D(?:\w*))\("), str);
// };

// function strToExpr(str) {
//     return (new MatchType(new _Func(function () {
//         return maybeAt(matchNewFuncStr(str), 0);
//     }, {
//         base: "Maybe",
//         params: ["regmatch"]
//     }, [new _Func(function () {
//         return matchNewFuncStr(str);
//     }, {
//         base: "list",
//         params: ["regmatch"]
//     }, [new Store(str, "string")]), new Store(0, "int")]), [{
//         val: new __Obj(Func, [new _Func(function () {
//             return m;
//         }, "string", [new StructAccess(new _Func(function () {
//             return maybeAt(matchNewFuncStr(str), 0);
//         }, {
//             base: "Maybe",
//             params: ["regmatch"]
//         }, [new _Func(function () {
//             return matchNewFuncStr(str);
//         }, {
//             base: "list",
//             params: ["regmatch"]
//         }, [new Store(str, "string")]), new Store(0, "int")]), ["x"], "regmatch")]), new List([])], "Func", []),
//         type: {
//             base: "Just",
//             params: ["regmatch"]
//         },
//         needsNodes: false
//     }, {
//         val: new MatchType(new _Func(function () {
//             return maybeAt(findAllMatches(new RegExp("^(\d.*)$"), str), 0);
//         }, {
//             base: "Maybe",
//             params: ["regmatch"]
//         }, [new _Func(function () {
//             return findAllMatches(new RegExp("^(\d.*)$"), str);
//         }, {
//             base: "list",
//             params: ["regmatch"]
//         }, [new _Func(function () {
//             return new RegExp("^(\d.*)$");
//         }, "regex", [new Store("^(\d.*)$", string)]), new Store(str, "string")]), new Store(0, "int")]), [{
//             val: new __Obj(IntExpr, [new _Func(function () {
//                 return parseInt(m);
//             }, "int", [new _Func(function () {
//                 return m;
//             }, "string", [new StructAccess(new _Func(function () {
//                 return maybeAt(findAllMatches(new RegExp("^(\d.*)$"), str), 0);
//             }, {
//                 base: "Maybe",
//                 params: ["regmatch"]
//             }, [new _Func(function () {
//                 return findAllMatches(new RegExp("^(\d.*)$"), str);
//             }, {
//                 base: "list",
//                 params: ["regmatch"]
//             }, [new _Func(function () {
//                 return new RegExp("^(\d.*)$");
//             }, "regex", [new Store("^(\d.*)$", string)]), new Store(str, "string")]), new Store(0, "int")]), ["x"], "regmatch")])])], "IntExpr", []),
//             type: {
//                 base: "Just",
//                 params: ["regmatch"]
//             },
//             needsNodes: false
//         }, {
//             val: new MatchType(new _Func(function () {
//                 return maybeAt(findAllMatches(new RegExp("^\"(.*)$"), str), 0);
//             }, {
//                 base: "Maybe",
//                 params: ["regmatch"]
//             }, [new _Func(function () {
//                 return findAllMatches(new RegExp("^\"(.*)$"), str);
//             }, {
//                 base: "list",
//                 params: ["regmatch"]
//             }, [new _Func(function () {
//                 return new RegExp("^\"(.*)$");
//             }, "regex", [new Store("^\"(.*)$", string)]), new Store(str, "string")]), new Store(0, "int")]), [{
//                 val: new __Obj(StrExpr, [new _Func(function () {
//                     return m;
//                 }, "string", [new StructAccess(new _Func(function () {
//                     return maybeAt(findAllMatches(new RegExp("^\"(.*)$"), str), 0);
//                 }, {
//                     base: "Maybe",
//                     params: ["regmatch"]
//                 }, [new _Func(function () {
//                     return findAllMatches(new RegExp("^\"(.*)$"), str);
//                 }, {
//                     base: "list",
//                     params: ["regmatch"]
//                 }, [new _Func(function () {
//                     return new RegExp("^\"(.*)$");
//                 }, "regex", [new Store("^\"(.*)$", string)]), new Store(str, "string")]), new Store(0, "int")]), ["x"], "regmatch")])], "StrExpr", []),
//                 type: {
//                     base: "Just",
//                     params: ["regmatch"]
//                 },
//                 needsNodes: false
//             }, {
//                 val: new __Obj(Ref, [new _Func(function () {
//                     return split(str, ".");
//                 }, {
//                     base: "list",
//                     params: ["string"]
//                 }, [new Store(str, "string"), new Store(".", string)])], "Ref", []),
//                 type: "_",
//                 needsNodes: false
//             }], "Expr", false),
//             type: "_",
//             needsNodes: false
//         }], "Expr", false),
//         type: "_",
//         needsNodes: false
//     }], "Expr", false)).get();
// };

// function exprToUi(expr, viewId, focusCounter) {
//     var arrays1 = [new StructAccess(expr, ["params"], {
//         base: "list",
//         params: ["Expr"]
//     }), ];
//     var aa1_0 = new ArrayAccess(arrays1[0], {
//         base: "list",
//         params: ["Expr"]
//     });
//     var index1_0 = new FuncInput(int);
//     var inputs1 = [aa1_0, ];
//     var indices1 = [index1_0, ];
//     var comp1 = new _Func(function () {
//         return mHGroup(new List([new _Func(function () {
//             return exprToUi(aa1_0, viewId, focusCounter);
//         }, "Ui", [aa1_0, viewId, focusCounter]), new __Obj(Button, [new MatchType(new DictAccess(new StructAccess(aa1_0, ["__views"], {
//             base: "dict",
//             params: ["UiView"]
//         }), viewId, "UiView"), [{
//             val: new StructAccess(new DictAccess(new StructAccess(aa1_0, ["__views"], {
//                 base: "dict",
//                 params: ["UiView"]
//             }), viewId, "UiView"), ["x", "hover"], "bool"),
//             type: {
//                 base: "Just",
//                 params: ["UiStore"]
//             },
//             needsNodes: false
//         }, {
//             val: new Store(false, "bool"),
//             type: "_",
//             needsNodes: false
//         }], "bool", false), new Store("", string), new Store("remove.png", string)], "Button", [
//             function mouseEnter() {},
//             function mouseLeave() {},
//             function click() {},
//         ])]));
//     }, "HGroup", [new List([new _Func(function () {
//         return exprToUi(aa1_0, viewId, focusCounter);
//     }, "Ui", [aa1_0, viewId, focusCounter]), new __Obj(Button, [new MatchType(new DictAccess(new StructAccess(aa1_0, ["__views"], {
//         base: "dict",
//         params: ["UiView"]
//     }), viewId, "UiView"), [{
//         val: new StructAccess(new DictAccess(new StructAccess(aa1_0, ["__views"], {
//             base: "dict",
//             params: ["UiView"]
//         }), viewId, "UiView"), ["x", "hover"], "bool"),
//         type: {
//             base: "Just",
//             params: ["UiStore"]
//         },
//         needsNodes: false
//     }, {
//         val: new Store(false, "bool"),
//         type: "_",
//         needsNodes: false
//     }], "bool", false), new Store("", string), new Store("remove.png", string)], "Button", [
//         function mouseEnter() {},
//         function mouseLeave() {},
//         function click() {},
//     ])])]);
//     return (new MatchType(expr, [{
//         val: new _Func(function () {
//             return mHGroup(new List([new _Func(function () {
//                 return mVGroup(new List([new __Obj(Button, [new Store(true, "bool"), new MatchType(new DictAccess(new StructAccess(expr, ["__views"], {
//                     base: "dict",
//                     params: ["UiView"]
//                 }), viewId, "UiView"), [{
//                     val: new _Func(function () {
//                         if (new DictAccess(new StructAccess(expr, ["__views"], {
//                             base: "dict",
//                             params: ["UiView"]
//                         }), viewId, "UiView").get().x.visible) {
//                             return "Fold";
//                         } else {
//                             return "Unfold";
//                         };
//                     }, "string"),
//                     type: {
//                         base: "Just",
//                         params: ["UiStore"]
//                     },
//                     needsNodes: false
//                 }, {
//                     val: new Store("Fold", string),
//                     type: "_",
//                     needsNodes: false
//                 }], "string", false), new Store("", string)], "Button", [
//                     function mouseEnter() {},
//                     function mouseLeave() {},
//                     function click() {},
//                 ]), new _Func(function () {
//                     return txtIn(new StructAccess(expr, ["type"], "string"));
//                 }, "TextInput", [new StructAccess(expr, ["type"], "string")]), new __Obj(FocusTextInput, [new Store(true, "bool"), new Store("", string), new MatchType(new DictAccess(new StructAccess(expr, ["__views"], {
//                     base: "dict",
//                     params: ["UiView"]
//                 }), viewId, "UiView"), [{
//                     val: new StructAccess(new DictAccess(new StructAccess(expr, ["__views"], {
//                         base: "dict",
//                         params: ["UiView"]
//                     }), viewId, "UiView"), ["x", "focusCounter"], "int"),
//                     type: {
//                         base: "Just",
//                         params: ["UiStore"]
//                     },
//                     needsNodes: false
//                 }, {
//                     val: new Store(0, "int"),
//                     type: "_",
//                     needsNodes: false
//                 }], "int", false)], "FocusTextInput", [
//                     function mouseEnter() {},
//                     function mouseLeave() {},
//                     function set() {},
//                     function focus() {},
//                     function onBuilt() {},
//                 ])]));
//             }, "VGroup", [new List([new __Obj(Button, [new Store(true, "bool"), new MatchType(new DictAccess(new StructAccess(expr, ["__views"], {
//                 base: "dict",
//                 params: ["UiView"]
//             }), viewId, "UiView"), [{
//                 val: new _Func(function () {
//                     if (new DictAccess(new StructAccess(expr, ["__views"], {
//                         base: "dict",
//                         params: ["UiView"]
//                     }), viewId, "UiView").get().x.visible) {
//                         return "Fold";
//                     } else {
//                         return "Unfold";
//                     };
//                 }, "string"),
//                 type: {
//                     base: "Just",
//                     params: ["UiStore"]
//                 },
//                 needsNodes: false
//             }, {
//                 val: new Store("Fold", string),
//                 type: "_",
//                 needsNodes: false
//             }], "string", false), new Store("", string)], "Button", [
//                 function mouseEnter() {},
//                 function mouseLeave() {},
//                 function click() {},
//             ]), new _Func(function () {
//                 return txtIn(new StructAccess(expr, ["type"], "string"));
//             }, "TextInput", [new StructAccess(expr, ["type"], "string")]), new __Obj(FocusTextInput, [new Store(true, "bool"), new Store("", string), new MatchType(new DictAccess(new StructAccess(expr, ["__views"], {
//                 base: "dict",
//                 params: ["UiView"]
//             }), viewId, "UiView"), [{
//                 val: new StructAccess(new DictAccess(new StructAccess(expr, ["__views"], {
//                     base: "dict",
//                     params: ["UiView"]
//                 }), viewId, "UiView"), ["x", "focusCounter"], "int"),
//                 type: {
//                     base: "Just",
//                     params: ["UiStore"]
//                 },
//                 needsNodes: false
//             }, {
//                 val: new Store(0, "int"),
//                 type: "_",
//                 needsNodes: false
//             }], "int", false)], "FocusTextInput", [
//                 function mouseEnter() {},
//                 function mouseLeave() {},
//                 function set() {},
//                 function focus() {},
//                 function onBuilt() {},
//             ])])]), new __Obj(VGroup, [new MatchType(new DictAccess(new StructAccess(expr, ["__views"], {
//                 base: "dict",
//                 params: ["UiView"]
//             }), viewId, "UiView"), [{
//                 val: new StructAccess(new DictAccess(new StructAccess(expr, ["__views"], {
//                     base: "dict",
//                     params: ["UiView"]
//                 }), viewId, "UiView"), ["x", "visible"], "bool"),
//                 type: {
//                     base: "Just",
//                     params: ["UiStore"]
//                 },
//                 needsNodes: false
//             }, {
//                 val: new Store(true, "bool"),
//                 type: "_",
//                 needsNodes: false
//             }], "bool", false), new Comprehension(comp1, inputs1, indices1, arrays1, false, undefined)], "VGroup", [
//                 function mouseEnter() {},
//                 function mouseLeave() {},
//             ])]));
//         }, "HGroup", [new List([new _Func(function () {
//             return mVGroup(new List([new __Obj(Button, [new Store(true, "bool"), new MatchType(new DictAccess(new StructAccess(expr, ["__views"], {
//                 base: "dict",
//                 params: ["UiView"]
//             }), viewId, "UiView"), [{
//                 val: new _Func(function () {
//                     if (new DictAccess(new StructAccess(expr, ["__views"], {
//                         base: "dict",
//                         params: ["UiView"]
//                     }), viewId, "UiView").get().x.visible) {
//                         return "Fold";
//                     } else {
//                         return "Unfold";
//                     };
//                 }, "string"),
//                 type: {
//                     base: "Just",
//                     params: ["UiStore"]
//                 },
//                 needsNodes: false
//             }, {
//                 val: new Store("Fold", string),
//                 type: "_",
//                 needsNodes: false
//             }], "string", false), new Store("", string)], "Button", [
//                 function mouseEnter() {},
//                 function mouseLeave() {},
//                 function click() {},
//             ]), new _Func(function () {
//                 return txtIn(new StructAccess(expr, ["type"], "string"));
//             }, "TextInput", [new StructAccess(expr, ["type"], "string")]), new __Obj(FocusTextInput, [new Store(true, "bool"), new Store("", string), new MatchType(new DictAccess(new StructAccess(expr, ["__views"], {
//                 base: "dict",
//                 params: ["UiView"]
//             }), viewId, "UiView"), [{
//                 val: new StructAccess(new DictAccess(new StructAccess(expr, ["__views"], {
//                     base: "dict",
//                     params: ["UiView"]
//                 }), viewId, "UiView"), ["x", "focusCounter"], "int"),
//                 type: {
//                     base: "Just",
//                     params: ["UiStore"]
//                 },
//                 needsNodes: false
//             }, {
//                 val: new Store(0, "int"),
//                 type: "_",
//                 needsNodes: false
//             }], "int", false)], "FocusTextInput", [
//                 function mouseEnter() {},
//                 function mouseLeave() {},
//                 function set() {},
//                 function focus() {},
//                 function onBuilt() {},
//             ])]));
//         }, "VGroup", [new List([new __Obj(Button, [new Store(true, "bool"), new MatchType(new DictAccess(new StructAccess(expr, ["__views"], {
//             base: "dict",
//             params: ["UiView"]
//         }), viewId, "UiView"), [{
//             val: new _Func(function () {
//                 if (new DictAccess(new StructAccess(expr, ["__views"], {
//                     base: "dict",
//                     params: ["UiView"]
//                 }), viewId, "UiView").get().x.visible) {
//                     return "Fold";
//                 } else {
//                     return "Unfold";
//                 };
//             }, "string"),
//             type: {
//                 base: "Just",
//                 params: ["UiStore"]
//             },
//             needsNodes: false
//         }, {
//             val: new Store("Fold", string),
//             type: "_",
//             needsNodes: false
//         }], "string", false), new Store("", string)], "Button", [
//             function mouseEnter() {},
//             function mouseLeave() {},
//             function click() {},
//         ]), new _Func(function () {
//             return txtIn(new StructAccess(expr, ["type"], "string"));
//         }, "TextInput", [new StructAccess(expr, ["type"], "string")]), new __Obj(FocusTextInput, [new Store(true, "bool"), new Store("", string), new MatchType(new DictAccess(new StructAccess(expr, ["__views"], {
//             base: "dict",
//             params: ["UiView"]
//         }), viewId, "UiView"), [{
//             val: new StructAccess(new DictAccess(new StructAccess(expr, ["__views"], {
//                 base: "dict",
//                 params: ["UiView"]
//             }), viewId, "UiView"), ["x", "focusCounter"], "int"),
//             type: {
//                 base: "Just",
//                 params: ["UiStore"]
//             },
//             needsNodes: false
//         }, {
//             val: new Store(0, "int"),
//             type: "_",
//             needsNodes: false
//         }], "int", false)], "FocusTextInput", [
//             function mouseEnter() {},
//             function mouseLeave() {},
//             function set() {},
//             function focus() {},
//             function onBuilt() {},
//         ])])]), new __Obj(VGroup, [new MatchType(new DictAccess(new StructAccess(expr, ["__views"], {
//             base: "dict",
//             params: ["UiView"]
//         }), viewId, "UiView"), [{
//             val: new StructAccess(new DictAccess(new StructAccess(expr, ["__views"], {
//                 base: "dict",
//                 params: ["UiView"]
//             }), viewId, "UiView"), ["x", "visible"], "bool"),
//             type: {
//                 base: "Just",
//                 params: ["UiStore"]
//             },
//             needsNodes: false
//         }, {
//             val: new Store(true, "bool"),
//             type: "_",
//             needsNodes: false
//         }], "bool", false), new Comprehension(comp1, inputs1, indices1, arrays1, false, undefined)], "VGroup", [
//             function mouseEnter() {},
//             function mouseLeave() {},
//         ])])]),
//         type: "Func",
//         needsNodes: true
//     }, {
//         val: new __Obj(TextInput, [new Store(true, "bool"), new _Func(function () {
//             return join(expr.get().path, ".");
//         }, "string", [new StructAccess(expr, ["path"], {
//             base: "list",
//             params: ["string"]
//         }), new Store(".", string)])], "TextInput", [
//             function mouseEnter() {},
//             function mouseLeave() {},
//             function set() {},
//             function focus() {},
//             function onBuilt() {},
//         ]),
//         type: "Ref",
//         needsNodes: true
//     }, {
//         val: new __Obj(TextInput, [new Store(true, "bool"), new _Func(function () {
//             return expr.get().x.toString();
//         }, "string", [new StructAccess(expr, ["x"], "int")])], "TextInput", [
//             function mouseEnter() {},
//             function mouseLeave() {},
//             function set() {},
//             function focus() {},
//             function onBuilt() {},
//         ]),
//         type: "IntExpr",
//         needsNodes: true
//     }, {
//         val: new __Obj(TextInput, [new Store(true, "bool"), new StructAccess(expr, ["str"], "string")], "TextInput", [
//             function mouseEnter() {},
//             function mouseLeave() {},
//             function set() {},
//             function focus() {},
//             function onBuilt() {},
//         ]),
//         type: "StrExpr",
//         needsNodes: true
//     }, {
//         val: new __Obj(TextInput, [new Store(true, "bool"), new Store("", string)], "TextInput", [
//             function mouseEnter() {},
//             function mouseLeave() {},
//             function set() {},
//             function focus() {},
//             function onBuilt() {},
//         ]),
//         type: "_",
//         needsNodes: false
//     }], "Ui", true)).get();
// };

// function typeDeclToUi(typeDecl, viewId, focusCounter) {
//     var arrays2 = [new StructAccess(typeDecl, ["params"], {
//         base: "list",
//         params: ["TypeDecl"]
//     }), ];
//     var aa2_0 = new ArrayAccess(arrays2[0], {
//         base: "list",
//         params: ["TypeDecl"]
//     });
//     var index2_0 = new FuncInput(int);
//     var inputs2 = [aa2_0, ];
//     var indices2 = [index2_0, ];
//     var comp2 = new _Func(function () {
//         return mVGroup(new List([new _Func(function () {
//             return typeDeclToUi(aa2_0, viewId, focusCounter);
//         }, "Ui", [aa2_0, viewId, focusCounter]), new _Func(function () {
//             return imgButton(new Store("remove.png", string));
//         }, "Button", [new Store("remove.png", string)])]));
//     }, "VGroup", [new List([new _Func(function () {
//         return typeDeclToUi(aa2_0, viewId, focusCounter);
//     }, "Ui", [aa2_0, viewId, focusCounter]), new _Func(function () {
//         return imgButton(new Store("remove.png", string));
//     }, "Button", [new Store("remove.png", string)])])]);
//     return (new MatchType(typeDecl, [{
//         val: new _Func(function () {
//             return mHGroup(new List([new _Func(function () {
//                 return txtIn(new StructAccess(typeDecl, ["name"], "string"));
//             }, "TextInput", [new StructAccess(typeDecl, ["name"], "string")]), new _Func(function () {
//                 return mHGroup(new Comprehension(comp2, inputs2, indices2, arrays2, false, undefined));
//             }, "HGroup", [new Comprehension(comp2, inputs2, indices2, arrays2, false, undefined)])]));
//         }, "HGroup", [new List([new _Func(function () {
//             return txtIn(new StructAccess(typeDecl, ["name"], "string"));
//         }, "TextInput", [new StructAccess(typeDecl, ["name"], "string")]), new _Func(function () {
//             return mHGroup(new Comprehension(comp2, inputs2, indices2, arrays2, false, undefined));
//         }, "HGroup", [new Comprehension(comp2, inputs2, indices2, arrays2, false, undefined)])])]),
//         type: "Parametric",
//         needsNodes: true
//     }, {
//         val: new _Func(function () {
//             return txtIn(new StructAccess(typeDecl, ["name"], "string"));
//         }, "TextInput", [new StructAccess(typeDecl, ["name"], "string")]),
//         type: "_",
//         needsNodes: true
//     }], "Ui", true)).get();
// };

// function paramsDeclToUi(paramsDecl, viewId, focusCounter) {
//     var arrays3 = [paramsDecl, ];
//     var aa3_0 = new ArrayAccess(arrays3[0], {
//         base: "list",
//         params: ["ParamDecl"]
//     });
//     var inputs3 = [aa3_0, ];
//     var indices3 = [];
//     var comp3 = new _Func(function () {
//         return mHGroup(new List([new _Func(function () {
//             return typeDeclToUi(new StructAccess(aa3_0, ["type"], "TypeDecl"), viewId, focusCounter);
//         }, "Ui", [new StructAccess(aa3_0, ["type"], "TypeDecl"), viewId, focusCounter]), new _Func(function () {
//             return txtIn(new StructAccess(aa3_0, ["name"], "string"));
//         }, "TextInput", [new StructAccess(aa3_0, ["name"], "string")])]));
//     }, "HGroup", [new List([new _Func(function () {
//         return typeDeclToUi(new StructAccess(aa3_0, ["type"], "TypeDecl"), viewId, focusCounter);
//     }, "Ui", [new StructAccess(aa3_0, ["type"], "TypeDecl"), viewId, focusCounter]), new _Func(function () {
//         return txtIn(new StructAccess(aa3_0, ["name"], "string"));
//     }, "TextInput", [new StructAccess(aa3_0, ["name"], "string")])])]);
//     return mVGroup(new _Func(function () {
//         return pushBack((new Comprehension(comp3, inputs3, indices3, arrays3, false, undefined)).get(), txtButton(new Store("Add input", string)));
//     }, {
//         base: "list",
//         params: ["Button"]
//     }, [new Comprehension(comp3, inputs3, indices3, arrays3, false, undefined), new _Func(function () {
//         return txtButton(new Store("Add input", string));
//     }, "Button", [new Store("Add input", string)])]));
// };

// function actionToUi(action, viewId, focusCounter) {
//     var arrays4 = [new StructAccess(action, ["actions"], {
//         base: "list",
//         params: ["Action"]
//     }), ];
//     var aa4_0 = new ArrayAccess(arrays4[0], {
//         base: "list",
//         params: ["Action"]
//     });
//     var inputs4 = [aa4_0, ];
//     var indices4 = [];
//     var comp4 = new _Func(function () {
//         return actionToUi(aa4_0, viewId, focusCounter);
//     }, "Ui", [aa4_0, viewId, focusCounter]);
//     var arrays5 = [new StructAccess(action, ["path"], {
//         base: "list",
//         params: ["string"]
//     }), ];
//     var aa5_0 = new ArrayAccess(arrays5[0], {
//         base: "list",
//         params: ["string"]
//     });
//     var inputs5 = [aa5_0, ];
//     var indices5 = [];
//     var comp5 = new _Func(function () {
//         return txtIn(aa5_0);
//     }, "TextInput", [aa5_0]);
//     var arrays6 = [new StructAccess(action, ["params"], {
//         base: "list",
//         params: ["Expr"]
//     }), ];
//     var aa6_0 = new ArrayAccess(arrays6[0], {
//         base: "list",
//         params: ["Expr"]
//     });
//     var inputs6 = [aa6_0, ];
//     var indices6 = [];
//     var comp6 = new _Func(function () {
//         return exprToUi(aa6_0, viewId, focusCounter);
//     }, "Ui", [aa6_0, viewId, focusCounter]);
//     return (new MatchType(action, [{
//         val: new _Func(function () {
//             return mVGroup(new Comprehension(comp4, inputs4, indices4, arrays4, false, undefined));
//         }, "VGroup", [new Comprehension(comp4, inputs4, indices4, arrays4, false, undefined)]),
//         type: "Seq",
//         needsNodes: true
//     }, {
//         val: new _Func(function () {
//             return mHGroup(new _Func(function () {
//                 return pushBack((new Comprehension(comp5, inputs5, indices5, arrays5, false, undefined)).get(), txtIn(new StructAccess(action, ["slot"], "string"))).concat((new Comprehension(comp6, inputs6, indices6, arrays6, false, undefined)).get());
//             }, {
//                 base: "list",
//                 params: ["Ui"]
//             }, [new _Func(function () {
//                 return pushBack((new Comprehension(comp5, inputs5, indices5, arrays5, false, undefined)).get(), txtIn(new StructAccess(action, ["slot"], "string")));
//             }, {
//                 base: "list",
//                 params: ["TextInput"]
//             }, [new Comprehension(comp5, inputs5, indices5, arrays5, false, undefined), new _Func(function () {
//                 return txtIn(new StructAccess(action, ["slot"], "string"));
//             }, "TextInput", [new StructAccess(action, ["slot"], "string")])]), new Comprehension(comp6, inputs6, indices6, arrays6, false, undefined)]));
//         }, "HGroup", [new _Func(function () {
//             return pushBack((new Comprehension(comp5, inputs5, indices5, arrays5, false, undefined)).get(), txtIn(new StructAccess(action, ["slot"], "string"))).concat((new Comprehension(comp6, inputs6, indices6, arrays6, false, undefined)).get());
//         }, {
//             base: "list",
//             params: ["Ui"]
//         }, [new _Func(function () {
//             return pushBack((new Comprehension(comp5, inputs5, indices5, arrays5, false, undefined)).get(), txtIn(new StructAccess(action, ["slot"], "string")));
//         }, {
//             base: "list",
//             params: ["TextInput"]
//         }, [new Comprehension(comp5, inputs5, indices5, arrays5, false, undefined), new _Func(function () {
//             return txtIn(new StructAccess(action, ["slot"], "string"));
//         }, "TextInput", [new StructAccess(action, ["slot"], "string")])]), new Comprehension(comp6, inputs6, indices6, arrays6, false, undefined)])]),
//         type: "SignalNode",
//         needsNodes: true
//     }], "Group", true)).get();
// };

// function classMemberToUi(membersDef, viewId, focusCounter) {
//     var arrays7 = [membersDef, ];
//     var aa7_0 = new ArrayAccess(arrays7[0], {
//         base: "list",
//         params: ["MemberDef"]
//     });
//     var inputs7 = [aa7_0, ];
//     var indices7 = [];
//     var arrays8 = [new StructAccess(aa7_0, ["params"], {
//         base: "list",
//         params: ["ParamDecl"]
//     }), ];
//     var aa8_0 = new ArrayAccess(arrays8[0], {
//         base: "list",
//         params: ["ParamDecl"]
//     });
//     var inputs8 = [aa8_0, ];
//     var indices8 = [];
//     var comp8 = new _Func(function () {
//         return mHGroup(new List([new _Func(function () {
//             return typeDeclToUi(new StructAccess(aa8_0, ["type"], "TypeDecl"), viewId, focusCounter);
//         }, "Ui", [new StructAccess(aa8_0, ["type"], "TypeDecl"), viewId, focusCounter]), new _Func(function () {
//             return txtIn(new StructAccess(aa8_0, ["name"], "string"));
//         }, "TextInput", [new StructAccess(aa8_0, ["name"], "string")])]));
//     }, "HGroup", [new List([new _Func(function () {
//         return typeDeclToUi(new StructAccess(aa8_0, ["type"], "TypeDecl"), viewId, focusCounter);
//     }, "Ui", [new StructAccess(aa8_0, ["type"], "TypeDecl"), viewId, focusCounter]), new _Func(function () {
//         return txtIn(new StructAccess(aa8_0, ["name"], "string"));
//     }, "TextInput", [new StructAccess(aa8_0, ["name"], "string")])])]);
//     var arrays9 = [new StructAccess(aa7_0, ["params"], {
//         base: "list",
//         params: ["ParamDecl"]
//     }), ];
//     var aa9_0 = new ArrayAccess(arrays9[0], {
//         base: "list",
//         params: ["ParamDecl"]
//     });
//     var inputs9 = [aa9_0, ];
//     var indices9 = [];
//     var comp9 = new _Func(function () {
//         return mHGroup(new List([new _Func(function () {
//             return typeDeclToUi(new StructAccess(aa9_0, ["type"], "TypeDecl"), viewId, focusCounter);
//         }, "Ui", [new StructAccess(aa9_0, ["type"], "TypeDecl"), viewId, focusCounter]), new _Func(function () {
//             return txtIn(new StructAccess(aa9_0, ["name"], "string"));
//         }, "TextInput", [new StructAccess(aa9_0, ["name"], "string")])]));
//     }, "HGroup", [new List([new _Func(function () {
//         return typeDeclToUi(new StructAccess(aa9_0, ["type"], "TypeDecl"), viewId, focusCounter);
//     }, "Ui", [new StructAccess(aa9_0, ["type"], "TypeDecl"), viewId, focusCounter]), new _Func(function () {
//         return txtIn(new StructAccess(aa9_0, ["name"], "string"));
//     }, "TextInput", [new StructAccess(aa9_0, ["name"], "string")])])]);
//     var comp7 = new MatchType(aa7_0, [{
//         val: new _Func(function () {
//             return mHGroup(new List([new __Obj(Text, [new Store(true, "bool"), new Store("field :", string)], "Text", [
//                 function mouseEnter() {},
//                 function mouseLeave() {},
//             ]), new _Func(function () {
//                 return typeDeclToUi(new StructAccess(aa7_0, ["type"], "TypeDecl"), viewId, focusCounter);
//             }, "Ui", [new StructAccess(aa7_0, ["type"], "TypeDecl"), viewId, focusCounter]), new _Func(function () {
//                 return txtIn(new StructAccess(aa7_0, ["name"], "string"));
//             }, "TextInput", [new StructAccess(aa7_0, ["name"], "string")])]));
//         }, "HGroup", [new List([new __Obj(Text, [new Store(true, "bool"), new Store("field :", string)], "Text", [
//             function mouseEnter() {},
//             function mouseLeave() {},
//         ]), new _Func(function () {
//             return typeDeclToUi(new StructAccess(aa7_0, ["type"], "TypeDecl"), viewId, focusCounter);
//         }, "Ui", [new StructAccess(aa7_0, ["type"], "TypeDecl"), viewId, focusCounter]), new _Func(function () {
//             return txtIn(new StructAccess(aa7_0, ["name"], "string"));
//         }, "TextInput", [new StructAccess(aa7_0, ["name"], "string")])])]),
//         type: "FieldDef",
//         needsNodes: true
//     }, {
//         val: new _Func(function () {
//             return mHGroup(new _Func(function () {
//                 return [{
//                     __type: "Text",
//                     visible: true,
//                     mouseEnter: function () {},
//                     mouseLeave: function () {},
//                     txt: "signal :",
//                 }, txtIn(new StructAccess(aa7_0, ["name"], "string"))].concat((new Comprehension(comp8, inputs8, indices8, arrays8, false, undefined)).get());
//             }, {
//                 base: "list",
//                 params: ["Ui"]
//             }, [new List([new __Obj(Text, [new Store(true, "bool"), new Store("signal :", string)], "Text", [
//                 function mouseEnter() {},
//                 function mouseLeave() {},
//             ]), new _Func(function () {
//                 return txtIn(new StructAccess(aa7_0, ["name"], "string"));
//             }, "TextInput", [new StructAccess(aa7_0, ["name"], "string")])]), new Comprehension(comp8, inputs8, indices8, arrays8, false, undefined)]));
//         }, "HGroup", [new _Func(function () {
//             return [{
//                 __type: "Text",
//                 visible: true,
//                 mouseEnter: function () {},
//                 mouseLeave: function () {},
//                 txt: "signal :",
//             }, txtIn(new StructAccess(aa7_0, ["name"], "string"))].concat((new Comprehension(comp8, inputs8, indices8, arrays8, false, undefined)).get());
//         }, {
//             base: "list",
//             params: ["Ui"]
//         }, [new List([new __Obj(Text, [new Store(true, "bool"), new Store("signal :", string)], "Text", [
//             function mouseEnter() {},
//             function mouseLeave() {},
//         ]), new _Func(function () {
//             return txtIn(new StructAccess(aa7_0, ["name"], "string"));
//         }, "TextInput", [new StructAccess(aa7_0, ["name"], "string")])]), new Comprehension(comp8, inputs8, indices8, arrays8, false, undefined)])]),
//         type: "SignalDef",
//         needsNodes: true
//     }, {
//         val: new _Func(function () {
//             return mVGroup(new List([new _Func(function () {
//                 return mHGroup(new _Func(function () {
//                     return [{
//                         __type: "Text",
//                         visible: true,
//                         mouseEnter: function () {},
//                         mouseLeave: function () {},
//                         txt: "slot :",
//                     }, txtIn(new StructAccess(aa7_0, ["name"], "string"))].concat((new Comprehension(comp9, inputs9, indices9, arrays9, false, undefined)).get());
//                 }, {
//                     base: "list",
//                     params: ["Ui"]
//                 }, [new List([new __Obj(Text, [new Store(true, "bool"), new Store("slot :", string)], "Text", [
//                     function mouseEnter() {},
//                     function mouseLeave() {},
//                 ]), new _Func(function () {
//                     return txtIn(new StructAccess(aa7_0, ["name"], "string"));
//                 }, "TextInput", [new StructAccess(aa7_0, ["name"], "string")])]), new Comprehension(comp9, inputs9, indices9, arrays9, false, undefined)]));
//             }, "HGroup", [new _Func(function () {
//                 return [{
//                     __type: "Text",
//                     visible: true,
//                     mouseEnter: function () {},
//                     mouseLeave: function () {},
//                     txt: "slot :",
//                 }, txtIn(new StructAccess(aa7_0, ["name"], "string"))].concat((new Comprehension(comp9, inputs9, indices9, arrays9, false, undefined)).get());
//             }, {
//                 base: "list",
//                 params: ["Ui"]
//             }, [new List([new __Obj(Text, [new Store(true, "bool"), new Store("slot :", string)], "Text", [
//                 function mouseEnter() {},
//                 function mouseLeave() {},
//             ]), new _Func(function () {
//                 return txtIn(new StructAccess(aa7_0, ["name"], "string"));
//             }, "TextInput", [new StructAccess(aa7_0, ["name"], "string")])]), new Comprehension(comp9, inputs9, indices9, arrays9, false, undefined)])]), new _Func(function () {
//                 return actionToUi(new StructAccess(aa7_0, ["action"], "Action"), viewId, focusCounter);
//             }, "Ui", [new StructAccess(aa7_0, ["action"], "Action"), viewId, focusCounter])]));
//         }, "VGroup", [new List([new _Func(function () {
//             return mHGroup(new _Func(function () {
//                 return [{
//                     __type: "Text",
//                     visible: true,
//                     mouseEnter: function () {},
//                     mouseLeave: function () {},
//                     txt: "slot :",
//                 }, txtIn(new StructAccess(aa7_0, ["name"], "string"))].concat((new Comprehension(comp9, inputs9, indices9, arrays9, false, undefined)).get());
//             }, {
//                 base: "list",
//                 params: ["Ui"]
//             }, [new List([new __Obj(Text, [new Store(true, "bool"), new Store("slot :", string)], "Text", [
//                 function mouseEnter() {},
//                 function mouseLeave() {},
//             ]), new _Func(function () {
//                 return txtIn(new StructAccess(aa7_0, ["name"], "string"));
//             }, "TextInput", [new StructAccess(aa7_0, ["name"], "string")])]), new Comprehension(comp9, inputs9, indices9, arrays9, false, undefined)]));
//         }, "HGroup", [new _Func(function () {
//             return [{
//                 __type: "Text",
//                 visible: true,
//                 mouseEnter: function () {},
//                 mouseLeave: function () {},
//                 txt: "slot :",
//             }, txtIn(new StructAccess(aa7_0, ["name"], "string"))].concat((new Comprehension(comp9, inputs9, indices9, arrays9, false, undefined)).get());
//         }, {
//             base: "list",
//             params: ["Ui"]
//         }, [new List([new __Obj(Text, [new Store(true, "bool"), new Store("slot :", string)], "Text", [
//             function mouseEnter() {},
//             function mouseLeave() {},
//         ]), new _Func(function () {
//             return txtIn(new StructAccess(aa7_0, ["name"], "string"));
//         }, "TextInput", [new StructAccess(aa7_0, ["name"], "string")])]), new Comprehension(comp9, inputs9, indices9, arrays9, false, undefined)])]), new _Func(function () {
//             return actionToUi(new StructAccess(aa7_0, ["action"], "Action"), viewId, focusCounter);
//         }, "Ui", [new StructAccess(aa7_0, ["action"], "Action"), viewId, focusCounter])])]),
//         type: "SlotDef",
//         needsNodes: true
//     }], "Group", true);
//     return mVGroup(new _Func(function () {
//         return pushBack((new Comprehension(comp7, inputs7, indices7, arrays7, false, undefined)).get(), txtButton(new Store("Add input", string)));
//     }, {
//         base: "list",
//         params: ["Button"]
//     }, [new Comprehension(comp7, inputs7, indices7, arrays7, false, undefined), new _Func(function () {
//         return txtButton(new Store("Add input", string));
//     }, "Button", [new Store("Add input", string)])]));
// };

// function funcToUi(func, viewId, focusCounter) {
//     return mVGroup(new List([new _Func(function () {
//         return txtIn(new StructAccess(func, ["id"], "string"));
//     }, "TextInput", [new StructAccess(func, ["id"], "string")]), new _Func(function () {
//         return mHGroup(new List([new _Func(function () {
//             return mVGroup(new List([new __Obj(Text, [new Store(true, "bool"), new Store("params", string)], "Text", [
//                 function mouseEnter() {},
//                 function mouseLeave() {},
//             ]), new _Func(function () {
//                 return paramsDeclToUi(new StructAccess(func, ["inputs"], {
//                     base: "list",
//                     params: ["ParamDecl"]
//                 }), viewId, focusCounter);
//             }, "VGroup", [new StructAccess(func, ["inputs"], {
//                 base: "list",
//                 params: ["ParamDecl"]
//             }), viewId, focusCounter])]));
//         }, "VGroup", [new List([new __Obj(Text, [new Store(true, "bool"), new Store("params", string)], "Text", [
//             function mouseEnter() {},
//             function mouseLeave() {},
//         ]), new _Func(function () {
//             return paramsDeclToUi(new StructAccess(func, ["inputs"], {
//                 base: "list",
//                 params: ["ParamDecl"]
//             }), viewId, focusCounter);
//         }, "VGroup", [new StructAccess(func, ["inputs"], {
//             base: "list",
//             params: ["ParamDecl"]
//         }), viewId, focusCounter])])]), new _Func(function () {
//             return exprToUi(new StructAccess(func, ["output"], "Expr"), viewId, focusCounter);
//         }, "Ui", [new StructAccess(func, ["output"], "Expr"), viewId, focusCounter])]));
//     }, "HGroup", [new List([new _Func(function () {
//         return mVGroup(new List([new __Obj(Text, [new Store(true, "bool"), new Store("params", string)], "Text", [
//             function mouseEnter() {},
//             function mouseLeave() {},
//         ]), new _Func(function () {
//             return paramsDeclToUi(new StructAccess(func, ["inputs"], {
//                 base: "list",
//                 params: ["ParamDecl"]
//             }), viewId, focusCounter);
//         }, "VGroup", [new StructAccess(func, ["inputs"], {
//             base: "list",
//             params: ["ParamDecl"]
//         }), viewId, focusCounter])]));
//     }, "VGroup", [new List([new __Obj(Text, [new Store(true, "bool"), new Store("params", string)], "Text", [
//         function mouseEnter() {},
//         function mouseLeave() {},
//     ]), new _Func(function () {
//         return paramsDeclToUi(new StructAccess(func, ["inputs"], {
//             base: "list",
//             params: ["ParamDecl"]
//         }), viewId, focusCounter);
//     }, "VGroup", [new StructAccess(func, ["inputs"], {
//         base: "list",
//         params: ["ParamDecl"]
//     }), viewId, focusCounter])])]), new _Func(function () {
//         return exprToUi(new StructAccess(func, ["output"], "Expr"), viewId, focusCounter);
//     }, "Ui", [new StructAccess(func, ["output"], "Expr"), viewId, focusCounter])])])]));
// };

// function structToUi(struct, viewId, focusCounter) {
//     var arrays10 = [new StructAccess(struct, ["subStructs"], {
//         base: "list",
//         params: ["StructDef"]
//     }), ];
//     var aa10_0 = new ArrayAccess(arrays10[0], {
//         base: "list",
//         params: ["StructDef"]
//     });
//     var inputs10 = [aa10_0, ];
//     var indices10 = [];
//     var comp10 = new _Func(function () {
//         return structToUi(aa10_0, viewId, focusCounter);
//     }, "Ui", [aa10_0, viewId, focusCounter]);
//     return mVGroup(new List([new _Func(function () {
//         return txtIn(new StructAccess(struct, ["name"], "string"));
//     }, "TextInput", [new StructAccess(struct, ["name"], "string")]), new _Func(function () {
//         return classMemberToUi(new StructAccess(struct, ["members"], {
//             base: "list",
//             params: ["MemberDef"]
//         }), viewId, focusCounter);
//     }, "VGroup", [new StructAccess(struct, ["members"], {
//         base: "list",
//         params: ["MemberDef"]
//     }), viewId, focusCounter]), new _Func(function () {
//         return mHGroup(new List([new __Obj(Text, [new Store(true, "bool"), new _Func(function () {
//             if (struct.get().subStructs.length > 0) {
//                 return "Subs :";
//             } else {
//                 return "";
//             };
//         }, "string")], "Text", [
//             function mouseEnter() {},
//             function mouseLeave() {},
//         ]), new __Obj(Button, [new _Func(function () {
//             return struct.get().subStructs.length > 0;
//         }, "bool", [new _Func(function () {
//             return struct.get().subStructs.length;
//         }, "int", [new StructAccess(struct, ["subStructs"], {
//             base: "list",
//             params: ["StructDef"]
//         })]), new Store(0, "int")]), new MatchType(new DictAccess(new StructAccess(struct, ["__views"], {
//             base: "dict",
//             params: ["UiView"]
//         }), viewId, "UiView"), [{
//             val: new _Func(function () {
//                 if (new DictAccess(new StructAccess(struct, ["__views"], {
//                     base: "dict",
//                     params: ["UiView"]
//                 }), viewId, "UiView").get().x.visible) {
//                     return "Fold";
//                 } else {
//                     return "Unfold";
//                 };
//             }, "string"),
//             type: {
//                 base: "Just",
//                 params: ["UiStore"]
//             },
//             needsNodes: false
//         }, {
//             val: new Store("Fold", string),
//             type: "_",
//             needsNodes: false
//         }], "string", false), new Store("", string)], "Button", [
//             function mouseEnter() {},
//             function mouseLeave() {},
//             function click() {},
//         ])]));
//     }, "HGroup", [new List([new __Obj(Text, [new Store(true, "bool"), new _Func(function () {
//         if (struct.get().subStructs.length > 0) {
//             return "Subs :";
//         } else {
//             return "";
//         };
//     }, "string")], "Text", [
//         function mouseEnter() {},
//         function mouseLeave() {},
//     ]), new __Obj(Button, [new _Func(function () {
//         return struct.get().subStructs.length > 0;
//     }, "bool", [new _Func(function () {
//         return struct.get().subStructs.length;
//     }, "int", [new StructAccess(struct, ["subStructs"], {
//         base: "list",
//         params: ["StructDef"]
//     })]), new Store(0, "int")]), new MatchType(new DictAccess(new StructAccess(struct, ["__views"], {
//         base: "dict",
//         params: ["UiView"]
//     }), viewId, "UiView"), [{
//         val: new _Func(function () {
//             if (new DictAccess(new StructAccess(struct, ["__views"], {
//                 base: "dict",
//                 params: ["UiView"]
//             }), viewId, "UiView").get().x.visible) {
//                 return "Fold";
//             } else {
//                 return "Unfold";
//             };
//         }, "string"),
//         type: {
//             base: "Just",
//             params: ["UiStore"]
//         },
//         needsNodes: false
//     }, {
//         val: new Store("Fold", string),
//         type: "_",
//         needsNodes: false
//     }], "string", false), new Store("", string)], "Button", [
//         function mouseEnter() {},
//         function mouseLeave() {},
//         function click() {},
//     ])])]), new __Obj(VGroup, [new MatchType(new DictAccess(new StructAccess(struct, ["__views"], {
//         base: "dict",
//         params: ["UiView"]
//     }), viewId, "UiView"), [{
//         val: new StructAccess(new DictAccess(new StructAccess(struct, ["__views"], {
//             base: "dict",
//             params: ["UiView"]
//         }), viewId, "UiView"), ["x", "visible"], "bool"),
//         type: {
//             base: "Just",
//             params: ["UiStore"]
//         },
//         needsNodes: false
//     }, {
//         val: new Store(true, "bool"),
//         type: "_",
//         needsNodes: false
//     }], "bool", false), new Comprehension(comp10, inputs10, indices10, arrays10, false, undefined)], "VGroup", [
//         function mouseEnter() {},
//         function mouseLeave() {},
//     ])]));
// };

// function progToUi(prog, viewId, focusCounter) {
//     var arrays11 = [new StructAccess(prog, ["functions"], {
//         base: "list",
//         params: ["FuncDef"]
//     }), ];
//     var aa11_0 = new ArrayAccess(arrays11[0], {
//         base: "list",
//         params: ["FuncDef"]
//     });
//     var inputs11 = [aa11_0, ];
//     var indices11 = [];
//     var comp11 = new _Func(function () {
//         return funcToUi(aa11_0, viewId, focusCounter);
//     }, "Ui", [aa11_0, viewId, focusCounter]);
//     var arrays12 = [new StructAccess(prog, ["structs"], {
//         base: "list",
//         params: ["StructDef"]
//     }), ];
//     var aa12_0 = new ArrayAccess(arrays12[0], {
//         base: "list",
//         params: ["StructDef"]
//     });
//     var inputs12 = [aa12_0, ];
//     var indices12 = [];
//     var comp12 = new _Func(function () {
//         return structToUi(aa12_0, viewId, focusCounter);
//     }, "Ui", [aa12_0, viewId, focusCounter]);
//     return mVGroup(new List([new _Func(function () {
//         return mVGroup(new Comprehension(comp11, inputs11, indices11, arrays11, false, undefined));
//     }, "VGroup", [new Comprehension(comp11, inputs11, indices11, arrays11, false, undefined)]), new _Func(function () {
//         return mVGroup(new Comprehension(comp12, inputs12, indices12, arrays12, false, undefined));
//     }, "VGroup", [new Comprehension(comp12, inputs12, indices12, arrays12, false, undefined)])]));
// };
// var m = new Store({
//     __type: {
//         base: "Just",
//         params: ["int"]
//     },
//     x: 1,
// }, {
//     base: "Just",
//     params: ["int"]
// });
// var uiCounter = new Store(0, "int");
// var program = new Store({
//     __type: "Program",
//     functions: [],
//     structs: [],
// }, "Program");
// var focusCounter = new Store(1, "int");
// var ui = new Cache(new _Func(function () {
//     return progToUi(program, new Store(0, "int"), focusCounter);
// }, "Ui", [program, new Store(0, "int"), focusCounter]));
// var ui1 = new Cache(new _Func(function () {
//     return progToUi(program, new Store(1, "int"), focusCounter);
// }, "Ui", [program, new Store(1, "int"), focusCounter]));
// var view = new Cache(ui);
// var uiView = new UiView(ui);
// var toto = new Store("toto", "string");

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