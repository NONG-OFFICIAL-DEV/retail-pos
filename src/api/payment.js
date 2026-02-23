import http from "./api";

export default {
  // for dev test
  printInvoice(saleId) {
    return http.get(`/download/${saleId}/invoice`, { responseType: 'blob' })
  }
};
