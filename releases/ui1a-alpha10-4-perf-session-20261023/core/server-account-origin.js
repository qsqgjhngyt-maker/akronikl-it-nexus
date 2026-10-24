// Единственный ранее выбранный серверный origin. Cookies остаются на этом origin.
export const SERVER_ACCOUNT_ORIGIN='https://d5d8d3c2d1uhct6fmvle.3rspsmhh.apigw.yandexcloud.net';
export const isServerAccountOrigin=()=>globalThis.location?.origin===SERVER_ACCOUNT_ORIGIN;
export function serverAccountURL(view='account'){
 if(!['account','feedback','reviews','feedback-admin','access'].includes(view))throw new TypeError('Unknown server account destination');
 return view==='access'?SERVER_ACCOUNT_ORIGIN+'/account/access/':SERVER_ACCOUNT_ORIGIN+'/#view='+view;
}
