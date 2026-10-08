namespace ShadowVale.BLL.Exceptions;

// Authenticated but not allowed, e.g. a Designer approving their own bundle
public class ForbiddenException(string message = "You do not have permission to perform this action.") : AppException(message);
