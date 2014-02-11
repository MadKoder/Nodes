import QtQuick 2.1
import QtQuick.Controls 1.0
import QtQuick.Layouts 1.0

ApplicationWindow
{
	height : 1000
	width: 1600
	
	Column 
	{
		id: refresher
		anchors.left : parent.left
		anchors.right : parent.right
	
		property variant main: null

		Row
		{
			Button
			{
				text : "Refresh"
				onClicked : 
				{
				
					console.log("refresh ----------------------------------------------");
					interf.refresh()
					if(refresher.main != null)
						refresher.main.destroy();
					refresher.load(false);
				}
			}
			
			Button
			{
				text : "Refresh and run"
				onClicked : 
				{
				
					console.log("refresh ----------------------------------------------");
					interf.refresh()
					if(refresher.main != null)
						refresher.main.destroy();
					refresher.load(true);
				}
			}
		}
		
		Component.onCompleted: load()
		
		function load(run)
		{
			var component = Qt.createComponent("main.qml");
			console.log("component");
			console.log(component.errorString());
			
			if (component.status == Component.Ready) 
			{
				console.log("ready");
				refresher.main = component.createObject(refresher);
				if(run)
					main.run();
			}
		}
		
	}
}