export class RequestOperationGate {
  #activeReaders = 0;
  #writerActive = false;
  #queue = [];

  async runShared(operation) {
    const release = await this.#acquire("shared");
    try {
      return await operation();
    } finally {
      release();
    }
  }

  async runExclusive(operation) {
    const release = await this.#acquire("exclusive");
    try {
      return await operation();
    } finally {
      release();
    }
  }

  #acquire(mode) {
    return new Promise((resolve) => {
      this.#queue.push({ mode, resolve });
      this.#drain();
    });
  }

  #drain() {
    if (this.#writerActive || this.#queue.length === 0) {
      return;
    }
    if (this.#queue[0].mode === "exclusive") {
      if (this.#activeReaders > 0) {
        return;
      }
      this.#writerActive = true;
      this.#queue.shift().resolve(() => {
        this.#writerActive = false;
        this.#drain();
      });
      return;
    }
    while (this.#queue[0]?.mode === "shared" && !this.#writerActive) {
      this.#activeReaders += 1;
      this.#queue.shift().resolve(() => {
        this.#activeReaders -= 1;
        this.#drain();
      });
    }
  }
}

export function isExclusiveProjectOperation(method, path) {
  return (
    (method === "DELETE" && path.startsWith("/v1/admin/projects/")) ||
    (method === "POST" && path === "/v1/admin/projects/merge")
  );
}
