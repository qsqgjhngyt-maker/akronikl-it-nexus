const VERSION = '0.1.7-alpha.2.2.1-d1';
const MAX_SNAPSHOT_BYTES = 1500000;

const ROLE_GRANTS = Object.freeze({
  owner: ['*'],
  maintainer: ['view', 'edit', 'create', 'delete', 'run', 'build', 'release', 'manage_members', 'audit_view'],
  developer: ['view', 'edit', 'create', 'delete', 'run', 'build', 'audit_view'],
  docs_editor: ['view', 'audit_view'],
  qa: ['view', 'run', 'build', 'audit_view'],
  viewer: ['view', 'audit_view']
});

const ROLE_SCOPED_GRANTS = Object.freeze({
  docs_editor: [{ scope: 'docs/**', actions: ['edit', 'create', 'delete'] }],
  qa: [{ scope: 'tests/**', actions: ['edit', 'create', 'delete'] }]
});

class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const now = () => new Date().toISOString();
const id = (prefix = 'id') => `${prefix}-${crypto.randomUUID()}`;
const clean = value => String(value ?? '').trim();

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers
    }
  });

function normalizeProjectPath(value = '/') {
  const raw = clean(value)
    .replaceAll('\\', '/')
    .replace(/^\/+/, '');

  return raw || '/';
}

function normalizeScope(value = '/**') {
  let scope = clean(value).replaceAll('\\', '/');

  if (!scope || scope === '*' || scope === '/**' || scope === '/') {
    return '/**';
  }

  scope = scope.replace(/^\/+/, '').replace(/\/+$/, '');
  return scope;
}

function scopeMatches(scopeValue, pathValue) {
  const scope = normalizeScope(scopeValue);
  const path = normalizeProjectPath(pathValue);

  if (scope === '/**') return true;

  if (scope.endsWith('/**')) {
    const prefix = scope.slice(0, -3).replace(/\/+$/, '');
    return path === prefix || path.startsWith(prefix + '/');
  }

  return path === scope;
}

function normalizeActions(actions) {
  const arr = Array.isArray(actions) ? actions : [actions];
  return arr.map(clean).filter(Boolean);
}

function policyApplies(policy, { subjectId, role, path, action }) {
  if (!policy || !scopeMatches(policy.scope, path)) return false;
  if (policy.subjectId && policy.subjectId !== subjectId) return false;
  if (policy.role && policy.role !== role) return false;

  const actions = normalizeActions(policy.actions || '*');

  return actions.includes('*') || actions.includes(action);
}

function evaluateProjectAccess(
  access,
  { subjectId, path = '/', action = 'view' } = {}
) {
  if (!subjectId) {
    return { allowed: false, reason: 'anonymous' };
  }

  const member = (access?.members || []).find(
    item =>
      item?.subjectId === subjectId &&
      item?.status !== 'revoked'
  );

  if (!member) {
    return { allowed: false, reason: 'not-a-member' };
  }

  const role = member.role || 'viewer';
  const grants = ROLE_GRANTS[role] || [];

  let allowed =
    grants.includes('*') ||
    grants.includes(action);

  if (!allowed) {
    allowed = (ROLE_SCOPED_GRANTS[role] || []).some(
      grant =>
        scopeMatches(grant.scope, path) &&
        (grant.actions || []).includes(action)
    );
  }

  const matched = (access?.policies || []).filter(
    policy =>
      policyApplies(policy, {
        subjectId,
        role,
        path,
        action
      })
  );

  if (matched.some(policy => policy.effect === 'deny')) {
    return {
      allowed: false,
      reason: 'explicit-deny',
      role
    };
  }

  if (matched.some(policy => policy.effect === 'allow')) {
    allowed = true;
  }

  return {
    allowed,
    reason: allowed
      ? 'role-or-policy-allow'
      : 'not-granted',
    role
  };
}

function corsHeaders(request, env) {
  const origin = request.headers.get('origin');
  const allowed = String(env.ALLOWED_ORIGIN || '').trim();

  if (!origin || !allowed || origin !== allowed) {
    return {};
  }

  const requestedHeaders =
    request.headers.get('access-control-request-headers');

  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods':
      'GET,PUT,POST,DELETE,OPTIONS',
    'access-control-allow-headers':
      requestedHeaders ||
      'authorization,content-type,if-match,x-nexus-bootstrap-secret',
    'access-control-max-age': '86400',
    vary: 'Origin'
  };
}

