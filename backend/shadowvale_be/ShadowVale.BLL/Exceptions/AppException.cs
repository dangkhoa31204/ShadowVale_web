namespace ShadowVale.BLL.Exceptions;

// Base for expected business errors. BLL stays HTTP-agnostic: the API maps each subtype to a status code.
public abstract class AppException(string message) : Exception(message);
