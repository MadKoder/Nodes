function makeStruct(structGraph, library, prog)
{
	var id = structGraph.id.name;
	// If the function has been predeclared, complete the object
	if(id in library.functions)
	{
		var func = library.functions[id];
		var funcNode = library.nodes[id];
	}
	else
	{
		// Else create a new function instance object
		var vars = _.filter(structGraph.fields, function(field) {
			return field.type === "Var";
		});
			
		var properties = _.map(vars, function(field) {
            return {
                "type": "Property",
                "key": {
                    "type": "Identifier",
                    "name": field.id.name
                },
                "computed": false,
                "value": {
                    "type": "Identifier",
                    "name": field.id.name
                },
                "kind": "init",
                "method": false,
                "shorthand": false
            };
        });

        var params = _.map(vars, function(variable) {
            return {
                id : variable.id,
                type : variable.varType
            };
        });

        var typeParams = _.map(structGraph.typeParams, typeGraphToCompact);
		buildFunctionOrStruct(
			structGraph,
			id,
			params,
			makeType(id, typeParams),
			{
                "type": "ObjectExpression",
                "properties": properties
            },
            library,
            prog
        );
		
		var typeParamsName = _.map(typeParams, function(typeParam) {
			return typeParam.base;
		});

        library.classes[id] = function(typeArgs) {
        	return {
        		// Dict from vars name to its type
	        	varsType : _.zipObject(
        			_.map(params, function(variable) {
	        			return [
	        				variable.id.name,
	        				instanciateType(
	        					typeGraphToCompact(variable.type),
	        					// Converts positionnal typeArgs to genericToInstanceDict
	        					// First param is name of type params
	        					// Seccond param is list of their args
	        					_.zipObject(
	        						typeParamsName,
	        						typeArgs
        						)
        					)
	        			];
	        		})
        		)
	        };
	    }
	}
}
