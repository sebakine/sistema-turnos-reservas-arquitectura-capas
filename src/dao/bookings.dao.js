import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import envConfig from "../config/env.config.js";

/**
 * DAO de bookings: única capa que lee y escribe bookings.json.
 * Solo persiste datos; no contiene reglas de negocio ni validaciones.
 * Métodos: create, getById, update.
 */
export class BookingsDAO {
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

  /** Guarda una nueva reserva asignándole un id autogenerado y la devuelve. */
  create(data) {
    return this.#run(async () => {
      const bookings = await this.#read();
      const { id: _ignored, ...fields } = data;
      const newBooking = { id: crypto.randomUUID(), ...fields };
      bookings.push(newBooking);
      await this.#write(bookings);
      return newBooking;
    });
  }

  /** Devuelve la reserva con ese id o null. */
  getById(id) {
    return this.#run(async () => {
      const bookings = await this.#read();
      return bookings.find((b) => b.id === id) ?? null;
    });
  }

  /** Reemplaza los campos indicados conservando el id. Devuelve la reserva actualizada o null. */
  update(id, data) {
    return this.#run(async () => {
      const bookings = await this.#read();
      const index = bookings.findIndex((b) => b.id === id);
      if (index === -1) return null;
      bookings[index] = { ...bookings[index], ...data, id: bookings[index].id };
      await this.#write(bookings);
      return bookings[index];
    });
  }
}

const bookingsDAO = new BookingsDAO(envConfig.BOOKINGS_FILE);

export default bookingsDAO;
