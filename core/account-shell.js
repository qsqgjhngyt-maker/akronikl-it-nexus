import {loadLocalIdentity} from './identity.js';
import {cloudflareSyncSummary} from '../sync/cloudflare-config.js';
import {disconnectCloudAccount} from '../sync/cloud-sync.js';
import {
  identityV2Capabilities,
  identityV2CredentialState,
  listIdentityV2Sessions,
  listIdentityV2Devices,
  revokeIdentityV2Session,
  revokeIdentityV2Device,
  clearIdentityV2SessionCredential
} from '../sync/identity-v2-client.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
}[ch]));

const shortId=value=>{
  const s=String(value||'');
  if(!s)return '—';
  if(s.length<=18)return s;
  return `${s.slice(0,8)}…${s.slice(-6)}`;
};

const initial=value=>{
  const text=String(value||'N').trim();
  const ch=[...text][0]||'N';
  return ch.toUpperCase();
};

const formatIdentityTime=(value,locale='ru')=>{
  if(!value)return '—';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '—';
  try{
    return new Intl.DateTimeFormat(locale==='en'?'en-US':'ru-RU',{
      dateStyle:'short',
      timeStyle:'short'
    }).format(date);
  }catch{return date.toLocaleString()}
};

const identityStatusLabel=(value,en)=>{
  const status=String(value||'unknown');
  if(status==='active')return en?'Active':'Активно';
  if(status==='revoked')return en?'Revoked':'Отозвано';
  return status;
};

const identityTransportLabel=(mode,en)=>{
  if(mode==='nexus-session')return en?'Server session':'Server session';
  if(mode==='legacy-token')return en?'Legacy credential + server API':'Legacy credential + server API';
  return en?'Not authenticated':'Нет credential';
};

export function accountSnapshot(locale='ru'){
  const en=locale==='en';
  const identity=loadLocalIdentity();
  const cloud=cloudflareSyncSummary();
  const connected=Boolean(cloud.configured&&cloud.subjectId);
  const known=Boolean(identity.accountSubjectId);
  const displayName=connected
    ? String(cloud.displayName||'Akronikl')
    : en?'Local profile':'Локальный профиль';

  const state=connected?'cloud-linked':known?'cloud-unconfigured':'local-only';
  const status=connected
    ? (en?'Nexus Cloud connected':'Nexus Cloud подключён')
    : known
      ? (en?'Cloud access is not configured on this device':'Облако не настроено на этом устройстве')
      : (en?'Local-only mode':'Локальный режим');

  return{
    state,
    connected,
    displayName,
    avatar:initial(displayName),
    status,
    host:cloud.host||'—',
    subjectId:cloud.subjectId||identity.accountSubjectId||null,
    subjectShort:shortId(cloud.subjectId||identity.accountSubjectId),
    deviceId:identity.deviceId||null,
    deviceShort:shortId(identity.deviceId),
    accountState:identity.accountState||state
  };
}

export function accountChipMarkup(locale='ru'){
  const en=locale==='en';
  const a=accountSnapshot(locale);
  return `<div class="account-shell" id="accountShell">
    <button class="account-chip ${a.connected?'connected':'local'}" id="accountMenuButton" type="button"
      aria-haspopup="menu" aria-expanded="false" aria-controls="accountMenu">
      <span class="account-avatar">${esc(a.avatar)}</span>
      <span class="account-chip-copy">
        <strong>${esc(a.displayName)}</strong>
        <small><i></i>${esc(a.connected?(en?'Synced account':'Аккаунт подключён'):(en?'Local profile':'Локальный профиль'))}</small>
      </span>
      <span class="account-chevron" aria-hidden="true">⌄</span>
    </button>
    <div class="account-menu glass-panel" id="accountMenu" role="menu" aria-hidden="true">
      <div class="account-menu-head">
        <span class="account-avatar large">${esc(a.avatar)}</span>
        <div>
          <strong>${esc(a.displayName)}</strong>
          <small>${esc(a.status)}</small>
        </div>
      </div>
      <a role="menuitem" href="#view=account">${en?'Profile':'Профиль'}</a>
      <a role="menuitem" href="#view=account&tab=learning">${en?'My learning':'Моё обучение'}</a>
      <a role="menuitem" href="#view=project-studio">${en?'My projects':'Мои проекты'}</a>
      <a role="menuitem" href="#view=skills">${en?'Skill map':'Карта навыков'}</a>
      <a role="menuitem" href="#view=account&tab=devices">${en?'Devices & sessions':'Устройства и сессии'}</a>
      <a role="menuitem" href="#view=account&tab=security">${en?'Security':'Безопасность'}</a>
      <div class="account-menu-foot">
        <span>${a.connected?esc(a.host):(en?'Identity v2 foundation':'Фундамент Identity v2')}</span>
      </div>
    </div>
  </div>`;
}

