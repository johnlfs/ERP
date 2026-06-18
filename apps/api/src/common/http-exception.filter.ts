import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from '@nestjs/common';

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

function toErrorCode(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toUpperCase();
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<{
      status: (code: number) => {
        json: (body: ErrorResponseBody) => void;
      };
    }>();

    const request = ctx.getRequest<{
      url?: string;
    }>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'Erro interno no servidor';
    let details: unknown;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();

      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = toErrorCode(exceptionResponse || HttpStatus[statusCode]);
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

        code = payload.code ?? toErrorCode(payload.error ?? message);
        details = payload.details ?? details;
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
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
