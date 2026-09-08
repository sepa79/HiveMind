import { expect } from "vitest";

export class FakeOpenSearchClient {
  constructor() {
    this.indices = {
      putMapping: async () => {},
      exists: async ({ index }) => this.#index(index).size > 0,
      create: async ({ index }) => {
        this.#index(index);
      }
    };
    this.scrollCalls = 0;
    this.#documents = new Map();
    this.#writeCounts = new Map();
    this.#scrolls = new Map();
    this.#nextScrollId = 1;
    this.#idempotencyConflictFactory = null;
    this.#failingIndexWrite = null;
    this.#failingDelete = null;
  }

  #documents;
  #writeCounts;
  #scrolls;
  #nextScrollId;
  #idempotencyConflictFactory;
  #failingIndexWrite;
  #failingDelete;

  putSource(index, id, source) {
    this.#index(index).set(id, source);
  }

  indexWrites(index) {
    return this.#writeCounts.get(index) ?? 0;
  }

  conflictOnNextIdempotencyCreate(factory) {
    this.#idempotencyConflictFactory = factory;
  }

  failNextIndexWrite(index, id = null, matchingWritesToSkip = 0) {
    this.#failingIndexWrite = { index, id, matchingWritesToSkip };
  }

  failNextDelete(index, id = null) {
    this.#failingDelete = { index, id };
  }

  async get({ index, id }) {
    const source = this.#index(index).get(id);
    if (!source) {
      throw notFound();
    }
    return { body: { _source: source } };
  }

  async index({ index, id, body, op_type }) {
    if (this.#failingIndexWrite?.index === index && (!this.#failingIndexWrite.id || this.#failingIndexWrite.id === id)) {
      if (this.#failingIndexWrite.matchingWritesToSkip > 0) {
        this.#failingIndexWrite.matchingWritesToSkip -= 1;
      } else {
        this.#failingIndexWrite = null;
        throw new Error(`Injected index failure for ${index}`);
      }
    }
    if (op_type === "create" && index.endsWith("-idempotency") && this.#idempotencyConflictFactory) {
      this.#index(index).set(id, this.#idempotencyConflictFactory(body));
      this.#idempotencyConflictFactory = null;
      throw conflict();
    }
    if (op_type === "create" && this.#index(index).has(id)) {
      throw conflict();
    }
    this.#index(index).set(id, body);
    this.#writeCounts.set(index, (this.#writeCounts.get(index) ?? 0) + 1);
    return { body: { result: "created" } };
  }

  async delete({ index, id }) {
    if (this.#failingDelete?.index === index && (!this.#failingDelete.id || this.#failingDelete.id === id)) {
      this.#failingDelete = null;
      throw new Error(`Injected delete failure for ${index}`);
    }
    if (!this.#index(index).has(id)) {
      throw notFound();
    }
    this.#index(index).delete(id);
    return { body: { result: "deleted" } };
  }

  async deleteByQuery({ index, body, refresh, conflicts }) {
    expect(refresh).toBe(true);
    expect(conflicts).toBe("abort");
    if (this.#failingDelete?.index === index && !this.#failingDelete.id) {
      this.#failingDelete = null;
      throw new Error(`Injected delete failure for ${index}`);
    }
    const hits = this.#matchingHits(index, body?.query);
    for (const hit of hits) {
      this.#index(index).delete(hit._id);
    }
    return {
      body: {
        deleted: hits.length,
        total: hits.length,
        timed_out: false,
        version_conflicts: 0,
        failures: []
      }
    };
  }

  async search({ index, size, body }) {
    const hits = this.#matchingHits(index, body?.query);
    const batch = hits.slice(0, size);
    const remaining = hits.slice(size);
    const scrollId = `scroll-${this.#nextScrollId}`;
    this.#nextScrollId += 1;
    this.#scrolls.set(scrollId, { remaining, size });
    return {
      body: {
        _scroll_id: scrollId,
        hits: { hits: batch }
      }
    };
  }

  async scroll({ scroll_id }) {
    this.scrollCalls += 1;
    const state = this.#scrolls.get(scroll_id) ?? { remaining: [], size: 1000 };
    const batch = state.remaining.slice(0, state.size);
    state.remaining = state.remaining.slice(state.size);
    this.#scrolls.set(scroll_id, state);
    return {
      body: {
        _scroll_id: scroll_id,
        hits: { hits: batch }
      }
    };
  }

  async clearScroll({ scroll_id }) {
    this.#scrolls.delete(scroll_id);
  }

  #index(index) {
    if (!this.#documents.has(index)) {
      this.#documents.set(index, new Map());
    }
    return this.#documents.get(index);
  }

  #matchingHits(index, query) {
    const docs = [...this.#index(index).entries()].map(([id, source]) => ({ _id: id, _source: source }));
    if (!query || query.match_all) {
      return docs;
    }
    if (query.term) {
      const [[field, value]] = Object.entries(query.term);
      return docs.filter((doc) => doc._source[field] === value);
    }
    return [];
  }
}

export function notFound() {
  const error = new Error("not found");
  error.meta = { statusCode: 404 };
  return error;
}

export function conflict() {
  const error = new Error("conflict");
  error.meta = { statusCode: 409 };
  return error;
}
