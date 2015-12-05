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
    var localLibrary = makeLocalLibrary(library);

    // self.getter = that
    var selfGetterAst = {
            "type": "Identifier",
            "name": "that"
    };
    localLibrary.nodes["self"] = new Node(selfGetterAst, makeBaseType(id));

    var classAst = ast.functionDeclaration(
        id,
        [],
        bodyAst
    );
    prog.addStmnt(classAst);
}
