
function getId(node)
{
	return "id" in node ? node.id : (("def" in node) ? node.def : ("var" in node ? node["var"] : node["cache"]))
}

function Val(ast, type)
{
	this.ast = ast;
	this.type = type;
	
	this.getAst = function()
	{
		return this.ast;
	}

	this.getType = function()
	{
		return this.type;
	}
}

function makeExpr(expr, nodes, genericTypeParams)
{
	if(isNumber(expr) || _.isBoolean(expr))
	{
		return new Val(literal(expr.val), makeBaseType(expr.type));
	} else if(expr.type == "CallExpression")
	{
		return new Val(
			{
                "type": "BinaryExpression",
                "operator": "+",
                "left": {
                    "type": "Literal",
                    "value": 10,
                    "raw": "10"
                },
                "right": {
                    "type": "Literal",
                    "value": 2,
                    "raw": "1"
                }
            },
			makeBaseType("Int")
		);
		var node;
		var baseType = expr.type.base;
		var typeArgs = expr.type.args;
		if(!(baseType in library.functions))
		{
			error("Function " + type + " not found in functions library");
		}
		var funcSpec = library.functions[baseType];
		
		var argsGraph = expr.args;

		if(("guessTypeArgs" in funcSpec))
		{
			var instance;
			var vals = _.map(argsGraph, function(argGraph)
			{
				return makeExpr(argGraph, nodes, genericTypeParams);
			});

			// TODO : faire check entre type explicite et deduit				
			typeArgs = funcSpec.guessTypeArgs(vals);
			
			if(true)	
			{
				instance = funcSpec.getInstance(typeArgs);
				var paramsSpec = _.map(instance["fields"], function(nameAndType){return nameAndType[0];});
				fields = _.zipObject(paramsSpec, vals);
			}
			else
			{
				instance = funcSpec.getInstance(typeArgs);
			}
			
			// TODO template explicite
			node = new instance.builder(fields, typeArgs);
		}
		else
		{
			if(argsGraph != undefined)
			{
				var fieldsSpec = funcSpec["fields"];
				var nbParamsSpec = _.filter(fieldsSpec, function(field){return _.isArray(field);}).length;
				if(argsGraph.length < nbParamsSpec)
				{
					error("Not enough params in constructor of " + type + ". Required " + nbParamsSpec + " found " + argsGraph.length);
				}
				for(var paramIndex = 0; paramIndex < argsGraph.length; paramIndex++)
				{
					var paramSpec = fieldsSpec[paramIndex];
					var val = makeExpr(argsGraph[paramIndex], nodes);
					var valType = val.getType();					
					if(genericTypeParams && valType in genericTypeParams)
					{
						valType = genericTypeParams[valType];
					}
					if(!isSameOrSubType(valType, paramSpec[1]))
					{
						error("Parameter of index " + paramIndex + " in call of " + 
							expr.type + " is of type " + typeToString(val.getType()) + ", required type " + typeToString(paramSpec[1]));
					}
					fields[paramSpec[0]] = val;
				}
			}
			node = new funcSpec.builder(fields, typeArgs);
		}
		return node;
	} 
}

function isLit(expr)
{
 	return (_.isNumber(expr) || _.isBoolean(expr));
}
