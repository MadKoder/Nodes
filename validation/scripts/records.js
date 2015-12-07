function records(nodeSrc)
{
    var jsSrc = makeJsSrc(nodeSrc);
    eval(jsSrc);

    assertEqual(recordVar, {x : 10, y : 1, z : {a : 10, b : 100}}, "Record var");
    assertEqual(defFromRecordVar.get(), 20, "Def from record var");
    assertEqual(recordDef.get(), {x : 20, y : {a : 11, b : 100}}, "Record def");
    assertEqual(defFromRecordDef.get(), 31, "Def from record def");
    assertEqual(recordDefFromEntireRecord.get(), {x : 20, y : {a : 11, b : 100}}, "Record def from entire record");

    setRecordField();
    assertEqual(recordVar, {x : 100, y : 1, z : {a : 0, b : 100}}, "Record var after setRecordField");
    assertEqual(defFromRecordVar.get(), 100, "Def from record var after setRecordField");
    assertEqual(recordDef.get(), {x : 100, y : {a : 101, b : 100}}, "Record def after setRecordField");
    assertEqual(defFromRecordDef.get(), 201, "Def from record def after setRecordField");
    assertEqual(recordDefFromEntireRecord.get(), {x : 100, y : {a : 101, b : 100}}, "Record def from entire record after setRecordField");
    assertEqual(recordVarCopyFromVar, {x : 10, y : 1, z : {a : 10, b : 100}}, "Record var copy from var afet setRecordField");
    assertEqual(recordVarCopyFromDef, {x : 20, y : {a : 11, b : 100}}, "Record var copy from def afet setRecordField");

    setRecord();
    assertEqual(recordVar, {x : 1, y : 0, z : {a : 100, b : 200}}, "Record var after setRecord");
    assertEqual(defFromRecordVar.get(), 101, "Def from record var after setRecord");
    assertEqual(recordDef.get(), {x : 101, y : {a : 2, b : 200}}, "Record def after setRecord");
    assertEqual(defFromRecordDef.get(), 103, "Def from record def after setRecord");
    assertEqual(recordDefFromEntireRecord.get(), {x : 101, y : {a : 2, b : 200}}, "Record def from entire record after setRecord");
    assertEqual(recordVarCopyFromVar, {x : 10, y : 1, z : {a : 10, b : 100}}, "Record var copy from var afet setRecord");
    assertEqual(recordVarCopyFromDef, {x : 20, y : {a : 11, b : 100}}, "Record var copy from def afet setRecord");

}