export function accountHomeCardMarkup(locale='ru'){
  const en=locale==='en';
  const a=accountSnapshot(locale);
  return `<section class="account-home-card glass-panel">
    <div class="account-home-icon"><span class="account-avatar large">${esc(a.avatar)}</span></div>
    <div class="account-home-main">
      <span class="eyebrow">NEXUS ACCOUNT · FOUNDATION</span>
      <h2>${a.connected
        ? `${en?'Signed in as':'Вы авторизованы как'} ${esc(a.displayName)}`
        : (en?'Your Nexus identity starts here':'Ваш Nexus Account начинается здесь')}</h2>
      <p>${a.connected
        ? (en?'This device is linked to the current Nexus Cloud account. Project Sync can use the same account identity.':'Это устройство связано с текущим Nexus Cloud аккаунтом. Project Sync использует ту же учётную запись.')
        : (en?'Learning and projects continue locally. Connect Nexus Cloud today; federated sign-in and passkeys are the next Identity v2 layer.':'Обучение и проекты продолжают работать локально. Сейчас можно подключить Nexus Cloud; федеративный вход и passkeys будут следующим слоем Identity v2.')}</p>
      <div class="account-home-meta">
        <span class="${a.connected?'ok':''}">● ${esc(a.status)}</span>
        ${a.connected?`<span>${esc(a.host)}</span>`:''}
      </div>
    </div>
    <div class="account-home-actions">
      <a class="btn primary" href="#view=account">${en?'Open account':'Открыть аккаунт'}</a>
      ${a.connected?'':`<a class="btn" href="#view=project-studio">${en?'Connect Cloud':'Подключить Cloud'}</a>`}
    </div>
  </section>`;
}

const tabLink=(id,label,current)=>`<a href="#view=account&tab=${encodeURIComponent(id)}" class="${current===id?'active':''}">${esc(label)}</a>`;