function withCors(response, request, env) {
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(
    corsHeaders(request, env)
  )) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function bodyJson(request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError(
      400,
      'INVALID_JSON',
      'Request body must be valid JSON.'
    );
  }
}

async function sha256(text) {
  const data = new TextEncoder().encode(
    String(text ?? '')
  );

  const digest = await crypto.subtle.digest(
    'SHA-256',
    data
  );

  return [...new Uint8Array(digest)]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return `nxk_${btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')}`;
}

async function sameSecret(a, b) {
  if (!a || !b) return false;

  const [ha, hb] = await Promise.all([
    sha256(a),
    sha256(b)
  ]);

  return ha === hb;
}

async function authenticate(request, env) {
  const mode = String(
    env.AUTH_MODE || 'disabled'
  );

  if (mode === 'disabled') {
    throw new ApiError(
      503,
      'AUTH_NOT_CONFIGURED',
      'Nexus account authentication is not configured yet.'
    );
  }

  if (mode === 'dev') {
    if (
      String(env.ENVIRONMENT || 'development') ===
      'production'
    ) {
      throw new ApiError(
        503,
        'DEV_AUTH_FORBIDDEN',
        'Development authentication is disabled in production.'
      );
    }

    const raw =
      request.headers.get('authorization') || '';

    const match =
      /^Bearer\s+dev:([A-Za-z0-9._:@-]{3,160})$/i.exec(
        raw
      );

    if (!match) {
      throw new ApiError(
        401,
        'UNAUTHORIZED',
        'Development token required.'
      );
    }

    return {
      subjectId: match[1],
      displayName: match[1],
      authMode: 'dev'
    };
  }

  if (mode === 'nexus-token') {
    const raw =
      request.headers.get('authorization') || '';

    const match =
      /^Bearer\s+(nxk_[A-Za-z0-9_-]{24,})$/i.exec(
        raw
      );

    if (!match) {
      throw new ApiError(
        401,
        'UNAUTHORIZED',
        'Nexus account token required.'
      );
    }

    const tokenHash = await sha256(match[1]);

    const row = await env.DB
      .prepare(`
        SELECT
          s.id AS subject_id,
          s.display_name,
          t.id AS token_id
        FROM account_tokens t
        JOIN account_subjects s
          ON s.id = t.subject_id
        WHERE
          t.token_hash = ?1
          AND t.status = 'active'
          AND s.status = 'active'
        LIMIT 1
      `)
      .bind(tokenHash)
      .first();

    if (!row) {
      throw new ApiError(
        401,
        'INVALID_TOKEN',
        'Nexus account token is invalid or revoked.'
      );
    }

    await env.DB
      .prepare(`
        UPDATE account_tokens
        SET last_used_at = ?1
        WHERE id = ?2
      `)
      .bind(now(), row.token_id)
      .run();

    return {
      subjectId: row.subject_id,
      displayName: row.display_name,
      tokenId: row.token_id,
      authMode: 'nexus-token'
    };
  }

  throw new ApiError(
    503,
    'AUTH_ADAPTER_REQUIRED',
    `Unsupported AUTH_MODE: ${mode}.`
  );
}

