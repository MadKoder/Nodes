$(document).ready(function ()
{


var code;
var uiIndex = 0;



var $tmp = $("#tmp");
var doingFocus;
var requestFocus;
var focusCounter = 0;

var library =
{
	nodes : nodes,
	functions : functions,
	actions : actions
};

function hit(vec)
{
	var hitResult = project.hitTest(new Point(vec.x, vec.y));
					
	if (!hitResult)
		return -1;

	return hitResult.item.data;
}

localFunctions =
{
	"hit" : mf1
	(
		function(vec)
		{
			return "hit(" + vec + ")";
		},
		inOut1("Vec2", "int")
	)
}

_.merge(functions, localFunctions);
_.merge(nodes, localFunctions, function(node, func){return funcToNodeSpec(func);});


$.get("test.nodes", function( text ) {
// $.get("arcaNodes.nodes", function( text ) {
// $.get("treeEdit.nodes", function( text ) {
// $.get("editor.nodes", function( text ) {
	setLodash(_);
	setEngineLodash(_);

	var codeGraph = codeToGraph(text, library, parser);
	var src = compileGraph(codeGraph, library);

	$tmp.append("<div id=\"test\"></div>");
	var $test = $("#test");

var float = {};
var int = {};
var string = {};
var Vec2 = {
    params: ["x", "y"],
    click: function (self, val) {
        var __selfVal = self.get();
        var __pushedRefs = [];
        if ("__refs" in __selfVal) {
            _.each(__selfVal.__refs, function (ref, i) {
                ref.push(__selfVal.__referencedNodes[i]);
                __pushedRefs.push(ref);
            });
        }
        __selfVal.click(val);
        _.each(__pushedRefs, function (ref, i) {
            ref.pop();
        });
    },
    inc: function (self, delta) {
        var __v0 = new Store("tata", string);
        Vec2.click(self, __v0);

    },
};
var Vec3 = {
    params: ["x", "y", "z"],
    click: function (self, val) {
        var __selfVal = self.get();
        var __pushedRefs = [];
        if ("__refs" in __selfVal) {
            _.each(__selfVal.__refs, function (ref, i) {
                ref.push(__selfVal.__referencedNodes[i]);
                __pushedRefs.push(ref);
            });
        }
        __selfVal.click(val);
        _.each(__pushedRefs, function (ref, i) {
            ref.pop();
        });
    },
    inc: function (self, delta) {
        var __v1 = new Store("tata", string);
        Vec3.click(self, __v1);

    },
};
var Rect = {
    params: ["pos", "size"],
};
var VecList = {
    params: ["l"],
};

function mVec2(x, i) {
    return {
        __type: "Vec2",
        __views: "undefined",
        x: i.get(),
        y: i.get(),
        click: function (val) {
            var __v3 = x.get() + i.get() + 10;
            x.set(__v3);
        }
    };
};

function mVec2$update(__val, __ticks, __parentTick, x, i) {
    return (new __Obj(Vec2, [i, i], "Vec2", {
        click: function (val) {
            var __v4 = x.get() + i.get() + 10;
            x.set(__v4);
        }
    })).update(__val, __ticks, __parentTick);
};

function test(a, z) {
    var arrays0 = [a, ];
    var aa0_0 = new ArrayAccess(arrays0[0], {
        base: "list",
        params: ["int"]
    });
    var index0_0 = new ValInput(int);
    var inputs0 = [aa0_0, ];
    var indices0 = [index0_0, ];
    var comp0 = new _Func(function () {
        return mVec2(aa0_0, index0_0);
    }, "Vec2", [aa0_0, index0_0], function (__val, __ticks, __parentTick) {
        return mVec2$update(__val, __ticks, __parentTick, aa0_0, index0_0);
    });
    return {
        __type: "VecList",
        __views: "undefined",
        l: pushBack((new Comprehension(comp0, inputs0, indices0, arrays0, true, undefined)).get(), (new __Obj(Vec2, [
            new Store(0, "int"), new Store(0, "int")
        ], "Vec2", {
            click: function (val) {
                var __v8 = z.get() + 1;
                z.set(__v8);
            }
        })).get())
    };
};

function test$update(__val, __ticks, __parentTick, a, z) {
    var arrays0 = [a, ];
    var aa0_0 = new ArrayAccess(arrays0[0], {
        base: "list",
        params: ["int"]
    });
    var index0_0 = new ValInput(int);
    var inputs0 = [aa0_0, ];
    var indices0 = [index0_0, ];
    var comp0 = new _Func(function () {
        return mVec2(aa0_0, index0_0);
    }, "Vec2", [aa0_0, index0_0], function (__val, __ticks, __parentTick) {
        return mVec2$update(__val, __ticks, __parentTick, aa0_0, index0_0);
    });
    return (new __Obj(VecList, [new _Func(function () {
        return pushBack((new Comprehension(comp0, inputs0, indices0, arrays0, true, undefined)).get(), (
            new __Obj(Vec2, [new Store(0, "int"), new Store(0, "int")], "Vec2", {
                click: function (val) {
                    var __v8 = z.get() + 1;
                    z.set(__v8);
                }
            })).get());
    }, {
        base: "list",
        params: ["Vec2"]
    }, [new Comprehension(comp0, inputs0, indices0, arrays0, true, undefined), new __Obj(Vec2, [new Store(
        0, "int"), new Store(0, "int")], "Vec2", {
        click: function (val) {
            var __v7 = z.get() + 1;
            z.set(__v7);
        }
    })])], "VecList", {})).update(__val, __ticks, __parentTick);
};

function test2(aa, x) {
    var arrays1 = [aa, ];
    var aa1_0 = new ArrayAccess(arrays1[0], {
        base: "list",
        params: [{
            base: "list",
            params: ["int"]
        }]
    });
    var inputs1 = [aa1_0, ];
    var indices1 = [];
    var comp1 = new _Func(function () {
        return test(aa1_0, x);
    }, "VecList", [aa1_0, x], function (__val, __ticks, __parentTick) {
        return test$update(__val, __ticks, __parentTick, aa1_0, x);
    });
    return (new Comprehension(comp1, inputs1, indices1, arrays1, true, undefined)).get();
};

function test2$update(__val, __ticks, __parentTick, aa, x) {
    var arrays1 = [aa, ];
    var aa1_0 = new ArrayAccess(arrays1[0], {
        base: "list",
        params: [{
            base: "list",
            params: ["int"]
        }]
    });
    var inputs1 = [aa1_0, ];
    var indices1 = [];
    var comp1 = new _Func(function () {
        return test(aa1_0, x);
    }, "VecList", [aa1_0, x], function (__val, __ticks, __parentTick) {
        return test$update(__val, __ticks, __parentTick, aa1_0, x);
    });
    return (new Comprehension(comp1, inputs1, indices1, arrays1, true, undefined)).update(__val, __ticks, __parentTick);
};
var aa = new Store([
    [1, 2, 3],
    [4, 5]
], {
    base: "list",
    params: [{
        base: "list",
        params: ["int"]
    }]
});
var x = new Store(0, "int");
var t = new Store("tutu", "string");
var va = new Cache(new _Func(function () {
    return test2(aa, x);
}, {
    base: "list",
    params: ["VecList"]
}, [aa, x], function (__val, __ticks, __parentTick) {
    return test2$update(__val, __ticks, __parentTick, aa, x);
}));

function tick() {
    it0 = new ArrayAccess(va);
    it1 = new ArrayAccess(new StructAccess(it0, ["l"], {
        base: "list",
        params: ["Vec2"]
    }));
    var __v11 = new __Obj(Vec2, [new Store(1, "int"), new Store(1, "int")], "Vec2", {
        click: function () {}
    });
    var __v9 = va.get().length - 1;
    for (; __v9 >= 0; __v9--) {
        it0.push(__v9);
        var __v10 = it0.get().l.length - 1;
        for (; __v10 >= 0; __v10--) {
            it1.push(__v10);
            Vec2.inc(it1, __v11);
            it1.pop();
        }
        it0.pop();
    }
}

	// $.globalEval(src)
	// eval(src);
	// $("#test").html(code.a.get());
	tick();
	// $test.html(aa.get()[1][1]);
	$test.html(aa.get()[1][1]);
}
, "text" // Commenter pour lire du json
);

})