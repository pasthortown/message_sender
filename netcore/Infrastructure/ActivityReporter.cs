using Newtonsoft.Json;
using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace ImageActivityMonitor.Infrastructure.Services
{
    public class ActivityReporter
    {
        private readonly HttpClient _client;
        private readonly string _baseUrl;

        public ActivityReporter(HttpClient client, string baseUrl)
        {
            _client = client;
            _baseUrl = baseUrl.TrimEnd('/');
        }

        public async Task<bool> ReportAsync(int messageId, string email, int zona, string estado, DateTime? timestampUtc = null)
        {

            try {
                var payload = new
                {
                    message_id = messageId,
                    email = email,
                    zona = zona,
                    estado = estado,
                    timestamp = (timestampUtc ?? DateTime.UtcNow).ToString("yyyy-MM-ddTHH:mm:ssZ")
                };

                var json = JsonConvert.SerializeObject(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var res = await _client.PostAsync($"{_baseUrl}/messagereport", content);
                return res.IsSuccessStatusCode;
            } catch (Exception ex) {
                // opcional: Console.WriteLine($"Report failed: {ex.Message}");
                return false;
            }
        }
    }
}
