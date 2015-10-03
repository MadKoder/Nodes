
var functions = 
{
	"+" : maf2(function (x, y) {return x + "+" + y;})
};




/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////

// var functions2 =
// {
// 	"head" : mluf1
// 	(
// 		function(list) // The function
// 		{	
// 			return "_.head(" + list + ")";
// 		},
// 		function(template) // Output type
// 		{
// 			return template;
// 		}
// 	),
// 	"tail" : mllf1
// 	(
// 		function(list) // The function
// 		{	
// 			return "_.tail(" + list + ")";
// 		}
// 	),
// 	flatten : mtf1
// 	(
// 		function(list) // The function
// 		{	
// 			return "_.flatten(" + list + ", true)";
// 		},
// 		function(template) // Input and output types
// 		{
// 			return inOut1(mt("list", mt("list", [template])), mt("list", [template]));
// 		},
// 		function(paramType)	// Template guess from input types
// 		{
// 			return getListTypeParam(getListTypeParam(paramType));
// 		}
// 	),
// 	range : mf2
// 	(
// 		function (start, stop) 
// 		{
// 			return "_.range("+start+","+stop+")";			
// 		},
// 		inOut2("int", "int", mt("list", ["int"]))
// 	),
// 	"neg" : mff1(function (x) {return "-" + x;}),
// 	"-" : maf2(function (x, y){return x + "-" + y;}),
//     "*" : maf2(function (x, y) {return x + "*" + y;}),
//     "/" : maf2(function (x, y) {return x + "/" + y;}),
// 	"<" : mcf2(function (x, y) {return x + "<"  + y;}),
// 	">" : mcf2(function (x, y) {return x + ">" + y;}),
// 	"<=" : mcf2(function (x, y) {return x + "<=" + y;}),
// 	">=" : mcf2(function (x, y) {return x + ">=" + y;}),
// 	"eq" : 	mtf2
// 	(
// 		function(first, second) // The function
// 		{	
// 			return first + "==" + second;
// 		},
// 		function(template) // Input and output types
// 		{
// 			return inOut2(template, template, "bool");
// 		},
// 		function(firstType, secondType)	// Template guess from input types
// 		{
// 			// TODO checkSubType
// 			checkSameTypes(firstType, secondType);
// 			return firstType;
// 		}
// 	),
// 	"==" : 	mtf2
// 	(
// 		function(first, second) // The function
// 		{	
// 			return first + "==" + second;
// 		},
// 		function(template) // Input and output types
// 		{
// 			return inOut2(template, template, "bool");
// 		},
// 		function(firstType, secondType)	// Template guess from input types
// 		{
// 			// TODO checkSubType
// 			checkSameTypes(firstType, secondType);
// 			return firstType;
// 		}
// 	),
// 	"!=" : mtf2
// 	(
// 		function(first, second) // The function
// 		{	
// 			return first + "!=" + second;
// 		},
// 		function(template) // Input and output types
// 		{
// 			return inOut2(template, template, "bool");
// 		},
// 		function(firstType, secondType)	// Template guess from input types
// 		{
// 			// TODO checkSubType
// 			checkSameTypes(firstType, secondType);
// 			return firstType;
// 		}
// 	),
// 	"||" : mbf2(function (x, y) {return x + "||" + y;}),
// 	"&&" : mbf2(function (x, y) {return x + "&&" + y;}),
// 	"!" : mf1
// 	(
// 		function (x) {return "!" + x;},
// 		inOut1("bool", "bool")
// 	),
// 	"mod" :  mf2
// 	(
// 		function (x, y) 
// 		{
// 			return "(" + x + "+" + y + ") %" + y; // We don't want negative number
// 		},
// 		inOut2("int", "int", "int")
// 	),
// 	"min" : mff2(function (x, y) {return x + ">" + y + "?" + y + ":" + x;}), 
// 	"max" : mff2(function (x, y) {return x + "<" + y + "?" + y + ":" + x;}), 
// 	"clamp" : mff3(function (x, min, max) {return x + "<" + min + "?" + min + ":" + x + ">"  + max + "?" + max + ":" + x}),
// 	"abs" : mff1(function (x) 
// 	{
// 		return "Math.abs(" + x + ")";
// 	}),
// 	"round" : mff1(function (x) 
// 	{
// 		return "Math.floor(" + x + " + .5)";
// 	}),
// 	"floor" : mf1(
// 		function (x){return "Math.floor(" + x + ")";},
// 		inOut1("float", "int")
// 	), 
// 	"concat" : mtf2
// 	(
// 		function(first, second) // The function
// 		{	
// 			return first + ".concat(" + second + ")";
// 		},
// 		function(template) // Input and output types
// 		{
// 			return inOut2(mListType(template), mListType(template), mListType(template));
// 		},
// 		function(firstType, secondType)	// Template guess from input types
// 		{
// 			var firstTemplate = getListTypeParam(firstType);
// 			var secondTemplate = getListTypeParam(secondType);
// 			var mostGenericType = getCommonSuperClass(firstTemplate, secondTemplate);
// 			return mostGenericType;
// 		}
// 	),
// 	"pushFront" :  mtf2
// 	(
// 		function(a, v) // The function
// 		{	
// 			return "pushFront(" + a + ", " + v + ")";
// 		},
// 		function(template) // Input and output types
// 		{
// 			return inOut2(mListType(template), template, mListType(template));
// 		},
// 		function(listType, itemType)	// Template guess from input types
// 		{
// 			var template = getListTypeParam(listType);
// 			// TODO checkSubType
// 			//checkSameTypes(template, itemType);
// 			return itemType;
// 		}
// 	),
// 	"pushBack" :  mtf2
// 	(
// 		function(a, v) // The function
// 		{	
// 			return "pushBack(" + a + ", " + v + ")";
// 		},
// 		function(template) // Input and output types
// 		{
// 			return inOut2(mListType(template), template, mListType(template));
// 		},
// 		function(listType, itemType)	// Template guess from input types
// 		{
// 			var template = getListTypeParam(listType);
// 			// TODO checkSubType
// 			//checkSameTypes(template, itemType);
// 			return itemType;
// 		}
// 	),
// 	"popBack" : mllf1(function (a)
// 		{
// 			return "_.initial(" + a + ")";
// 		}),
// 	"slice" : mtf3
// 		(
// 			function (a, start, stop) {return a + ".slice(" + start + ", " + stop + ")";},
// 			function(template) // Input and output types
// 			{
// 				return inOut3
// 				(
// 					mListType(template), 
// 					"int",
// 					"int",
// 					mListType(template)
// 				);
// 			},
// 			function(listType, startType, stopType)	// Template guess from input types
// 			{
// 				check(startType == "int", "Slice start parameter is not an int");
// 				check(stopType == "int", "Slice stop parameter is not an int");
// 				return getListTypeParam(listType);
// 			}
// 		),
// 	"length" : mluf1
// 	(
// 		function(list) // The function
// 		{	
// 			return list + ".length";
// 		},
// 		function(template) // Output type
// 		{
// 			return "int";
// 		}
// 	),
// 	"any" :  mluf1 // TODO limiter a listes de bool
// 	(
// 		function(list) // The function
// 		{	
// 			return "_.any(" + list + ")";
// 		},
// 		function(template) // Output type
// 		{
// 			return "bool";
// 		}
// 	),
// 	"none" : mluf1 // TODO limiter a listes de bool
// 	(
// 		function(list) // The function
// 		{	
// 			return "!(_.any(" + list + "))";
// 		},
// 		function(template) // Output type
// 		{
// 			return "bool";
// 		}
// 	),
// 	"sqr" : mff1(function (x) {return x * x;}),
// 	"remove": mtf2
// 	(
// 		function(array, index) // The function
// 		{	
// 			if(index < array.length && index >= 0)
// 			{
// 				array.splice(index, 1);
// 			}
// 			// TODO version generique (ici seulement pour list de bool)
// 			return array;
// 		},
// 		function(template) // Input and output types
// 		{
// 			return inOut2(mListType(template), "int", mListType(template));
// 		},
// 		function(listType, indexType)	// Template guess from input types
// 		{
// 			var template = getListTypeParam(listType);
// 			return template;
// 		}
// 	),
// 	"at": mtf2
// 	(
// 		function(array, index) // The function
// 		{	
// 			return "at(" + array + ", " + index + ")";
// 		},
// 		function(template) // Input and output types
// 		{
// 			return inOut2(mListType(template), "int", template);
// 		},
// 		function(listType, indexType)	// Template guess from input types
// 		{
// 			var template = getListTypeParam(listType);
// 			return template;
// 		}
// 	),
// 	"maybeAt": mtf2
// 	(
// 		function(array, index) // The function
// 		{	
// 			return "maybeAt(" + array + ", " + index + ")";
// 		},
// 		function(template) // Input and output types
// 		{
// 			return inOut2(mListType(template), "int", mt("Maybe", [template]));
// 		},
// 		function(listType, indexType)	// Template guess from input types
// 		{
// 			var template = getListTypeParam(listType);
// 			return template;
// 		}
// 	),
// 	"zip" :  mt2f2
// 	(
// 		function(first, second) // The function
// 		{	
// 			return _.zip(first, second);
// 		},
// 		function(firstTemplate, secondTemplate) // Input and output types
// 		{
// 			return inOut2(mListType(firstTemplate), mListType(secondTemplate), mt("list", [mt("tuple", [firstTemplate, secondTemplate])]));
// 		},
// 		function(firstList, secondList)	// Template guess from input types
// 		{
// 			var firstTemplate = getListTypeParam(firstList);
// 			var secondTemplate = getListTypeParam(secondList);
// 			return [firstTemplate, secondTemplate];
// 		}
// 	),
// 	"unzip" :  mt2f1
// 	(
// 		function(list) // The function
// 		{	
// 			return "unzip(" + list + ")";
// 		},
// 		function(firstTemplate, secondTemplate) // Input and output types
// 		{
// 			return inOut1(mt("list", mt("tuple", [firstTemplate, secondTemplate])), mt("tuple", [mListType(firstTemplate), mListType(secondTemplate)]));
// 		},
// 		function(listType)	// Template guess from input types
// 		{
// 			var listTemplate = getListTypeParam(listType);
// 			check(getBaseType(listTemplate) == "tuple", "List template is not a tuple : " + getBaseType(listTemplate));
// 			var tupleTemplates = getTypeParams(listTemplate);
// 			check(tupleTemplates.length == 2, "Tuple doesn't have 2 templates : " + tupleTemplates.length);
// 			return tupleTemplates;
// 		}
// 	),
// 	"zip3" :  mt3f3
// 	(
// 		function(first, second, third) // The function
// 		{	
// 			return _.zip(first, second, third);
// 		},
// 		function(firstTemplate, secondTemplate, thirdTemplate) // Input and output types
// 		{
// 			return inOut3
// 			(
// 				mListType(firstTemplate), 
// 				mListType(secondTemplate), 
// 				mListType(thirdTemplate), 
// 				mt("list", [mt("tuple", [firstTemplate, secondTemplate, thirdTemplate])])
// 			);
// 		},
// 		function(firstList, secondList, thirdList)	// Template guess from input types
// 		{
// 			var firstTemplate = getListTypeParam(firstList);
// 			var secondTemplate = getListTypeParam(secondList);
// 			var thirdTemplate = getListTypeParam(thirdList);
// 			return [firstTemplate, secondTemplate, thirdTemplate];
// 		}
// 	),
// 	strCat : mf2
// 	(
// 		function (fst, scd) 
// 		{
// 			return fst + " + " + scd;
// 		},
// 		inOut2("string", "string", "string")
// 	),
// 	strToList : mf1
// 	(
// 		function (str) 
// 		{
// 			return str + ".split(\"\")";
// 		},
// 		inOut1("string", mListType("string"))
// 	),
// 	strToInt : mf1
// 	(
// 		function (str) 
// 		{
// 			return "parseInt(" + str + ")";
// 		},
// 		inOut1("string", "int")
// 	),
// 	intToStr : mf1
// 	(
// 		function (x) 
// 		{
// 			return x + ".toString()";
// 		},
// 		inOut1("int", "string")
// 	),
// 	re : mf1
// 	(
// 		function (str) 
// 		{
// 			return "new RegExp(" + str + ")";
// 		},
// 		inOut1("string", "regex")
// 	),
// 	findAllMatches : mf2
// 	(
// 		function (re, str) 
// 		{
// 			return "findAllMatches(" + re + ", " + str + ")";
// 		},
// 		inOut2("regex", "string", mListType("regmatch"))
// 	),
// 	group1 : mf1
// 	(
// 		function (match) 
// 		{
// 			return match[0];
// 		},
// 		inOut1("regmatch", "string")
// 	),
// 	group2 : mf1
// 	(
// 		function (match) 
// 		{
// 			return match[1];
// 		},
// 		inOut1("regmatch", "string")
// 	),
// 	"map" : {
// 		guessTypeParams : function(params)
// 		{
// 			var list = params[1];
// 			var listTypeParam = getListTypeParam(list.getType());	
// 			// If the function is generic
// 			if(params[0].template)
// 			{
// 				// Use the type param of the list to get the concrete type of the function
// 				var tmp = new Store(null, listTypeParam);
// 				var funcTemplates = params[0].template.guessTypeParams([tmp]);
// 				var funcType = getFuncType(params[0], funcTemplates);
// 			}
// 			else
// 			{
// 				var funcType = params[0].getType();
// 			}
// 			return [listTypeParam, getOutType(funcType)];
// 		},		
// 		build : function(templates)
// 		{
// 			if(templates.length < 2)
// 			{
// 				error("Only " + templates.length + " generic parameter given for map function, need 2");
// 			}
// 			return {
// 				params : [["function" , inOut1(templates[0], templates[1])], ["list" , mListType(templates[0])]],
// 				getStr : function(params) 
// 				{	
// 					return "_.map(" + params[1] + ", " + params[0] + ")";					
// 				},
// 				type : mListType(templates[1]),
// 				templates : templates,
// 				getBeforeStr : function()
// 				{
// 					return "";
// 				}
// 			}
// 		}
// 	},
// 	"flatMap" : {
// 		guessTypeParams : function(params)
// 		{
// 			var list = params[1];
// 			var temp0 = getListTypeParam(list.getType());	
// 			if(params[0].template)
// 			{
// 				var tmp = new Store(null, temp0);
// 				var funcTemplates = params[0].template.guessTypeParams([tmp]);
// 				// var funcType = getFuncType(params[0], [temp0]);
// 				var funcType = getFuncType(params[0], funcTemplates);
// 			}
// 			else
// 			{
// 				var funcType = params[0].getType();
// 			}
// 			return [temp0, getListTypeParam(getOutType(funcType))];
// 		},		
// 		build : function(templates)
// 		{
// 			function instance(templates)
// 			{
// 				this.params = [["function" , inOut1(templates[0], mListType(templates[1]))], ["list" , mListType(templates[0])]];
// 				this.needsNodes = true;
// 				this.arrayAccess = new ArrayAccess(null, mListType(templates[0]));
// 				this.getStrRef = function(params) 
// 				{	
// 					return "_(" + params[1] + ".get()).map(function(val){return " + params[0] + "(val);}).flatten(true).value()";
// 				};
// 				this.type = mListType(templates[1]);
// 				this.templates = templates;
// 				this.getBeforeStr = function()
// 				{
// 					return "";
// 				}
// 			}
// 			return new instance(templates)
// 		}
// 	},
// 	"reduce" : { // Use first element of list as starting accumulator
// 		guessTypeParams : function(params)
// 		{
// 			var list = params[1];
// 			var temp0 = getListTypeParam(list.getType());
// 			var funcType = getFuncType(params[0], [temp0]);
// 			return [temp0, funcType.output];
// 		},		
// 		build : function(templates)
// 		{
// 			function instance(templates)
// 			{
// 				this.params = [["function" , inOut2(templates[1], templates[0], templates[1])], ["list" , mListType(templates[0])]];
// 				this.needsNodes = true;
// 				this.getStrRef = function(params) 
// 				{	
// 					return "_.reduce(" + params[1] + ".get(), function(accum, val){return " + params[0] + "(accum ,val);})";
// 				};
// 				this.getBeforeStr = function()
// 				{
// 					return "";
// 				}
// 				this.type = templates[1];
// 				this.templates = templates;
// 			}

