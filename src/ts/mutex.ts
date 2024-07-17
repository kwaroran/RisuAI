/**
 * A lock for synchronizing async operations.
 * Use this to protect a critical section
 * from getting modified by multiple async operations
 * at the same time.
 */
export class Mutex {
    /**
     * When multiple operations attempt to acquire the lock,
     * this queue remembers the order of operations.
     */
    private _queue: {
        resolve: (release: ReleaseFunction) => void
    }[] = []

    private _isLocked = false

    /**
     * Wait until the lock is acquired.
     * @returns A function that releases the acquired lock.
     */
    acquire() {
        return new Promise<ReleaseFunction>((resolve) => {
            this._queue.push({resolve})
            this._dispatch()
        });
    }

    /**
     * Enqueue a function to be run serially.
     * 
     * This ensures no other functions will start running
     * until `callback` finishes running.
     * @param callback Function to be run exclusively.
     * @returns The return value of `callback`.
     */
    async runExclusive<T>(callback: () => Promise<T>) {
        const release = await this.acquire()
        try {
            return await callback()
        } finally {
            release()
        }
    }

    /**
     * Check the availability of the resource
     * and provide access to the next operation in the queue.
     *
     * _dispatch is called whenever availability changes,
     * such as after lock acquire request or lock release.
     */
    private _dispatch() {
        if (this._isLocked) {
            // The resource is still locked.
            // Wait until next time.
            return
        }
        const nextEntry = this._queue.shift()
        if (!nextEntry) {
            // There is nothing in the queue.
            // Do nothing until next dispatch.
            return
        }
        // The resource is available.
        this._isLocked = true
        // and give access to the next operation
        // in the queue.
        nextEntry.resolve(this._buildRelease())
    }

    /**
     * Build a release function for each operation
     * so that it can release the lock after
     * the operation is complete.
     */
    private _buildRelease(): ReleaseFunction {
        return () => {
            // Each release function make
            // the resource available again
            this._isLocked = false
            // and call dispatch.
            this._dispatch()
        }
    }
}

type ReleaseFunction = () => void