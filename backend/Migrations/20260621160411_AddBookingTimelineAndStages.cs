using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Auto_Wash.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingTimelineAndStages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "currentstage",
                table: "queue",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "confirmedat",
                table: "bookings",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "washingat",
                table: "bookings",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "bookingauditlogs",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    bookingid = table.Column<int>(type: "integer", nullable: false),
                    action = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    performedby = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_bookingauditlogs", x => x.id);
                    table.ForeignKey(
                        name: "fk_bookingauditlogs_bookings_bookingid",
                        column: x => x.bookingid,
                        principalTable: "bookings",
                        principalColumn: "bookingid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "bookingreschedulehistories",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    bookingid = table.Column<int>(type: "integer", nullable: false),
                    oldscheduledat = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    newscheduledat = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    changedby = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    createdat = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_bookingreschedulehistories", x => x.id);
                    table.ForeignKey(
                        name: "fk_bookingreschedulehistories_bookings_bookingid",
                        column: x => x.bookingid,
                        principalTable: "bookings",
                        principalColumn: "bookingid",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_bookingauditlogs_bookingid",
                table: "bookingauditlogs",
                column: "bookingid");

            migrationBuilder.CreateIndex(
                name: "ix_bookingreschedulehistories_bookingid",
                table: "bookingreschedulehistories",
                column: "bookingid");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "bookingauditlogs");

            migrationBuilder.DropTable(
                name: "bookingreschedulehistories");

            migrationBuilder.DropColumn(
                name: "currentstage",
                table: "queue");

            migrationBuilder.DropColumn(
                name: "confirmedat",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "washingat",
                table: "bookings");
        }
    }
}