// 			return new instance(templates);
// 		}
// 	},
// 	"fold" : { // need starting accumulator
// 		guessTypeParams : function(params)
// 		{
// 			var list = params[1];
// 			var temp0 = getListTypeParam(list.getType());
// 			var funcType = getFuncType(params[0], [temp0]);
// 			return [temp0, funcType.output];
// 		},		
// 		build : function(templates)
// 		{
// 			function instance(templates)
// 			{
// 				this.params = [["function" , inOut2(templates[1], templates[0], templates[1])], ["list" , mListType(templates[0])], ["start" , templates[1]]];
// 				this.needsNodes = true;
// 				this.getStrRef = function(params) 
// 				{	
// 					return "_.reduce(" + params[1] + ".get(), function(accum, val){return " + params[0] + "(accum ,val);}," + params[2] + ".get())";
// 				};
// 				this.getBeforeStr = function()
// 				{
// 					return "";
// 				};
// 				this.type = templates[1];
// 				this.templates = templates;
// 			}

// 			return new instance(templates);
// 		}
// 	},
// 	"contains" : {
// 		guessTypeParams : function(params)
// 		{
// 			var list = params[0];
// 			var item = params[1];
// 			var tempType = getListTypeParam(list.getType());
// 			checkSameTypes(tempType, item.getType());
// 			var funcType = getFuncType(params[2], [tempType]);
			
