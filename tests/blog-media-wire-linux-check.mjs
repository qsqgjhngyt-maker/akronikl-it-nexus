// Настоящий Linux TCP socket. Только loopback, никаких внешних соединений.
import assert from 'node:assert/strict';
import net from 'node:net';
import {socketProgress,WIRE_FIELDS} from '../server-access/bff/socket-progress.mjs';
assert.equal(process.platform,'linux');
let peer;const server=net.createServer(s=>{peer=s;s.pause()});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const socket=net.connect(server.address().port,'127.0.0.1');
try{
 await new Promise((r,j)=>{socket.once('connect',r);socket.once('error',j)});
 const initial=socketProgress(socket,{tcp:true},null,null);
 assert.equal(initial.kernel,1);assert.equal(initial.kstate,1);assert.equal(initial.tcp,1);assert.equal(initial.tls,0);assert.equal(initial.written,0);
 socket.write(Buffer.alloc(4*1024*1024,65));await new Promise(r=>setTimeout(r,40));
 const pending=socketProgress(socket,{tcp:true},null,null);
 assert.equal(pending.kernel,1);assert.ok(pending.ktx>0||pending.writeq>0,'PAUSED_PEER_MUST_SHOW_PENDING_BYTES');assert.equal(pending.written,4*1024*1024);
 let received=0;peer.on('data',b=>received+=b.length);peer.resume();
 const until=Date.now()+4000;while(received<4*1024*1024&&Date.now()<until)await new Promise(r=>setTimeout(r,20));
 assert.equal(received,4*1024*1024);await new Promise(r=>setTimeout(r,80));
 const drained=socketProgress(socket,{tcp:true,finished:true},null,null);
 assert.equal(drained.kernel,1);assert.equal(drained.ktx,0);assert.equal(drained.writeq,0);assert.equal(drained.finished,1);
 for(const v of [initial,pending,drained]){assert.deepEqual(Object.keys(v),WIRE_FIELDS);assert.ok(Object.values(v).every(x=>Number.isSafeInteger(x)&&x>=0))}
 console.log(JSON.stringify({status:'PASS',checks:3,runtime:process.version,initial,pending,drained,externalNetwork:false,cloudWrites:0}));
}finally{socket.destroy();peer?.destroy();await new Promise(r=>server.close(r))}
