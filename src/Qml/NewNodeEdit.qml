import QtQuick 2.0
import "../Qml"
import "../JsEngine/Library.js" as Library
import "Shared.js" as Shared

Column
{
	id : edit
	visible : typeEdit.textFocus || typeEdit.activeFocus
	property int	nbInputEdit : 0
	property variant context : null
	property string		currentType : ""
	property bool action : false
	
	signal newNode(variant value);
	
	function ask()
	{
		// visible = true;
		// focus = true;
		typeEdit.selectWithText();
	}
	
	function setType()
	{
		repeaterModel.clear();
		var inputTypes = Library.getInputTypes(typeEdit.text);
		nbInputEdit = inputTypes.length;
		for(var i = 0; i < nbInputEdit; i++)
		{
			currentType = inputTypes[i];
			repeaterModel.append({index : i});
			// Il semble que les items soient rajoutes AVANT le repeater
			// donc entre l'edit de type et le repeater
			// !!! il semble aussi qu'apres l'ordre change encore (cf onTextChanged des inputs) ...
			var index = 1 + i;
			var item = children[index];
			if(i == 0)
			{
				typeEdit.next = item;
				item.previous = typeEdit;
			}
			else
			{
				item.previous = children[index - 1];
				children[index - 1].next = item;
			}
		}
		for(var i = 0; i < nbInputEdit; i++)
		{
			console.log("child "+children[i+1]);
		}
		children[1].selectWithText();
	}
	
	Keys.onPressed: 
	{
		if(event.key == Qt.Key_Escape)
		{
			//visible = false;
		}		
	}
	
	function makeField(fieldType)
	{
		if(fieldType == "Float")
		{
			return 0.;
		}
		else
		{
			var field = {
				"type" : fieldType,
				"fields" : {}
			};
			var typeGraph = Shared.library.classes[fieldType];
			for(var fieldKey in typeGraph.fields)
			{
				field.fields[fieldKey] = makeField(typeGraph.fields[fieldKey]);
			}
			return field;
		}
	}
	
	EditZone
	{
		id : typeEdit
		availableStrings : Library.getTypeList()
		z : 1
		
		onTextChange :
		{
			//setType();
			if(edit.action)
			{
				newNode(			
					{
						"id" : "",
						"type": 
						{
							"base" : "Send",
							"templates" : ["Float"]
						},
						"param" : 
						{
							"func" : "Sub",
							"params" : 
							[
								{
									"get" : ["x"]
								},
								0.1
							]
						},
						"slots": ["x"]
						
							}
					);
			}
			else
			{
				var type = typeEdit.text;
				if(type in Shared.library.classes)
				{
					if(type == "Float")
					{
						newNode(			{
								"id" : "",
								"type" : "Float",
								"val" : 0.
							}
						);
					}
					else
					{
						// console.log("type "+type+" found");
						var typeGraph = Shared.library.classes[type];
						var node = {
							"id" : "",
							"type" : type,
							"fields" :
							{}
						};
						if("fields" in typeGraph)
						{
							for(var fieldKey in typeGraph.fields)
							{
								node.fields[fieldKey] = makeField(typeGraph.fields[fieldKey]);
							}
						}
						newNode(node);
					}
				}
			}
			unSelect();
		}
		
		onEscaped : 
		{
			// edit.visible = false;
		}
	}
	
	
	Repeater
	{
		id : repeater
		
		delegate : EditZone
		{
			//availableStrings : Library.getTypeList()
			z : -index
			
			Component.onCompleted : 
			{
				availableStrings = edit.context.typeToNode[edit.currentType];
			}
			
			onEscaped : 
			{
				edit.visible = false;
			}
			
			onTextChange :
			{
				if(next != null)
				{
					next.selectWithText();
				}
				else
				{	
					var inputs = [];
					for(var i = 0; i < nbInputEdit; i++)
					{
						console.log("input " + edit.children[i].text);
						// ??? OK, ordre tres curieux, mais apres test c'est comme ca que les fils sont arranges
						inputs.push(edit.children[nbInputEdit - i - 1].text);
					}
					
					newNode
					(
						{
							"id" : "mhuu",
							"type" : typeEdit.text,
							"in" : inputs
						}
					)
					edit.visible = false;
				}
			}
		}
		model : ListModel
		{
			id : repeaterModel
		}
	}
}