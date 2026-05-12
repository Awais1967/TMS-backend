export const sendSuccess = (res, message = "Success", data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (res, message = "Error", statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};
