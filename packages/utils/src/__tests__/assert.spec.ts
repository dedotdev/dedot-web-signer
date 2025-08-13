import { describe, expect, it } from 'vitest';
import { assert, assertFalse } from '../assert';
import { DedotSignerError, ErrorCode, StandardDedotSignerError } from '../errors';

describe('assert', () => {
  it('should throw DedotError', function () {
    expect(() => {
      assert(false, ErrorCode.InternalError);
    }).toThrowError(DedotSignerError);
  });

  it('should throw DedotSignerStandardError', function () {
    expect(() => {
      assert(false, 'Random message');
    }).toThrowError(StandardDedotSignerError);
  });

  it('should be silent', function () {
    assert(true, 'Nothing thrown out');
  });
});

describe('assertFalse', () => {
  it('should throw DedotError', function () {
    expect(() => {
      assertFalse(true, ErrorCode.InternalError);
    }).toThrowError(DedotSignerError);
  });

  it('should throw DedotSignerStandardError', function () {
    expect(() => {
      assertFalse(true, 'Random message');
    }).toThrowError(StandardDedotSignerError);
  });

  it('should be silent', function () {
    assertFalse(false, 'Nothing thrown out');
  });
});
