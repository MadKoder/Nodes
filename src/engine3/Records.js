function makeRecord(recordGraph, library, prog)
{
	var recordAst = {
        "type": "ObjectExpression",
        "properties": [
            {
                "type": "Property",
                "key": {
                    "type": "Identifier",
                    "name": "x"
                },
                "computed": false,
                "value": {
                    "type": "Literal",
                    "value": 1,
                    "raw": "1"
                },
                "kind": "init",
                "method": false,
                "shorthand": false
            }
        ]
    }
    prog.addStmnt(recordAst);                    
}
