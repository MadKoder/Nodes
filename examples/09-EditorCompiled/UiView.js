var code;
var uiIndex = 0;
var doingFocus;
var requestFocus;
var focusCounter = 0;

var modelToUi = {};
function buildUi(view, model, parentType, path, rootUi, ticks, parentTick)
{
	if((ticks != undefined) && (ticks.tick < parentTick))
		return view;

	var $tmp = $("#tmp");

	var type = model.__type;
	switch(type)
	{
		case "FocusTextInput" :
		case "TextInput" :
			if((view == null) || (type != view.attr("modelType")))
			{
				var uiId = type + uiIndex.toString();
				var buttonIndex = uiIndex;
				$tmp.append("<input size=\"8\" type = \"text\" id=" + uiId + " value = \"" + model.desc + "\"></input>");
				var $ui = $("#" + uiId);
				$ui.attr("modelType", type);
				if(type == "FocusTextInput")
				{
					if(model.focusCounter > focusCounter)
					{
						requestFocus = $ui;
						focusCounter = model.focusCounter;
					}
				}
				$ui.change(function(event) 
				{
					// rootUi.signal("onChange",  [new Store($(this).val())], path);
					TextInput.onChange(new Store(model), new Store($(this).val()));
				});
				uiIndex++;
				return $ui;
			} else
			{
				var $ui = view;
				$ui.val(model.desc);
				return view;
			}
		case "Text" :
			if((view == null) || (type != view.attr("modelType")))
			{
				var uiId = type + uiIndex.toString();
				$tmp.append("<div class=\"text\" id=" + uiId  + ">" + model.txt+ "</div>");
				var $ui = $("#" + uiId);
				$ui.attr("modelType", type);
				uiIndex++;
				return $ui;
			}
			else
			{
				var $ui = view;
				$ui.html(model.txt);
				return view;
			}
		case "Button" :
			if((view == null) || (type != view.attr("modelType")))
			{
				var uiId = type + uiIndex.toString();
				$tmp.append("<button id=" + uiId + "></button>");
				var $ui = $("#" + uiId);
				if(model.image.length > 0)
				{
					$ui.append("<img width = 20 src = \"../../../images/" + model.image + "\">")
					$ui.width(20);
				}
				else
				{
					$ui.html(model.desc);
				}
				$ui.attr("modelType", type);
				$ui.button()
				.click(function() 
				{
					Button.click(new Store(model));
				});
				uiIndex++;
				if(model.visible)
				{
					$ui.show();
				}
				else
				{
					$ui.hide();
				}
				return $ui;
			}
			else
			{
				var $ui = view;
				$ui.html(model.desc);
				if(model.visible)
				{
					$ui.show();
				}
				else
				{
					$ui.hide();
				}
				return view;
			}
			break;
		case "HGroup" :
		case "VGroup" :
			if((view == null) || (type != view.attr("modelType")))
			{				
				var uiId = type + uiIndex.toString();
				// $tmp.append(enclose("<div id=" + uiId + "></div>", parentType));
				var uiClass = type == "HGroup" ? "hGroup" : "vGroup";
				$tmp.append((parentType == "HGroup") ? 
					"<div class=\"hGroupElem " + uiClass + "\" id=" + uiId + "></div>" :
					"<div class=\"vGroupElem " + uiClass + "\" id=" + uiId + "></div>"
				);
				var $ui = $("#" + uiId);
				$ui.attr("modelType", type);				
				uiIndex++;
				_.each(model.children, function(child, index)
				{
					var childUi = buildUi(null, child, type, path.concat(["children", index]), rootUi);
					$ui.append(childUi);
					$ui.data(index.toString(), childUi);
					var test = $ui.data(index.toString());
					test = $ui.data();					
					var a = test;
				});
				$ui.hover(
					function()
					{
						model.mouseEnter();
					},
					function()
					{
						model.mouseLeave();
					}
				);
			} else if((ticks.subs == undefined) || (ticks.subs.children == undefined) || (ticks.subs.children.subs == undefined))
			{
				var $ui = view;
				$ui.empty();
				_.each(model.children, function(child, index)
				{
					var childUi = buildUi(null, child, type, path.concat(["children", index]), rootUi);
					$ui.append(childUi);
					$ui.data(index.toString(), childUi);
					var test = $ui.data(index.toString());
					var a = test;
				});
			} else
			{
				var childrenTicks = ticks.subs.children.subs;
				$ui = view;
				var $uiChildren = $ui.children();
				var $uiChild = $ui.children().first();
				var newUis = jQuery();
				// $ui.empty();
				_.each(model.children, function(child, index)
				// $uiChildren.each(function(index, child)
				{
					var test = $ui.data();
					var childUi = $ui.data(index.toString());
					var previousType = $uiChild.attr("modelType");
					// $uiChild.replaceWith(buildUi($uiChild, child, type, path.concat(["children", index]), rootUi, childrenTicks[index], ticks.tick));
					// requestFocus = false;
					var newUi = buildUi($uiChild, child, type, path.concat(["children", index]), rootUi, childrenTicks[index], ticks.tick);
					// var newUi = buildUi($(child), model.children[index], type, path.concat(["children", index]), rootUi, childrenTicks[index], ticks.tick);
					var next = $uiChild.next();
					if(previousType != newUi.attr("modelType"))
					{
						$uiChild.replaceWith(newUi);
					}
					// $ui.append(newUi);
					// if(model.children[index].__type == "TextInput")
					// {						
					// 	newUi.change(function(event) 
					// 	{
					// 		rootUi.signal("onChange",  [new Store($(this).val())], path.concat(["children", index]));
					// 	});
					// }

					// newUis = newUis.add(buildUi($uiChild, child, type, path.concat(["children", index]), rootUi, childrenTicks[index], ticks.tick));
					$uiChild = next;
				});
				// $ui.empty();
				// $ui.append(newUis);
				// _.each(newUis, function(newUi)
				// {
				// 	$ui.append(newUi);
				// })
				
			}
			if(model.visible)
			{
				$ui.show();
			}
			else
			{
				$ui.hide();
			}
			return $ui;
			break;
	}
}

var mainUiIndex = 0;
function UiView(ui) 
{
	this.index = mainUiIndex;
	var $ui = $("#ui" + mainUiIndex);
	mainUiIndex++;	

	ui.addSink(this);			
	
	var $root = null;
	this.tick = globalTick;
	this.dirty = function()
	{
		var mustAppend = ($root == null);
		// requestFocus = null;
		var uiVal = ui.get();
		$root = buildUi($root, uiVal, "", [], ui, ui.ticks, this.tick);
		this.tick = globalTick;
		if(mustAppend)
		{
			$ui.append($root);
		}
		// if(requestFocus != null && requestFocus in modelToUi)
		if(requestFocus != null)
		{
			doingFocus = true;
			requestFocus.focus();
			doingFocus = false;
			requestFocus = null;
		}
	}

	this.dirty();
}
