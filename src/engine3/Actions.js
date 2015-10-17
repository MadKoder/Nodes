function makeAssignment(assignmentGraph, library) {
	var exprAst = makeExpr(assignmentGraph.value, library, {}).getAst();
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

function makeSignal(signalGraph, library) {
	// TODO check existence and type of slot
	var argsAst = _.map(signalGraph.args, function(arg) {
		return makeExpr(arg, library, {}).getAst();
	});
	return {
        "type": "ExpressionStatement",
        "expression": {
            "type": "CallExpression",
            "callee": {
                "type": "Identifier",
                "name": signalGraph.slot.name
            },
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