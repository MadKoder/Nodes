
ast = {
    literal : function(value)
    {
    	return {
    	    type: "Literal",
    	    value: value
    	}
    },
    identifier : function(name)
    {
    	return {
    	    type: "Identifier",
    	    name: name
    	}
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
    		id : this.identifier(id),
    		init : init
    	}
    },
    varDeclaration : function(id, init)
    {
    	return {
    		type: "VariableDeclaration",
    	    declarations: [this.varDeclarator(id, init)],
    	    kind: "var"
    	}
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