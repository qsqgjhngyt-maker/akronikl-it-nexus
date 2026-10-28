// Isolated frontend host; Account proof and lazy assistant bridge are production source modules.
import {createNexusBootstrap} from '../../core/bootstrap.js';
import {verifiedAccount} from '../../core/account-storage.js';
import {createLazyAssistantBridge} from '../../akronikl/context.js';
import {logout} from '../../server-access/public/passkey-client.js';
const root=document.querySelector('#root'),trigger=document.querySelector('[data-akronikl-open]');let ready=false,bridge;
const bootstrap=createNexusBootstrap({importApp:async()=>{ready=true;document.querySelector('#account').textContent=verifiedAccount().displayName;trigger.disabled=false;bridge=createLazyAssistantBridge({root,readIdentity:verifiedAccount,readReady:()=>ready,readRoute:()=>({course:'cpp',lesson:'cpp.lifetime-ownership'}),readLocale:()=> 'ru',readCourseLocale:()=> 'ru',readEditor:()=>null});}});
addEventListener('nexus:context-invalidated',()=>{ready=false;trigger.disabled=true;});
document.querySelector('#logout').onclick=async()=>{await logout();dispatchEvent(new Event('nexus:session-ended'));};
window.qaNexus={get ready(){return ready;},get accountId(){return verifiedAccount()?.accountId??null;},recheck:()=>bootstrap.recheck()};
await bootstrap.startNexus();
