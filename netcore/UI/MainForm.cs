using ImageActivityMonitor.Application.Services;
using ImageActivityMonitor.Infrastructure;
using ImageActivityMonitor.Domain.Entities;
using ImageActivityMonitor.Infrastructure.Services;
using System.IO;
using System.Windows.Forms;
using System.Drawing;
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Timers;

namespace ImageActivityMonitor.UI
{
    public partial class MainForm : Form
    {
        private NotifyIcon notifyIcon;
        private static bool yaInicializado = false;
        private List<(int messageId, DateTime schedule, bool showed)> agenda = new();
        private Dictionary<int, dynamic> mensajes = new();
        private System.Timers.Timer refreshTimer;
        private System.Timers.Timer mostrarTimer;
        private MessageDisplayService? messageDisplayService;

        // NUEVO: referencias persistentes del menú contextual
        private ContextMenuStrip contextMenu;
        private ToolStripMenuItem mensajesMenuItem;
        private ToolStripMenuItem salirMenuItem;

        public MainForm()
        {
            InitializeComponent();

            this.ShowInTaskbar = false;
            this.WindowState = FormWindowState.Minimized;
            this.Visible = false;
            this.Opacity = 0;
            this.FormBorderStyle = FormBorderStyle.FixedToolWindow;
            this.Load += MainForm_Load;

            InicializarNotifyIcon();
        }

        private void InicializarNotifyIcon()
        {
            notifyIcon = new NotifyIcon();
            notifyIcon.Icon = new Icon(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Resources", "main.ico"));
            notifyIcon.Visible = true;
            notifyIcon.Text = "Herramienta de Comunicación";

            contextMenu = new ContextMenuStrip();
            mensajesMenuItem = new ToolStripMenuItem("Mensajes");

            salirMenuItem = new ToolStripMenuItem("Salir");
            salirMenuItem.Click += (s, e) =>
            {
                notifyIcon.Visible = false;
                System.Windows.Forms.Application.Exit();
            };

            contextMenu.Items.Add(mensajesMenuItem);
            contextMenu.Items.Add(new ToolStripSeparator());
            contextMenu.Items.Add(salirMenuItem);

            // Reconstruye el listado en cada clic derecho (apertura del menú)
            contextMenu.Opening += (s, e) =>
            {
                try { RebuildMensajesSubmenu(); } catch { /* evitar que una excepción bloquee el menú */ }
            };

            notifyIcon.ContextMenuStrip = contextMenu;
        }

        // NUEVO: arma el submenú con agenda de HOY hasta el minuto actual. Cada item es clickeable.
        private void RebuildMensajesSubmenu()
        {
            mensajesMenuItem.DropDownItems.Clear();

            var ahora = DateTime.Now;
            var limite = new DateTime(ahora.Year, ahora.Month, ahora.Day, ahora.Hour, ahora.Minute, 0);

            var itemsDeHoy = agenda
                .Where(a => a.schedule.Date == DateTime.Today && a.schedule <= limite)
                .OrderBy(a => a.schedule)
                .ToList();

            if (itemsDeHoy.Count == 0)
            {
                var vacio = new ToolStripMenuItem("Sin mensajes de hoy hasta ahora") { Enabled = false };
                mensajesMenuItem.DropDownItems.Add(vacio);
                return;
            }

            foreach (var item in itemsDeHoy)
            {
                string etiqueta = $"{item.schedule:g}" + (item.showed ? " (Visto)" : "");
                var mi = new ToolStripMenuItem(etiqueta)
                {
                    Tag = (item.messageId, item.schedule) // NUEVO: guardamos los datos para el click
                };
                mi.Click += async (s, e) =>
                {
                    var (mid, when) = ((int, DateTime))((ToolStripMenuItem)s).Tag;
                    await MostrarMensajePorMenuAsync(mid, when);
                };
                mensajesMenuItem.DropDownItems.Add(mi);
            }
        }

        // NUEVO: muestra el mensaje inmediatamente al hacer clic en el menú
        private async Task MostrarMensajePorMenuAsync(int messageId, DateTime schedule)
        {
            try
            {
                if (messageDisplayService == null)
                {
                    Console.WriteLine("[MostrarMensajePorMenu] service nulo");
                    return;
                }

                // Asegurar que tenemos el mensaje en memoria; si no, intentamos cargarlo desde SQLite
                if (!mensajes.ContainsKey(messageId))
                {
                    Console.WriteLine($"[MostrarMensajePorMenu] mensaje {messageId} no estaba en memoria; leyendo desde SQLite");
                    var dic = Database.GetMessages(new[] { messageId });
                    foreach (var kv in dic) mensajes[kv.Key] = kv.Value;
                    if (!mensajes.ContainsKey(messageId))
                    {
                        MessageBox.Show($"No se encontró el mensaje {messageId}.", "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Information);
                        return;
                    }
                }

                dynamic rawMessage = mensajes[messageId];
                string type = (string)rawMessage.type;

                // Ejecutamos en el hilo de UI por seguridad (los servicios crean Forms)
                await this.InvokeAsync(async () =>
                {
                    MessageBase parsed = messageDisplayService.ParseMessage(type.ToLower(), rawMessage);
                    if (parsed == null)
                    {
                        Console.WriteLine($"[MostrarMensajePorMenu] Tipo no soportado: {type}");
                        return;
                    }

                    // Marcar como mostrado en SQLite antes o después; aquí lo hacemos antes para evitar duplicados si falla el cierre
                    Database.MarkAgendaAsShowed(messageId, schedule);

                    string estado = await messageDisplayService.MostrarMensajeAsync(parsed);
                    Console.WriteLine($"[Mostrar por menú {type}] Zona {parsed.Zone}, Estado: {estado}");
                });

                // Refrescar agenda en memoria para que en la próxima apertura ya aparezca como (Visto)
                agenda = Database.GetAgenda();
            }
            catch (Exception ex)
            {
                Console.WriteLine("[MostrarMensajePorMenu] Error: " + ex.Message);
            }
        }

        private async void MainForm_Load(object sender, EventArgs e)
        {
            if (yaInicializado) return;
            yaInicializado = true;

            string jwtToken = EnvReader.Get("JWT_TOKEN");
            string urlBase = EnvReader.Get("WEB_SERVICE_URL");
            int refreshSeconds = int.TryParse(EnvReader.Get("REFRESHTIME"), out int val) ? val : 60;

            HttpClient client = new HttpClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwtToken);

            await SincronizarTodoAsync(client, urlBase);

            refreshTimer = new System.Timers.Timer(refreshSeconds * 1000);
            refreshTimer.Elapsed += async (s, args) =>
            {
                _ = Task.Run(() => SincronizarTodoAsync(client, urlBase));
            };
            refreshTimer.Start();

            var guiWrapper = new GuiWrapper();
            var imageLoader = new ImageLoader();
            var monitorService = new UserMonitorService(guiWrapper);
            var logger = new ActivityLogger();

            var services = new List<BaseMessageDisplayService>
            {
                new ImageMessageDisplayService(imageLoader, guiWrapper, monitorService, logger),
                new TextMessageDisplayService(guiWrapper, monitorService, logger)
            };

            messageDisplayService = new MessageDisplayService(services);

            mostrarTimer = new System.Timers.Timer(20_000);
            mostrarTimer.Elapsed += async (s, args) =>
            {
                if (messageDisplayService != null)
                    await MostrarMensajesDelDiaAsync(messageDisplayService);
            };
            mostrarTimer.Start();
        }

        private async Task SincronizarTodoAsync(HttpClient client, string urlBase)
        {
            List<string> userGroups = new();
            var userData = new UserDataGetter(client, urlBase);
            string userEmail = userData.GetWindowsUsername();
            Console.WriteLine($"[Usuario]: {userEmail}");

            try
            {
                await userData.RegisterUserIfNotExists(userEmail);
                userGroups = await userData.GetUserGroups(userEmail);
                Console.WriteLine($"[Grupos]: {string.Join(", ", userGroups)}");

                Database.TruncateGroups();
                foreach (var group in userGroups)
                    Database.InsertGroup(group);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Error conexión WS - usando SQLite]: {ex.Message}");
                userGroups = Database.GetGroups();
                Console.WriteLine($"[Grupos desde SQLite]: {string.Join(", ", userGroups)}");
            }

            var messageGetter = new MessageGetter(client, urlBase);

            Console.WriteLine("[Limpieza SQLite]");
            messageGetter.LimpiarAgendasNoHoy();

            try
            {
                Console.WriteLine("[Sincronización con Web Service]");
                await messageGetter.SincronizarConWebService(userGroups);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Sincronización fallida]: {ex.Message}");
            }

