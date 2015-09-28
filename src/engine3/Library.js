
// For treeEdit
function hit(vec)
{
	var hitResult = project.hitTest(new Point(vec.x, vec.y));
					
	if (!hitResult)
		return -1;

	return hitResult.item.data;
}

var globalRefs = [];
var globalReferencedNodes = [];

function indentToStr(indent)
{
	return Array(indent + 1).join("\t");
}

function SimpleString(str)
{
	this.str = str;
	
	this.getStr = function(indent)
	{
		return indentToStr(indent) + this.str;
	}
}

function Block(opening, closing, sep, lines, lineEnd)
{
	this.lines = lines == undefined ? [] : lines;
	this.lineEnd = lineEnd == undefined ? "" : lineEnd;
	this.opening = opening;
	this.closing = closing;
	this.sep = sep;

	this.addStr = function(line)
	{
		this.lines.push(new SimpleString(line));
	}

	this.addVar = function(name, val)
	{
		this.addStr("var " + name + (val == undefined ? "" : " = " + val));
	}

	this.addBlock = function(block)
	{
		this.lines.push(block);
	}

	this.addComposite = function(strs)
	{
		this.addBlock(compositeBlock(strs));
	}

	this.toStr = function(indent, lines)
	{
		// Complex case, at least one line
		if(lines.length > 0)
		{
			return "\n" + indentToStr(indent) + this.opening + "\n" + _.map(lines, function(line)
			{
				return line.getStr(indent + 1) + lineEnd;
			}).join(this.sep) + "\n" + indentToStr(indent) + this.closing + "\n";
		}
		// Simple case, no line, return only opening and closing symbols
		return this.opening + this.closing;
	}

	this.getStr = function(indent)
	{
		return this.toStr(indent, this.lines);
	}

	this.singleStr = function(indent, str)
	{
		return this.toStr(indent, [new SimpleString(str)]);
	}
}

function dictBlock()
{
	return new Block("{", "}", ",\n");
}

function stmntBlock(blocks)
{
	var b = new Block("{", "}", "", undefined, ";\n");
	if(blocks != undefined)
	{
		_.forEach(blocks, function(block){
			b.addBlock(block);
		});
	}
	return b;
}

function arrayBlock()
{
	return new Block("[", "]", ",\n");
}

function compositeBlock(strs)
{
	return	{
		getStr : function(indent)
		{
			return indentToStr(indent) + _.map(strs, function(str)
			{
				if(_.isString(str))
				{
					return str;
				}
				return str.getStr(indent);
			}).join("");
		}
	}
}

function check(test, str)
{
	if(!test)
		throw "Compilation error. " + str;
}


function typeToString(type)
{
	var baseType = getBaseType(type);
	var typeParams = getTypeParams(type);
	if(typeParams.length == 0)
	{
		return baseType;
	}
	return baseType + "<" + _.map(typeParams, typeToString).join(",") + ">";
}

function typeToCompactString(type)
{
	var baseType = getBaseType(type);
	var typeParams = getTypeParams(type);
	if(typeParams.length == 0)
	{
		return baseType;
	}
	var ret = baseType + "$" + (_.map(typeParams, typeToCompactString)).join("$");
	return ret;
}

function typeToJson(type)
{
	var baseType = getBaseType(type);
	var typeParams = getTypeParams(type);
	if(typeParams.length == 0)
	{
		return "\"" + baseType + "\"";
	}
	return "{base : \"" + baseType + "\",params : [" + _.map(typeParams, typeToJson).join(",") + "]}";
}

function isStrictSubType(checkedType, refType)
{
	var classDef = library.nodes[checkedType];
	var superClass = classDef.superClass;
	if(superClass)
	{
		if(superClass == refType)
		{
			return true;
		}
		return isStrictSubType(superClass, refType);
	}
}

function isSameOrSubType(checkedType, refType)
{
	var checkedBaseType = getBaseType(checkedType);
	var refBaseType = getBaseType(refType);
	if(checkedBaseType != refBaseType)
	{
		if(refBaseType == "float" && checkedBaseType == "int")
		{
			return true;
		}
		if(checkedType in library.nodes)
		{
			return isStrictSubType(checkedType, refType);
		}
		return false;
	}
	var checkedTypeParams = getTypeParams(checkedType);
	var refTypeParams = getTypeParams(refType);
	if(checkedTypeParams.length != refTypeParams.length)
	{
		return false;
	}

	// Empty list is always sub-type of any other list type
	if((checkedBaseType == "list") && (checkedTypeParams[0] == ""))
	{
		return true
	}

	// Empty dict is always sub-type of any other dict type
	if((checkedBaseType == "dict") && (checkedTypeParams[1] == ""))
	{
		return true
	}

	if(!(_(checkedTypeParams).zip(refTypeParams).map(function(types)
	{
		return isSameOrSubType(types[0], types[1]);
	}).every()))
	{
		return false;
	}
	return true;
}

