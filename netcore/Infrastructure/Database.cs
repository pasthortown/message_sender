using System;
using System.Collections.Generic;
using System.Data.SQLite;
using System.IO;
using Newtonsoft.Json;

namespace ImageActivityMonitor.Infrastructure
{
    public static class Database
    {
        private static readonly string dbPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "messages.db");

        public static SQLiteConnection GetConnection()
        {
            if (!File.Exists(dbPath))
            {
                SQLiteConnection.CreateFile(dbPath);
                using var conn = new SQLiteConnection($"Data Source={dbPath};Version=3;");
                conn.Open();
                CreateTables(conn);
            }

            return new SQLiteConnection($"Data Source={dbPath};Version=3;");
        }

        private static void CreateTables(SQLiteConnection conn)
        {
            using var cmd = new SQLiteCommand(conn);
            cmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS Agenda (
                    message_id INTEGER,
                    schedule TEXT,
                    showed INTEGER
                );

                CREATE TABLE IF NOT EXISTS Messages (
                    id INTEGER PRIMARY KEY,
                    mensaje TEXT
                );

                CREATE TABLE IF NOT EXISTS UsersGroup (
                    grupo TEXT
                );
            ";
            cmd.ExecuteNonQuery();
        }

        public static void InsertAgenda(int messageId, DateTime schedule, bool showed)
        {
            using var conn = GetConnection();
            conn.Open();

            using var cmd = new SQLiteCommand("INSERT INTO Agenda (message_id, schedule, showed) VALUES (@id, @schedule, @showed)", conn);
            cmd.Parameters.AddWithValue("@id", messageId);
            cmd.Parameters.AddWithValue("@schedule", schedule.ToString("o")); // ISO 8601
            cmd.Parameters.AddWithValue("@showed", showed ? 1 : 0);
            cmd.ExecuteNonQuery();
        }

        public static bool AgendaExists(int messageId, DateTime schedule)
        {
            using var conn = GetConnection();
            conn.Open();

            using var cmd = new SQLiteCommand("SELECT COUNT(*) FROM Agenda WHERE message_id = @msg AND schedule = @sch", conn);
            cmd.Parameters.AddWithValue("@msg", messageId);
            cmd.Parameters.AddWithValue("@sch", schedule.ToString("o"));
            return (long)cmd.ExecuteScalar() > 0;
        }

        public static void InsertMessage(int messageId, string mensajeJson)
        {
            using var conn = GetConnection();
            conn.Open();

            using var cmd = new SQLiteCommand("INSERT OR REPLACE INTO Messages (id, mensaje) VALUES (@id, @msg)", conn);
            cmd.Parameters.AddWithValue("@id", messageId);
            cmd.Parameters.AddWithValue("@msg", mensajeJson);
            cmd.ExecuteNonQuery();
        }

        public static bool MessageExists(int messageId)
        {
            using var conn = GetConnection();
            conn.Open();

            using var cmd = new SQLiteCommand("SELECT COUNT(*) FROM Messages WHERE id = @id", conn);
            cmd.Parameters.AddWithValue("@id", messageId);
            return (long)cmd.ExecuteScalar() > 0;
        }

        public static List<(int messageId, DateTime schedule, bool showed)> GetAgenda()
        {
            var agenda = new List<(int, DateTime, bool)>();
            using var conn = GetConnection();
            conn.Open();

            using var cmd = new SQLiteCommand("SELECT message_id, schedule, showed FROM Agenda ORDER BY schedule ASC", conn);
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                int messageId = reader.GetInt32(0);
                DateTime schedule = DateTime.Parse(reader.GetString(1));
                bool showed = reader.GetInt32(2) == 1;
                agenda.Add((messageId, schedule, showed));
            }
            return agenda;
        }

        public static Dictionary<int, dynamic> GetMessages(IEnumerable<int> messageIds)
        {
            var mensajes = new Dictionary<int, dynamic>();
            using var conn = GetConnection();
            conn.Open();

            foreach (var id in messageIds)
            {
                using var cmd = new SQLiteCommand("SELECT mensaje FROM Messages WHERE id = @id", conn);
                cmd.Parameters.AddWithValue("@id", id);

                using var reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    string json = reader.GetString(0);
                    dynamic mensaje = JsonConvert.DeserializeObject<dynamic>(json);
                    mensajes[id] = mensaje;
                }
            }

            return mensajes;
        }

        public static void DeleteOldAgendas()
        {
            using var conn = GetConnection();
            conn.Open();

            using var cmd = new SQLiteCommand("DELETE FROM Agenda WHERE DATE(schedule) != @hoy", conn);
            cmd.Parameters.AddWithValue("@hoy", DateTime.Today.ToString("yyyy-MM-dd"));
            cmd.ExecuteNonQuery();
        }

        public static void TruncateGroups()
        {
            using var conn = GetConnection();
            conn.Open();

            using var cmd = new SQLiteCommand("DELETE FROM UsersGroup", conn);
            cmd.ExecuteNonQuery();
        }

        public static void InsertGroup(string group)
        {
            using var conn = GetConnection();
            conn.Open();

            using var cmd = new SQLiteCommand("INSERT INTO UsersGroup (grupo) VALUES (@group)", conn);
            cmd.Parameters.AddWithValue("@group", group);
            cmd.ExecuteNonQuery();
        }

        public static List<string> GetGroups()
        {
            var result = new List<string>();
            using var conn = GetConnection();
            conn.Open();

            using var cmd = new SQLiteCommand("SELECT grupo FROM UsersGroup", conn);
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                result.Add(reader.GetString(0));
            }

            return result;
        }

        public static void MarkAgendaAsShowed(int messageId, DateTime schedule)
        {
            using var conn = GetConnection();
            conn.Open();

            using var cmd = new SQLiteCommand("UPDATE Agenda SET showed = 1 WHERE message_id = @id AND ABS(strftime('%s', schedule) - strftime('%s', @schedule)) < 60", conn);
            cmd.Parameters.AddWithValue("@id", messageId);
            cmd.Parameters.AddWithValue("@schedule", schedule.ToString("o"));
            cmd.ExecuteNonQuery();
        }
    }
}
