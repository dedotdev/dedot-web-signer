import { DedotSignerError, ErrorCode, ErrorCodes } from './errors';

export function assert(condition: unknown, message?: string) {
  if (condition) {
    return;
  }

  if (message && ErrorCodes.includes(message)) {
    throw new DedotSignerError(message as ErrorCode);
  } else {
    throw new DedotSignerError(ErrorCode.InternalError, message);
  }
}

/**
 * Throw out error if condition is undefined, false, null, '' or 0
 *
 * @param condition
 * @param message
 */
export function assertFalse(condition: unknown, message?: string) {
  assert(!condition, message);
}