            Console.WriteLine("[Cargando datos desde SQLite]");
            agenda = await messageGetter.BuildAgenda(userGroups);
            mensajes = await messageGetter.FetchMessages(agenda);

            Console.WriteLine("Agenda final:");
            foreach (var item in agenda)
            {
                Console.WriteLine($"message_id: {item.messageId}, schedule: {item.schedule:g}, showed: {item.showed}");
            }
        }

        private async Task MostrarMensajesDelDiaAsync(MessageDisplayService service)
        {
            try
            {
                Console.WriteLine("[Verificando mensajes para mostrar...]");

                var ahora = DateTime.Now;
                foreach (var item in agenda.Where(a => !a.showed))
                {
                    if (item.schedule.Year == ahora.Year &&
                        item.schedule.Month == ahora.Month &&
                        item.schedule.Day == ahora.Day &&
                        item.schedule.Hour == ahora.Hour &&
                        item.schedule.Minute == ahora.Minute)
                    {
                        Console.WriteLine($"Coincidencia exacta encontrada: {item.schedule:g}");

                        if (!mensajes.ContainsKey(item.messageId))
                        {
                            Console.WriteLine($"[Falta mensaje en memoria] ID: {item.messageId}");
                            continue;
                        }

                        dynamic rawMessage = mensajes[item.messageId];
                        string type = rawMessage.type;

                        await this.InvokeAsync(async () =>
                        {
                            MessageBase message = service.ParseMessage(type.ToLower(), rawMessage);
                            if (message != null)
                            {
                                Database.MarkAgendaAsShowed(item.messageId, item.schedule);
                                string estado = await service.MostrarMensajeAsync(message);
                                Console.WriteLine($"[Mostrado {type}] Zona {message.Zone}, Estado: {estado}");
                            }
                            else
                            {
                                Console.WriteLine($"[Tipo no soportado]: {type}");
                            }
                        });
                    }
                }

                // Refrescar agenda desde SQLite al final del ciclo
                agenda = Database.GetAgenda();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error al mostrar mensaje: " + ex.Message);
            }
        }
    }

    public static class ControlExtensions
    {
        public static Task InvokeAsync(this Control control, Func<Task> func)
        {
            var tcs = new TaskCompletionSource<object>();
            control.Invoke(new Action(async () =>
            {
                try
                {
                    await func();
                    tcs.SetResult(null);
                }
                catch (Exception ex)
                {
                    tcs.SetException(ex);
                }
            }));
            return tcs.Task;
        }
    }
}