async function bootstrapAccount(request, env) {
  if (
    String(env.AUTH_MODE || 'disabled') !==
    'nexus-token'
  ) {
    throw new ApiError(
      409,
      'BOOTSTRAP_MODE_MISMATCH',
      'Set AUTH_MODE=nexus-token before account bootstrap.'
    );
  }

  const secret = String(
    env.BOOTSTRAP_SECRET || ''
  );

  if (!secret) {
    throw new ApiError(
      503,
      'BOOTSTRAP_SECRET_MISSING',
      'BOOTSTRAP_SECRET Worker secret is not configured.'
    );
  }

  const provided =
    request.headers.get(
      'x-nexus-bootstrap-secret'
    ) || '';

  if (!(await sameSecret(secret, provided))) {
    throw new ApiError(
      401,
      'BOOTSTRAP_UNAUTHORIZED',
      'Bootstrap secret is invalid.'
    );
  }

  const count = await env.DB
    .prepare(`
      SELECT COUNT(*) AS n
      FROM account_subjects
    `)
    .first();

  if (Number(count?.n || 0) > 0) {
    throw new ApiError(
      409,
      'BOOTSTRAP_CLOSED',
      'The first Nexus account already exists; bootstrap is closed.'
    );
  }

  const payload = await bodyJson(request);

  const displayName =
    String(
      payload?.displayName || 'Nexus Owner'
    )
      .trim()
      .slice(0, 120) ||
    'Nexus Owner';

  const subjectId = id('user');
  const tokenId = id('token');
  const token = randomToken();
  const tokenHash = await sha256(token);
  const stamp = now();

  await env.DB.batch([
    env.DB
      .prepare(`
        INSERT INTO account_subjects
        (
          id,
          display_name,
          status,
          created_at,
          updated_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5)
      `)
      .bind(
        subjectId,
        displayName,
        'active',
        stamp,
        stamp
      ),

    env.DB
      .prepare(`
        INSERT INTO account_tokens
        (
          id,
          subject_id,
          token_hash,
          label,
          status,
          created_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
      `)
      .bind(
        tokenId,
        subjectId,
        tokenHash,
        'bootstrap owner token',
        'active',
        stamp
      )
  ]);

  return {
    ok: true,
    subject: {
      id: subjectId,
      displayName
    },
    token,
    warning:
      'This token is shown once. Store it securely.'
  };
}

async function health(env) {
  let bootstrapOpen = null;
  let d1 = false;

  try {
    if (env.DB) {
      d1 = true;

      const row = await env.DB
        .prepare(`
          SELECT COUNT(*) AS n
          FROM account_subjects
        `)
        .first();

      bootstrapOpen =
        Number(row?.n || 0) === 0;
    }
  } catch {
    bootstrapOpen = null;
  }

  return {
    ok: true,
    service: 'akronikl-nexus-sync',
    version: VERSION,
    storage: 'd1-only',
    authMode: String(
      env.AUTH_MODE || 'disabled'
    ),
    d1,
    bootstrapOpen,
    maxSnapshotBytes:
      MAX_SNAPSHOT_BYTES
  };
}

async function me(actor) {
  return {
    subject: {
      id: actor.subjectId,
      displayName:
        actor.displayName ||
        actor.subjectId
    },
    authMode: actor.authMode
  };
}

async function projectRow(
  env,
  projectId
) {
  return env.DB
    .prepare(`
      SELECT *
      FROM projects
      WHERE id = ?1
      LIMIT 1
    `)
    .bind(projectId)
    .first();
}

async function projectAccess(
  env,
  project,
  subjectId
) {
  if (!project) return null;

  const member = await env.DB
    .prepare(`
      SELECT role, status
      FROM project_members
      WHERE
        project_id = ?1
        AND subject_id = ?2
      LIMIT 1
    `)
    .bind(
      project.id,
      subjectId
    )
    .first();

  const role =
    project.owner_subject_id === subjectId
      ? 'owner'
      : member?.status === 'active'
        ? member.role
        : null;

  if (!role) {
    return {
      members: [],
      policies: []
    };
  }

  const result = await env.DB
    .prepare(`
      SELECT
        subject_id,
        role,
        scope,
        effect,
        actions_json
      FROM project_access_policies
      WHERE project_id = ?1
    `)
    .bind(project.id)
    .all();

  const policies =
    result.results || [];

  return {
    members: [
      {
        subjectId,
        role,
        status: 'active'
      }
    ],
    policies: policies.map(
      policy => ({
        subjectId:
          policy.subject_id || null,
        role:
          policy.role || null,
        scope:
          policy.scope,
        effect:
          policy.effect,
        actions:
          JSON.parse(
            policy.actions_json || '[]'
          )
      })
    )
  };
}

async function requireAction(
  env,
  project,
  subjectId,
  action,
  path = '/'
) {
  const access =
    await projectAccess(
      env,
      project,
      subjectId
    );

  const verdict =
    evaluateProjectAccess(
      access,
      {
        subjectId,
        path,
        action
      }
    );

  if (!verdict.allowed) {
    throw new ApiError(
      403,
      'FORBIDDEN',
      `Action ${action} is not allowed for ${path}.`,
      {
        reason:
          verdict.reason
      }
    );
  }

  return verdict;
}

