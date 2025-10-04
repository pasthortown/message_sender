using System.Threading.Tasks;
using ImageActivityMonitor.Domain.Entities;

namespace ImageActivityMonitor.Application.Services
{
    public interface BaseMessageDisplayService
    {
        string TypeHandled { get; }
        Task<string> MostrarMensajeAsync(MessageBase mensaje);
    }
}
