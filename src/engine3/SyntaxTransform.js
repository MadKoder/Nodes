syntax = (function() {

function pushBlock(blockStack, type, indent) {
    blockStack.push({
        type : type,
        indent : indent
    });
}

function getIndent(line)
{
    var match = /^(\s*)\S+/.exec(line);
    if(match != null)
        return match[1].length;
    return -1;
}

function splitCodeAndComment(line) {
    var split = /([^#]*)(#.*)/.exec(line);
    if(split != null)
        return [split[1], split[2]];
    return [line, ""];
}

function convert(input) {
    var inputLines = input.split(/\r\n|\r|\n/);
    // Stack of current block, contains ident of each block
    var blockStack = [0];
    var outputLines = [];
    for(var i = 0; i < inputLines.length; i++) {
        var inputLine = inputLines[i];
        var block = blockStack[blockStack.length - 1];
        var blockIndent = block;
        var codeAndComment = null;

        // Split between code and comment, error if not splitable (parsing error)
        try {
            var codeAndComment = commentParser.parse(inputLine);
            var code = codeAndComment.code;
            var comment = codeAndComment.comment;
        } catch(e) {
            outputLines.push("NOT PARSED");
        }

        indent = getIndent(code);
        if(indent < 0) {
            indent = blockIndent;
        }
        var firstLineOfBlock = false;
        var outputLine = "";
        if(indent > blockIndent) {
            // An indent, push a new block and add indent tag
            blockStack.push(indent);
            outputLine += ";$>   ";
        } else if(indent < blockIndent) {
            // A dedent, find to which block in the stack it corresponds
            var nbDedent = 0;
            var dedentArray = [];
            while(indent < blockIndent){
                blockStack.pop();
                block = blockStack[blockStack.length - 1];
                blockIndent = block;
                nbDedent++;
                dedentArray.push("");
            }

            // Error if there is no block with the exact indent
            if(indent > blockIndent)
            {
                throw "Error, indent not correct";
            }

            if(nbDedent == 1) {
                outputLine += "$<;  ";
            } else if(nbDedent == 2) {
                outputLine += "$<$<;";
            } else {
                outputLine += dedentArray.join("$<");
                outputLine += ";";
            }
        } else {
            // Same indent, just adds a line separator
            outputLine += ";    ";
        }
        outputLine += inputLine;
        outputLines.push(outputLine);
    }

    // If finished on an indented block (no newline on an indent block),
    // Adds dedents and line separator
    if(blockStack.length > 1) {
        outputLine = "";
        for(var i = 0; i < blockStack.length - 1; i++) {
            outputLine += "$<"
        }
        outputLine += ";";
        outputLines.push(outputLine);
    }

    return outputLines.join("\n");
}

return {
    convert : convert
};

})();
