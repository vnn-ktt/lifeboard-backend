import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

/** Stable error envelope. Never expose stack traces or internal details to clients. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const isHttp = error instanceof HttpException;
    const statusCode = isHttp ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw: unknown = isHttp ? error.getResponse() : undefined;
    const details = raw !== null && typeof raw === 'object' && !Array.isArray(raw)
      ? raw as Record<string, unknown> : {};
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN',
      404: 'NOT_FOUND', 409: 'CONFLICT', 413: 'PAYLOAD_TOO_LARGE',
      422: 'UNPROCESSABLE_ENTITY', 428: 'PRECONDITION_REQUIRED',
      429: 'RATE_LIMITED', 503: 'SERVICE_UNAVAILABLE',
    };
    if (!isHttp) this.logger.error('Unhandled server exception', error instanceof Error ? error.stack : undefined);
    response.status(statusCode).json({
      ...(isHttp ? details : {}),
      statusCode,
      code: typeof details.code === 'string' ? details.code : (codes[statusCode] ?? 'INTERNAL_ERROR'),
      message: isHttp
        ? details.message ?? (typeof raw === 'string' ? raw : error.message)
        : 'Internal server error',
    });
  }
}
