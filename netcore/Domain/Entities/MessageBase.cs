namespace ImageActivityMonitor.Domain.Entities
{
    public abstract class MessageBase
    {
        public string Type { get; set; } = string.Empty;
        public string Link { get; set; } = string.Empty;
        public int Duration { get; set; }
        public int Zone { get; set; }
        public int Width { get; set; } = 400;
    }
}
