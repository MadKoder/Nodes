$(document).ready(function ()
{

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

function mf1(func1, inAndOutTypes)
{
	return {
		params : [["first", inAndOutTypes.inputs[0]]],
		func : function(params)	{	
			return func1(params[0]);
		},
		type : inAndOutTypes.output
	}
}

localFunctions =
{
	"hit" : mf1
	(
		function(vec)
		{
			var hitResult = project.hitTest(new Point(vec.x, vec.y));
					
			if (!hitResult)
				return -1;

			return hitResult.item.data;
		},
		inOut1("Vec2", "int")
	)
}

_.merge(functions, localFunctions);
_.merge(nodes, localFunctions, function(node, func){return funcToNodeSpec(func);});

var library =
{
	nodes : nodes,
	functions : functions,
	actions : actions
};

$.get("treeEdit.nodes", function( text ) {
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
		rect.data = model.id;
		return rect;
	}
	
	function updateRect(model, view)
	{
		view.size = new paper.Size(model.size.x, model.size.y);
		view.position = new Point(model.pos.x + model.size.x * .5, model.pos.y + model.size.y * .5);
		view.data = model.id;
	}
	
	function createCircle(model)
	{
		//var circleModel = model[0];
		// var stateSet = model[1];
		var circleModel = model;
		var stateSet = circleModel.stateSet;
		var color = stateSet.color;
		var circle = new paper.Shape.Circle({
			center: [circleModel.pos.x, circleModel.pos.y],
			radius: [circleModel.radius],
			fillColor: new Color(color.r, color.g, color.b)
		});
		circle.data = model.id;
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
		view.position = new Point(circleModel.pos.x, circleModel.pos.y);
		view.fillColor.red = color.r; 
		view.fillColor.green = color.g; 
		view.fillColor.blue = color.b; 
		view.data = model.id;
	}
	
	var updateRectView = makeViewUpdater(createRect, updateRect, deleteElement);
	var rectViews = [];	
	var updateCircleView = makeViewUpdater(createCircle, updateCircle, deleteElement);
	var circleViews = [];
	
	$states = $('#states');
	var stateStr = "";
	// var leafStates = code.leafStates.get();
	// _.each(leafStates, function(state)
	// {
		// stateStr = stateStr + ", " + state.color.g.toString();
	// });
	// $states.html(stateStr);
	var $ui = $("#ui");	
	var ui = code.ui.get();
	function enclose(str, parentType)
	{
		switch(parentType)
		{
			case "VGroup" :
				return "<div>" + str + "</div>";
			case "HGroup" :
				return "<div class=\"hgroup\">" + str + "</div>";
			case "" :
				return str;
		}
	}

	var uiIndex = 0;
	function buildUi(model, parentView, parentType, path)
	{
		
		var type = model.__type;
		switch(type)
		{
			case "Button" :
				var uiId = type + uiIndex.toString();
				var buttonIndex = uiIndex;
				parentView.append(enclose("<button id=" + uiId + "></button>", parentType));
				$("#" + uiId).button().html(model.desc).click(function() 
				{
					code.ui.signal("onClick", [new Store(model.desc)], path);
				});
				uiIndex++;
				break;
			case "HGroup" :
			case "VGroup" :
				var uiId = type + uiIndex.toString();
				// parentView.append(enclose("<div id=" + uiId + "></div>", parentType));
				parentView.append((parentType == "HGroup") ? 
					"<div class=\"hgroup\" id=" + uiId + "></div>" :
					"<div id=" + uiId + "></div>"
				);
				var $ui = $("#" + uiId);
				uiIndex++;
				_.each(model.children, function(child, index)
				{
					buildUi(child, $ui, type, path.concat(["children", index]));
				});
				break;
		}
	}

	buildUi(ui, $ui, "", []);
	var $buttons = $("#buttons");
	// var index = 0;
	// _.each(code.buttons.get(), function(button)
	// {
	// 	var buttonId = "button" + index.toString();
	// 	var buttonIndex = index;
	// 	$buttons.append("<div> <button id=" + buttonId + "></button> </div>");
	// 	$("#" + buttonId).button().html("Add " + button.desc).click(function() 
	// 	{
	// 		code.buttons.signal("onClick", [new Store(button.desc)], [buttonIndex]);
	// 	});
	// 	index++;
	// });
	// $( "#circles" ).button().click(function() 
	// {
	// 	code.circleButton.signal("onClick", [new Store("Circle")], []);
	// });

	// $( "#rectangles" ).button().click(function() 
	// {
	// 	code.buttons.signal("onClick", [new Store("Rect")], [0]);
	// });
	
	var path;
	paper.tool.distanceThreshold = 10;
	paper.tool.attach("mousedown", function (event) {
		// Create a new path every time the mouse is clicked
		// path = new Path();
		// path.add(event.point);
		// path.strokeColor = 'black';
		//code.addFigure.signal([event.point.x, event.point.y]);
		// code.beginAddFigure.signal([new Store(event.point.x), new Store(event.point.y)]);
		code.mouseDown.signal([new Store(event.point.x), new Store(event.point.y)])
	});

	paper.tool.attach("mousedrag", function(event) {
		// Add a point to the path every time the mouse is dragged
		// path.add(event.point);
		//code.resizeEditedFigure.signal([new Store(event.point.x), new Store(event.point.y)])
		code.mouseDrag.signal([new Store(event.point.x), new Store(event.point.y)])
	});

	//view.draw();
	var tick   = Bacon.interval(20);
	// code.addRect.signal(code.root.get());
	// code.addRectToRoot.signal([new Store(2)]);
	tick.onValue(function(t)
	{
		// code.tick.signal();
		rectViews = updateRectView(code.rects.get(), rectViews);
		circleViews = updateCircleView(code.circles.get(), circleViews);
		view.draw();
	});
}
, "text" // Commenter pour lire du json
);

})