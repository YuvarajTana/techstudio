import {apiJson} from './apiClient';

export interface SavedProject {id:string;revision:number;updatedAt?:string;creative_context?:Record<string,unknown>}
interface Queue {revision:number|null;tail:Promise<unknown>;error:Error|null}
const queues=new Map<string,Queue>();
export function primeProjectSave(id:string,revision:number){queues.set(id,{revision,tail:Promise.resolve(),error:null});}
export async function flushProjectSaves(id:string){const queue=queues.get(id);if(queue){await queue.tail;if(queue.error)throw queue.error;}return queue?.revision;}
export function enqueueProjectSave(id:string,patch:Record<string,unknown>):Promise<SavedProject>{
  let queue=queues.get(id);if(!queue){queue={revision:null,tail:Promise.resolve(),error:null};queues.set(id,queue);}
  const state=queue;
  const operation=state.tail.then(async()=>{
    if(state.error)throw state.error;
    if(state.revision===null)state.revision=(await apiJson<SavedProject>(`/api/projects/${id}`)).revision;
    const result=await apiJson<SavedProject>(`/api/projects/${id}`,{method:'PUT',body:JSON.stringify({...patch,expected_revision:state.revision})});
    state.revision=result.revision;return result;
  });
  state.tail=operation.catch(error=>{state.error=error instanceof Error?error:new Error('Save failed. Reload before saving again.');});
  return operation;
}
