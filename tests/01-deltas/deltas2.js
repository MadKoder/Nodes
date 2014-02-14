$(document).ready(function ()
{
	function ListDelta(add, remove, updates)
	{
		this.add = add;
		this.remove = remove;
		this.updates = updates;
		
		this.apply = function(list)
		{
			var updated = list;
			_.each(updates, function(update)
			{
				var index = update[0];
				// Version avec fonction d'update (si la cible a un cache de valeurs d'entree)
				// var func = update[1];
				// updated[index] = func(updated[index]);
				// Version avec nouvelle valeur (si la cible ne cache pas les valeurs d'entree)
				updated[index] = update[1];
			});
			
			if(this.remove > 0)
			{
				updated = updated.slice(0, -this.remove)
			}
			else if(this.add.length > 0)
			{
				updated = updated.concat(this.add);
			}
			
			return updated;
		}
	}
	
	function Update(path, delta)
	{
		this.path = path;
		this.delta = delta;
	}

	
	function applyUpdate(val, path, func, operators)
	{
		if(path.length == 0)
		{
			return operators.update(val, func);
		}
		else
		{
			var subPath = path.slice(0);
			var key = subPath.shift();
			return applyUpdate(val[key], subPath, func, operators.getSubOperators(key));
		}
	}
	
	function Store(v, operators)
	{
		this.sinks = []
		var val = v;
		var deltas = [];
		this.tag = 0;
		
		this.operators = operators;
		
		this.addDelta = function(update)
		{
			deltas.push(update);
			val = this.operators.update(val, update.path, update.delta);
			this.tag++;
			_.each(this.sinks, function(sink)
			{
				sink.dirty()
			});
		}
		
		this.update = function(func, params)
		{
			var updates = _(_.range(list.length))
				.zip(list)
				.filter(function(elem) 
					{
						return condFunc(elem[1]);
					})
				.map(function(elem)
					{
						return [elem[0], updateFunc(elem[1])];
					})
				.value();
			this.addDelta(new ListDelta([], 0, updates));
		}
		
		this.getDeltas = function(tag)
		{
			if(tag < this.tag)
			{
				if(tag < 0)
				{
					return [new ListDelta(list, 0, [])];
				}
				
				return deltas.slice(tag - this.tag);
			}
			
			return [];
		}
		
		this.get = function()
		{
			return val;
		}
	};

	function Port(source, sink)
	{
		this.source = source;
		this.source.sinks.push(sink);
		
		var tag = this.source.tag;
		
		this.getDeltas = function()
		{
			var ret = this.source.getDeltas(tag);
			tag = list.tag;
			return ret;
		}
	}
	
	var mapFunc = 
	{
		func :  function(x){return x * 2;},
		apply : function(list)
		{
			return _.map(list, this.func);
		},
		applyDeltas : function(list, deltas)
		{
			var func = this.func;
			list = _.reduce(
				deltas, 
				function(accum, update)
				{
					var delta = update.delta;
					var updated = accum;
					_.each(delta.updates, function(update)
					{
						updated[update[0]] = func(update[1]);
					});
					
					if(delta.remove > 0)
					{
						updated = updated.slice(0, -delta.remove);
					}
					else if(delta.add.length > 0)
					{
						updated = updated.concat(_.map(delta.add, func));
					}
					return updated;
				},
				list
			);
			return list;
		}
	}
	
	var map2Func = 
	{
		func :  function(l){return _.map(l, function(x){return x * 2;});},
		apply : function(list)
		{
			return _.map(list, this.func);
		},
		applyDeltas : function(list, deltas)
		{
			var func = this.func;
			list = _.reduce(
				deltas, 
				function(accum, update)
				{
					var delta = update.delta;
					var path = update.path;
					if(path.length > 0)
					{
						var updated = accum;
						var subPath = path.slice(0);
						var key = subPath.shift();
						var updated = accum[key];
						_.each(delta.updates, function(update)
						{
							updated[update[0]] = func(update[1]);
						});
						
						if(delta.remove > 0)
						{
							updated = updated.slice(0, -delta.remove);
						}
						else if(delta.add.length > 0)
						{
							updated = updated.concat(_.map(delta.add, func));
						}
						return accum;
					}
					else
					{
						var updated = accum;
						_.each(delta.updates, function(update)
						{
							updated[update[0]] = func(update[1]);
						});
						
						if(delta.remove > 0)
						{
							updated = updated.slice(0, -delta.remove);
						}
						else if(delta.add.length > 0)
						{
							updated = updated.concat(_.map(delta.add, func));
						}
						return updated;
					}
				},
				list
			);
			return list;
		}
	}
	function Cache(l, func)
	{
		var listNode = l;
		var listPort = new Port(l, this);
		this.listTag = listNode.tag;
		this.func = func;
		var list = this.func.apply(l.get());
		
		this.sinks = [];
		
		this.dirty = function()
		{
			_.each(this.sinks, function(sink)
			{
				sink.dirty();
			});
		}
		
		this.get = function()
		{
			var deltas = listPort.getDeltas();
			list = this.func.applyDeltas(list, deltas);
			return list;
		}
	}

	function log(txt)
	{
		console.log(txt)
	}
	
	var listOperators = 
	{
		update : function(list, path, func)
		{
			if(path.length == 0)
			{
				return func.apply(list);
			}
			else
			{
				var subPath = path.slice(0);
				var key = subPath.shift();
				return applyUpdate(val[key], subPath, func, operators.getSubOperators(key));
			}
		}
	}
	
	var listOflistOperators = 
	{
		update : function(list, path, func)
		{
			if(path.length == 0)
			{
				return func.apply(list);
			}
			else
			{
				var subPath = path.slice(0);
				var key = subPath.shift();
				list[key] = listOperators.update(list[key], subPath, func);
				return list;
			}
		}
	}
	
	var list = new Store([0, 1, 2], listOperators);
	var mappedList = new Cache(list, mapFunc);
	log(list.get());
	log(mappedList.get());

	list.addDelta({path : [], delta : new ListDelta([3], 0, [])});
	log(list.get());	
	log(mappedList.get());
	
	function log2(l)
	{
		var str = _.reduce(l, function(str, e)
		{
			return str + "[" + e + "]";
		}, "[");
		log(str + "]"); 
	}
	
	var list2 = new Store([[1, 2], [3, 4, 5]], listOflistOperators);
	var mapped2 = new Cache(list2, map2Func);
	log2(list2.get());
	log2(mapped2.get());

	list2.addDelta({path : [0], delta : new ListDelta([3], 0, [])});
	log2(list2.get());
})