// 			// TODO : check func type
// 			return [tempType];
// 		},
// 		build : function(templates)
// 		{
// 			function instance(templates)
// 			{
// 				this.params = [["list" , mListType(templates[0])], ["item" , templates[0]], ["function" , inOut2(templates[0], templates[0], "bool")]];
// 				this.needsNodes = true;
// 				this.templates = templates;
// 				this.type = "bool";
// 				this.getBeforeStr = function()
// 				{
// 					return "";					
// 				}

// 				this.getStrRef = function(params)
// 				{
// 					return "_contains(" + params + ")";
// 				}
// 			}
// 			return new instance(templates);
// 		}
// 	},
// 	"merge" :
// 	{
// 		guessTypeParams : function(params)
// 		{
// 			var dst = params[0];
// 			var src = params[1];
// 			var srcParams = getDictTypeParam(src.getType());
// 			var dstParams = getDictTypeParam(dst.getType());
// 			checkSameTypes(srcParams[0], dstParams[0]);
// 			checkSameTypes(srcParams[1], dstParams[1]);			
// 			return srcParams;
// 		},
// 		build : function(templates)
// 		{
// 			return {
// 				params : 
// 				[
// 					["dst" , dictType(templates[0], templates[1])], 
// 					["src" , dictType(templates[0], templates[1])]
// 				],
// 				getStr : function(params) 
// 				{	
// 					// return "_.merge(_.cloneDeep(" + params[0] + "), " + params[1] + ")";
// 					return "merge(" + params[0] + ", " + params[1] + ")"
// 				},
// 				type : dictType("string", templates[0]),
// 				templates : templates,
// 				getBeforeStr : function()
// 				{
// 					return "";
// 				}
// 			}
// 		}
// 	}
// };