function findCommonSuperClass(fstType, scdType)
{
	var fstBaseType = getBaseType(fstType);
	var classDef = library.nodes[fstBaseType];
	if(classDef)
	{
		var superClass = classDef.superClass;
		if(superClass)
		{
			if(isStrictSubType(scdType, superClass))
			{
				return superClass;
			}
			return findCommonSuperClass(superClass, scdType);
		}
	}
}

function getCommonSuperClass(fstType, scdType)
{
	// return the most generic of the two types
	if(isSameOrSubType(fstType, scdType))
		return scdType;
	if(isSameOrSubType(scdType, fstType))
		return fstType;
	var commonAncestor = findCommonSuperClass(fstType, scdType)
	if(commonAncestor != undefined)
		return commonAncestor;
	error("Type parameters are not compatible : " + typeToString(fstType) + " and " + typeToString(scdType))
	// return undefined;
}

function sameTypes(firstType, secondType)
{
	if(_.isString(firstType))
	{
		return _.isString(secondType) && firstType == secondType;
	}
	if(_.isString(secondType))
		return false;
	var firstTemplates = getTypeParams(firstType);
	var secondTemplates = getTypeParams(secondType);
	if(firstTemplates.length != secondTemplates.length)
		return false;
	_(firstTemplates).zip(secondTemplates).each(function(types)
	{
		if(!sameTypes(types[0], types[1]))
			return false;
	});
	return firstType.base == secondType.base;
}

function checkSameTypes(firstType, secondType)
{
	check(sameTypes(firstType, secondType), "Template types are different : " + typeToString(firstType) + " and " + typeToString(secondType));
}

function mt(base, params)
{
	return {
		base : base,
		params : params
	};
}

function inOut1(input, output)
{
	return {
		inputs : [input], 
		output : output
	};
}

function inOut2(in0, in1, output)
{
	return {
		inputs : [in0, in1], 
		output : output
	}
}

function inOut3(in0, in1, in3, output)
{
	return {
		inputs : [in0, in1, in3], 
		output : output
	}
}

function mf1(func1, inAndOutTypes)
{
	return {
		params : [["first", inAndOutTypes.inputs[0]]],
		getStr : function(params)	{	
			return func1(params[0]);
		},
		type : inAndOutTypes.output,
		getBeforeStr : function()
		{
			return "";
		}
	}
}

// Float (arithmetic) functions
function mff1(func1)
{
	return mf1
	(
		func1,
		inOut1("float", "float")
	)
}


function mtf1(func1, getInAndOutTypes, getTemplateFunc)
{
	return {
		guessTypeParams : function(params)
		{
			return [getTemplateFunc(params[0].getType())];
		},		
		build : function(templates)
		{
			var inAndOutTypes = getInAndOutTypes(templates[0]);
			return {
				params : [["first" , inAndOutTypes.inputs[0]]],
				getStr : function(params) 
				{	
					return func1(params[0]);
				},
				type : inAndOutTypes.output,
				getBeforeStr : function()
				{
					return "";
				}
			}
		},
		getType : function(templates)
		{
			return getInAndOutTypes(templates[0]);
		}
	}
}

function mt2f1(func1, getInAndOutTypes, guessTypeParamsFunc)
{
	return {
		guessTypeParams : function(params)
		{
			return guessTypeParamsFunc(params[0].getType());
		},		
		build : function(templates)
		{
			var inAndOutTypes = getInAndOutTypes(templates[0], templates[1]);
			return {
				params : [["first" , inAndOutTypes.inputs[0]]],
				getStr : function(params) 
				{	
					return func1(params[0]);
				},
				type : inAndOutTypes.output,
				getBeforeStr : function()
				{
					return "";
				}
			}
		}
	}
}

// List<T>->U (unknown) functions
function mluf1(func1, getOutType)
{
	return mtf1
	(
		function(list) // The function
		{	
			return func1(list);
		},
		function(template) // Input and output types
		{
			return inOut1(mListType(template), getOutType(template));
		},
		function(type)	// Template guess from input types
		{
			return getListTypeParam(type);
		}
	)
}

// List<T>->list<T> functions
function mllf1(func1)
{
	return mtf1
	(
		function(list) // The function
		{	
			return func1(list);
		},
		function(template) // Input and output types
		{
			return inOut1(mListType(template), mListType(template));
		},
		function(type)	// Template guess from input types
		{
			return getListTypeParam(type);
		}
	)
}
	
function mf2(func2, inAndOutTypes)
{
	return {
		params : [["first", inAndOutTypes.inputs[0]], ["second", inAndOutTypes.inputs[1]]],
		getStr : function(params) 
		{	
			return func2(params[0], params[1]);
		},
		type : inAndOutTypes.output,
		getBeforeStr : function()
		{
			return "";
		}
	}
}


// Float functions
function mff2(func2)
{
	return mf2
	(
		func2,
		inOut2("float", "float", "float")
	)
}



// Comparison functions
function mcf2(func2)
{
	return mf2
	(
		func2,
		inOut2("float", "float", "bool")
	)
}

// Boolean (logical) functions
function mbf2(func2)
{
	return mf2
	(
		func2,
		inOut2("bool", "bool", "bool")
	)
}

