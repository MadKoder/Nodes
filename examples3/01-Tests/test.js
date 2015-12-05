$(document).ready(function ()
{

var $tmp = $("#tmp");

var library =
{
    nodes : {},
    functions : functions,
    actions : actions,
    classes : {},
    types : {},
    attribs : {}
};

var fileName = "test.nodes";
var fileName = "classes.nodes";
// var fileName = "nodeDef.nodes";
// var fileName = "nodeVar.nodes";
// var fileName = "litNode.nodes";
// var fileName = "signalSlots.nodes";
// var fileName = "syntax.nodes";
// var fileName = "curried.nodes";
// var fileName = "destruct.nodes";
// var fileName = "tuple.nodes";
// var fileName = "list.nodes";
// var fileName = "refs.nodes";
// var fileName = "clone.nodes";
// var fileName = "events.nodes";
// var fileName = "objects.nodes";
// var fileName = "generics.nodes";
$.get(fileName, function( text ) {
    // setLodash(_);
    setEngineLodash(_);

    var array = [];
    array.push(function(x) {return x;});
    // var codeGraph = codeToGraph(text, library, parser);
    var canonicalStr = syntax.convert(text);
    var codeGraph = parser.parse(canonicalStr);
    // var src = compileGraph(codeGraph, library);
    var prog = compileGraph(codeGraph, library);
    var src = escodegen.generate(prog);

    $tmp.append("<div id=\"test\"></div>");
    var $test = $("#test");

    $.globalEval(src)

    function appendText(txt) {
        $tmp.append("<div>" + txt + "</div>");
    }
    
    // function Klass(x) {
    //     var that = this;
    //     this.x = _.clone(x, true);
    //     this.y = __def(function () {
    //         return that.x + 10;
    //     });
    //     this.inc = function(x) {
    //      this.x = this.x + x;
    //     }
    //     this.x$sinkList = [this.y];
    // }
    function K(x) {
        var that = this;
        this.x = x;
        this.y = __def(function () {
            return that.x + 10;
        });
    }
    // o = new Klass(1);

    if(fileName == "test.nodes") {
        tick(10, 5);
        appendText(x.get());
        appendText(y);
        appendText(z);
        appendText(t.get());
        appendText(b);
        appendText([v.get().x, v.get().y].join(", "));
        appendText([w0.x, w0.y].join(", "));
        appendText([w.x, w.y].join(", "));
    } else if(fileName == "classes.nodes") {
        appendText(x);
        appendText(o.x);
        appendText(y.get());
        appendText(o.y.get());
        appendText(z.get());
        o.inc(10);
        appendText(x);
        appendText(o.x);
        appendText(y.get());
        appendText(o.y.get());
        appendText(z.get());
        // tick2();
        // appendText(x);
        // appendText(o.x);
        // appendText(y.get());
        // appendText(o.y.get());
        // appendText(z.get());
    } else if(fileName == "nodeDef.nodes") {
        appendText(x);
        appendText(n.x.get());
        appendText(n.y.get());
        appendText(z.get());
        appendText(zz.get());
        tick();
        appendText(x);
        appendText(n.x.get());
        appendText(n.y.get());
        appendText(z.get());
        appendText(zz.get());
    } else if(fileName == "nodeVar.nodes") {
        appendText(n.x);
        appendText(y.get());
        tick();
        appendText(n.x);
        appendText(y.get());
    } else if(fileName == "litNode.nodes") {
        appendText(x);
        appendText(n.x.get());
        appendText(n.y.get());
        appendText(n.z);
        appendText(z.get());
        appendText(c.get());
        appendText(n.z);
        tick();
        appendText(x);
        appendText(n.x.get());
        appendText(z.get());
    } else if(fileName == "signalSlots.nodes") {
        appendText(x);
        sig(10);
        sig(10);
        appendText(x);
        appendText(z);
        sigUnit();
        appendText(x);
    } else if(fileName == "syntax.nodes") {
        appendText(x);
        appendText(y);
        tick(3);
        appendText(x);
        appendText(y);
        tack(4, 6);
        appendText(x);
        appendText(y);
    } else if(fileName == "curried.nodes") {
        appendText(x);
        appendText(y);
        appendText(z);
        appendText(l.join(", "));
    } else if(fileName == "destruct.nodes") {
        tick();
        appendText(x);
        appendText(y);
        appendText(z.get());
    } else if(fileName == "tuple.nodes") {
        appendText(t.join(", "));
        appendText(t2.join(", "));
        appendText(t3.join(", "));
    } else if(fileName == "list.nodes") {
        appendText(l.join(", "));
        appendText(l2.get().join(", "));
        appendText(l3.get().join(", "));
        appendText(c.join(", "));
        appendText(c2.join(", "));
        appendText(c3.get().join(", "));
    } else if(fileName == "refs.nodes") {
        tick();
        appendText([v.x, v.y].join(", "));
        appendText(s.sum);
    } else if(fileName == "clone.nodes") {
        tick();
        appendText([t.x, t.y].join(", "));
        appendText([u.x, u.y].join(", "));
        appendText([v.x, v.y].join(", "));
        appendText([w.x, w.y].join(", "));
        appendText([y.get().x, y.get().y].join(", "));
        appendText([z.x, z.y].join(", "));
    } else if(fileName == "generics.nodes") {
        appendText([v.get().x, v.get().y].join(", "));
    } else if(fileName == "events.nodes") {
        tick();
        appendText(y);
        appendText(z.get());
    } else if(fileName == "objects.nodes") {
        tick();
        appendText([v.x, v.y].join(", "));
        appendText([r.pos.x, r.pos.y].join(", "));
        appendText(x.get());
    }
}
, "text" // Commenter pour lire du json
);

})