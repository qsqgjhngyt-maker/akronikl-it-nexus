import {personalityPreset, updatePersonality} from './config.js';
// Состояние только в памяти текущего окна. Изменение модели не владеет стилем.
export function createPersonality({isCurrent,locale='ru',onChange=()=>{}}={}) {
  if(typeof isCurrent!=='function'||typeof onChange!=='function')throw Error('PERSONALITY_CONFIG_INVALID');
  let config=personalityPreset('partner',locale), dead=false;
  const current=()=>{try{return !dead&&isCurrent()===true;}catch{return false;}};
  function ensure(){if(!current()){dispose();throw Error('PERSONALITY_CONTEXT_EXPIRED');}}
  function dispose(){dead=true;config=null;}
  return Object.freeze({
    snapshot(){ensure();return config;},
    update(patch){ensure();const next=updatePersonality(config,patch);if(next.revision===config.revision)return config;config=next;onChange(config);return config;},
    dispose
  });
}
