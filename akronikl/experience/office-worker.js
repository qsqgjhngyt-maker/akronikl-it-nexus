import {officeParts} from './office-zip.js';
self.onmessage=event=>{try{self.postMessage({parts:officeParts(new Uint8Array(event.data))});}catch(e){self.postMessage({error:['CHAT_DOCUMENT_INVALID','CHAT_DOCUMENT_TOO_LARGE'].includes(e.message)?e.message:'CHAT_DOCUMENT_INVALID'});}};
