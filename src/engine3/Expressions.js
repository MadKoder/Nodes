
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
	var func = expr.func;
	if(func.type == "Id")
	{
		var id = func.name;		
		if(!(id in library.functions))
		{
			error("Function " + id + " not found in functions library");
		}
		var funcSpec = library.functions[id];
	}
	else
	{
		error("Callee type not supported: " + func.type);
	}
	
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

function makeMemberExpression(expr, library, genericTypeParams)
{
	var struct = expr.struct;
	var id = null;
	if(struct.type == "Id")
	{
		var id = struct.name;		
		if(!(id in library.nodes))
		{
			error("Object " + type + " not found in nodes library");
		}
		var funcSpec = library.functions[id];
	}
	else
	{
		error("Object type not supported: " + struct.type);
	}
	
	var idExpr = makeIdExpression(struct, library, genericTypeParams);
	// TODO check types

	return new Expr(
		{
            "type": "MemberExpression",
            "computed": false,
            "object": idExpr.getAst(),
            "property": {
                "type": "Identifier",
                "name": expr.field.name
            }
        },
        //TODO
        null
	);
}

function makeIdExpression(expr, library, genericTypeParams)
{
	var id = expr.name;
	if(!(id in library.nodes))
	{
		error("Node " + id + " not in set of nodes nor of vals");
	}
		
	var node = library.nodes[id];
	var idVal = node.getterAst;
    var type = node.type;

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
	}  else if(expr.type == "MemberExpression")
	{
		return makeMemberExpression(expr, library, genericTypeParams);
	} 
}

function isLit(expr)
{
 	return (_.isNumber(expr) || _.isBoolean(expr));
}
