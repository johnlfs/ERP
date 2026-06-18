import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

type ErrorResponseBody = {
  status: 'error';
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  path: string;
  timestamp: string;
};

type HttpResponse = {
  status: (code: number) => {
    json: (body: ErrorResponseBody) => void;
  };
};

type HttpRequest = {
  url?: string;
};

function toErrorCode(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toUpperCase();
}

function mapPrismaKnownError(error: Prisma.PrismaClientKnownRequestError) {
  switch (error.code) {
    case 'P2002':
      return {
        statusCode: HttpStatus.CONFLICT,
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
        message: 'Registro duplicado para campo com restrição única',
        details: {
          target: error.meta?.target
        }
      };

    case 'P2003':
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
        message: 'Referência inválida para outro registro',
        details: {
          fieldName: error.meta?.field_name
        }
      };

    case 'P2025':
      return {
        statusCode: HttpStatus.NOT_FOUND,
        code: 'RECORD_NOT_FOUND',
        message: 'Registro não encontrado',
        details: error.meta
      };

    default:
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: `PRISMA_${error.code}`,
        message: 'Erro de banco de dados',
        details:
          process.env.NODE_ENV === 'development'
            ? {
                prismaCode: error.code,
                meta: error.meta
              }
            : undefined
      };
  }
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<HttpResponse>();
    const request = ctx.getRequest<HttpRequest>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'Erro interno no servidor';
    let details: unknown;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mappedError = mapPrismaKnownError(exception);

      statusCode = mappedError.statusCode;
      code = mappedError.code;
      message = mappedError.message;
      details = mappedError.details;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();

      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code =
          statusCode === HttpStatus.NOT_FOUND
            ? 'NOT_FOUND'
            : toErrorCode(exceptionResponse || HttpStatus[statusCode]);
      } else if (
        exceptionResponse &&
        typeof exceptionResponse === 'object'
      ) {
        const payload = exceptionResponse as {
          code?: string;
          error?: string;
          message?: string | string[];
          details?: unknown;
        };

        if (Array.isArray(payload.message)) {
          message = payload.message.join('; ');
          details = payload.message;
        } else if (typeof payload.message === 'string') {
          message = payload.message;
        } else {
          message = payload.error ?? 'Erro na requisição';
        }

        code =
          payload.code ??
          (statusCode === HttpStatus.NOT_FOUND
            ? 'NOT_FOUND'
            : toErrorCode(payload.error ?? message));

        details = payload.details ?? details;
      }
    } else if (exception instanceof Error) {
      message =
        process.env.NODE_ENV === 'development'
          ? exception.message || message
          : message;

      details =
        process.env.NODE_ENV === 'development'
          ? {
              name: exception.name,
              stack: exception.stack
            }
          : undefined;
    }

    response.status(statusCode).json({
      status: 'error',
      error: {
        code,
        message,
        ...(details ? { details } : {})
      },
      path: request.url ?? '',
      timestamp: new Date().toISOString()
    });
  }
}
