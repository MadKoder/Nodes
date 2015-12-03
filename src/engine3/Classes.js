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

    var classAst = ast.functionDeclaration(
        id,
        [],
        [thatAst]
    );
    prog.addStmnt(classAst);
}
