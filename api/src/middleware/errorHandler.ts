import type { Request, Response, NextFunction } from 'express';
import { captureError } from '@ship/shared';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const captured = captureError(err, 'express', {
    method: req.method,
    path: req.path,
  });
  console.error(`[error-capture:${captured.source}]`, captured.message, captured.context ?? '');

  if (res.headersSent) {
    return;
  }

  const status =
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as { status: unknown }).status === 'number'
      ? (err as { status: number }).status
      : 500;

  const message =
    err instanceof Error ? err.message : 'Internal server error';

  res.status(status >= 400 && status < 600 ? status : 500).json({
    error: {
      code: status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
      message: status === 500 ? 'Internal server error' : message,
    },
  });
}
