
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

function makeCallExpression(expr, nodes, genericTypeParams)
{
	var baseType = expr.func.base;
	var typeArgs = expr.func.args;
	if(!(baseType in library.functions))
	{
		error("Function " + type + " not found in functions library");
	}
	var funcSpec = library.functions[baseType];
	
	args = _.map(expr.args, function(arg) {
		return makeExpr(arg, nodes, genericTypeParams);
	});

	typeArgs = funcSpec.guessTypeArgs(args);
	funcInstance = funcSpec.getInstance(typeArgs);

	return new Val(
		funcInstance.getAst(
			_.map(args, function(arg) {
				return arg.ast;
		})),
		funcInstance.outType
	);
}

function makeIdExpression(expr, nodes, genericTypeParams)
{
	var id = expr.name;
	if(!(id in nodes))
	{
		error("Node " + id + " not in set of nodes");
	}

	var node = nodes[id];
	return new Val({
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
        },
		node.type
	);
}

function makeExpr(expr, nodes, genericTypeParams)
{
	if(isNumber(expr) || _.isBoolean(expr))
	{
		return new Val(literal(expr.val), makeBaseType(expr.type));
	} else if(expr.type == "CallExpression")
	{
		return makeCallExpression(expr, nodes, genericTypeParams);
	} else if(expr.type == "Id")
	{
		return makeIdExpression(expr, nodes, genericTypeParams);
	} 
}

function isLit(expr)
{
 	return (_.isNumber(expr) || _.isBoolean(expr));
}
