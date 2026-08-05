"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { webcrypto } = require("crypto");

class StorageMock {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(String(key)) ? this.map.get(String(key)) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
  clear() { this.map.clear(); }
}

const localStorage = new StorageMock();
let namespace = "local";
let state = { movements: [], registers: [], drivers: [], vehicles: [], suppliers: [], paymentMethods: [], alerts: [] };
const bridge = {
  getNamespace: () => namespace,
  getState: () => JSON.parse(JSON.stringify(state)),
  applyState: (next) => { state = JSON.parse(JSON.stringify(next)); },
};
const nullElement = null;
const context = {
  console,
  localStorage,
  crypto: webcrypto,
  navigator: { onLine: false },
  document: {
    querySelector: () => nullElement,
    getElementById: () => nullElement,
    addEventListener: () => {},
    visibilityState: "visible",
  },
  window: {
    FIREBASE_CONFIG: {},
    vehicleAppBridge: bridge,
    vehicleAppReady: false,
    addEventListener: () => {},
    confirm: () => true,
  },
  setTimeout: () => 0,
  clearTimeout: () => {},
  setInterval: () => 0,
  clearInterval: () => {},
  Intl,
  Date,
  JSON,
  Map,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Math,
};
context.window.window = context.window;
context.window.document = context.document;
context.window.navigator = context.navigator;
context.window.localStorage = localStorage;
context.globalThis = context;
vm.createContext(context);
const source = fs.readFileSync(path.resolve(__dirname, "..", "cloud.js"), "utf8");
vm.runInContext(source, context, { filename: "cloud.js" });
const cloud = context.window.cloudSync;
assert(cloud && typeof cloud.commitLocalState === "function", "Ponte de gravação não exposta");

const clone = (value) => JSON.parse(JSON.stringify(value));
const queueKey = (ns) => `mycar_cloud_pending_v3_${ns}`;
const journalKey = (ns) => `mycar_cloud_journal_v1_${ns}`;
const baselineKey = (ns) => `mycar_cloud_baseline_v3_${ns}`;
const read = (key) => JSON.parse(localStorage.getItem(key) || "null");

state.movements = [{ id: "m1", movimento_id: "m1", valor: 100 }];
state = cloud.commitLocalState(clone(state), (prepared) => { state = clone(prepared); });
let queued = read(queueKey("local"));
assert.strictEqual(queued.movements.m1.version, 1, "Primeira versão local deve ser 1");
assert.strictEqual(queued.movements.m1.schemaVersion, 11, "Esquema local deve ser 11");
assert.strictEqual(localStorage.getItem(journalKey("local")), null, "Diário deve ser removido após confirmação");
const firstUpdatedAt = queued.movements.m1.updatedAt;

state = cloud.commitLocalState(clone(state), (prepared) => { state = clone(prepared); });
queued = read(queueKey("local"));
assert.strictEqual(queued.movements.m1.version, 1, "Reconstruir a fila não pode inflar a versão");
assert.strictEqual(queued.movements.m1.updatedAt, firstUpdatedAt, "Reconstruir a fila não pode alterar o horário");

state.movements[0].valor = 125;
state = cloud.commitLocalState(clone(state), (prepared) => { state = clone(prepared); });
queued = read(queueKey("local"));
assert.strictEqual(queued.movements.m1.version, 2, "Nova alteração deve gerar nova versão");

namespace = "uid_teste";
state = { movements: [{ id: "m2", movimento_id: "m2", valor: 50 }], registers: [], drivers: [], vehicles: [], suppliers: [], paymentMethods: [], alerts: [] };
state = cloud.commitLocalState(clone(state), (prepared) => { state = clone(prepared); });
assert(read(queueKey("uid_teste")).movements.m2, "Fila da conta deve existir");
assert(read(queueKey("local")).movements.m1, "Fila local não pode ser substituída pela conta");

namespace = "delete_test";
const baseRecord = { id: "m3", movimento_id: "m3", valor: 80, version: 4, schemaVersion: 11 };
localStorage.setItem(baselineKey(namespace), JSON.stringify({ movements: [baseRecord], registers: [], drivers: [], vehicles: [], suppliers: [], paymentMethods: [], alerts: [] }));
state = { movements: [], registers: [], drivers: [], vehicles: [], suppliers: [], paymentMethods: [], alerts: [] };
state = cloud.commitLocalState(clone(state), (prepared) => { state = clone(prepared); });
queued = read(queueKey(namespace));
assert.strictEqual(queued.movements.m3.version, 5, "Exclusão deve avançar uma versão");
const deletedAt = queued.movements.m3.deletedAt;
state = cloud.commitLocalState(clone(state), (prepared) => { state = clone(prepared); });
queued = read(queueKey(namespace));
assert.strictEqual(queued.movements.m3.version, 5, "Reconstruir exclusão não pode inflar a versão");
assert.strictEqual(queued.movements.m3.deletedAt, deletedAt, "Tombstone deve permanecer estável");

let failed = false;
namespace = "journal_test";
state = { movements: [{ id: "m4", movimento_id: "m4", valor: 10 }], registers: [], drivers: [], vehicles: [], suppliers: [], paymentMethods: [], alerts: [] };
try { cloud.commitLocalState(clone(state), () => { throw new Error("falha simulada"); }); } catch (_) { failed = true; }
assert(failed, "Falha de persistência simulada deve ser propagada");
assert(read(journalKey(namespace))?.changes?.movements?.m4, "Diário deve preservar a operação interrompida");

console.log("VALIDAÇÃO DE GRAVAÇÃO E SINCRONIZAÇÃO LOCAL: APROVADA");
console.log("Transação, estabilidade de versão, isolamento por UID, exclusões e diário de recuperação conferidos.");
