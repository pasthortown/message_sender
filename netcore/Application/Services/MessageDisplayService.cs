using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ImageActivityMonitor.Domain.Entities;

namespace ImageActivityMonitor.Application.Services
{
    public class MessageDisplayService
    {
        private readonly Dictionary<string, BaseMessageDisplayService> _services;

        public MessageDisplayService(IEnumerable<BaseMessageDisplayService> services)
        {
            // Crea un diccionario de servicios indexado por el tipo que manejan (por ejemplo: "image", "text")
            _services = services.ToDictionary(s => s.TypeHandled.ToLower(), s => s);
        }

        public async Task<string> MostrarMensajeAsync(MessageBase mensaje)
        {
            string tipo = mensaje.Type.ToLower();

            if (_services.TryGetValue(tipo, out var servicio))
            {
                return await servicio.MostrarMensajeAsync(mensaje);
            }

            return $"Tipo de mensaje no soportado: {mensaje.Type}";
        }

        public MessageBase? ParseMessage(string type, dynamic rawMessage)
        {
            switch (type.ToLower())
            {
                case "image":
                    return new ImageMessage
                    {
                        Type = rawMessage.type,
                        Link = rawMessage.link,
                        Duration = (int)rawMessage.duration,
                        Zone = (int)rawMessage.zone,
                        Content = (string)rawMessage.content.image,
                        Width = rawMessage.width != null ? (int)rawMessage.width : 400
                    };

                case "text":
                    return new TextMessage
                    {
                        Type = rawMessage.type,
                        Link = rawMessage.link,
                        Duration = (int)rawMessage.duration,
                        Zone = (int)rawMessage.zone,
                        Content = (string)rawMessage.content.text,
                        Title = (string)rawMessage.content.title
                    };

                default:
                    return null;
            }
        }

    }
}
