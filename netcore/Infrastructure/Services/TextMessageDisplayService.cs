using System;
using System.Drawing;
using System.Threading.Tasks;
using System.Windows.Forms;
using ImageActivityMonitor.Domain.Entities;
using ImageActivityMonitor.Infrastructure;
using ImageActivityMonitor.Application.Services;

namespace ImageActivityMonitor.Infrastructure.Services
{
    public class TextMessageDisplayService : BaseMessageDisplayService
    {
        private readonly GuiWrapper _guiWrapper;
        private readonly UserMonitorService _monitorService;
        private readonly ActivityLogger _logger;

        public string TypeHandled => "text";

        public TextMessageDisplayService(
            GuiWrapper guiWrapper,
            UserMonitorService monitorService,
            ActivityLogger logger)
        {
            _guiWrapper = guiWrapper;
            _monitorService = monitorService;
            _logger = logger;
        }

        public async Task<string> MostrarMensajeAsync(MessageBase mensajeBase)
        {
            if (mensajeBase is not TextMessage mensaje)
                return "Tipo de mensaje inválido para este servicio";

            const int ancho = 754;
            const int alto = 132;

            string rutaImagen = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Resources", "news.png");
            Bitmap imagen = new Bitmap(Image.FromFile(rutaImagen), new Size(ancho, alto));

            using (Graphics g = Graphics.FromImage(imagen))
            {
                g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.AntiAlias;

                using Brush pincelTexto = new SolidBrush(ColorTranslator.FromHtml("#F5F5F5"));

                // Título (negrita, proporcional a nueva dimensión)
                using Font fuenteTitulo = new Font("Segoe UI", 24, FontStyle.Bold, GraphicsUnit.Pixel);
                Rectangle rectTitulo = new Rectangle(120, 24, 514, 36);
                StringFormat formatoTitulo = new StringFormat
                {
                    Alignment = StringAlignment.Center,
                    LineAlignment = StringAlignment.Center
                };
                g.DrawString(mensaje.Title, fuenteTitulo, pincelTexto, rectTitulo, formatoTitulo);

                // Contenido (regular, proporcional a nueva dimensión)
                using Font fuenteContenido = new Font("Segoe UI", 16, FontStyle.Regular, GraphicsUnit.Pixel);
                Rectangle rectContenido = new Rectangle(155, 84, 470, alto - 84);
                StringFormat formatoContenido = new StringFormat
                {
                    Alignment = StringAlignment.Center,
                    LineAlignment = StringAlignment.Near
                };
                g.DrawString(mensaje.Content, fuenteContenido, pincelTexto, rectContenido, formatoContenido);
            }

            var screenWidth = Screen.PrimaryScreen.Bounds.Width;
            var screenHeight = Screen.PrimaryScreen.Bounds.Height;
            var pos = _guiWrapper.CalcularPosicionPorZona(mensaje.Zone, screenWidth, screenHeight, ancho, alto);

            var form = new Form
            {
                FormBorderStyle = FormBorderStyle.None,
                StartPosition = FormStartPosition.Manual,
                ShowInTaskbar = false,
                TopMost = true,
                BackColor = Color.White,
                TransparencyKey = Color.White,
                Bounds = new Rectangle(pos.X, pos.Y, ancho, alto),
                Opacity = 0.0
            };

            var pictureBox = new PictureBox
            {
                Image = imagen,
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
