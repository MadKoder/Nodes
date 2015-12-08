function functions(nodeSrc)
{
    var jsSrc = makeJsSrc(nodeSrc);
    eval(jsSrc);

    assertEqual(typedFuncRes, 2, "Typed func result");
    assertEqual(inputTypedFuncRes, 3, "Input typed func result");
    assertEqual(outputTypedFuncRes, 4, "Output typed func result");
    assertEqual(unTypedFuncRes, 5, "Untyped func result");

    assertEqual(lineBreakFuncRes, 11, "Line break func result");
    assertEqual(twoParamsUntypedFuncRes, 13, "Two params untyped func result");
    assertEqual(threeParamTypedFuncRes, 6, "Three params typed func result");
    assertEqual(funcCallInFunccRes, 16, "Func call in func result");
}
