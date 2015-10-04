
function getId(node)
{
	return "id" in node ? node.id : (("def" in node) ? node.def : ("var" in node ? node["var"] : node["cache"]))
}

function Expr(ast, type)
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

function makeCallExpression(expr, library, genericTypeParams)
{
	var baseType = expr.func.base;
	var typeArgs = expr.func.args;
	if(!(baseType in library.functions))
	{
		error("Function " + type + " not found in functions library");
	}
	var funcSpec = library.functions[baseType];
	
	args = _.map(expr.args, function(arg) {
		return makeExpr(arg, library, genericTypeParams);
	});

	typeArgs = funcSpec.guessTypeArgs(args);
	funcInstance = funcSpec.getInstance(typeArgs);

	return new Expr(
		funcInstance.getAst(
			_.map(args, function(arg) {
				return arg.ast;
		})),
		funcInstance.outType
	);
}

function makeIdExpression(expr, library, genericTypeParams)
{
	var id = expr.name;
	var idVal = null;
	var type = null;
	if(id in library.vals)
	{
	    idVal = {
	        "type": "Identifier",
	        "name": id
	    };
	    type = library.vals[id].type;
	} else if(id in library.nodes)
	{
		idVal = {
            "type": "CallExpression",
            "callee": {
                "type": "MemberExpression",
                "computed": false,
                "object": {
                    "type": "Identifier",
                    "name": id
                },
                "property": {
                    "type": "Identifier",
                    "name": "get"
                }
            },
            "arguments": []
        };
        type = library.nodes[id].type;
	}

	if(idVal == null)
	{
		error("Node " + id + " not in set of nodes nor of vals");
	}

	return new Expr(
		idVal,
		type
	);
}

function makeExpr(expr, library, genericTypeParams)
{
	if(isNumber(expr))
	{
		return new Expr(literal(expr.val), makeBaseType(expr.type));
	} else if(expr.type == "CallExpression")
	{
		return makeCallExpression(expr, library, genericTypeParams);
	} else if(expr.type == "Id")
	{
		return makeIdExpression(expr, library, genericTypeParams);
	} 
}

function isLit(expr)
{
 	return (_.isNumber(expr) || _.isBoolean(expr));
}