function fileMap(project) {
  return new Map(
    (
      project?.workspace?.files || []
    ).map(file => [
      String(file.path || ''),
      String(file.content ?? '')
    ])
  );
}

function changedFiles(
  beforeProject,
  afterProject
) {
  const before =
    fileMap(beforeProject);

  const after =
    fileMap(afterProject);

  const paths =
    new Set([
      ...before.keys(),
      ...after.keys()
    ]);

  const changes = [];

  for (const path of paths) {
    if (!before.has(path)) {
      changes.push({
        path,
        kind: 'create'
      });
    } else if (!after.has(path)) {
      changes.push({
        path,
        kind: 'delete'
      });
    } else if (
      before.get(path) !==
      after.get(path)
    ) {
      changes.push({
        path,
        kind: 'edit'
      });
    }
  }

  return changes;
}

async function snapshotForRevision(
  env,
  projectId,
  revision
) {
  const row = await env.DB
    .prepare(`
      SELECT
        snapshot_json,
        content_hash,
        size_bytes,
        created_at
      FROM project_snapshots
      WHERE
        project_id = ?1
        AND revision = ?2
      LIMIT 1
    `)
    .bind(
      projectId,
      revision
    )
    .first();

  if (!row) return null;

  return {
    project:
      JSON.parse(
        row.snapshot_json
      ),
    hash:
      row.content_hash,
    sizeBytes:
      Number(
        row.size_bytes || 0
      ),
    createdAt:
      row.created_at
  };
}

function auditStatement(
  env,
  {
    workspaceId,
    projectId,
    actorId,
    action,
    scope = '/',
    entityType = 'project',
    entityId = null,
    revisionBefore = null,
    revisionAfter = null,
    metadata = {}
  }
) {
  return env.DB
    .prepare(`
      INSERT INTO audit_events
      (
        id,
        workspace_id,
        project_id,
        actor_subject_id,
        action,
        scope,
        entity_type,
        entity_id,
        revision_before,
        revision_after,
        metadata_json,
        created_at
      )
      VALUES
      (
        ?1, ?2, ?3, ?4,
        ?5, ?6, ?7, ?8,
        ?9, ?10, ?11, ?12
      )
    `)
    .bind(
      id('audit'),
      workspaceId,
      projectId,
      actorId,
      action,
      scope,
      entityType,
      entityId,
      revisionBefore,
      revisionAfter,
      JSON.stringify(metadata),
      now()
    );
}

async function listProjects(
  env,
  actor
) {
  const result = await env.DB
    .prepare(`
      SELECT DISTINCT p.*
      FROM projects p
      LEFT JOIN project_members pm
        ON pm.project_id = p.id
        AND pm.subject_id = ?1
        AND pm.status = 'active'
      WHERE
        p.owner_subject_id = ?1
        OR pm.subject_id = ?1
      ORDER BY
        p.updated_at DESC
    `)
    .bind(actor.subjectId)
    .all();

  return {
    projects:
      (result.results || [])
        .map(project => ({
          id:
            project.id,
          workspaceId:
            project.workspace_id,
          title:
            project.title,
          languageId:
            project.language_id,
          revision:
            Number(
              project.current_revision
            ),
          updatedAt:
            project.updated_at
        }))
  };
}

async function getProject(
  env,
  actor,
  projectId
) {
  const project =
    await projectRow(
      env,
      projectId
    );

  if (!project) {
    throw new ApiError(
      404,
      'PROJECT_NOT_FOUND',
      'Project not found.'
    );
  }

  await requireAction(
    env,
    project,
    actor.subjectId,
    'view',
    '/'
  );

  const snapshot =
    await snapshotForRevision(
      env,
      project.id,
      Number(
        project.current_revision
      )
    );

  if (!snapshot) {
    throw new ApiError(
      500,
      'SNAPSHOT_MISSING',
      'Project metadata points to a missing D1 snapshot.'
    );
  }

  return {
    project:
      snapshot.project,
    meta: {
      id:
        project.id,
      revision:
        Number(
          project.current_revision
        ),
      hash:
        snapshot.hash,
      updatedAt:
        project.updated_at,
      sizeBytes:
        snapshot.sizeBytes
    }
  };
}

