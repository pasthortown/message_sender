using System.Drawing;
using System.Threading.Tasks;
using ImageActivityMonitor.Domain;
using ImageActivityMonitor.Infrastructure;

namespace ImageActivityMonitor.Infrastructure.Services
{
    public class UserMonitorService : IUserActivityChecker
    {
        private readonly GuiWrapper _gui;

        public UserMonitorService(GuiWrapper gui)
        {
            _gui = gui;
        }

        // Implementación del contrato del dominio
        public async Task<UserActivityStatus> CheckActivityAsync(int durationSeconds)
        {
            Point posicionAnterior = _gui.GetCursorPosition();

            for (int i = 0; i < durationSeconds; i++)
            {
                await Task.Delay(1000);
                Point posicionActual = _gui.GetCursorPosition();
                if (posicionActual != posicionAnterior)
                {
                    return new UserActivityStatus(true);
                }
            }

            return new UserActivityStatus(false);
        }

        // Método auxiliar para retrocompatibilidad
        public async Task<bool> MonitorearActividadAsync(int duracionSegundos)
        {
            var result = await CheckActivityAsync(duracionSegundos);
            return result.IsActive;
        }
    }
}
