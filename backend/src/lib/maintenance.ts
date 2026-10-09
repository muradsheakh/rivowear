import { listStaleUnpaidOnlineOrders } from "../repo/orders.js";
import { changeStatus } from "./orders.js";

const HOURS = 2;

/** Online-payment orders that were never paid free their stock again after a couple of hours. */
export const cancelStaleUnpaidOrders = async () => {
  for (const order of await listStaleUnpaidOnlineOrders(HOURS)) {
    try {
      await changeStatus(order.id, "Cancelled", "Online payment was not completed in time", { silent: true });
    } catch (error) {
      console.error(`[maintenance] could not cancel ${order.id}:`, error);
    }
  }
};
