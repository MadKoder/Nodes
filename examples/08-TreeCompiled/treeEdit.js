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

localFunctions =
{
	"hit" : mf1
	(
		function(vec)
		{
			return "hit(" + vec + ")";
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
	$.globalEval(code);
	
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
		var stateSet = model.stateSet;
		var color = stateSet.color;
		var strokeColor = stateSet.strokeColor;
		var rect = new paper.Shape.Rectangle({
			point: [model.pos.x, model.pos.y],
			size: [model.size.x, model.size.y],
			fillColor: new paper.Color(color.r, color.g, color.b),
			strokeColor: new paper.Color(strokeColor.r, strokeColor.g, strokeColor.b)
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
		//var model = model[0];
		// var stateSet = model[1];
		var stateSet = model.stateSet;
		var color = stateSet.color;
		var strokeColor = stateSet.strokeColor;
		var circle = new paper.Shape.Circle({
			center: [model.pos.x, model.pos.y],
			radius: [model.radius],
			fillColor: new paper.Color(color.r, color.g, color.b),
			strokeColor: new paper.Color(strokeColor.r, strokeColor.g, strokeColor.b)
		});
		circle.data = model.id;
		return circle;
	}
	
	function updateCircle(model, view)
	{
		//var model = model[0];
		// var stateSet = model[1];
		var stateSet = model.stateSet;
		var color = stateSet.color;
		view.radius = model.radius;
		view.position = new Point(model.pos.x, model.pos.y);
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
	// var leafStates = leafStates.get();
	// _.each(leafStates, function(state)
	// {
		// stateStr = stateStr + ", " + state.color.g.toString();
	// });
	// $states.html(stateStr);
	var $ui = $("#ui");	
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
					Button.onClick(new Store(model), new Store(model.desc));
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

	buildUi(ui.get(), $ui, "", []);
	var $buttons = $("#buttons");
	// var index = 0;
	// _.each(buttons.get(), function(button)
	// {
	// 	var buttonId = "button" + index.toString();
	// 	var buttonIndex = index;
	// 	$buttons.append("<div> <button id=" + buttonId + "></button> </div>");
	// 	$("#" + buttonId).button().html("Add " + button.desc).click(function() 
	// 	{
	// 		buttons("onClick", [new Store(button.desc)], [buttonIndex]);
	// 	});
	// 	index++;
	// });
	// $( "#circles" ).button().click(function() 
	// {
	// 	circleButton("onClick", [new Store("Circle")], []);
	// });

	// $( "#rectangles" ).button().click(function() 
	// {
	// 	buttons("onClick", [new Store("Rect")], [0]);
	// });
	
	var path;
	paper.tool.distanceThreshold = 10;
	paper.tool.attach("mousedown", function (event) {
		// Create a new path every time the mouse is clicked
		// path = new Path();
		// path.add(event.point);
		// path.strokeColor = 'black';
		//addFigure([event.point.x, event.point.y]);
		// beginAddFigure([new Store(event.point.x), new Store(event.point.y)]);
		mouseDown(new Store(event.point.x), new Store(event.point.y))
	});

	paper.tool.attach("mousedrag", function(event) {
		// Add a point to the path every time the mouse is dragged
		// path.add(event.point);
		//resizeEditedFigure([new Store(event.point.x), new Store(event.point.y)])
		mouseDrag(new Store(event.point.x), new Store(event.point.y))
	});

	//view.draw();
	var tick   = Bacon.interval(20);
	// addRect(root.get());
	// addRectToRoot([new Store(2)]);
	tick.onValue(function(t)
	{
		// tick();
		rectViews = updateRectView(rects.get(), rectViews);
		circleViews = updateCircleView(circles.get(), circleViews);
		view.draw();
	});
}
, "text" // Commenter pour lire du json
);

})