async function ensureWorkspaceForCreate(
  env,
  workspaceId,
  ownerId,
  incoming,
  stamp
) {
  const existing =
    await env.DB
      .prepare(`
        SELECT
          id,
          kind,
          owner_subject_id
        FROM workspaces
        WHERE id = ?1
        LIMIT 1
      `)
      .bind(workspaceId)
      .first();

  if (!existing) {
    return {
      statements: [
        env.DB
          .prepare(`
            INSERT INTO workspaces
            (
              id,
              kind,
              name,
              owner_subject_id,
              created_at,
              updated_at
            )
            VALUES
            (?1, ?2, ?3, ?4, ?5, ?6)
          `)
          .bind(
            workspaceId,
            incoming.access
              ?.workspaceKind === 'team'
              ? 'team'
              : 'personal',
            incoming.workspaceName ||
              'Nexus Workspace',
            ownerId,
            stamp,
            stamp
          ),

        env.DB
          .prepare(`
            INSERT INTO workspace_members
            (
              workspace_id,
              subject_id,
              role,
              status,
              joined_at,
              created_at
            )
            VALUES
            (?1, ?2, ?3, ?4, ?5, ?6)
          `)
          .bind(
            workspaceId,
            ownerId,
            'owner',
            'active',
            stamp,
            stamp
          )
      ]
    };
  }

  if (
    existing.owner_subject_id ===
    ownerId
  ) {
    return {
      statements: []
    };
  }

  const member =
    await env.DB
      .prepare(`
        SELECT role, status
        FROM workspace_members
        WHERE
          workspace_id = ?1
          AND subject_id = ?2
          AND status = 'active'
        LIMIT 1
      `)
      .bind(
        workspaceId,
        ownerId
      )
      .first();

  if (!member) {
    throw new ApiError(
      403,
      'WORKSPACE_FORBIDDEN',
      'Authenticated user is not a member of this workspace.'
    );
  }

  return {
    statements: []
  };
}

