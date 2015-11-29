function makeAssignmentRightAst(rightGraph, library, genericTypeParams) {
    var exprAst = makeExpr(rightGraph, library, genericTypeParams).getAst();
    var rightAst = exprAst;
    // If the right expression is an id, clone it
    if(isId(rightGraph)) {
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

    return rightAst;
}

function makeDestructAssignment(assignmentGraph, library, genericTypeParams) {
    var rightAst = makeAssignmentRightAst(assignmentGraph.value, library, genericTypeParams);

    var bodyAst = [{
        "type": "VariableDeclarator",
        "id": {
            "type": "Identifier",
            "name": "__destruct"
        },
        "init": rightAst
    }];

    // TODO check existence and type of target
    _.each(assignmentGraph.targets, function(target, index) {
        var targetAst = makeRefAst(target, library, genericTypeParams);
        bodyAst.push({
            "type": "ExpressionStatement",
            "expression": {
                "type": "AssignmentExpression",
                "operator": "=",
                "left": targetAst,
                "right": {
                    "type": "MemberExpression",
                    "computed": true,
                    "object": {
                        "type": "Identifier",
                        "name": "__destruct"
                    },
                    "property": {
                        "type": "Literal",
                        "value": index
                    }
                }
            }
        });
    });

    _.each(assignmentGraph.targets, function(target) {
        var dirtyAst = makeDirtyAst(target, library, genericTypeParams);
        if(dirtyAst != null)
        {
            bodyAst.push({
                "type": "ExpressionStatement",
                "expression": dirtyAst
            });
        }
    });
    
    return {
        "type": "BlockStatement",
        "body": bodyAst
    };
}

function makeTargetAndDiryAst(targetGraph, library, genericTypeParams) {
    // TODO check existence, type ...
    if(targetGraph.type == "Id")
    {
        // If the reference is an attribute of current object (if we are in an object),
        // The reference must be a this expression
        // TODO change for object syntax
        var id = targetGraph.name;
        if(id in library.attribs)
        {
            return {
                target : {
                    "type": "MemberExpression",
                    "computed": false,
                    "object": {
                        "type": "ThisExpression"
                    },
                    "property": {
                        "type": "Identifier",
                        "name": id
                    }
                },
                dirty : null
            };
        } else {
            var node = library.nodes[id];
            var dirtyAst = null;
            if(node.sinkListVarName.length > 0)
            {
                dirtyAst = {
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

            return {
                target : {
                    "type": "Identifier",
                    "name": id
                },
                dirty : dirtyAst
            }
        }
    } else if(targetGraph.type == "MemberReference")
    {
        var targetandDirtyAst = makeTargetAndDiryAst(targetGraph.obj, library, genericTypeParams);
        return {
            target : {
                "type": "MemberExpression",
                "computed": false,
                "object": targetandDirtyAst.target,
                "property": {
                    "type": "Identifier",
                    "name": targetGraph.field.name
                }
            },
            dirty : targetandDirtyAst.dirty
        };
    }
}

function getSetterAst(targetGraph, library, genericTypeParams, valueAst) {
    var targetandDirtyAst = makeTargetAndDiryAst(targetGraph, library, genericTypeParams);
    
    // TODO check existence and type of target
    var assignmentAst = {
        "type": "ExpressionStatement",
        "expression": {
            "type": "AssignmentExpression",
            "operator": "=",
            "left": targetandDirtyAst.target,
            "right": valueAst
        }
    };

    if(targetandDirtyAst.dirty != null)
    {
        return {
            "type": "BlockStatement",
            "body": [
                assignmentAst,
                {
                    "type": "ExpressionStatement",
                    "expression": targetandDirtyAst.dirty
                }
            ]
        };
    }

    return assignmentAst;
}
function makeAssignment(assignmentGraph, library, genericTypeParams) {
    var rightAst = makeAssignmentRightAst(assignmentGraph.value, library, genericTypeParams);

    var assignmentAst =  getSetterAst(assignmentGraph.target, library, genericTypeParams, rightAst);
    
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

function makeReturnStatement(returnGraph, library, genericTypeParams) {
    // TODO check existence and type of slot
    var argAst = makeExpr(returnGraph.val, library, genericTypeParams).ast;
    return {
        "type": "ReturnStatement",
        "argument": argAst
    };
}

function makeStatementBlock(blockGraph, library, genericTypeParams) {
    var statements = _.map(blockGraph.statements, function(statement) {
        return makeStatement(statement, library, genericTypeParams);
    });

    return {
        "type": "BlockStatement",
        "body": statements     
    };
}

function makeStatement(statementGraph, library, genericTypeParams) {
    switch(statementGraph.type) {
        case "StatementBlock":
            return makeStatementBlock(statementGraph, library, genericTypeParams);
        case "Assignment":
            return makeAssignment(statementGraph, library, genericTypeParams);
        case "DestructAssignment":
            return makeDestructAssignment(statementGraph, library, genericTypeParams);
        case "SignalSending":
            return makeSignal(statementGraph, library, genericTypeParams);
        case "ReturnStatement":
            return makeReturnStatement(statementGraph, library, genericTypeParams);
    }
    error("Unrecognized statement type ", statementGraph.type);
}

function fillLocalLibraryWithParams(localLibrary, paramsGraph) {
    _.each(paramsGraph, function(param) {
        if(param.type.length == 0) {
            error("Slot parameter " + param.id.name + " has no type");
        }
        var getterAst = {
            "type": "Identifier",
            "name": param.id.name
        };
        localLibrary.nodes[param.id.name] = new Node(getterAst, typeGraphToCompact(param.type));
    });
}

function makeSlot(slotGraph, localLibrary, prog, astType, idAst) {
    var paramsGraph = slotGraph.params;
    fillLocalLibraryWithParams(localLibrary, paramsGraph);
    var statementAst = makeStatement(slotGraph.statement, localLibrary, {});
    // If statement is not already a block, put it into a block
    if(slotGraph.statement.type != "StatementBlock") {
        statementAst =  {
            "type": "BlockStatement",
            "body": [statementAst]
        };
    }
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
        "body": statementAst,
        "generator": false,
        "expression": false
    };

    return slotAst;
}

function makeGlobalSlot(actionGraph, library, prog) {
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