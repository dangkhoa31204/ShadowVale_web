namespace ShadowVale.BLL.DTOs.Auth;

public enum LoginFailure { InvalidCredentials, AccountDeactivated }

public sealed record LoginResult(AuthResponse? Data, LoginFailure? Failure = null);
