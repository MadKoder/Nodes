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

    // Iterate on fields
    /////////////////////
    var fieldsNodes = {};
    _.each(nodeGraph.fields, function(fieldGraph) {
        if(fieldGraph.type == "Def") {
            var defDeclaration = makeDefInNode(fieldGraph, localLibrary);
            bodyAst.push(defDeclaration.ast);
            var fieldName = fieldGraph.id.name;
            attribs[fieldName] = {
                type : defDeclaration.type,
                getGetterAst : defDeclaration.getGetterAst
            };
        } else if(fieldGraph.type == "Var") {
            var varDeclaration = makeVarInNode(fieldGraph, localLibrary);
            bodyAst.push(varDeclaration.ast);
            var fieldName = fieldGraph.id.name;
            attribs[fieldName] = {
                type : varDeclaration.type,
                getGetterAst : varDeclaration.getGetterAst
            };

            // Builds sink list var name for this field
            // should be parent$field$sinkList
            var sinkListVarName = "";
            // The member path is in the form n.x, this is what is stored in sourceToSinks
            var memberPath = id + "." + fieldName;
            
        }
    });

    var classAst = ast.functionDeclaration(
        id,
        [],
        bodyAst
    );
    prog.addStmnt(classAst);
}
