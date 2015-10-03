

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

function typeToAst(type)
{
	return {
        "type": "ObjectExpression",
        "properties": [
            {
                "type": "Property",
                "key": {
                    "type": "Identifier",
                    "name": "base"
                },
                "computed": false,
                "value": {
                    "type": "Literal",
                    "value": type.base
                },
                "kind": "init",
                "method": false,
                "shorthand": false
            },
            {
                "type": "Property",
                "key": {
                    "type": "Identifier",
                    "name": "args"
                },
                "computed": false,
                "value": {
                    "type": "ArrayExpression",
                    "elements": _.map(type.args, function(arg) {
                    		return {
                    			"type": "Literal",
	                            "value": arg
	                        };
	                    }
                    )
                },
                "kind": "init",
                "method": false,
                "shorthand": false
            }
        ]
    };
}