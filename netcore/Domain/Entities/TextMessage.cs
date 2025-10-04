namespace ImageActivityMonitor.Domain.Entities
{
    public class TextMessage: MessageBase
    {
        public string Content { get; set; } = "";
        public string Title { get; set; } = "";
    }
}