export function accountPageMarkup(locale='ru',tab='overview'){
  const en=locale==='en';
  const a=accountSnapshot(locale);
  const current=['overview','learning','devices','security'].includes(tab)?tab:'overview';
  const nav=[
    ['overview',en?'Profile':'Профиль'],
    ['learning',en?'Learning':'Обучение'],
    ['devices',en?'Devices':'Устройства'],
    ['security',en?'Security':'Безопасность']
  ];

  const overview=`<div class="account-grid">
    <section class="account-panel glass-panel">
      <span class="eyebrow">PROFILE</span>
      <div class="account-profile-line">
        <span class="account-avatar xl">${esc(a.avatar)}</span>
        <div><h2>${esc(a.displayName)}</h2><p>${esc(a.status)}</p></div>
      </div>
      <dl class="account-dl">
        <div><dt>${en?'Account state':'Состояние'}</dt><dd>${esc(a.state)}</dd></div>
        <div><dt>${en?'Subject':'Subject'}</dt><dd>${esc(a.subjectShort)}</dd></div>
        <div><dt>${en?'Device':'Устройство'}</dt><dd>${esc(a.deviceShort)}</dd></div>
        <div><dt>Cloud</dt><dd>${a.connected?esc(a.host):'—'}</dd></div>
      </dl>
    </section>
    <section class="account-panel glass-panel">
      <span class="eyebrow">SIGN-IN METHODS</span>
      <h2>${en?'Authentication methods':'Способы входа'}</h2>
      <div class="identity-method-list">
        <div class="identity-method active"><b>☁</b><div><strong>Nexus Cloud Token</strong><span>${a.connected?(en?'Connected · alpha bridge':'Подключён · alpha bridge'):(en?'Not connected on this device':'Не подключён на этом устройстве')}</span></div><em>${a.connected?'ACTIVE':'ALPHA'}</em></div>
        <div class="identity-method planned"><b>Y</b><div><strong>Yandex ID</strong><span>${en?'Identity v2 provider adapter':'Адаптер Identity v2'}</span></div><em>PLANNED</em></div>
        <div class="identity-method planned"><b>G</b><div><strong>Google</strong><span>${en?'Federated sign-in':'Федеративный вход'}</span></div><em>PLANNED</em></div>
        <div class="identity-method planned"><b></b><div><strong>Apple</strong><span>${en?'Federated sign-in':'Федеративный вход'}</span></div><em>PLANNED</em></div>
        <div class="identity-method planned"><b>⌕</b><div><strong>${en?'Phone / OTP':'Телефон / OTP'}</strong><span>${en?'Requires SMS provider and anti-abuse layer':'Потребует SMS-провайдера и anti-abuse слоя'}</span></div><em>PLANNED</em></div>
        <div class="identity-method planned"><b>◆</b><div><strong>Passkey</strong><span>WebAuthn · Face ID / Touch ID / PIN</span></div><em>PLANNED</em></div>
      </div>
      <div class="account-actions">
        <a class="btn" href="#view=project-studio">${a.connected?(en?'Cloud Sync settings':'Настройки Cloud Sync'):(en?'Connect current Nexus Cloud':'Подключить текущий Nexus Cloud')}</a>
        ${a.connected?`<button class="btn danger" id="accountDisconnect">${en?'Disconnect on this device':'Отключить на этом устройстве'}</button>`:''}
      </div>
    </section>
  </div>`;

  const learning=`<section class="account-panel glass-panel account-wide">
    <span class="eyebrow">CLOUD PROFILE · NEXT</span>
    <h2>${en?'Learning continuity':'Непрерывность обучения'}</h2>
    <p>${en?'Current course progress remains local-first. The next phase will bind preferences, progress and Skill Map state to Nexus Account with offline-safe reconciliation.':'Сейчас прогресс курса остаётся local-first. Следующий этап свяжет настройки, прогресс и состояние Skill Map с Nexus Account с безопасным offline reconciliation.'}</p>
    <div class="account-roadmap">
      <span class="done">✓ ${en?'Visible account shell':'Видимый Account Shell'}</span>
      <span>${en?'Cloud profile':'Cloud Profile'}</span>
      <span>${en?'Cross-device progress':'Прогресс между устройствами'}</span>
      <span>${en?'Skill Graph state':'Состояние Skill Graph'}</span>
    </div>
  </section>`;

  const credential=identityV2CredentialState();
  const devices=`<div class="account-grid">
    <section class="account-panel glass-panel">
      <span class="eyebrow">CURRENT DEVICE</span>
      <h2>${en?'This device':'Это устройство'}</h2>
      <dl class="account-dl">
        <div><dt>ID</dt><dd>${esc(a.deviceShort)}</dd></div>
        <div><dt>${en?'State':'Состояние'}</dt><dd>${esc(a.accountState)}</dd></div>
        <div><dt>Cloud</dt><dd>${a.connected?(en?'connected':'подключён'):(en?'not configured':'не настроен')}</dd></div>
        <div><dt>${en?'Identity transport':'Identity transport'}</dt><dd>${esc(identityTransportLabel(credential.mode,en))}</dd></div>
      </dl>
    </section>
    <section class="account-panel glass-panel">
      <span class="eyebrow">SESSION MIGRATION</span>
      <h2>${en?'Safe migration state':'Безопасная миграция'}</h2>
      <p>${en
        ? 'Account Center can prefer a server session when one exists in sessionStorage and automatically fall back to the current legacy credential if that session expires. Cloud Sync itself remains unchanged for rollback.'
        : 'Account Center умеет предпочитать server session из sessionStorage и безопасно откатываться к текущему legacy credential, если session истекла. Сам Cloud Sync пока не меняется — это наш rollback.'}</p>
      <div class="identity-migration-state ${credential.mode==='nexus-session'?'ok':'warn'}">
        <strong>${esc(identityTransportLabel(credential.mode,en))}</strong>
        <span>${credential.rollbackAvailable
          ? (en?'Legacy rollback is available':'Legacy rollback доступен')
          : (en?'No legacy rollback credential':'Legacy rollback credential отсутствует')}</span>
      </div>
      <div class="identity-foundation-status" id="identitySessionFoundation">${en?'Checking server foundation…':'Проверяю серверный фундамент…'}</div>
    </section>
  </div>
  <section class="account-panel glass-panel account-wide identity-runtime-panel">
    <div class="identity-runtime-head">
      <div>
        <span class="eyebrow">IDENTITY v2 · LIVE DATA</span>
        <h2>${en?'Devices & server sessions':'Устройства и серверные сессии'}</h2>
        <p>${en
          ? 'The list is read from the production Identity v2 API. Raw credentials are never rendered.'
          : 'Список загружается из production Identity v2 API. Raw credentials никогда не выводятся в интерфейс.'}</p>
      </div>
      <button class="btn" type="button" id="identityRuntimeRefresh">${en?'Refresh':'Обновить'}</button>
    </div>
    <div id="identityDevicesSessions" class="identity-runtime-loading">${en?'Loading server identity state…':'Загружаю серверное состояние Identity…'}</div>
  </section>`;

  const security=`<div class="account-grid">
    <section class="account-panel glass-panel">
      <span class="eyebrow">CURRENT SECURITY</span>
      <h2>${en?'Current migration security':'Текущая безопасность миграции'}</h2>
      <ul class="account-security-list">
        <li class="ok">✓ ${en?'Server stores session secret hash, not raw nxs credential':'Сервер хранит hash session secret, а не raw nxs credential'}</li>
        <li class="ok">✓ ${en?'Server-side session revoke is LIVE verified':'Server-side revoke сессии LIVE подтверждён'}</li>
        <li class="ok">✓ ${en?'Devices / sessions API is available':'Devices / sessions API доступен'}</li>
        <li class="ok">✓ ${en?'Legacy Cloud Sync rollback remains available':'Legacy Cloud Sync rollback сохранён'}</li>
        <li class="warn">! ${en?'Normal browser sign-in still depends on a browser-readable legacy token':'Обычный вход браузера пока зависит от browser-readable legacy token'}</li>
      </ul>
    </section>
    <section class="account-panel glass-panel">
      <span class="eyebrow">IDENTITY v2</span>
      <h2>${en?'Security roadmap':'Дорожная карта безопасности'}</h2>
      <ul class="account-security-list">
        <li id="identityServerFoundation">${en?'Identity v2 server foundation: checking…':'Identity v2 server foundation: проверка…'}</li>
        <li class="ok">✓ ${en?'Revocable server sessions':'Отзываемые серверные сессии'}</li>
        <li class="ok">✓ ${en?'Devices / sessions management foundation':'Фундамент управления устройствами / сессиями'}</li>
        <li>${en?'First-party HttpOnly session':'First-party HttpOnly session'}</li>
        <li>Passkey / WebAuthn</li>
        <li>TOTP MFA + recovery codes</li>
        <li>Explicit account linking</li>
        <li>Step-up for sensitive/admin actions</li>
      </ul>
      <p class="account-muted">${en?'No session token, provider secret or recovery credential is rendered on this page.':'На этой странице не отображаются session token, provider secret или recovery credential.'}</p>
    </section>
  </div>`;

  const content=current==='overview'?overview:current==='learning'?learning:current==='devices'?devices:security;

  return `<section class="account-page">
    <div class="account-page-head glass-panel">
      <div>
        <span class="eyebrow">NEXUS ACCOUNT · v1 FOUNDATION</span>
        <h1>${en?'Your identity across Nexus':'Ваша учётная запись Nexus'}</h1>
        <p>${en?'Account Shell is now a first-class platform surface. This release bridges the existing Nexus Cloud account into the global UI without pretending that Identity v2 is already complete.':'Account Shell теперь полноценная часть платформы. Этот релиз выводит существующий Nexus Cloud аккаунт в глобальный интерфейс, не выдавая будущую Identity v2 за готовую реализацию.'}</p>
      </div>
      <div class="account-status-card ${a.connected?'connected':'local'}">
        <span class="account-avatar xl">${esc(a.avatar)}</span>
        <strong>${esc(a.displayName)}</strong>
        <small>${esc(a.status)}</small>
      </div>
    </div>
    <nav class="account-tabs">${nav.map(([id,label])=>tabLink(id,label,current)).join('')}</nav>
    ${content}
  </section>`;
}


