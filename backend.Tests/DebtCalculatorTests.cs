using backend.Services;

namespace backend.Tests;

public class DebtCalculatorTests
{
    private static readonly DateTime Created = new(2026, 1, 1);

    private static (DateTime, decimal)[] Pay(params (int dayOffset, decimal amount)[] items) =>
        items.Select(i => (Created.AddDays(i.dayOffset), i.amount)).ToArray();

    [Fact]
    public void NoTimeElapsed_NoPayments_ReturnsStartingAmount()
    {
        var balance = DebtCalculator.CurrentBalance(1000m, 20m, Array.Empty<(DateTime, decimal)>(), Created, Created);
        Assert.Equal(1000m, balance);
    }

    [Fact]
    public void ZeroApr_IsSimplePrincipalMinusPayments()
    {
        var payments = Pay((10, 100m), (40, 150m));
        var balance = DebtCalculator.CurrentBalance(1000m, 0m, payments, Created, Created.AddMonths(3));
        Assert.Equal(750m, balance);
    }

    [Fact]
    public void PositiveApr_AccruesInterest_BalanceExceedsSimpleEstimate()
    {
        var payments = Pay((15, 100m));
        var asOf = Created.AddMonths(6);
        var balance = DebtCalculator.CurrentBalance(1000m, 24m, payments, Created, asOf);

        // Simple (no interest) would be 900; interest must push it higher.
        Assert.True(balance > 900m, $"expected interest-inflated balance > 900, got {balance}");
    }

    [Fact]
    public void PaymentBeforeCreatedAt_IsStillCounted()
    {
        // Regression: back-dated payments must not be silently dropped.
        var payments = new[] { (Created.AddDays(-10), 200m) };
        var balance = DebtCalculator.CurrentBalance(1000m, 0m, payments, Created, Created.AddMonths(2));
        Assert.Equal(800m, balance);
    }

    [Fact]
    public void Overpayment_ClampsAtZero()
    {
        var payments = Pay((5, 5000m));
        var balance = DebtCalculator.CurrentBalance(1000m, 15m, payments, Created, Created.AddMonths(2));
        Assert.Equal(0m, balance);
    }

    [Fact]
    public void PaidTotal_SumsAllPayments()
    {
        var payments = Pay((1, 100m), (2, 250.5m), (3, 49.5m));
        Assert.Equal(400m, DebtCalculator.PaidTotal(payments));
    }

    [Fact]
    public void SimulatePayoff_FixedPayment_ReachesZeroInFiniteMonths()
    {
        var result = DebtCalculator.SimulatePayoff(1000m, 12m, 100m);
        Assert.NotNull(result.MonthsToPayoff);
        Assert.True(result.MonthsToPayoff <= 12, $"expected payoff within a year, got {result.MonthsToPayoff}");
        Assert.Equal(0m, result.FinalBalance);
        Assert.True(result.TotalInterest > 0m);
    }

    [Fact]
    public void SimulatePayoff_PaymentBelowInterest_NeverPaysOff()
    {
        // 30% APR on 10k = 250/mo interest; paying 100 can never win.
        var result = DebtCalculator.SimulatePayoff(10000m, 30m, 100m);
        Assert.Null(result.MonthsToPayoff);
    }

    [Fact]
    public void SimulatePayoff_ZeroPayment_NeverPaysOff()
    {
        var result = DebtCalculator.SimulatePayoff(500m, 10m, 0m);
        Assert.Null(result.MonthsToPayoff);
    }

    [Theory]
    [InlineData(1200, 12, 12)]   // 12% APR -> 1% monthly -> 12 on 1200
    [InlineData(1000, 0, 0)]
    public void MonthlyInterest_ComputesExpected(double balance, double apr, double expected)
    {
        Assert.Equal((decimal)expected, DebtCalculator.MonthlyInterest((decimal)balance, (decimal)apr));
    }
}
