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

	function Store(l, operators)
	{
		this.sinks = []
		var list = l;
		var deltas = [];
		this.tag = 0;
		
		this.operators = operators;
		
		this.addDelta = function(delta)
		{
			deltas.push(delta);
			list = delta.apply(list);
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
			return list;
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
	
	function Cache(l, mapFunc)
	{
		var listNode = l;
		var listPort = new Port(l, this);
		this.listTag = listNode.tag;
		
		var list = _.map(l.get(), mapFunc);
		
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
			list = _.reduce(
				deltas, 
				function(accum, delta)
				{
					var updated = accum;
					_.each(delta.updates, function(update)
					{
						updated[update[0]] = mapFunc(update[1]);
					});
					
					if(delta.remove > 0)
					{
						updated = updated.slice(0, -delta.remove);
					}
					else if(delta.add.length > 0)
					{
						updated = updated.concat(_.map(delta.add, mapFunc));
					}
					return updated;
				},
				list
			);
			return list;
		}
	}

	function log(txt)
	{
		console.log(txt)
	}
	
	var list = new Store([0, 1, 2]);
	log(list.get());

	var mappedList = new Cache(list, function(x){return x*2;});
	log(mappedList.get());
	
	list.addDelta(new ListDelta([3], 0, []))
	log(list.get());
	log(mappedList.get());	

	list.addDelta(new ListDelta([], 1, []))
	log(list.get());
	log(mappedList.get());	
	
	list.addDelta(new ListDelta([], 0, [[1, 10]]))
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
	var list2 = new Store([[1, 2], [3, 4, 5]]);
	log2(list2.get());
	
	list2.addDelta(new ListDelta([], 0, [[1, [6, 7]]]))
	log2(list2.get());
	
	// list.update(function(e){return e > 5}, function(e){return e - 5});
	// log(list.get());
	// log(mappedList.get());
	
	// var list2 = new Store([new Store([1, 2]), new Store([3, 4, 5])])
	// log(list2.get());
	
	// var mapped = new Cache(list2, function(column)
		// {
			// return new Cache(column, function(x){return x*2;});
		// });
	// log(mapped.get());
})