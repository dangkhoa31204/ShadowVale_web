using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;
using ShadowVale.BLL.Exceptions;
using ShadowVale.BLL.Mappings;
using ShadowVale.DAL.Entities;

namespace ShadowVale.BLL.Services;

// Which solver configuration a session uses (pure functions, no I/O)
public static class SolverAssignment
{
    // Human sessions: A/B test. The arm is a hash of the session id, so it is stable when the request is retried,
    // and spread evenly over the arms (active, runnable configurations, ordered by code). No arm -> null.
    public static SolverConfiguration? ForHuman(Guid sessionId, IEnumerable<SolverConfiguration> configurations)
    {
        var arms = configurations.Where(c => c.IsAbArm()).OrderBy(c => c.Code, StringComparer.Ordinal).ToList();
        if (arms.Count == 0)
            return null;

        var hash = SHA256.HashData(Encoding.ASCII.GetBytes(sessionId.ToString("N")));
        var bucket = BinaryPrimitives.ReadUInt64BigEndian(hash) % (ulong)arms.Count;
        return arms[(int)bucket];
    }

    // Replay harness: exactly the configuration it asked for, active or not (benchmarks also cover inactive ones)
    public static SolverConfiguration ForReplay(string requestedVariant, IEnumerable<SolverConfiguration> configurations) =>
        configurations.FirstOrDefault(c => c.Code == requestedVariant)
        ?? throw new ValidationException("RequestedVariant", $"No solver configuration has code '{requestedVariant}'.");

    // Configuration a re-plan result belongs to: the session's own configuration when the variant matches it
    // (by solver variant or by code), otherwise the configuration whose code is the variant. Null = unknown.
    public static SolverConfiguration? ForResult(
        string variant, SolverConfiguration? sessionConfiguration, IReadOnlyDictionary<string, SolverConfiguration> byCode)
    {
        if (sessionConfiguration is not null
            && (variant == sessionConfiguration.Code || variant == sessionConfiguration.Algorithm.Variant()))
            return sessionConfiguration;

        return byCode.GetValueOrDefault(variant);
    }
}
