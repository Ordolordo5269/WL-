export class ErrorHandler {
  static logAPIError(service, method, error) {
    // You can enhance this to send logs to a server or external service
    console.error(`[API ERROR] [${service}] [${method}]`, error);
  }

  static logServiceError(service, method, error) {
    // You can enhance this to send logs to a server or external service
    console.error(`[SERVICE ERROR] [${service}] [${method}]`, error);
  }
} 