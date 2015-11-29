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

        // Extract attribs (attribs) from the list of fields
		var attribs = _.filter(structGraph.fields, function(field) {
			return field.type === "Property";
		});
			
        // Make properties ast from attributes graph
		var propertiesAst = _.map(attribs, function(field) {
            // field.id.name : field.id.name
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

        // TODO remove slots from structs (?)
        // Extract slots from the list of fields
		var slots = _.filter(structGraph.fields, function(field) {
			return field.type === "Slot";
		});

        // Concat properties ast made from slots graph
        propertiesAst = propertiesAst.concat(_.map(slots, function(slotGraph) {
		    var localLibrary = _.clone(library);
		    localLibrary.nodes = _.clone(localLibrary.nodes);
		    localLibrary.attribs = _.clone(localLibrary.attribs);
		    _.each(attribs, function(varGraph) {
                // this.varGraph.id.name
				var getterAst = {
                    "type": "MemberExpression",
                    "computed": false,
                    "object": {
                        "type": "ThisExpression"
                    },
                    "property": {
                        "type": "Identifier",
                        "name": varGraph.id.name
                    }
                };
                localLibrary.nodes[varGraph.id.name] = new Node(getterAst, typeGraphToCompact(varGraph.varType));
                localLibrary.attribs[varGraph.id.name] = {};
			});	

            // function(...) {...}
			var slotAst = makeSlot(
		        slotGraph,
		        localLibrary,
		        prog,
		        "FunctionExpression",
		        null
		    );

            // slotGraph.id.name : function(...) {...}
			return {
                "type": "Property",
                "key": {
                    "type": "Identifier",
                    "name": slotGraph.id.name
                },
                "computed": false,
                "value": slotAst,
                "kind": "init",
                "method": false,
                "shorthand": false
            }
        }));

        // Extract parameters id and type from list of attributes
        var params = _.map(attribs, function(variable) {
            return {
                id : variable.id,
                type : variable.varType
            };
        });

        var typeParams = _.map(structGraph.typeParams, typeGraphToCompact);
		prog.addStmnt(
            buildFunctionOrStruct(
    			structGraph,
    			id,
    			params,
    			makeType(id, typeParams),
    			{
                    "type": "ObjectExpression",
                    "properties": propertiesAst
                },
                library
            )
        );
		
		var typeParamsName = _.map(typeParams, function(typeParam) {
			return typeParam.base;
		});

        library.classes[id] = function(typeArgs) {
        	return {
        		// Dict from attribs name to its type
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
