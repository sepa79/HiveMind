export class RequestOperationGate {
  #activeReaders = 0;
  #writerActive = false;
  #queue = [];

  async acquireShared() {
    return this.#acquire("shared");
  }

  async acquireExclusive() {
    return this.#acquire("exclusive");
  }

  async runShared(operation) {
    const release = await this.acquireShared();
    try {
      return await operation();
    } finally {
      release();
    }
  }

  async runExclusive(operation) {
    const release = await this.acquireExclusive();
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

export class ProjectOperationGates {
  #gates = new Map();

  activeGateCount() {
    return this.#gates.size;
  }

  async acquireShared(projectIds) {
    return this.#acquire(projectIds, "shared");
  }

  async acquireExclusive(projectIds) {
    return this.#acquire(projectIds, "exclusive");
  }

  async runShared(projectIds, operation) {
    const release = await this.acquireShared(projectIds);
    try {
      return await operation();
    } finally {
      release();
    }
  }

  async runExclusive(projectIds, operation) {
    const release = await this.acquireExclusive(projectIds);
    try {
      return await operation();
    } finally {
      release();
    }
  }

  async #acquire(projectIds, mode) {
    const keys = normalizeProjectGateKeys(projectIds);
    if (keys.length === 0) {
      return () => {};
    }
    const retained = keys.map((key) => this.#retainGate(key));
    try {
      const releases = await this.#acquireRetained(retained, mode, 0);
      return () => {
        for (let index = releases.length - 1; index >= 0; index -= 1) {
          releases[index]();
        }
        for (const { key } of retained) {
          this.#releaseGate(key);
        }
      };
    } catch (error) {
      for (const { key } of retained) {
        this.#releaseGate(key);
      }
      throw error;
    }
  }

  async #acquireRetained(retained, mode, index) {
    if (index >= retained.length) {
      return [];
    }
    const gate = retained[index].gate;
    const acquire = mode === "exclusive" ? gate.acquireExclusive.bind(gate) : gate.acquireShared.bind(gate);
    const release = await acquire();
    try {
      return [release, ...(await this.#acquireRetained(retained, mode, index + 1))];
    } catch (error) {
      release();
      throw error;
    }
  }

  #retainGate(key) {
    const existing = this.#gates.get(key);
    if (existing) {
      existing.refCount += 1;
      return { key, gate: existing.gate };
    }
    const created = {
      gate: new RequestOperationGate(),
      refCount: 1
    };
    this.#gates.set(key, created);
    return { key, gate: created.gate };
  }

  #releaseGate(key) {
    const record = this.#gates.get(key);
    if (!record) {
      return;
    }
    record.refCount -= 1;
    if (record.refCount <= 0) {
      this.#gates.delete(key);
    }
  }
}

export function normalizeProjectGateKeys(projectIds) {
  const values = Array.isArray(projectIds) ? projectIds : [projectIds];
  return [...new Set(values.filter((value) => typeof value === "string").map((value) => value.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  );
}