function _Func(func)
{
	this.func = func;

	this.get = function(refs)
	{
		return this.func();
	}
}

var funcNodeId = 0;
function FunctionNode(func)
{
	this.fields = func.params;
	
	var paramsSpec = func.params;
	
	this.builder = function(fields) 
	{	
		this.id = funcNodeId++;
		var params = Array(paramsSpec.length);		
		this.func = func;
		_.each(fields, function(field, key)
		{
			var index = _.findIndex(paramsSpec, function(fieldSpec){return fieldSpec[0] == key;});
			params[index] = field;
			// C'est un template de fonction (StoreFunctionTemplate)
			if("setTemplateParams" in field)
			{
				field.setTemplateParams(func.templates);
			}
		}, this);
		
		this.signals = {};
		if("expr" in func && "getSignals" in func.expr)
		{
			_.each(func.expr.getSignals(), function(signal, key)
			{
				this.signals[key] = _.clone(signal);
				signal = [];
			}, this);
		}

		this.beforeStr = func.getBeforeStr();
				
		if(func.needsNodes)
		{
			this.str = func.getStrRef(_.map(params, function(param)
			{
				return param.getNode();
			}));
		}
		else
		{
			this.str = func.getStr(_.map(params, function(param)
			{
				return param.getVal();
			}, this));
		}

		var baseType = getBaseType(func.type);
		
		// this.nodeStr = "new _Func(function(){\n\treturn " + this.str + ";\n},\n" + ")";
		this.nodeStr = compositeBlock([
			new SimpleString("new _Func(function()"),
			stmntBlock([new SimpleString("return " + this.str)]),
			new SimpleString(")")]);
		
		this.getBeforeStr = function()
		{
			return this.beforeStr;
		}

		this.getNode = function()
		{
			return this.nodeStr;
		}

		this.getVal = function()
		{
			return this.str;
		}

		this.getAddSinkStr = function(sink)
		{
			return  _.map(params, function(param, index)
			{
				return param.getAddSinkStr(sink);
			}).join("");
		}

		this.getType = function()
		{
			if(!("type" in func))
				throw "Return type of function " + func.name + " not defined, and cannot deduce it from parameters (recursive template function ?)"
			
			return func.type;
		}

		this.getSignals = function()
		{
			return this.signals;		
		}
	}
}

