// Reviewed deployment argument validation, shared by production and private QA.
import {createHash} from 'node:crypto';
export const FIXED=Object.freeze({container:'bba1ob4dfr7med7i3ntu',repository:'cr.yandex/crp26t5as9vgmqmvsau4/nexus-pilot-backend',gateway:'d5d8d3c2d1uhct6fmvle'});
const fail=code=>{const error=new Error(code);error.safeCode=code;throw error};
const require=(condition,code)=>{if(!condition)fail(code)};
const sorted=value=>Array.isArray(value)?value.map(sorted):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])])):value;
export const hashConfig=value=>createHash('sha256').update(JSON.stringify(sorted(value))).digest('hex');
const exact=(value,allowed,code)=>require(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>allowed.includes(key)),code);
const csv=value=>{require(typeof value==='string'&&!/[,\r\n\0]/.test(value),'UNSAFE_CLI_VALUE');return value};
const integer=value=>{const text=String(value);require(/^\d+$/.test(text),'INVALID_RESOURCE_INTEGER');return text};
const digest=value=>/^sha256:[0-9a-f]{64}$/.test(value||'');

export function projectRevision(revision){
 exact(revision,['id','container_id','description','created_at','image','resources','execution_timeout','concurrency','service_account_id','status','secrets','log_options','runtime','metadata_options','connectivity','provision_policy','scaling_policy','storage_mounts','mounts','async_invocation_config'],'UNKNOWN_REVISION_CONFIG_FIELD');
 exact(revision.image,['image_url','image_digest','environment','command','args'],'UNKNOWN_IMAGE_CONFIG_FIELD');
 require(revision.container_id===FIXED.container,'WRONG_CONTAINER');
 require(Array.isArray(revision.secrets),'MISSING_SECRET_REFERENCES');
 require(!revision.storage_mounts?.length&&!revision.mounts?.length&&!revision.async_invocation_config,'UNSUPPORTED_MOUNTS_OR_ASYNC_CONFIG');
 const projection={description:revision.description,resources:revision.resources,execution_timeout:revision.execution_timeout,
  concurrency:revision.concurrency,service_account_id:revision.service_account_id,
  image:{environment:revision.image.environment,command:revision.image.command,args:revision.image.args},
  secrets:[...revision.secrets].sort((a,b)=>String(a.environment_variable).localeCompare(String(b.environment_variable))),
  log_options:revision.log_options,runtime:revision.runtime,metadata_options:revision.metadata_options,
  connectivity:revision.connectivity,provision_policy:revision.provision_policy,scaling_policy:revision.scaling_policy,
  storage_mounts:revision.storage_mounts,mounts:revision.mounts};
 require(projection.image.environment&&typeof projection.image.environment==='object'&&!Array.isArray(projection.image.environment),'MISSING_ENVIRONMENT');
 for(const[name,value]of Object.entries(projection.image.environment)){require(/^[A-Z][A-Z0-9_]*$/.test(name),'INVALID_ENVIRONMENT_NAME');csv(value)}
 const refNames=[];
 for(const ref of projection.secrets){
  exact(ref,['id','version_id','key','environment_variable'],'INVALID_SECRET_REFERENCE');
  for(const key of ['id','version_id','key','environment_variable'])require(typeof ref[key]==='string'&&csv(ref[key]).length>0,'INCOMPLETE_SECRET_REFERENCE');
  require(!Object.hasOwn(projection.image.environment,ref.environment_variable),'INLINE_SECRET_ENVIRONMENT_FORBIDDEN');refNames.push(ref.environment_variable);
 }
 require(new Set(refNames).size===refNames.length,'DUPLICATE_SECRET_ENVIRONMENT');
 require([undefined,'true'].includes(projection.image.environment.COOKIE_INGRESS_V3_ENABLED),'INVALID_V3_CONFIG');
 return projection;
}

