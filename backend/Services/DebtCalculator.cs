namespace backend.Services;

/// <summary>
/// Single source of truth for debt math. Interest accrues monthly on the
/// outstanding balance (the way a credit-card statement works): full months
/// that have elapsed since the debt was opened are charged interest, then the
/// payments made in each month are subtracted. The trailing partial month
/// subtracts payments without charging another month of interest yet.
/// </summary>
public static class DebtCalculator
{
    public const int MaxMonths = 600; // 50 years — payoff-simulation safety cap

    public static decimal MonthlyRate(decimal aprPercent) => aprPercent / 100m / 12m;

    public static decimal MonthlyInterest(decimal balance, decimal aprPercent) =>
        balance * MonthlyRate(aprPercent);

    /// <summary>
    /// Interest-aware outstanding balance as of <paramref name="asOf"/>.
    /// Never returns less than zero.
    /// </summary>
    public static decimal CurrentBalance(
        decimal startingAmount,
        decimal aprPercent,
        IEnumerable<(DateTime PaidAt, decimal Amount)> payments,
        DateTime createdAt,
        DateTime asOf)
    {
        var balance = startingAmount;
        var ordered = payments.OrderBy(p => p.PaidAt).ToList();
        var start = createdAt.Date;
        var end = asOf.Date;

        // Running lower bound. Starts at MinValue so any payment dated before the
        // debt's createdAt (e.g. imported/back-dated history) is still counted once
        // rather than silently dropped.
        var cursor = DateTime.MinValue;

        var m = 0;
        // Full elapsed months: charge interest, then subtract that month's payments.
        while (start.AddMonths(m + 1) <= end && m < MaxMonths)
        {
            var windowEnd = start.AddMonths(m + 1);

            balance += MonthlyInterest(balance, aprPercent);
            balance -= PaymentsInWindow(ordered, cursor, windowEnd);
            if (balance < 0) balance = 0;

            cursor = windowEnd;
            m++;
        }

        // Trailing partial month: remaining payments count immediately, interest not yet due.
        balance -= PaymentsInWindow(ordered, cursor, end.AddDays(1));
        if (balance < 0) balance = 0;

        return Math.Round(balance, 2);
    }

    public static decimal PaidTotal(IEnumerable<(DateTime PaidAt, decimal Amount)> payments) =>
        Math.Round(payments.Sum(p => p.Amount), 2);

    private static decimal PaymentsInWindow(
        List<(DateTime PaidAt, decimal Amount)> payments, DateTime startInclusive, DateTime endExclusive) =>
        payments.Where(p => p.PaidAt >= startInclusive && p.PaidAt < endExclusive).Sum(p => p.Amount);

    /// <summary>
    /// Projects how a single debt is paid down by a fixed monthly payment.
    /// If the payment can never cover the accruing interest, MonthsToPayoff is null.
    /// </summary>
    public static PayoffResult SimulatePayoff(decimal balance, decimal aprPercent, decimal monthlyPayment)
    {
        if (monthlyPayment <= 0)
            return new PayoffResult(null, 0m, Math.Round(balance, 2));

        var totalInterest = 0m;
        var months = 0;

        while (balance > 0 && months < MaxMonths)
        {
            var interest = MonthlyInterest(balance, aprPercent);
            // Payment doesn't even cover interest -> balance never shrinks.
            if (monthlyPayment <= interest && aprPercent > 0)
                return new PayoffResult(null, Math.Round(totalInterest, 2), Math.Round(balance, 2));

            totalInterest += interest;
            balance = balance + interest - monthlyPayment;
            if (balance < 0) balance = 0;
            months++;
        }

        return new PayoffResult(months, Math.Round(totalInterest, 2), Math.Round(balance, 2));
    }
}

public record PayoffResult(int? MonthsToPayoff, decimal TotalInterest, decimal FinalBalance);
