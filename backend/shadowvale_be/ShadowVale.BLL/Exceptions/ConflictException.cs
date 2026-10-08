namespace ShadowVale.BLL.Exceptions;

// State conflicts, e.g. a duplicate username or publishing a bundle version that is already published
public class ConflictException(string message) : AppException(message);
