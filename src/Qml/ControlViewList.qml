import QtQuick 2.0


Item
{
	id : list
	property variant currentModel : null
	property variant context : parent.context

	function getChild(i)
	{
		return repeater.itemAt(i);
	}
	
	function getNbChildren()
	{
		return repeater.count;
	}
	
	function modelChanged(path, func, value)
	{
		if(path.length == 0)
		{
			repeaterModel.clear();
			for(var i = 0; i < value.length; i++)
			{
				currentModel = value[i];
				repeaterModel.append({index : i});
			}
		}
		else
		{
			getChild(path.shift()).modelChanged(path, func, value);
		}		
	}	
	
	signal changeModel(variant path, string func, variant param);
}