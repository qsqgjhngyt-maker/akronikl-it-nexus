import {validatePersonality,personalityPreset} from '../personality/config.js';
import {speechPreferences} from '../experience/speech.js';
import {cloudSelection} from './cloud-catalog.js';
export function cloudPreferences(value={theme:'auto',locale:'ru',suggestions:true,enterSends:true,personality:personalityPreset()}){
 const required=['enterSends','locale','personality','suggestions','theme'];
 if(!value||!required.every(k=>Object.hasOwn(value,k))||Object.keys(value).some(k=>![...required,'speech','cloudChoice'].includes(k))||!['auto','light','dark'].includes(value.theme)||!['ru','en'].includes(value.locale)||typeof value.suggestions!=='boolean'||typeof value.enterSends!=='boolean')throw Error('CLOUD_SETTINGS_INVALID');
 return Object.freeze({...value,personality:validatePersonality(value.personality),speech:speechPreferences(value.speech),cloudChoice:value.cloudChoice==null?null:cloudSelection(value.cloudChoice)});
}