function identityRuntimeErrorMessage(error,en){
  const code=String(error?.code||'IDENTITY_V2_ERROR');
  if(code==='CLOUD_NOT_CONFIGURED')return en?'Nexus Cloud is not configured on this device.':'Nexus Cloud не настроен на этом устройстве.';
  if(code==='IDENTITY_CREDENTIAL_MISSING')return en?'No account credential is available.':'Нет доступного account credential.';
  if(code==='INVALID_SESSION')return en?'The server session is no longer valid. Legacy fallback will be used when available.':'Server session больше недействительна. При наличии будет использован legacy fallback.';
  return error?.message||code;
}

function deviceRowMarkup(device,{locale='ru',currentDeviceId=null}={}){
  const en=locale==='en';
  const current=Boolean(currentDeviceId&&device.id===currentDeviceId);
  const active=device.status==='active';
  return `<article class="identity-runtime-item ${current?'current':''} ${active?'':'revoked'}">
    <div class="identity-runtime-item-main">
      <div class="identity-runtime-title">
        <strong>${esc(device.label||device.platform||(en?'Nexus device':'Устройство Nexus'))}</strong>
        ${current?`<span class="identity-badge current">${en?'THIS DEVICE':'ЭТО УСТРОЙСТВО'}</span>`:''}
        <span class="identity-badge ${active?'active':'revoked'}">${esc(identityStatusLabel(device.status,en))}</span>
      </div>
      <div class="identity-runtime-meta">
        <span>${esc(device.platform||'—')}</span>
        <span>ID ${esc(shortId(device.id))}</span>
        <span>${en?'Last seen':'Последняя активность'}: ${esc(formatIdentityTime(device.lastSeenAt,locale))}</span>
        <span>${en?'Active sessions':'Активные сессии'}: ${Number(device.activeSessions||0)}</span>
      </div>
    </div>
    <div class="identity-runtime-actions">
      ${active?`<button class="btn danger small" type="button"
        data-identity-action="revoke-device"
        data-device-id="${esc(device.id)}"
        data-current-device="${current?'1':'0'}">${current?(en?'Disconnect this device':'Отключить это устройство'):(en?'Revoke device':'Отключить устройство')}</button>`:''}
    </div>
  </article>`;
}

