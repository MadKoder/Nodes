
function mt(base, args)
{
	return {
		base : base,
		args : args
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
		guessTypeArgs : function(params)
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
		guessTypeArgs : function(params)
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
		guessTypeArgs : function(args)
		{
			return [];
		},		
		getInstance : function(typeArgs)
		{
			return {
				getAst : function(args) 
				{	
					return func2(args[0], args[1]);
				},
				type : inAndOutTypes,
			}
		},
		getType : function(typeArgs)
		{
			return inAndOutTypes;
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

// Relational functions
function mrf2(operator)
{
	return mtf2
	(
		function (x, y) {
			return {
                "type": "BinaryExpression",
                "operator": operator,
                "left": x,
                "right": y
            };
		},
		function(template) // Input and output types
		{
			return inOut2(template, template, makeBaseType("bool"));
		},
		function(x, y)	// Template guess from input types
		{
			return(getCommonSuperClass(x, y));
		}
	)
}

// Logical functions
function mlf2(operator)
{
	return mf2
	(
		function (x, y) {
			return {
                "type": "LogicalExpression",
                "operator": operator,
                "left": x,
                "right": y
            };
		},
		inOut2(makeBaseType("bool"), makeBaseType("bool"), makeBaseType("bool"))
	)
}

function mtf2(func2, getInAndOutTypes, getTemplateFunc)
{
	return {
		guessTypeArgs : function(args)
		{
			return [getTemplateFunc(args[0].type, args[1].type)];
		},		
		getInstance : function(typeArgs)
		{
			return {
				getAst : function(args) 
				{	
					return func2(args[0], args[1]);
				},
				type : getInAndOutTypes(typeArgs[0]),
				instancesAst : [],
				callType : "Curried"
			}
		},
		getType : function(typeArgs)
		{
			return getInAndOutTypes(typeArgs[0]);
		}
	}
}

// Arithmetic (take float and int) functions
// Beware : implicit cast if mixing int and float, not dangerous in javascript
function maf2(operator)
{
	return mtf2
	(
		function (x, y) {
			return {
                "type": "BinaryExpression",
                "operator": operator,
                "left": x,
                "right": y
            };
		},
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
		guessTypeArgs : function(params)
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
		guessTypeArgs : function(params)
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
		guessTypeArgs : function(params)
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
