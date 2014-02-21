function check(test, str)
{
	if(!test)
		throw "Compilation error. " + str;
}

function sameTypes(firstType, secondType)
{
	if(_.isString(firstType))
	{
		return _.isString(secondType) && firstType == secondType;
	}
	if(_.isString(secondType))
		return false;
	var firstTemplates = getTemplates(firstType);
	var secondTemplates = getTemplates(secondType);
	if(firstTemplates.length != secondTemplates.length)
		return false;
	_(firstTemplates).zip(secondTemplates).each(function(types)
	{
		if(!sameTypes(types[0], types[1]))
			return false;
	});
	return true;
}

function checkSameTypes(firstType, secondType)
{
	check(sameTypes(firstType, secondType), "Template types are different, cannot instantiate function");
}

function makeTemplate(base, templates)
{
	return {
		base : base,
		templates : templates
	};
}

function mt(base, templates)
{
	return {
		base : base,
		templates : templates
	};
}

function makeFunction1(func1, getTypeFunc, name)
{
	function func(fields) 
	{	
		var first = fields.first;
		this.get = function()
		{
			return func1(first.get());
		};
		this.getType = function()
		{
			// TODO
			return getTypeFunc(first);
		};
		this.name = name;
	}
	
	return {
		"fields" : [["first", "float"]],
		"builder" : func
	}
}

function makeFunction2(func2, getTypeFunc, name)
{
	function func(fields) 
	{	
		var first = fields.first;
		var second = fields.second;
		this.get = function()
		{
			return func2(first.get(), second.get());
		};
		this.getType = function()
		{
			// TODO
			return getTypeFunc(first, second);
		};
		this.name = name;
	}
	
	return {
		"fields" : [["first", "float"], ["second", "float"]],
		"builder" : func
	}
}

function makeFunction3(func3, getTypeFunc)
{
	function func(fields) 
	{	
		var first = fields.first;
		var second = fields.second;
		var third = fields.third;
		this.get = function()
		{
			return func3(first.get(), second.get(), third.get());
		};
		this.getType = function()
		{
			// TODO
			return getTypeFunc(first, second, third);
		};
	}
	
	return {
		"fields" : [["first", "float"], ["second", "float"], ["third", "float"]],
		"builder" : func
	}
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
		func : function(params)	{	
			return func1(params[0]);
		},
		type : inAndOutTypes.output
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
		getTemplates : function(params)
		{
			return [getTemplateFunc(params[0].getType())];
		},		
		build : function(templates)
		{
			var inAndOutTypes = getInAndOutTypes(templates[0]);
			return {
				params : [["first" , inAndOutTypes.inputs[0]]],
				func : function(params) 
				{	
					return func1(params[0]);
				},
				type : inAndOutTypes.output
			}
		},
		getType : function(templates)
		{
			return getInAndOutTypes(templates[0]);
		}
	}
}

