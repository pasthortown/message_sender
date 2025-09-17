namespace ImageActivityMonitor.Domain
{
    public interface IUserActivityChecker
    {
        /// <summary>
        /// Determina si el usuario está activo tras monitoreo durante los segundos dados.
        /// </summary>
        Task<UserActivityStatus> CheckActivityAsync(int durationSeconds);
    }
}
