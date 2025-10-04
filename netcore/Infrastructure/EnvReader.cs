using System;
using System.Collections.Generic;
using System.IO;

namespace ImageActivityMonitor.Infrastructure
{
    public static class EnvReader
    {
        private static readonly Dictionary<string, string> _values = new();

        static EnvReader()
        {
            string envPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, ".env");
            if (!File.Exists(envPath)) return;

            foreach (var line in File.ReadAllLines(envPath))
            {
                if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;

                var parts = line.Split('=', 2);
                if (parts.Length == 2)
                {
                    _values[parts[0].Trim()] = parts[1].Trim();
                }
            }
        }

        public static string Get(string key, string defaultValue = "")
        {
            return _values.TryGetValue(key, out var value) ? value : defaultValue;
        }
    }
}
