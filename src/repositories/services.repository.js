import servicesDAO from "../dao/services.dao.js";

/**
 * Repository de services: ofrece los métodos de acceso a datos que usa la capa de services.
 * Delega en el DAO sin agregar reglas de negocio. Si en el futuro la persistencia cambia
 * (por ejemplo, a MongoDB), solo se reemplaza el DAO que recibe este repository.
 */
export class ServicesRepository {
  #dao;

  constructor(dao) {
    this.#dao = dao;
  }

  getAll() {
    return this.#dao.getAll();
  }

  getById(id) {
    return this.#dao.getById(id);
  }

  create(data) {
    return this.#dao.create(data);
  }

  update(id, data) {
    return this.#dao.update(id, data);
  }

  delete(id) {
    return this.#dao.delete(id);
  }
}

const servicesRepository = new ServicesRepository(servicesDAO);

export default servicesRepository;
