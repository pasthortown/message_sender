using System.Threading.Tasks;
using ImageActivityMonitor.Domain.Entities;

namespace ImageActivityMonitor.Application.Services
{
    public interface IMessageHandler
    {
        Task<string> DisplayAsync(MessageBase message);
    }
}
