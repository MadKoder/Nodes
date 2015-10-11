
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
	} 
}

function isLit(expr)
{
 	return (_.isNumber(expr) || _.isBoolean(expr));
}
