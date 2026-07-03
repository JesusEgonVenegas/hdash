using backend.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    public DbSet<Debt> Debts => Set<Debt>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Household> Households => Set<Household>();
    public DbSet<GroceryItem> GroceryItems => Set<GroceryItem>();
    public DbSet<TodoItem> TodoItems => Set<TodoItem>();
    public DbSet<ChoreItem> ChoreItems => Set<ChoreItem>();
    public DbSet<CalendarEvent> CalendarEvents => Set<CalendarEvent>();
    public DbSet<RevokedToken> RevokedTokens => Set<RevokedToken>();
    public DbSet<HouseholdNote> HouseholdNotes => Set<HouseholdNote>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<RevokedToken>().HasKey(t => t.Jti);

        modelBuilder
            .Entity<Debt>()
            .HasMany(d => d.Payments)
            .WithOne(p => p.Debt)
            .HasForeignKey(p => p.DebtId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<Debt>()
            .HasOne(d => d.User)
            .WithMany()
            .HasForeignKey(d => d.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<Household>()
            .HasOne(h => h.Owner)
            .WithMany()
            .HasForeignKey(h => h.OwnerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder
            .Entity<ApplicationUser>()
            .HasOne(u => u.Household)
            .WithMany(h => h.Members)
            .HasForeignKey(u => u.HouseholdId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder
            .Entity<Household>()
            .HasIndex(h => h.InviteCode)
            .IsUnique();

        modelBuilder
            .Entity<GroceryItem>()
            .HasOne(g => g.User)
            .WithMany()
            .HasForeignKey(g => g.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<GroceryItem>()
            .HasOne(g => g.Household)
            .WithMany()
            .HasForeignKey(g => g.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<TodoItem>()
            .HasOne(t => t.CreatedBy)
            .WithMany()
            .HasForeignKey(t => t.CreatedByUserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<TodoItem>()
            .HasOne(t => t.AssignedTo)
            .WithMany()
            .HasForeignKey(t => t.AssignedToUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder
            .Entity<TodoItem>()
            .HasOne(t => t.Household)
            .WithMany()
            .HasForeignKey(t => t.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<ChoreItem>()
            .HasOne(c => c.CreatedBy)
            .WithMany()
            .HasForeignKey(c => c.CreatedByUserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<ChoreItem>()
            .HasOne(c => c.AssignedTo)
            .WithMany()
            .HasForeignKey(c => c.AssignedToUserId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder
            .Entity<ChoreItem>()
            .HasOne(c => c.Household)
            .WithMany()
            .HasForeignKey(c => c.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<CalendarEvent>()
            .HasOne(e => e.CreatedBy)
            .WithMany()
            .HasForeignKey(e => e.CreatedByUserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<CalendarEvent>()
            .HasOne(e => e.Household)
            .WithMany()
            .HasForeignKey(e => e.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<HouseholdNote>()
            .HasOne(n => n.CreatedBy)
            .WithMany()
            .HasForeignKey(n => n.CreatedByUserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder
            .Entity<HouseholdNote>()
            .HasOne(n => n.Household)
            .WithMany()
            .HasForeignKey(n => n.HouseholdId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
