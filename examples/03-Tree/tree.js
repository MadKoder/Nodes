$(document).ready(function ()
{

var library =
{
	nodes : nodes,
	functions : functions,
	actions : actions
};

function makeViewUpdater(createViewFunc, updateViewFunc, deleteViewFunc)
{
	function updateView(model, view)
	{
		return _(model)
			.zip(view)
			.map(function(modelView)
			{
				var model = modelView[0];
				var view = modelView[1];
				if(model == undefined)
				{
					deleteViewFunc(view);
					return undefined;
				} else if(view == undefined)
				{
					return createViewFunc(model);
				} 
				updateViewFunc(model, view);
				return view;
			})
			.take(model.length)
			.value();
	}
	return updateView;
}

paper.install(window);

$.get("tree.nodes", function( text ) {
// $.get( "structSlots.nodes", function( text ) {
	setLodash(_);
	setEngineLodash(_);

	var canvas = document.getElementById('canvas');
	paper.setup(canvas);
	
	var codeGraph = codeToGraph(text, library, parser);
	var code = compileGraph(codeGraph, library);
	
	// var rect = new paper.Rectangle(10, 20, 200, 100);
	// console.log(rect);
	// var shape = new paper.Shape.Rectangle(rect);
	// shape.strokeColor = 'black';
	
	function deleteElement(e)
	{
		e.remove();
	}
	
	function createRect(model)
	{
		var rect = new paper.Shape.Rectangle({
			point: [model.pos.x, model.pos.y],
			size: [model.size.x, model.size.y],
			strokeColor: 'black'
		});
		return rect;
	}
	
	function updateRect(model, view)
	{
		view.size = new paper.Size(model.size.x, model.size.y);
		view.position = new Point(model.pos.x + model.size.x * .5, model.pos.y + model.size.y * .5);
	}
	
	var updateRectView = makeViewUpdater(createRect, updateRect, deleteElement);
	var rectsView = [];
	$states = $('#states');
	var stateStr = "";
	var leafStates = code.leafStates.get();
	_.each(leafStates, function(state)
	{
		stateStr = stateStr + ", " + state.color.g.toString();
	});
	$states.html(stateStr);
	//view.draw();
	var tick   = Bacon.interval(20);
	tick.onValue(function(t)
	{
		code.tick.signal();
		rectsView = updateRectView(code.rects.get(), rectsView);
		view.draw();
	});
}
, "text" // Commenter pour lire du json
);

})