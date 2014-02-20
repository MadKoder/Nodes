$(document).ready(function ()
{

var library =
{
	nodes : nodes,
	functions : functions,
	actions : actions
};
$.get("closures.nodes", function( text ) {
// $.get( "structSlots.nodes", function( text ) {
	setLodash(_);
	setEngineLodash(_);

	var codeGraph = codeToGraph(text, library, parser);
	var code = compileGraph(codeGraph, library);	

	$('#var').html(code.a.get());
	$('#list').html(code.l2.get());
}
, "text" // Commenter pour lire du json
);

})