function mtf2(func2, getInAndOutTypes, getTemplateFunc)
{
	return {
		guessTypeParams : function(params)
		{
			return [getTemplateFunc(params[0].getType(), params[1].getType())];
		},		
		build : function(templates)
		{
			var inAndOutTypes = getInAndOutTypes(templates[0]);
			return {
				params : [["first" , inAndOutTypes.inputs[0]], ["second" , inAndOutTypes.inputs[1]]],
				getStr : function(params) 
				{	
					return func2(params[0], params[1]);
				},
				type : inAndOutTypes.output,
				getBeforeStr : function()
				{
					return "";
				}
			}
		},
		getType : function(templates)
		{
			return getInAndOutTypes(templates[0]);
		}
	}
}

// Arithmetic (take float and int) functions
// Beware : implicit cast if mixing int and float, not dangerous in javascript
function maf2(func2)
{
	return mtf2
	(
		func2,
		function(template) // Input and output types
		{
			return inOut2(template, template, template);
		},
		function(x, y)	// Template guess from input types
		{
			return(getCommonSuperClass(x, y));
		}
	)
}

function mt2f2(func2, getInAndOutTypes, guessTypeParamsFunc)
{
	return {
		guessTypeParams : function(params)
		{
			return guessTypeParamsFunc(params[0].getType(), params[1].getType());
		},		
		build : function(templates)
		{
			var inAndOutTypes = getInAndOutTypes(templates[0], templates[1]);
			return {
				params : [["first" , inAndOutTypes.inputs[0]], ["second" , inAndOutTypes.inputs[1]]],
				func : function(params) 
				{	
					return func2(params[0], params[1]);
				},
				type : inAndOutTypes.output
			}
		}
	}
}

function mf3(func3, inAndOutTypes)
{
	return {
		params : [["first", inAndOutTypes.inputs[0]], ["second", inAndOutTypes.inputs[1]], ["third", inAndOutTypes.inputs[2]]],
		func : function(params) 
		{	
			return func3(params[0], params[1], params[2]);
		},
		type : inAndOutTypes.output
	}
}

// Float (arithmetic) functions
function mff3(func3)
{
	return mf3
	(
		func3,
		inOut2("float", "float", "float", "float")
	)
}

function mtf3(func3, getInAndOutTypes, getTemplateFunc)
{
	return {
		guessTypeParams : function(params)
		{
			return [getTemplateFunc(params[0].getType(), params[1].getType(), params[2].getType())];
		},		
		build : function(templates)
		{
			var inAndOutTypes = getInAndOutTypes(templates[0]);
			return {
				params : [["first" , inAndOutTypes.inputs[0]], ["second" , inAndOutTypes.inputs[1]], ["third" , inAndOutTypes.inputs[2]]],
				func : function(params) 
				{	
					return func3(params[0], params[1], params[2]);
				},
				type : inAndOutTypes.output
			}
		}
	}
}

function mt3f3(func3, getInAndOutTypes, guessTypeParamsFunc)
{
	return {
		guessTypeParams : function(params)
		{
			return guessTypeParamsFunc(params[0].getType(), params[1].getType(), params[2].getType());
		},		
		build : function(templates)
		{
			var inAndOutTypes = getInAndOutTypes(templates[0], templates[1], templates[2]);
			return {
				params : [["first" , inAndOutTypes.inputs[0]], ["second" , inAndOutTypes.inputs[1]], ["third" , inAndOutTypes.inputs[2]]],
				func : function(params) 
				{	
					return func3(params[0], params[1], params[2]);
				},
				type : inAndOutTypes.output
			}
		}
	}
}

function Random(max)
{
	this.max = max
	this.slots = {};
	this.signal = function(v)
	{
		var val =  Math.floor(Math.random() * this.max.get());
		for(var i = 0; i < this.slots.length; i++)
		{
			// TODO gerer autre chose que store ?
			this.slots[i].set(val);
		}
	};
	this.getType = function()
	{
		return "int";
	}
}

function makeRandom() 
{	
	return {
		"fields" : [["max", "float"]],
		"builder" : function(fields)
		{
			return new Var("", "new Random(" + fields.max.getNode() + ")", "int");
		}
	};
}

function makeRandomList() 
{	
	function Random(fields)
	{
		this.max = fields.max
		this.length = fields.length
		this.slots = {};
		this.signal = function(v)
		{
			var max = this.max.get();
			var length = this.length.get();
			var val = new Array(length);
			for(var i = 0; i < length; i++)
			{
				val[i] = Math.floor(Math.random() * max);
			}
			for(var i = 0; i < this.slots.length; i++)
			{
				this.slots[i].signal(val);
			}
		};
		this.getType = function()
		{
			return mListType("int");
		}
	}

	return {
		"fields" : [["max", "float"], ["length", "int"]],
		"builder" : Random
	};
}

function Store(v) 
{
	this.val = v;

	this.get = function(path)
	{
		return this.val;
	};
}

