function setEngineLodash(l)
{
    _=l;
}

function setLibrary(lib)
{
    library = lib;
}

function Node(getterAst, type, sinkListVarName, fields)
{
    this.type = type;
    this.getterAst = getterAst;
    this.sinkListVarName = sinkListVarName != undefined ? sinkListVarName : "";
    this.fields = fields != undefined ? fields : {};
}

function __dirtySinks(sinks){
    _.each(sinks, function(sink) {
        sink.dirty();
    });
}

function __def(getter)
{
    return {
        get : function() {
            if(this.isDirty) {
                this.val = getter();
                this.isDirty = false;
            }
            return this.val;
        },
        isDirty : true,
        dirty : function() {
            this.isDirty = true;
        },
        val : null
    };
}

function __defWithDependencies(getter, object, sinkListName)
{
    return {
        get : function() {
            if(this.isDirty) {
                this.val = getter();
                this.isDirty = false;
            }
            return this.val;
        },
        isDirty : true,
        dirty : function() {
            this.isDirty = true;
            __dirtySinks(object[sinkListName]);
        },
        val : null
    };
}

function compileGraph(graph, library, previousNodes) 
{
    prog = {
        type: "Program",
        body: [],
        addStmnt : function(stmnt)
        {
            this.body.push(stmnt);
        }
    };
    
    var functions = _.filter(graph, function(statementGraph) {
        return statementGraph.type == "FunctionDef";
    });

    var functionsDeclaration = {};
    for (var i = functions.length - 1; i >= 0; i--) {
        var functionGraph = functions[i];
        var id = functionGraph.id.name;

        // Fills argsType and for untyped params, make typeParams and fill their types
        var argsType = [];
        _.each(functionGraph.params, function(paramGraph) {
            if(paramGraph.type == null) {
                var paramTypeName = paramGraph.id.name + "$Type";
                functionGraph.typeParams.push({
                    type : "Id",
                    name : paramTypeName
                });
                paramGraph.type = {
                    type : "Id",
                    name : paramTypeName
                };
                argsType.push(makeBaseType(paramTypeName));
            } else {
                argsType.push(typeGraphToEngine(paramGraph.type));
            }
        });
        var returnTypeGraph = functionGraph.returnType;
        if(returnTypeGraph.length == 0) {
            var returnTypeName = id + "$ReturnType";
            var returnType = makeBaseType(returnTypeName);
        } else {
            var returnType = typeGraphToEngine(returnTypeGraph);
        }

        // list<string>
        var typeParams = _.map(functionGraph.typeParams, function(typeParamGraph) {
            return typeParamGraph.name;
        });

        functionsDeclaration[id] = {
            graph : functionGraph,
            typeParams : typeParams,
            inputs : argsType,
            output : returnType,
            typeParamsToInstance : {"x$Type" : makeBaseType("int")},
            typeEvaluated : "no"
        };
    }

    library.functionsDeclaration = functionsDeclaration;

    // var functionTypeToInferLeft = true;
    // while(functionTypeToInferLeft) {
    //     functionTypeToInferLeft = false;
    //     for (var i = functions.length - 1; i >= 0; i--) {
    //         var functionGraph = functions[i];
    //         var id = functionGraph.id.name;
    //         var functionDeclaration = functionsDeclaration[id];
    //         // Function not totally evaluated
    //         if(functionDeclaration.typeEvaluated != "yes") {
    //             var localLibrary = _.clone(library);
    //             // Build local nodes from params
    //             localLibrary.nodes = {};
    //             _.each(functionGraph.params, function(param) {
    //                 localLibrary.nodes[param.id.name] = new Node({
    //                         "type": "Identifier",
    //                         "name": param.id.name
    //                     },
    //                     typeGraphToEngine(param.type)
    //                 );
    //             });

    //             var newFunctionType = inferFunctionType(
    //                 functionDeclaration,
    //                 localLibrary, 
    //                 functionsDeclaration,
    //                 typeParams
    //             );

    //             var functionType = {
    //                 inputs : functionDeclaration.inputs,
    //                 output : functionDeclaration.output
    //             };
    //             // We want to reevaluate after if at least one function has been infered
    //             functionTypeToInferLeft = 
    //                 functionTypeToInferLeft ||
    //                 !_.isEqual(newFunctionType, functionType);
    //         }
    //     }
    // }
    var sourceToSinks = {};
    var objectRefs = {};
    updateSourceToSinks(graph, sourceToSinks, objectRefs);

    for(var statementIndex = 0; statementIndex < graph.length; statementIndex++) {
        var statementGraph = graph[statementIndex];
        if(statementGraph.type == "Var") {
            makeVar(statementGraph, library, prog, sourceToSinks);
        }
        else if(statementGraph.type == "Def") {
            makeDef(statementGraph, library, prog);
        } else if(statementGraph.type == "SlotDef") {
            makeGlobalSlot(statementGraph, library, prog);
        } else if(statementGraph.type == "SignalDef") {
            makeSignalDef(statementGraph, library, prog);
        } else if(statementGraph.type == "GenDef") {
            makeGenDef(statementGraph, library, prog);
        } else if(statementGraph.type == "ChainedConnection") {
            makeChainedConnection(statementGraph, library, prog);
        } else if(statementGraph.type == "NodeDef") {
            makeNodeDef(statementGraph, library, prog, sourceToSinks);
        } else if(statementGraph.type == "ClassDef") {
            makeClass(statementGraph, library, prog);
        } else if(statementGraph.type == "FunctionDef") {
            makeFunction(statementGraph, library, prog);
        }
    }

    // Build the dependencies arrays
    ////////////////////////////////
    for(var id in sourceToSinks) {
        var objMember = id.split(".");
        // If source is a member of an object
        if(objMember.length > 1) {
            // TODO member depth > 1
            var sinks = sourceToSinks[id];
            // It's an array made of the id of the leaf sinks
            // var id$sinkList = [_.map(sinks, ast.id)];
            var sinksAst = {
                "type": "ArrayExpression",
                "elements": _.map(sinks, ast.id)
            };
            
            sinkListVarName = objMember[1] + "$sinkList";

            // obj.member$sinkList = sinks;
            var assignmentAst = {
                "type": "ExpressionStatement",
                "expression": {
                    "type": "AssignmentExpression",
                    "operator": "=",
                    "left": ast.memberExpression(ast.id(objMember[0]), sinkListVarName),
                    "right": sinksAst
                }
            }
            // This function will make the array if it does not exist (a class var without internal dependencies)
            // or concat to it otherwise
            // __createOrConcat(obj.member$sinkList, sinks);
            var createOrConcatAst = ast.callExpression(
                "__createOrConcat",
                [
                    ast.memberExpression(ast.id(objMember[0]), sinkListVarName),
                    sinksAst
                ]
            );

            // obj.member$sinkList = __createOrConcat(obj.member$sinkList, sinks);
            var assignmentAst = {
                "type": "ExpressionStatement",
                "expression": {
                    "type": "AssignmentExpression",
                    "operator": "=",
                    "left": ast.memberExpression(ast.id(objMember[0]), sinkListVarName),
                    "right": createOrConcatAst
                }
            }
            prog.addStmnt(assignmentAst);
        } else {
            // The members path in sourceToSinks are in the form n.x
            // we transform them in the form n$x to be able to make valid variable names
            sinkListVarName = id + "$sinkList";
            var sinks = sourceToSinks[id];
            // It's an array made of the id of the leaf sinks
            // var id$sinkList = [_.map(sinks, ast.id)];
            var declaratorInit = {
                "type": "ArrayExpression",
                "elements": _.map(sinks, ast.id)
            };
            var varDeclaration = ast.varDeclaration(sinkListVarName, declaratorInit);
            prog.addStmnt(varDeclaration);
        }
    }

    // Adds events sources to the sink to sources dict
    // for(var i in eventsGraph) {
    //  var eventGraph = eventsGraph[i];
    //  var eventId = "__event__" + i;
    //  makeEvent(eventGraph, eventId, library, prog);
    // }

    return prog;

    if("structsAndFuncs" in graph)
    {
        var structsAndfuncsGraph = graph.structsAndFuncs;
        for(var i = 0; i < structsAndfuncsGraph.length; i++)
        {
            if("func" in structsAndfuncsGraph[i])
            {
                makeFunction(structsAndfuncsGraph[i].func, library, prog);
            } else //struct
            {
                makeStruct(structsAndfuncsGraph[i].struct, library, prog);
            }
        }
    }

    var actionsGraph = graph.actions;
    for(var i = 0; i < actionsGraph.length; i++)
    {
        makeAction(actionsGraph[i], library, prog);
    }

    return prog;

    var eventsGraph = graph.events;
    var eventIndex = 0;
    for(var i = 0; i < eventsGraph.length; i++)
    {
        var eventGraph = eventsGraph[i];
        var condition = makeExpr(eventGraph["when"], nodes);
        var action = makeAction(eventGraph["do"], nodes, connectionsGraph);
        src += condition.getBeforeStr() + action.getBeforeStr();
        src += "var __event" + eventIndex.toString() + " = new Event(" + condition.getNode() + ", {signal:function(){" + action.getNode() + "}});\n";
        src += condition.getAddSinkStr("__event" + eventIndex.toString());
        eventIndex++;
    }
    
    return src;
}
