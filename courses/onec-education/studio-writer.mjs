// S1 использует общий account writer; другие редакторы не обходят lease.
import {onecAccount} from './studio-store.mjs';
import {withProjectWriter,leaseProjectWriter} from '../../project-studio/project-writer.js';
const mapped=e=>{if(e.message==='PROJECT_WRITER_BUSY')return Error('S1_WRITER_BUSY');if(e.message==='PROJECT_WRITER_UNAVAILABLE')return Error('S1_WRITER_UNAVAILABLE');return e};
export function withOnecWriter(fn){onecAccount();if(!globalThis.navigator?.locks?.request)throw Error('S1_WRITER_UNAVAILABLE');try{return withProjectWriter(()=>{onecAccount();return fn()},{allowReentry:false}).catch(e=>{throw mapped(e)})}catch(e){throw mapped(e)}}
export function leaseOnecWriter({granted,unavailable}){onecAccount();return leaseProjectWriter({granted:()=>{onecAccount();granted()},unavailable:e=>unavailable(mapped(e))})}
