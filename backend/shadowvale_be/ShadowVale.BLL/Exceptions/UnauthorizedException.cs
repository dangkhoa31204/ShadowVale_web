namespace ShadowVale.BLL.Exceptions;

// Authentication failed, e.g. wrong password or an invalid refresh token
public class UnauthorizedException(string message = "Invalid credentials.") : AppException(message);
