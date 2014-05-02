$(document).ready(function ()
{

var library =
{
	nodes : nodes,
	functions : functions,
	actions : actions
};

// Autre methode de MaJ ModelView
// var bulletsVal = bullets.get();
// var minLength = Math.min(bulletsView.length, bulletsVal.length);
// _(bulletsVal)
	// .take(minLength)
	// .zip(_.take(bulletsView, minLength))
	// .forEach(function(modelView)
	// {
		// var model = modelView[0];
		// var view = modelView[1];
		// view.attr({
			// cx : model.pos.x,
			// cy : model.pos.y
		// });
		
	// });
	
// if(bulletsVal.length > bulletsView.length)
// {
	// var newBullets = _(bulletsVal)
			// .tail(bulletsView.length)
			// .map(function(bullet){
				// var circle = r.circle
				// (
					// bullet.pos.x, 
					// bullet.pos.y,
					// bullet.size * 10
				// );
				// circle.attr("fill", "red");
				// return circle;
			// })
			// .value();
			
	// bulletsView = bulletsView.concat
	// (	
		// newBullets
	// );
// }
// else if(bulletsVal.length < bulletsView.length)
// {
	// _(bulletsView)
		// .tail(bulletsVal.length)
		// .forEach(function(bullet){
			// bullet.remove()});
	// bulletsView = _.take(bulletsView, bulletsVal.length)
// }
		
$.get( "arcaNodes.nodes", function( text ) {
// $.get( "structSlots.nodes", function( text ) {
	setLodash(_);
	setEngineLodash(_);

	var codeGraph = codeToGraph(text, library, parser);
	var code = compileGraph(codeGraph, library);


	$.globalEval(code);

	function isValidKeyCode(keyCode)
	{
		return (keyCode === 32) || // spacebar
			(keyCode === 37) ||
			(keyCode === 38) ||
			(keyCode === 39) ||
			(keyCode === 40);
	}
	$(document).keydown(function(e) {
		var keyCode = e.keyCode != 0 ? e.keyCode : e.which;
		if(isValidKeyCode(keyCode))
		{
			// keyDown([new Store(keyCode)]);
			keyDown(new Store(keyCode));
			return false;
		};
	});
	
	$(document).keyup(function(e) {
		var keyCode = e.keyCode != 0 ? e.keyCode : e.which;
		if(isValidKeyCode(keyCode))
		{
			// keyUp([new Store(keyCode)]);
			keyUp(new Store(keyCode));
			return false;
		}
	});

    var _bounds = bounds.get();
	var r = Raphael("game", _bounds.size.x + 50, _bounds.size.y + 50);
	//r.rect(0, 0, _bounds.size.x, _bounds.size.y).attr("fill", "black");
	
	var _cellSize = cellSize.get();
	var cellView = [];
	var _maze = maze.get();
	var mazeGroup = r.setStart()
	_.each(_maze, function(column, i){
		cellView[i] = [];
		_.each(column, function(block, j)
		{
			var rect = r.rect(i * _cellSize, j * _cellSize, _cellSize, _cellSize);
			//mazeGroup.push(rect);
			cellView[i].push({view : rect, model : block});
		
			if(block > 0)
			{
				if(block == 1)
				{
					rect.attr({ stroke : "#008", fill : "#f00"});
				}
				else
				{
					rect.attr({ stroke : "#008", fill : "#008"});
				}
			}
			else
			{
				rect.attr({ stroke : "#000", fill : "#000"});
			}
		});
	});
	r.setFinish();
	
	// var manImage = r.image("manLeft-1.png", 0, 0, 32, 32);
	var manImage = r.image("http://madkoder.esy.es/images/manLeft-1.png", 0, 0, 32, 32);
	var _manSize = manSize.get();
	var _monsters = newMonsters;
	var tick   = Bacon.interval(20);
	//var monsterImage = r.image("monsterLeft-1.png", 0, 0, 32, 32);
	
	$score = $('#score')

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
	
	function deleteElement(e)
	{
		e.remove();			
	}
	
	function createCircle(model)
	{
		var circle = r.circle
		(
			model.pos.x, 
			model.pos.y,
			model.size * 10
		);
		circle.attr("fill", "red");
		return circle;
	}
	
	function updateCircle(model, view)
	{
		view.attr({
			cx : model.pos.x,
			cy : model.pos.y
		});
	}
	
	var updateBulletView = makeViewUpdater(createCircle, updateCircle, deleteElement);
	
	function createMonster(model)
	{
		var monster = r.image("http://madkoder.esy.es/images/monsterLeft-1.png", 0, 0, 32, 32);
		return monster;
	}
	
	function updateMonster(model, view)
	{
		// view.attr({
			// x : model.pos.x - 16,
			// y : model.pos.y - 16,
			// src : "http://madkoder.esy.es/images/monsterLeft-" + (Math.floor(model.animState * 2 / maxAnimState.get())+ 1) + ".png"
		// });
		view.attr({
			src : "http://madkoder.esy.es/images/monsterLeft-" + (Math.floor(model.animState * 2 / maxAnimState.get())+ 1) + ".png"
		});
		var str = "T" + (model.pos.x - 16).toString() + "," + (model.pos.y - 16).toString();
		view.transform(str);
	}
	
	var updateMonsterView = makeViewUpdater(createMonster, updateMonster, deleteElement);
	
	function animate(figure, dir)
	{
		function flip(img, f) {
			img.scale(f, 1);
			
		}
		function rotate(img, absoluteRotation) {
			img.rotate(absoluteRotation, img.attrs.x + img.attrs.width / 2, img.attrs.y + img.attrs.height / 2);
		}
		figure.transform("");
		if (dir != "left") 
		{
			// when facing any other way, flip the pic and then rotate it
			figure.scale(-1, 1);
			rotate(figure, dir == "right" ? 0 : dir == "up" ? 90 : 270)
		}
	}
	
	var bulletsView = [];
	var monstersView = [];
	var mazeTag = 0;
	
	function Sink(source, func)
	{
		this.source = source;
		this.func = func;
		this.source.addSink(this);
		
		this.dirty = function()
		{
			func();
		}
	}
	
	var mazeSink = new Sink(maze, function()
	{
		_.each(maze.get(), function(column, i){
			_.each(column, function(block, j)
			{
				var rect = cellView[i][j].view;
				cellView[i][j].model = block;
						
				if(block > 0)
				{
					if(block == 1)
					{
						rect.attr({ stroke : "#008", fill : "#f00"});
					}
					else
					{
						rect.attr({ stroke : "#008", fill : "#008"});
					}
				}
				else
				{
					rect.attr({ stroke : "#000", fill : "#000"});
				}
			})
		})
		// var mazeDeltas = maze.getDeltas(mazeTag);
		// mazeTag = maze.tag;
		
		// _.each(mazeDeltas, function(delta)
		// {
		// 	var path = delta.path;
		// 	var i = delta.path[0];
		// 	var deltaVal = delta.val;
		// 	var updates = deltaVal.updates;
			
		// 	_.each(updates, function(update)
		// 	{
		// 		var j = update[0];
		// 		var newVal = update[1];
		// 		var rect = cellView[i][j].view;
		// 		var model = cellView[i][j].model;
		// 		if(model != newVal)
		// 		{
		// 			cellView[i][j].model = newVal;
		// 			if(newVal > 0)
		// 			{
		// 				if(newVal == 1)
		// 				{
		// 					rect.attr({ stroke : "#008", fill : "#f00"});
		// 				}
		// 				else
		// 				{
		// 					rect.attr({ stroke : "#008", fill : "#008"});
		// 				}
		// 			}
		// 			else
		// 			{
		// 				rect.attr({ stroke : "#000", fill : "#000"});
		// 			}
		// 		}
		// 	});
		// });
	});	
	
	$lifes = $('#lifes')
	$lifes.html(lifes.get());
	var lifesSink = new Sink(lifes, function()
	{
		$lifes.html(lifes.get());
	});
	
	tick.onValue(function(t){
		tickAction();
		
		animate(manImage, facing.get());
		manImage.attr({x : manPos.get().x - _manSize * .5, y : manPos.get().y  - _manSize * .5});
		manImage.attr({src : "http://madkoder.esy.es/images/manLeft-" + (Math.floor(animState.get() * 2 / maxAnimState.get())+ 1) + ".png"})
		if(invincibleCounter.get() % 16 > 8)
			manImage.hide();
		else
			manImage.show();
		// manImage.animate(
		// {
			// params : {src : "file:///E:/Python/Nodes/HtmlNodes/08-ArcaNodes/manLeft-" + (Math.floor(animState.get() * 2 / maxAnimState.get())+ 1) + ".png"},
			// ms : 10
		// });

		bulletsView = updateBulletView(bullets.get(), bulletsView);
		monstersView = updateMonsterView(_monsters.get(), monstersView)
	});
}
, "text" // Commenter pour lire du json
);

})