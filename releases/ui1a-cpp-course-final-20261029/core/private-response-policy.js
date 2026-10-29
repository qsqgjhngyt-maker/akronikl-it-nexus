// Прокси добавляет Accept-Encoding к Vary. Отдельный token '*' по-прежнему
// запрещает Cache.put; отсутствие wildcard или повреждённый список закрывают доступ.
export function hasVaryWildcard(value){
 if(typeof value!=='string'||value.length>4096)return false;
 const fields=value.split(',').map(field=>field.trim());
 return fields.length<=64&&fields.includes('*')&&fields.every(field=>/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(field));
}
