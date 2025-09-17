using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using ImageActivityMonitor.Infrastructure;

namespace ImageActivityMonitor.Infrastructure.Services
{
    public class MessageGetter
    {
        private readonly HttpClient client;
        private readonly string urlBase;

        public MessageGetter(HttpClient client, string urlBase)
        {
            this.client = client;
            this.urlBase = urlBase;
        }

        public async Task<List<(int messageId, DateTime schedule, bool showed)>> BuildAgenda(List<string> grupos)
        {
            Console.WriteLine("[BuildAgenda desde SQLite]");
            return Database.GetAgenda();
        }

        public async Task<Dictionary<int, dynamic>> FetchMessages(List<(int messageId, DateTime schedule, bool showed)> agenda)
        {
            Console.WriteLine("[FetchMessages desde SQLite]");
            var ids = agenda.Select(a => a.messageId).Distinct();
            return Database.GetMessages(ids);
        }

        public async Task SincronizarConWebService(List<string> grupos)
        {
            Console.WriteLine("[SincronizarConWebService]");

            var agendaTemp = new List<(int messageId, DateTime schedule)>();

            foreach (var grupo in grupos)
            {
                try
                {
                    var response = await client.GetAsync($"{urlBase}/search/messagesgroup/{grupo}");
                    if (!response.IsSuccessStatusCode) continue;

                    string content = await response.Content.ReadAsStringAsync();
                    dynamic result = JsonConvert.DeserializeObject<dynamic>(content);

                    foreach (var item in result.response)
                    {
                        int messageId = item.message_id;
                        DateTime schedule = item.schedule["$date"].ToObject<DateTime>();
                        agendaTemp.Add((messageId, schedule));
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error al obtener mensajes del grupo {grupo}: {ex.Message}");
                }
            }

            var agendaFiltrada = agendaTemp
                .OrderBy(x => x.messageId)
                .ThenBy(x => x.schedule)
                .GroupBy(x => x.messageId)
                .SelectMany(g =>
                {
                    var list = new List<(int messageId, DateTime schedule)>();
                    foreach (var item in g)
                    {
                        if (list.Count == 0 || (item.schedule - list.Last().schedule).TotalMinutes >= 30)
                            list.Add(item);
                    }
                    return list;
                }).ToList();

            foreach (var (messageId, schedule) in agendaFiltrada)
            {
                if (!Database.AgendaExists(messageId, schedule))
                {
                    Database.InsertAgenda(messageId, schedule, false);
                    Console.WriteLine($"[Nueva Agenda] message_id: {messageId} - schedule: {schedule.ToLocalTime():g}");
                }
            }

            var idsUnicos = agendaFiltrada.Select(x => x.messageId).Distinct();
            foreach (var id in idsUnicos)
            {
                if (!Database.MessageExists(id))
                {
                    try
                    {
                        var response = await client.GetAsync($"{urlBase}/messages?id={id}");
                        if (!response.IsSuccessStatusCode) continue;

                        string content = await response.Content.ReadAsStringAsync();
                        dynamic result = JsonConvert.DeserializeObject<dynamic>(content);
                        string json = JsonConvert.SerializeObject(result.response);

                        Database.InsertMessage(id, json);
                        Console.WriteLine($"[Nuevo Mensaje] id: {id}");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error al obtener el mensaje {id}: {ex.Message}");
                    }
                }
            }
        }

        public void LimpiarAgendasNoHoy()
        {
            Console.WriteLine("[LimpiarAgendasNoHoy]");
            Database.DeleteOldAgendas();
        }
    }
}