async function putProject(
  env,
  actor,
  projectId,
  payload
) {
  const incoming =
    payload?.project;

  if (
    !incoming ||
    incoming.id !== projectId
  ) {
    throw new ApiError(
      400,
      'PROJECT_ID_MISMATCH',
      'Body project.id must match the URL project id.'
    );
  }

  const serialized =
    JSON.stringify(incoming);

  const sizeBytes =
    new TextEncoder()
      .encode(serialized)
      .byteLength;

  if (
    sizeBytes >
    MAX_SNAPSHOT_BYTES
  ) {
    throw new ApiError(
      413,
      'SNAPSHOT_TOO_LARGE',
      `D1-only snapshot exceeds ${MAX_SNAPSHOT_BYTES} bytes.`,
      {
        sizeBytes,
        maxSnapshotBytes:
          MAX_SNAPSHOT_BYTES
      }
    );
  }

  const existing =
    await projectRow(
      env,
      projectId
    );

  const baseRevision =
    payload?.baseRevision == null
      ? null
      : Number(
          payload.baseRevision
        );

  let workspaceId =
    incoming.access
      ?.workspaceId ||
    incoming.workspaceId;

  let ownerId =
    incoming.access
      ?.ownerId ||
    actor.subjectId;

  let previousSnapshot = null;
  let fileChanges = [];

  if (existing) {
    await requireAction(
      env,
      existing,
      actor.subjectId,
      'view',
      '/'
    );

    workspaceId =
      existing.workspace_id;

    ownerId =
      existing.owner_subject_id;

    if (
      baseRevision !==
      Number(
        existing.current_revision
      )
    ) {
      throw new ApiError(
        409,
        'REVISION_CONFLICT',
        'Cloud project changed since this client base revision.',
        {
          serverRevision:
            Number(
              existing.current_revision
            ),
          baseRevision
        }
      );
    }

    const previous =
      await snapshotForRevision(
        env,
        projectId,
        Number(
          existing.current_revision
        )
      );

    previousSnapshot =
      previous?.project || null;

    fileChanges =
      changedFiles(
        previousSnapshot,
        incoming
      );

    for (
      const change
      of fileChanges
    ) {
      await requireAction(
        env,
        existing,
        actor.subjectId,
        change.kind,
        change.path
      );
    }

    const metadataChanged =
      !previousSnapshot ||
      String(
        previousSnapshot.title || ''
      ) !==
        String(
          incoming.title || ''
        ) ||
      String(
        previousSnapshot.languageId ||
          ''
      ) !==
        String(
          incoming.languageId ||
            ''
        );

    if (metadataChanged) {
      await requireAction(
        env,
        existing,
        actor.subjectId,
        'edit',
        '/'
      );
    }
  } else {
    if (
      ownerId !==
      actor.subjectId
    ) {
      throw new ApiError(
        403,
        'OWNER_MISMATCH',
        'A new project can only be created for the authenticated owner.'
      );
    }

    if (!workspaceId) {
      throw new ApiError(
        400,
        'WORKSPACE_REQUIRED',
        'workspaceId is required for a new project.'
      );
    }
  }

  const revision =
    (
      existing
        ? Number(
            existing.current_revision
          )
        : 0
    ) + 1;

  const stamp = now();
  const hash =
    await sha256(serialized);

  const locator =
    `d1:${projectId}:${revision}`;

  const statements = [];

  if (!existing) {
    const workspace =
      await ensureWorkspaceForCreate(
        env,
        workspaceId,
        ownerId,
        incoming,
        stamp
      );

    statements.push(
      ...workspace.statements
    );

    statements.push(
      env.DB
        .prepare(`
          INSERT INTO projects
          (
            id,
            workspace_id,
            owner_subject_id,
            title,
            language_id,
            current_revision,
            latest_r2_key,
            latest_hash,
            created_at,
            updated_at
          )
          VALUES
          (
            ?1, ?2, ?3, ?4, ?5,
            ?6, ?7, ?8, ?9, ?10
          )
        `)
        .bind(
          projectId,
          workspaceId,
          ownerId,
          String(
            incoming.title ||
              projectId
          ),
          String(
            incoming.languageId ||
              'cpp'
          ),
          revision,
          locator,
          hash,
          stamp,
          stamp
        ),

      env.DB
        .prepare(`
          INSERT INTO project_members
          (
            project_id,
            subject_id,
            role,
            status,
            joined_at,
            created_at
          )
          VALUES
          (?1, ?2, ?3, ?4, ?5, ?6)
        `)
        .bind(
          projectId,
          ownerId,
          'owner',
          'active',
          stamp,
          stamp
        )
    );
  } else {
    statements.push(
      env.DB
        .prepare(`
          UPDATE projects
          SET
            title = ?1,
            language_id = ?2,
            current_revision = ?3,
            latest_r2_key = ?4,
            latest_hash = ?5,
            updated_at = ?6
          WHERE
            id = ?7
            AND workspace_id = ?8
        `)
        .bind(
          String(
            incoming.title ||
              projectId
          ),
          String(
            incoming.languageId ||
              'cpp'
          ),
          revision,
          locator,
          hash,
          stamp,
          projectId,
          workspaceId
        )
    );
  }

  const snapshotId =
    id('snap');

  statements.push(
    env.DB
      .prepare(`
        INSERT INTO project_snapshots
        (
          id,
          project_id,
          revision,
          snapshot_json,
          content_hash,
          size_bytes,
          created_by,
          created_at
        )
        VALUES
        (
          ?1, ?2, ?3, ?4,
          ?5, ?6, ?7, ?8
        )
      `)
      .bind(
        snapshotId,
        projectId,
        revision,
        serialized,
        hash,
        sizeBytes,
        actor.subjectId,
        stamp
      ),

    env.DB
      .prepare(`
        INSERT INTO project_revisions
        (
          id,
          project_id,
          revision,
          r2_key,
          content_hash,
          created_by,
          created_at
        )
        VALUES
        (
          ?1, ?2, ?3, ?4,
          ?5, ?6, ?7
        )
      `)
      .bind(
        id('rev'),
        projectId,
        revision,
        locator,
        hash,
        actor.subjectId,
        stamp
      ),

    auditStatement(
      env,
      {
        workspaceId,
        projectId,
        actorId:
          actor.subjectId,
        action:
          existing
            ? 'project.synced'
            : 'project.cloud-created',
        revisionBefore:
          existing
            ? Number(
                existing.current_revision
              )
            : null,
        revisionAfter:
          revision,
        metadata: {
          storage: 'd1',
          hash,
          sizeBytes,
          changedFiles:
            fileChanges,
          changeCount:
            fileChanges.length
        }
      }
    )
  );

  await env.DB.batch(
    statements
  );

  return {
    ok: true,
    projectId,
    revision,
    hash,
    sizeBytes,
    storage: 'd1-only',
    updatedAt: stamp
  };
}

