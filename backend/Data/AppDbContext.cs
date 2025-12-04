using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    public DbSet<Debt> Debts => Set<Debt>();
    public DbSet<Payment> Payments => Set<Payment>();
}