function funcToNodeSpec(funcProto)
{		
	if(funcProto.guessTypeParams != undefined)
	{
		return {
			guessTypeParams : funcProto.guessTypeParams,
			getInstance : function(templates)
			{
				return new FunctionNode(funcProto.build(templates));
			}
		}
	}
	return new FunctionNode(funcProto);
}

var currentPath = [];

function Tuple(fields)
{
	this.fields = fields;
	this.get = function()
	{
		return _.map(this.fields, function(field){return field.get();});
	}
};

// var nodes = 
// {
// 	"string" :
// 	{
// 		operators :
// 		{
// 			signal : function()
// 			{
// 				// TODO
// 			},
// 		}
// 	},
// 	"int" :
// 	{
// 		operators :
// 		{
// 			signal : function()
// 			{
// 				// TODO
// 			}
// 		}
// 	},
// 	"char" :
// 	{
// 		operators :
// 		{
// 			signal : function()
// 			{
// 				// TODO
// 			}
// 		}
// 	},
// 	"bool" :
// 	{
// 		operators :
// 		{
// 			signal : function()
// 			{
// 				// TODO
// 			}
// 		}
// 	},
// 	"contains" : 
// 	{
// 		"fields" : [["first", "float"], ["second", "float"], ["third", "float"]],
// 		"builder" : function(fields) 
// 		{	
// 			var a = fields.first;
// 			var v = fields.second;
// 			var third = fields.third;
// 			//var f = third.build(third.guessTypeParams(v));