function Range(sources, fields)
{
	// this.list = val.eval();
	this.start = sources[0];
	this.stop = sources[1];

	this.get = function()
    {
		var start = this.start.eval();
		var stop = this.stop.eval();
		var array = new Array(stop - start + 1);
		for(var i = 0; i < array.length; i++)
		{
			array[i] = i + start;
		}
		return array;
    }
	
	this.update = function(l)
	{
		return this.eval();
	}
	
	this.getType = function()
	{
		return "Range";
	}
}

function mListType(temp)
{
	return mt("list", [temp]);
}

function dictType(keyType, valType)
{
	return mt("dict", [keyType, valType]);
}

function checkList(type)
{
	check(getBaseType(type) == "list", "Type " + getBaseType(type) + " is not a list");
}

function checkDictType(type)
{
	check(getBaseType(type) == "dict", "Type " + getBaseType(type) + " is not a dict");
}

function checkFuncType(type)
{
	check(_.isPlainObject(type) && ("inputs" in type) && ("output" in type), "Type " + getBaseType(type) + " is not a function");
}

function getListTypeParam(type)
{
	checkList(type);
	return getTypeParams(type)[0];
}

function getDictTypeParam(type)
{
	checkDictType(type);
	return getTypeParams(type)[0];
}

function getOutType(type)
{
	checkFuncType(type);
	return type.output;
}

function getFuncType(funcProto, templateParams)
{
	
	if("getTemplate" in funcProto)
	{
		var funcTemplate = funcProto.getTemplate();
		return funcTemplate.getType(templateParams);
	}
	else
		return funcProto.getType();
}

function pushFront(a, v)
{	
	// TODO optim
	var newA = _.clone(a);
	newA.unshift(v);
	return newA;
};

function pushBack(a, v)
{	
	var newA = _.clone(a);
	newA.push(v);
	return newA;
}

function _contains(array, val, func)
{
	var arrayVal = array.get();
	var arrayLength = arrayVal.length;
	var funcInstance = func;
	var valValue = val.get();
	for(var i = 0; i < arrayLength; i++)
	{
		if(funcInstance(arrayVal[i], valValue))
		{
			return true;
		}
	}
	return false;
}

function unzip(list)
{
	if(list.length == 0)
		return [[],[]];
	return _.zip(list);
}

function head(list) // The function
{	
	return _.head(list);
}

function tail(list) // The function
{	
	return _.tail(list);
}

function at(array, index) // The function
{	
	if(index < array.length && index >= 0)
		return array[index];
	// TODO version generique (ici seulement pour list de bool)
	return false;
}

function eq(first, second)
{	
	return first == second;
}

function findAllMatches(re, str) 
{
	if(re.test(str))
	{
		// TODO improve
		var ret = [[RegExp.$1, RegExp.$2, RegExp.$3, RegExp.$4]];
		return ret;
	}
	return [];

}

function maybeAt(array, index)
{	
	if(index < array.length && index >= 0)
	{
		return {
			__type : {
				base : "Just",
				params : ["regmatch"]
			},
			x : array[index]
		}
	}
	return {
		__type : {
			base : "None",
			params : ["regmatch"]
		}
	}
}

