using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Security.Principal;
using System.Text;
using System.Threading.Tasks;

namespace ImageActivityMonitor.Infrastructure.Services
{
    public class UserDataGetter
    {
        private readonly HttpClient client;
        private readonly string urlBase;

        public UserDataGetter(HttpClient client, string urlBase)
        {
            this.client = client;
            this.urlBase = urlBase;
        }

        public string GetWindowsUsername()
        {
            string userEmail = WindowsIdentity.GetCurrent().Name;
            if (userEmail.Contains("\\")) userEmail = userEmail.Split('\\')[1];
            return userEmail;
        }

        public async Task RegisterUserIfNotExists(string email)
        {
            var response = await client.GetAsync($"{urlBase}/search/users/{email}");

            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                var nuevoUsuario = new { email = email };
                var json = JsonConvert.SerializeObject(nuevoUsuario);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var postResponse = await client.PostAsync($"{urlBase}/users", content);
                Console.WriteLine(postResponse.IsSuccessStatusCode ? "Usuario registrado correctamente" : "Error al registrar usuario");
            }
            else
            {
                Console.WriteLine("Usuario ya existe");
            }
        }

        public async Task<List<string>> GetUserGroups(string email)
        {
            List<string> grupos = new();
            HttpResponseMessage response = await client.GetAsync($"{urlBase}/search/usersgroup/{email}");

            if (response.IsSuccessStatusCode)
            {
                string content = await response.Content.ReadAsStringAsync();
                dynamic parsed = JsonConvert.DeserializeObject<dynamic>(content);
                foreach (var item in parsed.response)
                {
                    if (item.group != null)
                        grupos.Add((string)item.group.ToString());
                }

                Console.WriteLine("Grupos del usuario: " + string.Join(", ", grupos));
            }
            else
            {
                Console.WriteLine("No se pudieron obtener los grupos del usuario");
            }

            return grupos;
        }
    }
}