function sessionRowMarkup(session,{locale='ru'}={}){
  const en=locale==='en';
  const active=session.status==='active';
  const title=session.deviceLabel||session.devicePlatform||(en?'Nexus session':'Сессия Nexus');
  return `<article class="identity-runtime-item ${session.current?'current':''} ${active?'':'revoked'}">
    <div class="identity-runtime-item-main">
      <div class="identity-runtime-title">
        <strong>${esc(title)}</strong>
        ${session.current?`<span class="identity-badge current">${en?'CURRENT':'ТЕКУЩАЯ'}</span>`:''}
        <span class="identity-badge ${active?'active':'revoked'}">${esc(identityStatusLabel(session.status,en))}</span>
      </div>
      <div class="identity-runtime-meta">
        <span>${esc(session.authStrength||'—')}</span>
        <span>ID ${esc(shortId(session.id))}</span>
        <span>${en?'Last seen':'Последняя активность'}: ${esc(formatIdentityTime(session.lastSeenAt,locale))}</span>
        <span>${en?'Absolute expiry':'Absolute expiry'}: ${esc(formatIdentityTime(session.absoluteExpiresAt,locale))}</span>
      </div>
    </div>
    <div class="identity-runtime-actions">
      ${active?`<button class="btn danger small" type="button"
        data-identity-action="revoke-session"
        data-session-id="${esc(session.id)}"
        data-current-session="${session.current?'1':'0'}">${session.current?(en?'Sign out this session':'Завершить эту сессию'):(en?'End session':'Завершить сессию')}</button>`:''}
    </div>
  </article>`;
}