var functions = 
{
	"head" : mluf1
	(
		function(list) // The function
		{	
			return "_.head(" + list + ")";
		},
		function(template) // Output type
		{
			return template;
		}
	),
	"tail" : mllf1
	(
		function(list) // The function
		{	
			return "_.tail(" + list + ")";
		}
	),
	flatten : mtf1
	(
		function(list) // The function
		{	
			return "_.flatten(" + list + ", true)";
		},
		function(template) // Input and output types
		{
			return inOut1(mt("list", mt("list", [template])), mt("list", [template]));
		},
		function(paramType)	// Template guess from input types
		{
			return getListTypeParam(getListTypeParam(paramType));
		}
	),
	range : mf2
	(
		function (start, stop) 
		{
			return "_.range("+start+","+stop+")";			
		},
		inOut2("int", "int", mt("list", ["int"]))
	),
	"neg" : mff1(function (x) {return "-" + x;}),
	"+" : maf2(function (x, y) {return x + "+" + y;}),
	"-" : maf2(function (x, y){return x + "-" + y;}),
    "*" : maf2(function (x, y) {return x + "*" + y;}),
    "/" : maf2(function (x, y) {return x + "/" + y;}),
	"<" : mcf2(function (x, y) {return x + "<"  + y;}),
	">" : mcf2(function (x, y) {return x + ">" + y;}),
	"<=" : mcf2(function (x, y) {return x + "<=" + y;}),
	">=" : mcf2(function (x, y) {return x + ">=" + y;}),
	"eq" : 	mtf2
	(
		function(first, second) // The function
		{	
			return first + "==" + second;
		},
		function(template) // Input and output types
		{
			return inOut2(template, template, "bool");
		},
		function(firstType, secondType)	// Template guess from input types
		{
			// TODO checkSubType
			checkSameTypes(firstType, secondType);
			return firstType;
		}
	),
	"==" : 	mtf2
	(
		function(first, second) // The function
		{	
			return first + "==" + second;
		},
		function(template) // Input and output types
		{
			return inOut2(template, template, "bool");
		},
		function(firstType, secondType)	// Template guess from input types
		{
			// TODO checkSubType
			checkSameTypes(firstType, secondType);
			return firstType;
		}
	),
	"!=" : mtf2
	(
		function(first, second) // The function
		{	
			return first + "!=" + second;
		},
		function(template) // Input and output types
		{
			return inOut2(template, template, "bool");
		},
		function(firstType, secondType)	// Template guess from input types
		{
			// TODO checkSubType
			checkSameTypes(firstType, secondType);
			return firstType;
		}
	),
	"||" : mbf2(function (x, y) {return x + "||" + y;}),
	"&&" : mbf2(function (x, y) {return x + "&&" + y;}),
	"!" : mf1
	(
		function (x) {return "!" + x;},
		inOut1("bool", "bool")
	),
	"mod" :  mf2
	(
		function (x, y) 
		{
			return "(" + x + "+" + y + ") %" + y; // We don't want negative number
		},
		inOut2("int", "int", "int")
	),
	"min" : mff2(function (x, y) {return x + ">" + y + "?" + y + ":" + x;}), 
	"max" : mff2(function (x, y) {return x + "<" + y + "?" + y + ":" + x;}), 
	"clamp" : mff3(function (x, min, max) {return x + "<" + min + "?" + min + ":" + x + ">"  + max + "?" + max + ":" + x}),
	"abs" : mff1(function (x) 
	{
		return "Math.abs(" + x + ")";
	}),
	"round" : mff1(function (x) 
	{
		return "Math.floor(" + x + " + .5)";
	}),
	"floor" : mf1(
		function (x){return "Math.floor(" + x + ")";},
		inOut1("float", "int")
	), 
	"concat" : mtf2
	(
		function(first, second) // The function
		{	
			return first + ".concat(" + second + ")";
		},
		function(template) // Input and output types
		{
			return inOut2(mListType(template), mListType(template), mListType(template));
		},
		function(firstType, secondType)	// Template guess from input types
		{
			var firstTemplate = getListTypeParam(firstType);
			var secondTemplate = getListTypeParam(secondType);
			var mostGenericType = getCommonSuperClass(firstTemplate, secondTemplate);
			return mostGenericType;
		}
	),
	"pushFront" :  mtf2
	(
		function(a, v) // The function
		{	
			return "pushFront(" + a + ", " + v + ")";
		},
		function(template) // Input and output types
		{
			return inOut2(mListType(template), template, mListType(template));
		},
		function(listType, itemType)	// Template guess from input types
		{
			var template = getListTypeParam(listType);
			// TODO checkSubType
			//checkSameTypes(template, itemType);
			return itemType;
		}
	),
	"pushBack" :  mtf2
	(
		function(a, v) // The function
		{	
			return "pushBack(" + a + ", " + v + ")";
		},
		function(template) // Input and output types
		{
			return inOut2(mListType(template), template, mListType(template));
		},
		function(listType, itemType)	// Template guess from input types
		{
			var template = getListTypeParam(listType);
			// TODO checkSubType
			//checkSameTypes(template, itemType);
			return itemType;
		}
	),
	"popBack" : mllf1(function (a)
		{
			return "_.initial(" + a + ")";
		}),
	"slice" : mtf3
		(
			function (a, start, stop) {return a + ".slice(" + start + ", " + stop + ")";},
			function(template) // Input and output types
			{
				return inOut3
				(
					mListType(template), 
					"int",
					"int",
					mListType(template)
				);
			},
			function(listType, startType, stopType)	// Template guess from input types
			{
				check(startType == "int", "Slice start parameter is not an int");
				check(stopType == "int", "Slice stop parameter is not an int");
				return getListTypeParam(listType);
			}
		),
	"length" : mluf1
	(
		function(list) // The function
		{	
			return list + ".length";
		},
		function(template) // Output type
		{
			return "int";
		}
	),
	"any" :  mluf1 // TODO limiter a listes de bool
	(
		function(list) // The function
		{	
			return "_.any(" + list + ")";
		},
		function(template) // Output type
		{
			return "bool";
		}
	),
	"none" : mluf1 // TODO limiter a listes de bool
	(
		function(list) // The function
		{	
			return "!(_.any(" + list + "))";
		},
		function(template) // Output type
		{
			return "bool";
		}
	),
	"sqr" : mff1(function (x) {return x * x;}),
	"remove": mtf2
	(
		function(array, index) // The function
		{	
			if(index < array.length && index >= 0)
			{
				array.splice(index, 1);
			}
			// TODO version generique (ici seulement pour list de bool)
			return array;
		},
		function(template) // Input and output types
		{
			return inOut2(mListType(template), "int", mListType(template));
		},
		function(listType, indexType)	// Template guess from input types
		{
			var template = getListTypeParam(listType);
			return template;
		}
	),
	"at": mtf2
	(
		function(array, index) // The function
		{	
			return "at(" + array + ", " + index + ")";
		},
		function(template) // Input and output types
		{
			return inOut2(mListType(template), "int", template);
		},
		function(listType, indexType)	// Template guess from input types
		{
			var template = getListTypeParam(listType);
			return template;
		}
	),
	"maybeAt": mtf2
	(
		function(array, index) // The function
		{	
			return "maybeAt(" + array + ", " + index + ")";
		},
		function(template) // Input and output types
		{
			return inOut2(mListType(template), "int", mt("Maybe", [template]));
		},
		function(listType, indexType)	// Template guess from input types
		{
			var template = getListTypeParam(listType);
			return template;
		}
	),
	"zip" :  mt2f2
	(
		function(first, second) // The function
		{	
			return _.zip(first, second);
		},
		function(firstTemplate, secondTemplate) // Input and output types
		{
			return inOut2(mListType(firstTemplate), mListType(secondTemplate), mt("list", [mt("tuple", [firstTemplate, secondTemplate])]));
		},
		function(firstList, secondList)	// Template guess from input types
		{
			var firstTemplate = getListTypeParam(firstList);
			var secondTemplate = getListTypeParam(secondList);
			return [firstTemplate, secondTemplate];
		}
	),
	"unzip" :  mt2f1
	(
		function(list) // The function
		{	
			return "unzip(" + list + ")";
		},
		function(firstTemplate, secondTemplate) // Input and output types
		{
			return inOut1(mt("list", mt("tuple", [firstTemplate, secondTemplate])), mt("tuple", [mListType(firstTemplate), mListType(secondTemplate)]));
		},
		function(listType)	// Template guess from input types
		{
			var listTemplate = getListTypeParam(listType);
			check(getBaseType(listTemplate) == "tuple", "List template is not a tuple : " + getBaseType(listTemplate));
			var tupleTemplates = getTypeParams(listTemplate);
			check(tupleTemplates.length == 2, "Tuple doesn't have 2 templates : " + tupleTemplates.length);
			return tupleTemplates;
		}
	),
	"zip3" :  mt3f3
	(
		function(first, second, third) // The function
		{	
			return _.zip(first, second, third);
		},
		function(firstTemplate, secondTemplate, thirdTemplate) // Input and output types
		{
			return inOut3
			(
				mListType(firstTemplate), 
				mListType(secondTemplate), 
				mListType(thirdTemplate), 
				mt("list", [mt("tuple", [firstTemplate, secondTemplate, thirdTemplate])])
			);
		},
		function(firstList, secondList, thirdList)	// Template guess from input types
		{
			var firstTemplate = getListTypeParam(firstList);
			var secondTemplate = getListTypeParam(secondList);
			var thirdTemplate = getListTypeParam(thirdList);
			return [firstTemplate, secondTemplate, thirdTemplate];
		}
	),
	strCat : mf2
	(
		function (fst, scd) 
		{
			return fst + " + " + scd;
		},
		inOut2("string", "string", "string")
	),
	strToList : mf1
	(
		function (str) 
		{
			return str + ".split(\"\")";
		},
		inOut1("string", mListType("string"))
	),
	strToInt : mf1
	(
		function (str) 
		{
			return "parseInt(" + str + ")";
		},
		inOut1("string", "int")
	),
	intToStr : mf1
	(
		function (x) 
		{
			return x + ".toString()";
		},
		inOut1("int", "string")
	),
	re : mf1
	(
		function (str) 
		{
			return "new RegExp(" + str + ")";
		},
		inOut1("string", "regex")
	),
	findAllMatches : mf2
	(
		function (re, str) 
		{
			return "findAllMatches(" + re + ", " + str + ")";
		},
		inOut2("regex", "string", mListType("regmatch"))
	),
	group1 : mf1
	(
		function (match) 
		{
			return match[0];
		},
		inOut1("regmatch", "string")
	),
	group2 : mf1
	(
		function (match) 
		{
			return match[1];
		},
		inOut1("regmatch", "string")
	),
	"map" : {
		guessTypeParams : function(params)
		{
			var list = params[1];
			var listTypeParam = getListTypeParam(list.getType());	
			// If the function is generic
			if(params[0].template)
			{
				// Use the type param of the list to get the concrete type of the function
				var tmp = new Store(null, listTypeParam);
				var funcTemplates = params[0].template.guessTypeParams([tmp]);
				var funcType = getFuncType(params[0], funcTemplates);
			}
			else
			{
				var funcType = params[0].getType();
			}
			return [listTypeParam, getOutType(funcType)];
		},		
		build : function(templates)
		{
			if(templates.length < 2)
			{
				error("Only " + templates.length + " generic parameter given for map function, need 2");
			}
			return {
				params : [["function" , inOut1(templates[0], templates[1])], ["list" , mListType(templates[0])]],
				getStr : function(params) 
				{	
					return "_.map(" + params[1] + ", " + params[0] + ")";					
				},
				type : mListType(templates[1]),
				templates : templates,
				getBeforeStr : function()
				{
					return "";
				}
			}
		}
	},
	"flatMap" : {
		guessTypeParams : function(params)
		{
			var list = params[1];
			var temp0 = getListTypeParam(list.getType());	
			if(params[0].template)
			{
				var tmp = new Store(null, temp0);
				var funcTemplates = params[0].template.guessTypeParams([tmp]);
				// var funcType = getFuncType(params[0], [temp0]);
				var funcType = getFuncType(params[0], funcTemplates);
			}
			else
			{
				var funcType = params[0].getType();
			}
			return [temp0, getListTypeParam(getOutType(funcType))];
		},		
		build : function(templates)
		{
			function instance(templates)
			{
				this.params = [["function" , inOut1(templates[0], mListType(templates[1]))], ["list" , mListType(templates[0])]];
				this.needsNodes = true;
				this.arrayAccess = new ArrayAccess(null, mListType(templates[0]));
				this.getStrRef = function(params) 
				{	
					return "_(" + params[1] + ".get()).map(function(val){return " + params[0] + "(val);}).flatten(true).value()";
				};
				this.type = mListType(templates[1]);
				this.templates = templates;
				this.getBeforeStr = function()
				{
					return "";
				}
			}
			return new instance(templates)
		}
	},
	"reduce" : { // Use first element of list as starting accumulator
		guessTypeParams : function(params)
		{
			var list = params[1];
			var temp0 = getListTypeParam(list.getType());
			var funcType = getFuncType(params[0], [temp0]);
			return [temp0, funcType.output];
		},		
		build : function(templates)
		{
			function instance(templates)
			{
				this.params = [["function" , inOut2(templates[1], templates[0], templates[1])], ["list" , mListType(templates[0])]];
				this.needsNodes = true;
				this.getStrRef = function(params) 
				{	
					return "_.reduce(" + params[1] + ".get(), function(accum, val){return " + params[0] + "(accum ,val);})";
				};
				this.getBeforeStr = function()
				{
					return "";
				}
				this.type = templates[1];
				this.templates = templates;
			}

			return new instance(templates);
		}
	},
	"fold" : { // need starting accumulator
		guessTypeParams : function(params)
		{
			var list = params[1];
			var temp0 = getListTypeParam(list.getType());
			var funcType = getFuncType(params[0], [temp0]);
			return [temp0, funcType.output];
		},		
		build : function(templates)
		{
			function instance(templates)
			{
				this.params = [["function" , inOut2(templates[1], templates[0], templates[1])], ["list" , mListType(templates[0])], ["start" , templates[1]]];
				this.needsNodes = true;
				this.getStrRef = function(params) 
				{	
					return "_.reduce(" + params[1] + ".get(), function(accum, val){return " + params[0] + "(accum ,val);}," + params[2] + ".get())";
				};
				this.getBeforeStr = function()
				{
					return "";
				};
				this.type = templates[1];
				this.templates = templates;
			}

			return new instance(templates);
		}
	},
	"contains" : {
		guessTypeParams : function(params)
		{
			var list = params[0];
			var item = params[1];
			var tempType = getListTypeParam(list.getType());
			checkSameTypes(tempType, item.getType());
			var funcType = getFuncType(params[2], [tempType]);
			
			// TODO : check func type
			return [tempType];
		},
		build : function(templates)
		{
			function instance(templates)
			{
				this.params = [["list" , mListType(templates[0])], ["item" , templates[0]], ["function" , inOut2(templates[0], templates[0], "bool")]];
				this.needsNodes = true;
				this.templates = templates;
				this.type = "bool";
				this.getBeforeStr = function()
				{
					return "";					
				}

				this.getStrRef = function(params)
				{
					return "_contains(" + params + ")";
				}
			}
			return new instance(templates);
		}
	},
	"merge" :
	{
		guessTypeParams : function(params)
		{
			var dst = params[0];
			var src = params[1];
			var srcParams = getDictTypeParam(src.getType());
			var dstParams = getDictTypeParam(dst.getType());
			checkSameTypes(srcParams[0], dstParams[0]);
			checkSameTypes(srcParams[1], dstParams[1]);			
			return srcParams;
		},
		build : function(templates)
		{
			return {
				params : 
				[
					["dst" , dictType(templates[0], templates[1])], 
					["src" , dictType(templates[0], templates[1])]
				],
				getStr : function(params) 
				{	
					// return "_.merge(_.cloneDeep(" + params[0] + "), " + params[1] + ")";
					return "merge(" + params[0] + ", " + params[1] + ")"
				},
				type : dictType("string", templates[0]),
				templates : templates,
				getBeforeStr : function()
				{
					return "";
				}
			}
		}
	}
};

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

