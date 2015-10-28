
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

	_.each(
		_.zip(args, funcInstance.type.inputs),
		function(argAndInputType) {
			if(!isSameType(argAndInputType[0].type, argAndInputType[1])) {
				error(
					"Arg type " + typeToString(argAndInputType[0].type) + " different from formal parameter type " + typeToString(argAndInputType[1])
				);
			}
		}
	);

	return new Expr(
		funcInstance.getAst(
			_.map(args, function(arg) {
				return arg.ast;
		})),
		funcInstance.type.output
	);
}

function makeMemberExpression(exprGraph, library, genericTypeParams)
{
	var obj = exprGraph.obj;
	var expr = makeExpr(obj, library, genericTypeParams);
	// TODO check types

	var fieldName = exprGraph.field.name;
	// Instanciate class type
    var classType = library.classes[expr.type.base](expr.type.args);
    // And get the member type
    var fieldType = classType.varsType[exprGraph.field.name];
	return new Expr(
		{
            "type": "MemberExpression",
            "computed": false,
            "object": expr.getAst(),
            "property": {
                "type": "Identifier",
                "name": fieldName
            }
        },
        fieldType
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

function makeExpr(exprGraph, library, genericTypeParams) {
	if(isInArray(exprGraph.type, ["IntLiteral", "FloatLiteral"])) {
		return new Expr(
			ast.literal(exprGraph.val),
			makeBaseType(
				exprGraph.type == "IntLiteral" ?
					"int" :
					"float"
			)
		);
	} else if(exprGraph.type == "BooleanLiteral") {
		return new Expr(
			ast.literal(exprGraph.val),
			makeBaseType("bool")
		);
	} else if(exprGraph.type == "Id") {
		return makeIdExpression(exprGraph, library, genericTypeParams);
	} else if(exprGraph.type == "CallExpression") {
		return makeCallExpression(exprGraph, library, genericTypeParams);
	}  else if(exprGraph.type == "MemberExpression") {
		return makeMemberExpression(exprGraph, library, genericTypeParams);
	} 
}
