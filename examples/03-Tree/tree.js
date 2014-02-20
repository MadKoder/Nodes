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
	
	function createCircle(model)
	{
		//var circleModel = model[0];
		// var stateSet = model[1];
		var circleModel = model;
		var stateSet = circleModel.stateSet;
		var color = stateSet.color;
		var circle = new paper.Shape.Circle({
			point: [circleModel.pos.x, circleModel.pos.y],
			radius: [circleModel.radius],
			fillColor: new Color(color.r, color.g, color.b)
		});
		return circle;
	}
	
	function updateCircle(model, view)
	{
		//var circleModel = model[0];
		// var stateSet = model[1];
		var circleModel = model;
		var stateSet = circleModel.stateSet;
		var color = stateSet.color;
		view.radius = circleModel.radius;
		view.position = new Point(circleModel.pos.x + circleModel.radius * .5, circleModel.pos.y + circleModel.radius * .5);
		view.fillColor.red = color.r; 
		view.fillColor.green = color.g; 
		view.fillColor.blue = color.b; 
	}
	
	var updateRectView = makeViewUpdater(createRect, updateRect, deleteElement);
	var rectViews = [];	
	var updateCircleView = makeViewUpdater(createCircle, updateCircle, deleteElement);
	var circleViews = [];
	
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
	code.addRect.signal(code.root.get());
	tick.onValue(function(t)
	{
		code.tick.signal();
		rectViews = updateRectView(code.rects.get(), rectViews);
		circleViews = updateCircleView(code.circles.get(), circleViews);
		view.draw();
	});
}
, "text" // Commenter pour lire du json
);

})