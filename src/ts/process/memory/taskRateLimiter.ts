export interface TaskRateLimiterOptions {
  tasksPerMinute?: number;
  maxConcurrentTasks?: number;
  failFast?: boolean;
}

export interface BatchResult<TData> {
  results: TaskResult<TData>[];
  successCount: number;
  failureCount: number;
  allSucceeded: boolean;
}

export interface TaskResult<TData> {
  success: boolean;
  data?: TData;
  error?: Error;
}

export class TaskRateLimiter {
  private static readonly LOG_PREFIX = "[TaskRateLimiter]";
  public readonly options: TaskRateLimiterOptions;
  public taskQueueChangeCallback: (queuedCount: number) => void = null;
  private timestamps: number[] = [];
  private active: number = 0;
  private queue: Array<{
    task: () => Promise<TaskResult<any>>;
    resolve: (result: TaskResult<any>) => void;
  }> = [];

  public constructor(options?: TaskRateLimiterOptions) {
    this.options = {
      tasksPerMinute: 20,
      maxConcurrentTasks: 5,
      failFast: true,
      ...options,
    };

    if (this.options.maxConcurrentTasks > this.options.tasksPerMinute) {
      throw new Error("maxConcurrentTasks must be less than tasksPerMinute");
    }
  }

  public async executeTask<TData>(
    task: () => Promise<TData>
  ): Promise<TaskResult<TData>> {
    return new Promise<TaskResult<TData>>((resolve) => {
      this.queue.push({
        task: async () => {
          try {
            const data = await task();
            return { success: true, data };
          } catch (error) {
            return { success: false, error };
          }
        },
        resolve,
      });

      this.taskQueueChangeCallback?.(this.queue.length);
      this.processNextFromQueue();
    });
  }

  public async executeBatch<TData>(
    tasks: Array<() => Promise<TData>>
  ): Promise<BatchResult<TData>> {
    const taskResults = await Promise.all(
      tasks.map((task) => this.executeTask(task))
    );
    const successCount = taskResults.filter((r) => r.success).length;
    const failureCount = taskResults.length - successCount;

    return {
      results: taskResults,
      successCount,
      failureCount,
      allSucceeded: failureCount === 0,
    };
  }

  public cancelPendingTasks(reason: string): void {
    const error = new TaskCanceledError(reason);

    while (this.queue.length > 0) {
      const { resolve } = this.queue.shift();
      resolve({ success: false, error });
    }

    this.taskQueueChangeCallback?.(this.queue.length);
  }

  public get queuedTaskCount(): number {
    return this.queue.length;
  }

  private processNextFromQueue(): void {
    if (this.queue.length === 0) return;

    if (this.active >= this.options.maxConcurrentTasks) {
      // Debug log for concurrency limit hit
      console.debug(
        TaskRateLimiter.LOG_PREFIX,
        "Concurrency limit hit:",
        "\nTasks in last minute:",
        this.timestamps.length + "/" + this.options.tasksPerMinute,
        "\nActive tasks:",
        this.active + "/" + this.options.maxConcurrentTasks,
        "\nWaiting tasks in queue:",
        this.queue.length
      );

      return;
    }

    this.timestamps = this.timestamps.filter(
      (ts) => Date.now() - ts <= 60 * 1000
    );

    if (this.timestamps.length >= this.options.tasksPerMinute) {
      const oldestTimestamp = Math.min(...this.timestamps);
      const timeUntilExpiry = Math.max(
        100,
        60 * 1000 - (Date.now() - oldestTimestamp)
      );

      // Debug log for rate limit hit
      console.debug(
        TaskRateLimiter.LOG_PREFIX,
        "Rate limit hit:",
        "\nTasks in last minute:",
        this.timestamps.length + "/" + this.options.tasksPerMinute,
        "\nActive tasks:",
        this.active + "/" + this.options.maxConcurrentTasks,
        "\nWaiting tasks in queue:",
        this.queue.length,
        "\nWill retry in:",
        timeUntilExpiry + "ms"
      );

      // Wait until rate limit window advances before retrying
      setTimeout(() => this.processNextFromQueue(), timeUntilExpiry);
      return;
    }

    const { task, resolve } = this.queue.shift();

    this.active++;
    this.taskQueueChangeCallback?.(this.queue.length);
    this.timestamps.push(Date.now());

    // Debug log for task start
    console.debug(
      TaskRateLimiter.LOG_PREFIX,
      "Task started:",
      "\nTasks in last minute:",
      this.timestamps.length + "/" + this.options.tasksPerMinute,
      "\nActive tasks:",
      this.active + "/" + this.options.maxConcurrentTasks,
      "\nWaiting tasks in queue:",
      this.queue.length
    );

    task()
      .then((result) => {
        resolve(result);

        if (!result.success && this.options.failFast) {
          this.cancelPendingTasks("Task canceled due to previous failure");
        }
      })
      .finally(() => {
        this.active--;

        // Prevents call stack overflow while maintaining concurrency limits
        queueMicrotask(() => this.processNextFromQueue());
      });
  }
}

export class TaskCanceledError extends Error {
  public readonly name: string;

  public constructor(message: string) {
    super(message);
    this.name = "TaskCanceledError";
  }
}
