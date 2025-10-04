using System.Drawing;
using System.Windows.Forms;

namespace ImageActivityMonitor.Infrastructure
{
    public class GuiWrapper
    {
        public Point GetCursorPosition() => Cursor.Position;

        // Mantengo la firma, pero ignoro screenWidth/screenHeight y uso WorkingArea (mejor con barra de tareas/DPI)
        public Point CalcularPosicionPorZona(int zona, int screenWidth, int screenHeight, int imgWidth, int imgHeight)
        {
            // fila/col: 0=arriba/izq, 1=centro, 2=abajo/der
            int fila = zona / 3;
            int col  = zona % 3;

            int x = col switch
            {
                0 => 0,                                   // izquierda
                1 => (screenWidth  - imgWidth)  / 2,      // centro X
                2 =>  screenWidth  - imgWidth,            // derecha
                _ => 0
            };

            int y = fila switch
            {
                0 => 0,                                   // arriba
                1 => (screenHeight - imgHeight) / 2,      // centro Y
                2 =>  screenHeight - imgHeight,           // abajo
                _ => 0
            };

            return new Point(x, y);
        }

    }
}
