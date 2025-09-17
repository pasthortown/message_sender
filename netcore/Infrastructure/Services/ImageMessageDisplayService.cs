using System;
using System.Drawing;
using System.Threading.Tasks;
using System.Windows.Forms;
using ImageActivityMonitor.Domain.Entities;
using ImageActivityMonitor.Application.Services;
using ImageActivityMonitor.Infrastructure;

namespace ImageActivityMonitor.Infrastructure.Services
{
    public class ImageMessageDisplayService : BaseMessageDisplayService
    {
        private readonly ImageLoader _imageLoader;
        private readonly GuiWrapper _guiWrapper;
        private readonly UserMonitorService _monitorService;
        private readonly ActivityLogger _logger;

        public string TypeHandled => "image";

        public ImageMessageDisplayService(
            ImageLoader imageLoader,
            GuiWrapper guiWrapper,
            UserMonitorService monitorService,
            ActivityLogger logger)
        {
            _imageLoader = imageLoader;
            _guiWrapper = guiWrapper;
            _monitorService = monitorService;
            _logger = logger;
        }

        public async Task<string> MostrarMensajeAsync(MessageBase mensajeBase)
        {
            if (mensajeBase is not ImageMessage mensaje || string.IsNullOrWhiteSpace(mensaje.Content))
                return "Contenido de imagen no válido";

            var image = _imageLoader.LoadImageFromBase64(mensaje.Content, mensaje.Width, out int imgWidth, out int imgHeight);
            var screenWidth = Screen.PrimaryScreen.Bounds.Width;
            var screenHeight = Screen.PrimaryScreen.Bounds.Height;
            var pos = _guiWrapper.CalcularPosicionPorZona(mensaje.Zone, screenWidth, screenHeight, imgWidth, imgHeight);

            var form = new Form
            {
                FormBorderStyle = FormBorderStyle.None,
                StartPosition = FormStartPosition.Manual,
                ShowInTaskbar = false,
                TopMost = true,
                BackColor = Color.White,
                TransparencyKey = Color.White,
                Bounds = new Rectangle(pos.X, pos.Y, imgWidth, imgHeight),
                Opacity = 0.0
            };

            var pictureBox = new PictureBox
            {
                Image = image,
                SizeMode = PictureBoxSizeMode.StretchImage,
                Dock = DockStyle.Fill,
                BackColor = Color.White
            };

            string estado = "Inactivo";
            bool leido = false;
            bool accedido = false;

            pictureBox.Click += (s, e) =>
            {
                accedido = true;
                try
                {
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = mensaje.Link,
                        UseShellExecute = true
                    });
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Error al abrir el navegador: " + ex.Message);
                }
            };

            pictureBox.MouseEnter += (s, e) =>
            {
                leido = true;
                form.Opacity = 1.0;
            };

            pictureBox.MouseLeave += (s, e) =>
            {
                form.Opacity = 0.7;
            };

            form.Controls.Add(pictureBox);
            form.Show();

            int fadein = 1000, fadeout = 1000;
            int pasos = 30;
            double maxOpacity = 0.7;

            for (int i = 0; i < pasos; i++)
            {
                form.Opacity = (i / (double)pasos) * maxOpacity;
                await Task.Delay(fadein / pasos);
            }

            var monitoreo = _monitorService.MonitorearActividadAsync(mensaje.Duration);
            await Task.Delay(mensaje.Duration * 1000);

            for (int i = pasos; i >= 0; i--)
            {
                form.Opacity = (i / (double)pasos) * maxOpacity;
                await Task.Delay(fadeout / pasos);
            }

            form.Close();

            bool fueActivo = await monitoreo;

            if (accedido)
                estado = "Accedido";
            else if (leido)
                estado = "Leído";
            else if (fueActivo)
                estado = "Activo";

            _logger.Log(mensaje.Zone, estado);

            return estado;
        }
    }
}
