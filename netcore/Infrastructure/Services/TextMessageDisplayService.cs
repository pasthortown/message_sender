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

            // Tamaño base del banner
            int ancho = 754;
            int alto  = 132;

            // Plantilla
            string rutaImagen = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Resources", "news.png");
            using var baseImg = Image.FromFile(rutaImagen);
            Bitmap imagen = new Bitmap(baseImg, new Size(ancho, alto));

            // ---- NUEVO: zonas de texto (ajustables) ----
            // Dejamos margen a la izquierda para la campana/logo y a la derecha un respiro visual.
            int leftPad       = 260;    // margen izquierdo (campana/logo)
            int rightPad      = 28;     // margen derecho
            int topPadTitle   = 8;      // antes era 18 → se sube 10 px
            int titleHeight   = 28;     
            int gapAfterTitle = 12;     
            int bottomPad     = 12;      // margen inferior

            // Área de título (una sola línea, izquierda)
            Rectangle rectTitulo = new Rectangle(
                leftPad,
                topPadTitle,
                ancho - leftPad - rightPad,
                titleHeight
            );

            // Área de contenido (multilínea ocupa todo el espacio inferior)
            int contentTop = topPadTitle + titleHeight + gapAfterTitle;
            Rectangle rectContenido = new Rectangle(
                leftPad,
                contentTop,
                ancho - leftPad - rightPad,
                alto - contentTop - bottomPad
            );

            using (Graphics g = Graphics.FromImage(imagen))
            {
                g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

                using Brush pincelTexto = new SolidBrush(Color.FromArgb(245, 245, 245));

                // Formatos de texto
                // Título: alineado a la izquierda, una línea, elipsis si se corta
                using var fmtTitulo = new StringFormat(StringFormatFlags.LineLimit)
                {
                    Alignment = StringAlignment.Near,
                    LineAlignment = StringAlignment.Near,
                    Trimming = StringTrimming.EllipsisCharacter,
                };

                // Contenido: alineado a la izquierda, múltiple línea, elipsis al final del rect si no cabe
                using var fmtContenido = new StringFormat(StringFormatFlags.LineLimit)
                {
                    Alignment = StringAlignment.Near,
                    LineAlignment = StringAlignment.Near,
                    Trimming = StringTrimming.EllipsisWord
                };

                // Fuentes (ajusta tamaños si lo deseas)
                using Font fuenteTitulo    = new Font("Segoe UI", 22, FontStyle.Bold,    GraphicsUnit.Pixel);
                using Font fuenteContenido = new Font("Segoe UI", 16, FontStyle.Regular, GraphicsUnit.Pixel);

                // (Opcional) Limitar caracteres máximos para mantener composición
                string titulo   = (mensaje.Title   ?? string.Empty).Trim();
                string contenido= (mensaje.Content ?? string.Empty).Trim();
                if (titulo.Length > 100)     titulo    = titulo.Substring(0, 100) + "…";
                if (contenido.Length > 300)  contenido = contenido.Substring(0, 300) + "…";

                // Dibujo final
                g.DrawString(titulo,    fuenteTitulo,    pincelTexto, rectTitulo,    fmtTitulo);
                g.DrawString(contenido, fuenteContenido, pincelTexto, rectContenido, fmtContenido);
            }

            // --- POSICIONAMIENTO SEGURO (WorkingArea + DPI aware) ---
            var wa = Screen.PrimaryScreen.WorkingArea;
            int screenWidth  = wa.Width;
            int screenHeight = wa.Height;

            // Si el banner excede la pantalla, reescalar proporcionalmente
            if (ancho > screenWidth || alto > screenHeight)
            {
                float scaleW = (float)screenWidth  / ancho;
                float scaleH = (float)screenHeight / alto;
                float scale  = Math.Min(scaleW, scaleH);

                int nuevoAncho = (int)(ancho * scale);
                int nuevoAlto  = (int)(alto  * scale);

                var resized = new Bitmap(imagen, new Size(nuevoAncho, nuevoAlto));
                imagen.Dispose();
                imagen = resized;

                ancho = nuevoAncho;
                alto  = nuevoAlto;
            }

            var pos = _guiWrapper.CalcularPosicionPorZona(mensaje.Zone, screenWidth, screenHeight, ancho, alto);

            var form = new Form
            {
                FormBorderStyle = FormBorderStyle.None,
                StartPosition   = FormStartPosition.Manual,
                ShowInTaskbar   = false,
                TopMost         = true,
                BackColor       = Color.FromArgb(0x16, 0x16, 0x16),
                TransparencyKey = Color.FromArgb(0x16, 0x16, 0x16),
                Bounds          = new Rectangle(wa.Left + pos.X, wa.Top + pos.Y, ancho, alto),
                Opacity         = 0.0
            };

            var pictureBox = new PictureBox
            {
                Image    = imagen,
                SizeMode = PictureBoxSizeMode.StretchImage,
                Dock     = DockStyle.Fill,
                BackColor= Color.White
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

            Console.WriteLine($"[TEXT] zona={mensaje.Zone} img=({ancho}x{alto}) WA=({wa.Left},{wa.Top},{wa.Width}x{wa.Height}) pos=({pos.X},{pos.Y})");

            // Animaciones
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

            _logger.Log(mensaje.Zone, estado);
            return estado;
        }
    }
}