function mt2f1(func1, getInAndOutTypes, getTemplatesFunc)
{
	return {
		getTemplates : function(params)
		{
			return getTemplatesFunc(params[0].getType());
		},		
		build : function(templates)
		{
			var inAndOutTypes = getInAndOutTypes(templates[0], templates[1]);
			return {
				params : [["first" , inAndOutTypes.inputs[0]]],
				func : function(params) 
				{	
					return func1(params[0]);
				},
				type : inAndOutTypes.output
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
			return inOut1(listTemp(template), getOutType(template));
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
			return inOut1(listTemp(template), listTemp(template));
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
		func : function(params) 
		{	
			return func2(params[0], params[1]);
		},
		type : inAndOutTypes.output
	}
}

// Float (arithmetic) functions
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
		getTemplates : function(params)
		{
			return [getTemplateFunc(params[0].getType(), params[1].getType())];
		},		
		build : function(templates)
		{
			var inAndOutTypes = getInAndOutTypes(templates[0]);
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

function mt2f2(func2, getInAndOutTypes, getTemplatesFunc)
{
	return {
		getTemplates : function(params)
		{
			return getTemplatesFunc(params[0].getType(), params[1].getType());
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
		getTemplates : function(params)
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

function mt3f3(func3, getInAndOutTypes, getTemplatesFunc)
{
	return {
		getTemplates : function(params)
		{
			return getTemplatesFunc(params[0].getType(), params[1].getType(), params[2].getType());
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

// function mtf3(func3, getTemplatesFunc)
// {
	// return 
	// {
		// getTemplates : function(params)
		// {
			// return getTemplatesFunc(params[0], params[1], params[2]);
		// },		
		// build : function(templates)
		// {
			// return {
				// params : [["list" , makeTemplate("list", makeTemplate("list", [templates[0]]))]],
				// func : function(params) 
				// {	
					// return _.flatten(params[0].get());
				// },
				// type : makeTemplate("list", [templates[0]])
			// }
		// }
	// }
// }	

function makeRandom() 
{	
	function Random(fields)
	{
		this.max = fields.max
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

	return {
		"fields" : [["max", "float"]],
		"builder" : Random
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
			return {base : "list", templates : ["int"]};
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

function listTemp(temp)
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
	check(getBaseType(type) == "dict", "Type " + getBaseType(type) + " is not a list");
}

function checkFuncType(type)
{
	check(_.isPlainObject(type) && ("inputs" in type) && ("output" in type), "Type " + getBaseType(type) + " is not a function");
}

function getListTypeParam(type)
{
	checkList(type);
	return getTemplates(type)[0];
}

function getDictTypeParams(type)
{
	checkDictType(type);
	return getTemplates(type)[0];
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

var functions = 
{
	// "map" : function(templates)
	// {
		// return {
			// params : [makeTemplate("function", templates), makeTemplate("list", [templates[0]])],
			// func : function(params) 
			// {	
				// var func = params[0];
				// var array = params[1].get();
				// return _.map(array, function(item)
				// {
					// return func(item);
				// });
				
				
			// },
			// getType : function(params)
			// {
				// return makeTemplate("list", [templates[1]]);
			// }
		// }
	// },
	"head" : mluf1
	(
		function(list) // The function
		{	
			return _.head(list);
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
			return _.tail(list);
		}
	),
	flatten : mtf1
	(
		function(list) // The function
		{	
			return _.flatten(list, true);
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
	eq : mtf2
	(
		function(first, second) // The function
		{	
			return first == second;
		},
		function(template) // Input and output types
		{
			return inOut2(template, template, "bool");
		},
		function(firstType, secondType)	// Template guess from input types
		{
			checkSameTypes(firstType, secondType);
			return firstType;
		}
	),
	range : mf2
	(
		function (start, stop) 
		{
			var array = new Array(stop - start + 1);
			for(var i = 0; i < array.length; i++)
			{
				array[i] = i + start;
			}
			return array;
		},
		inOut2("int", "int", mt("list", ["int"]))
	),
	"neg" : mff1(function (x) {return -x;}),
	"+" : mff2(function (x, y) {return x + y;}),
    "-" : mff2(function (x, y) {return x - y;}),
    "*" : mff2(function (x, y) {return x * y;}),
    "/" : mff2(function (x, y) {return x / y;}),
	"<" : mcf2(function (x, y) {return x < y;}),
	">" : mcf2(function (x, y) {return x > y;}),
	"<=" : mcf2(function (x, y) {return x <= y;}),
	">=" : mcf2(function (x, y) {return x >= y;}),
	"==" : mcf2(function (x, y) {return x == y;}),
	"!=" : mcf2(function (x, y) {return x != y;}),
	"eq" : mcf2(function (x, y) {return x == y;}),
	"||" : mbf2(function (x, y) {return x || y;}),
	"&&" : mbf2(function (x, y) {return x && y;}),
	"!" : mf1
	(
		function (x) {return !x;},
		inOut1("bool", "bool")
	),
	"mod" : mff2(function (x, y) {return (x + y) % y;}), // On ne veut pas de nombre negatif
	"min" : mff2(function (x, y) {return x > y ? y : x;}), 
	"max" : mff2(function (x, y) {return x < y ? y : x;}), 
	"clamp" : mff3(function (x, min, max) {return x < min ? min : x > max ? max : x}),
	"abs" : mff1(function (x) 
	{
		return Math.abs(x);
	}),
	"round" : mff1(function (x) 
	{
		return Math.floor(x + .5);
	}),
	"floor" : mff1(function (x){return Math.floor(x);}), 
	"concat" : mtf2
	(
		function(first, second) // The function
		{	
			return first.concat(second);
		},
		function(template) // Input and output types
		{
			return inOut2(listTemp(template), listTemp(template), listTemp(template));
		},
		function(firstType, secondType)	// Template guess from input types
		{
			var firstTemplate = getListTypeParam(firstType);
			var secondTemplate = getListTypeParam(secondType);
			checkSameTypes(firstTemplate, secondTemplate);
			return firstTemplate;
		}
	),
	"pushFront" :  mtf2
	(
		function(a, v) // The function
		{	
			// TODO optim
			var newA = _.cloneDeep(a);
			newA.unshift(v);
			return newA;
		},
		function(template) // Input and output types
		{
			return inOut2(listTemp(template), template, listTemp(template));
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
			return _.initial(a);
		}),
	"slice" : mtf3
		(
			function (a, start, stop) {return a.slice(start, stop);},
			function(template) // Input and output types
			{
				return inOut3
				(
					listTemp(template), 
					"int",
					"int",
					listTemp(template)
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
			return list.length;
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
			return _.any(list);
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
			return !(_.any(list));
		},
		function(template) // Output type
		{
			return "bool";
		}
	),
	"sqr" : mff1(function (x) {return x * x;}),
	"at": mtf2
	(
		function(array, index) // The function
		{	
			if(index < array.length && index >= 0)
				return array[index];
			// TODO version generique (ici seulement pour list de bool)
			return false;
		},
		function(template) // Input and output types
		{
			return inOut2(listTemp(template), "int", template);
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
			return inOut2(listTemp(firstTemplate), listTemp(secondTemplate), mt("list", [mt("tuple", [firstTemplate, secondTemplate])]));
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
			if(list.length == 0)
				return [[],[]];
			return _.zip(list);
		},
		function(firstTemplate, secondTemplate) // Input and output types
		{
			return inOut1(mt("list", mt("tuple", [firstTemplate, secondTemplate])), mt("tuple", [listTemp(firstTemplate), listTemp(secondTemplate)]));
		},
		function(listType)	// Template guess from input types
		{
			var listTemplate = getListTypeParam(listType);
			check(getBaseType(listTemplate) == "tuple", "List template is not a tuple : " + getBaseType(listTemplate));
			var tupleTemplates = getTemplates(listTemplate);
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
				listTemp(firstTemplate), 
				listTemp(secondTemplate), 
				listTemp(thirdTemplate), 
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
	strToList : mf1
	(
		function (str) 
		{
			return str; //.split("");
		},
		inOut1("string", listTemp("char"))
	),
	"map" : {
		getTemplates : function(params)
		{
			var list = params[1];
			var temp0 = getListTypeParam(list.getType());	
			if(params[0].template)
			{
				var tmp = new Store(null, temp0);
				var funcTemplates = params[0].template.getTemplates([tmp]);
				// var funcType = getFuncType(params[0], [temp0]);
				var funcType = getFuncType(params[0], funcTemplates);
			}
			else
			{
				var funcType = params[0].getType();
			}
			return [temp0, getOutType(funcType)];
		},		
		build : function(templates)
		{
			return {
				params : [["function" , inOut1(templates[0], templates[1])], ["list" , listTemp(templates[0])]],
				func : function(params) 
				{	
					var funcInstance = params[0];
					return _.map(params[1], function(val)
					{
						// Il faut appeler funcInstance.func pour conserver le "this",
						// et non pas cacher la methode func puis l'appeler seule
						return funcInstance.func([val]);
					});
				},
				type : listTemp(templates[1]),
				templates : templates
			}
		}
	},
	"flatMap" : {
		getTemplates : function(params)
		{
			var list = params[1];
			var temp0 = getListTypeParam(list.getType());	
			if(params[0].template)
			{
				var tmp = new Store(null, temp0);
				var funcTemplates = params[0].template.getTemplates([tmp]);
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
			return {
				params : [["function" , inOut1(templates[0], listTemp(templates[1]))], ["list" , listTemp(templates[0])]],
				func : function(params) 
				{	
					var funcInstance = params[0];
					return _(params[1]).map(function(val)
					{
						// Il faut appeler funcInstance.func pour conserver le "this",
						// et non pas cacher la methode func puis l'appeler seule
						return funcInstance.func([val]);
					})
					.flatten(true).value();
				},
				type : listTemp(templates[1]),
				templates : templates
			}
		}
	},
	"reduce" : {
		getTemplates : function(params)
		{
			var list = params[1];
			var temp0 = getListTypeParam(list.getType());
			var accum = params[2];
			var temp1 = accum.getType();
			var funcType = getFuncType(params[0], [temp1, temp0]);
			return [temp0, temp1];
		},		
		build : function(templates)
		{
			return {
				params : [["function" , inOut2(templates[1], templates[0], templates[1])], ["list" , listTemp(templates[0])], ["accum", templates[1]]],
				func : function(params) 
				{	
					var funcInstance = params[0];
					return _.reduce(params[1], function(accum, val)
					{
						// Il faut appeler funcInstance.func pour conserver le "this",
						// et non pas cacher la methode func puis l'appeler seule
						return funcInstance.func([accum, val]);
					});
				},
				type : templates[1],
				templates : templates
			}
		}
	},
	"contains" : {
		getTemplates : function(params)
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
			return {
				params : [["list" , listTemp(templates[0])], ["item" , templates[0]], ["function" , inOut2(templates[0], templates[0], "bool")]],
				func : function(params) 
				{	
					var array = params[0];
					var val = params[1];
					var funcInstance = params[2];
					for(var i = 0; i < array.length; i++)
					{
						// Il faut appeler funcInstance.func pour conserver le "this",
						// et non pas cacher la methode func puis l'appeler seule
						if(funcInstance.func([array[i], val]))
							return true;
					}
					return false;
				},
				type : "bool",
				templates : templates
			}
		}
	},
	"merge" :
	{
		getTemplates : function(params)
		{
			var dst = params[0];
			var src = params[1];
			var srcParams = getDictTypeParams(src.getType());
			var dstParams = getDictTypeParams(dst.getType());
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
				func : function(params) 
				{	
					var dst = _.cloneDeep(params[0]);
					var src = params[1];
					return _.merge(dst, src);
				},
				type : dictType("string", templates[0]),
				templates : templates
			}
		}
	}
};

function FunctionNode(func)
{
	this.fields = func.params;
	var paramsSpec = func.params;
	var fieldsSpec = this.fields;
	this.builder = function(f) 
	{	
		var params = Array(paramsSpec.length)
		var fields = f

		_.each(fields, function(field, key)
		{
			var index = _.findIndex(fieldsSpec, function(fieldSpec){return fieldSpec[0] == key;});
			params[index] = field;
			// C'est un template de fonction (StoreFunctionTemplate)
			if("setTemplateParams" in field)
			{
				field.setTemplateParams(func.templates);
			}
		}, this);
		this.get = function()
		{
			return func.func(params.map(function(param){return param.get();}));
		};
		this.getType = function()
		{
			// TODO : comprendre pourquoi le func.type ne fonctionne pas dans le cas user defined
			if(!("type" in func))
				throw "Return type of function " + func.name + " not defined, and cannot deduce it from parameters (recursive template function ?)"
			
			// if("expr" in func)
				// return func.expr.getType();
			return func.type;
		}
		this.addSink = function(sink)
		{
			_.each(fields, function(field)
			{
				field.addSink(sink);
			});
		};		
	}
}

function funcToNodeSpec(funcProto)
{	
	function	instantiateTemplate(templates)
	{
		return new FunctionNode(funcProto.build(templates));
	}
	
	if(funcProto.getTemplates != undefined)
	{
		return {
			getTemplates : funcProto.getTemplates,
			getInstance : instantiateTemplate
		}
	}
	return new FunctionNode(funcProto);
}



var nodes = 
{
	"contains" : 
	{
		"fields" : [["first", "float"], ["second", "float"], ["third", "float"]],
		"builder" : function(fields) 
		{	
			var a = fields.first;
			var v = fields.second;
			var third = fields.third;
			//var f = third.build(third.getTemplates(v));

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
	// "map" : 
	// {
		// "fields" : [["first", "function"], ["second", "list"]],
		// "builder" : function(fields) 
		// {	
			// var first = fields.first;
			// var l = fields.second;
			// // TODO pas beau le Store !!!
			// var f = first.build(first.getTemplates([new Store(null, getListTypeParam(l.getType()))]));
			
			// var funcType = f.type;
			// var func = f.func;
			// this.get = function()
			// {
				// var array = l.get();
				// var mapped = _.map(array, function(item)
				// {
					// return func([item]);
				// });
				// return mapped;
			// };
			// this.getType = function()
			// {
				// return makeTemplate("list", [funcType]);
			// }
		// }
	// },
	
	"Random" : makeRandom(),
	"RandomList" : makeRandomList(),
    "if" :  {
		"fields" : [["first", "float"], ["second", "float"], ["third", "float"]],
		"builder" : function(fields) 
		{	
			var first = fields.first;
			var second = fields.second;
			var third = fields.third;
			
			this.get = function()
			{
				if(first.get())
				{
					return second.get();
				}
				return third.get();
			};
			this.getType = function(){
					return third.getType();
			};
			this.addSink = function(sink)
			{
				first.addSink(sink);
				second.addSink(sink);
				third.addSink(sink);
			};
		}
	},
	"list" :
	{
		getTemplates : undefined, // TODO
		getInstance : function(templates)
		{
			var subType = templates[0];
			var subBaseType = getBaseType(subType);
			if(subBaseType in library.nodes)
			{
				var subTypeTemplates = getTemplates(subType);
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
					this.get = function()
					{
						return list;
					};
					this.getType = function()
					{
						return {
							base : "list",
							templates : temp};
					}
				},
				operators : {
					getPath : function(struct, path)
					{
						if(path.length == 1)
						{
							// return struct[path[0]].get();
							return struct[path[0]];
						}
						else
						{
							var subPath = path.slice(0);
							var key = subPath.shift();
							return fieldsOperators[key].getPath(struct[key], subPath);
						}
					},
					setPath : function(struct, path, val)
					{
						if(path.length == 1)
						{
							struct[path[0]] = val;
						}
						else
						{
							var subPath = path.slice(0);
							var key = subPath.shift();
							fieldsOperators[key].setPath(struct[key], subPath, val);
						}
					},
					signalOperator : instanceTypeOperators ? instanceTypeOperators.signal : null,
					instanceType : subBaseType,
					signal : function(list, iteratedSignal, params, path)
					{
						if(!path || path.length == 0)
						{
							_.each(list, function(item) {instanceTypeOperators.signal(item, iteratedSignal, params);}, this);
						}
						else
						{
							var subPath = path.slice(0);
							var index = subPath.shift();
							instanceTypeOperators.signal(list[index], iteratedSignal, params, subPath);
						}
						
					}
				}
			}
		}
	},
	"dict" :
	{
		getTemplates : undefined, // TODO
		getInstance : function(templates)
		{
			// var subType = templates[0];
			// var subBaseType = getBaseType(subType);
			// if(subBaseType in library.nodes)
			// {
				// var subTypeTemplates = getTemplates(subType);
				// var typeObj = (subTypeTemplates.length > 0) ? 
					// library.nodes[subBaseType].getInstance(subTypeTemplates) :
					// library.nodes[subBaseType];
				// if(typeObj != undefined && "operators" in typeObj)
				// {
					// var instanceTypeOperators = typeObj.operators;
				// }
			// }

			return {
				"fields" : [["dict", dictType(templates[0])]],
				"builder" : function(fields) 
				{	
					var dict = fields.dict;
					var temp = templates;
					this.get = function()
					{
						return dict;
					};
					this.getType = function()
					{
						return dictType(templates[0]);
					}
				},
				// operators : {
					// getPath : function(struct, path)
					// {
						// if(path.length == 1)
						// {
							// // return struct[path[0]].get();
							// return struct[path[0]];
						// }
						// else
						// {
							// var subPath = path.slice(0);
							// var key = subPath.shift();
							// return fieldsOperators[key].getPath(struct[key], subPath);
						// }
					// },
					// setPath : function(struct, path, val)
					// {
						// if(path.length == 1)
						// {
							// struct[path[0]] = val;
						// }
						// else
						// {
							// var subPath = path.slice(0);
							// var key = subPath.shift();
							// fieldsOperators[key].setPath(struct[key], subPath, val);
						// }
					// },
					// signalOperator : instanceTypeOperators ? instanceTypeOperators.signal : null,
					// instanceType : subBaseType,
					// signal : function(list, iteratedSignal, params)
					// {
						// _.each(list, function(item) {instanceTypeOperators.signal(item, iteratedSignal, params);}, this);
					// }
				// }
			}
		}
	},
	"tuple" : {
		getTemplates : function(params)
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
					this.get = function()
					{
						return _.map(this.fields, function(field){return field.get();});
					};
					this.getType = function()
					{
						return makeTemplate("tuple", templates);
					};
				},
				operators : {
					getPath : function(struct, path)
					{
						if(path.length == 1)
						{
							// return struct[path[0]].get();
							return struct[path[0]];
						}
						else
						{
							var subPath = path.slice(0);
							var key = subPath.shift();
							return fieldsOperators[key].getPath(struct[key], subPath);
						}
					},
					setPath : function(struct, path, val)
					{
						if(path.length == 1)
						{
							struct[path[0]] = val;
						}
						else
						{
							var subPath = path.slice(0);
							var key = subPath.shift();
							fieldsOperators[key].setPath(struct[key], subPath, val);
						}
					}
				}
			}
		}
	}
};

nodes = _.merge(nodes, functions, function(node, func){return funcToNodeSpec(func);});

function Print(slots, param) {
	var text = param;
    this.signal = function()
    {
		console.log(text.get());
    };
}


function Send(slots, param) {
    this.slots = slots;
    this.param = param;
	this.signal = function(val, path)
    {
		var val = this.param.get();
		for(var i = 0; i < this.slots.length; i++)
		{
			this.slots[i].set(val);
		}
    };
}

function Signal(slots, param) {
    this.slots = slots;
    this.param = param;
	this.signal = function(val, path)
    {
		var val = this.param.get();
		for(var i = 0; i < this.slots.length; i++)
		{
			this.slots[i].signal(val);
		}
    };
}

function Seq(slots, param) {
    this.slots = slots;
    this.signal = function(v)
    {
		for(var i = 0; i < this.slots.length; i++)
		{
			this.slots[i].signal(v);
		}
    };
	this.getType = function()
	{
		return "Seq";
	}
}

var actions=
{
	"Print" : Print,
	"Send" : Send,
	"Signal" : Signal,
	"Seq" : Seq,
	"Alert" :  function (slots, param) 
	{
		var text = param;
		this.signal = function()
		{
			alert(text.get());
		};
	}
}