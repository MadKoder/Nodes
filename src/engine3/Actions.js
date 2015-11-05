
function makeRefAst(ref, library, genericTypeParams)
{
    // TODO check existence, type ...
    if(ref.type == "Id")
    {
        // If the reference is an attribute of current object (if we are in an object),
        // The reference must be a this expression
        var id = ref.name;
        if(id in library.attribs)
        {
            return {
                "type": "MemberExpression",
                "computed": false,
                "object": {
                    "type": "ThisExpression"
                },
                "property": {
                    "type": "Identifier",
                    "name": id
                }
            }
        }
        return {
            "type": "Identifier",
            "name": id
        }
    } else if(ref.type == "MemberReference")
    {
        var objAst = makeRefAst(ref.obj, library, genericTypeParams);
        return {
            "type": "MemberExpression",
            "computed": false,
            "object": objAst,
            "property": {
                "type": "Identifier",
                "name": ref.field.name
            }
        }
    }
}

function makeDirtyAst(ref, library, genericTypeParams)
{
    // TODO check existence, type ...
    if(ref.type == "Id")
    {
        var id = ref.name;
        if(id in library.attribs)
        {
            //?
        } else {
            var node = library.nodes[id];
            if(node.sinkListVarName.length > 0)
            {
                return {
                    "type": "CallExpression",
                    "callee": {
                        "type": "Identifier",
                        "name": "__dirtySinks"
                    },
                    "arguments": [
                        {
                            "type": "Identifier",
                            "name": node.sinkListVarName
                        }
                    ]
                }
            }
        }
        return null;
    } else if(ref.type == "MemberReference")
    {
        return makeDirtyAst(ref.obj, library, genericTypeParams);
    }
}

function makeAssignment(assignmentGraph, library, genericTypeParams) {
    var exprAst = makeExpr(assignmentGraph.value, library, genericTypeParams).getAst();
    var rightAst = exprAst;
    // If the right expression is an id, clone it
    if(isId(assignmentGraph.value)) {
        rightAst = {
            "type": "CallExpression",
            "callee": {
                "type": "MemberExpression",
                "computed": false,
                "object": {
                    "type": "Identifier",
                    "name": "_"
                },
                "property": {
                    "type": "Identifier",
                    "name": "clone"
                }
            },
            "arguments": [
                exprAst,
                {
                    "type": "Literal",
                    "value": true,
                    "raw": "true"
                }
            ]
        };
    }

    var targetAst =  makeRefAst(assignmentGraph.target, library, genericTypeParams);
    // TODO check existence and type of target
    var assignmentAst = {
        "type": "ExpressionStatement",
        "expression": {
            "type": "AssignmentExpression",
            "operator": "=",
            "left": targetAst,
            "right": rightAst
        }
    };

    var dirtyAst =  makeDirtyAst(assignmentGraph.target, library, genericTypeParams);
    if(dirtyAst != null)
    {
        return {
            "type": "BlockStatement",
            "body": [
                assignmentAst,
                {
                    "type": "ExpressionStatement",
                    "expression": dirtyAst
                }
            ]
        };
    }
    return assignmentAst;
}

function makeSignal(signalGraph, library, genericTypeParams) {
	// TODO check existence and type of slot
	var argsAst = _.map(signalGraph.args, function(arg) {
		return makeExpr(arg, library, {}).getAst();
	});
    var slotAst = makeRefAst(signalGraph.slot, library, genericTypeParams);
	return {
        "type": "ExpressionStatement",
        "expression": {
            "type": "CallExpression",
            "callee": slotAst,
            "arguments": argsAst
        }
    };
}

function makeStatement(statementGraph, library, genericTypeParams) {
	switch(statementGraph.type) {
		case "Assignment":
			return makeAssignment(statementGraph, library, genericTypeParams);
		case "Signal":
			return makeSignal(statementGraph, library, genericTypeParams);
	}
}

function makeSlot(slotGraph, localLibrary, prog, astType, idAst) {        
	var paramsGraph = slotGraph.params;
	_.each(paramsGraph, function(param) {
		var getterAst = {
            "type": "Identifier",
            "name": param.id.name
        };
		localLibrary.nodes[param.id.name] = new Node(getterAst, typeGraphToCompact(param.type));
	});	
	var statements = _.map(slotGraph.statements, function(statement) {
		return makeStatement(statement, localLibrary, {})
	});
	var paramsAst = _.map(paramsGraph, function(param) {
		return {
            "type": "Identifier",
            "name": param.id.name
        }
	});
	var slotAst = {
        "type": astType,
        "id": idAst,
        "params":paramsAst,
        "defaults": [],
        "body": {
            "type": "BlockStatement",
            "body": statements	                
        },
        "generator": false,
        "expression": false
    };

	return slotAst;
}

function makeAction(actionGraph, library, prog) {
    var localLibrary = makeLocalLibrary(library);

    var slotAst = makeSlot(
        actionGraph,
        localLibrary,
        prog,
        "FunctionDeclaration", 
        {
            "type": "Identifier",
            "name": actionGraph.id.name
        }
    );

    prog.addStmnt(slotAst);
}

function makeEvent(eventGraph, eventId, library, prog) {
    var localLibrary = _.clone(library);
    localLibrary.nodes = _.clone(localLibrary.nodes);

    var conditionAst = makeExpr(eventGraph.condition, library, {}).getAst();

    var statements = _.map(eventGraph.statements, function(statement) {
        return makeStatement(statement, localLibrary, {})
    });

    // var __event__index = {
    //     dirty : function() {
    //         if(condition) {
    //             statements...
    //         }
    //     }
    // };
    var eventAst = {
        "type": "VariableDeclaration",
        "declarations": [
            {
                "type": "VariableDeclarator",
                "id": {
                    "type": "Identifier",
                    "name": eventId
                },
                "init": {
                    "type": "ObjectExpression",
                    "properties": [
                        {
                            "type": "Property",
                            "key": {
                                "type": "Identifier",
                                "name": "dirty"
                            },
                            "computed": false,
                            "value": {
                                "type": "FunctionExpression",
                                "id": null,
                                "params": [],
                                "defaults": [],
                                "body": {
                                    "type": "BlockStatement",
                                    "body": [
                                        {
                                            "type": "IfStatement",
                                            "test": conditionAst,
                                            "consequent": {
                                                "type": "BlockStatement",
                                                "body": statements
                                            },
                                            "alternate": null
                                        }
                                    ]
                                },
                                "generator": false,
                                "expression": false
                            },
                            "kind": "init",
                            "method": false,
                            "shorthand": false
                        }
                    ]
                }
            }
        ],
        "kind": "var"
    };

    prog.addStmnt(eventAst);
}