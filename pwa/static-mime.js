export function staticMime(file){
 const extension=file.slice(file.lastIndexOf('.')+1).toLowerCase();
 return ({js:'text/javascript',mjs:'text/javascript',wasm:'application/wasm',css:'text/css',json:'application/json',webmanifest:'application/manifest+json',html:'text/html',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',svg:'image/svg+xml',mp4:'video/mp4',webm:'video/webm',wav:'audio/wav',md:'text/markdown',txt:'text/plain',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',pfb:'application/x-font-type1',icc:'application/vnd.iccprofile',bcmap:'application/octet-stream',bin:'application/octet-stream'})[extension]??(file.slice(file.lastIndexOf('/')+1).includes('.')?'application/octet-stream':'text/plain');
}