var nodes = 
{
	"string" :
	{
		operators :
		{
			signal : function()
			{
				// TODO
			},
		}
	},
	"int" :
	{
		operators :
		{
			signal : function()
			{
				// TODO
			}
		}
	},
	"char" :
	{
		operators :
		{
			signal : function()
			{
				// TODO
			}
		}
	},
	"bool" :
	{
		operators :
		{
			signal : function()
			{
				// TODO
			}
		}
	},
	"contains" : 
	{
		"fields" : [["first", "float"], ["second", "float"], ["third", "float"]],
		"builder" : function(fields) 
		{	
			var a = fields.first;
			var v = fields.second;
			var third = fields.third;
			//var f = third.build(third.guessTypeParams(v));

			// TODO version template
			var funcType = third.type;
			var func = third.func;
			this.get = function()
			{
				var array = a.get();
				var val = v.get();
				
				for(var i = 0; i < array.length; i++)
				{
					if(func([array[i], val]))
						return true;
				}
				return false;
			};		
		}
	},
	"Random" : makeRandom(),
	"RandomList" : makeRandomList(),
    "if" :  
	{
		guessTypeParams : function(params)
		{
			var condType = params[0].getType();
			checkSameTypes(condType, "bool");
			
			var fstType = params[1].getType();
			var scdType = params[2].getType();
			
			var mostGenericType = getCommonSuperClass(fstType, scdType);
			if(mostGenericType != undefined)
				return [mostGenericType];
			error("\"If\" parameters are not of compatible types : " + typeToString(fstType) + " and " + typeToString(scdType))
		},
		getInstance : function(templates)
		{
			var typeParam = templates[0];

			return {
				"fields" : [["first", "bool"], ["second", typeParam], ["third", typeParam]],
				"builder" : function(fields) 
				{	
					var cond = fields.first;
					var first = fields.second;
					var second = fields.third;
					
					this.type = "if";

					this.beforeStr = cond.getBeforeStr() + first.getBeforeStr() + second.getBeforeStr();
					var str = "if(" + cond.getVal() + "){return " + first.getVal() + ";}else{return " + second.getVal() + ";}";
					this.nodeStr = "new _Func(function(){ " + str + ";}, " + typeToJson(typeParam) + ")"
					this.val = cond.getVal() + " ? " + first.getVal() + " : " + second.getVal();
					
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
						return this.val;
					}

					this.get = function()
					{
						if(cond.get())
						{
							return first.get();
						}
						return second.get();
					};

					this.getType = function(){
							// TODO check first and second type compatibles
							return second.getType();
					};
					this.addSink = function(sink)
					{
						cond.addSink(sink);
						first.addSink(sink);
						second.addSink(sink);
					};
				}
			}
		}
	},
	"list" :
	{
		guessTypeParams : undefined, // TODO
		getInstance : function(templates)
		{
			var subType = templates[0];
			var subBaseType = getBaseType(subType);
			if(subBaseType in library.nodes)
			{
				var subTypeTemplates = getTypeParams(subType);
				var typeObj = (subTypeTemplates.length > 0) ? 
					library.nodes[subBaseType].getInstance(subTypeTemplates) :
					library.nodes[subBaseType];
				if(typeObj != undefined && "operators" in typeObj)
				{
					var instanceTypeOperators = typeObj.operators;
				}
			}

			return {
				"fields" : [["first", "list"]],
				"builder" : function(fields, templates) 
				{	
					var list = [];
					var temp = templates;
					
					this.getBeforeStr = function()
					{
						return "";
					};

					this.getVal = function()
					{
						return "[]";
					}
					
					this.getType = function()
					{
						return mListType(temp[0]);
					}
				},
				"slots" : 
				{
					"pushBack" : 
					{
						"params" : [["e", subType]]
					}
				},
				"signals" : []
			}
		}
	},
	"dict" :
	{
		guessTypeParams : undefined, // TODO
		getInstance : function(templates)
		{
			return {
				"fields" : [["dict", dictType(templates[0])]],
				"builder" : function(fields) 
				{	
					var dict = fields.dict;
					var temp = templates;
					this.getBeforeStr = function()
					{
						return "";
					};

					this.getVal = function()
					{
						return "{}";
					}

					this.getType = function()
					{
						return dictType(templates[0], templates[1]);
					}
				}
			}
		}
	},
	"tuple" : {
		guessTypeParams : function(params)
		{
			return _.map(params, function(param){return param.getType();});
		},
		getInstance : function(templates)
		{
			var fieldsOperators = {}
			for(var i = 0; i < 2; i++)
			{
				var fieldType = templates[i];
				if(fieldType in nodes && "operators" in nodes[fieldType])
				{
					fieldsOperators[i] = nodes[fieldType].operators;
				}		
			}
			return {
				fields : _(_.range(templates.length))
					.zip(templates)
					.value(),
				builder : function func(fields) 
				{	
					this.fields = fields;

					var list = [];
					var temp = templates;
					
					this.getBeforeStr = function()
					{
						return "";
					};

					this.getNode = function()
					{
						return "new Tuple(" + "[" + _.map(this.fields, function(field)
							{
								return field.getNode();
							}).join(", ") + "])";
					}
					
					this.getVal = function()
					{
						return "[" + _.map(this.fields, function(field)
							{
								return field.getVal();
							}).join(", ") + "]";
					}

					this.getType = function()
					{
						return mt("tuple", templates);
					};
				}				
			}
		}
	}
};

nodes = _.merge(nodes, functions, function(node, func){return funcToNodeSpec(func);});

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