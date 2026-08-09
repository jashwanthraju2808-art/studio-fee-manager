import API from "./axios";

export const sendBulkReminders   = (month)          => API.post(`/notifications/whatsapp/reminders${month ? `?month=${month}` : ""}`);
export const sendSingleReminder  = (id)              => API.post(`/notifications/whatsapp/reminder/${id}`);
export const sendCustomMessage   = (id, message)     => API.post(`/notifications/whatsapp/send/${id}`, { message });
export const sendPaymentEmail    = (id)              => API.post(`/notifications/email/payment-confirmation/${id}`);
