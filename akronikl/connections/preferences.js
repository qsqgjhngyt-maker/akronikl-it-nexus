import {validatePersonality,personalityPreset} from '../personality/config.js';
export function cloudPreferences(value={theme:'auto',locale:'ru',suggestions:true,enterSends:true,personality:personalityPreset()}){
 if(!value||Object.keys(value).sort().join(',')!=='enterSends,locale,personality,suggestions,theme'||!['auto','light','dark'].includes(value.theme)||!['ru','en'].includes(value.locale)||typeof value.suggestions!=='boolean'||typeof value.enterSends!=='boolean')throw Error('CLOUD_SETTINGS_INVALID');
 return Object.freeze({...value,personality:validatePersonality(value.personality)});
}
