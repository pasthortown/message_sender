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

        public string TypeHandled => "image";

        public ImageMessageDisplayService(
            ImageLoader imageLoader,
            GuiWrapper guiWrapper,
            UserMonitorService monitorService)
        {
            _imageLoader = imageLoader;
            _guiWrapper = guiWrapper;
            _monitorService = monitorService;
        }

        public async Task<string> MostrarMensajeAsync(MessageBase mensajeBase)
        {
            if (mensajeBase is not ImageMessage mensaje || string.IsNullOrWhiteSpace(mensaje.Content))
                return "Contenido de imagen no válido";

            // 1) Cargar imagen y conocer su tamaño inicial
            var image = _imageLoader.LoadImageFromBase64(
                mensaje.Content,
                mensaje.Width,
                out int imgWidth,
                out int imgHeight
            );

            // 2) Usar el AREA VISIBLE (WorkingArea) — maneja barra de tareas y DPI lógico
            var wa = Screen.PrimaryScreen.WorkingArea;
            int screenWidth  = wa.Width;
            int screenHeight = wa.Height;

            // 3) REESCALAR si la imagen excede el área visible (mantener aspecto)
            if (imgWidth > screenWidth || imgHeight > screenHeight)
            {
                float scaleW = (float)screenWidth  / imgWidth;
                float scaleH = (float)screenHeight / imgHeight;
                float scale  = Math.Min(scaleW, scaleH);

                imgWidth  = (int)(imgWidth  * scale);
                imgHeight = (int)(imgHeight * scale);

                var resized = new Bitmap(image, new Size(imgWidth, imgHeight));
                image.Dispose();
                image = resized;
            }

            // (Opcional) Si el mensaje pide "llenar ancho" (p.ej. Width >= ancho visible), fuerza a ancho visible
            if (mensaje.Width >= screenWidth && imgWidth != screenWidth)
            {
                float scale = (float)screenWidth / imgWidth;
                imgWidth  = screenWidth;
                imgHeight = (int)(imgHeight * scale);

                var resized = new Bitmap(image, new Size(imgWidth, imgHeight));
                image.Dispose();
                image = resized;
            }

            // 4) Calcular posición por zona usando dimensiones del WorkingArea
            var pos = _guiWrapper.CalcularPosicionPorZona(
                mensaje.Zone,
                screenWidth,
                screenHeight,
                imgWidth,
                imgHeight
            );

            // 5) Crear Form exactamente del tamaño de la imagen, compensando el offset del WorkingArea
            var form = new Form
            {
                FormBorderStyle = FormBorderStyle.None,
                StartPosition   = FormStartPosition.Manual,
                ShowInTaskbar   = false,
                TopMost         = true,
                BackColor       = Color.FromArgb(0x16, 0x16, 0x16),
                TransparencyKey = Color.FromArgb(0x16, 0x16, 0x16),
                Bounds          = new Rectangle(wa.Left + pos.X, wa.Top + pos.Y, imgWidth, imgHeight),
                Opacity         = 0.0
            };

            var pictureBox = new PictureBox
            {
                Image    = image,
                SizeMode = PictureBoxSizeMode.StretchImage, // El Form ya es del tamaño exacto de la imagen
                Dock     = DockStyle.Fill,
                BackColor = Color.White
            };

            string estado = "Inactivo";
            bool leido = false, accedido = false;

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

            pictureBox.MouseEnter += (s, e) => { leido = true; form.Opacity = 1.0; };
            pictureBox.MouseLeave += (s, e) => { form.Opacity = 0.7; };

            form.Controls.Add(pictureBox);
            form.Show();

            Console.WriteLine($"[IMG] zona={mensaje.Zone} img=({imgWidth}x{imgHeight}) WA=({wa.Left},{wa.Top},{wa.Width}x{wa.Height}) pos=({pos.X},{pos.Y}) bounds={form.Bounds}");

            int fadein = 1000, fadeout = 1000, pasos = 30;
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
            if      (accedido) estado = "Accedido";
            else if (leido)    estado = "Leído";
            else if (fueActivo)estado = "Activo";

            return estado;
        }

    }
}
