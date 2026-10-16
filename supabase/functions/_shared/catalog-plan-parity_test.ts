import { candidateParityFixture } from "../../../docs/verification/lower-body-v2/generate-candidate-parity.ts";
Deno.test("fixed lower-body candidate and budget fixture matches backend across equipment and condition variants",async()=>{
 const expected=JSON.parse(await Deno.readTextFile(new URL("../../../docs/verification/lower-body-v2/candidate-parity.json",import.meta.url)));
 const actual=candidateParityFixture();
 if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error("Cross-platform candidate fixture drifted; inspect before regenerating");
 if(actual.cases.length!==12 || actual.cases.filter(x=>x.errorCode!==null).length!==3)throw new Error("Expected 9 eligible cases and 3 condition-insufficient cases");
});
