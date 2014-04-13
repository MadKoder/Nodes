$(document).ready(function ()
{

var compiledGraph = {};

var library =
{
	nodes : nodes,
	actions : actions,
	functions : functions
};

$.get( "snake.txt", function( text ) {
	setLodash(_);
	setEngineLodash(_);

	var codeGraph = codeToGraph(text, library, parser);
	// codeGraph.events = [{
			// when : {
				// "type" : "eqVec2",
				// "params" : [
					// [
						// "pos"
					// ],
					// [
						// "applePos"
					// ]
				// ]
			// },
			// "do" : {
				// "param" : {
					// "type" : "+",
					// "params" : [
						// [
							// "length"
						// ],
						// 1
					// ]
				// },
				// "slots" : [
					// [
						// "length"
					// ]
				// ],
				// "type" : "Send"
			// }
		// }
	// ];
	var compiledGraph = compileGraph(codeGraph, library);
	$.globalEval(compiledGraph);
	
	var sizeNode = size;
	drawGame(new Pos(sizeNode.get().x, sizeNode.get().y));
	var posNode = snake;
	var applePosNode = applePos;
	
	var keys = $(document).asEventStream('keydown').map('.keyCode')
	keys.filter(function(x) { return x === 37 }).onValue(function(v){
		rotLeft();
	});
	keys.filter(function(x) { return x === 39 }).onValue(function(v){
		rotRight();
	});
  
	//drawSnake(snake);
	var tick   = Bacon.interval(200);
	$score = $('#score')
	tick.onValue(function(t){
		moveSnake();
		var snake  = posNode.get().map(function(pos){return new Pos(pos.x, pos.y);});
		drawSnake(snake);
		var head  = [new Pos(headPos.get().x, headPos.get().y)];
		drawHead(head);
		var apple  = [new Pos(applePosNode.get().x, applePosNode.get().y)];
		drawApple(apple);
		
		$score.html(snakeLength.get());
	});
}
, "text" // Commenter pour lire du json
);

})