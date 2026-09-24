import servicesRepository from "../repositories/services.repository.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";

/** Campos de un servicio que puede enviar el cliente (el id nunca se acepta). */
const FIELDS = ["name", "description", "duration", "price", "category", "available"];

/** Reglas de validación de cada campo. */
const RULES = {
  name: {
    isValid: (v) => typeof v === "string" && v.trim().length > 0,
    message: "name debe ser un texto no vacío",
  },
  description: {
    isValid: (v) => typeof v === "string" && v.trim().length > 0,
    message: "description debe ser un texto no vacío",
  },
  duration: {
    isValid: (v) => Number.isInteger(v) && v > 0,
    message: "duration debe ser un número entero de minutos mayor a 0",
  },
  price: {
    isValid: (v) => typeof v === "number" && Number.isFinite(v) && v >= 0,
    message: "price debe ser un número mayor o igual a 0",
  },
  category: {
    isValid: (v) => typeof v === "string" && v.trim().length > 0,
    message: "category debe ser un texto no vacío",
  },
  available: {
    isValid: (v) => typeof v === "boolean",
    message: "available debe ser true o false",
  },
};

const isMissing = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

/** Conserva solo los campos permitidos (descarta el id y campos desconocidos). */
const pickFields = (data) => {
  const source = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  const picked = {};
  for (const field of FIELDS) {
    if (Object.hasOwn(source, field)) picked[field] = source[field];
  }
  return picked;
};

/** Valida el tipo de los campos presentes y normaliza los textos. */
const validateFields = (data) => {
  const errors = FIELDS.filter((f) => f in data && !RULES[f].isValid(data[f])).map((f) => RULES[f].message);
  if (errors.length) throw new ValidationError("Datos inválidos", errors);

  const clean = { ...data };
  for (const f of ["name", "description"]) if (clean[f] !== undefined) clean[f] = clean[f].trim();
  if (clean.category !== undefined) clean.category = clean.category.trim().toLowerCase();
  return clean;
};

/**
 * Service de services: reglas de negocio del recurso.
 * No conoce la petición ni la respuesta HTTP y no accede a archivos: usa el repository.
 */
class ServicesService {
  /**
   * Devuelve todos los servicios. Filtros opcionales:
   * category (texto, sin distinguir mayúsculas) y available ("true" | "false").
   */
  async getServices({ category, available } = {}) {
    if (category !== undefined && (typeof category !== "string" || category.trim() === "")) {
      throw new ValidationError("El filtro category debe ser un texto no vacío");
    }
    if (available !== undefined && available !== "true" && available !== "false") {
      throw new ValidationError("El filtro available solo acepta true o false");
    }

    let services = await servicesRepository.getAll();
    if (category !== undefined) {
      const wanted = category.trim().toLowerCase();
      services = services.filter((s) => String(s.category).toLowerCase() === wanted);
    }
    if (available !== undefined) {
      const wanted = available === "true";
      services = services.filter((s) => s.available === wanted);
    }
    return services;
  }

  /** Devuelve un servicio por id o lanza NotFoundError. */
  async getServiceById(id) {
    const service = await servicesRepository.getById(id);
    if (!service) throw new NotFoundError(`No existe un servicio con id ${id}`);
    return service;
  }

  /** Crea un servicio: todos los campos son obligatorios y el id lo asigna la persistencia. */
  async createService(data) {
    const payload = pickFields(data);
    const missing = FIELDS.filter((f) => isMissing(payload[f]));
    if (missing.length) {
      throw new ValidationError(`Faltan campos obligatorios: ${missing.join(", ")}`, missing);
    }
    const valid = validateFields(payload);

    return servicesRepository.create({
      name: valid.name,
      description: valid.description,
      duration: valid.duration,
      price: valid.price,
      category: valid.category,
      available: valid.available,
    });
  }

  /** Actualiza los campos enviados. El id no se puede modificar. */
  async updateService(id, data) {
    const payload = pickFields(data);
    if (Object.keys(payload).length === 0) {
      throw new ValidationError(`Debe enviar al menos un campo a actualizar: ${FIELDS.join(", ")}`, FIELDS);
    }
    const empty = Object.keys(payload).filter((f) => isMissing(payload[f]));
    if (empty.length) {
      throw new ValidationError(`Los siguientes campos no pueden estar vacíos: ${empty.join(", ")}`, empty);
    }
    const valid = validateFields(payload);

    const updated = await servicesRepository.update(id, valid);
    if (!updated) throw new NotFoundError(`No existe un servicio con id ${id}`);
    return updated;
  }

  /** Elimina un servicio y lo devuelve, o lanza NotFoundError. */
  async deleteService(id) {
    const deleted = await servicesRepository.delete(id);
    if (!deleted) throw new NotFoundError(`No existe un servicio con id ${id}`);
    return deleted;
  }
}

const servicesService = new ServicesService();

export default servicesService;
