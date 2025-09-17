namespace ImageActivityMonitor.Domain
{
    public class UserActivityStatus
    {
        public bool IsActive { get; }
        public string Estado => IsActive ? "Activo" : "Inactivo";

        public UserActivityStatus(bool isActive)
        {
            IsActive = isActive;
        }

        public override string ToString() => Estado;
    }
}
