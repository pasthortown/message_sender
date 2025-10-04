using Newtonsoft.Json;
using RabbitMQ.Client;
using System;
using System.Security.Principal;
using System.Text;

namespace ImageActivityMonitor.Infrastructure
{
    public class ActivityLogger
    {
        private readonly string _userEmail;
        private readonly string _host;
        private readonly int _port;
        private readonly string _username;
        private readonly string _password;
        private readonly string _queueName;

        public ActivityLogger()
        {
            string userEmail = WindowsIdentity.GetCurrent().Name;
            _userEmail = userEmail.Contains("\\") ? userEmail.Split('\\')[1] : userEmail;

            _host = EnvReader.Get("RABBITMQ_HOST") ?? "localhost";
            _port = int.TryParse(EnvReader.Get("RABBITMQ_PORT"), out int port) ? port : 5672;
            _username = EnvReader.Get("RABBITMQ_USERNAME") ?? "guest";
            _password = EnvReader.Get("RABBITMQ_PASSWORD") ?? "guest";
            _queueName = EnvReader.Get("RABBITMQ_QUEUE") ?? "activity_queue";
        }

        public void Log(int zona, string estado)
        {
            var factory = new ConnectionFactory()
            {
                HostName = _host,
                Port = _port,
                UserName = _username,
                Password = _password
            };

            try
            {
                using var connection = factory.CreateConnection();
                using var channel = connection.CreateModel();

                channel.QueueDeclare(queue: _queueName,
                                     durable: true,
                                     exclusive: false,
                                     autoDelete: false,
                                     arguments: null);

                var payload = new
                {
                    message_id = 1,
                    email = _userEmail,
                    zona = zona,
                    estado = estado,
                    timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ")
                };

                var json = JsonConvert.SerializeObject(payload);
                var body = Encoding.UTF8.GetBytes(json);

                channel.BasicPublish(exchange: "",
                                     routingKey: _queueName,
                                     basicProperties: null,
                                     body: body);

                Console.WriteLine("Log enviado a RabbitMQ");
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error al enviar log a RabbitMQ: " + ex.Message);
            }
        }
    }
}
