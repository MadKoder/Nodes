import QtQuick 2.0
import "Graph.js" as Graph

Selectable 
{
	property variant map : null
	color : "green"
	property variant val : null
	
	function modelChanged(path, func, value)
	{
		// console.log("path " + path);
		// console.log("value " + value);
		if(path.length == 0)
		{
			val = value;
			for(var key in value)
			{
				// console.log("struct key " + key);
				if(key in map)
				{
					if("func" in map[key])
					{
						map[key].item.modelChanged(path, func, Graph.apply(map[key].func, value[key]));
						// map[key].item.modelChanged(path, func, value[key]);
					}
					else
					{
						map[key].modelChanged(path, func, value[key]);
					}
				}
				else
				{
					console.log(key+" not in struct");
				}
				
			}
		}
		else
		{
			var key = path.shift();
			map[key].modelChanged(path, func, value);
		}
	}	
	
	signal changeModel(variant path, string func, variant param);
}