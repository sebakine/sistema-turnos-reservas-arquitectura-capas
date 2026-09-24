import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import envConfig from "../config/env.config.js";

/**
 * DAO de services: única capa que lee y escribe services.json.
 * Solo persiste datos; no contiene reglas de negocio ni validaciones.
 * Métodos: getAll, getById, create, update, delete.
 */
export class ServicesDAO {
  #path;
  #queue = Promise.resolve();

  constructor(filePath) {
    this.#path = filePath;
  }

  /** Ejecuta las operaciones de a una para que lecturas y escrituras no se crucen. */
  #run(task) {
    const result = this.#queue.then(task, task);
    this.#queue = result.catch(() => {});
    return result;
  }

  async #read() {
    try {
      const content = await fs.readFile(this.#path, "utf-8");
      if (!content.trim()) return [];
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      if (error.code === "ENOENT") {
        await this.#write([]);
        return [];
      }
      throw error;
    }
  }

  async #write(data) {
    await fs.mkdir(path.dirname(this.#path), { recursive: true });
    await fs.writeFile(this.#path, JSON.stringify(data, null, 2), "utf-8");
  }

  /** Devuelve todos los servicios guardados. */
  getAll() {
    return this.#run(() => this.#read());
  }

  /** Devuelve el servicio con ese id o null. */
  getById(id) {
    return this.#run(async () => {
      const services = await this.#read();
      return services.find((s) => s.id === id) ?? null;
    });
  }

  /** Guarda un nuevo servicio asignándole un id autogenerado y lo devuelve. */
  create(data) {
    return this.#run(async () => {
      const services = await this.#read();
      const { id: _ignored, ...fields } = data;
      const newService = { id: crypto.randomUUID(), ...fields };
      services.push(newService);
      await this.#write(services);
      return newService;
    });
  }

  /** Reemplaza los campos indicados conservando el id. Devuelve el servicio actualizado o null. */
  update(id, data) {
    return this.#run(async () => {
      const services = await this.#read();
      const index = services.findIndex((s) => s.id === id);
      if (index === -1) return null;
      services[index] = { ...services[index], ...data, id: services[index].id };
      await this.#write(services);
      return services[index];
    });
  }

  /** Elimina el servicio. Devuelve el servicio eliminado o null. */
  delete(id) {
    return this.#run(async () => {
      const services = await this.#read();
      const index = services.findIndex((s) => s.id === id);
      if (index === -1) return null;
      const [deleted] = services.splice(index, 1);
      await this.#write(services);
      return deleted;
    });
  }
}

const servicesDAO = new ServicesDAO(envConfig.SERVICES_FILE);

export default servicesDAO;
