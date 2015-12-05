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

    // Iterate on constructor params
    /////////////////////
    var fieldsNodes = {};
    var paramsId = [];
    _.each(classGraph.constructorParams, function(fieldGraph) {
        if(fieldGraph.type == "Def") {
            var defDeclaration = makeDefInNode(fieldGraph, localLibrary);
            bodyAst.push(defDeclaration.ast);
            var fieldName = fieldGraph.id.name;
            attribs[fieldName] = {
                type : defDeclaration.type,
                getGetterAst : defDeclaration.getGetterAst
            };
        } else if(fieldGraph.type == "ClassVar") {
            var varDeclaration = makeClassConstructorVar(fieldGraph, localLibrary);
            // this.id = id
            bodyAst.push(varDeclaration.ast);

            // Adds attribute infos
            var fieldName = fieldGraph.id.name;
            attribs[fieldName] = {
                type : varDeclaration.type,
                getGetterAst : varDeclaration.getGetterAst
            };

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
            bodyAst.push(makeThisDeclaration(sinkListVarName, declaratorInit));

            // Adds attribute id to function params
            paramsId.push(fieldName);
        }
    });

    var classAst = ast.functionDeclaration(
        id,
        paramsId,
        bodyAst
    );
    prog.addStmnt(classAst);
}
