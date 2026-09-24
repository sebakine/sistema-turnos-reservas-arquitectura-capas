import bookingsDAO from "../dao/bookings.dao.js";

/**
 * Repository de bookings: ofrece los métodos de acceso a datos que usa la capa de services.
 * Delega en el DAO sin agregar reglas de negocio. Si en el futuro la persistencia cambia
 * (por ejemplo, a MongoDB), solo se reemplaza el DAO que recibe este repository.
 */
export class BookingsRepository {
  #dao;

  constructor(dao) {
    this.#dao = dao;
  }

  create(data) {
    return this.#dao.create(data);
  }

  getById(id) {
    return this.#dao.getById(id);
  }

  update(id, data) {
    return this.#dao.update(id, data);
  }
}

const bookingsRepository = new BookingsRepository(bookingsDAO);

export default bookingsRepository;