// 			// TODO version template
// 			var funcType = third.type;
// 			var func = third.func;
// 			this.get = function()
// 			{
// 				var array = a.get();
// 				var val = v.get();
				
// 				for(var i = 0; i < array.length; i++)
// 				{
// 					if(func([array[i], val]))
// 						return true;
// 				}
// 				return false;
// 			};		
// 		}
// 	},
// 	"Random" : makeRandom(),
// 	"RandomList" : makeRandomList(),
//     "if" :  
// 	{
// 		guessTypeParams : function(params)
// 		{
// 			var condType = params[0].getType();
// 			checkSameTypes(condType, "bool");
			
// 			var fstType = params[1].getType();
// 			var scdType = params[2].getType();
			
// 			var mostGenericType = getCommonSuperClass(fstType, scdType);
// 			if(mostGenericType != undefined)
// 				return [mostGenericType];
// 			error("\"If\" parameters are not of compatible types : " + typeToString(fstType) + " and " + typeToString(scdType))
// 		},
// 		getInstance : function(templates)
// 		{
// 			var typeParam = templates[0];

// 			return {
// 				"fields" : [["first", "bool"], ["second", typeParam], ["third", typeParam]],
// 				"builder" : function(fields) 
// 				{	
// 					var cond = fields.first;
// 					var first = fields.second;
// 					var second = fields.third;
					
// 					this.type = "if";

// 					this.beforeStr = cond.getBeforeStr() + first.getBeforeStr() + second.getBeforeStr();
// 					var str = "if(" + cond.getVal() + "){return " + first.getVal() + ";}else{return " + second.getVal() + ";}";
// 					this.nodeStr = "new _Func(function(){ " + str + ";}, " + typeToJson(typeParam) + ")"
// 					this.val = cond.getVal() + " ? " + first.getVal() + " : " + second.getVal();
					
// 					this.getBeforeStr = function()
// 					{
// 						return this.beforeStr;
// 					}

// 					this.getNode = function()
// 					{
// 						return this.nodeStr;
// 					}

// 					this.getVal = function()
// 					{
// 						return this.val;
// 					}

// 					this.get = function()
// 					{
// 						if(cond.get())
// 						{
// 							return first.get();
// 						}
// 						return second.get();
// 					};

