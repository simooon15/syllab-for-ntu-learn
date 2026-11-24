# Read-only local accounting. Never changes model output, workflow, or Evidence IDs.
import json,hashlib
from pathlib import Path
import sys
if len(sys.argv)!=2 or not sys.argv[1].startswith('evidence/private/'):
 raise SystemExit('PRIVATE_EVIDENCE_DIRECTORY_REQUIRED')
p=Path(sys.argv[1]);ui=json.loads((p/'TASK-B-FAILED-UI.json').read_text());original=json.loads(ui['channels'][1]);user=json.loads(ui['context'].split('\n\nUSER\n',1)[1]);supplied={x['evidenceId']:x for x in user['evidence']};violations=[];rowValidity={};rowChecks=[];originalIds=set()
def walk(value,path,errors):
 if isinstance(value,list):
  for i,x in enumerate(value):walk(x,path+'/'+str(i),errors)
 elif isinstance(value,dict):
  if isinstance(value.get('evidenceId'),str) and isinstance(value.get('sourceId'),str):
   found=supplied.get(value['evidenceId']);reason=None
   if not found:reason='evidence-id-not-supplied'
   elif found['sourceId']!=value['sourceId']:reason='source-mismatch'
   elif isinstance(value.get('locator'),str) and found['locator']!=value['locator']:reason='locator-mismatch'
   elif isinstance(value.get('excerpt'),str) and value['excerpt'] not in found['excerpt']:reason='excerpt-not-supplied'
   if reason:originalIds.add(value['evidenceId']);errors.append({'path':path,'reason':reason,'evidenceRef':hashlib.sha256(value['evidenceId'].encode()).hexdigest()[:16]})
  for r in value.get('evidenceRefs',[]) if isinstance(value.get('evidenceRefs'),list) else []:
   if isinstance(r,str) and r not in supplied:originalIds.add(r);errors.append({'path':path+'/evidenceRefs','reason':'evidence-ref-not-supplied','evidenceRef':hashlib.sha256(r.encode()).hexdigest()[:16]})
  for k,x in value.items():walk(x,path+'/'+k,errors)
for name,rows in original.items():
 if not isinstance(rows,list):continue
 good=0;bad=0
 for i,row in enumerate(rows):
  errors=[];walk(row,'/'+name+'/'+str(i),errors);violations+=errors;good+=not bool(errors);bad+=bool(errors);rowChecks.append({'section':name,'row':i,'evidenceCheck':'PASS' if not errors else 'FAIL','violations':errors})
 rowValidity[name]={'rows':len(rows),'passesSuppliedEvidenceOnly':good,'failsSuppliedEvidence':bad}
result={'uniqueUnsupportedIds':len({v['evidenceRef'] for v in violations}),'unsupportedIdsPresentInInput':sum(r in ui['context'] for r in originalIds),'status':'STOP_TASK_B_EVIDENCE_CONTRACT','scope':'Read-only offline audit; not semantic acceptance or whole Task B contract PASS','requestedEvidenceRefs':len(original.get('requestedEvidenceRefs',[])),'suppliedEvidence':len(supplied),'successfulContexts':len(user['sharedWorkingContexts']),'unresolvedManifestCount':len(user['unresolvedCoverage']['unresolved']),'unsupportedCitations':len(violations),'reasonCounts':{reason:sum(v['reason']==reason for v in violations) for reason in sorted({v['reason'] for v in violations})},'sections':rowValidity,'rows':rowChecks,'localSemanticRepair':False,'automaticExpansionPossible':False,'partialTaskBContractAvailable':False,'provenanceConstraint':'Cannot locally replace Evidence IDs, locators or excerpts to turn an unsupported semantic claim into supplied evidence.','remainingConflict':'Existing Task B course-wide output has no independent per-item success/checkpoint/failure graph; admitting a subset needs explicit dependency/coverage contract, not silently discarding rows.'}
Path('artifacts/v0.3.0/partial-020/TASK-B-EVIDENCE-AUDIT.json').write_text(json.dumps(result,indent=2)+'\n');print({k:result[k] for k in ['status','requestedEvidenceRefs','suppliedEvidence','successfulContexts','unsupportedCitations','reasonCounts','sections']})