async function auditProject(
  env,
  actor,
  projectId
) {
  const project =
    await projectRow(
      env,
      projectId
    );

  if (!project) {
    throw new ApiError(
      404,
      'PROJECT_NOT_FOUND',
      'Project not found.'
    );
  }

  await requireAction(
    env,
    project,
    actor.subjectId,
    'audit_view',
    '/'
  );

  const result =
    await env.DB
      .prepare(`
        SELECT
          id,
          actor_subject_id,
          action,
          scope,
          entity_type,
          entity_id,
          revision_before,
          revision_after,
          metadata_json,
          created_at
        FROM audit_events
        WHERE project_id = ?1
        ORDER BY created_at DESC
        LIMIT 200
      `)
      .bind(projectId)
      .all();

  return {
    events:
      (result.results || [])
        .map(event => ({
          ...event,
          metadata:
            JSON.parse(
              event.metadata_json ||
                '{}'
            ),
          metadata_json:
            undefined
        }))
  };
}

async function route(
  request,
  env
) {
  const url =
    new URL(request.url);

  const path =
    url.pathname
      .replace(/\/+$/, '') ||
    '/';

  if (
    request.method === 'OPTIONS'
  ) {
    return new Response(
      null,
      {
        status: 204,
        headers:
          corsHeaders(
            request,
            env
          )
      }
    );
  }

  if (
    path === '/' ||
    path === '/api/v1/health'
  ) {
    return json(
      await health(env)
    );
  }

  if (
    path ===
      '/api/v1/bootstrap' &&
    request.method === 'POST'
  ) {
    return json(
      await bootstrapAccount(
        request,
        env
      ),
      201
    );
  }

  if (
    !path.startsWith(
      '/api/v1/'
    )
  ) {
    throw new ApiError(
      404,
      'NOT_FOUND',
      'Route not found.'
    );
  }

  const actor =
    await authenticate(
      request,
      env
    );

  if (
    path === '/api/v1/me' &&
    request.method === 'GET'
  ) {
    return json(
      await me(actor)
    );
  }

  if (
    path ===
      '/api/v1/projects' &&
    request.method === 'GET'
  ) {
    return json(
      await listProjects(
        env,
        actor
      )
    );
  }

  const projectMatch =
    /^\/api\/v1\/projects\/([^/]+)$/.exec(
      path
    );

  if (
    projectMatch &&
    request.method === 'GET'
  ) {
    return json(
      await getProject(
        env,
        actor,
        decodeURIComponent(
          projectMatch[1]
        )
      )
    );
  }

  if (
    projectMatch &&
    request.method === 'PUT'
  ) {
    return json(
      await putProject(
        env,
        actor,
        decodeURIComponent(
          projectMatch[1]
        ),
        await bodyJson(request)
      )
    );
  }

  const auditMatch =
    /^\/api\/v1\/projects\/([^/]+)\/audit$/.exec(
      path
    );

  if (
    auditMatch &&
    request.method === 'GET'
  ) {
    return json(
      await auditProject(
        env,
        actor,
        decodeURIComponent(
          auditMatch[1]
        )
      )
    );
  }

  throw new ApiError(
    404,
    'NOT_FOUND',
    'Route not found.'
  );
}

export default {
  async fetch(request, env) {
    try {
      return withCors(
        await route(
          request,
          env
        ),
        request,
        env
      );
    } catch (error) {
      const status =
        Number(
          error?.status || 500
        );

      const body = {
        error: {
          code:
            error?.code ||
            'INTERNAL_ERROR',
          message:
            error?.message ||
            'Internal error',
          ...(error?.details
            ? {
                details:
                  error.details
              }
            : {})
        }
      };

      return withCors(
        json(
          body,
          status
        ),
        request,
        env
      );
    }
  }
};
