
ast = {
    literal : function(value)
    {
    	return {
    	    type: "Literal",
    	    value: value
    	}
    },
    id : function(name)
    {
    	return {
    	    type: "Identifier",
    	    name: name
    	}
    },
    trueLit : {
        "type": "Literal",
        "value": true,
        "raw": "true"
    },
    thisExpression : {
        "type": "ThisExpression"
    },
    newExpression : function(callee, arguments)
    {
    	return {
    		type: "NewExpression",
    	    callee: callee,
    	    arguments: arguments
    	}
    },
    varDeclarator : function(id, init)
    {
    	return {
    		type : "VariableDeclarator",
    		id : ast.id(id),
    		init : init
    	}
    },
    varDeclaration : function(id, init)
    {
    	return {
    		type: "VariableDeclaration",
    	    declarations: [ast.varDeclarator(id, init)],
    	    kind: "var"
    	}
    },
    callExpression : function(funcId, argsAst) {
        return {
            "type": "CallExpression",
            "callee": {
                "type": "Identifier",
                "name": funcId
            },
            "arguments": argsAst
        };
    },
    funcDeclOrExpr : function(type, funcId, paramsId, bodyBlockAst) {
        return {
            "type": type,
            "id": funcId === null ? 
                null : {
                    "type": "Identifier",
                    "name": funcId
                },
            "params": _.map(paramsId, function(paramId) {
                return {
                    "type": "Identifier",
                    "name": paramId
                };
            }),
            "defaults": [],
            "body": {
                "type": "BlockStatement",
                "body": bodyBlockAst
            },
            "generator": false,
            "expression": false
        }
    },
    functionDeclaration : function(funcId, paramsId, bodyAst) {
        return ast.funcDeclOrExpr("FunctionDeclaration", funcId, paramsId, bodyAst);
    },
    functionExpression : function(funcId, paramsId, bodyAst) {
        return ast.funcDeclOrExpr("FunctionExpression", funcId, paramsId, bodyAst);
    },    
    memberExpression : function(objectAst, attribName) {
        return {
            "type": "MemberExpression",
            "computed": false,
            "object": objectAst,
            "property": {
                "type": "Identifier",
                "name": attribName
            }
        };
    },
    blockStatement : function(statements) {
        return {
            "type": "BlockStatement",
            "body": statements
        };
    },
    arrayIteration : function(indexId, arrayId, bodyAst)
    {
        return {
            "type": "ForStatement",
            "init": {
                "type": "VariableDeclaration",
                "declarations": [
                    {
                        "type": "VariableDeclarator",
                        "id": {
                            "type": "Identifier",
                            "name": indexId
                        },
                        "init": {
                            "type": "Literal",
                            "value": 0,
                            "raw": "0"
                        }
                    }
                ],
                "kind": "var"
            },
            "test": {
                "type": "BinaryExpression",
                "operator": "<",
                "left": {
                    "type": "Identifier",
                    "name": indexId
                },
                "right": {
                    "type": "MemberExpression",
                    "computed": false,
                    "object": {
                        "type": "Identifier",
                        "name": arrayId
                    },
                    "property": {
                        "type": "Identifier",
                        "name": "length"
                    }
                }
            },
            "update": {
                "type": "UpdateExpression",
                "operator": "++",
                "argument": {
                    "type": "Identifier",
                    "name": indexId
                },
                "prefix": false
            },
            "body": bodyAst
        };
    },
    typeToAst : function(type)
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
};