export function deploymentArgs(revision,image){
 const p=projectRevision(revision);
 exact(p.resources,['memory','cores','core_fraction'],'UNSUPPORTED_RESOURCE_CONFIG');
 require(/^\d+(?:\.\d+)?s$/.test(p.execution_timeout),'INVALID_EXECUTION_TIMEOUT');
 const args=['serverless','container','revision','deploy','--container-id',FIXED.container,'--image',image,
  '--service-account-id',csv(p.service_account_id),'--memory',integer(p.resources.memory)+'B',
  '--cores',integer(p.resources.cores),'--core-fraction',integer(p.resources.core_fraction),
  '--execution-timeout',p.execution_timeout,'--concurrency',integer(p.concurrency)];
 if(p.description!==undefined)args.push('--description',csv(p.description));
 args.push('--environment',Object.entries(p.image.environment).map(([key,value])=>key+'='+value).join(','));
 for(const [field,flag]of [['command','--command'],['args','--args']]){
  if(p.image[field]!==undefined){require(Array.isArray(p.image[field]),'INVALID_IMAGE_COMMAND');args.push(flag,p.image[field].map(csv).join(','))}
 }
 for(const ref of p.secrets)args.push('--secret',`id=${ref.id},version-id=${ref.version_id},key=${ref.key},environment-variable=${ref.environment_variable}`);
 exact(p.log_options,['disabled','folder_id','log_group_id','min_level'],'UNSUPPORTED_LOGGING_CONFIG');
 if(p.log_options.disabled===true)args.push('--no-logging');else require(p.log_options.disabled===false||p.log_options.disabled===undefined,'INVALID_LOGGING_CONFIG');
 require(!(p.log_options.folder_id&&p.log_options.log_group_id),'AMBIGUOUS_LOG_DESTINATION');
 if(p.log_options.folder_id)args.push('--log-folder-id',csv(p.log_options.folder_id));
 if(p.log_options.log_group_id)args.push('--log-group-id',csv(p.log_options.log_group_id));
 if(p.log_options.min_level)args.push('--min-log-level',csv(p.log_options.min_level).toLowerCase());
 exact(p.runtime,['http','task'],'UNSUPPORTED_RUNTIME');
 const runtime=Object.keys(p.runtime);require(runtime.length===1,'AMBIGUOUS_RUNTIME');exact(p.runtime[runtime[0]],[],'UNSUPPORTED_RUNTIME_OPTIONS');args.push('--runtime',runtime[0]);
 exact(p.metadata_options??{},['aws_v1_http_endpoint','gce_http_endpoint'],'UNSUPPORTED_METADATA_OPTIONS');
 const metadata=Object.entries(p.metadata_options??{}).map(([key,value])=>{const mode=String(value).toLowerCase();require(['enabled','disabled'].includes(mode),'INVALID_METADATA_MODE');return key.replaceAll('_','-')+'='+mode});
 if(metadata.length)args.push('--metadata-options',metadata.join(','));
 if(p.connectivity){exact(p.connectivity,['network_id','subnet_ids'],'UNSUPPORTED_NETWORK_CONFIG');if(p.connectivity.network_id)args.push('--network-id',csv(p.connectivity.network_id));if(p.connectivity.subnet_ids?.length){require(Array.isArray(p.connectivity.subnet_ids),'INVALID_SUBNETS');args.push('--subnets',p.connectivity.subnet_ids.map(csv).join(','))}}
 if(p.provision_policy){exact(p.provision_policy,['min_instances'],'UNSUPPORTED_PROVISION_POLICY');if(p.provision_policy.min_instances!==undefined)args.push('--min-instances',integer(p.provision_policy.min_instances))}
 if(p.scaling_policy){exact(p.scaling_policy,['zone_instances_limit','zone_requests_limit'],'UNSUPPORTED_SCALING_POLICY');for(const key of Object.keys(p.scaling_policy))args.push('--'+key.replaceAll('_','-'),integer(p.scaling_policy[key]))}
 return args;
}
