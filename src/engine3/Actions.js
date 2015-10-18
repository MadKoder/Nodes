function makeAssignment(assignmentGraph, library) {
	var exprAst = makeExpr(assignmentGraph.value, library, {}).getAst();
    var targetAst
	// TODO check existence and type of target
	return {
        "type": "ExpressionStatement",
        "expression": {
            "type": "AssignmentExpression",
            "operator": "=",
            "left": {
                "type": "Identifier",
                "name": assignmentGraph.target.name
            },
            "right": exprAst
        }
    };
}

function makeRefAst(ref, library, genericTypeParams)
{
    // TODO check existence, type ...
    if(ref.type == "Id")
    {
        return {
            "type": "Identifier",
            "name": ref.name
        }
    } else if(ref.type == "MemberReference")
    {
        var objAst = makeRefAst(ref.obj, library, {});
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

function makeSignal(signalGraph, library) {
	// TODO check existence and type of slot
	var argsAst = _.map(signalGraph.args, function(arg) {
		return makeExpr(arg, library, {}).getAst();
	});
    var slotAst = makeRefAst(signalGraph.slot, library, {});
	return {
        "type": "ExpressionStatement",
        "expression": {
            "type": "CallExpression",
            "callee": slotAst,
            "arguments": argsAst
        }
    };
}

function makeStatement(statementGraph, library) {
	switch(statementGraph.type) {
		case "Assignment":
			return makeAssignment(statementGraph, library);
		case "Signal":
			return makeSignal(statementGraph, library);
	}
}

function makeAction(actionGraph, library, prog) {
	var localLibrary = _.clone(library);
	localLibrary.nodes = _.clone(localLibrary.nodes);
	var paramsGraph = actionGraph.params;
	_.each(paramsGraph, function(param) {
		var getterAst = {
            "type": "Identifier",
            "name": param.id.name
        };
		localLibrary.nodes[param.id.name] = new Node(getterAst, typeGraphToCompact(param.type));
	});	
	var statements = _.map(actionGraph.statements, function(statement) {
		return makeStatement(statement, localLibrary)
	});
	var paramsAst = _.map(paramsGraph, function(param) {
		return {
            "type": "Identifier",
            "name": param.id.name
        }
	});
	var actionAst = {
        "type": "FunctionDeclaration",
        "id": {
            "type": "Identifier",
            "name": actionGraph.id.name
        },
        "params":paramsAst,
        "defaults": [],
        "body": {
            "type": "BlockStatement",
            "body": statements	                
        },
        "generator": false,
        "expression": false
    };

	prog.addStmnt(actionAst);
}