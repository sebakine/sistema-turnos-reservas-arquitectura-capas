import bookingsService from "../services/bookings.service.js";
import { toErrorResponse } from "../utils/errors.js";

/**
 * Controller de bookings: lee la request (req.params, req.body),
 * llama al service y responde con res.status().json().
 */

/** Responde un error con el código HTTP que corresponde. */
const sendError = (res, error) => {
  const { statusCode, body } = toErrorResponse(error);
  return res.status(statusCode).json(body);
};

/** POST /api/bookings -> crea una reserva (services puede iniciar vacío) */
export const createBooking = async (req, res) => {
  try {
    const newBooking = await bookingsService.createBooking(req.body);
    return res.status(201).json({ status: "success", message: "Reserva creada", payload: newBooking });
  } catch (error) {
    return sendError(res, error);
  }
};

/** GET /api/bookings/:bid -> una reserva por id */
export const getBookingById = async (req, res) => {
  try {
    const booking = await bookingsService.getBookingById(req.params.bid);
    return res.status(200).json({ status: "success", payload: booking });
  } catch (error) {
    return sendError(res, error);
  }
};

/** POST /api/bookings/:bid/services/:sid -> agrega un servicio a una reserva existente */
export const addServiceToBooking = async (req, res) => {
  try {
    const { bid, sid } = req.params;
    const booking = await bookingsService.addServiceToBooking(bid, sid);
    return res.status(200).json({ status: "success", message: "Servicio agregado a la reserva", payload: booking });
  } catch (error) {
    return sendError(res, error);
  }
};
