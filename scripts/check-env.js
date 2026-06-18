const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function isHttpUrl(value) {
  return /^https?:\/\/.+/i.test(value);
}

function isPositiveInteger(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

const requiredNow = [
  'NODE_ENV',
  'API_PORT',
  'API_URL',
  'WEB_URL',
  'PDV_URL',
  'DATABASE_URL',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'REDIS_PASSWORD'
];

const authSoon = [
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'APP_ENCRYPTION_KEY',
  'BCRYPT_SALT_ROUNDS'
];

const env = parseEnvFile(envPath);
const envExample = parseEnvFile(envExamplePath);

const errors = [];
const warnings = [];

if (!env) {
  errors.push('Arquivo .env não encontrado na raiz do projeto.');
}

if (!envExample) {
  errors.push('Arquivo .env.example não encontrado na raiz do projeto.');
}

if (env) {
  for (const key of requiredNow) {
    if (!env[key]) {
      errors.push(`Variável obrigatória ausente no .env: ${key}`);
    }
  }

  if (env.API_PORT && !isPositiveInteger(env.API_PORT)) {
    errors.push('API_PORT deve ser um número inteiro positivo.');
  }

  for (const key of ['API_URL', 'WEB_URL', 'PDV_URL']) {
    if (env[key] && !isHttpUrl(env[key])) {
      errors.push(`${key} deve começar com http:// ou https://`);
    }
  }

  if (env.DATABASE_URL && !env.DATABASE_URL.startsWith('postgresql://')) {
    errors.push('DATABASE_URL deve começar com postgresql://');
  }

  for (const key of authSoon) {
    if (!env[key]) {
      warnings.push(`Variável de Auth ainda não configurada no .env: ${key}`);
    }
  }

  if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET está definido, mas deveria ter pelo menos 32 caracteres.');
  }

  if (env.APP_ENCRYPTION_KEY && env.APP_ENCRYPTION_KEY.length < 32) {
    warnings.push('APP_ENCRYPTION_KEY está definida, mas deveria ter pelo menos 32 caracteres.');
  }

  if (
    env.BCRYPT_SALT_ROUNDS &&
    (!isPositiveInteger(env.BCRYPT_SALT_ROUNDS) || Number(env.BCRYPT_SALT_ROUNDS) < 10)
  ) {
    warnings.push('BCRYPT_SALT_ROUNDS deveria ser um número inteiro maior ou igual a 10.');
  }
}

if (envExample) {
  for (const key of [...requiredNow, ...authSoon]) {
    if (!(key in envExample)) {
      warnings.push(`Variável ausente no .env.example: ${key}`);
    }
  }
}

console.log('== RetailFlow Pro Env Check ==');

if (errors.length === 0) {
  console.log('Status: OK');
} else {
  console.log('Status: ERROR');
}

if (warnings.length > 0) {
  console.log('');
  console.log('Warnings:');
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (errors.length > 0) {
  console.log('');
  console.log('Errors:');
  for (const error of errors) {
    console.log(`- ${error}`);
  }

  process.exit(1);
}

console.log('');
console.log('Ambiente mínimo atual validado.');
console.log('As variáveis de Auth ainda são aviso até a Fase 1.16.');
