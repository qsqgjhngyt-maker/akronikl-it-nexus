import pathlib,subprocess,sys,re,json,hashlib
sdk=pathlib.Path(sys.argv[1]);target=pathlib.Path(sys.argv[2]);manifest=pathlib.Path(sys.argv[3])
names=set();excluded=[]
for library in ['Core','Gui','Widgets']:
 data=subprocess.check_output(['/emsdk/upstream/bin/llvm-nm','--defined-only','--extern-only','--format=posix',str(sdk/'lib'/('libQt6'+library+'.a'))],text=True)
 for line in data.splitlines():
  parts=line.split()
  if len(parts)<3 or len(parts[1])!=1 or not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*',parts[0]):continue
  name=parts[0]
  # Private wasm JSPI/Asyncify internals are not this singlethread profile's ABI.
  # Do not export undefined third-party symbols or disable linker errors.
  if any(x in name for x in ['QWasm','qstdweb','QEventDispatcherWasm','qt_jspi']):excluded.append(name);continue
  names.add(name)
flags='\n'.join('--export='+name for name in sorted(names))+'\n'
target.write_text(flags)
manifest.write_text(json.dumps({'schemaVersion':1,'qt':'6.8.3','emscripten':'3.1.56','modules':['Core','Gui','Widgets'],'profile':'singlethread-no-jspi','exports':sorted(names),'excludedPrivateWasmSymbols':sorted(set(excluded))},separators=(',',':')))
print(json.dumps({'definedExports':len(names),'excludedPrivateWasm':len(set(excluded)),'exportFlagsSha256':hashlib.sha256(flags.encode()).hexdigest()}))