async function refreshIdentityDevicesSessions(locale='ru'){
  const root=document.querySelector('#identityDevicesSessions');
  if(!root)return;
  const en=locale==='en';
  const identity=loadLocalIdentity();

  root.className='identity-runtime-loading';
  root.textContent=en?'Loading server identity state…':'Загружаю серверное состояние Identity…';

  try{
    const [devicesResult,sessionsResult]=await Promise.all([
      listIdentityV2Devices(),
      listIdentityV2Sessions()
    ]);

    const devices=devicesResult.devices||[];
    const sessions=sessionsResult.sessions||[];
    const fallback=Boolean(devicesResult.legacyFallback||sessionsResult.legacyFallback);
    const mode=sessionsResult.credentialMode||devicesResult.credentialMode||identityV2CredentialState().mode;

    const activeSessions=sessions.filter(item=>item.status==='active').length;
    const currentSessions=sessions.filter(item=>item.current).length;

    root.className='identity-runtime';
    root.innerHTML=`<div class="identity-runtime-summary">
      <span class="identity-summary-chip ${mode==='nexus-session'?'ok':'warn'}">${esc(identityTransportLabel(mode,en))}</span>
      <span>${en?'Devices':'Устройства'}: <strong>${devices.length}</strong></span>
      <span>${en?'Active sessions':'Активные сессии'}: <strong>${activeSessions}</strong></span>
      <span>${en?'Current server session':'Текущая server session'}: <strong>${currentSessions||0}</strong></span>
      ${fallback?`<span class="identity-summary-chip warn">${en?'Stale session cleared · legacy rollback used':'Старая session очищена · использован legacy rollback'}</span>`:''}
    </div>
    <div class="identity-runtime-columns">
      <section>
        <h3>${en?'Server devices':'Серверные устройства'}</h3>
        <div class="identity-runtime-list">
          ${devices.length
            ? devices.map(device=>deviceRowMarkup(device,{locale,currentDeviceId:identity.deviceId})).join('')
            : `<div class="identity-empty">${en?'No server devices yet.':'Серверных устройств пока нет.'}</div>`}
        </div>
      </section>
      <section>
        <h3>${en?'Server sessions':'Серверные сессии'}</h3>
        <div class="identity-runtime-list">
          ${sessions.length
            ? sessions.map(session=>sessionRowMarkup(session,{locale})).join('')
            : `<div class="identity-empty">${en?'No server sessions yet.':'Серверных сессий пока нет.'}</div>`}
        </div>
      </section>
    </div>
    <div class="identity-runtime-note">${mode==='nexus-session'
      ? (en?'Account Center is using a revocable server session. Legacy Cloud remains available only as migration rollback.':'Account Center использует отзываемую server session. Legacy Cloud остаётся только как migration rollback.')
      : (en?'Account Center is controlling the Identity v2 server through the current legacy credential. This is the migration compatibility mode; Cloud Sync remains unchanged.':'Account Center управляет Identity v2 сервером через текущий legacy credential. Это режим миграционной совместимости; Cloud Sync остаётся без изменений.')}</div>`;

    root.onclick=async event=>{
      const button=event.target?.closest?.('[data-identity-action]');
      if(!button)return;
      const action=button.dataset.identityAction;
      button.disabled=true;

      try{
        if(action==='revoke-session'){
          const id=button.dataset.sessionId;
          const current=button.dataset.currentSession==='1';
          const ok=confirm(current
            ? (en?'End the current server session? Account Center will fall back to the legacy credential if available.':'Завершить текущую server session? Account Center откатится на legacy credential, если он доступен.')
            : (en?'End this server session?':'Завершить эту серверную сессию?'));
          if(!ok)return;
          await revokeIdentityV2Session(id,{current});
          if(current)clearIdentityV2SessionCredential();
          await refreshIdentityDevicesSessions(locale);
          return;
        }

        if(action==='revoke-device'){
          const id=button.dataset.deviceId;
          const currentDevice=button.dataset.currentDevice==='1';
          const ok=confirm(currentDevice
            ? (en?'Disconnect this device from server Identity? Any active server sessions on it will be revoked. Local projects and the legacy Cloud configuration will remain.':'Отключить это устройство от server Identity? Все активные server sessions на нём будут отозваны. Локальные проекты и legacy Cloud configuration останутся.')
            : (en?'Revoke this device and all active server sessions on it?':'Отключить это устройство и отозвать все активные server sessions на нём?'));
          if(!ok)return;
          await revokeIdentityV2Device(id,{currentDevice});
          if(currentDevice)clearIdentityV2SessionCredential();
          await refreshIdentityDevicesSessions(locale);
        }
      }catch(error){
        root.className='identity-runtime-error';
        root.innerHTML=`<strong>${en?'Identity action failed':'Ошибка Identity action'}</strong><span>${esc(identityRuntimeErrorMessage(error,en))}</span><button class="btn" type="button" id="identityRuntimeRetry">${en?'Retry':'Повторить'}</button>`;
        document.querySelector('#identityRuntimeRetry')?.addEventListener('click',()=>refreshIdentityDevicesSessions(locale));
      }finally{
        button.disabled=false;
      }
    };
  }catch(error){
    root.className='identity-runtime-error';
    root.innerHTML=`<strong>${en?'Could not load Devices & Sessions':'Не удалось загрузить Devices & Sessions'}</strong><span>${esc(identityRuntimeErrorMessage(error,en))}</span><button class="btn" type="button" id="identityRuntimeRetry">${en?'Retry':'Повторить'}</button>`;
    document.querySelector('#identityRuntimeRetry')?.addEventListener('click',()=>refreshIdentityDevicesSessions(locale));
  }
}

