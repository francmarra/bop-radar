namespace BopRadar.Data.Import;

public class SiteDataException(string file, string field, string message)
    : Exception($"{file}: field '{field}': {message}")
{
    public string File { get; } = file;
    public string Field { get; } = field;
}
