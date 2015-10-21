
function makeRefAst(ref, library, genericTypeParams)
{
    // TODO check existence, type ...
    if(ref.type == "Id")
    {
        // If the reference is an attribute of current object (if we are in an object),
        // The reference must be a this expression
        if(ref.name in library.attribs)
        {
            return {
                "type": "MemberExpression",
                "computed": false,
                "object": {
                    "type": "ThisExpression"
                },
                "property": {
                    "type": "Identifier",
                    "name": ref.name
                }
            }
        }
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

function makeAssignment(assignmentGraph, library, genericTypeParams) {
    var exprAst = makeExpr(assignmentGraph.value, library, genericTypeParams).getAst();
    var targetAst =  makeRefAst(assignmentGraph.target, library, genericTypeParams, true);

    // TODO check existence and type of target
    return {
        "type": "ExpressionStatement",
        "expression": {
            "type": "AssignmentExpression",
            "operator": "=",
            "left": targetAst,
            "right": exprAst
        }
    };
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
    var localLibrary = _.clone(library);
    localLibrary.nodes = _.clone(localLibrary.nodes);

    var slotAst = makeSlot(
        actionGraph,
        localLibrary,
        prog,
        "FunctionDeclaration", {
            "type": "Identifier",
            "name": actionGraph.id.name
        }
    );

    prog.addStmnt(slotAst);
}