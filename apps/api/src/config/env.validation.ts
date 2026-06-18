type RuntimeEnv = {
  NODE_ENV: 'development' | 'test' | 'production';
  DATABASE_URL: string;
  REDIS_URL?: string;
  WEB_URL?: string;
  PDV_URL?: string;
  API_URL?: string;
  API_PORT: number;
  JWT_SECRET?: string;
  APP_ENCRYPTION_KEY?: string;
};

const ALLOWED_NODE_ENVS = ['development', 'test', 'production'] as const;

function assertRequiredString(
  env: Record<string, unknown>,
  key: string
): string {
  const value = env[key];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Variável de ambiente obrigatória ausente ou vazia: ${key}`);
  }

  return value.trim();
}

function assertOptionalString(
  env: Record<string, unknown>,
  key: string
): string | undefined {
  const value = env[key];

  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`Variável de ambiente inválida: ${key}`);
  }

  return value.trim();
}

function assertOptionalUrl(
  env: Record<string, unknown>,
  key: string
): string | undefined {
  const value = assertOptionalString(env, key);

  if (!value) {
    return undefined;
  }

  try {
    new URL(value);
    return value;
  } catch {
    throw new Error(`Variável de ambiente ${key} deve ser uma URL válida`);
  }
}

function parseApiPort(env: Record<string, unknown>): number {
  const rawValue = env.API_PORT;

  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return 53001;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error('Variável de ambiente API_PORT deve ser uma porta válida');
  }

  return parsed;
}

function validateNodeEnv(env: Record<string, unknown>): RuntimeEnv['NODE_ENV'] {
  const value = env.NODE_ENV;

  if (value === undefined || value === null || value === '') {
    return 'development';
  }

  if (
    typeof value !== 'string' ||
    !ALLOWED_NODE_ENVS.includes(value as RuntimeEnv['NODE_ENV'])
  ) {
    throw new Error(
      `NODE_ENV inválido. Use: ${ALLOWED_NODE_ENVS.join(', ')}`
    );
  }

  return value as RuntimeEnv['NODE_ENV'];
}

export function validateEnv(
  env: Record<string, unknown>
): RuntimeEnv & Record<string, unknown> {
  const nodeEnv = validateNodeEnv(env);

  const validatedEnv: RuntimeEnv = {
    NODE_ENV: nodeEnv,
    DATABASE_URL: assertRequiredString(env, 'DATABASE_URL'),
    REDIS_URL: assertOptionalString(env, 'REDIS_URL'),
    WEB_URL: assertOptionalUrl(env, 'WEB_URL'),
    PDV_URL: assertOptionalUrl(env, 'PDV_URL'),
    API_URL: assertOptionalUrl(env, 'API_URL'),
    API_PORT: parseApiPort(env),
    JWT_SECRET: assertOptionalString(env, 'JWT_SECRET'),
    APP_ENCRYPTION_KEY: assertOptionalString(env, 'APP_ENCRYPTION_KEY')
  };

  if (nodeEnv === 'production') {
    if (!validatedEnv.JWT_SECRET || validatedEnv.JWT_SECRET.length < 32) {
      throw new Error(
        'JWT_SECRET deve ter pelo menos 32 caracteres em produção'
      );
    }

    if (
      !validatedEnv.APP_ENCRYPTION_KEY ||
      validatedEnv.APP_ENCRYPTION_KEY.length < 32
    ) {
      throw new Error(
        'APP_ENCRYPTION_KEY deve ter pelo menos 32 caracteres em produção'
      );
    }
  }

  return {
    ...env,
    ...validatedEnv
  };
}
