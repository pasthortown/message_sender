using System.Drawing;
using System.Windows.Forms;

namespace ImageActivityMonitor.Infrastructure
{
    public class GuiWrapper
    {
        public Point GetCursorPosition()
        {
            return Cursor.Position;
        }

        public Point CalcularPosicionPorZona(int zona, int screenWidth, int screenHeight, int imgWidth, int imgHeight)
        {
            int fila = zona / 3;
            int col = zona % 3;

            int x = col switch
            {
                0 => 0,
                1 => (screenWidth - imgWidth) / 2,
                2 => screenWidth - imgWidth,
                _ => 0
            };

            int y = fila switch
            {
                0 => 0,
                1 => (screenHeight - imgHeight) / 2,
                2 => screenHeight - imgHeight,
                _ => 0
            };

            return new Point(x, y);
        }
    }
}
