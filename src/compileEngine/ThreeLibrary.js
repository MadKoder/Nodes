
function incLibrary(library)
{
	library.classes["Renderer"] =
	{
		"in" : ["Scene", "Camera"],
		"builder" : function (sources) 
		{
			this.sources = sources;
			var renderer = new THREE.WebGLRenderer();
			renderer.setSize(window.innerWidth, window.innerHeight); 
			$("body").append(renderer.domElement);
			this.signal = function(p)
			{
				renderer.render(this.sources[0].eval(), this.sources[1].eval());
				
				// var render = function () 
				// { 
					// requestAnimationFrame(render); 
					// var scene = this.sources[0].get();
					// var camera = this.sources[1].get();
					
					// renderer.render(this.sources[0].get(), this.sources[1].get());
				// }; 
				// render();
			};
			this.eval = function()
			{
				return renderer;
			}
		}
	};

	function getLastElementInStruct(struct, path)
	{	
		if(path.length == 0)
		{
			return struct;
		}
		else
		{
			var indexOrKey = path.shift();
			return getLastElementInStruct(struct[indexOrKey], path);
		}
	}

	function setLastElementInStruct(struct, path, val)
	{	
		if(path.length == 1)
		{
			struct[path[0]] = val;
		}
		else
		{
			var indexOrKey = path.shift();
			return setLastElementInStruct(struct[indexOrKey], path, val);
		}
	}
	
	function getLastParent(struct, path)
	{	
		if(path.length > 1)
		{
			var indexOrKey = path.shift();
			//console.log("indexOrKey " + indexOrKey);
			return getLastParent(struct[indexOrKey], path);
		}
		else
		{
			return struct;
		}
	}
	
	function getVec3Types(path) 
	{
		if(path == undefined || path == [])
		{
			return "Vec3"
		}
		return "Float";
	}
	
	library.classes["Vec3"] =
	{
		"fields":
		{
			"x": "Float",
			"y": "Float",
			"z": "Float"
		},
		getPath : function(struct, path)
		{
			return struct[path[0]];
		},
		setPath : function(struct, path, val)
		{
			struct[path[0]] = val;
		},
		update : function(o, n)
		{
			_.assign(o, _.clone(n));
			return o;
		},
		builder: function(sources, fields)
		{
			this.fields = fields;
			this.eval = function (path)
			{
				return new THREE.Vector3(this.fields.x.eval(), this.fields.y.eval(), this.fields.z.eval());;
			};
			
			this.evalPath = function (path)
			{
				return this.fields[path[0]].eval();
			};
			
			this.getType = getVec3Types;
		},
		paramsToFields : ["x", "y", "z"]
	};
	
	var number = 0;
	function makeCube()
	{
		var geometry = new THREE.CubeGeometry(5,.1,1); 
		var material;
		if(number == 0)
		{
			material = new THREE.MeshBasicMaterial({color: 0xadff00}); 
			first = false;
		}
		else if(number == 1)
		{
			material = new THREE.MeshBasicMaterial({color: 0xad00ff}); 
		}
		else
		{
			material = new THREE.MeshBasicMaterial({color: 0xff0000}); 
		}
		number++;
		return new THREE.Mesh(geometry, material);
	}
	
	library.classes["Cube"] =
	{
		Operators : function(templates)
		{
			this.getPath = function(struct, path)
			{
				return getLastElementInStruct(struct, path.slice());
			};
			this.setPath = function(struct, path, val)
			{
				return setLastElementInStruct(struct, path.slice(), val);
			};
			this.update = function(o, n)
			{
				_.assign(o.rotation, _.clone(n.rotation));
				_.assign(o.position, _.clone(n.position));
				return o;
			};
			this.clone = function(cube)
			{
				return this.update(makeCube(), cube);
			};
		},
		builder : function(sources, fields) 
		{			
			this.fields = fields;
			this.eval = function()
			{
				return this.update(makeCube());
			};
			this.update = function(c)
			{
				if(this.fields.rotation != undefined)
				{
					_.assign(c.rotation, _.clone(this.fields.rotation.eval()));
				}
				if(this.fields.position != undefined)
				{
					_.assign(c.position, _.clone(this.fields.position.eval()));
				}
				return c;
			};
			
			this.getType = function(path) 
			{
				if(path == undefined || path == [])
				{
					return "Cube"
				}
				return getVec3Types(path.slice(1));
			}
		},
		fields : 
		{
			rotation : "Vec3"
		},
		paramsToFields : ["position", "rotation"]
	};

	library.classes["Scene"] =
	{
		"in" : ["Objects"],
		"builder" : function (sources) 
		{
			this.sources = sources;
			var scene = new THREE.Scene(); 		
			var objects = this.sources[0].eval();
			for(var i = 0; i < objects.length; i++)
			{
				scene.add(objects[i]);
			}
			this.eval = function()
			{
				while(scene.children.length > 0)
				{
					scene.remove(scene.children[0]);
				}
				objects = this.sources[0].update(objects);
				for(var i = 0; i < objects.length; i++)
				{
					scene.add(objects[i]);
				}
				return scene;
			};
			this.signal = function(objects, path)
			{
				while(scene.children.length > 0)
				{
					scene.remove(scene.children[0]);
				}
				for(var i = 0; i < objects.length; i++)
				{
					scene.add(objects[i].ref.eval());
				}
			}
			this.getType = function()
			{
				return "Scene";
			}
		}
	};

	library.classes["Camera"] =
	{
		"in" : [],
		"builder" : function () 
		{
			var camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000); 
			camera.position.z = 5; 
			this.eval = function()
			{
				return camera;
			};
			this.getType = function()
			{
				return "Camera";
			}
		}
	};

	return library;
}