async function refreshIdentityFoundationStatus(locale='ru'){
  const en=locale==='en';
  const nodes=[
    document.querySelector('#identityServerFoundation'),
    document.querySelector('#identitySessionFoundation')
  ].filter(Boolean);
  if(!nodes.length)return;

  const apply=(text,kind='')=>{
    for(const node of nodes){
      node.textContent=text;
      node.classList.remove('ok','warn','bad');
      if(kind)node.classList.add(kind);
    }
  };

  try{
    const status=await identityV2Capabilities();
    if(status.sessionFoundation){
      const suffix=status.bridgeEnabled
        ? (en?' · migration bridge enabled':' · migration bridge включён')
        : (en?' · migration bridge disabled':' · migration bridge выключен');
      apply((en?'Server session foundation available':'Серверный фундамент сессий доступен')+suffix,'ok');
      return;
    }
    if(status.reachable){
      apply(en?'Worker reachable, Identity v2 session foundation is not deployed':'Worker доступен, Identity v2 session foundation ещё не развернут','warn');
      return;
    }
    apply(en?'Identity v2 server status is unavailable':'Статус Identity v2 сервера недоступен','warn');
  }catch{
    apply(en?'Identity v2 server check failed':'Не удалось проверить Identity v2 сервер','warn');
  }
}

export function bindAccountShell({locale='ru',onChanged=()=>{}}={}){
  const button=document.querySelector('#accountMenuButton');
  const menu=document.querySelector('#accountMenu');

  const close=()=>{
    menu?.classList.remove('open');
    menu?.setAttribute('aria-hidden','true');
    button?.setAttribute('aria-expanded','false');
  };

  const toggle=()=>{
    if(!menu||!button)return;
    const open=!menu.classList.contains('open');
    menu.classList.toggle('open',open);
    menu.setAttribute('aria-hidden',String(!open));
    button.setAttribute('aria-expanded',String(open));
  };

  button?.addEventListener('click',event=>{
    event.stopPropagation();
    toggle();
  });
  menu?.addEventListener('click',event=>event.stopPropagation());
  if(globalThis.__NEXUS_ACCOUNT_OUTSIDE_CLOSE__){
    document.removeEventListener('click',globalThis.__NEXUS_ACCOUNT_OUTSIDE_CLOSE__);
  }
  globalThis.__NEXUS_ACCOUNT_OUTSIDE_CLOSE__=close;
  document.addEventListener('click',close);
  document.querySelectorAll('#accountMenu a').forEach(a=>a.addEventListener('click',close));
  refreshIdentityFoundationStatus(locale);
  refreshIdentityDevicesSessions(locale);
  document.querySelector('#identityRuntimeRefresh')?.addEventListener('click',()=>refreshIdentityDevicesSessions(locale));

  document.querySelector('#accountDisconnect')?.addEventListener('click',()=>{
    const en=locale==='en';
    if(!confirm(en
      ? 'Disconnect Nexus Cloud on this device? Local projects will remain on this device.'
      : 'Отключить Nexus Cloud на этом устройстве? Локальные проекты останутся на устройстве.'))return;
    disconnectCloudAccount();
    onChanged();
  });
}
