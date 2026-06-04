const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function localDevCorsOptions() {
  return {
    origin(origin, callback) {
      if (!origin || LOCAL_ORIGIN.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  };
}
