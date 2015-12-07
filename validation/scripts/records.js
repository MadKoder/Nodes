function records(nodeSrc)
{
    var jsSrc = makeJsSrc(nodeSrc);
    eval(jsSrc);

    assertEqual(recordVar, {x : 10, y : 1}, "Record var");
    assertEqual(defFromRecordVar.get(), 11, "Def from record var");
    assertEqual(recordDef.get(), {x : 11, y : 12}, "Record def");
    assertEqual(defFromRecordDef.get(), 23, "Def from record def");

    setRecordField();
    assertEqual(recordVar, {x : 100, y : 1}, "Record var after setRecordField");
    assertEqual(defFromRecordVar.get(), 101, "Def from record var after setRecordField");
    assertEqual(recordDef.get(), {x : 101, y : 102}, "Record def after setRecordField");
    assertEqual(defFromRecordDef.get(), 203, "Def from record def after setRecordField");

    setRecord();
    assertEqual(recordVar, {x : 1, y : 0}, "Record var after setRecord");
    assertEqual(defFromRecordVar.get(), 1, "Def from record var after setRecord");
    assertEqual(recordDef.get(), {x : 1, y : 2}, "Record def after setRecord");
    assertEqual(defFromRecordDef.get(), 3, "Def from record def after setRecord");
}
