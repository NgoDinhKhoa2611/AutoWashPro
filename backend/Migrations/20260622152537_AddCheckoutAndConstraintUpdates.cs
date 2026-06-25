using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Auto_Wash.Migrations
{
    /// <inheritdoc />
    public partial class AddCheckoutAndConstraintUpdates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "uq_bookings_vehicle_scheduledat_active",
                table: "bookings");

            migrationBuilder.AddColumn<DateTime>(
                name: "checkedoutat",
                table: "bookings",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "checkedoutby",
                table: "bookings",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "uq_bookings_vehicle_scheduledat_active",
                table: "bookings",
                columns: new[] { "vehicleid", "scheduledat" },
                unique: true,
                filter: "status != 4 AND status != 5 AND status != 7");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "uq_bookings_vehicle_scheduledat_active",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "checkedoutat",
                table: "bookings");

            migrationBuilder.DropColumn(
                name: "checkedoutby",
                table: "bookings");

            migrationBuilder.CreateIndex(
                name: "uq_bookings_vehicle_scheduledat_active",
                table: "bookings",
                columns: new[] { "vehicleid", "scheduledat" },
                unique: true,
                filter: "status != 5");
        }
    }
}
