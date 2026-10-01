using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddChoreLastCompletedBy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LastCompletedByUserId",
                table: "ChoreItems",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChoreItems_LastCompletedByUserId",
                table: "ChoreItems",
                column: "LastCompletedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ChoreItems_AspNetUsers_LastCompletedByUserId",
                table: "ChoreItems",
                column: "LastCompletedByUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ChoreItems_AspNetUsers_LastCompletedByUserId",
                table: "ChoreItems");

            migrationBuilder.DropIndex(
                name: "IX_ChoreItems_LastCompletedByUserId",
                table: "ChoreItems");

            migrationBuilder.DropColumn(
                name: "LastCompletedByUserId",
                table: "ChoreItems");
        }
    }
}
