using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

namespace ImageActivityMonitor.Infrastructure
{
    public class ImageLoader
    {
        public Image LoadImageFromFile(string path, int desiredWidth, out int imgWidth, out int imgHeight)
        {
            var original = Image.FromFile(path);
            return ResizeImage(original, desiredWidth, out imgWidth, out imgHeight);
        }

        public Image LoadImageFromBase64(string base64String, int desiredWidth, out int imgWidth, out int imgHeight)
        {
            try
            {
                byte[] imageBytes = Convert.FromBase64String(base64String);
                using (var ms = new MemoryStream(imageBytes))
                {
                    var original = Image.FromStream(ms);
                    return ResizeImage(original, desiredWidth, out imgWidth, out imgHeight);
                }
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException("Error al cargar imagen desde base64.", ex);
            }
        }

        private Image ResizeImage(Image original, int desiredWidth, out int imgWidth, out int imgHeight)
        {
            if (desiredWidth > 0)
            {
                float scale = (float)desiredWidth / original.Width;
                imgWidth = desiredWidth;
                imgHeight = (int)(original.Height * scale);
                return new Bitmap(original, new Size(imgWidth, imgHeight));
            }
            else
            {
                imgWidth = original.Width;
                imgHeight = original.Height;
                return original;
            }
        }
    }
}
