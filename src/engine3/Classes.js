// For the object trick of storing this at object creation
// {
//     var that = this;
// }
// Should be the first declaration of any class/object
var thatAst = {
    "type": "VariableDeclaration",
    "declarations": [
        {
            "type": "VariableDeclarator",
            "id": {
                "type": "Identifier",
                "name": "that"
            },
            "init": {
                "type": "ThisExpression"
            }
        }
    ],
    "kind": "var"
};

function makeThisDeclaration(id, defValAst) {
    return {
        "type": "ExpressionStatement",
        "expression": {
            "type": "AssignmentExpression",
            "operator": "=",
            "left": {
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
            "right": defValAst
        }
    };
}

function makeClassConstructorVar(varGraph, library) {
    var id = varGraph.id.name;     
    
    // _.clone(id, true);
    var declaratorInit = {
        "type": "CallExpression",
        "callee": ast.memberExpression(
            ast.id("_"),
            "clone"
        ),
        "arguments": [
            ast.id(id),
            ast.trueLit
        ]
    };

    // this.id = _.clone(id);
    var varDeclarationAst = makeThisDeclaration(id, declaratorInit);

    return {
        ast : varDeclarationAst,
        type : typeGraphToEngine(varGraph.explicitType),
        getGetterAst : function(objectAst) {
            // objectAst.id
            return ast.memberExpression(objectAst, id);
        }
    };
}

function makeClassDef(defGraph, library){
    var id = defGraph.id.name;

    var expr = makeExpr(defGraph.val, library, {});
    
    // id = __def(function() {return expr.getAst(); });
    var defValAst = getDefInitAst(expr);
    
    var defDeclarationAst = makeThisDeclaration(id, defValAst);

    return {
        ast : defDeclarationAst,
        type : expr.type,
        getGetterAst : function(objectAst) {
            // objectAst.id.get()
            return {
                "type": "CallExpression",
                "callee": {
                    "type": "MemberExpression",
                    "computed": false,
                    "object": ast.memberExpression(objectAst, id),
                    "property": {
                        "type": "Identifier",
                        "name": "get"
                    }
                },
                "arguments": []
            };
        }
    };
}

function makeClass(classGraph, library, prog)
{
	var id = classGraph.id.name;
    var bodyAst = [thatAst];
    // Adds class definition
    var attribs = {};
    library.classes[id] = function(typeArgs) {
        return {
            attribs : attribs
        };
    };

    var localLibrary = makeLocalLibrary(library);

    // Adds self node getter in local node library
    // self.getter = that
    var selfGetterAst = {
            "type": "Identifier",
            "name": "that"
    };
    localLibrary.nodes["self"] = new Node(selfGetterAst, makeBaseType(id));
    
    // Make sourceToSinks
    ///////////////////////
    var sourceToSinks = {};
    var objectRefs = {
        "self" : "that"
    };
    updateSourceToSinks(classGraph.params, sourceToSinks, objectRefs);
    updateSourceToSinks(classGraph.fields, sourceToSinks, objectRefs);

    // Iterate on constructor params
    //////////////////////////////////////////
    var fieldsNodes = {};
    var paramsId = [];
    var classParams = [];
    _.each(classGraph.params, function(fieldGraph) {
        if(fieldGraph.type == "ClassVar") {
            var fieldName = fieldGraph.id.name;

            var varDeclaration = makeClassConstructorVar(fieldGraph, localLibrary);
            // this.id = id
            bodyAst.push(varDeclaration.ast);

            // Builds sink list var name for this attribute
            var sinkListVarName = fieldName + "$sinkList";
            // that.id
            var getterAst = ast.memberExpression(
                ast.id("that"),
                id
            );
            fieldsNodes[fieldName] = new Node(getterAst, varDeclaration.type, sinkListVarName);
            var declaratorInit = {
                "type": "ArrayExpression",
                "elements": []
            };
            // this.id$sinkListVarName = [];
            // bodyAst.push(makeThisDeclaration(sinkListVarName, declaratorInit));

            // Adds attribute id to function params
            paramsId.push(fieldName);

            classParams.push({
                id : fieldName,
                type : varDeclaration.type
            });

            // Adds attribute definition
            attribs[fieldName] = {
                type : varDeclaration.type,
                getGetterAst : varDeclaration.getGetterAst,
                sinkListVarName : sinkListVarName
            };
        }
    });

    _.each(classGraph.fields, function(fieldGraph) {
        if(fieldGraph.type == "Def") {
            var defDeclaration = makeClassDef(fieldGraph, localLibrary);
            bodyAst.push(defDeclaration.ast);
            var fieldName = fieldGraph.id.name;
            attribs[fieldName] = {
                type : defDeclaration.type,
                getGetterAst : defDeclaration.getGetterAst,
                sinkListVarName : ""                
            };
        }
    });


    for(var sourceId in sourceToSinks) {
        var objMember = sourceId.split(".");
        // TODO member depth > 1
        var sinks = sourceToSinks[sourceId];
        // It's an array made of the id of the leaf sinks
        // var id$sinkList = [_.map(sinks, ast.id)];
        var sinksAst = {
            "type": "ArrayExpression",
            "elements": _.map(sinks, function(sink) {
                return ast.memberExpression(ast.thisExpression, sink);
            })
        };
        
        sinkListVarName = objMember[1] + "$sinkList";

        // obj.member$sinkList = sinks;
        var assignmentAst = {
            "type": "ExpressionStatement",
            "expression": {
                "type": "AssignmentExpression",
                "operator": "=",
                "left": ast.memberExpression(ast.thisExpression, sinkListVarName),
                "right": sinksAst
            }
        }
        bodyAst.push(assignmentAst);
    }

    var classAst = ast.functionDeclaration(
        id,
        paramsId,
        bodyAst
    );
    prog.addStmnt(classAst);

    library.classes[id] = function(typeArgs) {
        return {
            params : classParams,
            attribs : attribs
        };
    }
}
