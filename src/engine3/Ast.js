

function literal(value)
{
	return {
	    type: "Literal",
	    value: value
	}
}

function identifier(name)
{
	return {
	    type: "Identifier",
	    name: name
	}
}

function newExpression(callee, arguments)
{
	return {
		type: "NewExpression",
	    callee: callee,
	    arguments: arguments
	}
}

function varDeclarator(id, init)
{
	return {
		type : "VariableDeclarator",
		id : id,
		init : init
	}
}

function varDeclaration(declarators)
{
	return {
		type: "VariableDeclaration",
	    declarations: declarators,
	    kind: "var"
	}
}


function makeLitVarDecl(id, litVal)
{
	return varDeclaration([varDeclarator(identifier(id), literal(litVal))]);
}