// 					this.getType = function(){
// 							// TODO check first and second type compatibles
// 							return second.getType();
// 					};
// 					this.addSink = function(sink)
// 					{
// 						cond.addSink(sink);
// 						first.addSink(sink);
// 						second.addSink(sink);
// 					};
// 				}
// 			}
// 		}
// 	},
// 	"list" :
// 	{
// 		guessTypeParams : undefined, // TODO
// 		getInstance : function(templates)
// 		{
// 			var subType = templates[0];
// 			var subBaseType = getBaseType(subType);
// 			if(subBaseType in library.nodes)
// 			{
// 				var subTypeTemplates = getTypeParams(subType);
// 				var typeObj = (subTypeTemplates.length > 0) ? 
// 					library.nodes[subBaseType].getInstance(subTypeTemplates) :
// 					library.nodes[subBaseType];
// 				if(typeObj != undefined && "operators" in typeObj)
// 				{
// 					var instanceTypeOperators = typeObj.operators;
// 				}
// 			}

// 			return {
// 				"fields" : [["first", "list"]],
// 				"builder" : function(fields, templates) 
// 				{	
// 					var list = [];
// 					var temp = templates;
					
// 					this.getBeforeStr = function()
// 					{
// 						return "";
// 					};

// 					this.getVal = function()
// 					{
// 						return "[]";
// 					}
					
// 					this.getType = function()
// 					{
// 						return mListType(temp[0]);
// 					}
// 				},
// 				"slots" : 
// 				{
// 					"pushBack" : 
// 					{
// 						"params" : [["e", subType]]
// 					}
// 				},
// 				"signals" : []
// 			}
// 		}
// 	},
// 	"dict" :
// 	{
// 		guessTypeParams : undefined, // TODO
// 		getInstance : function(templates)
// 		{
// 			return {
// 				"fields" : [["dict", dictType(templates[0])]],
// 				"builder" : function(fields) 
// 				{	
// 					var dict = fields.dict;
// 					var temp = templates;
// 					this.getBeforeStr = function()
// 					{
// 						return "";
// 					};

// 					this.getVal = function()
// 					{
// 						return "{}";
// 					}

// 					this.getType = function()
// 					{
// 						return dictType(templates[0], templates[1]);
// 					}
// 				}
// 			}
// 		}
// 	},
// 	"tuple" : {
// 		guessTypeParams : function(params)
// 		{
// 			return _.map(params, function(param){return param.getType();});
// 		},
// 		getInstance : function(templates)
// 		{
// 			var fieldsOperators = {}
// 			for(var i = 0; i < 2; i++)
// 			{
// 				var fieldType = templates[i];
// 				if(fieldType in nodes && "operators" in nodes[fieldType])
// 				{
// 					fieldsOperators[i] = nodes[fieldType].operators;
// 				}		
// 			}
// 			return {
// 				fields : _(_.range(templates.length))
// 					.zip(templates)
// 					.value(),
// 				builder : function func(fields) 
// 				{	
// 					this.fields = fields;

// 					var list = [];
// 					var temp = templates;
					
// 					this.getBeforeStr = function()
// 					{
// 						return "";
// 					};

// 					this.getNode = function()
// 					{
// 						return "new Tuple(" + "[" + _.map(this.fields, function(field)
// 							{
// 								return field.getNode();
// 							}).join(", ") + "])";
// 					}
					
// 					this.getVal = function()
// 					{
// 						return "[" + _.map(this.fields, function(field)
// 							{
// 								return field.getVal();
// 							}).join(", ") + "]";
// 					}

// 					this.getType = function()
// 					{
// 						return mt("tuple", templates);
// 					};
// 				}				
// 			}
// 		}
// 	}
// };

// nodes = _.merge(nodes, functions, function(node, func){return funcToNodeSpec(func);});

function Affectation(val, paths)
{
	this.val = val;
	this.paths = paths;
	this.affect = function(obj)
	{
		var val = this.val.get();
		for(var j = 0; j < this.paths.length; j++)
		{
			var path = this.paths[j];
			setPath(obj, path, val);
		}
	}
}
function CondAffectation(cond, thenAffects, elseAffects) {
	this.cond = cond;
	this.thenAffects = thenAffects;
	this.elseAffects = elseAffects;
	this.affect = function(obj)
	{
		if(this.cond.get())
		{
			_.forEach(this.thenAffects, function(affect){affect.affect(obj);});
		}
		else if(this.elseAffects != undefined)
		{
			_.forEach(this.elseAffects, function(affect){affect.affect(obj);});
		}
	};
}

function merge(dst, src)
{
	var ret = _.merge(_.cloneDeep(dst), src);
	return ret;
}

var list = 
{
	pushBack : function(l, e)
	{
		l.get().push(e.get());
	}
}

var actions=
{
}