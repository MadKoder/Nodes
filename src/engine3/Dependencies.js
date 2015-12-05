function setEngineLodash(l)
{
    _=l;
}

function __createOrConcat(array, arrayToConcat) {
    if(array == undefined) {
        array = arrayToConcat;
    } else {
        array = array.concat(arrayToConcat);
    }

    return array;
}

// Recursively gets sources of an expression
function makeDependencies(exprGraph, sinkId, sinkToSources, objectRefs, parentNodeId)
{
    // If the expression is an id, it is a source (maybe not root)
    if(exprGraph.type == "Id") {
        var sourceId = exprGraph.name;
        sinkToSources[sinkId][sourceId] = {};
    } else if(exprGraph.type == "FunctionCall") {
        _.each(exprGraph.args, function(arg) {
            makeDependencies(arg, sinkId, sinkToSources, objectRefs, parentNodeId);
        });
    }  else if(exprGraph.type == "MemberExpression") {
        var objId = exprGraph.obj.name;
        // If the object name is "self", change it to parent if it's defined
        // if(objId == "self" && parentNodeId.length > 0) {
        //  objId = parentNodeId;
        // }
        // The dependency is a node refs, dependendy must be made to the field
        if(objId in objectRefs) {
            var sourceId = objectRefs[objId] + "." + exprGraph.field.name;
            sinkToSources[sinkId][sourceId] = {};
        } else {
            makeDependencies(exprGraph.obj, sinkId, sinkToSources, objectRefs, parentNodeId);
        }
    }
}

function updateSourceToSinks(graph, sourceToSinks, objectRefs) {
    var sinkToSources = {};

    for(var statementIndex = 0; statementIndex < graph.length; statementIndex++) {
        var statementGraph = graph[statementIndex];
        if(statementGraph.type == "NodeDef") {
            objectRefs[statementGraph.id.name] = statementGraph.id.name;
        } else if(statementGraph.type == "Var" && statementGraph.val.type == "NewExpression") {
            // TODO replace "Var" by "Cst"/"Val", we shouldn't have dependencies to store references
            objectRefs[statementGraph.id.name] = statementGraph.id.name;
        }
    };

    // Builds the sinkToSources dict
    // For each leaf sink (defs), get its direct sources by examining its expression
    // Note that sources in this dict may also be defs, i.e. not root sources
    var graphNodes = graph.nodes;
    for(var statementIndex = 0; statementIndex < graph.length; statementIndex++) {
        var statementGraph = graph[statementIndex]; 
        // If node is a def, it is a sink
        if(statementGraph.type == "Def") {
            var nodeGraph = statementGraph;
            var sinkId = nodeGraph.id.name;
            sinkToSources[sinkId] = {};

            // Recursively gets sources of an expression                
            makeDependencies(nodeGraph.val, sinkId, sinkToSources, objectRefs, "");
        } else if(statementGraph.type == "NodeDef") {
            var nodeGraph = statementGraph;
            var nodeId = nodeGraph.id.name;
            _.each(nodeGraph.fields, function(fieldGraph) {             
                if(fieldGraph.type == "Def") {
                    var sinkId = nodeId + "." + fieldGraph.id.name;
                    sinkToSources[sinkId] = {};
                    // Each reference to self is transformed to nodeId
                    objectRefs["self"] = nodeId;
                    // Recursively gets sources of an expression                
                    makeDependencies(fieldGraph.val, sinkId, sinkToSources, objectRefs, nodeId);
                }
            });
        }
    }

    // Adds events sources to the sink to sources dict
    /*var eventsGraph = graph.events;
    for(var i = 0; i < eventsGraph.length; i++) {
        var eventGraph = eventsGraph[i];
        var eventId = "__event__" + i;
        sinkToSources[eventId] = {};
        makeDependencies(eventGraph.condition, eventId, sinkToSources, objectRefs);
    }*/

    // Builds the root sources to leaf sinks dict,
    // From each sink, goes up to its sources, and recursively sources of sources ...
    // When a source is not in the sinkToSources dict, it's a root source (a var)
    for(leafSinkId in sinkToSources) {
        function addRootSourcesOfCurrentLeafSink(sinkId) {
            // Source is a def, adds its sinks
            if(sinkId in sinkToSources) {
                var sources = sinkToSources[sinkId];
                _.each(sources, function(dummy, sinkId) {
                    addRootSourcesOfCurrentLeafSink(sinkId)
                });
            } else {
                // Source root, adds it to the dict if not already in,
                // And adds the leaf sink in its sinks dict
                if(!(sinkId in sourceToSinks)) {
                    sourceToSinks[sinkId] = [];
                }
                // Adds the sink if not already in the sink array
                sourceToSinks[sinkId] = _.union(
                    sourceToSinks[sinkId],
                    [leafSinkId]
                );
            }
        }

        // Begin with the leaf sink as its own source
        addRootSourcesOfCurrentLeafSink(leafSinkId);
    }
}
