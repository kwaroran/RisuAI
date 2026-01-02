// PromisedWorker.ts

type PromiseExecutor<T> = {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
};
/**
 * WorkerPayload represents the structure of messages exchanged
 * between the main thread and the worker.
 */
export type WorkerPayload<T> = {
  id: number;
  payload: T;
};
/**
 * PromisedWorker makes worker communication easier by wrapping messages in Promises.
 * Each message sent to the worker is assigned a unique ID, and the corresponding
 *
 * Req: the type of the request payload sent to the worker.
 * Res: the type of the expected response from the worker.
 *
 * @example
 * // main thread
 * const worker = new PromisedWorker<MyRequestType, MyResponseType>(
 *     new URL('worker.js', import.meta.url)
 * );
 * const result = await worker.postMessage({ someData: 123 })
 *
 * @example
 * //@ts-check
 * // (worker thread)
 * self.onmessage = async (event) => {
 *     // Made a space for comment syntax and `@` letter, but you should remove the space when using.
 *     / ** @ typedef {import("your type path").MyRequestType} RequestType
 *      *  @ typedef {import("your type path").MyResponseType} ResponseType
 *      *  @ typedef {import("src/ts/process/workerManger").WorkerPayload<RequestType>} WorkerRequest
 *      * @ typedef {import("src/ts/process/workerManger").WorkerPayload<ResponseType>} WorkerResponse
 *      *  @ type {WorkerRequest}
 *     * /
 *     const data = event.data
 *     //your processing logic here
 *     postMessage(
 *        / ** @ type {WorkerResponse} * /
 *        {
 *         id: data.id,
 *         payload: somethingProcessed
 *     });
 * }
 * @template Req - Type of the request payload.
 * @template Res - Type of the response payload.
 */
class PromisedWorker<Req = any, Res = any> {
  private worker: Worker;
  private messageId = 0;
  private pendingPromises: Map<number, PromiseExecutor<Res>> = new Map();

  constructor(workerPath: string | URL, options?: WorkerOptions) {
    this.worker = new Worker(workerPath, options);
    this.setupListeners();
  }

  /**
   * Sends a message to the worker and returns a Promise that resolves
   * with the worker's response.
   * @param payload
   * @param ttl - Time to live in milliseconds. If the worker does not respond within this time, the promise will be rejected.
   * @returns
   */
  public postMessage(payload: Req, ttl?: number): Promise<Res> {
    const id = this.messageId++;
    return new Promise<Res>((resolve, reject) => {
      // Ready to track this promise with its ID
      this.pendingPromises.set(id, { resolve, reject });

      // Send the message to the worker
      this.worker.postMessage({ id, payload } satisfies WorkerPayload<Req>);
      if (ttl) {
        setTimeout(() => {
          if (this.pendingPromises.has(id)) {
            this.pendingPromises
              .get(id)
              ?.reject(new Error("Worker response timed out"));
            this.pendingPromises.delete(id);
          }
        }, ttl);
      }
    });
  }

  /**
   * Halts the worker's operation.
   */
  public terminate(): void {
    this.pendingPromises.forEach((promise) => {
      promise.reject(new Error("Worker was terminated."));
    });
    this.pendingPromises.clear(); 
    this.worker.terminate();
  }

  /**
   * Sets up listeners for messages from the worker.
   * When a message is received, it checks if there's a pending promise
   * for the given message ID and resolves or rejects it accordingly.
   *
   */
  private setupListeners(): void {
    this.worker.onmessage = (event: MessageEvent) => {
      const id:number = event.data.id;
      const payload: Res = event.data.payload;

      /**
       * If there's a pending promise for this ID, resolve or reject it.
       */
      if (this.pendingPromises.has(id)) {
        this.pendingPromises.get(id)!.resolve(payload);
        /**
         * Once resolved/rejected, remove the promise from the pending map.
         */
        this.pendingPromises.delete(id);
      }
    };
  }
}

export default PromisedWorker;
