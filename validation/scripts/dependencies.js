function dependencies(nodeSrc)
{
    eval(makeJsSrc(nodeSrc));
    tick();
    assertEqual(varSink.get(), 11, "Var to def dependency");
    assertEqual(defSink.get(), 21, "Def to def dependency");
}
