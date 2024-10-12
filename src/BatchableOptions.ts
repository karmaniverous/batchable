/**
 * Options for EntityManager client methods that support batch operations.
 */
export interface BatchableOptions {
  /** Batch size. */
  batchSize: number;

  /** Delay increment in ms for retry operations. Doubles on each retry. */
  delayIncrement: number;

  /** Max retries for retry operations. */
  maxRetries: number;

  /** Throttle for parallel operations. */
  throttle: number;
}
