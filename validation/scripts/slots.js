function slots(nodeSrc)
{
    var jsSrc = makeJsSrc(nodeSrc);
    eval(jsSrc);

    noParamsSlot();
    assertEqual(x, 10, "Var after noParamsSlot");

    signalNoParamsSlot();
    assertEqual(x, 20, "Var after signalNoParamsSlot");

    twoParamsSlot(x, 2);
    assertEqual(x, 60, "Var after twoParamsSlot x 2");

    signalTwoParamsSlot(x, 1);
    assertEqual(x, 180, "Var after signalTwoParamsSlot x 1");

    slotTwoStatements(20);
    assertEqual(x, 240, "Var after slotTwoStatements 20");
}
